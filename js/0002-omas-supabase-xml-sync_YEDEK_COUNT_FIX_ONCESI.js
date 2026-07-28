(function () {
  var ROWS_KEY = 'v233XmlInvoiceLines';

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value == null ? fallback : value;
    } catch (err) {
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
    var s = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function lineDedupe(row) {
    if (row && row.xmlDedupeKey) return String(row.xmlDedupeKey);
    return [
      row && row.uuid || '',
      row && row.invoiceNo || '',
      row && row.date || '',
      row && row.supplier || '',
      row && row.lineNo || '',
      row && row.name || '',
      round2(row && row.matrah).toFixed(2),
      round2(row && row.kdv).toFixed(2),
      row && row.currency || 'TRY'
    ].map(normName).join('|');
  }

  function invoiceKey(row) {
    return [
      row && row.uuid || '',
      row && row.invoiceNo || '',
      row && row.date || '',
      row && row.supplier || '',
      row && row.file || ''
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
    if (!window.omasSupabase) throw new Error('Supabase oturumu hazır değil. Önce giriş yap.');
    if (!window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) {
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
    var upsert = await client
      .from('cariler')
      .upsert({
        company_id: companyId,
        name: clean,
        normalized_name: normalized,
        source: 'xml'
      }, { onConflict: 'company_id,normalized_name' })
      .select('id, name')
      .single();

    if (upsert.error) throw upsert.error;
    return upsert.data;
  }

  async function ensureInvoice(client, companyId, cariId, group) {
    var row = group.first;
    var issueDate = dateOrNull(row.date);
    var total = round2(group.total);
    var baseQuery = client
      .from('faturalar')
      .select('id')
      .eq('company_id', companyId)
      .eq('direction', 'alis')
      .eq('invoice_no', String(row.invoiceNo || ''))
      .eq('total', total)
      .limit(1);

    if (row.uuid) {
      baseQuery = baseQuery.eq('uuid', String(row.uuid));
    } else if (issueDate) {
      baseQuery = baseQuery.eq('issue_date', issueDate);
    }

    var existing = await baseQuery.maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.id) return existing.data.id;

    var insert = await client
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

    if (insert.error) throw insert.error;
    return insert.data.id;
  }

  async function syncXmlRowsToSupabase() {
    var auth = requireClient();
    var rows = readJson(ROWS_KEY, []).filter(function (row) {
      return row && row.invoiceNo;
    });
    if (!rows.length) {
      status('Aktarılacak XML faturası yok. Önce Fatura XML Oku bölümünden XML yükle.', false);
      return;
    }

    var groups = groupInvoices(rows);
    var stats = { cariler: 0, faturalar: 0, kalemler: 0 };
    status(groups.length + ' fatura Supabase’e aktarılıyor...', true);

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      var first = group.first;
      var cari = await ensureCari(auth.client, auth.companyId, first.supplier || '-');
      stats.cariler++;
      var invoiceId = await ensureInvoice(auth.client, auth.companyId, cari.id, group);
      stats.faturalar++;

      var linePayload = group.rows.map(function (row) {
        return {
          company_id: auth.companyId,
          fatura_id: invoiceId,
          cari_id: cari.id,
          line_no: Number(row.lineNo || 1),
          item_name: String(row.name || 'Kalem'),
          quantity: n(row.qty),
          unit: row.unit ? String(row.unit) : null,
          unit_price: n(row.unitPrice),
          currency: String(row.currency || 'TRY').toUpperCase(),
          matrah: round2(row.matrah),
          kdv_rate: n(row.kdvPct),
          kdv: round2(row.kdv),
          total: round2(n(row.total) || (n(row.matrah) + n(row.kdv))),
          dedupe_key: lineDedupe(row)
        };
      });

      var lines = await auth.client
        .from('fatura_kalemleri')
        .upsert(linePayload, { onConflict: 'company_id,dedupe_key' })
        .select('id');

      if (lines.error) throw lines.error;
      stats.kalemler += linePayload.length;

      if (i % 10 === 0 || i === groups.length - 1) {
        status((i + 1) + ' / ' + groups.length + ' fatura aktarıldı...', true);
      }
    }

    status('Supabase aktarımı tamamlandı. Fatura: ' + stats.faturalar + ', kalem: ' + stats.kalemler + '.', true);
    window.dispatchEvent(new CustomEvent('omas:xml-synced', { detail: stats }));
  }

  function installButton() {
    var readBtn = q('#v233XmlRead');
    if (!readBtn || q('#omasXmlSupabaseSync')) return;
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
    readBtn.parentNode.insertAdjacentElement('afterend', statusEl);

    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Aktarılıyor...';
      syncXmlRowsToSupabase()
        .catch(function (err) {
          status(err && err.message ? err.message : String(err), false);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Supabase’e Aktar';
        });
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installButton, 600);
    setTimeout(installButton, 1500);
  });
  document.addEventListener('click', function (event) {
    var nav = event.target && event.target.closest && event.target.closest('[data-v189-page="xml"]');
    if (nav) {
      setTimeout(installButton, 100);
      setTimeout(installButton, 500);
    }
  }, true);
  setInterval(installButton, 1200);

  window.omasSyncXmlRowsToSupabase = syncXmlRowsToSupabase;
})();
