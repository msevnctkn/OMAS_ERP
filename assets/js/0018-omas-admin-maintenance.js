(function () {
  'use strict';

  var PANEL_ID = 'omasAdminMaintenancePanel';
  var STYLE_ID = 'omasAdminMaintenanceStyle';

  function auth() {
    return window.OMAS_AUTH || {};
  }

  function isAdmin() {
    return String(auth().company && auth().company.role || '').toLowerCase() === 'admin';
  }

  function client() {
    if (!window.omasSupabase) throw new Error('Supabase bağlantısı hazır değil.');
    return window.omasSupabase;
  }

  function companyId() {
    var id = auth().company && auth().company.id;
    if (!id) throw new Error('Aktif şirket bulunamadı.');
    return id;
  }

  function companyName() {
    return String(auth().company && auth().company.name || 'Şirket');
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '#omasAdminMaintenanceOpen{position:fixed;left:18px;bottom:18px;z-index:2147483000;border:0;border-radius:12px;padding:10px 14px;background:#7f1d1d;color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22)}' +
      '#'+PANEL_ID+'{position:fixed;inset:0;z-index:2147483100;background:rgba(15,23,42,.64);display:none;align-items:center;justify-content:center;padding:18px}' +
      '#'+PANEL_ID+'.open{display:flex}' +
      '#'+PANEL_ID+' .omas-maint-card{width:min(680px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 28px 80px rgba(0,0,0,.35)}' +
      '#'+PANEL_ID+' .omas-maint-head{padding:20px 22px;background:#7f1d1d;color:#fff;display:flex;justify-content:space-between;gap:15px;align-items:center}' +
      '#'+PANEL_ID+' .omas-maint-head h2{margin:0;font-size:20px}' +
      '#'+PANEL_ID+' .omas-maint-close{border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:9px;padding:7px 10px;cursor:pointer}' +
      '#'+PANEL_ID+' .omas-maint-body{padding:22px}' +
      '#'+PANEL_ID+' .omas-maint-warning{background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:12px;border-radius:10px;font-weight:700;margin-bottom:16px}' +
      '#'+PANEL_ID+' .omas-maint-actions{display:grid;gap:10px}' +
      '#'+PANEL_ID+' .omas-maint-action{display:flex;justify-content:space-between;gap:16px;align-items:center;border:1px solid #e2e8f0;border-radius:12px;padding:14px}' +
      '#'+PANEL_ID+' .omas-maint-action strong{display:block;margin-bottom:4px}' +
      '#'+PANEL_ID+' .omas-maint-action small{color:#64748b}' +
      '#'+PANEL_ID+' .omas-maint-delete{white-space:nowrap;border:0;border-radius:9px;padding:9px 12px;background:#dc2626;color:#fff;font-weight:900;cursor:pointer}' +
      '#'+PANEL_ID+' .omas-maint-delete:disabled{opacity:.55;cursor:wait}' +
      '#'+PANEL_ID+' .omas-maint-status{margin-top:14px;padding:11px;border-radius:9px;background:#f1f5f9;white-space:pre-wrap;font-weight:700;display:none}' +
      '#'+PANEL_ID+' .omas-maint-status.ok{display:block;background:#dcfce7;color:#166534}' +
      '#'+PANEL_ID+' .omas-maint-status.err{display:block;background:#fee2e2;color:#991b1b}';
    document.head.appendChild(style);
  }

  function scopeLabel(scope) {
    if (scope === 'invoices') return 'FATURA';
    if (scope === 'banking') return 'BANKA';
    return 'TÜMÜ';
  }

  function setStatus(text, ok) {
    var el = document.querySelector('#' + PANEL_ID + ' .omas-maint-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'omas-maint-status ' + (ok ? 'ok' : 'err');
  }

  function formatResult(result) {
    var deleted = result && result.deleted || {};
    return [
      'Temizleme tamamlandı.',
      'Faturalar: ' + (deleted.faturalar || 0),
      'Fatura kalemleri: ' + (deleted.fatura_kalemleri || 0),
      'Banka hareketleri: ' + (deleted.banka_hareketleri || 0),
      'Ödemeler: ' + (deleted.odemeler || 0),
      'Cariler: ' + (deleted.cariler || 0),
      'Projeler: ' + (deleted.projeler || 0),
      'Dosya kayıtları: ' + (deleted.dosyalar || 0)
    ].join('\n');
  }

  async function runReset(scope, button) {
    if (!isAdmin()) {
      setStatus('Bu işlem yalnızca admin tarafından yapılabilir.', false);
      return;
    }

    var phrase = 'SİL ' + scopeLabel(scope);
    var typed = window.prompt(
      companyName() + ' şirketindeki seçili veriler kalıcı olarak silinecek.\n\nDevam etmek için aynen şunu yaz:\n' + phrase
    );

    if (String(typed || '').trim().toLocaleUpperCase('tr-TR') !== phrase) {
      setStatus('İşlem iptal edildi. Doğrulama metni eşleşmedi.', false);
      return;
    }

    if (!window.confirm('Son onay: Bu işlem geri alınamaz. Devam edilsin mi?')) return;

    button.disabled = true;
    var oldText = button.textContent;
    button.textContent = 'Siliniyor...';
    setStatus('İşlem başlatıldı...', true);

    try {
      var response = await client().rpc('admin_reset_company_data', {
        target_company_id: companyId(),
        reset_scope: scope
      });
      if (response.error) throw response.error;

      setStatus(formatResult(response.data), true);

      try {
        if (scope === 'invoices' || scope === 'all') {
          localStorage.removeItem('v233XmlInvoiceLines');
        }
        if (scope === 'all') {
          Object.keys(localStorage).forEach(function (key) {
            if (/^(v\d+|omas|bhd|xml|invoice|project|cari)/i.test(key)) localStorage.removeItem(key);
          });
        }
      } catch (ignore) {}

      window.dispatchEvent(new CustomEvent('omas:admin-reset-complete', { detail: response.data }));
    } catch (err) {
      setStatus(err && err.message ? err.message : String(err), false);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function createPanel() {
    if (!isAdmin() || document.getElementById(PANEL_ID)) return;
    addStyles();

    var open = document.createElement('button');
    open.id = 'omasAdminMaintenanceOpen';
    open.type = 'button';
    open.textContent = 'Admin · Bakım';
    document.body.appendChild(open);

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML =
      '<div class="omas-maint-card">' +
        '<div class="omas-maint-head"><div><h2>Admin Bakım Paneli</h2><div>' + esc(companyName()) + '</div></div><button class="omas-maint-close" type="button">Kapat</button></div>' +
        '<div class="omas-maint-body">' +
          '<div class="omas-maint-warning">Bu işlemler geri alınamaz. Canlı veride kullanmadan önce yedek alın.</div>' +
          '<div class="omas-maint-actions">' +
            '<div class="omas-maint-action"><div><strong>Fatura verilerini temizle</strong><small>Faturalar ve bağlı fatura kalemleri silinir.</small></div><button class="omas-maint-delete" data-scope="invoices" type="button">Faturaları Sil</button></div>' +
            '<div class="omas-maint-action"><div><strong>Banka ve ödeme verilerini temizle</strong><small>Banka hareketleri ve ödeme kayıtları silinir.</small></div><button class="omas-maint-delete" data-scope="banking" type="button">BHD / Ödeme Sil</button></div>' +
            '<div class="omas-maint-action"><div><strong>Tüm operasyonel verileri sıfırla</strong><small>Fatura, BHD, ödeme, cari, proje, kategori, dosya metadata ve uygulama durumu silinir. Kullanıcılar ve şirket kaydı korunur.</small></div><button class="omas-maint-delete" data-scope="all" type="button">Tümünü Sil</button></div>' +
          '</div>' +
          '<div class="omas-maint-status"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    open.onclick = function () { panel.classList.add('open'); };
    panel.querySelector('.omas-maint-close').onclick = function () { panel.classList.remove('open'); };
    panel.addEventListener('click', function (event) {
      if (event.target === panel) panel.classList.remove('open');
      var btn = event.target.closest && event.target.closest('[data-scope]');
      if (btn) runReset(btn.getAttribute('data-scope'), btn);
    });
  }

  function init() {
    if (isAdmin()) createPanel();
  }

  window.addEventListener('omas:auth-ready', function () { setTimeout(init, 150); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
})();
