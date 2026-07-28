(function () {
  var authState = {
    client: null,
    session: null,
    user: null,
    company: null,
    memberships: []
  };

  window.OMAS_AUTH = authState;

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function message(text, ok) {
    var el = q('#omasAuthMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', !!ok);
  }

  function setBusy(on) {
    var btn = q('#omasAuthLogin');
    if (btn) {
      btn.disabled = !!on;
      btn.textContent = on ? 'Giriş yapılıyor...' : 'Giriş Yap';
    }
  }

  function ensureShell() {
    if (!q('#omasAuthOverlay')) {
      var overlay = document.createElement('div');
      overlay.id = 'omasAuthOverlay';
      overlay.className = 'omas-auth-overlay';
      overlay.innerHTML =
        '<div class="omas-auth-card">' +
          '<div class="omas-auth-head">' +
            '<h2>ÖMAS GRUP FİNANS</h2>' +
            '<p>Supabase hesabınla giriş yap. Girişten sonra bağlı olduğun şirket otomatik seçilir.</p>' +
          '</div>' +
          '<div class="omas-auth-body">' +
            '<div class="omas-auth-field"><label>E-posta</label><input id="omasAuthEmail" type="email" autocomplete="email"></div>' +
            '<div class="omas-auth-field"><label>Şifre</label><input id="omasAuthPassword" type="password" autocomplete="current-password"></div>' +
            '<div class="omas-auth-actions">' +
              '<button class="omas-auth-btn" type="button" id="omasAuthLogin">Giriş Yap</button>' +
              '<button class="omas-auth-btn secondary" type="button" id="omasAuthRefresh">Oturumu Kontrol Et</button>' +
            '</div>' +
            '<div id="omasAuthMessage" class="omas-auth-message"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
    }

    if (!q('#omasAuthBadge')) {
      var badge = document.createElement('div');
      badge.id = 'omasAuthBadge';
      badge.className = 'omas-auth-badge';
      badge.innerHTML = '<span id="omasAuthBadgeText">Supabase</span><button type="button" id="omasAuthLogout">Çıkış</button>';
      document.body.appendChild(badge);
    }

    var login = q('#omasAuthLogin');
    if (login && !login.__omasAuthBound) {
      login.__omasAuthBound = true;
      login.onclick = signIn;
    }

    var refresh = q('#omasAuthRefresh');
    if (refresh && !refresh.__omasAuthBound) {
      refresh.__omasAuthBound = true;
      refresh.onclick = initSession;
    }

    var logout = q('#omasAuthLogout');
    if (logout && !logout.__omasAuthBound) {
      logout.__omasAuthBound = true;
      logout.onclick = signOut;
    }

    ['omasAuthEmail', 'omasAuthPassword'].forEach(function (id) {
      var input = q('#' + id);
      if (input && !input.__omasAuthBound) {
        input.__omasAuthBound = true;
        input.onkeydown = function (event) {
          if (event.key === 'Enter') signIn();
        };
      }
    });
  }

  function createClient() {
    if (authState.client) return authState.client;
    var cfg = window.OMAS_SUPABASE || {};
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase client yüklenmedi. İnternet bağlantısını veya CDN erişimini kontrol et.');
    }
    if (!cfg.url || !cfg.publishableKey) {
      throw new Error('Supabase config eksik.');
    }
    authState.client = window.supabase.createClient(cfg.url, cfg.publishableKey);
    window.omasSupabase = authState.client;
    return authState.client;
  }

  async function loadCompany() {
    var client = createClient();
    var result = await client
      .from('company_members')
      .select('company_id, role, companies:company_id(id, name, tax_no)')
      .order('created_at', { ascending: true });

    if (result.error) throw result.error;

    authState.memberships = result.data || [];
    if (!authState.memberships.length) {
      throw new Error('Bu kullanıcı hiçbir şirkete bağlı değil. company_members kaydını kontrol et.');
    }

    var savedCompanyId = authState.company && authState.company.id;
    var selected = authState.memberships.find(function (row) {
      return row.company_id === savedCompanyId;
    }) || authState.memberships[0];

    authState.company = {
      id: selected.company_id,
      role: selected.role,
      name: selected.companies && selected.companies.name ? selected.companies.name : 'Şirket'
    };

    return authState.company;
  }

  function unlockApp() {
    document.body.classList.remove('omas-auth-locked');
    document.body.classList.add('omas-auth-ready');
    var badgeText = q('#omasAuthBadgeText');
    if (badgeText) {
      var email = authState.user && authState.user.email ? authState.user.email : '';
      badgeText.innerHTML = esc(authState.company.name) + ' · ' + esc(email);
    }
    window.dispatchEvent(new CustomEvent('omas:auth-ready', { detail: authState }));
  }

  function lockApp(text) {
    document.body.classList.add('omas-auth-locked');
    document.body.classList.remove('omas-auth-ready');
    if (text) message(text, false);
  }

  async function initSession() {
    ensureShell();
    try {
      message('Oturum kontrol ediliyor...', true);
      var client = createClient();
      var sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw sessionResult.error;
      authState.session = sessionResult.data.session || null;
      authState.user = authState.session ? authState.session.user : null;
      if (!authState.session) {
        lockApp('Giriş yapman gerekiyor.');
        return;
      }
      await loadCompany();
      message('Giriş başarılı.', true);
      unlockApp();
    } catch (err) {
      lockApp(err && err.message ? err.message : String(err));
    }
  }

  async function signIn() {
    ensureShell();
    var email = (q('#omasAuthEmail') || {}).value || '';
    var password = (q('#omasAuthPassword') || {}).value || '';
    if (!email.trim() || !password) {
      message('E-posta ve şifre gir.', false);
      return;
    }
    setBusy(true);
    try {
      var client = createClient();
      var result = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });
      if (result.error) throw result.error;
      authState.session = result.data.session;
      authState.user = result.data.user;
      await loadCompany();
      message('Giriş başarılı.', true);
      unlockApp();
    } catch (err) {
      lockApp(err && err.message ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      var client = createClient();
      await client.auth.signOut();
    } catch (err) {}
    authState.session = null;
    authState.user = null;
    authState.company = null;
    lockApp('Çıkış yapıldı.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureShell();
    lockApp('Giriş yapman gerekiyor.');
    initSession();
  });
})();
