(function () {
  'use strict';

  var ROWS_KEY = 'v233XmlInvoiceLines';

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function readJson(key, fallback) {
    try {
      var rawValue = localStorage.getItem(key);

      if (!rawValue) {
        return fallback;
      }

      var value = JSON.parse(rawValue);
      return value == null ? fallback : value;
    } catch (err) {
      console.error('[OMAS XML] Local veri okunamadı:', err);
      return fallback;
    }
  }

  function n(value) {
    var num = Number(value || 0);
    return isFinite(num) ? num : 0;
  }

  function round2(value) {
    return Math.round(n(value) * 100) / 100;
  }

  function normName(value) {
    return String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function dateOrNull(value) {
    var text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  }

  function getErrorMessage(error) {
    if (!error) return 'Bilinmeyen hata';

    return (
      error.message ||
      error.details ||
      error.hint ||
      String(error)
    );
  }

  function isDuplicateError(error) {
    return Boolean(error && String(error.code) === '23505');
  }

  function lineDedupe(row) {
    if (row && row.xmlDedupeKey) {
      return String(row.xmlDedupeKey);
    }

    return [
      (row && row.uuid) || '',
      (row && row.invoiceNo) || '',
      (row && row.date) || '',
      (row && row.supplier) || '',
      (row && row.lineNo) || '',
      (row && row.name) || '',
      round2(row && row.matrah).toFixed(2),
      round2(row && row.kdv).toFixed(2),
      (row && row.currency) || 'TRY'
    ].map(normName).join('|');
  }

  function invoiceKey(row) {
    return [
      (row && row.uuid) || '',
      (row && row.invoiceNo) || '',
      (row && row.date) || '',
      (row && row.supplier) || '',
      (row && row.file) || ''
    ].join('|');
  }

  function groupInvoices(rows) {
    var map = {};

    rows.forEach(function (row) {
      if (!row || !row.invoiceNo) return;

      var key = invoiceKey(row);

      if (!map[key]) {
        map[key] = {
          key: key,
          first: row,
          rows: [],
          matrah: 0,
          kdv: 0,
          total: 0
        };
      }

      map[key].rows.push(row);
      map[key].matrah += n(row.matrah);
      map[key].kdv += n(row.kdv);
      map[key].total += n(row.total) || (n(row.matrah) + n(row.kdv));
    });

    return Object.values(map);
  }

  function status(text, ok) {
    var el = q('#omasXmlSupabaseStatus');

    if (!el) return;

    el.textContent = text || '';
    el.style.color = ok ? '#166534' : '#b42318';
  }

  function requireClient() {
    if (!window.omasSupabase) {
      throw new Error('Supabase oturumu hazır değil. Önce giriş yap.');
    }

    if (
      !window.OMAS_AUTH ||
      !window.OMAS_AUTH.company ||
      !window.OMAS_AUTH.company.id
    ) {
      throw new Error('Aktif şirket bulunamadı. Önce giriş yap.');
    }

    return {
      client: window.omasSupabase,
      companyId: window.OMAS_AUTH.company.id
    };
  }

  async function ensureCari(client, companyId, name) {
    var clean = String(name || '-').trim() || '-';
    var normalized = normName(clean) || 'BILINMEYEN';

    var result = await client
      .from('cariler')
      .upsert(
        {
          company_id: companyId,
          name: clean,
          normalized_name: normalized,
          source: 'xml'
        },
        {
          onConflict: 'company_id,normalized_name'
        }
      )
      .select('id, name')
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  async function findExistingInvoice(client, companyId, group) {
    var row = group.first;
    var issueDate = dateOrNull(row.date);
    var total = round2(group.total);

    var query = client
      .from('faturalar')
      .select('id')
      .eq('company_id', companyId)
      .eq('direction', 'alis')
      .eq('invoice_no', String(row.invoiceNo || ''))
      .eq('total', total)
      .limit(1);

    if (row.uuid) {
      query = query.eq('uuid', String(row.uuid));
    } else if (issueDate) {
      query = query.eq('issue_date', issueDate);
    }

    var result = await query.maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return result.data || null;
  }

  async function ensureInvoice(client, companyId, cariId, group) {
    var row = group.first;
    var issueDate = dateOrNull(row.date);
    var total = round2(group.total);

    var existingInvoice = await findExistingInvoice(
      client,
      companyId,
      group
    );

    if (existingInvoice && existingInvoice.id) {
      return {
        id: existingInvoice.id,
        existed: true
      };
    }

    var insertResult = await client
      .from('faturalar')
      .insert({
        company_id: companyId,
        cari_id: cariId,
        direction: 'alis',
        invoice_no: String(row.invoiceNo || ''),
        uuid: row.uuid ? String(row.uuid) : null,
        issue_date: issueDate,
        supplier_name: String(row.supplier || ''),
        currency: String(row.currency || 'TRY').toUpperCase(),
        exchange_rate: n(row.exchangeRate) || 1,
        matrah: round2(group.matrah),
        kdv: round2(group.kdv),
        total: total,
        xml_hash: group.key
      })
      .select('id')
      .single();

    if (insertResult.error) {
      /*
       * İki farklı bilgisayar aynı faturayı aynı anda yüklerse,
       * UNIQUE index ikinci eklemeyi 23505 koduyla reddeder.
       * Bu durumda mevcut faturayı bulup normal biçimde devam ediyoruz.
       */
      if (isDuplicateError(insertResult.error)) {
        var duplicateInvoice = await findExistingInvoice(
          client,
          companyId,
          group
        );

        if (duplicateInvoice && duplicateInvoice.id) {
          return {
            id: duplicateInvoice.id,
            existed: true
          };
        }
      }

      throw insertResult.error;
    }

    return {
      id: insertResult.data.id,
      existed: false
    };
  }

  function buildLinePayload(companyId, invoiceId, cariId, rows) {
    return rows.map(function (row) {
      return {
        company_id: companyId,
        fatura_id: invoiceId,
        cari_id: cariId,
        line_no: Number(row.lineNo || 1),
        item_name: String(row.name || 'Kalem'),
        quantity: n(row.qty),
        unit: row.unit ? String(row.unit) : null,
        unit_price: n(row.unitPrice),
        currency: String(row.currency || 'TRY').toUpperCase(),
        matrah: round2(row.matrah),
        kdv_rate: n(row.kdvPct),
        kdv: round2(row.kdv),
        total: round2(
          n(row.total) || (n(row.matrah) + n(row.kdv))
        ),
        dedupe_key: lineDedupe(row)
      };
    });
  }

  async function upsertInvoiceLines(
    client,
    companyId,
    invoiceId,
    cariId,
    rows
  ) {
    var linePayload = buildLinePayload(
      companyId,
      invoiceId,
      cariId,
      rows
    );

    if (!linePayload.length) {
      return {
        processed: 0,
        returned: 0
      };
    }

    var result = await client
      .from('fatura_kalemleri')
      .upsert(linePayload, {
        onConflict: 'company_id,dedupe_key'
      })
      .select('id');

    if (result.error) {
      throw result.error;
    }

    return {
      processed: linePayload.length,
      returned: Array.isArray(result.data) ? result.data.length : 0
    };
  }

  async function tableCount(client, table, companyId) {
    var result = await client
      .from(table)
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('company_id', companyId);

    if (result.error) {
      throw result.error;
    }

    return result.count || 0;
  }

  async function writeAuditLog(client, companyId, stats) {
    try {
      var authResult = await client.auth.getUser();
      var userId =
        authResult &&
        authResult.data &&
        authResult.data.user &&
        authResult.data.user.id
          ? authResult.data.user.id
          : null;

      var auditResult = await client
        .from('audit_log')
        .insert({
          company_id: companyId,
          user_id: userId,
          action: 'xml_import',
          entity_type: 'faturalar',
          details: {
            toplam_fatura: stats.toplam,
            yeni_fatura: stats.faturalar,
            mevcut_fatura: stats.atlanan,
            hatali_fatura: stats.hatali,
            islenen_kalem: stats.kalemler,
            sure_ms: stats.sureMs
          }
        });

      if (auditResult.error) {
        console.warn(
          '[OMAS XML] Audit log yazılamadı:',
          auditResult.error
        );
      }
    } catch (err) {
      console.warn('[OMAS XML] Audit log hatası:', err);
    }
  }

  function createSummaryText(stats) {
    var seconds = (stats.sureMs / 1000).toFixed(2);

    return [
      'XML aktarımı tamamlandı.',
      'Toplam: ' + stats.toplam,
      'Yeni: ' + stats.faturalar,
      'Mevcut/atlanan: ' + stats.atlanan,
      'Hatalı: ' + stats.hatali,
      'İşlenen kalem: ' + stats.kalemler,
      'Süre: ' + seconds + ' sn',
      'Veritabanı toplamı: ' +
        stats.supabaseFaturalar +
        ' fatura, ' +
        stats.supabaseKalemler +
        ' kalem'
    ].join(' | ');
  }

  async function syncXmlRowsToSupabase() {
    var startedAt = Date.now();
    var auth = requireClient();

    var rows = readJson(ROWS_KEY, []).filter(function (row) {
      return row && row.invoiceNo;
    });

    if (!rows.length) {
      status(
        'Aktarılacak XML faturası yok. Önce Fatura XML Oku bölümünden XML yükle.',
        false
      );
      return;
    }

    var groups = groupInvoices(rows);

    var stats = {
      toplam: groups.length,
      cariler: 0,
      faturalar: 0,
      atlanan: 0,
      kalemler: 0,
      hatali: 0,
      hatalar: [],
      sureMs: 0,
      supabaseFaturalar: 0,
      supabaseKalemler: 0
    };

    status(
      groups.length + ' fatura Supabase’e aktarılıyor...',
      true
    );

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var first = group.first;

      try {
        var cari = await ensureCari(
          auth.client,
          auth.companyId,
          first.supplier || '-'
        );

        stats.cariler++;

        var invoiceResult = await ensureInvoice(
          auth.client,
          auth.companyId,
          cari.id,
          group
        );

        if (invoiceResult.existed) {
          stats.atlanan++;
        } else {
          stats.faturalar++;
        }

        var lineResult = await upsertInvoiceLines(
          auth.client,
          auth.companyId,
          invoiceResult.id,
          cari.id,
          group.rows
        );

        stats.kalemler += lineResult.processed;
      } catch (err) {
        stats.hatali++;

        stats.hatalar.push({
          invoiceNo: String(first.invoiceNo || ''),
          uuid: first.uuid ? String(first.uuid) : null,
          message: getErrorMessage(err)
        });

        console.error(
          '[OMAS XML] Fatura aktarılamadı:',
          first.invoiceNo,
          err
        );
      }

      if (
        i % 10 === 0 ||
        i === groups.length - 1
      ) {
        status(
          (i + 1) +
            ' / ' +
            groups.length +
            ' işlendi | Yeni: ' +
            stats.faturalar +
            ' | Mevcut: ' +
            stats.atlanan +
            ' | Hatalı: ' +
            stats.hatali,
          true
        );
      }
    }

    stats.supabaseFaturalar = await tableCount(
      auth.client,
      'faturalar',
      auth.companyId
    );

    stats.supabaseKalemler = await tableCount(
      auth.client,
      'fatura_kalemleri',
      auth.companyId
    );

    stats.sureMs = Date.now() - startedAt;

    await writeAuditLog(
      auth.client,
      auth.companyId,
      stats
    );

    var hasErrors = stats.hatali > 0;

    status(
      createSummaryText(stats),
      !hasErrors
    );

    window.dispatchEvent(
      new CustomEvent('omas:xml-synced', {
        detail: stats
      })
    );

    return stats;
  }

  function installButton() {
    var readBtn = q('#v233XmlRead');

    if (!readBtn || q('#omasXmlSupabaseSync')) {
      return;
    }

    var btn = document.createElement('button');

    btn.type = 'button';
    btn.id = 'omasXmlSupabaseSync';
    btn.textContent = 'Supabase’e Aktar';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
    btn.style.border = '0';
    btn.style.borderRadius = '8px';
    btn.style.padding = '9px 12px';
    btn.style.fontWeight = '900';
    btn.style.cursor = 'pointer';

    readBtn.insertAdjacentElement('afterend', btn);

    var statusEl = document.createElement('div');

    statusEl.id = 'omasXmlSupabaseStatus';
    statusEl.style.gridColumn = '1 / -1';
    statusEl.style.fontSize = '12px';
    statusEl.style.fontWeight = '900';
    statusEl.style.marginTop = '6px';

    readBtn.parentNode.insertAdjacentElement(
      'afterend',
      statusEl
    );

    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Aktarılıyor...';

      syncXmlRowsToSupabase()
        .catch(function (err) {
          console.error('[OMAS XML] Aktarım hatası:', err);

          status(
            getErrorMessage(err),
            false
          );
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Supabase’e Aktar';
        });
    };
  }

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      setTimeout(installButton, 600);
      setTimeout(installButton, 1500);
    }
  );

  document.addEventListener(
    'click',
    function (event) {
      var nav =
        event.target &&
        event.target.closest &&
        event.target.closest('[data-v189-page="xml"]');

      if (nav) {
        setTimeout(installButton, 100);
        setTimeout(installButton, 500);
      }
    },
    true
  );

  setInterval(installButton, 1200);

  window.omasSyncXmlRowsToSupabase =
    syncXmlRowsToSupabase;
})();