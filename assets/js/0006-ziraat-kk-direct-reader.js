(function () {
  var ROWS_KEY = 'bhdPersistentRowsV267';
  var FILES_KEY = 'bhdFileManifestV276';
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  function q(s, r) { return (r || document).querySelector(s); }
  function norm(v) {
    try { return String(v || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    catch (e) { return String(v || '').toUpperCase(); }
  }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function ziraatKkName(file) { var n = norm(file && file.name); return /ZIRAAT/.test(n) && /(\bKK\b|KREDI KART|KREDI KARTI|BANKKART)/.test(n); }
  function monthName(d) {
    var a = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
    return d && !isNaN(d) ? a[d.getMonth()] : '';
  }
  function parseDate(s, fallbackYear) {
    var m = String(s || '').match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/);
    if (!m) return null;
    var y = m[3] ? Number(m[3]) : fallbackYear;
    if (y < 100) y += 2000;
    return new Date(y, Number(m[2]) - 1, Number(m[1]));
  }
  function money(txt) {
    var s = String(txt || '').replace(/\s|TL|TRY/gi, '').trim();
    s = s.replace(/[+\-]/g, '');
    var lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lastComma > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
    return Number(s) || 0;
  }
  function cleanDesc(s) {
    return String(s || '')
      .replace(/^\s*\d{1,4}:\s*/, '')
      .replace(/^\d{3,6}\s+/, '')
      .replace(/\bUSD\b|\bTL\b|\bTRY\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'PDF satiri';
  }
  function looksLikeCardPayment(desc) {
    return /SUBE\s*HESAPTAN|HESAPTAN\s*ODEME|OTOMATIK\s*ODEME|ODEME\s*TESEKKUR|TESEKKUR\s*EDERIZ|KART\s*ODEMESI/i.test(norm(desc));
  }
  function pickAmounts(body) {
    var text = String(body || '');
    var re = /[+\-]?\d[\d\.\s]*,\d{2}[+\-]?|[+\-]?\d[\d,\s]*\.\d{2}[+\-]?/g;
    var out = [], m;
    while ((m = re.exec(text))) {
      out.push({ text: m[0], index: m.index || 0, amount: money(String(m[0]).replace(/\s+/g, '')) });
    }
    return out;
  }
  function parseStatementLine(raw, fallbackYear) {
    var line = String(raw || '').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
    if (!line) return null;
    line = line.replace(/^\s*\d{1,4}:\s*/, '');

    var dm = line.match(/^\s*(\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)/);
    var date = dm ? parseDate(dm[1], fallbackYear) : null;
    var descStart = dm && typeof dm.index === 'number' ? dm.index + dm[1].length : 0;
    var tail = line.slice(descStart).trim();
    var amountTail = tail;
    var descTail = tail;
    var shopifyUsd = null;
    if (/SHOPIFY/i.test(norm(tail)) && /\bUSD\b/i.test(tail)) {
      shopifyUsd = tail.match(/\bUSD\s*[+\-]?\d+(?:[\.,]\d{2})?/i);
      if (shopifyUsd) {
        descTail = tail.slice(0, shopifyUsd.index).trim();
        amountTail = tail.slice(shopifyUsd.index + shopifyUsd[0].length).trim();
      }
    }
    var amounts = pickAmounts(amountTail);
    var picked = amounts.filter(function (m) { return m.amount > 0; })[0] || null;
    if (!picked) return { parsed: false, date: date, amount: 0, desc: cleanDesc(line), raw: line };

    var desc = cleanDesc(shopifyUsd ? descTail : amountTail.slice(0, picked.index));
    return { parsed: true, date: date, amount: picked.amount, desc: desc, raw: line };
  }
  function makeRow(rows, source, date, desc, amount, idx) {
    var payment = looksLikeCardPayment(desc);
    var type = payment ? 'Yapilan Kredi Karti Odemeleri' : 'Kredi Karti Harcamasi';
    var dateText = date && !isNaN(date) ? date.toLocaleDateString('tr-TR') : '';
    return {
      sira: rows.length + 1,
      kaynak: source,
      dosyaTipi: 'Ziraat Kredi Karti PDF',
      banka: 'Ziraat Bankasi',
      ziraatKk: true,
      tarih: dateText,
      ay: monthName(date),
      kisiFirma: desc,
      personel: '',
      kategori: type,
      islemTuru: payment ? 'Odeme' : 'Giden',
      analizTuru: type,
      ticariMi: payment ? 'Ticari Degil' : 'Ticari',
      gelen: 0,
      giden: payment ? 0 : amount,
      net: payment ? 0 : -amount,
      aciklama: desc,
      islemAciklamasi: desc,
      islemTarihi: dateText,
      tlTutar: amount,
      tutar: amount,
      amount: amount,
      borc: amount,
      usdTutar: 0,
      bankkartLira: 0,
      rawPdfLine: desc,
      referans: source + '-DIRECT-ZIRAAT-' + idx + '-' + rows.length,
      bhdFileId: 'direct-ziraat-' + source,
      bhdUploadName: source,
      bhdOriginalName: source,
      bhdImportedAt: new Date().toISOString()
    };
  }
  function makeDebugRow(rows, source, parsed, idx) {
    var date = parsed && parsed.date;
    var dateText = date && !isNaN(date) ? date.toLocaleDateString('tr-TR') : '';
    return {
      sira: rows.length + 1,
      kaynak: source,
      dosyaTipi: 'Ziraat Kredi Karti PDF Debug Satiri',
      banka: 'Ziraat Bankasi',
      ziraatKk: true,
      ziraatDebugLine: true,
      tarih: dateText,
      ay: monthName(date),
      kisiFirma: 'PDF Debug Satiri',
      personel: '',
      kategori: 'PDF Debug Satiri',
      islemTuru: 'Debug',
      analizTuru: 'PDF Debug Satiri',
      ticariMi: 'Kontrol',
      gelen: 0,
      giden: 0,
      net: 0,
      aciklama: parsed && parsed.desc ? parsed.desc : 'PDF satiri',
      islemAciklamasi: parsed && parsed.desc ? parsed.desc : 'PDF satiri',
      islemTarihi: dateText,
      tlTutar: 0,
      usdTutar: 0,
      bankkartLira: 0,
      referans: source + '-DEBUG-LINE-' + idx,
      bhdFileId: 'direct-ziraat-' + source,
      bhdUploadName: source,
      bhdOriginalName: source,
      bhdImportedAt: new Date().toISOString()
    };
  }
  function parseRowsFromLines(lines, source) {
    var rows = [];
    var yearMatches = String(source + ' ' + lines.join(' ')).match(/20\d{2}/g) || [];
    var fallbackYear = yearMatches.length ? Number(yearMatches[yearMatches.length - 1]) : (new Date()).getFullYear();
    lines.forEach(function (line, idx) {
      var parsed = parseStatementLine(line, fallbackYear);
      if (!parsed) return;
      rows.push(parsed.parsed ? makeRow(rows, source, parsed.date, parsed.desc, parsed.amount, idx) : makeDebugRow(rows, source, parsed, idx));
    });
    return rows;
  }
  function ensurePdfJs() {
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        resolve(window.pdfjsLib);
        return;
      }
      var s = document.createElement('script');
      s.src = PDFJS;
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { reject(new Error('PDF okuyucu yuklenemedi.')); };
      document.head.appendChild(s);
    });
  }
  async function readPdfLines(file) {
    var pdfjs = await ensurePdfJs();
    var pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    var lines = [];
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p);
      var content = await page.getTextContent();
      var buckets = [];
      (content.items || []).forEach(function (it) {
        var tr = it.transform || [0, 0, 0, 0, 0, 0], x = tr[4] || 0, y = tr[5] || 0, str = String(it.str || '').trim();
        if (!str) return;
        var bucket = buckets.find(function (b) { return Math.abs(b.y - y) < 2.5; });
        if (!bucket) { bucket = { y: y, items: [] }; buckets.push(bucket); }
        bucket.items.push({ x: x, str: str });
      });
      buckets.sort(function (a, b) { return b.y - a.y; }).forEach(function (b) {
        b.items.sort(function (a, c) { return a.x - c.x; });
        lines.push(b.items.map(function (i) { return i.str; }).join(' '));
      });
    }
    return lines;
  }
  function updateManifest(file, rows) {
    var mf = read(FILES_KEY, {});
    var id = 'direct-ziraat-' + file.name;
    mf[id] = {
      id: id,
      names: [file.name],
      size: file.size || 0,
      type: file.type || 'application/pdf',
      rows: rows.length,
      duplicates: 0,
      firstImportedAt: new Date().toISOString(),
      lastImportedAt: new Date().toISOString(),
      lastAdded: rows.length,
      lastSkipped: 0,
      active: true
    };
    write(FILES_KEY, mf);
  }
  function rerender() {
    var mem = q('[data-bhd-v276-view="memory"]');
    if (mem) mem.classList.remove('active');
    var btn = q('[data-bhd-v267-view="category"]');
    if (btn) {
      btn.click();
      setTimeout(function () { btn.click(); }, 80);
    }
    try { if (window.buildViews) window.buildViews(); } catch (e) {}
    try { if (window.renderKpis) window.renderKpis(); } catch (e) {}
  }
  async function handle(files, statusEl, readBtn) {
    var allRows = [];
    var archiveNote = '';
    if (window.omasArchiveBhdFilesToSupabase) {
      try {
        var ar = await window.omasArchiveBhdFilesToSupabase(files);
        archiveNote = ' Supabase arsiv: ' + ar.saved + ' dosya.';
      } catch (e) {
        archiveNote = ' Supabase arsiv hatasi: ' + (e && e.message ? e.message : String(e));
      }
    }
    for (var i = 0; i < files.length; i++) {
      if (!ziraatKkName(files[i])) continue;
      if (statusEl) statusEl.textContent = files[i].name + ' dogrudan Ziraat KK okuyucu ile okunuyor...';
      var lines = await readPdfLines(files[i]);
      var rows = parseRowsFromLines(lines, files[i].name);
      updateManifest(files[i], rows);
      allRows = allRows.concat(rows);
      try { window.bhdLastPdfDebug = { file: files[i].name, createdAt: new Date().toLocaleString('tr-TR'), text: lines.join('\n'), lines: lines }; } catch (e) {}
    }
    if (!window.bhdRawRows || !Array.isArray(window.bhdRawRows)) window.bhdRawRows = [];
    window.bhdRawRows.length = 0;
    allRows.forEach(function (row, idx) {
      row.sira = idx + 1;
      window.bhdRawRows.push(row);
    });
    write(ROWS_KEY, allRows);
    if (statusEl) statusEl.textContent = 'Ziraat KK dogrudan okundu. Eklenen hareket: ' + allRows.length + '.' + archiveNote;
    rerender();
    window.dispatchEvent(new CustomEvent('omas:bhd-rows-loaded', {
      detail: { rows: allRows.slice(), source: '0006-ziraat-kk-direct-reader' }
    }));
    if (readBtn) readBtn.disabled = false;
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('#bhdV267Read');
    if (!btn) return;
    var input = q('#bhdV267Files');
    var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
    if (!files.length || !files.some(ziraatKkName)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    btn.disabled = true;
    handle(files, q('#bhdV267Status'), btn).catch(function (err) {
      btn.disabled = false;
      var msg = err && err.message ? err.message : String(err);
      var st = q('#bhdV267Status');
      if (st) st.textContent = 'Ziraat KK dogrudan okuyucu hatasi: ' + msg;
      alert('Ziraat KK dogrudan okuyucu hatasi: ' + msg);
    });
    return false;
  }, true);
})();
