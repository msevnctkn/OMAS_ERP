(function(){
  const CATALOG='invoiceCategoryCatalogV2';
  const DEFAULT={
    'Direkt Malzeme':['Motor','Motor Sürücü','Servo / PLC','Sensör','Elektrik Malzemesi','Mekanik Malzeme','Diğer Direkt Malzeme'],
    'Ambalaj':['Kutu','Etiket','Koli / Paket','Poşet / Sarf','Diğer Ambalaj'],
    'Üretim Gideri':['İşçilik','Bakım / Servis','Takım / Sarf','Enerji','Diğer Üretim'],
    'Lojistik':['Kargo','Nakliye','Gümrük','Diğer Lojistik'],
    'Genel Gider':['Kira','Ofis','Yazılım','Muhasebe','Banka / Finans','Diğer Genel'],
    'Satış Pazarlama':['Reklam','Pazaryeri','Komisyon','Diğer Pazarlama'],
    'Diğer':['Sınıflandırılmadı']
  };
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function load(){try{const c=JSON.parse(localStorage.getItem(CATALOG)||'');return c&&typeof c==='object'?c:{...DEFAULT};}catch(e){return {...DEFAULT};}}
  function save(c){localStorage.setItem(CATALOG,JSON.stringify(c||{}));}
  function msg(text,type){const el=document.getElementById('v194CategoryMsg');if(!el)return;el.textContent=text;el.className=type==='warn'?'warn':'ok';setTimeout(()=>{el.style.display='none';el.className='';},2200);}
  function renderList(){
    const c=load();
    const parent=document.getElementById('v194SubParent');
    const selected=parent&&parent.value;
    if(parent){parent.innerHTML=Object.keys(c).map(k=>`<option value="${esc(k)}"${k===selected?' selected':''}>${esc(k)}</option>`).join('');}
    const list=document.getElementById('v194CategoryList');
    if(list)list.innerHTML=Object.keys(c).map(k=>`<span class="v194-pill">${esc(k)}: ${esc((c[k]||[]).join(', '))}</span>`).join('');
  }
  function ensure(){
    const content=document.getElementById('v189CategoryContent');
    if(!content)return;
    let box=document.getElementById('v194SolidCategoryManager');
    if(!box){
      box=document.createElement('div');
      box.id='v194SolidCategoryManager';
      box.innerHTML=`<h4>Kategori Ekle</h4>
        <div class="v194-row">
          <div class="v194-field"><label>Yeni ana kategori</label><input id="v194MainInput" type="text" placeholder="Örn: Hammadde, Reklam, Lojistik"></div>
          <div class="v194-field"><label>Alt kategori için ana kategori</label><select id="v194SubParent"></select></div>
          <button id="v194MainAddBtn" class="primary-button" type="button">Ana Kategori Kaydet</button>
        </div>
        <div class="v194-row two">
          <div class="v194-field"><label>Yeni alt kategori</label><input id="v194SubInput" type="text" placeholder="Örn: Motor, Kargo, Trendyol"></div>
          <button id="v194SubAddBtn" class="primary-button" type="button">Alt Kategori Kaydet</button>
        </div>
        <div id="v194CategoryMsg"></div>
        <div id="v194CategoryList"></div>`;
      content.insertBefore(box,content.firstChild);
      box.addEventListener('click',function(e){
        const mainBtn=e.target.closest('#v194MainAddBtn');
        const subBtn=e.target.closest('#v194SubAddBtn');
        if(mainBtn){e.preventDefault();addMain();}
        if(subBtn){e.preventDefault();addSub();}
      });
    }
    renderList();
  }
  function afterSave(){
    renderList();
    try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}
    try{if(typeof window.renderInvoiceCategoryAnalysis==='function' && !window.__v194Rendering){window.__v194Rendering=true;window.renderInvoiceCategoryAnalysis();window.__v194Rendering=false;}}catch(e){window.__v194Rendering=false;}
    ensure();
  }
  function addMain(){
    const input=document.getElementById('v194MainInput');
    const name=String(input&&input.value||'').trim();
    if(!name){msg('Ana kategori adı yaz.', 'warn');return;}
    const c=load();
    if(!c[name])c[name]=['Sınıflandırılmadı'];
    save(c);
    if(input)input.value='';
    msg('Ana kategori eklendi: '+name,'ok');
    afterSave();
  }
  function addSub(){
    const parent=document.getElementById('v194SubParent')?.value||Object.keys(load())[0]||'Diğer';
    const input=document.getElementById('v194SubInput');
    const name=String(input&&input.value||'').trim();
    if(!name){msg('Alt kategori adı yaz.', 'warn');return;}
    const c=load();
    c[parent]=c[parent]||[];
    if(!c[parent].includes(name))c[parent].push(name);
    save(c);
    if(input)input.value='';
    msg('Alt kategori eklendi: '+parent+' / '+name,'ok');
    afterSave();
  }
  const oldSet=window.v189InvoiceSetPage;
  if(typeof oldSet==='function'&&!oldSet.__v194SolidCategory){
    window.v189InvoiceSetPage=function(page){const r=oldSet.apply(this,arguments);if(page==='category')setTimeout(ensure,0);return r;};
    window.v189InvoiceSetPage.__v194SolidCategory=true;
  }
  const oldRender=window.renderInvoiceCategoryAnalysis;
  if(typeof oldRender==='function'&&!oldRender.__v194SolidCategory){
    window.renderInvoiceCategoryAnalysis=function(){const r=oldRender.apply(this,arguments);setTimeout(ensure,0);return r;};
    window.renderInvoiceCategoryAnalysis.__v194SolidCategory=true;
  }
  document.addEventListener('DOMContentLoaded',ensure);
  setTimeout(ensure,100);setTimeout(ensure,800);setTimeout(ensure,1800);
})();
