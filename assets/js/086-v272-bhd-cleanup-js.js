(function(){
  var BHD_ROWS='bhdPersistentRowsV267', BHD_COMPANY='bhdRowCompanyMapV267', BHD_CAT='bhdRowCategoryMapV267', BHD_DELETED='bhdDeletedRowsV272', CAT='bhdManualCategories', SUB='bhdManualSubcategories';
  function q(s,r){return (r||document).querySelector(s)}function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function read(k,fb){try{var v=JSON.parse(localStorage.getItem(k)||JSON.stringify(fb));return v==null?fb:v}catch(e){return fb}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function norm(v){return String(v||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim()}
  function money(v){return Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function code(v){v=String(v||'').toUpperCase().trim();return /^[OKR]$/.test(v)?v:''}
  function firmName(v){v=code(v)||'NONE';return v==='O'?'OMAS OTOMASYON':(v==='K'?'OMAS KONSEPT':(v==='R'?'ORTAK HARCAMA':'Firma Secilmedi'))}
  function rows() {
  var draft = [];

  if (
    window.OMAS &&
    OMAS.Workspace &&
    typeof OMAS.Workspace.getBhdDraftRows === 'function'
  ) {
    draft = OMAS.Workspace.getBhdDraftRows();
  }

  if (Array.isArray(draft) && draft.length) {
    return draft.map(function (row) {
      return Object.assign({}, row);
    });
  }

  var live =
    window.bhdRawRows && Array.isArray(window.bhdRawRows)
      ? window.bhdRawRows
      : [];

  if (live.length) {
    return live.map(function (row) {
      return Object.assign({}, row);
    });
  }

  return read(BHD_ROWS, []).map(function (row) {
    return Object.assign({}, row);
  });
}
  
  
  
  
function setRows(rs) {
  // Aynı dizi referansının temizlenmesini önlemek için önce bağımsız kopya al.
  var cleanRows = Array.isArray(rs)
    ? rs.map(function (row) {
        return Object.assign({}, row);
      })
    : [];

  cleanRows.forEach(function (row, index) {
    row.sira = index + 1;
  });

  // Ana kaynak Workspace.
  if (
    window.OMAS &&
    OMAS.Workspace &&
    typeof OMAS.Workspace.setBhdDraftRows === 'function'
  ) {
    OMAS.Workspace.setBhdDraftRows(cleanRows);
  }

  // Legacy ekranlar için cache.
  write(BHD_ROWS, cleanRows);

  // Workspace adaptörü global diziyi güncellemiyorsa güvenli şekilde güncelle.
  if (
    !window.bhdRawRows ||
    !Array.isArray(window.bhdRawRows)
  ) {
    window.bhdRawRows = [];
  }

  window.bhdRawRows.length = 0;

  cleanRows.forEach(function (row) {
    window.bhdRawRows.push(Object.assign({}, row));
  });
}
  
  
  
  function deleted(){return read(BHD_DELETED,[])}function setDeleted(rs){write(BHD_DELETED,rs)}
  function idOf(r){return [r&&r.kaynak,r&&r.referans,r&&r.sira,r&&r.tarih,r&&r.aciklama].join('|')}
  function amount(r){return Number(r&&r.giden||0)||Math.abs(Number(r&&r.net||0))||Number(r&&r.gelen||0)||0}
  function cats(){var arr=window.manualCategories||read(CAT,['Diger','Ticari İşlem','Ticari Olmayan Transfer','Malzeme','Kargo','Reklam','Yakit','Vergi','SGK / Personel','Maas','Yemek','Market','Faiz / Banka Ucreti']);return Array.isArray(arr)?arr:['Diger']}
  function subs(){var obj=window.manualSubcategories||read(SUB,{});return obj&&typeof obj==='object'?obj:{}}
  function saveCats(c){window.manualCategories=c;write(CAT,c)}function saveSubs(s){window.manualSubcategories=s;write(SUB,s)}
  function catMap(){return read(BHD_CAT,{})}function compMap(){return read(BHD_COMPANY,{})}
  function refreshExistingCategory(){var b=q('#bhdV267Subnav [data-bhd-v267-view="category"]');if(b){b.click();setTimeout(patchBhdCategory,80);setTimeout(patchBhdCategory,350)}else patchBhdCategory()}
  function activateBhd(){var mod=q('#bhdModule');if(!mod)return;qa('.module').forEach(function(m){m.classList.remove('active');m.style.display='none'});var home=q('#home');if(home)home.style.display='none';mod.classList.add('active');mod.style.display='block';mod.classList.add('bhd-v267-category-mode');ensureSubnav();setTimeout(function(){var cat=q('#bhdV267Subnav [data-bhd-v267-view="category"]');if(cat)cat.click();patchBhdCategory()},80);setTimeout(patchBhdCategory,500)}
  function ensureSubnav(){var mod=q('#bhdModule .module-box');if(!mod)return;var nav=q('#bhdV267Subnav',mod);if(!nav){nav=document.createElement('div');nav.id='bhdV267Subnav';nav.className='bhd-v267-subnav';nav.innerHTML='<button type="button" data-bhd-v267-view="category" class="active">Kategori Raporu</button>';var title=q('.module-title',mod);if(title&&title.nextSibling)mod.insertBefore(nav,title.nextSibling);else mod.insertBefore(nav,mod.firstChild)}var analysis=q('[data-bhd-v267-view="analysis"]',nav);if(analysis)analysis.remove();var cat=q('[data-bhd-v267-view="category"]',nav);if(cat){cat.textContent='Kategori Raporu';cat.classList.add('active')}if(!q('[data-bhd-v272-view="deleted"]',nav)){var d=document.createElement('button');d.type='button';d.setAttribute('data-bhd-v272-view','deleted');d.textContent='Silinen Banka Hareketleri';nav.appendChild(d)}}  function patchBhdCategory(){var mod=q('#bhdModule');if(!mod||!mod.classList.contains('active'))return;mod.classList.add('bhd-v267-category-mode');ensureSubnav();var page=q('#bhdCategoryReportPage');if(!page)return;insertManager(page);addDeleteButtons(page);var delBtn=q('#bhdV267Subnav [data-bhd-v272-view="deleted"]');if(delBtn)delBtn.classList.remove('active')}
  function insertManager(page){if(q('#bhdV272Manager',page))return;var c=cats(),s=subs(),first=c[0]||'';var html='<div id="bhdV272Manager" class="bhd-v272-manager"><div class="bhd-v272-card"><h4>Kategori Ekle / Duzenle</h4><div class="bhd-v272-row"><input id="bhdV272NewCat" placeholder="Yeni ana kategori"><button class="bhd-v272-btn" type="button" data-bhd-v272-add-cat>Ekle</button></div><div>'+c.map(function(x){return '<span class="bhd-v272-pill">'+esc(x)+' <button type="button" data-bhd-v272-del-cat="'+esc(x)+'">x</button></span>'}).join('')+'</div></div><div class="bhd-v272-card"><h4>Alt Kategori Ekle / Duzenle</h4><div class="bhd-v272-row"><select id="bhdV272SubParent">'+c.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('')+'</select><input id="bhdV272NewSub" placeholder="Yeni alt kategori"><button class="bhd-v272-btn" type="button" data-bhd-v272-add-sub>Alt Ekle</button></div><div id="bhdV272SubList">'+((s[first]||[]).map(function(x){return '<span class="bhd-v272-pill">'+esc(x)+' <button type="button" data-bhd-v272-del-sub="'+esc(first)+'||'+esc(x)+'">x</button></span>'}).join(''))+'</div></div></div>';var grid=q('.bhd-v267-grid',page),wrap=document.createElement('div');wrap.innerHTML=html;page.insertBefore(wrap.firstChild,grid||page.firstChild)}
  function redrawManager(){var m=q('#bhdV272Manager');if(m)m.remove();var page=q('#bhdCategoryReportPage');if(page)insertManager(page)}
  function addDeleteButtons(page){qa('#bhdCategoryReportPage .bhd-v267-line-table tbody tr').forEach(function(tr){if(q('[data-bhd-v272-del]',tr))return;var idEl=q('[data-bhd-v267-company], [data-bhd-v267-main], [data-bhd-v267-sub]',tr);if(!idEl)return;var td=document.createElement('td');td.innerHTML='<button class="bhd-v272-del" type="button" data-bhd-v272-del="'+esc(idEl.getAttribute('data-bhd-v267-company')||idEl.getAttribute('data-bhd-v267-main')||idEl.getAttribute('data-bhd-v267-sub'))+'">Sil</button>';tr.appendChild(td)});var head=q('#bhdCategoryReportPage .bhd-v267-line-table thead tr');if(head&&!q('[data-bhd-v272-head]',head)){var th=document.createElement('th');th.setAttribute('data-bhd-v272-head','1');th.textContent='Sil';head.appendChild(th)}}
  function deleteRow(id){var rs=rows(),idx=rs.findIndex(function(r){return idOf(r)===id});if(idx<0)return;var r=rs[idx],del=deleted();del.unshift({deletedAt:new Date().toISOString(),row:r});setDeleted(del);rs.splice(idx,1);setRows(rs);var cm=compMap(),ct=catMap();delete cm[id];delete ct[id];write(BHD_COMPANY,cm);write(BHD_CAT,ct);refreshExistingCategory()}
  function renderDeleted(){var mod=q('#bhdModule');if(!mod)return;mod.classList.add('bhd-v267-category-mode');ensureSubnav();qa('#bhdV267Subnav button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-bhd-v272-view')==='deleted')});var page=q('#bhdCategoryReportPage');if(!page)return;var del=deleted();page.innerHTML='<div class="v189-page-head"><h3>Silinen Banka Hareketleri</h3><span>Silinen hareketler işleme dahil edilmez. Gerekirse geri alabilirsin.</span></div><div class="bhd-v272-note">Toplam silinen hareket: <strong>'+del.length+'</strong></div><div class="bhd-v272-row"><button class="bhd-v272-del" type="button" data-bhd-v272-purge-selected>Seçili Olanları Sil</button><span class="bhd-v272-note" style="margin:0">Bu işlem seçili hareketleri silinenler hafızasından kalıcı kaldırır.</span></div><div class="bhd-v272-table-wrap"><table class="bhd-v272-table"><thead><tr><th><input type="checkbox" data-bhd-v272-select-all title="Tümünü seç"></th><th>Geri Al</th><th>Silinme Tarihi</th><th>Tarih</th><th>Kişi/Firma</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Açıklama</th><th>Kaynak</th></tr></thead><tbody>'+(del.length?del.map(function(x,i){var r=x.row||{};return '<tr><td><input type="checkbox" data-bhd-v272-purge-check="'+i+'"></td><td><button class="bhd-v272-restore" type="button" data-bhd-v272-restore="'+i+'">Geri Al</button></td><td>'+esc((x.deletedAt||'').slice(0,19).replace('T',' '))+'</td><td>'+esc(r.tarih||'')+'</td><td>'+esc(r.kisiFirma||'')+'</td><td class="amount">'+money(r.gelen)+'</td><td class="amount">'+money(r.giden)+'</td><td class="amount">'+money(r.net)+'</td><td>'+esc(r.aciklama||'')+'</td><td>'+esc(r.kaynak||'')+'</td></tr>'}).join(''):'<tr><td colspan="10">Silinen hareket yok.</td></tr>')+'</tbody></table></div>'}
  function restoreDeleted(i){var del=deleted(),item=del.splice(Number(i),1)[0];if(!item||!item.row)return;var rs=rows();rs.push(item.row);setRows(rs);setDeleted(del);renderDeleted()}
  function purgeSelectedDeleted(){var checks=qa('[data-bhd-v272-purge-check]:checked'),idxs=checks.map(function(c){return Number(c.getAttribute('data-bhd-v272-purge-check'))}).filter(function(n){return !isNaN(n)});if(!idxs.length){alert('Önce silinecek hareketleri seç.');return}if(!confirm(idxs.length+' seçili hareket silinenler hafızasından kalıcı silinsin mi?'))return;var mark={};idxs.forEach(function(i){mark[i]=1});setDeleted(deleted().filter(function(_,i){return !mark[i]}));renderDeleted()}
  var oldOpen=window.openModule;if(typeof oldOpen==='function'&&!oldOpen.__v272Bhd){window.openModule=function(id){var r=oldOpen.apply(this,arguments);if(id==='bhdModule')setTimeout(activateBhd,0);return r};window.openModule.__v272Bhd=true}
document.addEventListener('click',function(e){var card=e.target&&e.target.closest&&e.target.closest('.menu-card');if(card&&/bhdModule/.test(String(card.getAttribute('onclick')||''))){e.preventDefault();e.stopImmediatePropagation();activateBhd();return false}var d=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-view="deleted"]');if(d){e.preventDefault();e.stopImmediatePropagation();renderDeleted();return false}var purge=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-purge-selected]');if(purge){e.preventDefault();e.stopImmediatePropagation();purgeSelectedDeleted();return false}var del=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-del]');if(del){e.preventDefault();e.stopImmediatePropagation();deleteRow(del.getAttribute('data-bhd-v272-del'));return false}var res=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-restore]');if(res){e.preventDefault();restoreDeleted(res.getAttribute('data-bhd-v272-restore'));return false}var addCat=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-add-cat]');if(addCat){var inp=q('#bhdV272NewCat'),v=(inp&&inp.value||'').trim();if(v){var c=cats();if(c.indexOf(v)<0)c.push(v);saveCats(c);redrawManager();refreshExistingCategory()}return false}var delCat=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-del-cat]');if(delCat){var name=delCat.getAttribute('data-bhd-v272-del-cat'),c=cats().filter(function(x){return x!==name}),s=subs();delete s[name];saveCats(c.length?c:['Diger']);saveSubs(s);redrawManager();refreshExistingCategory();return false}var addSub=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-add-sub]');if(addSub){var parent=(q('#bhdV272SubParent')||{}).value,inp2=q('#bhdV272NewSub'),sv=(inp2&&inp2.value||'').trim();if(parent&&sv){var ss=subs();if(!ss[parent])ss[parent]=[];if(ss[parent].indexOf(sv)<0)ss[parent].push(sv);saveSubs(ss);redrawManager();refreshExistingCategory()}return false}var delSub=e.target&&e.target.closest&&e.target.closest('[data-bhd-v272-del-sub]');if(delSub){var p=delSub.getAttribute('data-bhd-v272-del-sub').split('||'),ss=subs();ss[p[0]]=(ss[p[0]]||[]).filter(function(x){return x!==p[1]});saveSubs(ss);redrawManager();refreshExistingCategory();return false}},true);
  document.addEventListener('change',function(e){var x=e.target;if(x&&x.id==='bhdV272SubParent')redrawManager();if(x&&x.hasAttribute&&x.hasAttribute('data-bhd-v272-select-all'))qa('[data-bhd-v272-purge-check]').forEach(function(c){c.checked=x.checked})},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(q('#bhdModule.active'))activateBhd();else ensureSubnav()},900)});setInterval(function(){if(q('#bhdModule.active')&&!q('#bhdV267Subnav [data-bhd-v276-view="memory"].active'))patchBhdCategory()},1500);
  window.v272ActivateBhd=activateBhd;window.v272RenderDeletedBhdRows=renderDeleted;
})();
