(function(){
  const CATALOG='invoiceCategoryCatalogV2';
  const DEFAULT={'Direkt Malzeme':['Motor','Motor Sürücü','Servo / PLC','Sensör','Elektrik Malzemesi','Mekanik Malzeme','Diğer Direkt Malzeme'],'Ambalaj':['Kutu','Etiket','Koli / Paket','Poşet / Sarf','Diğer Ambalaj'],'Üretim Gideri':['İşçilik','Bakım / Servis','Takım / Sarf','Enerji','Diğer Üretim'],'Lojistik':['Kargo','Nakliye','Gümrük','Diğer Lojistik'],'Genel Gider':['Kira','Ofis','Yazılım','Muhasebe','Banka / Finans','Diğer Genel'],'Satış Pazarlama':['Reklam','Pazaryeri','Komisyon','Diğer Pazarlama'],'Diğer':['Sınıflandırılmadı']};
  const esc=v=>(typeof escapeHtml==='function')?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clean=v=>String(v||'').trim();
  function loadCatalog(){let raw=null;try{raw=JSON.parse(localStorage.getItem(CATALOG)||'null');}catch(e){}const src=(raw&&typeof raw==='object')?raw:DEFAULT,out={};Object.keys(src).forEach(k=>{k=clean(k);if(!k)return;out[k]=Array.isArray(src[k])?src[k].map(clean).filter(Boolean):[];if(!out[k].length)out[k]=['Sınıflandırılmadı'];});if(!Object.keys(out).length)out['Diğer']=['Sınıflandırılmadı'];return out;}
  function saveCatalog(c){try{localStorage.setItem(CATALOG,JSON.stringify(c||{}));}catch(e){}}
  const firstMain=c=>Object.keys(c)[0]||'Diğer';
  function ensureManagerShell(){
    const results=document.getElementById('invoiceAnalysisResults');
    if(!results) return null;
    let toolbar=document.getElementById('invoiceCategoryToolbar');
    if(!toolbar){
      toolbar=document.createElement('div');
      toolbar.id='invoiceCategoryToolbar';
      toolbar.className='invoice-company-toolbar';
      toolbar.innerHTML='<div><strong>Fatura Kategorileri</strong><br><small>Firma seçiminin sağındaki ana kategori / alt kategori seçimleri harcama kalemlerini raporlar.</small></div><button class="primary-button" type="button" onclick="saveInvoiceCategorySelections()">Kategori Seçimlerini Kaydet</button><button class="secondary-button" type="button" onclick="renderInvoiceCategoryAnalysis()">Kategori Raporu</button>';
      results.insertBefore(toolbar,results.firstChild);
    }
    if(!document.getElementById('invoiceCategoryManageBtnV182')){
      const btn=document.createElement('button');
      btn.id='invoiceCategoryManageBtnV182';
      btn.className='secondary-button';
      btn.type='button';
      btn.textContent='Kategori Yönet';
      btn.addEventListener('click',function(e){e.preventDefault();window.toggleInvoiceCategoryManager();});
      toolbar.appendChild(btn);
    }
    let box=document.getElementById('invoiceCategoryManager');
    if(!box){
      box=document.createElement('div');
      box.id='invoiceCategoryManager';
      box.className='invoice-category-manager';
      toolbar.parentNode.insertBefore(box,toolbar.nextSibling);
    }
    return box;
  }
  window.renderInvoiceCategoryManager=function(){
    const box=ensureManagerShell();
    if(!box) return;
    const catalog=loadCatalog();
    const old=document.getElementById('invoiceManageMainCategory')?.value;
    const main=(old&&catalog[old])?old:firstMain(catalog);
    box.innerHTML='<div class="invoice-category-manager-grid"><div><h4>Ana Kategoriler</h4><div class="invoice-category-manager-row"><input id="invoiceNewMainCategory" placeholder="Yeni ana kategori"><button class="ok-button" type="button" onclick="addInvoiceMainCategory()">Ekle</button></div><label>Seçili ana kategori</label><select id="invoiceManageMainCategory" onchange="renderInvoiceCategoryManager()">'+Object.keys(catalog).map(k=>'<option value="'+esc(k)+'"'+(k===main?' selected':'')+'>'+esc(k)+'</option>').join('')+'</select><div class="invoice-category-manager-actions"><button class="secondary-button" type="button" onclick="deleteInvoiceMainCategory()">Seçili Ana Kategoriyi Sil</button></div></div><div><h4>Alt Kategoriler</h4><div class="invoice-category-manager-row"><input id="invoiceNewSubCategory" placeholder="'+esc(main)+' için yeni alt kategori"><button class="ok-button" type="button" onclick="addInvoiceSubCategory()">Ekle</button></div><div class="invoice-category-manager-list">'+(catalog[main]||[]).map(s=>'<span class="invoice-category-pill">'+esc(s)+' <button type="button" onclick="deleteInvoiceSubCategory(\''+encodeURIComponent(main)+'\',\''+encodeURIComponent(s)+'\')">×</button></span>').join('')+'</div></div></div>';
  };
  window.toggleInvoiceCategoryManager=function(){
    const box=ensureManagerShell();
    if(!box) return;
    window.renderInvoiceCategoryManager();
    box.classList.toggle('open');
  };
  window.addInvoiceMainCategory=function(){
    const name=clean(document.getElementById('invoiceNewMainCategory')?.value);
    if(!name) return;
    const c=loadCatalog();
    if(!c[name]) c[name]=['Sınıflandırılmadı'];
    saveCatalog(c);
    window.renderInvoiceCategoryManager();
  };
  window.deleteInvoiceMainCategory=function(){
    const main=document.getElementById('invoiceManageMainCategory')?.value;
    const c=loadCatalog();
    if(!main||Object.keys(c).length<=1){alert('En az bir ana kategori kalmalı.');return;}
    delete c[main];
    saveCatalog(c);
    window.renderInvoiceCategoryManager();
    if(typeof renderInvoiceDetailSections==='function') renderInvoiceDetailSections();
  };
  window.addInvoiceSubCategory=function(){
    const main=document.getElementById('invoiceManageMainCategory')?.value;
    const sub=clean(document.getElementById('invoiceNewSubCategory')?.value);
    if(!main||!sub) return;
    const c=loadCatalog();
    c[main]=c[main]||[];
    if(!c[main].includes(sub)) c[main].push(sub);
    saveCatalog(c);
    window.renderInvoiceCategoryManager();
    if(typeof renderInvoiceDetailSections==='function') renderInvoiceDetailSections();
  };
  window.deleteInvoiceSubCategory=function(main,sub){
    main=decodeURIComponent(main);sub=decodeURIComponent(sub);
    const c=loadCatalog();
    if(!c[main]) return;
    if(c[main].length<=1){alert('Ana kategoride en az bir alt kategori kalmalı.');return;}
    c[main]=c[main].filter(x=>x!==sub);
    saveCatalog(c);
    window.renderInvoiceCategoryManager();
    if(typeof renderInvoiceDetailSections==='function') renderInvoiceDetailSections();
  };
  document.addEventListener('DOMContentLoaded',ensureManagerShell);
  setTimeout(ensureManagerShell,300);
  setTimeout(ensureManagerShell,1200);
})();
