(function () {
  'use strict';

  function role() {
    return String(window.OMAS_AUTH && window.OMAS_AUTH.company && window.OMAS_AUTH.company.role || '').toLowerCase();
  }
  function canWrite() { return role() === 'admin' || role() === 'accounting'; }
  function canDelete() { return role() === 'admin'; }
  function isMutationElement(el) {
    if (!el || !el.matches) return false;
    var text = String(el.textContent || el.value || el.title || el.getAttribute('aria-label') || '').toLocaleLowerCase('tr-TR');
    var idClass = String((el.id || '') + ' ' + (el.className || '')).toLowerCase();
    return /(ekle|kaydet|yükle|aktar|gönder|düzenle|değiştir|sil|kaldır|temizle|delete|remove|save|upload|import|edit)/i.test(text + ' ' + idClass);
  }
  function isDeleteElement(el) {
    var text = String(el.textContent || el.value || el.title || el.getAttribute('aria-label') || '').toLocaleLowerCase('tr-TR');
    var idClass = String((el.id || '') + ' ' + (el.className || '')).toLowerCase();
    return /(sil|kaldır|temizle|delete|remove|trash)/i.test(text + ' ' + idClass);
  }
  function apply() {
    document.documentElement.setAttribute('data-omas-role', role() || 'unknown');
    document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]').forEach(function (el) {
      if (!isMutationElement(el)) return;
      var blocked = !canWrite() || (isDeleteElement(el) && !canDelete());
      if (blocked) {
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
        el.dataset.omasRoleBlocked = '1';
        el.title = canWrite() ? 'Silme işlemi yalnızca admin yetkisindedir.' : 'Bu kullanıcı yalnızca görüntüleme yetkisine sahiptir.';
      } else if (el.dataset.omasRoleBlocked === '1') {
        el.disabled = false;
        el.removeAttribute('aria-disabled');
        delete el.dataset.omasRoleBlocked;
      }
    });
    var badge = document.getElementById('omasAuthBadgeText');
    if (badge && role() && !badge.querySelector('.omas-role-label')) {
      var label = document.createElement('strong');
      label.className = 'omas-role-label';
      label.style.cssText = 'margin-left:8px;padding:2px 7px;border-radius:999px;background:#e2e8f0;color:#0f172a;font-size:11px';
      label.textContent = role() === 'accounting' ? 'MUHASEBE' : role().toUpperCase();
      badge.appendChild(label);
    }
  }
  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest('button,input[type="button"],input[type="submit"],[role="button"]') : null;
    if (!el || !isMutationElement(el)) return;
    if (!canWrite() || (isDeleteElement(el) && !canDelete())) {
      event.preventDefault(); event.stopImmediatePropagation();
      alert(!canWrite() ? 'Bu kullanıcı yalnızca görüntüleme yetkisine sahiptir.' : 'Silme işlemi yalnızca admin yetkisindedir.');
    }
  }, true);
  window.OMAS_PERMISSIONS = { role: role, canWrite: canWrite, canDelete: canDelete, apply: apply };
  window.addEventListener('omas:auth-ready', function () { setTimeout(apply, 100); setTimeout(apply, 1500); });
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(apply, 1000);
    new MutationObserver(function () { clearTimeout(window.__omasRoleTimer); window.__omasRoleTimer = setTimeout(apply, 100); })
      .observe(document.documentElement, { childList: true, subtree: true });
  });
})();
