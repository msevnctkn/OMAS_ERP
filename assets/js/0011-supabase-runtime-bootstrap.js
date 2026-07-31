(function () {
  var ROWS = 'v233XmlInvoiceLines';
  var BHD_ROWS = 'bhdPersistentRowsV267';
  var PAYMENTS = 'v270FirmPayments';
  var BHD_LINKS = 'bhdPaymentLinksV273';
  var BHD_COMPANY = 'bhdRowCompanyMapV267';
  var BHD_CAT = 'bhdRowCategoryMapV267';
  var XML_CAT = 'v233XmlCategoryAssignments';
  var XML_COMPANY = 'v244XmlCompanyAssignments';
  var OFFICIAL_MAP = 'v248ProjectLineAssignments';
  var GRS_MAP = 'v256GrsCostMap';

  function requireAuth() {
    if (!window.omasSupabase) throw new Error('Supabase oturumu hazir degil.');
    if (!window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) throw new Error('Aktif sirket yok.');
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }
  function n(v) { var x = Number(v || 0); return isFinite(x) ? x : 0; }
  function norm(value) {
    return String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }
  function dateTr(value) {
    var s = String(value || '').trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (m[3] + '.' + m[2] + '.' + m[1]) : s;
  }
  function idOfBhd(row) {
    return [row && row.kaynak, row && row.referans, row && row.sira, row && row.tarih, row && row.aciklama].join('|');
  }
  async function fetchAll(table, columns, companyId) {
    var all = [], from = 0, step = 1000;
    while (true) {
      var res = await window.omasSupabase.from(table).select(columns).eq('company_id', companyId).range(from, from + step - 1);
      if (res.error) throw res.error;
      var rows = res.data || [];
      all = all.concat(rows);
      if (rows.length < step) break;
      from += step;
    }
    return all;
  }
  function buildXmlRuntimeRows(data) {
    var invoices = {}, caris = {};
    data.cariler.forEach(function (c) { caris[c.id] = c; });
    data.faturalar.forEach(function (f) { invoices[f.id] = f; });
    return data.kalemler.filter(function (line) { return !line.is_deleted; }).map(function (line, idx) {
      var inv = invoices[line.fatura_id] || {};
      var cari = caris[line.cari_id || inv.cari_id] || {};
      var id = 'sb-line-' + (line.id || idx);
      return {
        id: id,
        supabaseLineId: line.id || '',
        supabaseInvoiceId: inv.id || '',
        file: 'Supabase',
        invoiceNo: inv.invoice_no || '',
        uuid: inv.uuid || '',
        date: inv.issue_date || '',
        supplier: inv.supplier_name || cari.name || '',
        name: line.item_name || 'Kalem',
        lineNo: line.line_no || idx + 1,
        qty: n(line.quantity),
        unit: line.unit || '',
        unitPrice: n(line.unit_price),
        currency: line.currency || inv.currency || 'TRY',
        exchangeRate: n(inv.exchange_rate) || 1,
        matrah: n(line.matrah),
        kdvPct: n(line.kdv_rate),
        kdv: n(line.kdv),
        total: n(line.total) || (n(line.matrah) + n(line.kdv)),
        xmlDedupeKey: line.dedupe_key || id,
        companyCode: line.company_code || '',
        categoryMain: line.category_main || '',
        categorySub: line.category_sub || '',
        projectKind: line.project_kind || '',
        projectKey: line.project_key || '',
        projectName: line.project_name || ''
      };
    });
  }
  function buildXmlStateMaps(rows) {
    var cat = {}, company = {}, official = {}, grs = {};
    (rows || []).forEach(function (row) {
      var id = row && row.id;
      if (!id) return;
      if (row.companyCode) company[id] = row.companyCode;
      if (row.categoryMain || row.categorySub) cat[id] = { main: row.categoryMain || '', sub: row.categorySub || '' };
      if (row.projectKind === 'official' && row.projectKey) official[id] = row.projectKey;
      if (row.projectKind === 'grs' && row.projectKey) grs[id] = row.projectKey;
    });
    return { cat: cat, company: company, official: official, grs: grs };
  }
  function buildBhdRuntimeRows(data) {
    return (data.bankaHareketleri || []).filter(function (row) { return !row.is_deleted; }).map(function (row, idx) {
      var incoming = n(row.incoming);
      var outgoing = n(row.outgoing);
      var date = dateTr(row.transaction_date);
      var id = 'sb-bank-' + (row.id || idx);
      var source = row.bank_name || row.account_name || 'Supabase Banka Hareketi';
      return {
        sira: idx + 1,
        kaynak: source,
        dosyaTipi: 'Banka Hareketi',
        banka: row.bank_name || '',
        hesap: row.account_name || '',
        supabaseBankMovementId: row.id || '',
        supabaseCariId: row.cari_id || '',
        tarih: date,
        ay: String(row.transaction_date || '').slice(0, 7),
        kisiFirma: row.party_name || '',
        kategori: 'Diger',
        islemTuru: outgoing > 0 ? 'Giden' : 'Gelen',
        analizTuru: 'Gercek Nakit Hareketi',
        ticariMi: 'Ticari',
        gelen: incoming,
        giden: outgoing,
        net: incoming - outgoing,
        bakiye: row.balance == null ? '' : n(row.balance),
        aciklama: row.description || row.party_name || '',
        referans: row.dedupe_key || id,
        supabaseDedupeKey: row.dedupe_key || '',
        sirket: row.company_code || '',
        firma: row.company_code || '',
        kategori: row.category_main || 'Diger',
        altKategori: row.category_sub || '',
        bhdFileId: 'supabase:banka_hareketleri',
        bhdUploadName: 'Supabase Banka Hareketleri',
        bhdOriginalName: 'Supabase Banka Hareketleri',
        bhdImportedAt: row.created_at || '',
        __runtimeId: id
      };
    });
  }
  function buildBhdStateMaps(bhdRows) {
    var company = {}, cat = {};
    (bhdRows || []).forEach(function (row) {
      var id = idOfBhd(row);
      if (row.sirket || row.firma) company[id] = row.sirket || row.firma;
      if (row.kategori || row.altKategori) cat[id] = { main: row.kategori || 'Diger', sub: row.altKategori || '' };
    });
    return { company: company, cat: cat };
  }
  function buildPaymentRuntime(data, bhdRows) {
    var caris = {}, movementRows = {}, payments = {}, links = {};
    (data.cariler || []).forEach(function (c) { caris[c.id] = c; });
    (bhdRows || []).forEach(function (r) {
      if (r.supabaseBankMovementId) movementRows[r.supabaseBankMovementId] = r;
    });
    (data.odemeler || []).forEach(function (pay, idx) {
      var cari = caris[pay.cari_id] || {};
      var firm = cari.name || pay.cari_name || '-';
      var key = norm(firm) || '-';
      var direction = pay.direction === 'in' ? 'incoming' : (pay.direction === 'out' ? 'outgoing' : (pay.direction || 'outgoing'));
      var obj = {
        id: 'sb-pay-' + (pay.id || idx),
        supabasePaymentId: pay.id || '',
        supabaseBankMovementId: pay.banka_hareket_id || '',
        supabaseCariId: pay.cari_id || '',
        firm: firm,
        method: pay.method || 'Banka Hareketi',
        date: pay.payment_date || '',
        amount: n(pay.amount),
        direction: direction,
        movementLabel: direction === 'incoming' ? 'Gelen tahsilat' : 'Giden ödeme',
        note: pay.note || '',
        createdAt: pay.created_at || '',
        source: 'Supabase'
      };
      if (!payments[key]) payments[key] = [];
      payments[key].push(obj);
      var row = movementRows[pay.banka_hareket_id];
      if (row) {
        links[idOfBhd(row)] = {
          paymentId: obj.id,
          supabasePaymentId: obj.supabasePaymentId,
          supabaseBankMovementId: obj.supabaseBankMovementId,
          supabaseCariId: obj.supabaseCariId,
          firm: firm,
          firmKey: key,
          amount: obj.amount,
          date: obj.date,
          direction: obj.direction,
          movementLabel: obj.movementLabel
        };
      }
    });
    return { payments: payments, links: links };
  }
  async function safeFetch(table, columns, companyId) {
    try {
      return await fetchAll(table, columns, companyId);
    } catch (err) {
      console.warn('Supabase runtime fetch skipped:', table, err);
      return [];
    }
  }
  async function loadRuntimeFromSupabase() {
    var auth = requireAuth();
    var data = {};
    data.cariler = await fetchAll('cariler', 'id,name,normalized_name,source,created_at', auth.companyId);
    data.faturalar = await fetchAll('faturalar', 'id,cari_id,invoice_no,uuid,issue_date,supplier_name,currency,exchange_rate,matrah,kdv,total,direction,created_at', auth.companyId);
    data.kalemlerHasStateColumns = true;
    data.kalemler = await safeFetch('fatura_kalemleri', 'id,fatura_id,cari_id,line_no,item_name,quantity,unit,unit_price,currency,matrah,kdv_rate,kdv,total,dedupe_key,proje_id,malzeme_id,company_code,category_main,category_sub,project_kind,project_key,project_name,is_deleted', auth.companyId);
    if (!data.kalemler.length) {
      data.kalemlerHasStateColumns = false;
      data.kalemler = await fetchAll('fatura_kalemleri', 'id,fatura_id,cari_id,line_no,item_name,quantity,unit,unit_price,currency,matrah,kdv_rate,kdv,total,dedupe_key,proje_id,malzeme_id', auth.companyId);
    }
    data.bankaHareketleri = await safeFetch('banka_hareketleri', 'id,cari_id,bank_name,account_name,transaction_date,description,party_name,incoming,outgoing,balance,dedupe_key,is_deleted,company_code,category_main,category_sub,created_at', auth.companyId);
    if (!data.bankaHareketleri.length) {
      data.bankaHareketleri = await safeFetch('banka_hareketleri', 'id,cari_id,bank_name,account_name,transaction_date,description,party_name,incoming,outgoing,balance,dedupe_key,created_at', auth.companyId);
    }
    data.odemeler = await safeFetch('odemeler', 'id,cari_id,banka_hareket_id,dosya_id,payment_date,method,amount,direction,note,created_at', auth.companyId);
    var rows = buildXmlRuntimeRows(data);
    var xmlState = buildXmlStateMaps(rows);
    var bhdRows = buildBhdRuntimeRows(data);
    var bhdState = buildBhdStateMaps(bhdRows);
    var paymentRuntime = buildPaymentRuntime(data, bhdRows);
    localStorage.setItem(ROWS, JSON.stringify(rows));
    if (data.kalemlerHasStateColumns && (Object.keys(xmlState.cat).length || Object.keys(xmlState.company).length || Object.keys(xmlState.official).length || Object.keys(xmlState.grs).length)) {
      localStorage.setItem(XML_CAT, JSON.stringify(xmlState.cat));
      localStorage.setItem(XML_COMPANY, JSON.stringify(xmlState.company));
      localStorage.setItem(OFFICIAL_MAP, JSON.stringify(xmlState.official));
      localStorage.setItem(GRS_MAP, JSON.stringify(xmlState.grs));
    }
    localStorage.setItem(BHD_ROWS, JSON.stringify(bhdRows));
    if (Object.keys(bhdState.company).length) localStorage.setItem(BHD_COMPANY, JSON.stringify(bhdState.company));
    if (Object.keys(bhdState.cat).length) localStorage.setItem(BHD_CAT, JSON.stringify(bhdState.cat));
    localStorage.setItem(PAYMENTS, JSON.stringify(paymentRuntime.payments));
    localStorage.setItem(BHD_LINKS, JSON.stringify(paymentRuntime.links));
    /*
    if (window.bhdRawRows && Array.isArray(window.bhdRawRows)) {
      window.bhdRawRows.length = 0;
      bhdRows.forEach(function (r, i) {
        r.sira = i + 1;
        window.bhdRawRows.push(r);
      });
    } else {
      window.bhdRawRows = bhdRows.slice();
    }
      */
    window.__omasSupabaseRuntime = {
      loadedAt: new Date(),
      rows: rows.length,
      invoices: data.faturalar.length,
      cariler: data.cariler.length,
      bhdRows: bhdRows.length,
      payments: data.odemeler.length
    };
    try { if (window.v233RenderXml) window.v233RenderXml(); } catch (e) {}
    try { if (window.v233RenderCategory) window.v233RenderCategory(); } catch (e) {}
    try { if (window.v270ShowCategorize && document.querySelector('#v189PageCategorize.active')) window.v270ShowCategorize(); } catch (e) {}
    try { if (window.v270ShowCompany && document.querySelector('#v189PageCompany.active')) window.v270ShowCompany(); } catch (e) {}
    try { if (window.buildViews) window.buildViews(); } catch (e) {}
    try { if (window.renderKpis) window.renderKpis(); } catch (e) {}
    try { if (window.v273PatchBhdPaymentBridge) window.v273PatchBhdPaymentBridge(); } catch (e) {}
    try { if (window.omasExportManagementSummaryExcel) window.dispatchEvent(new CustomEvent('omas:runtime-loaded', { detail: window.__omasSupabaseRuntime })); } catch (e) {}
    return window.__omasSupabaseRuntime;
  }
  function showStatus(text, ok) {
    var badge = document.getElementById('omasAuthBadge') || document.body;
    var box = document.getElementById('omasRuntimeBootstrapStatus');
    if (!box) {
      box = document.createElement('span');
      box.id = 'omasRuntimeBootstrapStatus';
      box.style.cssText = 'margin-left:8px;font-weight:800;font-size:12px;color:#0f172a';
      badge.appendChild(box);
    }
    box.textContent = text;
    box.style.color = ok ? '#166534' : '#991b1b';
  }
  async function boot() {
    try {
      showStatus('Supabase verisi yukleniyor...', true);
      var res = await loadRuntimeFromSupabase();
      showStatus('Supabase runtime: ' + res.rows + ' kalem, ' + res.bhdRows + ' BHD, ' + res.payments + ' ödeme', true);
    } catch (e) {
      showStatus('Supabase runtime hata: ' + (e && e.message ? e.message : e), false);
    }
  }
  window.addEventListener('omas:auth-ready', function () { setTimeout(boot, 400); });
  window.omasLoadRuntimeFromSupabase = loadRuntimeFromSupabase;
})();
