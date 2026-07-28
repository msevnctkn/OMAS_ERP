(function(){
  const STORE='invoiceYearlyAnalysisStoreV79';
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){try{return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+' TL';}catch(e){return String(v||0);}}
  function data(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){return {};}}
  function save(d){localStorage.setItem(STORE,JSON.stringify(Object.assign({},d,{savedAt:new Date().toISOString()})));}
  function arr(d,k){return Array.isArray(d[k])?d[k]:[];}
  function groups(){const d=data(),map={};[['purchase','Alış'],['sales','Satış'],['expense','Masraf'],['excluded','Hesap Dışı'],['returns','İade'],['tevkifat','Tevkifat'],['istisna','İstisna']].forEach(p=>{arr(d,p[0]).forEach(r=>{const src=(r&&r.kaynak)||'Kaynak Yok',key=p[0]+'||'+src;if(!map[key])map[key]={store:p[0],type:p[1],source:src,count:0,total:0,months:new Set()};map[key].count++;map[key].total+=Number((r&&r.toplam)||(r&&r.kdvDahil)||(r&&r.matrah)||(r&&r.net)||0);if(r&&r.ay)map[key].months.add(r.ay);});});return Object.values(map).sort((a,b)=>String(a.source).localeCompare(String(b.source),'tr')||String(a.type).localeCompare(String(b.type),'tr'));}
  function sync(){try{if(typeof invoiceLoadYearlyMemory==='function')invoiceLoadYearlyMemory();}catch(e){}try{if(typeof renderInvoiceProfitResults==='function')renderInvoiceProfitResults();}catch(e){}setTimeout(renderMemory,250);}
  function removeOne(store,source){const d=data();d[store]=arr(d,store).filter(r=>((r&&r.kaynak)||'Kaynak Yok')!==source);save(d);sync();}
  function removeSelected(){const checked=[...document.querySelectorAll('#v215MemoryPanel input[data-v215-key]:checked')];const note=document.getElementById('v215MemoryNote');if(!checked.length){if(note)note.textContent='Silmek için en az bir dosya seç.';return;}const d=data();checked.forEach(c=>{const x=JSON.parse(c.getAttribute('data-v215-key'));d[x[0]]=arr(d,x[0]).filter(r=>((r&&r.kaynak)||'Kaynak Yok')!==x[1]);});save(d);sync();}
  function ensureShell(){
    let side=document.getElementById('v189InvoiceSide'),main=document.getElementById('v189InvoiceMain');
    if((!side||!main)&&typeof window.v189InvoiceLayout==='function'){try{window.v189InvoiceLayout();}catch(e){}}
    side=document.getElementById('v189InvoiceSide');main=document.getElementById('v189InvoiceMain');if(!side||!main)return false;
    let company=side.querySelector('[data-v189-page="company"]');
    if(!company){company=document.createElement('button');company.type='button';company.setAttribute('data-v189-page','company');company.textContent='Firma Bazlı Analiz';const cat=side.querySelector('[data-v189-page="category"]');if(cat&&cat.parentNode)cat.parentNode.insertBefore(company,cat.nextSibling);else side.appendChild(company);}
    let memBtn=side.querySelector('[data-v189-page="memory"]');
    if(!memBtn){memBtn=document.createElement('button');memBtn.type='button';memBtn.setAttribute('data-v189-page','memory');memBtn.textContent='Kalıcı Hafıza Yönetimi';company.parentNode.insertBefore(memBtn,company.nextSibling);}else{memBtn.textContent='Kalıcı Hafıza Yönetimi';}
    let page=document.getElementById('v189PageMemory');
    if(!page){page=document.createElement('section');page.id='v189PageMemory';page.className='v189-page';page.innerHTML='<div class="v189-page-head"><h3>Kalıcı Hafıza Yönetimi</h3><span>Hafızadaki Excel kaynaklarını tek tek sil</span></div><div id="v217MemoryHost"></div>';const companyPage=document.getElementById('v189PageCompany');if(companyPage&&companyPage.parentNode)companyPage.parentNode.insertBefore(page,companyPage.nextSibling);else main.appendChild(page);}else if(!document.getElementById('v217MemoryHost'))page.insertAdjacentHTML('beforeend','<div id="v217MemoryHost"></div>');
    return true;
  }
  function renderMemory(){
    if(!ensureShell())return;const host=document.getElementById('v217MemoryHost');if(!host)return;
    let panel=document.getElementById('v215MemoryPanel');
    if(!panel){panel=document.createElement('div');panel.id='v215MemoryPanel';panel.innerHTML='<h4>Kalıcı Hafıza Yönetimi</h4><small>Hafızada kayıtlı Excel/dosya kaynaklarını tek tek silebilirsin. Sadece seçtiğin dosyanın kayıtları silinir.</small><div class="v215-memory-actions"><button class="secondary-button" type="button" id="v215RefreshMemory">Yenile</button><button class="v215-danger" type="button" id="v215DeleteSelected">Seçilenleri Sil</button></div><div id="v215MemoryBody"></div><div id="v215MemoryNote" class="v215-note"></div>';}
    if(!host.contains(panel))host.appendChild(panel);
    const refresh=panel.querySelector('#v215RefreshMemory'), del=panel.querySelector('#v215DeleteSelected');if(refresh&&!refresh.__v217){refresh.__v217=true;refresh.addEventListener('click',renderMemory);}if(del&&!del.__v217){del.__v217=true;del.addEventListener('click',removeSelected);}
    const body=document.getElementById('v215MemoryBody'), note=document.getElementById('v215MemoryNote'), gs=groups();
    if(!gs.length){body.innerHTML='<div class="v215-memory-empty">Kalıcı hafızada kayıtlı Excel/dosya yok.</div>';if(note)note.textContent='';return;}
    body.innerHTML='<div class="table-wrap"><table class="v215-memory-table"><thead><tr><th>Seç</th><th>Dosya / Kaynak</th><th>Tür</th><th>Dönem</th><th>Satır</th><th>Toplam</th><th>Sil</th></tr></thead><tbody>'+gs.map(g=>{const enc=esc(JSON.stringify([g.store,g.source]));return '<tr><td><input class="v215-check" type="checkbox" data-v215-key="'+enc+'"></td><td><strong>'+esc(g.source)+'</strong></td><td><span class="v215-pill">'+esc(g.type)+'</span></td><td>'+esc([...g.months].join(', ')||'-')+'</td><td class="amount"><strong>'+g.count+'</strong></td><td class="amount">'+fmt(g.total)+'</td><td><button class="v215-danger" type="button" data-v215-delete="'+enc+'">Sil</button></td></tr>';}).join('')+'</tbody></table></div>';
    body.querySelectorAll('[data-v215-delete]').forEach(b=>{if(!b.__v217){b.__v217=true;b.addEventListener('click',function(){const x=JSON.parse(this.getAttribute('data-v215-delete'));removeOne(x[0],x[1]);});}});
    if(note)note.textContent=gs.length+' kayıtlı dosya/kaynak bulundu.';
  }
  function activate(page){ensureShell();document.querySelectorAll('#v189InvoiceSide [data-v189-page]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-v189-page')===page));document.querySelectorAll('#v189InvoiceMain .v189-page').forEach(p=>p.classList.toggle('active',p.id==='v189Page'+page.charAt(0).toUpperCase()+page.slice(1)));if(page==='memory')renderMemory();if(page==='project'&&typeof window.v247RenderProjects==='function')window.v247RenderProjects();}
  const prev=window.v189InvoiceSetPage;window.v189InvoiceSetPage=function(page){if(page==='memory'){activate('memory');setTimeout(renderMemory,80);return;}const r=typeof prev==='function'?prev.apply(this,arguments):undefined;setTimeout(()=>{ensureShell();if((page||'analysis')==='memory')renderMemory();},120);return r;};
  document.addEventListener('click',function(e){const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="memory"]');if(nav){e.preventDefault();e.stopImmediatePropagation();activate('memory');}},true);
  const oldRender=window.renderInvoiceProfitResults;if(typeof oldRender==='function'&&!oldRender.__v217MemoryPage){window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);setTimeout(renderMemory,450);return r;};window.renderInvoiceProfitResults.__v217MemoryPage=true;}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(()=>{ensureShell();renderMemory();},700);});setTimeout(()=>{ensureShell();renderMemory();},1600);setTimeout(()=>{ensureShell();renderMemory();},3000);
})();
