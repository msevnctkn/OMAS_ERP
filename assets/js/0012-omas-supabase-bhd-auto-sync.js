(function () {
  'use strict';

  var BHD_COMPANY = 'bhdRowCompanyMapV267';
  var BHD_CAT = 'bhdRowCategoryMapV267';
  var committing = false;

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

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) {
      return null;
    }
    return {
      client: window.omasSupabase,
      companyId: window.OMAS_AUTH.company.id
    };
  }

  function service() {
    if (!window.OMASBhdService) throw new Error('OMAS BHD servisi yüklenmedi.');
    return window.OMASBhdService;
  }

  function currentRows() {
    return window.bhdRawRows && Array.isArray(window.bhdRawRows)
      ? window.bhdRawRows.slice()
      : [];
  }

  function rowId(row) {
    return [row && row.kaynak, row && row.referans, row && row.sira, row && row.tarih, row && row.aciklama].join('|');
  }

  function finalRows() {
    var companyMap = readJson(BHD_COMPANY, {});
    var categoryMap = readJson(BHD_CAT, {});

    return currentRows().map(function (source) {
      var row = Object.assign({}, source || {});
      var id = rowId(source || {});
      var category = categoryMap[id] || {};
      var companyCode = companyMap[id] || row.sirket || row.firma || row.companyCode || '';

      row.companyCode = companyCode;
      row.sirket = companyCode;
      row.kategori = category.main || row.kategori || 'Diğer';
      row.altKategori = category.sub || row.altKategori || '';
      return row;
    });
  }

  function showStatus(text, ok) {
    var page = q('#bhdCategoryReportPage') || q('#bhdModule .module-box') || document.body;
    var box = q('#omasBhdCommitStatus');
    if (!box && page) {
      box = document.createElement('div');
      box.id = 'omasBhdCommitStatus';
      box.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:8px;border:1px solid #dbe3ef;background:#f8fafc;color:#0f172a;font-weight:800';
      page.insertBefore(box, page.firstChild);
    }
    if (!box) return;
    box.textContent = text;
    box.style.background = ok === false ? '#fee2e2' : '#ecfdf5';
    box.style.borderColor = ok === false ? '#fecaca' : '#86efac';
    box.style.color = ok === false ? '#991b1b' : '#166534';
  }

  async function countRows(client, companyId) {
    var result = await client
      .from('banka_hareketleri')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);
    if (result.error) throw result.error;
    return result.count || 0;
  }

  function prepareRows(inputRows) {
    var svc = service();
    var seen = Object.create(null);
    var unique = [];
    var duplicateCount = 0;

    (inputRows || []).forEach(function (row, index) {
      var key = svc.dedupeKey(row, index);
      if (seen[key]) {
        duplicateCount++;
        return;
      }
      seen[key] = true;
      unique.push({ row: row, originalIndex: index, key: key });
    });

    return {
      readCount: (inputRows || []).length,
      rows: unique,
      duplicateCount: duplicateCount
    };
  }

  function applyMovementIds(processedRows) {
    if (!window.bhdRawRows || !Array.isArray(window.bhdRawRows)) return;
    var svc = service();
    var idsByKey = Object.create(null);
    processedRows.forEach(function (item) {
      if (item.id) idsByKey[item.key] = item.id;
    });
    window.bhdRawRows.forEach(function (row, index) {
      var key = svc.dedupeKey(row, index);
      if (idsByKey[key]) row.supabaseBankMovementId = idsByKey[key];
    });
  }

  async function commitRows() {
    if (committing) return { busy: true };

    var a = auth();
    if (!a) throw new Error('Supabase oturumu veya aktif şirket hazır değil.');

    var snapshot = finalRows();
    var prepared = prepareRows(snapshot);
    if (!prepared.readCount) {
      showStatus('Kaydedilecek BHD hareketi yok. Önce dosya oku ve düzenlemelerini tamamla.', false);
      return { toplam: 0, yeni: 0, atlanan: 0, hatali: 0 };
    }

    committing = true;
    var startedAt = Date.now();
    var stats = {
      okunan: prepared.readCount,
      toplam: prepared.rows.length,
      yeni: 0,
      guncellenen: 0,
      atlanan: 0,
      dosyaIciTekrar: prepared.duplicateCount,
      hatali: 0,
      hatalar: [],
      sureMs: 0,
      veritabaniToplami: 0
    };
    var processed = [];
    var svc = service();

    try {
      showStatus('BHD veritabanına yazılıyor. Onaylanan satır: ' + stats.toplam + '...', true);

      for (var i = 0; i < prepared.rows.length; i++) {
        var item = prepared.rows[i];
        try {
          var result = await svc.ensureMovement(a.client, a.companyId, item.row, item.originalIndex);
          processed.push({ key: item.key, id: result.id || null });

          if (result.skipped) stats.atlanan++;
          else if (result.existed && result.updated) stats.guncellenen++;
          else if (result.existed) stats.atlanan++;
          else stats.yeni++;
        } catch (err) {
          stats.hatali++;
          stats.hatalar.push({
            satir: item.originalIndex + 1,
            kaynak: svc.sourceName(item.row),
            aciklama: String(item.row && (item.row.aciklama || item.row.islemAciklamasi || '') || ''),
            mesaj: err && err.message ? err.message : String(err)
          });
          console.error('[OMAS BHD] Hareket kaydedilemedi:', item.originalIndex + 1, item.row, err);
        }

        if (i % 25 === 0 || i === prepared.rows.length - 1) {
          showStatus(
            (i + 1) + '/' + stats.toplam +
            ' işlendi | Yeni: ' + stats.yeni +
            ' | Güncellenen: ' + stats.guncellenen +
            ' | Mevcut/atlanan: ' + stats.atlanan +
            ' | Hatalı: ' + stats.hatali,
            stats.hatali === 0
          );
        }
      }

      applyMovementIds(processed);
      stats.veritabaniToplami = await countRows(a.client, a.companyId);
      stats.sureMs = Date.now() - startedAt;

      var summary =
        'BHD kaydı tamamlandı. | Taslaktaki satır: ' + stats.okunan +
        ' | Benzersiz: ' + stats.toplam +
        ' | Taslak içi tekrar: ' + stats.dosyaIciTekrar +
        ' | Yeni: ' + stats.yeni +
        ' | Güncellenen: ' + stats.guncellenen +
        ' | Mevcut/atlanan: ' + stats.atlanan +
        ' | Hatalı: ' + stats.hatali +
        ' | Süre: ' + (stats.sureMs / 1000).toFixed(2) + ' sn' +
        ' | Veritabanı toplamı: ' + stats.veritabaniToplami + ' hareket';

      showStatus(summary, stats.hatali === 0);
      if (stats.hatalar.length) console.warn('[OMAS BHD] Hata raporu', stats.hatalar);
      window.dispatchEvent(new CustomEvent('omas:bhd-synced', { detail: stats }));

      if (window.OMASRuntimeService && typeof window.OMASRuntimeService.refresh === 'function') {
        try { await window.OMASRuntimeService.refresh(); } catch (ignore) {}
      }
      return stats;
    } finally {
      committing = false;
    }
  }

  function installCommitButton() {
    var readButton = q('#bhdV267Read');
    if (!readButton || q('#omasBhdCommitButton')) return;

    var button = document.createElement('button');
    button.id = 'omasBhdCommitButton';
    button.type = 'button';
    button.className = 'bhd-v267-btn';
    button.textContent = 'Veritabanına Yaz';
    button.style.background = '#16a34a';
    button.style.color = '#fff';
    readButton.insertAdjacentElement('afterend', button);

    button.onclick = function () {
      var count = finalRows().length;
      if (!count) {
        showStatus('Kaydedilecek hareket yok.', false);
        return;
      }
      if (!window.confirm(count + ' adet düzenlenmiş BHD hareketi veritabanına yazılacak. Devam edilsin mi?')) return;

      button.disabled = true;
      button.textContent = 'Kaydediliyor...';
      commitRows()
        .catch(function (err) {
          showStatus('BHD kayıt hatası: ' + (err && err.message ? err.message : String(err)), false);
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Veritabanına Yaz';
        });
    };
  }

  window.addEventListener('omas:bhd-rows-loaded', function () {
    var count = currentRows().length;
    showStatus('Taslak hazır: ' + count + ' hareket. Düzenlemelerini tamamlayıp “Veritabanına Yaz” butonuna bas.', true);
    setTimeout(installCommitButton, 50);
  });

  window.omasSyncBhdRowsToSupabase = commitRows;
  window.omasCommitBhdRowsToDatabase = commitRows;

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installCommitButton, 700);
    setTimeout(installCommitButton, 1600);
  });
  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('#bhdModule, [data-v189-page="bhd"]')) {
      setTimeout(installCommitButton, 100);
      setTimeout(installCommitButton, 500);
    }
  }, true);
  setInterval(installCommitButton, 1500);
})();
