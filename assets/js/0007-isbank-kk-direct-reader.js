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
  function isbankKkName(file) {
    var n = norm(file && file.name);
    return /IS/.test(n) && /(\bKK\b|KREDI\s*KART|KREDI\s*KARTI|MAXIMUM)/.test(n);
  }
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
      .replace(/\bUSD\b|\bEUR\b|\bTL\b|\bTRY\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'PDF satiri';
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
  function looksLikePayment(desc) {
    return /ODEME|TES[EŞ]KKUR|HESAPTAN|KART\s*BORCU|BORC\s*ODEME|OTOMATIK\s*ODEME/i.test(norm(desc));
  }
  function parseStatementLine(raw, fallbackYear) {
    var line = String(raw || '').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
    if (!line) return null;
    line = line.replace(/^\s*\d{1,4}:\s*/, '');

    var endDate = line.match(/(\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)\s*$/);
    if (endDate) {
      var endDateObj = parseDate(endDate[1], fallbackYear);
      var body = line.slice(0, endDate.index).trim();
      var endRef = body.match(/\b(\d{12})\s*$/);
      var ref = '';
      if (endRef) {
        ref = endRef[1];
        body = body.slice(0, endRef.index).trim();
      }
      body = body.replace(/^\d{6,12}\s+/, '').trim();
      var bodyAmounts = pickAmounts(body);
      var real = null;
      if (bodyAmounts.length > 1 && bodyAmounts[0].amount > 0 && bodyAmounts[0].amount <= 10) real = bodyAmounts[1];
      else real = bodyAmounts.filter(function (m) { return m.amount > 0; })[0] || null;
      if (real) {
        var desc = cleanDesc(body.slice(real.index + real.text.length));
        if (/^FACEBK\b/i.test(desc)) desc = 'INSTAGRAM REKLAM / ' + desc;
        return { parsed: true, date: endDateObj, amount: real.amount, desc: desc, ref: ref, raw: line };
      }
      return { parsed: false, date: endDateObj, amount: 0, desc: cleanDesc(body || line), ref: ref, raw: line };
    }

    var dm = line.match(/^\s*(\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?)/);
    var date = dm ? parseDate(dm[1], fallbackYear) : null;
    var descStart = dm && typeof dm.index === 'number' ? dm.index + dm[1].length : 0;
    var tail = line.slice(descStart).trim();
    var ref = '';
    var refMatch = tail.match(/^(\d{12})\b\s*/);
    if (refMatch) {
      ref = refMatch[1];
      tail = tail.slice(refMatch[0].length).trim();
    }
    var amountTail = tail;
    var descTail = tail;
    var fx = tail.match(/\b(?:USD|EUR)\s*[+\-]?\d+(?:[\.,]\d{2})?/i);
    if (fx) {
      descTail = tail.slice(0, fx.index).trim();
      amountTail = tail.slice(fx.index + fx[0].length).trim();
    }
    var amounts = pickAmounts(amountTail);
    var picked = amounts.filter(function (m) { return m.amount > 0; })[0] || null;
    if (!picked) return { parsed: false, date: date, amount: 0, desc: cleanDesc(tail || line), ref: ref, raw: line };
    var desc = cleanDesc(fx ? descTail : amountTail.slice(0, picked.index));
    return { parsed: true, date: date, amount: picked.amount, desc: desc, ref: ref, raw: line };
  }
  function makeRow(rows, source, parsed, idx) {
    var payment = looksLikePayment(parsed.desc);
    var type = payment ? 'Yapilan Kredi Karti Odemeleri' : 'Kredi Karti Harcamasi';
    var date = parsed.date;
    var dateText = date && !isNaN(date) ? date.toLocaleDateString('tr-TR') : '';
    var rawText = 'PDF ' + String(idx + 1).padStart(3, '0') + ': ' + (parsed.raw || parsed.desc || 'PDF satiri');
    return {
      sira: rows.length + 1,
      kaynak: source,
      dosyaTipi: 'Is Bankasi Kredi Karti PDF',
      banka: 'Is Bankasi',
      isbankKk: true,
      ziraatKk: true,
      tarih: dateText,
      ay: monthName(date),
      kisiFirma: parsed.desc,
      personel: '',
      kategori: type,
      islemTuru: payment ? 'Odeme' : 'Giden',
      analizTuru: type,
      ticariMi: payment ? 'Ticari Degil' : 'Ticari',
      gelen: 0,
      giden: payment ? 0 : parsed.amount,
      net: payment ? 0 : -parsed.amount,
      aciklama: rawText,
      islemAciklamasi: rawText,
      islemTarihi: dateText,
      tlTutar: parsed.amount,
      tutar: parsed.amount,
      amount: parsed.amount,
      borc: parsed.amount,
      usdTutar: 0,
      bankkartLira: 0,
      rawPdfLine: parsed.raw,
      bankaReferans: parsed.ref || '',
      referans: source + '-DIRECT-ISBANK-KK-' + idx + '-' + rows.length + (parsed.ref ? '-' + parsed.ref : ''),
      bhdFileId: 'direct-isbank-kk-' + source,
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
      dosyaTipi: 'Is Bankasi Kredi Karti PDF Debug Satiri',
      banka: 'Is Bankasi',
      isbankKk: true,
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
      aciklama: 'PDF ' + String(idx + 1).padStart(3, '0') + ': ' + (parsed && parsed.raw ? parsed.raw : (parsed && parsed.desc ? parsed.desc : 'PDF satiri')),
      islemAciklamasi: 'PDF ' + String(idx + 1).padStart(3, '0') + ': ' + (parsed && parsed.raw ? parsed.raw : (parsed && parsed.desc ? parsed.desc : 'PDF satiri')),
      islemTarihi: dateText,
      tlTutar: 0,
      tutar: 0,
      amount: 0,
      borc: 0,
      usdTutar: 0,
      bankkartLira: 0,
      rawPdfLine: parsed && parsed.raw ? parsed.raw : '',
      referans: source + '-DEBUG-ISBANK-KK-' + idx,
      bhdFileId: 'direct-isbank-kk-' + source,
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
      rows.push(parsed.parsed ? makeRow(rows, source, parsed, idx) : makeDebugRow(rows, source, parsed, idx));
    });
    return rows;
  }
  function showBigStatus(text) {
    var page = q('#bhdCategoryReportPage') || q('#bhdModule .module-box') || document.body;
    var box = q('#isbankKkDirectStatusBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'isbankKkDirectStatusBox';
      box.style.cssText = 'position:sticky;top:0;z-index:50;margin:8px 0;padding:12px 14px;border:2px solid #2563eb;background:#eff6ff;color:#0f172a;border-radius:8px;font-weight:800;box-shadow:0 8px 20px rgba(15,23,42,.12)';
      page.insertBefore(box, page.firstChild);
    }
    box.textContent = text;
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
    var id = 'direct-isbank-kk-' + file.name;
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
      if (!isbankKkName(files[i])) continue;
      if (statusEl) statusEl.textContent = files[i].name + ' dogrudan Is Bankasi KK okuyucu ile okunuyor...';
      showBigStatus(files[i].name + ' dogrudan Is Bankasi KK okuyucu ile okunuyor...');
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
    var doneText = 'Is Bankasi KK dogrudan okundu. PDF satiri: ' + allRows.length + '. Ilk satir: PDF 001. Son satir: PDF ' + String(allRows.length).padStart(3, '0') + '.' + archiveNote;
    if (statusEl) statusEl.textContent = doneText;
    showBigStatus(doneText);
    rerender();
    window.dispatchEvent(new CustomEvent('omas:bhd-rows-loaded', {
      detail: { rows: allRows.slice(), source: '0007-isbank-kk-direct-reader' }
    }));
    if (readBtn) readBtn.disabled = false;
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('#bhdV267Read');
    if (!btn) return;
    var input = q('#bhdV267Files');
    var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
    if (!files.length || !files.some(isbankKkName)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    btn.disabled = true;
    handle(files, q('#bhdV267Status'), btn).catch(function (err) {
      btn.disabled = false;
      var msg = err && err.message ? err.message : String(err);
      var st = q('#bhdV267Status');
      if (st) st.textContent = 'Is Bankasi KK dogrudan okuyucu hatasi: ' + msg;
      alert('Is Bankasi KK dogrudan okuyucu hatasi: ' + msg);
    });
    return false;
  }, true);
})();
