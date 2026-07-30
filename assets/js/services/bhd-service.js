(function () {
  'use strict';

  function n(value) {
    var num = Number(value || 0);
    return isFinite(num) ? num : 0;
  }

  function norm(value) {
    return String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function isoDate(value) {
    var s = String(value || '').trim();
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
    var tr = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!tr) return null;
    var year = Number(tr[3]);
    if (year < 100) year += 2000;
    return String(year).padStart(4, '0') + '-' + String(tr[2]).padStart(2, '0') + '-' + String(tr[1]).padStart(2, '0');
  }

  function movementAmount(row) {
    var incoming = n(row && row.gelen);
    var outgoing = n(row && row.giden);
    var net = n(row && row.net);
    if (!incoming && !outgoing && net) {
      if (net > 0) incoming = net;
      if (net < 0) outgoing = Math.abs(net);
    }
    return { incoming: incoming, outgoing: outgoing };
  }

  function sourceName(row) {
    return row && (row.bhdUploadName || row.bhdOriginalName || row.kaynak || row.banka || row.dosyaTipi) || 'BHD';
  }

  function dedupeKey(row, idx) {
    var amount = movementAmount(row);
    return [
      'BHD',
      norm(row && (row.banka || row.dosyaTipi || row.kaynak)),
      norm(row && (row.hesap || row.accountName || '')),
      isoDate(row && (row.tarih || row.islemTarihi)) || '',
      Number(amount.incoming || 0).toFixed(2),
      Number(amount.outgoing || 0).toFixed(2),
      norm(row && (row.aciklama || row.islemAciklamasi || row.kisiFirma)),
      norm(row && (row.referans || row.fisNo || row.borcAlacak || row.sira || idx + 1)).slice(0, 120)
    ].join('|');
  }

  function buildPayload(row, idx, companyId) {
    var amount = movementAmount(row);
    var date = isoDate(row && (row.tarih || row.islemTarihi));
    if (!date || (!amount.incoming && !amount.outgoing)) return null;

    var key = dedupeKey(row, idx);
    row.supabaseDedupeKey = key;

    return {
      company_id: companyId,
      cari_id: row && row.supabaseCariId || null,
      bank_name: row && (row.banka || row.bankName || row.kaynak || '') || '',
      account_name: row && (row.hesap || row.accountName || row.dosyaTipi || '') || '',
      transaction_date: date,
      description: String(row && (row.aciklama || row.islemAciklamasi || row.kisiFirma || sourceName(row)) || '').trim(),
      party_name: row && (row.kisiFirma || row.islemAciklamasi || '') || '',
      incoming: amount.incoming,
      outgoing: amount.outgoing,
      balance: row && row.bakiye !== '' && row.bakiye != null ? n(row.bakiye) : null,
      company_code: row && (row.sirket || row.firma || row.companyCode || '') || null,
      category_main: row && (row.kategori || row.categoryMain || '') || null,
      category_sub: row && (row.altKategori || row.categorySub || '') || null,
      is_deleted: false,
      dedupe_key: key
    };
  }

  function legacyPayload(body) {
    var copy = {};
    Object.keys(body || {}).forEach(function (key) {
      if (key !== 'company_code' && key !== 'category_main' && key !== 'category_sub' && key !== 'is_deleted') copy[key] = body[key];
    });
    return copy;
  }

  function isDuplicateError(error) {
    return Boolean(error && String(error.code) === '23505');
  }

  async function findExisting(client, companyId, dedupeKeyValue) {
    var result = await client
      .from('banka_hareketleri')
      .select('id')
      .eq('company_id', companyId)
      .eq('dedupe_key', dedupeKeyValue)
      .limit(1);
    if (result.error) throw result.error;
    return result.data && result.data.length ? result.data[0] : null;
  }

  async function insertMovement(client, body) {
    var inserted = await client.from('banka_hareketleri').insert(body).select('id').single();
    if (!inserted.error) return inserted;

    var message = inserted.error && inserted.error.message ? inserted.error.message : '';
    if (/company_code|category_main|category_sub|is_deleted|column/i.test(message)) {
      inserted = await client.from('banka_hareketleri').insert(legacyPayload(body)).select('id').single();
    }
    return inserted;
  }

  async function updateExisting(client, id, body) {
    var mutable = {
      cari_id: body.cari_id,
      bank_name: body.bank_name,
      account_name: body.account_name,
      transaction_date: body.transaction_date,
      description: body.description,
      party_name: body.party_name,
      incoming: body.incoming,
      outgoing: body.outgoing,
      balance: body.balance,
      company_code: body.company_code,
      category_main: body.category_main,
      category_sub: body.category_sub,
      is_deleted: false
    };

    var updated = await client
      .from('banka_hareketleri')
      .update(mutable)
      .eq('id', id)
      .select('id')
      .single();

    if (!updated.error) return updated;
    var message = updated.error && updated.error.message ? updated.error.message : '';
    if (/company_code|category_main|category_sub|is_deleted|column/i.test(message)) {
      updated = await client
        .from('banka_hareketleri')
        .update(legacyPayload(mutable))
        .eq('id', id)
        .select('id')
        .single();
    }
    return updated;
  }

  async function ensureMovement(client, companyId, row, idx) {
    var body = buildPayload(row, idx, companyId);
    if (!body) {
      return { id: null, existed: false, skipped: true, reason: 'Geçersiz tarih veya tutar' };
    }

    var existing = await findExisting(client, companyId, body.dedupe_key);
    if (existing) {
      var updated = await updateExisting(client, existing.id, body);
      if (updated.error) throw updated.error;
      return { id: existing.id, existed: true, updated: true, skipped: false, dedupeKey: body.dedupe_key };
    }

    var inserted = await insertMovement(client, body);
    if (inserted.error) {
      if (isDuplicateError(inserted.error)) {
        existing = await findExisting(client, companyId, body.dedupe_key);
        if (existing) {
          var updatedAfterDuplicate = await updateExisting(client, existing.id, body);
          if (updatedAfterDuplicate.error) throw updatedAfterDuplicate.error;
          return { id: existing.id, existed: true, updated: true, skipped: false, dedupeKey: body.dedupe_key };
        }
      }
      throw inserted.error;
    }

    return { id: inserted.data.id, existed: false, skipped: false, dedupeKey: body.dedupe_key };
  }

  window.OMASBhdService = {
    n: n,
    norm: norm,
    isoDate: isoDate,
    movementAmount: movementAmount,
    sourceName: sourceName,
    dedupeKey: dedupeKey,
    buildPayload: buildPayload,
    findExisting: findExisting,
    updateExisting: updateExisting,
    ensureMovement: ensureMovement
  };
})();
