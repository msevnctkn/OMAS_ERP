(function () {
  'use strict';

  var refreshing = null;

  function statusText(runtime) {
    runtime = runtime || {};
    return 'Supabase runtime: ' + Number(runtime.rows || 0) + ' kalem, ' + Number(runtime.bhdRows || 0) + ' BHD, ' + Number(runtime.payments || 0) + ' ödeme';
  }

  function updateBadge(runtime, ok) {
    var badge = document.getElementById('omasAuthBadge') || document.body;
    var box = document.getElementById('omasRuntimeBootstrapStatus');
    if (!box) {
      box = document.createElement('span');
      box.id = 'omasRuntimeBootstrapStatus';
      box.style.cssText = 'margin-left:8px;font-weight:800;font-size:12px';
      badge.appendChild(box);
    }
    box.textContent = statusText(runtime);
    box.style.color = ok === false ? '#991b1b' : '#166534';
  }

  async function refresh(reason) {
    if (refreshing) return refreshing;
    refreshing = (async function () {
      try {
        if (!window.omasLoadRuntimeFromSupabase) throw new Error('Runtime yükleyici hazır değil.');
        var runtime = await window.omasLoadRuntimeFromSupabase();
        updateBadge(runtime, true);
        window.dispatchEvent(new CustomEvent('omas:runtime-refreshed', { detail: { reason: reason || 'manual', runtime: runtime } }));
        return runtime;
      } catch (err) {
        var box = document.getElementById('omasRuntimeBootstrapStatus');
        if (box) {
          box.textContent = 'Supabase runtime hata: ' + (err && err.message ? err.message : String(err));
          box.style.color = '#991b1b';
        }
        throw err;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  window.OMASRuntimeService = { refresh: refresh, updateBadge: updateBadge };

  window.addEventListener('omas:admin-reset-complete', function () { setTimeout(function () { refresh('admin-reset'); }, 150); });
  window.addEventListener('omas:xml-synced', function () { setTimeout(function () { refresh('xml-sync'); }, 150); });
  window.addEventListener('omas:bhd-synced', function () { setTimeout(function () { refresh('bhd-sync'); }, 150); });
  window.addEventListener('omas:bhd-payment-synced', function () { setTimeout(function () { refresh('payment-sync'); }, 150); });
})();
