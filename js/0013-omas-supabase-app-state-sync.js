(function () {
  var KEYS = [
    'invoiceCategoryCatalogV2',
    'invoiceCategoryAssignmentsV1',
    'v191InvoiceCategoryAssignments',
    'v233XmlCategoryAssignments',
    'v244XmlCompanyAssignments',
    'bhdManualCategories',
    'bhdManualCategoryMap',
    'bhdManualSubcategories',
    'bhdManualSubcategoryMap',
    'bhdRowCategoryMapV267',
    'bhdRowCompanyMapV267',
    'bhdDeletedRowsV272',
    'v247ProjectManagementProjects',
    'v248ProjectLineAssignments',
    'v256GrsProjects',
    'v256GrsCostMap',
    'v256GrsCostLines',
    'v254ProjectSalesLines',
    'v254ProjectSalesAssignments',
    'v254ProjectManualSales',
    'v256GrsSalesLines',
    'v256GrsSalesMap',
    'v256GrsManualSales',
    'v282ManualCariCards',
    'omasUserLogoV287',
    'bhdPersonnelList',
    'bhdFileManifestV276',
    'invoiceCommissions',
    'invoiceProfitExpensesV1',
    'invoiceGiderPusulasiAmount',
    'invoiceGiderPusulasiKdv20',
    'invoiceGiderPusulasiKdv10',
    'invoiceGiderPusulasiKdv1',
    'invoiceYearlyAnalysisStoreV79',
    'cashflowManualEvents',
    'invoiceCategoryEmptyStartV197'
  ];
  var KEY_SET = {};
  var timers = {};
  var suppress = false;
  KEYS.forEach(function (key) { KEY_SET[key] = true; });

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }

  function parseValue(raw) {
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (err) { return String(raw); }
  }

  function serializeValue(value, key) {
    if (value == null) return '';
    if (key === 'omasUserLogoV287' && typeof value === 'string') return value;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  function showStatus(text, ok) {
    var badge = document.getElementById('omasAuthBadge') || document.body;
    var box = document.getElementById('omasAppStateSyncStatus');
    if (!box && badge) {
      box = document.createElement('span');
      box.id = 'omasAppStateSyncStatus';
      box.style.cssText = 'margin-left:8px;font-weight:800;font-size:12px;color:#0f172a';
      badge.appendChild(box);
    }
    if (!box) return;
    box.textContent = text;
    box.style.color = ok === false ? '#991b1b' : '#166534';
  }

  async function saveKey(key) {
    var a = auth();
    if (!a || !KEY_SET[key]) return false;
    var raw = localStorage.getItem(key);
    if (raw == null) {
      var del = await a.client
        .from('app_state')
        .delete()
        .eq('company_id', a.companyId)
        .eq('state_key', key);
      if (del.error) throw del.error;
      return true;
    }
    var value = parseValue(raw);
    var result = await a.client
      .from('app_state')
      .upsert({
        company_id: a.companyId,
        state_key: key,
        state_value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id,state_key' })
      .select('state_key')
      .single();
    if (result.error) throw result.error;
    return true;
  }

  function scheduleSave(key) {
    if (suppress || !KEY_SET[key]) return;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () {
      saveKey(key)
        .then(function () { showStatus('Ayarlar Supabase OK', true); })
        .catch(function (err) {
          showStatus('Ayar kaydi hata: ' + (err && err.message ? err.message : String(err)), false);
          console.warn('app_state save failed', key, err);
        });
    }, 500);
  }

  async function loadState() {
    var a = auth();
    if (!a) return { loaded: 0 };
    var result = await a.client
      .from('app_state')
      .select('state_key,state_value,updated_at')
      .eq('company_id', a.companyId)
      .in('state_key', KEYS);
    if (result.error) throw result.error;
    suppress = true;
    try {
      (result.data || []).forEach(function (row) {
        localStorage.setItem(row.state_key, serializeValue(row.state_value, row.state_key));
      });
    } finally {
      suppress = false;
    }
    refreshScreens();
    showStatus('Ayarlar Supabase: ' + ((result.data || []).length) + ' kayit', true);
    return { loaded: (result.data || []).length };
  }

  async function pushExistingState() {
    var saved = 0;
    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i];
      if (localStorage.getItem(key) == null) continue;
      await saveKey(key);
      saved++;
    }
    showStatus('Ayarlar Supabase aktarildi: ' + saved, true);
    return { saved: saved };
  }

  function refreshScreens() {
    try { if (window.v233RenderCategory) window.v233RenderCategory(); } catch (e) {}
    try { if (window.v270ShowCategorize && document.querySelector('#v189PageCategorize.active')) window.v270ShowCategorize(); } catch (e) {}
    try { if (window.v287ApplyLogo) window.v287ApplyLogo(); } catch (e) {}
    try { if (window.v276RenderBhdMemory && document.querySelector('[data-bhd-v276-view="memory"].active')) window.v276RenderBhdMemory(); } catch (e) {}
  }

  function installManualButton() {
    if (document.getElementById('omasPushAppStateBtn')) return;
    var badge = document.getElementById('omasAuthBadge') || document.body;
    var btn = document.createElement('button');
    btn.id = 'omasPushAppStateBtn';
    btn.type = 'button';
    btn.textContent = 'Ayarları Supabase’e Yaz';
    btn.style.cssText = 'margin-left:8px;background:#0f766e;color:white;border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer';
    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Yazılıyor...';
      pushExistingState().catch(function (err) {
        alert('Ayarlar Supabase’e yazılamadı: ' + (err && err.message ? err.message : String(err)));
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = 'Ayarları Supabase’e Yaz';
      });
    };
    badge.appendChild(btn);
  }

  var previousSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    var result = previousSetItem.apply(this, arguments);
    if (this === window.localStorage) scheduleSave(String(key || ''));
    return result;
  };
  var previousRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (key) {
    var result = previousRemoveItem.apply(this, arguments);
    if (this === window.localStorage) scheduleSave(String(key || ''));
    return result;
  };

  window.omasLoadAppStateFromSupabase = loadState;
  window.omasPushAppStateToSupabase = pushExistingState;

  window.addEventListener('omas:auth-ready', function () {
    setTimeout(function () { loadState().catch(function (err) { showStatus('Ayar yukleme hata: ' + (err && err.message ? err.message : String(err)), false); }); }, 900);
    setTimeout(installManualButton, 1200);
  });
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installManualButton, 1500);
    setTimeout(function () { loadState().catch(function () {}); }, 2200);
  });
})();
