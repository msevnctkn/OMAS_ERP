(function () {
  var ROWS = 'v233XmlInvoiceLines';
  var ASSIGN = 'v233XmlCategoryAssignments';
  var COMPANY = 'v244XmlCompanyAssignments';
  var OFFICIAL_MAP = 'v248ProjectLineAssignments';
  var OFFICIAL_PROJECTS = 'v247ProjectManagementProjects';
  var GRS_MAP = 'v256GrsCostMap';
  var GRS_PROJECTS = 'v256GrsProjects';

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }
  function q(s, r) { return (r || document).querySelector(s); }
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb)); return v == null ? fb : v; } catch (e) { return fb; } }
  function rows() { return read(ROWS, []); }
  function supplier(r) { return r && (r.supplier || r.firma || r.company || r.supplierName || r.sellerName) || '-'; }
  function rowId(r) {
    return (r && r.id) || [r && r.file, r && r.invoiceNo, r && r.date, supplier(r), r && r.lineNo, r && r.name, Number(r && r.matrah || 0).toFixed(2)].join('||');
  }
  function findLine(id) {
    var found = null;
    rows().some(function (r) {
      if (rowId(r) === id) {
        found = r;
        return true;
      }
      return false;
    });
    return found;
  }
  function num(v) {
    var n = Number(v || 0);
    return isFinite(n) ? n : 0;
  }
  function norm(v) {
    return String(v || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }
  function moneyNum(v) {
    var s = String(v || '').replace(/\s*TL\s*/gi, '').trim();
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s.replace(/[^0-9.-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function companyCode(v) {
    var n = norm(v);
    if (n.indexOf('OTOMASYON') >= 0) return 'O';
    if (n.indexOf('KONSEPT') >= 0) return 'K';
    if (n.indexOf('ORTAK') >= 0) return 'R';
    return '';
  }
  function recoveryKey(invoiceNo, date, supplierName, itemName, matrah) {
    return [norm(invoiceNo), String(date || '').slice(0, 10), norm(supplierName), norm(itemName), moneyNum(matrah).toFixed(2)].join('|');
  }
  function recoveryLooseKey(invoiceNo, itemName, matrah) {
    return [norm(invoiceNo), norm(itemName), moneyNum(matrah).toFixed(2)].join('|');
  }
  function rowRecoveryKeys(r) {
    return {
      strict: recoveryKey(r && r.invoiceNo, r && r.date, supplier(r), r && r.name, r && r.matrah),
      loose: recoveryLooseKey(r && r.invoiceNo, r && r.name, r && r.matrah)
    };
  }
  function captureStaticCategoryRecovery() {
    var host = document.getElementById('v189PageCategory');
    if (!host) return window.__omasStaticCategoryRecovery || { strict: {}, loose: {}, count: 0 };
    var strict = {}, loose = {}, currentCompany = '', currentMain = '', currentSub = '';
    function addRec(rec) {
      if (!rec || !rec.invoiceNo || !rec.main) return;
      strict[recoveryKey(rec.invoiceNo, rec.date, rec.supplier, rec.item, rec.matrah)] = rec;
      loose[recoveryLooseKey(rec.invoiceNo, rec.item, rec.matrah)] = rec;
    }
    Array.prototype.slice.call(host.querySelectorAll('tr')).forEach(function (tr) {
      var v258Toggle = tr.querySelector('[data-v258-toggle]');
      if (v258Toggle && tr.children && tr.children.length >= 7) {
        currentCompany = companyCode(tr.children[0].textContent || currentCompany);
        currentMain = String(v258Toggle.textContent || '').trim();
        currentSub = String((tr.children[2] && tr.children[2].textContent) || '').trim();
        if (currentSub === '-') currentSub = '';
        return;
      }
      if (tr.classList.contains('v258-detail')) {
        Array.prototype.slice.call(tr.querySelectorAll('tbody tr')).forEach(function (row) {
          var c = row.children;
          if (!c || c.length < 9) return;
          addRec({
            company: currentCompany,
            main: currentMain,
            sub: currentSub,
            invoiceNo: c[0].textContent,
            date: c[1].textContent,
            supplier: c[2].textContent,
            item: c[3].textContent,
            matrah: moneyNum(c[6].textContent)
          });
        });
        return;
      }
      var title = tr.querySelector('.v264-company-title');
      if (title) {
        currentCompany = companyCode(String(title.textContent || '').split('-')[0]);
        currentMain = '';
        currentSub = '';
        return;
      }
      if (tr.classList.contains('v264-main-row')) {
        var mainCells = tr.children;
        currentMain = mainCells && mainCells[1] ? String(mainCells[1].textContent || '').trim() : currentMain;
        currentSub = '';
        return;
      }
      if (tr.classList.contains('v264-sub-row')) {
        var subCells = tr.children;
        currentSub = subCells && subCells[1] ? String(subCells[1].textContent || '').trim() : '';
        if (currentSub === '-') currentSub = '';
        return;
      }
      if (!tr.classList.contains('v264-detail-row')) return;
      Array.prototype.slice.call(tr.querySelectorAll('tbody tr')).forEach(function (row) {
        var c = row.children;
        if (!c || c.length < 7) return;
        addRec({
          company: currentCompany,
          main: currentMain,
          sub: currentSub,
          invoiceNo: c[0].textContent,
          date: c[1].textContent,
          supplier: c[2].textContent,
          item: c[3].textContent,
          matrah: moneyNum(c[4].textContent)
        });
      });
    });
    window.__omasStaticCategoryRecovery = { strict: strict, loose: loose, count: Object.keys(strict).length };
    return window.__omasStaticCategoryRecovery;
  }
  function projectName(kind, key) {
    if (!key) return '';
    var list = read(kind === 'grs' ? GRS_PROJECTS : OFFICIAL_PROJECTS, []);
    var hit = list.filter(function (p) { return p && p.id === key; })[0];
    return hit ? (hit.name || hit.code || key) : key;
  }
  function projectForLine(id, line) {
    var official = read(OFFICIAL_MAP, {});
    var grs = read(GRS_MAP, {});
    var key = official[id] || official[line && line.id];
    if (key) return { kind: 'official', key: key, name: projectName('official', key) };
    key = grs[id] || grs[line && line.id];
    if (key) return { kind: 'grs', key: key, name: projectName('grs', key) };
    if (line && line.projectKind && line.projectKey) return { kind: line.projectKind, key: line.projectKey, name: line.projectName || projectName(line.projectKind, line.projectKey) };
    return { kind: '', key: '', name: '' };
  }
  function status(text, ok) {
    var badge = document.getElementById('omasAppStateSyncStatus') || document.getElementById('omasRuntimeBootstrapStatus') || document.getElementById('omasAuthBadge') || document.body;
    var box = document.getElementById('omasInvoiceLineStateStatus');
    if (!box && badge) {
      box = document.createElement('span');
      box.id = 'omasInvoiceLineStateStatus';
      box.style.cssText = 'margin-left:8px;font-weight:800;font-size:12px;color:#166534';
      badge.parentNode ? badge.parentNode.insertBefore(box, badge.nextSibling) : badge.appendChild(box);
    }
    if (!box) return;
    box.textContent = text;
    box.style.color = ok === false ? '#991b1b' : '#166534';
  }
  async function updateLine(line, patch) {
    var a = auth();
    if (!a || !line) return false;
    var query = a.client.from('fatura_kalemleri').update(patch).eq('company_id', a.companyId);
    if (line.supabaseLineId) query = query.eq('id', line.supabaseLineId);
    else if (line.xmlDedupeKey) query = query.eq('dedupe_key', line.xmlDedupeKey);
    else return false;
    var res = await query.select('id').limit(1);
    if (res.error) throw res.error;
    return true;
  }
  async function syncLineState(id) {
    var line = findLine(id);
    if (!line) return false;
    var assign = read(ASSIGN, {})[id] || read(ASSIGN, {})[line.id] || {};
    var company = read(COMPANY, {})[id] || read(COMPANY, {})[line.id] || line.companyCode || '';
    var prj = projectForLine(id, line);
    var patch = {
      company_code: company || null,
      category_main: assign.main || line.categoryMain || null,
      category_sub: assign.sub || line.categorySub || null,
      project_kind: prj.kind || null,
      project_key: prj.key || null,
      project_name: prj.name || null,
      matrah: num(line.matrah),
      kdv: num(line.kdv),
      total: num(line.total) || (num(line.matrah) + num(line.kdv))
    };
    await updateLine(line, patch);
    status('Fatura kalemi Supabase OK', true);
    return true;
  }
  function hasLocalState(id, line) {
    var assign = read(ASSIGN, {});
    var company = read(COMPANY, {});
    var official = read(OFFICIAL_MAP, {});
    var grs = read(GRS_MAP, {});
    return !!(
      assign[id] || assign[line && line.id] ||
      company[id] || company[line && line.id] ||
      official[id] || official[line && line.id] ||
      grs[id] || grs[line && line.id]
    );
  }
  async function migrateExistingLineState() {
    var list = rows();
    var total = 0;
    var ok = 0;
    for (var i = 0; i < list.length; i++) {
      var id = rowId(list[i]);
      if (!hasLocalState(id, list[i])) continue;
      total++;
      try {
        await syncLineState(id);
        ok++;
        if (ok % 25 === 0) status('Fatura secimleri aktariliyor: ' + ok + '/' + total, true);
      } catch (err) {
        status('Fatura secimi aktarim hata: ' + (err && err.message ? err.message : err), false);
        throw err;
      }
    }
    status('Fatura secimleri Supabase aktarildi: ' + ok + '/' + total, true);
    try { if (window.omasLoadRuntimeFromSupabase) await window.omasLoadRuntimeFromSupabase(); } catch (e) {}
    return { scanned: list.length, selected: total, saved: ok };
  }
  async function recoverOldSelections() {
    var recovery = window.__omasStaticCategoryRecovery || captureStaticCategoryRecovery();
    var list = rows();
    var cat = read(ASSIGN, {});
    var company = read(COMPANY, {});
    var matched = 0;
    list.forEach(function (line) {
      var id = rowId(line);
      var keys = rowRecoveryKeys(line);
      var rec = recovery.strict[keys.strict] || recovery.loose[keys.loose];
      if (!rec) return;
      if (rec.main || rec.sub) cat[id] = { main: rec.main || '', sub: rec.sub || '' };
      if (rec.company) company[id] = rec.company;
      matched++;
    });
    localStorage.setItem(ASSIGN, JSON.stringify(cat));
    localStorage.setItem(COMPANY, JSON.stringify(company));
    status('Eski secimler kurtarildi: ' + matched + '/' + list.length, matched > 0);
    try { if (window.v270ShowCategorize && document.querySelector('#v189PageCategorize.active')) window.v270ShowCategorize(); } catch (e) {}
    try { if (window.v233RenderCategory) window.v233RenderCategory(); } catch (e) {}
    try {
      if (window.omasPushAppStateToSupabase) await window.omasPushAppStateToSupabase();
    } catch (e) {}
    var migrated = null;
    try {
      migrated = await migrateExistingLineState();
    } catch (err) {
      var msg = err && err.message ? err.message : String(err || '');
      if (msg.indexOf('category_main') >= 0 || msg.indexOf('company_code') >= 0 || msg.indexOf('schema cache') >= 0) {
        status('Eski secimler ekrana geldi. DB kolonlari icin SQL calistir, sonra DB aktar.', false);
        return { recovered: matched, migrated: null, dbPending: true };
      }
      throw err;
    }
    return { recovered: matched, migrated: migrated };
  }
  async function markDeleted(line) {
    if (!line) return false;
    await updateLine(line, { is_deleted: true });
    status('Fatura kalemi Supabase silindi', true);
    return true;
  }
  function idFromEvent(target) {
    if (!target || !target.getAttribute) return '';
    return target.getAttribute('data-v270-company') ||
      target.getAttribute('data-v270-main') ||
      target.getAttribute('data-v270-sub') ||
      target.getAttribute('data-v270-save-line') ||
      target.getAttribute('data-v270-del-line') ||
      target.getAttribute('data-v289-send-project') ||
      '';
  }
  function install() {
    var lastProjectLineId = '';
    document.addEventListener('change', function (e) {
      var target = e.target;
      if (!target || !target.matches || !target.matches('[data-v270-company],[data-v270-main],[data-v270-sub]')) return;
      var id = idFromEvent(target);
      setTimeout(function () { syncLineState(id).catch(function (err) { status('Fatura kalemi kayit hata: ' + (err && err.message ? err.message : err), false); }); }, 650);
    }, true);
    document.addEventListener('click', function (e) {
      var save = e.target && e.target.closest && e.target.closest('[data-v270-save-line]');
      if (save) {
        var saveId = idFromEvent(save);
        setTimeout(function () { syncLineState(saveId).catch(function (err) { status('Fatura kalemi kayit hata: ' + (err && err.message ? err.message : err), false); }); }, 650);
        return;
      }
      var del = e.target && e.target.closest && e.target.closest('[data-v270-del-line]');
      if (del) {
        var delId = idFromEvent(del);
        var before = findLine(delId);
        setTimeout(function () {
          if (before && !findLine(delId)) markDeleted(before).catch(function (err) { status('Fatura kalemi silme hata: ' + (err && err.message ? err.message : err), false); });
        }, 800);
        return;
      }
      var project = e.target && e.target.closest && e.target.closest('[data-v289-send-project]');
      if (project) {
        lastProjectLineId = idFromEvent(project);
        return;
      }
      if (e.target && e.target.closest && e.target.closest('[data-v289-save]') && lastProjectLineId) {
        setTimeout(function () { syncLineState(lastProjectLineId).catch(function (err) { status('Proje kaydi hata: ' + (err && err.message ? err.message : err), false); }); }, 900);
      }
    }, true);
    captureStaticCategoryRecovery();
    installMigrationButton();
  }
  function installMigrationButton() {
    if (document.getElementById('omasMigrateInvoiceLineStateBtn')) return;
    var host = document.getElementById('omasAuthBadge') || document.querySelector('.top-menu-bar') || document.body;
    if (!host) return;
    var btn = document.createElement('button');
    btn.id = 'omasMigrateInvoiceLineStateBtn';
    btn.type = 'button';
    btn.textContent = "Fatura Secimlerini DB'ye Aktar";
    btn.style.cssText = 'margin-left:8px;background:#1d4ed8;color:white;border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer';
    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Aktariliyor...';
      migrateExistingLineState().catch(function (err) {
        alert('Fatura secimleri Supabase aktarilamadi: ' + (err && err.message ? err.message : String(err)) + '\n\nSupabase SQL Editor icinde invoice_line_state_columns.sql dosyasini calistirdigindan emin ol.');
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = "Fatura Secimlerini DB'ye Aktar";
      });
    };
    host.appendChild(btn);
    var recover = document.createElement('button');
    recover.id = 'omasRecoverInvoiceLineStateBtn';
    recover.type = 'button';
    recover.textContent = 'Eski Secimleri Kurtar';
    recover.style.cssText = 'margin-left:8px;background:#be123c;color:white;border:0;border-radius:8px;padding:7px 10px;font-weight:800;cursor:pointer';
    recover.onclick = function () {
      recover.disabled = true;
      recover.textContent = 'Kurtariliyor...';
      recoverOldSelections().catch(function (err) {
        alert('Eski secimler kurtarilamadi: ' + (err && err.message ? err.message : String(err)));
      }).finally(function () {
        recover.disabled = false;
        recover.textContent = 'Eski Secimleri Kurtar';
      });
    };
    host.appendChild(recover);
  }

  window.omasSyncInvoiceLineStateToSupabase = syncLineState;
  window.omasMarkInvoiceLineDeletedInSupabase = markDeleted;
  window.omasMigrateInvoiceLineStateToSupabase = migrateExistingLineState;
  window.omasRecoverInvoiceLineStateFromStaticReport = recoverOldSelections;
  captureStaticCategoryRecovery();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
