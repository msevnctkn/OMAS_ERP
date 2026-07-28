(function () {
  var XML_ROWS = 'v233XmlInvoiceLines';
  var XML_ASSIGN = 'v233XmlCategoryAssignments';
  var XML_COMPANY = 'v244XmlCompanyAssignments';
  var BHD_ROWS = 'bhdPersistentRowsV267';
  var BHD_CAT = 'bhdRowCategoryMapV267';
  var BHD_COMPANY = 'bhdRowCompanyMapV267';
  var PAY = 'v270FirmPayments';

  function q(s, r) { return (r || document).querySelector(s); }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); return v == null ? fb : v; } catch (e) { return fb; } }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[<>&"']/g, function (m) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[m];
    });
  }
  function norm(v) {
    try { return String(v || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim(); }
    catch (e) { return String(v || '').toUpperCase(); }
  }
  function n(v) { var x = Number(v || 0); return isFinite(x) ? x : 0; }
  function round(v) { return Math.round(n(v) * 100) / 100; }
  function pct(part, total) { return total ? round(part / total * 100) : 0; }
  function dateNum(v) {
    var s = String(v || '').trim();
    var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return Number(iso[1]) * 10000 + Number(iso[2]) * 100 + Number(iso[3]);
    var tr = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!tr) return 0;
    var y = Number(tr[3]); if (y < 100) y += 2000;
    return y * 10000 + Number(tr[2]) * 100 + Number(tr[1]);
  }
  function inRange(value, opts) {
    opts = opts || {};
    var d = dateNum(value);
    if (!d) return true;
    if (opts.startNum && d < opts.startNum) return false;
    if (opts.endNum && d > opts.endNum) return false;
    return true;
  }
  function readReportOpts() {
    var active = q('.omas-management-report-center.active') || q('#omasManagementReportModuleCenter') || q('#omasManagementReportCenter');
    var start = (q('[data-omas-mgmt-start]', active) || q('#omasMgmtStart') || {}).value || '';
    var end = (q('[data-omas-mgmt-end]', active) || q('#omasMgmtEnd') || {}).value || '';
    return { start: start, end: end, startNum: dateNum(start), endNum: dateNum(end) };
  }
  function periodLabel(opts) {
    opts = opts || {};
    if (opts.start || opts.end) return (opts.start || 'Ilk kayit') + ' - ' + (opts.end || 'Son kayit');
    return 'Tum kayitlar';
  }
  function companyName(v) {
    v = String(v || '').toUpperCase();
    if (v === 'O') return 'Otomasyon';
    if (v === 'K') return 'Konsept';
    if (v === 'R') return 'Ortak';
    return 'Secilmedi';
  }
  function xmlCompany(row, companyMap) {
    var v = String(companyMap[row.id] || row.companyCode || '').toUpperCase();
    if (!v && row.firma) v = String(row.firma).toUpperCase();
    return companyName(v);
  }
  function xmlMatrah(r) {
    var qty = n(r.qty), unit = n(r.unitPrice), calc = qty > 0 && unit > 0 ? qty * unit : 0, mat = n(r.matrah);
    if (calc > 0 && (mat <= 0 || Math.abs(calc - mat) / Math.max(calc, mat) < 0.02)) return calc;
    return mat;
  }
  function xmlKdv(r) {
    var mat = xmlMatrah(r), kdv = n(r.kdv), p = n(r.kdvPct), calc = mat && p ? mat * p / 100 : 0;
    if (calc > 0 && (kdv <= 0 || Math.abs(calc - kdv) / Math.max(calc, kdv) < 0.02)) return calc;
    return kdv;
  }
  function xmlTotal(r) {
    var total = n(r.total);
    return total || (xmlMatrah(r) + xmlKdv(r));
  }
  function xmlCat(row, ass) {
    var a = ass[row.id] || {};
    return { main: a.main || 'Kategorisiz', sub: a.sub || '-' };
  }
  function bhdId(r) {
    return [r && r.kaynak, r && r.referans, r && r.sira, r && r.tarih, r && r.aciklama].join('|');
  }
  function bhdCat(row, map) {
    var m = map[bhdId(row)] || {};
    return { main: m.main || row.kategori || 'Diger', sub: m.sub || row.altKategori || '-' };
  }
  function bhdCompany(row, map) {
    return companyName(map[bhdId(row)] || row.sirket || row.firma || '');
  }
  function isCard(r) {
    return !!(r && (r.ziraatKk || r.isbankKk || /Kredi Karti|Kredi Kartı|Kart/i.test(String(r.dosyaTipi || ''))));
  }
  function bhdSpend(r) {
    return n(r.giden) || Math.abs(Math.min(0, n(r.net))) || n(r.tlTutar) || n(r.tutar) || n(r.amount) || 0;
  }
  function bhdIn(r) {
    return n(r.gelen) || Math.max(0, n(r.net)) || 0;
  }
  function add(obj, key, vals) {
    if (!obj[key]) obj[key] = Object.assign({ key: key, count: 0, matrah: 0, kdv: 0, total: 0, gelen: 0, giden: 0, net: 0, paid: 0, collected: 0 }, vals && vals.seed || {});
    obj[key].count += vals && vals.count != null ? vals.count : 1;
    ['matrah', 'kdv', 'total', 'gelen', 'giden', 'net', 'paid', 'collected'].forEach(function (k) { obj[key][k] += n(vals && vals[k]); });
    return obj[key];
  }
  function paymentMap(opts) {
    var raw = read(PAY, {}), out = {};
    Object.keys(raw || {}).forEach(function (k) {
      (raw[k] || []).forEach(function (p) {
        if (!inRange(p && p.date, opts)) return;
        var key = norm(p && (p.firm || k));
        if (!key) return;
        if (!out[key]) out[key] = { paid: 0, collected: 0, count: 0, rows: [] };
        var amount = n(p.amount);
        if (p.direction === 'incoming') out[key].collected += amount;
        else out[key].paid += amount;
        out[key].count++;
        out[key].rows.push(p);
      });
    });
    return out;
  }
  function isCommercial(cat) {
    var t = norm((cat && cat.main) + ' ' + (cat && cat.sub));
    if (/TICARI OLMAYAN|ORTAKLAR|VIRMAN|KREDI|KREDI KARTI ODEMELERI|TICARI DEGIL/.test(t)) return false;
    return true;
  }
  function sheetXml(name, rows) {
    var xml = '<Worksheet ss:Name="' + esc(String(name).slice(0, 31)) + '"><Table>';
    rows.forEach(function (row, ri) {
      xml += '<Row>';
      row.forEach(function (cell) {
        var style = ri === 0 ? ' ss:StyleID="Header"' : '';
        if (typeof cell === 'number') xml += '<Cell' + style + '><Data ss:Type="Number">' + round(cell) + '</Data></Cell>';
        else xml += '<Cell' + style + '><Data ss:Type="String">' + esc(cell) + '</Data></Cell>';
      });
      xml += '</Row>';
    });
    return xml + '</Table></Worksheet>';
  }
  function workbookXml(sheets) {
    return '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
      '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/></Style></Styles>' +
      sheets.map(function (s) { return sheetXml(s.name, s.rows); }).join('') +
      '</Workbook>';
  }
  function sortedValues(obj, metric) {
    return Object.keys(obj).map(function (k) { return obj[k]; }).sort(function (a, b) { return n(b[metric || 'total']) - n(a[metric || 'total']); });
  }
  function monthKey(value) {
    var s = String(value || '').trim();
    var iso = s.match(/^(\d{4})-(\d{1,2})-/);
    if (iso) return iso[1] + '-' + String(iso[2]).padStart(2, '0');
    var tr = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!tr) return 'Tarihsiz';
    var y = Number(tr[3]); if (y < 100) y += 2000;
    return y + '-' + String(tr[2]).padStart(2, '0');
  }
  function buildReport(opts) {
    opts = opts || {};
    var xmlRows = read(XML_ROWS, []).filter(function (r) { return inRange(r && r.date, opts); });
    var xmlAss = read(XML_ASSIGN, {});
    var xmlCo = read(XML_COMPANY, {});
    var bhdRows = ((window.bhdRawRows && window.bhdRawRows.length) ? window.bhdRawRows : read(BHD_ROWS, [])).filter(function (r) { return inRange((r && (r.tarih || r.islemTarihi || r.date)), opts); });
    var bhdCats = read(BHD_CAT, {});
    var bhdCo = read(BHD_COMPANY, {});
    var pay = paymentMap(opts);

    var invByCompany = {}, invByCompanyCat = {}, supplier = {}, invMatrah = 0, invKdv = 0, invTotal = 0;
    var monthly = {};
    xmlRows.forEach(function (r) {
      var comp = xmlCompany(r, xmlCo), cat = xmlCat(r, xmlAss), mat = xmlMatrah(r), kdv = xmlKdv(r), total = xmlTotal(r), sup = r.supplier || r.firma || 'Tedarikci yok';
      invMatrah += mat; invKdv += kdv; invTotal += total;
      add(invByCompany, comp, { matrah: mat, kdv: kdv, total: total });
      add(invByCompanyCat, comp + ' / ' + cat.main + ' / ' + cat.sub, { matrah: mat, kdv: kdv, total: total, seed: { company: comp, main: cat.main, sub: cat.sub } });
      add(supplier, norm(sup), { matrah: mat, kdv: kdv, total: total, seed: { name: sup } });
      add(monthly, monthKey(r.date), { matrah: mat, kdv: kdv, total: total });
    });

    var cardRows = bhdRows.filter(isCard);
    var bankRows = bhdRows.filter(function (r) { return !isCard(r); });
    var bankIn = 0, bankOut = 0, cardOut = 0, commercialIn = 0, nonCommercialIn = 0;
    var incomingByType = {}, incomingCustomers = {}, bankOutCat = {}, cardCat = {}, spendByCompany = {}, adRows = [];
    bankRows.forEach(function (r) {
      var cat = bhdCat(r, bhdCats), comp = bhdCompany(r, bhdCo), gelen = bhdIn(r), giden = bhdSpend(r), commercial = isCommercial(cat);
      bankIn += gelen; bankOut += giden;
      add(monthly, monthKey(r.tarih || r.islemTarihi || r.date), { gelen: gelen, giden: giden, net: gelen - giden });
      if (gelen) {
        if (commercial) commercialIn += gelen; else nonCommercialIn += gelen;
        add(incomingByType, commercial ? 'Ticari Para Girisi' : 'Ticari Olmayan Para Girisi', { gelen: gelen, total: gelen });
        add(incomingCustomers, r.aciklama || r.kisiFirma || 'Aciklama yok', { gelen: gelen, total: gelen });
      }
      if (giden) {
        add(bankOutCat, cat.main + ' / ' + cat.sub, { giden: giden, total: giden, seed: { main: cat.main, sub: cat.sub } });
        add(spendByCompany, comp + ' / Banka / ' + cat.main + ' / ' + cat.sub, { giden: giden, total: giden, seed: { company: comp, source: 'Banka', main: cat.main, sub: cat.sub } });
      }
      if (/REKLAM|PAZARLAMA|META|FACEBK|INSTAGRAM|GOOGLE|ADS/i.test(norm(cat.main + ' ' + cat.sub + ' ' + r.aciklama))) adRows.push(r);
    });
    cardRows.forEach(function (r) {
      var cat = bhdCat(r, bhdCats), comp = bhdCompany(r, bhdCo), amt = bhdSpend(r);
      cardOut += amt;
      var mo = add(monthly, monthKey(r.tarih || r.islemTarihi || r.date), { giden: amt, net: -amt, seed: { cardOut: 0 } });
      mo.cardOut = n(mo.cardOut) + amt;
      add(cardCat, cat.main + ' / ' + cat.sub, { giden: amt, total: amt, seed: { main: cat.main, sub: cat.sub } });
      add(spendByCompany, comp + ' / Kredi Karti / ' + cat.main + ' / ' + cat.sub, { giden: amt, total: amt, seed: { company: comp, source: 'Kredi Karti', main: cat.main, sub: cat.sub } });
      if (/REKLAM|PAZARLAMA|META|FACEBK|INSTAGRAM|GOOGLE|ADS/i.test(norm(cat.main + ' ' + cat.sub + ' ' + r.aciklama + ' ' + r.islemAciklamasi))) adRows.push(r);
    });

    var supplierDebtRows = sortedValues(supplier, 'total').map(function (s) {
      var p = pay[norm(s.name)] || { paid: 0, count: 0 };
      var balance = s.total - p.paid;
      return [s.name, s.count, s.matrah, s.kdv, s.total, p.paid, balance, Math.abs(balance) < 0.01 ? 'Kapandi' : (balance > 0 ? 'Borc Var' : 'Alacak Var'), p.count || 0];
    });
    var openDebt = supplierDebtRows.reduce(function (sum, r) { return sum + (r[6] > 0 ? r[6] : 0); }, 0);
    var closedCount = supplierDebtRows.filter(function (r) { return r[7] === 'Kapandi'; }).length;
    var adTotal = adRows.reduce(function (s, r) { return s + bhdSpend(r); }, 0);

    var sheets = [];
    sheets.push({ name: '01 Genel Ozet', rows: [
      ['Baslik', 'Deger'],
      ['Donem', periodLabel(opts)],
      ['Alis fatura matrah', invMatrah],
      ['Alis fatura KDV', invKdv],
      ['Alis fatura KDV dahil', invTotal],
      ['Banka para girisi', bankIn],
      ['Ticari para girisi', commercialIn],
      ['Ticari olmayan para girisi', nonCommercialIn],
      ['Banka para cikisi', bankOut],
      ['Kredi karti harcamasi', cardOut],
      ['Reklam / pazarlama harcamasi', adTotal],
      ['Tedarikci acik borc', openDebt],
      ['Kapanan tedarikci sayisi', closedCount],
      ['Rapor tarihi', new Date().toLocaleString('tr-TR')]
    ] });
    sheets.push({ name: '02 Aylik Ozet', rows: [['Ay', 'Alis Matrah', 'Alis KDV', 'Alis KDV Dahil', 'Banka Giris', 'Banka Cikis', 'Kredi Karti Harcama', 'Net Nakit']].concat(Object.keys(monthly).sort().map(function (k) { var x = monthly[k]; return [k, x.matrah, x.kdv, x.total, x.gelen, x.giden - n(x.cardOut), n(x.cardOut), x.net]; })) });
    sheets.push({ name: '03 Alis Firma Ozet', rows: [['Firma', 'Kalem', 'Matrah', 'KDV', 'KDV Dahil', 'Pay %']].concat(sortedValues(invByCompany, 'total').map(function (x) { return [x.key, x.count, x.matrah, x.kdv, x.total, pct(x.total, invTotal)]; })) });
    sheets.push({ name: '04 Firma Kategori', rows: [['Firma', 'Ana Kategori', 'Alt Kategori', 'Kalem', 'Matrah', 'KDV', 'KDV Dahil', 'Firma Ici Pay %']].concat(sortedValues(invByCompanyCat, 'total').map(function (x) { var companyTotal = invByCompany[x.company] ? invByCompany[x.company].total : 0; return [x.company, x.main, x.sub, x.count, x.matrah, x.kdv, x.total, pct(x.total, companyTotal)]; })) });
    sheets.push({ name: '05 Tedarikci Borc', rows: [['Tedarikci', 'Alis Kalemi', 'Matrah', 'KDV', 'KDV Dahil Alis', 'Odenen', 'Kalan', 'Durum', 'Odeme Kaydi']].concat(supplierDebtRows) });
    sheets.push({ name: '06 Banka Girisleri', rows: [['Tur', 'Aciklama / Musteri', 'Adet', 'Gelen', 'Pay %']].concat(sortedValues(incomingByType, 'gelen').map(function (x) { return ['Ozet', x.key, x.count, x.gelen, pct(x.gelen, bankIn)]; }), sortedValues(incomingCustomers, 'gelen').map(function (x) { return ['Musteri/Aciklama', x.key, x.count, x.gelen, pct(x.gelen, bankIn)]; })) });
    sheets.push({ name: '07 Banka Cikislari', rows: [['Ana Kategori', 'Alt Kategori', 'Adet', 'Giden', 'Pay %']].concat(sortedValues(bankOutCat, 'giden').map(function (x) { return [x.main, x.sub, x.count, x.giden, pct(x.giden, bankOut)]; })) });
    sheets.push({ name: '08 Kredi Kartlari', rows: [['Ana Kategori', 'Alt Kategori', 'Adet', 'Tutar', 'Pay %']].concat(sortedValues(cardCat, 'giden').map(function (x) { return [x.main, x.sub, x.count, x.giden, pct(x.giden, cardOut)]; })) });
    sheets.push({ name: '09 Harcama Firma', rows: [['Firma', 'Kaynak', 'Ana Kategori', 'Alt Kategori', 'Adet', 'Tutar']].concat(sortedValues(spendByCompany, 'giden').map(function (x) { return [x.company, x.source, x.main, x.sub, x.count, x.giden]; })) });
    sheets.push({ name: '10 Reklam Pazarlama', rows: [['Tarih', 'Kaynak', 'Banka', 'Tutar', 'Aciklama', 'Kategori', 'Alt Kategori']].concat(adRows.slice().sort(function (a, b) { return dateNum(a.tarih || a.islemTarihi) - dateNum(b.tarih || b.islemTarihi); }).map(function (r) { var c = bhdCat(r, bhdCats); return [r.tarih || r.islemTarihi || '', isCard(r) ? 'Kredi Karti' : 'Banka', r.banka || '', bhdSpend(r), r.islemAciklamasi || r.aciklama || '', c.main, c.sub]; })) });
    sheets.push({ name: '11 Fatura Detay', rows: [['Firma', 'Tarih', 'Fatura No', 'Tedarikci', 'Kalem', 'Matrah', 'KDV', 'KDV Dahil', 'Ana Kategori', 'Alt Kategori']].concat(xmlRows.slice().sort(function (a, b) { return dateNum(a.date) - dateNum(b.date); }).map(function (r) { var c = xmlCat(r, xmlAss); return [xmlCompany(r, xmlCo), r.date || '', r.invoiceNo || '', r.supplier || '', r.name || '', xmlMatrah(r), xmlKdv(r), xmlTotal(r), c.main, c.sub]; })) });
    sheets.push({ name: '12 BHD Detay', rows: [['Tarih', 'Kaynak Tipi', 'Banka', 'Gelen', 'Giden', 'Net', 'Bakiye', 'Aciklama', 'Ana Kategori', 'Alt Kategori']].concat(bhdRows.slice().sort(function (a, b) { return dateNum(a.tarih || a.islemTarihi) - dateNum(b.tarih || b.islemTarihi); }).map(function (r) { var c = bhdCat(r, bhdCats); return [r.tarih || r.islemTarihi || '', isCard(r) ? 'Kredi Karti' : 'Banka', r.banka || '', bhdIn(r), bhdSpend(r), n(r.net), r.bakiye == null ? '' : n(r.bakiye), r.islemAciklamasi || r.aciklama || '', c.main, c.sub]; })) });
    return workbookXml(sheets);
  }
  function showReportStatus(text, ok) {
    var host = q('#bhdV267Status') || q('#omasRuntimeBootstrapStatus') || q('#omasAppStateSyncStatus');
    if (host) {
      host.textContent = text;
      host.style.color = ok === false ? '#991b1b' : '#166534';
    }
  }
  async function refreshBeforeReport() {
    showReportStatus('Yonetici raporu icin Supabase verisi yenileniyor...', true);
    if (window.omasLoadAppStateFromSupabase) {
      try { await window.omasLoadAppStateFromSupabase(); } catch (e) { console.warn('app_state report refresh skipped', e); }
    }
    if (window.omasLoadRuntimeFromSupabase) {
      try { await window.omasLoadRuntimeFromSupabase(); } catch (e2) { console.warn('runtime report refresh skipped', e2); }
    }
  }
  async function exportReport(btn, opts) {
    var oldText = btn && btn.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Supabase yenileniyor...';
    }
    try {
      await refreshBeforeReport();
      opts = opts || readReportOpts();
      var xml = buildReport(opts);
      var blob = new Blob(['\ufeff' + xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'omas_yonetici_analiz_ozeti_' + (opts.start || 'tum') + '_' + (opts.end || new Date().toISOString().slice(0, 10)) + '.xls';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      showReportStatus('Yonetici Excel ozeti indirildi.', true);
    } catch (err) {
      showReportStatus('Yonetici raporu hata: ' + (err && err.message ? err.message : String(err)), false);
      alert('Yonetici raporu alinamadi: ' + (err && err.message ? err.message : String(err)));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || 'Yonetici Excel Ozeti';
      }
    }
  }
  function installButtons() {
    if (!q('#omasManagementExcelBtn')) {
      var bhdExcel = q('#bhdV267Excel');
      if (bhdExcel && bhdExcel.parentNode) {
        var btn = document.createElement('button');
        btn.id = 'omasManagementExcelBtn';
        btn.className = 'bhd-v267-btn';
        btn.type = 'button';
        btn.style.background = '#16a34a';
        btn.textContent = 'Yonetici Excel Ozeti';
        btn.onclick = function () { exportReport(btn, readReportOpts()); };
        bhdExcel.parentNode.insertBefore(btn, bhdExcel.nextSibling);
      }
    }
    var catHead = q('#v189PageCategory .v189-page-head');
    if (catHead && !q('#omasManagementExcelBtnCategory')) {
      var cbtn = document.createElement('button');
      cbtn.id = 'omasManagementExcelBtnCategory';
      cbtn.type = 'button';
      cbtn.textContent = 'Yonetici Excel Ozeti';
      cbtn.style.cssText = 'margin-top:10px;background:#16a34a;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer';
      cbtn.onclick = function () { exportReport(cbtn, readReportOpts()); };
      catHead.appendChild(cbtn);
    }
    ensureManagementReportModule();
    installHomeCard();
  }
  function buildReportCenter(id, activeClass) {
    var box = document.createElement('div');
    box.id = id;
    box.className = 'omas-management-report-center' + (activeClass ? ' active' : '');
    box.style.cssText = 'margin:14px 0;padding:14px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc';
    box.innerHTML = '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
      '<div><h3 style="margin:0 0 4px">Yonetici Excel Ozeti</h3><small>Alis faturasi, kategori dagilimi, banka giris/cikis, kredi karti, reklam ve tedarikci borc durumunu tek Excel dosyasina toplar.</small></div>' +
      '<div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">' +
      '<label style="font-size:12px;font-weight:800">Baslangic<br><input data-omas-mgmt-start type="date" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label>' +
      '<label style="font-size:12px;font-weight:800">Bitis<br><input data-omas-mgmt-end type="date" style="padding:8px;border:1px solid #cbd5e1;border-radius:8px"></label>' +
      '<button data-omas-mgmt-clear type="button" style="background:#0f172a;color:white;border:0;border-radius:8px;padding:10px 12px;font-weight:800;cursor:pointer">Tarih Temizle</button>' +
      '<button data-omas-mgmt-export type="button" style="background:#16a34a;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:900;cursor:pointer">Excel Ozeti Indir</button>' +
      '</div></div><div data-omas-mgmt-preview style="margin-top:10px;color:#475569;font-size:12px;font-weight:700"></div>';
    q('[data-omas-mgmt-clear]', box).onclick = function () {
      q('[data-omas-mgmt-start]', box).value = '';
      q('[data-omas-mgmt-end]', box).value = '';
      renderReportPreview(box);
    };
    q('[data-omas-mgmt-export]', box).onclick = function () { exportReport(q('[data-omas-mgmt-export]', box), readReportOpts()); };
    q('[data-omas-mgmt-start]', box).onchange = function () { renderReportPreview(box); };
    q('[data-omas-mgmt-end]', box).onchange = function () { renderReportPreview(box); };
    return box;
  }
  function renderReportPreview(scope) {
    var el = q('[data-omas-mgmt-preview]', scope) || q('#omasMgmtPreview');
    if (!el) return;
    var start = (q('[data-omas-mgmt-start]', scope) || {}).value || '';
    var end = (q('[data-omas-mgmt-end]', scope) || {}).value || '';
    var opts = start || end ? { start: start, end: end, startNum: dateNum(start), endNum: dateNum(end) } : readReportOpts();
    var xmlRows = read(XML_ROWS, []).filter(function (r) { return inRange(r && r.date, opts); }).length;
    var bhdRows = (((window.bhdRawRows && window.bhdRawRows.length) ? window.bhdRawRows : read(BHD_ROWS, [])) || []).filter(function (r) { return inRange(r && (r.tarih || r.islemTarihi || r.date), opts); }).length;
    el.textContent = 'Donem: ' + periodLabel(opts) + ' | Fatura kalemi: ' + xmlRows + ' | Banka/KK hareketi: ' + bhdRows;
  }
  function ensureManagementReportModule() {
    if (q('#managementReportModule')) return;
    var section = document.createElement('section');
    section.id = 'managementReportModule';
    section.className = 'module';
    section.style.display = 'none';
    section.innerHTML = '<div class="module-box"><div class="module-title"><h2>Yonetici Raporu</h2><button class="back-button" type="button" onclick="goHome()">Ana Sayfa</button></div><div id="omasManagementReportModuleBody"></div></div>';
    document.body.appendChild(section);
    var body = q('#omasManagementReportModuleBody', section);
    body.appendChild(buildReportCenter('omasManagementReportModuleCenter', true));
    renderReportPreview(body);
  }
  function openManagementReportModule() {
    ensureManagementReportModule();
    if (window.openModule) window.openModule('managementReportModule');
    else {
      var home = q('#home');
      if (home) home.style.display = 'none';
      Array.prototype.slice.call(document.querySelectorAll('.module')).forEach(function (m) {
        m.classList.toggle('active', m.id === 'managementReportModule');
        m.style.display = m.id === 'managementReportModule' ? 'block' : 'none';
      });
    }
    renderReportPreview(q('#omasManagementReportModuleBody'));
  }
  function installHomeCard() {
    var grid = q('#home .menu-grid');
    if (!grid || q('#omasManagementReportHomeCard')) return;
    var card = document.createElement('div');
    card.id = 'omasManagementReportHomeCard';
    card.className = 'menu-card';
    card.innerHTML = '<h2>Yonetici Raporu</h2><p>Alislar, kategoriler, banka giris/cikis, kredi karti harcamalari ve firma borc durumunu Excel olarak indirir.</p><button type="button">Rapor Merkezine Git</button>';
    card.onclick = openManagementReportModule;
    var ref = q('#home .menu-card[onclick*="materialCardsModule"]');
    if (ref && ref.nextSibling) grid.insertBefore(card, ref.nextSibling);
    else grid.appendChild(card);
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('[data-bhd-v267-view], [data-v189-page="category"]')) setTimeout(installButtons, 250);
  }, true);
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installButtons, 1200);
    setInterval(installButtons, 2000);
  });
  setTimeout(installButtons, 1500);
  window.omasExportManagementSummaryExcel = exportReport;
  window.omasOpenManagementReportModule = openManagementReportModule;
})();
