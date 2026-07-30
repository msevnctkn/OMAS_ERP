(function () {
  var ROWS_KEY = 'bhdPersistentRowsV267';
  var FILES_KEY = 'bhdFileManifestV276';
  var XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

  function q(s, r) { return (r || document).querySelector(s); }
  function norm(v) {
    try { return String(v || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    catch (e) { return String(v || '').toUpperCase(); }
  }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function ziraatAccountName(file) {
    var n = norm(file && file.name);
    return /ZIRAAT/.test(n) && /(HESAP\s*HAREKET|HAREKETLERI|HESAP)/.test(n) && !/(\bKK\b|KREDI\s*KART|KREDI\s*KARTI|BANKKART)/.test(n);
  }
  function loadScriptOnce(src, globalName) {
    return new Promise(function (resolve, reject) {
      if (globalName && window[globalName]) return resolve(window[globalName]);
      var old = document.querySelector('script[src="' + src + '"]');
      if (old) {
        old.addEventListener('load', function () { resolve(globalName ? window[globalName] : true); });
        old.addEventListener('error', reject);
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(globalName ? window[globalName] : true); };
      s.onerror = function () { reject(new Error('Excel okuyucu yuklenemedi.')); };
      document.head.appendChild(s);
    });
  }
  async function ensureXlsx() {
    if (!window.XLSX) await loadScriptOnce(XLSX_CDN, 'XLSX');
    if (!window.XLSX) throw new Error('Excel okuyucu yuklenemedi.');
    return window.XLSX;
  }
  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return v;
    var s = String(v || '').trim();
    var m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!m) return null;
    var y = Number(m[3]);
    if (y < 100) y += 2000;
    var d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    return isNaN(d) ? null : d;
  }
  function monthName(d) {
    return d && !isNaN(d) ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') : '';
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
  function cleanDesc(desc) {
    return String(desc || '').replace(/\s+/g, ' ').trim();
  }
  function findHeader(aoa) {
    for (var i = 0; i < aoa.length; i++) {
      var row = aoa[i] || [];
      var text = norm(row.join(' | '));
      if (/TARIH/.test(text) && /FIS\s*NO/.test(text) && /ACIKLAMA/.test(text) && /ISLEM\s*TUTARI/.test(text) && /BAKIYE/.test(text)) return i;
    }
    return -1;
  }
  function headerCols(row) {
    var c = { date: -1, fis: -1, desc: -1, amount: -1, balance: -1 };
    (row || []).forEach(function (v, i) {
      var h = norm(v);
      if (c.date < 0 && /TARIH/.test(h)) c.date = i;
      if (c.fis < 0 && /FIS\s*NO/.test(h)) c.fis = i;
      if (c.desc < 0 && /ACIKLAMA/.test(h)) c.desc = i;
      if (c.amount < 0 && /ISLEM\s*TUTARI/.test(h)) c.amount = i;
      if (c.balance < 0 && /BAKIYE/.test(h)) c.balance = i;
    });
    return c;
  }
  function rowFromArray(source, row, col, idx) {
    var date = parseDate(row[col.date]);
    var desc = cleanDesc(row[col.desc]);
    var amt = money(row[col.amount]);
    if (!date || !desc || !amt) return null;
    var incoming = amt > 0 ? amt : 0;
    var outgoing = amt < 0 ? Math.abs(amt) : 0;
    var dateText = date.toLocaleDateString('tr-TR');
    return {
      sira: idx + 1,
      kaynak: source,
      dosyaTipi: 'Ziraat Bankasi Hesap Hareketleri Excel',
      banka: 'Ziraat Bankasi',
      ziraatHesap: true,
      tarih: dateText,
      ay: monthName(date),
      kisiFirma: desc.slice(0, 100),
      personel: '',
      kategori: 'Diger',
      islemTuru: outgoing > 0 ? 'Giden' : 'Gelen',
      analizTuru: 'Gercek Nakit Hareketi',
      ticariMi: 'Ticari',
      gelen: incoming,
      giden: outgoing,
      net: incoming - outgoing,
      aciklama: desc,
      islemAciklamasi: desc,
      islemTarihi: dateText,
      fisNo: String(row[col.fis] || '').trim(),
      bakiye: money(row[col.balance]),
      referans: source + '-ZIRAAT-HESAP-' + idx + '-' + String(row[col.fis] || ''),
      bhdFileId: 'direct-ziraat-account-' + source,
      bhdUploadName: source,
      bhdOriginalName: source,
      bhdImportedAt: new Date().toISOString()
    };
  }
  function parseRows(aoa, source) {
    var hi = findHeader(aoa);
    if (hi < 0) throw new Error('Ziraat hesap hareketi basliklari bulunamadi: Tarih / Fis No / Aciklama / Islem Tutari / Bakiye.');
    var col = headerCols(aoa[hi]);
    var rows = [];
    for (var i = hi + 1; i < aoa.length; i++) {
      var r = rowFromArray(source, aoa[i] || [], col, rows.length);
      if (r) rows.push(r);
    }
    return rows;
  }
  async function readSheetRows(file) {
    var X = await ensureXlsx();
    var wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true, raw: true });
    var all = [];
    wb.SheetNames.forEach(function (sn) {
      var aoa = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: true });
      all = all.concat(parseRows(aoa, file.name + ' / ' + sn));
    });
    return all;
  }
  function updateManifest(file, rows) {
    var mf = read(FILES_KEY, {});
    var id = 'direct-ziraat-account-' + file.name;
    mf[id] = {
      id: id,
      names: [file.name],
      size: file.size || 0,
      type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
    var box = q('#ziraatAccountDirectStatusBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ziraatAccountDirectStatusBox';
      box.style.cssText = 'position:sticky;top:0;z-index:50;margin:8px 0;padding:12px 14px;border:2px solid #16a34a;background:#f0fdf4;color:#0f172a;border-radius:8px;font-weight:800;box-shadow:0 8px 20px rgba(15,23,42,.12)';
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
      if (!ziraatAccountName(files[i])) continue;
      showStatus(files[i].name + ' dogrudan Ziraat hesap hareketi okuyucu ile okunuyor...');
      var rows = await readSheetRows(files[i]);
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
    showStatus('Ziraat hesap hareketleri dogrudan okundu. Eklenen hareket: ' + allRows.length + '.' + archiveNote);
    rerender();
    if (readBtn) readBtn.disabled = false;
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest && ev.target.closest('#bhdV267Read');
    if (!btn) return;
    var input = q('#bhdV267Files');
    var files = input && input.files ? Array.prototype.slice.call(input.files) : [];
    if (!files.length || !files.some(ziraatAccountName)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    btn.disabled = true;
    handle(files, btn).catch(function (err) {
      btn.disabled = false;
      var msg = err && err.message ? err.message : String(err);
      showStatus('Ziraat hesap hareketi okuyucu hatasi: ' + msg);
      alert('Ziraat hesap hareketi okuyucu hatasi: ' + msg);
    });
    return false;
  }, true);
})();
