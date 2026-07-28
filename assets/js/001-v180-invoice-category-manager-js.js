(function(){
  const ASSIGN_STORE='invoiceCategoryAssignmentsV1';
  const TARGET_STORE='invoiceCategoryTargetsV1';
  const CATALOG_STORE='invoiceCategoryCatalogV2';
  const DEFAULT_CATS={
    'Direkt Malzeme':['Motor','Motor Sürücü','Servo / PLC','Sensör','Elektrik Malzemesi','Mekanik Malzeme','Diğer Direkt Malzeme'],
    'Ambalaj':['Kutu','Etiket','Koli / Paket','Poşet / Sarf','Diğer Ambalaj'],
    'Üretim Gideri':['İşçilik','Bakım / Servis','Takım / Sarf','Enerji','Diğer Üretim'],
    'Lojistik':['Kargo','Nakliye','Gümrük','Diğer Lojistik'],
    'Genel Gider':['Kira','Ofis','Yazılım','Muhasebe','Banka / Finans','Diğer Genel'],
    'Satış Pazarlama':['Reklam','Pazaryeri','Komisyon','Diğer Pazarlama'],
    'Diğer':['Sınıflandırılmadı']
  };
  function esc(v){return (typeof escapeHtml==='function')?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):Number(v||0).toLocaleString('tr-TR',{style:'currency',currency:'TRY'});}
  function norm(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function load(name){try{return JSON.parse(localStorage.getItem(name)||'{}')||{};}catch(e){return {};}}
  function save(name,data){try{localStorage.setItem(name,JSON.stringify(data||{}));}catch(e){}}
  function rowKey(r){return (typeof invoiceRowCompanyKey==='function')?invoiceRowCompanyKey(r):[r&&r.tur||'',r&&r.kaynak||'',r&&r.faturaNo||'',r&&r.firma||'',r&&r.tarih||'',Number(r&&r.toplam||0).toFixed(2)].join('|');}
  function cssKey(v){return (window.CSS&&CSS.escape)?CSS.escape(v):String(v).replace(/"/g,'\\"');}
  function cleanName(v){return String(v||'').trim();}
  function loadCatalog(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem(CATALOG_STORE)||'null');}catch(e){saved=null;}
    const source=(saved&&typeof saved==='object')?saved:DEFAULT_CATS;
    const out={};
    Object.keys(source||{}).forEach(k=>{
      const name=cleanName(k);
      if(!name) return;
      out[name]=Array.isArray(source[k])?source[k].map(cleanName).filter(Boolean):[];
      if(!out[name].length) out[name]=['Sınıflandırılmadı'];
    });
    if(!Object.keys(out).length) out['Diğer']=['Sınıflandırılmadı'];
    return out;
  }
  function saveCatalog(catalog){save(CATALOG_STORE,catalog);}
  function firstMain(catalog){return Object.keys(catalog)[0]||'Diğer';}
  function firstSub(catalog,main){return ((catalog[main]||[])[0])||'Sınıflandırılmadı';}
  function guess(r){
    const t=norm([r&&r.firma,r&&r.aciklama,r&&r.faturaNo,r&&r.kaynak].join(' '));
    if(/LENZE|SURUCU|INVERTER|SERVO/.test(t)) return ['Direkt Malzeme','Motor Sürücü'];
    if(/MOTOR|REDUKTOR|POMPA/.test(t)) return ['Direkt Malzeme','Motor'];
    if(/PLC|SENSOR|ENCODER/.test(t)) return ['Direkt Malzeme',/PLC/.test(t)?'Servo / PLC':'Sensör'];
    if(/KABLO|PANO|SALTER|KONTAKTOR|ROLE|ELEKTRIK/.test(t)) return ['Direkt Malzeme','Elektrik Malzemesi'];
    if(/AMBALAJ|KUTU|KOLI|ETIKET|PAKET|POSET/.test(t)) return ['Ambalaj',/ETIKET/.test(t)?'Etiket':(/KUTU/.test(t)?'Kutu':'Koli / Paket')];
    if(/KARGO|NAKLIYE|LOJISTIK|GUMRUK/.test(t)) return ['Lojistik',/KARGO/.test(t)?'Kargo':(/GUMRUK/.test(t)?'Gümrük':'Nakliye')];
    if(/SERVIS|BAKIM|MONTAJ|TAMIR/.test(t)) return ['Üretim Gideri','Bakım / Servis'];
    if(/KIRA|OFIS|YAZILIM|MUHASEBE|BANKA/.test(t)) return ['Genel Gider',/YAZILIM/.test(t)?'Yazılım':(/BANKA/.test(t)?'Banka / Finans':'Ofis')];
    if(/REKLAM|PAZARYERI|KOMISYON|TRENDYOL|HEPSIBURADA/.test(t)) return ['Satış Pazarlama',/KOMISYON|TRENDYOL|HEPSIBURADA/.test(t)?'Komisyon':'Reklam'];
    return ['Diğer','Sınıflandırılmadı'];
  }
  function assignment(r){
    const catalog=loadCatalog();
    const saved=load(ASSIGN_STORE)[rowKey(r)];
    if(saved&&saved.main&&catalog[saved.main]){
      const sub=(catalog[saved.main]||[]).includes(saved.sub)?saved.sub:firstSub(catalog,saved.main);
      return {main:saved.main,sub};
    }
    const g=guess(r);
    const main=catalog[g[0]]?g[0]:firstMain(catalog);
    const sub=(catalog[main]||[]).includes(g[1])?g[1]:firstSub(catalog,main);
    return {main,sub,auto:true};
  }
  function mainOptions(selected){const c=loadCatalog();return Object.keys(c).map(k=>`<option value="${esc(k)}"${k===selected?' selected':''}>${esc(k)}</option>`).join('');}
  function subOptions(main,selected){const c=loadCatalog();return (c[main]||c[firstMain(c)]||['Sınıflandırılmadı']).map(k=>`<option value="${esc(k)}"${k===selected?' selected':''}>${esc(k)}</option>`).join('');}
  function firmOptions(selected){return '<option value="">Firma Seç</option>'+['ÖMAS OTOMASYON','ÖMAS KONSEPT','ORTAK'].map(c=>`<option value="${esc(c)}"${c===selected?' selected':''}>${esc(c)}</option>`).join('');}
  function applyRows(){
    const data=load(ASSIGN_STORE);
    [...(window.invoicePurchaseRows||[]),...(window.invoiceExpenseRows||[])].forEach(r=>{const a=data[rowKey(r)]||assignment(r);r.harcamaAnaKategori=a.main;r.harcamaAltKategori=a.sub;});
  }
  function rerenderAfterCatalogChange(){
    applyRows();
    if(typeof renderInvoiceDetailSections==='function') renderInvoiceDetailSections();
    renderInvoiceCategoryManager();
    if(document.getElementById('invoiceCategoryAnalysisPanel')?.style.display!=='none') renderInvoiceCategoryAnalysis();
  }
  window.updateInvoiceSubcategorySelect=function(ref){
    const key=(ref&&ref.getAttribute)?ref.getAttribute('data-invoice-key'):ref;
    const main=document.querySelector(`.invoice-category-main[data-invoice-key="${cssKey(key)}"]`);
    const sub=document.querySelector(`.invoice-category-sub[data-invoice-key="${cssKey(key)}"]`);
    if(main&&sub) sub.innerHTML=subOptions(main.value,'');
  };
  window.saveInvoiceCategorySelections=function(silent){
    const data=load(ASSIGN_STORE);
    document.querySelectorAll('.invoice-category-main[data-invoice-key]').forEach(main=>{
      const key=main.getAttribute('data-invoice-key');
      const sub=document.querySelector(`.invoice-category-sub[data-invoice-key="${cssKey(key)}"]`);
      data[key]={main:main.value||'Diğer',sub:(sub&&sub.value)||'Sınıflandırılmadı'};
    });
    save(ASSIGN_STORE,data);
    applyRows();
    if(typeof invoiceSaveYearlyMemory==='function') invoiceSaveYearlyMemory();
    const st=document.getElementById('invoiceAnalysisStatus');
    if(st&&!silent) st.innerHTML='Kategori seçimleri kaydedildi. <strong>Kategori Raporu</strong> ile gerçek harcama yüzdelerini görebilirsin.';
    if(!silent) renderInvoiceCategoryAnalysis();
  };
  window.toggleInvoiceCategoryManager=function(){
    ensureCategoryPanel();
    const box=document.getElementById('invoiceCategoryManager');
    if(box) box.classList.toggle('open');
    renderInvoiceCategoryManager();
  };
  window.addInvoiceMainCategory=function(){
    const input=document.getElementById('invoiceNewMainCategory');
    const name=cleanName(input&&input.value);
    if(!name) return;
    const catalog=loadCatalog();
    if(!catalog[name]) catalog[name]=['Sınıflandırılmadı'];
    saveCatalog(catalog);
    if(input) input.value='';
    const sel=document.getElementById('invoiceManageMainCategory');
    if(sel) sel.value=name;
    rerenderAfterCatalogChange();
  };
  window.deleteInvoiceMainCategory=function(){
    const sel=document.getElementById('invoiceManageMainCategory');
    const main=sel&&sel.value;
    const catalog=loadCatalog();
    if(!main||Object.keys(catalog).length<=1){alert('En az bir ana kategori kalmalı.');return;}
    delete catalog[main];
    if(!catalog['Diğer']) catalog['Diğer']=['Sınıflandırılmadı'];
    const fallback=catalog['Diğer']?'Diğer':firstMain(catalog);
    const data=load(ASSIGN_STORE);
    Object.keys(data).forEach(k=>{if(data[k]&&data[k].main===main)data[k]={main:fallback,sub:firstSub(catalog,fallback)};});
    const targets=load(TARGET_STORE); delete targets[main];
    saveCatalog(catalog); save(ASSIGN_STORE,data); save(TARGET_STORE,targets);
    rerenderAfterCatalogChange();
  };
  window.addInvoiceSubCategory=function(){
    const sel=document.getElementById('invoiceManageMainCategory');
    const input=document.getElementById('invoiceNewSubCategory');
    const main=sel&&sel.value, sub=cleanName(input&&input.value);
    if(!main||!sub) return;
    const catalog=loadCatalog();
    catalog[main]=catalog[main]||[];
    if(!catalog[main].includes(sub)) catalog[main].push(sub);
    saveCatalog(catalog);
    if(input) input.value='';
    rerenderAfterCatalogChange();
  };
  window.deleteInvoiceSubCategory=function(main,sub){
    main=decodeURIComponent(main); sub=decodeURIComponent(sub);
    const catalog=loadCatalog();
    if(!catalog[main]) return;
    if(catalog[main].length<=1){alert('Ana kategoride en az bir alt kategori kalmalı.');return;}
    catalog[main]=catalog[main].filter(x=>x!==sub);
    const fallback=firstSub(catalog,main);
    const data=load(ASSIGN_STORE);
    Object.keys(data).forEach(k=>{if(data[k]&&data[k].main===main&&data[k].sub===sub)data[k].sub=fallback;});
    saveCatalog(catalog); save(ASSIGN_STORE,data);
    rerenderAfterCatalogChange();
  };
  window.saveInvoiceCategoryTarget=function(main,val){const t=load(TARGET_STORE);t[main]=Number(String(val||'').replace(',','.'))||0;save(TARGET_STORE,t);renderInvoiceCategoryAnalysis();};
  window.renderInvoiceCategoryManager=function(){
    ensureCategoryPanel();
    const box=document.getElementById('invoiceCategoryManager');
    if(!box) return;
    const catalog=loadCatalog();
    const selected=document.getElementById('invoiceManageMainCategory')?.value;
    const main=(selected&&catalog[selected])?selected:firstMain(catalog);
    box.innerHTML=`<div class="invoice-category-manager-grid">
      <div><h4>Ana Kategoriler</h4><div class="invoice-category-manager-row"><input id="invoiceNewMainCategory" placeholder="Yeni ana kategori"><button class="ok-button" type="button" onclick="addInvoiceMainCategory()">Ekle</button></div><label>Seçili ana kategori</label><select id="invoiceManageMainCategory" onchange="renderInvoiceCategoryManager()">${Object.keys(catalog).map(k=>`<option value="${esc(k)}"${k===main?' selected':''}>${esc(k)}</option>`).join('')}</select><div class="invoice-category-manager-actions"><button class="secondary-button" type="button" onclick="deleteInvoiceMainCategory()">Seçili Ana Kategoriyi Sil</button></div></div>
      <div><h4>Alt Kategoriler</h4><div class="invoice-category-manager-row"><input id="invoiceNewSubCategory" placeholder="${esc(main)} için yeni alt kategori"><button class="ok-button" type="button" onclick="addInvoiceSubCategory()">Ekle</button></div><div class="invoice-category-manager-list">${(catalog[main]||[]).map(s=>`<span class="invoice-category-pill">${esc(s)} <button type="button" onclick="deleteInvoiceSubCategory('${encodeURIComponent(main)}','${encodeURIComponent(s)}')">×</button></span>`).join('')}</div></div>
    </div>`;
  };
  function categoryCell(r){const key=rowKey(r),a=assignment(r);return `<div class="invoice-category-selects"><select class="invoice-category-main" data-invoice-key="${esc(key)}" onchange="updateInvoiceSubcategorySelect(this)">${mainOptions(a.main)}</select><select class="invoice-category-sub" data-invoice-key="${esc(key)}">${subOptions(a.main,a.sub)}</select></div>`;}
  window.renderInvoiceDetailTable=function(tableId,rows){
    const thead=document.querySelector('#'+tableId+' thead'),tbody=document.querySelector('#'+tableId+' tbody');
    if(!thead||!tbody) return;
    thead.innerHTML='<tr><th>Firma Seç</th><th>Kategori</th><th>Firma</th><th>Fatura No</th><th>Tarih</th><th>Matrah</th><th>%20 KDV</th><th>%10 KDV</th><th>%1 KDV</th><th>Diğer KDV</th><th>Toplam KDV</th><th>Genel Toplam</th><th>Kaynak</th></tr>';
    tbody.innerHTML=''; rows=rows||[];
    if(!rows.length){tbody.innerHTML='<tr><td colspan="13">Kayıt yok.</td></tr>';return;}
    rows.forEach(r=>{const k20=invoiceRowVatAmount(r,20),k10=invoiceRowVatAmount(r,10),k1=invoiceRowVatAmount(r,1),other=Math.max((r.kdv||0)-k20-k10-k1,0),key=rowKey(r),selected=(typeof getInvoiceRowCompany==='function'?getInvoiceRowCompany(r):(r.firmaSirket||''));tbody.innerHTML+=`<tr><td><select class="invoice-company-select" data-invoice-key="${esc(key)}">${firmOptions(selected)}</select></td><td>${categoryCell(r)}</td><td>${esc(r.firma||'')}</td><td>${esc(r.faturaNo||'')}</td><td>${esc(r.tarih||'')}</td><td class="amount">${fmt(r.matrah||r.net)}</td><td class="amount">${fmt(k20)}</td><td class="amount">${fmt(k10)}</td><td class="amount">${fmt(k1)}</td><td class="amount">${fmt(other)}</td><td class="amount"><strong>${fmt(r.kdv)}</strong></td><td class="amount"><strong>${fmt(r.toplam)}</strong></td><td>${esc(r.kaynak||'')}</td></tr>`;});
  };
  function reportRows(){
    window.saveInvoiceCategorySelections(true);
    const map={};
    [...(window.invoicePurchaseRows||[]),...(window.invoiceExpenseRows||[])].filter(r=>!r.beyanHaric).forEach(r=>{const a=assignment(r),main=a.main||'Diğer',sub=a.sub||'Sınıflandırılmadı',key=main+'|'+sub;if(!map[key])map[key]={main,sub,matrah:0,kdv:0,total:0,count:0};map[key].matrah+=Number((r.matrah||r.net)||0);map[key].kdv+=Number(r.kdv||0);map[key].total+=Number(r.toplam||0);map[key].count++;});
    return Object.values(map).sort((a,b)=>b.total-a.total);
  }
  window.renderInvoiceCategoryAnalysis=function(){
    ensureCategoryPanel();
    const panel=document.getElementById('invoiceCategoryAnalysisPanel'),body=document.getElementById('invoiceCategoryAnalysisBody');if(!panel||!body)return;panel.style.display='block';
    const rows=reportRows(),total=rows.reduce((s,r)=>s+r.total,0),targets=load(TARGET_STORE),byMain={};
    rows.forEach(r=>{if(!byMain[r.main])byMain[r.main]={main:r.main,total:0,matrah:0,kdv:0,count:0,subs:[]};byMain[r.main].total+=r.total;byMain[r.main].matrah+=r.matrah;byMain[r.main].kdv+=r.kdv;byMain[r.main].count+=r.count;byMain[r.main].subs.push(r);});
    const mains=Object.values(byMain).sort((a,b)=>b.total-a.total),biggest=mains[0]||{main:'-',total:0};
    const over=mains.filter(r=>((total?r.total/total*100:0)-(Number(targets[r.main]||0)))>0.5&&Number(targets[r.main]||0)>0).sort((a,b)=>((b.total/total*100)-(targets[b.main]||0))-((a.total/total*100)-(targets[a.main]||0)))[0];
    body.innerHTML=`<div class="invoice-category-kpis"><div class="invoice-category-kpi"><span>Analiz Edilen Harcama</span><strong>${fmt(total)}</strong><small>Alış faturaları + masraf fişleri.</small></div><div class="invoice-category-kpi"><span>Harcama Kalemi</span><strong>${mains.length}</strong><small>Ana kategori sayısı.</small></div><div class="invoice-category-kpi"><span>En Büyük Kalem</span><strong>${esc(biggest.main)}</strong><small>${fmt(biggest.total)} / %${(total?biggest.total/total*100:0).toFixed(1).replace('.',',')}</small></div><div class="invoice-category-kpi"><span>Hedef Üstü</span><strong>${esc(over?over.main:'Yok')}</strong><small>${over?'Hedefe göre fazla harcama var.':'Hedef girilenlerde aşım görünmüyor.'}</small></div></div><div class="invoice-category-bars">${mains.map(r=>{const p=total?r.total/total*100:0;return `<div class="invoice-category-bar-row"><div class="invoice-category-bar-label" title="${esc(r.main)}">${esc(r.main)}</div><div class="invoice-category-bar-wrap"><div class="invoice-category-bar-fill" style="width:${Math.max(2,p)}%"></div></div><div class="invoice-category-bar-val">%${p.toFixed(1).replace('.',',')}</div></div>`;}).join('')||'<div class="invoice-category-note">Kategori atanmış harcama yok.</div>'}</div><div class="table-wrap"><table><thead><tr><th>Ana Kategori</th><th>Alt Dağılım</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Gerçek %</th><th>Hedef %</th><th>Fark</th><th>Yorum</th></tr></thead><tbody>${mains.map(r=>{const p=total?r.total/total*100:0,target=Number(targets[r.main]||0),diff=p-target;return `<tr><td><strong>${esc(r.main)}</strong><br><small>${r.count} satır</small></td><td>${r.subs.map(s=>`${esc(s.sub)}: <strong>${fmt(s.total)}</strong>`).join('<br>')}</td><td class="amount">${fmt(r.matrah)}</td><td class="amount">${fmt(r.kdv)}</td><td class="amount"><strong>${fmt(r.total)}</strong></td><td class="amount">%${p.toFixed(1).replace('.',',')}</td><td class="amount"><input class="invoice-target-input" type="number" step="0.1" value="${target||''}" onchange="saveInvoiceCategoryTarget('${esc(r.main)}',this.value)"></td><td class="amount ${diff>0.5?'negative':(diff<-0.5?'positive':'neutral')}">%${diff.toFixed(1).replace('.',',')}</td><td>${target?((diff>0.5)?'Hedefin üstünde, fiyat/tedarikçi kontrol et.':(diff<-0.5?'Hedefin altında.':'Hedefe yakın.')):'Hedef girilmedi.'}</td></tr>`;}).join('')}</tbody></table></div><div class="invoice-category-note"><strong>Fikir:</strong> Kategori Yönet ile istediğin ana/alt kategoriyi ekleyip çıkarabilirsin. Silinen kategoriye bağlı eski seçimler otomatik Diğer / ilk uygun alt kategoriye alınır.</div>`;
  };
  function ensureCategoryPanel(){
    const results=document.getElementById('invoiceAnalysisResults');if(!results)return;
    if(!document.getElementById('invoiceCategoryToolbar')){const toolbar=document.createElement('div');toolbar.id='invoiceCategoryToolbar';toolbar.className='invoice-company-toolbar';toolbar.innerHTML='<div><strong>Fatura Kategorileri</strong><br><small>Firma seçiminin sağındaki ana kategori / alt kategori seçimleri harcama kalemlerini raporlar.</small></div><button class="primary-button" type="button" onclick="saveInvoiceCategorySelections()">Kategori Seçimlerini Kaydet</button><button class="secondary-button" type="button" onclick="renderInvoiceCategoryAnalysis()">Kategori Raporu</button><button class="secondary-button" type="button" onclick="toggleInvoiceCategoryManager()">Kategori Yönet</button>';const companyToolbar=document.getElementById('invoiceCompanyToolbar');if(companyToolbar&&companyToolbar.parentNode)companyToolbar.parentNode.insertBefore(toolbar,companyToolbar.nextSibling);else results.insertBefore(toolbar,results.firstChild);}
    if(!document.getElementById('invoiceCategoryManager')){const manager=document.createElement('div');manager.id='invoiceCategoryManager';manager.className='invoice-category-manager';const toolbar=document.getElementById('invoiceCategoryToolbar');if(toolbar&&toolbar.parentNode)toolbar.parentNode.insertBefore(manager,toolbar.nextSibling);else results.insertBefore(manager,results.firstChild);}
    if(!document.getElementById('invoiceCategoryAnalysisPanel')){const panel=document.createElement('div');panel.id='invoiceCategoryAnalysisPanel';panel.className='invoice-category-panel';panel.style.display='none';panel.innerHTML='<div class="invoice-category-head"><div><h3>Harcama Kalemleri Kategori Raporu</h3><small>Gerçek harcama yüzdesi, hedef yüzde ve aşım yorumu.</small></div><button class="primary-button" type="button" onclick="renderInvoiceCategoryAnalysis()">Yenile</button></div><div id="invoiceCategoryAnalysisBody" class="invoice-category-body"></div>';const companyPanel=document.getElementById('invoiceCompanyAnalysisPanel');if(companyPanel&&companyPanel.parentNode)companyPanel.parentNode.insertBefore(panel,companyPanel.nextSibling);else results.insertBefore(panel,results.firstChild);}
    renderInvoiceCategoryManager();
  }
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function'){window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);ensureCategoryPanel();if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();return r;};}
  document.addEventListener('DOMContentLoaded',ensureCategoryPanel);
  setTimeout(ensureCategoryPanel,500);setTimeout(ensureCategoryPanel,1500);
})();
