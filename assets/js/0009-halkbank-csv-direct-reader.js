(function () {
  var ROWS_KEY = 'bhdPersistentRowsV267';
  var FILES_KEY = 'bhdFileManifestV276';

  function q(s, r) { return (r || document).querySelector(s); }
  function norm(v) {
    try { return String(v || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    catch (e) { return String(v || '').toUpperCase(); }
  }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function halkbankCsvName(file) {
    var n = norm(file && file.name);
    var extOk = /\.(CSV|TXT)$/i.test(String(file && file.name || ''));
    return extOk && /(HALK\s*BANK|HALKBANK|TURKIYE\s*HALK)/.test(n);
  }
  function decodeText(buf) {
    var utf = new TextDecoder('utf-8').decode(buf);
    if (utf.indexOf('\uFFFD') < 0) return utf;
    try { return new TextDecoder('windows-1254').decode(buf); } catch (e) { return utf; }
  }
  function detectDelimiter(line) {
    var cands = [';', ',', '\t', '|'];
    var best = ';', score = -1;
    cands.forEach(function (d) {
      var n = splitCsvLine(line, d).length;
      if (n > score) { score = n; best = d; }
    });
    return best;
  }
  function splitCsvLine(line, delim) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < String(line || '').length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (ch === delim && !q) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out.map(function (v) { return v.replace(/^"|"$/g, '').replace(/""/g, '"').trim(); });
  }
  function parseCsv(text) {
    var lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (l) { return String(l || '').trim(); });
    if (!lines.length) return [];
    var delim = detectDelimiter(lines[0]);
    return lines.map(function (l) { return splitCsvLine(l, delim); });
  }
  function parseDate(v) {
    var m = String(v || '').trim().match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!m) return null;
    var y = Number(m[3]);
    if (y < 100) y += 2000;
    var d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    return isNaN(d) ? null : d;
  }
  function money(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/\s|TL|TRY/gi, '').trim();
    if (!s) return 0;
    var neg = /^-/.test(s) || /-$/.test(s) || /\(/.test(s);
    s = s.replace(/[+\-()]/g, '');
    var lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lastComma > -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
    var n = Number(s) || 0;
    return neg ? -Math.abs(n) : n;
  }
  function monthName(d) {
    return d && !isNaN(d) ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') : '';
  }
  function cleanDesc(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }
  function findHeader(rows) {
    var best = -1;
    rows.some(function (row, i) {
      var t = norm(row.join(' | '));
      if (/ISLEM\s*TARIHI|TARIH/.test(t) && /TUTAR/.test(t) && /\bB\s*\/\s*A\b|\bBA\b|BORC|ALACAK/.test(t) && /BAKIYE/.test(t) && /ACIKLAMA/.test(t)) {
        best = i;
        return true;
      }
      return false;
    });
    return best;
  }
  function columns(header) {
    var c = { date: -1, amount: -1, ba: -1, balance: -1, desc: -1 };
    (header || []).forEach(function (v, i) {
      var h = norm(v).replace(/[^A-Z0-9\/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (c.date < 0 && (/ISLEM TARIHI/.test(h) || h === 'TARIH')) c.date = i;
      if (c.amount < 0 && /TUTAR/.test(h) && !/BAKIYE/.test(h)) c.amount = i;
      if (c.ba < 0 && (h === 'B/A' || h === 'BA' || /BORC ALACAK/.test(h) || /B A/.test(h))) c.ba = i;
      if (c.balance < 0 && /BAKIYE/.test(h)) c.balance = i;
      if (c.desc < 0 && /ACIKLAMA/.test(h)) c.desc = i;
    });
    return c;
  }
  function parseRows(csvRows, source) {
    var hi = findHeader(csvRows);
    if (hi < 0) throw new Error('Halkbank CSV basliklari bulunamadi: Islem Tarihi / Tutar / B-A / Bakiye / Aciklama.');
    var col = columns(csvRows[hi]);
    if (col.date < 0 || col.amount < 0 || col.ba < 0 || col.balance < 0 || col.desc < 0) throw new Error('Halkbank CSV kolonlari eksik.');
    var out = [];
    for (var i = hi + 1; i < csvRows.length; i++) {
      var row = csvRows[i] || [];
      var date = parseDate(row[col.date]);
      var amount = Math.abs(money(row[col.amount]));
      var ba = norm(row[col.ba]).replace(/[^AB]/g, '').slice(0, 1);
      var desc = cleanDesc(row[col.desc]);
      if (!date || !amount || !ba || !desc) continue;
      var incoming = ba === 'A' ? amount : 0;
      var outgoing = ba === 'B' ? amount : 0;
      var dateText = date.toLocaleDateString('tr-TR');
      out.push({
        sira: out.length + 1,
        kaynak: source,
        dosyaTipi: 'Halkbank CSV Hesap Hareketleri',
        banka: 'Halkbank',
        halkbankCsv: true,
        tarih: dateText,
        ay: monthName(date),
        kisiFirma: '',
        personel: '',
        kategori: 'Diger',
        islemTuru: incoming > 0 ? 'Gelen' : 'Giden',
        analizTuru: 'Gercek Nakit Hareketi',
        ticariMi: 'Ticari',
        gelen: incoming,
        giden: outgoing,
        net: incoming - outgoing,
        bakiye: money(row[col.balance]),
        aciklama: desc,
        islemAciklamasi: desc,
        islemTarihi: dateText,
        borcAlacak: ba,
        referans: source + '-HALKBANK-CSV-' + i + '-' + out.length,
        bhdFileId: 'direct-halkbank-csv-' + source,
        bhdUploadName: source,
        bhdOriginalName: source,
        bhdImportedAt: new Date().toISOString()
      });
    }
    return out;
  }
  async function readFileRows(file) {
    var text = decodeText(await file.arrayBuffer());
    return parseRows(parseCsv(text), file.name);
  }
  function updateManifest(file, rows) {
    var mf = read(FILES_KEY, {});
    var id = 'direct-halkbank-csv-' + file.name;
    mf[id] = {
      id: id,
      names: [file.name],
      size: file.size || 0,
      type: file.type || 'text/csv',
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
  function showStatus(text) {
    var page = q('#bhdCategoryReportPage') || q('#bhdModule .module-box') || document.body;
    var box = q('#halkbankCsvDirectStatusBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'halkbankCsvDirectStatusBox';
      box.style.cssText = 'position:sticky;top:0;z-index:50;margin:8px 0;padding:12px 14px;border:2px solid #0f766e;background:#ecfeff;color:#0f172a;border-radius:8px;font-weight:800;box-shadow:0 8px 20px rgba(15,23,42,.12)';
      page.insertBefore(box, page.firstChild);
    }
    box.textContent = text;
    var st = q('#bhdV267Status');
    if (st) st.textContent = text;
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
  async function handle(files, readBtn) {
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
      if (!halkbankCsvName(files[i])) continue;
      showStatus(files[i].name + ' dogrudan Halkbank CSV okuyucu ile okunuyor...');
      var rows = await readFileRows(files[i]);
      updateManifest(files[i], rows);
      allRows = allRows.concat(rows);
    }
    if (!window.bhdRawRows || !Array.isArray(window.bhdRawRows)) window.bhdRawRows = [];
    window.bhdRawRows.length = 0;
    allRows.forEach(function (row, idx) {
      row.sira = idx + 1;
      window.bhdRawRows.push(row);
    });
    if (window.OMAS &&
    OMAS.Workspace &&
    typeof OMAS.Workspace.setBhdDraftRows === 'function') {

    OMAS.Workspace.setBhdDraftRows(window.bhdRawRows);
}
    write(ROWS_KEY, allRows);
    showStatus('Halkbank CSV dogrudan okundu. Eklenen hareket: ' + allRows.length + '.' + archiveNote);
    rerender();
    if (readBtn) readBtn.disabled = false;
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('#bhdV267Read');
    if (!btn) return;
    var input = q('#bhdV267Files');
    var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
    if (!files.length || !files.some(halkbankCsvName)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    btn.disabled = true;
    handle(files, btn).catch(function (err) {
      btn.disabled = false;
      var msg = err && err.message ? err.message : String(err);
      showStatus('Halkbank CSV okuyucu hatasi: ' + msg);
      alert('Halkbank CSV okuyucu hatasi: ' + msg);
    });
    return false;
  }, true);
})();
