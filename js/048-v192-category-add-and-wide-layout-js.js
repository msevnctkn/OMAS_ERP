(function(){
  const CATALOG='invoiceCategoryCatalogV2';
  const DEFAULT={'Direkt Malzeme':['Motor','Motor Sürücü','Servo / PLC','Sensör','Elektrik Malzemesi','Mekanik Malzeme','Diğer Direkt Malzeme'],'Ambalaj':['Kutu','Etiket','Koli / Paket','Poşet / Sarf','Diğer Ambalaj'],'Üretim Gideri':['İşçilik','Bakım / Servis','Takım / Sarf','Enerji','Diğer Üretim'],'Lojistik':['Kargo','Nakliye','Gümrük','Diğer Lojistik'],'Genel Gider':['Kira','Ofis','Yazılım','Muhasebe','Banka / Finans','Diğer Genel'],'Satış Pazarlama':['Reklam','Pazaryeri','Komisyon','Diğer Pazarlama'],'Diğer':['Sınıflandırılmadı']};
  function loadCatalog(){try{const c=JSON.parse(localStorage.getItem(CATALOG)||'');return c&&typeof c==='object'?c:{...DEFAULT};}catch(e){return {...DEFAULT};}}
  function saveCatalog(c){localStorage.setItem(CATALOG,JSON.stringify(c||{}));}
  function flash(msg){
    let el=document.getElementById('v192CategoryFlash');
    const panel=document.getElementById('v191CategoryPanel');
    if(!el&&panel){el=document.createElement('div');el.id='v192CategoryFlash';el.style.cssText='border:1px solid #abefc6;background:#ecfdf3;color:#067647;border-radius:8px;padding:9px 11px;font-weight:800;font-size:13px;';panel.insertBefore(el,panel.firstChild);}
    if(el){el.textContent=msg;el.style.display='block';setTimeout(()=>{el.style.display='none';},1800);}
  }
  function rerender(){
    try{if(typeof window.renderInvoiceCategoryAnalysis==='function')window.renderInvoiceCategoryAnalysis();}catch(e){}
    try{if(typeof window.v189InvoiceSetPage==='function')window.v189InvoiceSetPage('category');}catch(e){}
    try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}
  }
  window.v192AddMainCategory=function(){
    const input=document.getElementById('v191NewMain');
    const name=String(input&&input.value||'').trim();
    if(!name){flash('Ana kategori adı yaz.');return;}
    const c=loadCatalog();
    if(!c[name])c[name]=['Sınıflandırılmadı'];
    saveCatalog(c);
    if(input)input.value='';
    rerender();
    flash('Ana kategori eklendi: '+name);
  };
  window.v192AddSubCategory=function(){
    const parent=document.getElementById('v191SubParent')?.value||Object.keys(loadCatalog())[0]||'Diğer';
    const input=document.getElementById('v191NewSub');
    const name=String(input&&input.value||'').trim();
    if(!name){flash('Alt kategori adı yaz.');return;}
    const c=loadCatalog();
    c[parent]=c[parent]||[];
    if(!c[parent].includes(name))c[parent].push(name);
    saveCatalog(c);
    if(input)input.value='';
    rerender();
    flash('Alt kategori eklendi: '+parent+' / '+name);
  };
  function bindCategoryButtons(){
    const main=document.querySelector('#v191CategoryPanel button[onclick="v191AddMainCategory()"]');
    const sub=document.querySelector('#v191CategoryPanel button[onclick="v191AddSubCategory()"]');
    if(main){main.onclick=function(e){e.preventDefault();window.v192AddMainCategory();};}
    if(sub){sub.onclick=function(e){e.preventDefault();window.v192AddSubCategory();};}
  }
  function widen(){
    const module=document.getElementById('invoiceAnalysisModule');
    if(module)module.classList.add('v192-wide-invoice-module');
    bindCategoryButtons();
  }
  document.addEventListener('click',function(e){
    const b=e.target&&e.target.closest&&e.target.closest('#v191CategoryPanel button');
    if(!b)return;
    const txt=(b.textContent||'').trim();
    if(txt==='Ana Kategori Ekle'){e.preventDefault();window.v192AddMainCategory();}
    if(txt==='Alt Kategori Ekle'){e.preventDefault();window.v192AddSubCategory();}
  },true);
  const oldLayout=window.v189InvoiceLayout;
  if(typeof oldLayout==='function'&&!oldLayout.__v192Wide){
    window.v189InvoiceLayout=function(){const r=oldLayout.apply(this,arguments);setTimeout(widen,0);return r;};
    window.v189InvoiceLayout.__v192Wide=true;
  }
  const oldSetPage=window.v189InvoiceSetPage;
  if(typeof oldSetPage==='function'&&!oldSetPage.__v192Wide){
    window.v189InvoiceSetPage=function(){const r=oldSetPage.apply(this,arguments);setTimeout(widen,0);setTimeout(bindCategoryButtons,120);return r;};
    window.v189InvoiceSetPage.__v192Wide=true;
  }
  document.addEventListener('DOMContentLoaded',widen);
  setTimeout(widen,100);setTimeout(widen,800);setTimeout(widen,1800);
})();
