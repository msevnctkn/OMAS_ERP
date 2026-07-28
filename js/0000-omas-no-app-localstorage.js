(function () {
  var raw = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    clear: Storage.prototype.clear,
    key: Storage.prototype.key
  };
  var memory = {};
  window.OMAS_VOLATILE_STORAGE = memory;

  function isAllowedPersistentKey(key) {
    key = String(key || '');
    return /^sb-/.test(key) || /supabase/i.test(key);
  }
  function mirrorExistingAppKeys() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) keys.push(raw.key.call(localStorage, i));
      keys.forEach(function (key) {
        if (!isAllowedPersistentKey(key)) {
          var value = raw.getItem.call(localStorage, key);
          if (value != null) memory[key] = value;
        }
      });
    } catch (e) {}
  }
  mirrorExistingAppKeys();

  Storage.prototype.getItem = function (key) {
    key = String(key || '');
    if (this === localStorage && !isAllowedPersistentKey(key)) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    }
    return raw.getItem.call(this, key);
  };
  Storage.prototype.setItem = function (key, value) {
    key = String(key || '');
    if (this === localStorage && !isAllowedPersistentKey(key)) {
      memory[key] = String(value);
      return;
    }
    return raw.setItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    key = String(key || '');
    if (this === localStorage && !isAllowedPersistentKey(key)) {
      delete memory[key];
      try { raw.removeItem.call(this, key); } catch (e) {}
      return;
    }
    return raw.removeItem.call(this, key);
  };
  Storage.prototype.clear = function () {
    if (this === localStorage) {
      Object.keys(memory).forEach(function (key) { delete memory[key]; });
      try {
        var keep = {};
        for (var i = 0; i < localStorage.length; i++) {
          var key = raw.key.call(localStorage, i);
          if (isAllowedPersistentKey(key)) keep[key] = raw.getItem.call(localStorage, key);
        }
        raw.clear.call(this);
        Object.keys(keep).forEach(function (key) { raw.setItem.call(localStorage, key, keep[key]); });
      } catch (e) {}
      return;
    }
    return raw.clear.call(this);
  };

  window.omasPurgeAppLocalStorage = function () {
    var removed = 0;
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) keys.push(raw.key.call(localStorage, i));
      keys.forEach(function (key) {
        if (!isAllowedPersistentKey(key)) {
          raw.removeItem.call(localStorage, key);
          removed++;
        }
      });
    } catch (e) {}
    return removed;
  };

  function installPurgeButton() {
    if (document.getElementById('omasPurgeAppLocalStorageBtn')) return;
    var badge = document.getElementById('omasAuthBadge') || document.body;
    var btn = document.createElement('button');
    btn.id = 'omasPurgeAppLocalStorageBtn';
    btn.type = 'button';
    btn.textContent = 'Local App Hafizayi Sil';
    btn.style.cssText = 'margin-left:8px;background:#991b1b;color:white;border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer';
    btn.onclick = function () {
      if (!confirm('Supabase oturumu korunacak. Uygulamanin eski localStorage kayitlari silinsin mi?')) return;
      var removed = window.omasPurgeAppLocalStorage();
      alert('Silinen local app anahtari: ' + removed + '. Sayfa yenilenecek.');
      location.reload();
    };
    if (badge && badge.appendChild) badge.appendChild(btn);
  }
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installPurgeButton, 800);
    setInterval(installPurgeButton, 2000);
  });
})();
