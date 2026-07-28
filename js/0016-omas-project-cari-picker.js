(function () {
  var MANUAL = 'v282ManualCariCards';
  var XML = 'v233XmlInvoiceLines';
  var SALES = 'v254ProjectSalesLines';
  var GRS_SALES = 'v256GrsSalesLines';

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function read(k, fb) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || JSON.stringify(fb));
      return v == null ? fb : v;
    } catch (e) { return fb; }
  }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v || [])); }
  function norm(v) {
    try {
      return String(v || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    } catch (e) {
      return String(v || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    }
  }
  function addName(map, name) {
    name = String(name || '').trim();
    var key = norm(name);
    if (!key || name === '-') return;
    if (!map[key]) map[key] = name;
  }
  function rowParty(r) {
    return r && (r.supplier || r.customer || r.party_name || r.kisiFirma || r.firma || r.company || r.cari || r.name);
  }
  function options(selected) {
    var map = {};
    read(XML, []).forEach(function (r) { addName(map, rowParty(r)); });
    read(SALES, []).forEach(function (r) { addName(map, rowParty(r)); });
    read(GRS_SALES, []).forEach(function (r) { addName(map, rowParty(r)); });
    read(MANUAL, []).forEach(function (c) { addName(map, c && c.name); });
    (window.__omasProjectCariExtra || []).forEach(function (c) { addName(map, c && (c.name || c)); });
    addName(map, selected);
    return Object.keys(map).map(function (key) { return { key: key, name: map[key] }; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
  }
  function selectHtml(id, selected) {
    var list = options(selected);
    var html = '<div class="omas-project-cari-row"><select id="' + esc(id) + '"><option value="">Cari sec</option>';
    html += list.map(function (c) {
      return '<option value="' + esc(c.name) + '"' + (norm(c.name) === norm(selected) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    html += '</select><button type="button" class="secondary-button omas-project-new-cari" data-omas-new-cari="' + esc(id) + '">Yeni Cari</button></div>';
    return html;
  }
  function selectedValue(id) {
    var el = document.getElementById(id);
    return String(el && el.value || '').trim();
  }
  function saveManual(obj) {
    var list = read(MANUAL, []);
    var key = norm(obj.name);
    var old = list.filter(function (c) { return norm(c && c.name) === key; })[0];
    if (!old) {
      old = { id: 'cari-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString() };
      list.push(old);
    }
    old.name = obj.name;
    old.tax = obj.tax || '';
    old.phone = obj.phone || '';
    old.mail = obj.email || '';
    old.email = obj.email || '';
    old.note = obj.note || '';
    old.updatedAt = new Date().toISOString();
    write(MANUAL, list);
    return old;
  }
  async function saveSupabase(obj) {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    var payload = {
      company_id: window.OMAS_AUTH.company.id,
      name: obj.name,
      normalized_name: norm(obj.name) || 'BILINMEYEN',
      tax_no: obj.tax || '',
      email: obj.email || '',
      phone: obj.phone || '',
      notes: obj.note || '',
      source: 'manual',
      updated_at: new Date().toISOString()
    };
    var res = await window.omasSupabase.from('cariler').upsert(payload, { onConflict: 'company_id,normalized_name' }).select('id,name').single();
    if (res.error) throw res.error;
    return res.data;
  }
  function injectStyles() {
    if (q('#omasProjectCariStyle')) return;
    var st = document.createElement('style');
    st.id = 'omasProjectCariStyle';
    st.textContent = '.omas-project-cari-row{display:flex;gap:8px;align-items:center}.omas-project-cari-row select{min-width:0;flex:1}.omas-project-new-cari{white-space:nowrap}.omas-cari-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}.omas-cari-modal{width:min(720px,96vw);background:#fff;border:1px solid #dbe3ef;border-radius:8px;box-shadow:0 24px 80px rgba(15,23,42,.28);padding:18px;color:#0f172a}.omas-cari-modal h3{margin:0 0 12px;font-size:18px}.omas-cari-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.omas-cari-field{display:flex;flex-direction:column;gap:5px}.omas-cari-field.full{grid-column:1/-1}.omas-cari-field label{font-weight:800;font-size:12px;color:#475569}.omas-cari-field input,.omas-cari-field textarea{border:1px solid #d7dee9;border-radius:7px;padding:10px;font:inherit}.omas-cari-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.omas-cari-actions button{border:0;border-radius:7px;padding:10px 14px;font-weight:800;cursor:pointer}.omas-cari-actions .primary{background:#2563eb;color:#fff}.omas-cari-actions .secondary{background:#0f172a;color:#fff}@media(max-width:720px){.omas-cari-grid{grid-template-columns:1fr}.omas-project-cari-row{flex-direction:column;align-items:stretch}}';
    document.head.appendChild(st);
  }
  function openModal(targetId) {
    injectStyles();
    var old = q('#omasProjectCariModal');
    if (old) old.remove();
    var div = document.createElement('div');
    div.id = 'omasProjectCariModal';
    div.className = 'omas-cari-modal-backdrop';
    div.innerHTML = '<div class="omas-cari-modal"><h3>Yeni Cari Olustur</h3><div class="omas-cari-grid"><div class="omas-cari-field full"><label>Cari Adi</label><input id="omasNewCariName" placeholder="Firma / musteri adi"></div><div class="omas-cari-field"><label>Vergi No / TC</label><input id="omasNewCariTax"></div><div class="omas-cari-field"><label>Telefon</label><input id="omasNewCariPhone"></div><div class="omas-cari-field"><label>E-posta</label><input id="omasNewCariEmail"></div><div class="omas-cari-field full"><label>Not / Adres</label><textarea id="omasNewCariNote" rows="3"></textarea></div></div><div class="omas-cari-actions"><button type="button" class="secondary" data-omas-cari-close>Vazgec</button><button type="button" class="primary" data-omas-cari-save="' + esc(targetId || '') + '">Kaydet</button></div></div>';
    document.body.appendChild(div);
    setTimeout(function () { var inp = q('#omasNewCariName'); if (inp) inp.focus(); }, 0);
  }
  function refreshSelects(name) {
    qa('#v247Customer,#v256Customer').forEach(function (sel) {
      if (!sel || sel.tagName !== 'SELECT') return;
      var exists = false;
      qa('option', sel).forEach(function (o) { if (norm(o.value) === norm(name)) exists = true; });
      if (!exists) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      }
      sel.value = name;
    });
  }
  function replaceProjectCustomer(id) {
    var el = document.getElementById(id);
    if (!el || el.tagName === 'SELECT') return;
    var field = el.closest && el.closest('.v247-field,.v256-field');
    if (!field) return;
    var val = String(el.value || '').trim();
    field.innerHTML = '<label>Cari</label>' + selectHtml(id, val);
  }
  function patchOpenForms() {
    replaceProjectCustomer('v247Customer');
    replaceProjectCustomer('v256Customer');
  }
  async function saveFromModal(targetId) {
    var obj = {
      name: String((q('#omasNewCariName') || {}).value || '').trim(),
      tax: String((q('#omasNewCariTax') || {}).value || '').trim(),
      phone: String((q('#omasNewCariPhone') || {}).value || '').trim(),
      email: String((q('#omasNewCariEmail') || {}).value || '').trim(),
      note: String((q('#omasNewCariNote') || {}).value || '').trim()
    };
    if (!obj.name) { alert('Cari adi bos olamaz.'); return; }
    saveManual(obj);
    try { await saveSupabase(obj); } catch (err) { alert('Cari yerel kaydedildi ama Supabase yazamadi: ' + (err && err.message ? err.message : String(err))); }
    window.__omasProjectCariExtra = window.__omasProjectCariExtra || [];
    window.__omasProjectCariExtra.push({ name: obj.name });
    refreshSelects(obj.name);
    var target = document.getElementById(targetId);
    if (target) target.value = obj.name;
    var modal = q('#omasProjectCariModal');
    if (modal) modal.remove();
    try { if (window.omasPushAppStateToSupabase) window.omasPushAppStateToSupabase(); } catch (e) {}
    try { if (window.omasRenderSupabaseCariCards) window.omasRenderSupabaseCariCards(true); } catch (e2) {}
  }
  document.addEventListener('click', function (e) {
    var saveOfficial = e.target && e.target.closest && e.target.closest('#v247Save');
    if (saveOfficial && document.getElementById('v247Customer') && !selectedValue('v247Customer')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('Cari sec. Yeni cari gerekiyorsa Yeni Cari butonunu kullan.');
      return false;
    }
    var saveGrs = e.target && e.target.closest && e.target.closest('#v256Save');
    if (saveGrs && document.getElementById('v256Customer') && !selectedValue('v256Customer')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      alert('Cari sec. Yeni cari gerekiyorsa Yeni Cari butonunu kullan.');
      return false;
    }
    var add = e.target && e.target.closest && e.target.closest('[data-omas-new-cari]');
    if (add) { e.preventDefault(); openModal(add.getAttribute('data-omas-new-cari')); return; }
    if (e.target && e.target.closest && e.target.closest('[data-omas-cari-close]')) { var m = q('#omasProjectCariModal'); if (m) m.remove(); return; }
    var save = e.target && e.target.closest && e.target.closest('[data-omas-cari-save]');
    if (save) { e.preventDefault(); saveFromModal(save.getAttribute('data-omas-cari-save')); return; }
  }, true);
  window.omasProjectCariSelectHtml = selectHtml;
  window.omasProjectCariValue = selectedValue;
  window.omasProjectCariOptions = options;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patchOpenForms);
  else patchOpenForms();
  try {
    new MutationObserver(function () { patchOpenForms(); }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    setInterval(patchOpenForms, 700);
  }
})();
