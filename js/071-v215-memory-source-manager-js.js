(function(){
  const STORE='invoiceYearlyAnalysisStoreV79';
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){try{return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+' TL';}catch(e){return String(v||0);}}
  function data(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){return {};}}
  function save(d){localStorage.setItem(STORE,JSON.stringify(Object.assign({},d,{savedAt:new Date().toISOString()})));}
  function arr(d,k){return Array.isArray(d[k])?d[k]:[];}
  function allGroups(){
    const d=data(), map={};
    [['purchase','Alış'],['sales','Satış'],['expense','Masraf'],['excluded','Hesap Dışı'],['returns','İade'],['tevkifat','Tevkifat'],['istisna','İstisna']].forEach(pair=>{
      arr(d,pair[0]).forEach(r=>{const src=r.kaynak||'Kaynak Yok';const key=pair[0]+'||'+src;if(!map[key])map[key]={store:pair[0],type:pair[1],source:src,count:0,total:0,months:new Set()};map[key].count++;map[key].total+=Number((r&&r.toplam)||(r&&r.kdvDahil)||(r&&r.matrah)||(r&&r.net)||0);if(r&&r.ay)map[key].months.add(r.ay);});
    });
    return Object.values(map).sort((a,b)=>String(a.source).localeCompare(String(b.source),'tr')||String(a.type).localeCompare(String(b.type),'tr'));
  }
  function syncGlobals(){try{if(typeof invoiceLoadYearlyMemory==='function')invoiceLoadYearlyMemory();}catch(e){} try{if(typeof renderInvoiceProfitResults==='function')renderInvoiceProfitResults();}catch(e){} try{if(typeof window.v189InvoiceSetPage==='function')window.v189InvoiceSetPage('analysis');}catch(e){} }
  function removeGroup(store,source){const d=data();d[store]=arr(d,store).filter(r=>(r&&r.kaynak||'Kaynak Yok')!==source);save(d);syncGlobals();setTimeout(renderPanel,250);}
  function removeSelected(){const checked=[...document.querySelectorAll('#v215MemoryPanel input[data-v215-key]:checked')];if(!checked.length){note('Silmek için en az bir dosya seç.');return;}const d=data();checked.forEach(c=>{const [store,source]=JSON.parse(c.getAttribute('data-v215-key'));d[store]=arr(d,store).filter(r=>(r&&r.kaynak||'Kaynak Yok')!==source);});save(d);syncGlobals();setTimeout(renderPanel,250);}
  function note(msg){const n=document.getElementById('v215MemoryNote');if(n)n.textContent=msg;}
  function ensurePanel(){
    const page=document.getElementById('v189PageAnalysis')||document.getElementById('invoiceAnalysisModule');if(!page)return null;
    let panel=document.getElementById('v215MemoryPanel');
    if(!panel){panel=document.createElement('div');panel.id='v215MemoryPanel';panel.innerHTML='<h4>Kalıcı Hafıza Yönetimi</h4><small>Hafızada kayıtlı Excel/dosya kaynaklarını tek tek silebilirsin. Sadece seçtiğin dosyanın kayıtları silinir.</small><div class="v215-memory-actions"><button class="secondary-button" type="button" id="v215RefreshMemory">Yenile</button><button class="v215-danger" type="button" id="v215DeleteSelected">Seçilenleri Sil</button></div><div id="v215MemoryBody"></div><div id="v215MemoryNote" class="v215-note"></div>';const status=document.getElementById('invoiceAnalysisStatus');if(status&&status.parentNode)status.parentNode.insertBefore(panel,status.nextSibling);else page.appendChild(panel);panel.querySelector('#v215RefreshMemory').addEventListener('click',renderPanel);panel.querySelector('#v215DeleteSelected').addEventListener('click',removeSelected);}return panel;
  }
  function renderPanel(){
    const panel=ensurePanel();if(!panel)return;const body=document.getElementById('v215MemoryBody');const groups=allGroups();
    if(!groups.length){body.innerHTML='<div class="v215-memory-empty">Kalıcı hafızada kayıtlı Excel/dosya yok.</div>';note('');return;}
    body.innerHTML='<div class="table-wrap"><table class="v215-memory-table"><thead><tr><th>Seç</th><th>Dosya / Kaynak</th><th>Tür</th><th>Dönem</th><th>Satır</th><th>Toplam</th><th>Sil</th></tr></thead><tbody>'+groups.map(g=>{const encoded=esc(JSON.stringify([g.store,g.source]));return '<tr><td><input class="v215-check" type="checkbox" data-v215-key="'+encoded+'"></td><td><strong>'+esc(g.source)+'</strong></td><td><span class="v215-pill">'+esc(g.type)+'</span></td><td>'+esc([...g.months].join(', ')||'-')+'</td><td class="amount"><strong>'+g.count+'</strong></td><td class="amount">'+fmt(g.total)+'</td><td><button class="v215-danger" type="button" data-v215-delete="'+encoded+'">Sil</button></td></tr>';}).join('')+'</tbody></table></div>';
    body.querySelectorAll('[data-v215-delete]').forEach(b=>b.addEventListener('click',function(){const x=JSON.parse(this.getAttribute('data-v215-delete'));removeGroup(x[0],x[1]);}));note(groups.length+' kayıtlı dosya/kaynak bulundu.');
  }
  const oldRender=window.renderInvoiceProfitResults;if(typeof oldRender==='function'&&!oldRender.__v215Memory){window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);setTimeout(renderPanel,300);return r;};window.renderInvoiceProfitResults.__v215Memory=true;}
  const oldSet=window.v189InvoiceSetPage;if(typeof oldSet==='function'&&!oldSet.__v215Memory){window.v189InvoiceSetPage=function(page){const r=oldSet.apply(this,arguments);if((page||'analysis')==='analysis')setTimeout(renderPanel,250);return r;};window.v189InvoiceSetPage.__v215Memory=true;}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(renderPanel,600);});setTimeout(renderPanel,1300);setTimeout(renderPanel,2600);
})();
