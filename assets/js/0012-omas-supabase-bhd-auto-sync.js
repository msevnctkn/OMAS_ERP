(function () {
  'use strict';

  var BHD_ROWS = 'bhdPersistentRowsV267';
  var syncing = false;
  var queued = false;
  var lastSig = '';

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }

  function service() {
    if (!window.OMASBhdService) throw new Error('OMAS BHD servisi yüklenmedi.');
    return window.OMASBhdService;
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
  }

  function signature(rows) {
    var svc = service();
    return rows.length + ':' + rows.map(function (row, index) { return svc.dedupeKey(row, index); }).join('~').slice(0, 8000);
  }

  async function countRows(client, companyId) {
    var result = await client.from('banka_hareketleri').select('id', { count: 'exact', head: true }).eq('company_id', companyId);
    if (result.error) throw result.error;
    return result.count || 0;
  }

  async function syncRows(reason) {
    var a = auth();
    if (!a) return { toplam: 0, yeni: 0, atlanan: 0, hatali: 0 };
    if (syncing) {
      queued = true;
      return { toplam: 0, yeni: 0, atlanan: 0, hatali: 0, queued: true };
    }

    syncing = true;
    queued = false;
    var startedAt = Date.now();

    try {
      var svc = service();
      var allRows = readRows();
      var isSupabaseRuntime = allRows.length > 0 && allRows.every(function (row) {
      return row &&
        row.bhdFileId === 'supabase:banka_hareketleri' &&
        row.supabaseBankMovementId;
    });

    if (isSupabaseRuntime && reason !== 'manual') {
      return {
        toplam: allRows.length,
        yeni: 0,
        atlanan: 0,
        hatali: 0,
        runtimeOnly: true
      };
    }
      var sig = signature(allRows);
      if (!allRows.length) return { toplam: 0, yeni: 0, atlanan: 0, hatali: 0 };
      if (sig === lastSig && reason !== 'manual') return { toplam: allRows.length, yeni: 0, atlanan: allRows.length, hatali: 0, unchanged: true };
      lastSig = sig;

      var stats = { toplam: allRows.length, yeni: 0, atlanan: 0, hatali: 0, hatalar: [], sureMs: 0, veritabaniToplami: 0 };
      showStatus('Supabase BHD aktarımı başladı: ' + stats.toplam + ' hareket...', true);

      for (var i = 0; i < allRows.length; i++) {
        var row = allRows[i];
        try {
          var result = await svc.ensureMovement(a.client, a.companyId, row, i);
          if (result.skipped) {
            stats.atlanan++;
          } else if (result.existed) {
            row.supabaseBankMovementId = result.id;
            stats.atlanan++;
          } else {
            row.supabaseBankMovementId = result.id;
            stats.yeni++;
          }
        } catch (err) {
          stats.hatali++;
          stats.hatalar.push({
            satir: i + 1,
            kaynak: svc.sourceName(row),
            aciklama: String(row && (row.aciklama || row.islemAciklamasi || '') || ''),
            mesaj: err && err.message ? err.message : String(err)
          });
          console.error('[OMAS BHD] Hareket aktarılamadı:', i + 1, row, err);
        }

        if (i % 25 === 0 || i === allRows.length - 1) {
          showStatus((i + 1) + '/' + stats.toplam + ' işlendi | Yeni: ' + stats.yeni + ' | Atlanan: ' + stats.atlanan + ' | Hatalı: ' + stats.hatali, stats.hatali === 0);
        }
      }

      if (window.bhdRawRows && Array.isArray(window.bhdRawRows)) {
        window.bhdRawRows.forEach(function (target, index) {
          if (allRows[index] && allRows[index].supabaseBankMovementId) target.supabaseBankMovementId = allRows[index].supabaseBankMovementId;
        });
      }

      try { localStorage.setItem(BHD_ROWS, JSON.stringify(allRows)); } catch (ignore) {}

      stats.veritabaniToplami = await countRows(a.client, a.companyId);
      stats.sureMs = Date.now() - startedAt;

      var summary = 'BHD aktarımı tamamlandı. | Toplam: ' + stats.toplam + ' | Yeni: ' + stats.yeni + ' | Mevcut/atlanan: ' + stats.atlanan + ' | Hatalı: ' + stats.hatali + ' | Süre: ' + (stats.sureMs / 1000).toFixed(2) + ' sn | Veritabanı toplamı: ' + stats.veritabaniToplami + ' hareket';
      showStatus(summary, stats.hatali === 0);
      if (stats.hatalar.length) console.warn('[OMAS BHD] Hata raporu', stats.hatalar);

      window.dispatchEvent(new CustomEvent('omas:bhd-synced', { detail: stats }));
      return stats;
    } finally {
      syncing = false;
      if (queued) setTimeout(function () { syncRows('queued'); }, 500);
    }
  }

  function schedule(reason) {
    setTimeout(function () {
      syncRows(reason).catch(function (err) {
        showStatus('Supabase BHD aktarım hatası: ' + (err && err.message ? err.message : String(err)), false);
      });
    }, 350);
  }

  var nativeSetItem = Storage.prototype.setItem;
  if (!nativeSetItem.__omasBhdAutoSyncV2) {
    var wrapped = function (key, value) {
      var result = nativeSetItem.apply(this, arguments);
      if (this === window.localStorage && key === BHD_ROWS) schedule('localStorage');
      return result;
    };
    wrapped.__omasBhdAutoSyncV2 = true;
    Storage.prototype.setItem = wrapped;
  }

  window.omasSyncBhdRowsToSupabase = syncRows;

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest && event.target.closest('#bhdV267Read');
    if (button) setTimeout(function () { schedule('read-click'); }, 1800);
  }, true);
})();
