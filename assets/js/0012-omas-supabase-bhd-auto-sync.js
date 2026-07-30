(function () {
  var BHD_ROWS = 'bhdPersistentRowsV267';
  var syncing = false;
  var queued = false;
  var lastSig = '';

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }

  function readRows() {
    try {
      var live = window.bhdRawRows && Array.isArray(window.bhdRawRows) ? window.bhdRawRows : [];
      if (live.length) return live.slice();
      return JSON.parse(localStorage.getItem(BHD_ROWS) || '[]') || [];
    } catch (err) {
      return [];
    }
  }

  function norm(value) {
    return String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function n(value) {
    var num = Number(value || 0);
    return isFinite(num) ? num : 0;
  }

  function isoDate(value) {
    var s = String(value || '').trim();
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
    var tr = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!tr) return null;
    var y = Number(tr[3]);
    if (y < 100) y += 2000;
    return String(y).padStart(4, '0') + '-' + String(tr[2]).padStart(2, '0') + '-' + String(tr[1]).padStart(2, '0');
  }

  function sourceName(row) {
    return row && (row.bhdUploadName || row.bhdOriginalName || row.kaynak || row.banka || row.dosyaTipi) || 'BHD';
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

  function dedupeKey(row, idx) {
    var amount = movementAmount(row);
    return [
      'BHD',
      norm(row && (row.banka || row.dosyaTipi || row.kaynak)),
      String(row && (row.sira || idx + 1)),
      isoDate(row && (row.tarih || row.islemTarihi)) || '',
      Number(amount.incoming || 0).toFixed(2),
      Number(amount.outgoing || 0).toFixed(2),
      norm(row && (row.aciklama || row.islemAciklamasi || row.kisiFirma)),
      norm(row && (row.fisNo || row.borcAlacak || '')).slice(0, 80)
    ].join('|');
  }

  function payload(row, idx, companyId) {
    var amount = movementAmount(row);
    var date = isoDate(row && (row.tarih || row.islemTarihi));
    if (!date || (!amount.incoming && !amount.outgoing)) return null;
    var desc = String(row && (row.aciklama || row.islemAciklamasi || row.kisiFirma || sourceName(row)) || '').trim();
    var key = dedupeKey(row, idx);
    row.supabaseDedupeKey = key;
    return {
      company_id: companyId,
      cari_id: row && row.supabaseCariId || null,
      bank_name: row && (row.banka || row.bankName || '') || '',
      account_name: row && (row.hesap || row.accountName || row.dosyaTipi || '') || '',
      transaction_date: date,
      description: desc,
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

  function showStatus(text, ok) {
    var page = document.querySelector('#bhdCategoryReportPage') || document.querySelector('#bhdModule .module-box') || document.body;
    var box = document.querySelector('#omasBhdAutoSyncStatus');
    if (!box && page) {
      box = document.createElement('div');
      box.id = 'omasBhdAutoSyncStatus';
      box.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:8px;border:1px solid #dbe3ef;background:#f8fafc;color:#0f172a;font-weight:800';
      page.insertBefore(box, page.firstChild);
    }
    if (!box) return;
    box.textContent = text;
    box.style.background = ok === false ? '#fee2e2' : '#ecfdf5';
    box.style.borderColor = ok === false ? '#fecaca' : '#86efac';
    box.style.color = ok === false ? '#991b1b' : '#166534';
    var st = document.querySelector('#bhdV267Status');
    if (st && /Supabase BHD/.test(text)) st.textContent = text;
  }
  function legacyPayload(body) {
    var copy = {};
    Object.keys(body || {}).forEach(function (key) {
      if (key !== 'company_code' && key !== 'category_main' && key !== 'category_sub' && key !== 'is_deleted') copy[key] = body[key];
    });
    return copy;
  }
  async function insertMovement(client, body) {
    var inserted = await client
      .from('banka_hareketleri')
      .insert(body)
      .select('id')
      .single();
    if (!inserted.error) return inserted;
    var msg = inserted.error && inserted.error.message ? inserted.error.message : '';
    if (/company_code|category_main|category_sub|is_deleted|column/i.test(msg)) {
      inserted = await client
        .from('banka_hareketleri')
        .insert(legacyPayload(body))
        .select('id')
        .single();
    }
    return inserted;
  }

  async function syncRows(reason) {
    var a = auth();
    if (!a) return { saved: 0, skipped: 0 };
    if (syncing) {
      queued = true;
      return { saved: 0, skipped: 0, queued: true };
    }
    syncing = true;
    queued = false;
    try {
      var rows = readRows().filter(function (row) { return row && !row.supabaseBankMovementId; });
      var sig = rows.length + ':' + rows.map(function (r, i) { return dedupeKey(r, i); }).join('~').slice(0, 4000);
      if (!rows.length || sig === lastSig) return { saved: 0, skipped: rows.length };
      lastSig = sig;
      var saved = 0, skipped = 0, errors = [];
      showStatus('Supabase BHD kaydi basladi: ' + rows.length + ' hareket...', true);
      for (var i = 0; i < rows.length; i++) {
        var body = payload(rows[i], i, a.companyId);
        if (!body) { skipped++; continue; }
        try {
          var existing = await a.client
            .from('banka_hareketleri')
            .select('id')
            .eq('company_id', a.companyId)
            .eq('dedupe_key', body.dedupe_key)
            .maybeSingle();
          if (existing.error) throw existing.error;
          if (existing.data && existing.data.id) {
            rows[i].supabaseBankMovementId = existing.data.id;
            skipped++;
            continue;
          }
          var inserted = await insertMovement(a.client, body);
          if (inserted.error) throw inserted.error;
          rows[i].supabaseBankMovementId = inserted.data && inserted.data.id || '';
          saved++;
        } catch (err) {
          errors.push((sourceName(rows[i]) || 'BHD') + ': ' + (err && err.message ? err.message : String(err)));
        }
      }
      if (window.bhdRawRows && Array.isArray(window.bhdRawRows)) {
        window.bhdRawRows.forEach(function (row, i) {
          if (rows[i] && rows[i].supabaseBankMovementId) row.supabaseBankMovementId = rows[i].supabaseBankMovementId;
        });
      }
      showStatus('Supabase BHD kaydi tamam: yeni ' + saved + ', zaten var/atlanan ' + skipped + (errors.length ? ', hata ' + errors.length : '') + '.', errors.length ? false : true);
      if (errors.length) console.warn('Supabase BHD auto sync errors', errors);
      try { if (window.omasLoadRuntimeFromSupabase) setTimeout(window.omasLoadRuntimeFromSupabase, 600); } catch (e) {}
      return { saved: saved, skipped: skipped, errors: errors };
    } finally {
      syncing = false;
      if (queued) setTimeout(function () { syncRows('queued'); }, 500);
    }
  }

  function schedule(reason) {
    setTimeout(function () { syncRows(reason).catch(function (err) {
      showStatus('Supabase BHD kaydi hatasi: ' + (err && err.message ? err.message : String(err)), false);
    }); }, 350);
  }

  var nativeSetItem = Storage.prototype.setItem;
  if (!nativeSetItem.__omasBhdAutoSync) {
    var wrapped = function (key, value) {
      var result = nativeSetItem.apply(this, arguments);
      if (this === window.localStorage && key === BHD_ROWS) schedule('localStorage');
      return result;
    };
    wrapped.__omasBhdAutoSync = true;
    Storage.prototype.setItem = wrapped;
  }

  window.omasSyncBhdRowsToSupabase = syncRows;
  /*
  window.addEventListener('omas:auth-ready', function () { setTimeout(function () { schedule('auth-ready'); }, 1200); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { schedule('dom-ready'); }, 1800); });
  setTimeout(function () { schedule('late-load'); }, 2500);
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('#bhdV267Read');
    if (btn) setTimeout(function () { schedule('read-click'); }, 1800);
  }, true);
  */

  OMAS.Services = OMAS.Services || {};
  OMAS.Services.BHD = OMAS.Services.BHD || {};

  OMAS.Services.BHD.saveToDatabase = function () {
      return syncRows('manual');
  };
})();
