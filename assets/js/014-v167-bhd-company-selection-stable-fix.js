(function(){
  const COMPANY_MAP_KEY='bhdFirmCompanyMapV167';
  const COMPANY_OPTIONS=['SEÇİLMEDİ','ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK'];

  function loadMap(){try{return JSON.parse(localStorage.getItem(COMPANY_MAP_KEY)||'{}')||{};}catch(e){return {};}}
  function saveMap(m){localStorage.setItem(COMPANY_MAP_KEY,JSON.stringify(m||{}));}
  function esc(v){return (typeof escapeHtml==='function')?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function normTR(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C');}
  function firmaKey(v){return (typeof getFirmaKey==='function')?getFirmaKey(v):normTR(v).replace(/[^A-Z0-9]/g,'');}
  function safeName(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function canonicalCompany(v){
    const n=normTR(v).replace(/[^A-Z0-9]+/g,' ').trim();
    if(n==='OMAS KONSEPT' || n==='KONSEPT') return 'ÖMAS KONSEPT';
    if(n==='OMAS OTOMASYON' || n==='OTOMASYON') return 'ÖMAS OTOMASYON';
    if(n==='ORTAK') return 'ORTAK';
    if(n==='SECILMEDI' || n==='SECILMEDI') return 'SEÇİLMEDİ';
    if(v==='ÖMAS KONSEPT' || v==='ÖMAS OTOMASYON' || v==='ORTAK' || v==='SEÇİLMEDİ') return v;
    return '';
  }
  function autoCompany(row){
    const t=normTR([row?.kaynak,row?.aciklama,row?.kisiFirma,row?.personel,row?.kategori].join(' '));
    if(/KONSEPT|OMAS KONSEPT|OMER SEVINCTEKIN|MUHAMMED SEVINCTEKIN|TRENDYOL|HEPSIBURADA|IKAS|PAYTR|SIPAY|SAAT|DEKOR|KARGO/.test(t)) return 'ÖMAS KONSEPT';
    if(/OTOMASYON|OMAS ELEKTRIK|ELEKTRIK|PLC|SERVO|LENZE|SENSOR|BETON|SANTRAL|PANO|SURUCU|SÜRÜCÜ/.test(t)) return 'ÖMAS OTOMASYON';
    return 'SEÇİLMEDİ';
  }
  function companyForRow(row){
    const map=loadMap();
    const key=firmaKey(row?.kisiFirma||'');
    const manual=canonicalCompany(map[key]||'');
    return manual || autoCompany(row);
  }
  function refreshCompanies(){
    const rows=(typeof bhdRawRows!=='undefined' && Array.isArray(bhdRawRows))?bhdRawRows:[];
    rows.forEach(r=>{r.sirket=companyForRow(r);});
  }
  function companyOptionsHtml(selected){
    selected=canonicalCompany(selected)||'SEÇİLMEDİ';
    return COMPANY_OPTIONS.map(c=>`<option value="${esc(c)}"${c===selected?' selected':''}>${esc(c)}</option>`).join('');
  }

  window.setFirmaCompany=function(firma){
    const key=firmaKey(firma);
    const sel=document.getElementById('sirket_'+key);
    const val=canonicalCompany(sel?.value||'SEÇİLMEDİ')||'SEÇİLMEDİ';
    const map=loadMap();
    map[key]=val;
    saveMap(map);
    refreshCompanies();
    if(typeof buildViews==='function') buildViews();
    if(typeof renderView==='function') renderView('Firma Özeti');
    if(typeof renderBhdCompanyPanel==='function') renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL');
  };

  window.setFirmaSelections=function(firma){
    const key=firmaKey(firma);
    const cat=document.getElementById('cat_'+key);
    const sub=document.getElementById('subcat_'+key);
    const sirket=document.getElementById('sirket_'+key);

    if(cat){
      manualCategoryMap[key]=cat.value;
      manualSubcategoryMap[key]=sub?sub.value:'';
      bhdRawRows.forEach(r=>{
        if(firmaKey(r.kisiFirma)===key){
          if(!r.orijinalKategori) r.orijinalKategori=r.kategori;
          r.manuelKategori=cat.value;
          r.manuelAltKategori=sub?sub.value:'';
          r.kategori=cat.value;
          r.altKategori=sub?sub.value:'';
          r.kategoriKaynak='Manuel';
        }
      });
    }

    if(sirket){
      const map=loadMap();
      map[key]=canonicalCompany(sirket.value||'SEÇİLMEDİ')||'SEÇİLMEDİ';
      saveMap(map);
    }

    localStorage.setItem('bhdManualCategories',JSON.stringify(manualCategories));
    localStorage.setItem('bhdManualCategoryMap',JSON.stringify(manualCategoryMap));
    localStorage.setItem('bhdManualSubcategories',JSON.stringify(manualSubcategories));
    localStorage.setItem('bhdManualSubcategoryMap',JSON.stringify(manualSubcategoryMap));

    refreshCompanies();
    if(typeof applyManualCategoriesToRows==='function') applyManualCategoriesToRows();
    if(typeof buildViews==='function') buildViews();
    if(typeof renderKpis==='function') renderKpis();
    if(typeof renderView==='function') renderView('Firma Özeti');
    if(typeof renderBhdCompanyPanel==='function') renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL');
  };

  // Çalışan v163 panelini bozma: sadece şirket tespitini manuel seçimle besle.
  const oldCompanyOfRow=window.bhdCompanyOfRow;
  window.bhdCompanyOfRow=function(row){return companyForRow(row);};

  const oldPanel=window.renderBhdCompanyPanel;
  if(typeof oldPanel==='function'){
    window.renderBhdCompanyPanel=function(company){refreshCompanies(); return oldPanel.call(this,company);};
  }

  // Firma Özeti ekranını tekrar çizildiğinde seçili şirketi kaybetmeyecek şekilde değiştir.
  window.renderView=function(name){
    refreshCompanies();
    currentView=name;
    document.getElementById('bhdResults').style.display='block';
    let tabs=document.getElementById('viewTabs');
    tabs.innerHTML='';
    Object.keys(bhdViews).forEach(v=>{let b=document.createElement('button');b.className='tab-button'+(v===name?' active':'');b.textContent=v;b.onclick=()=>renderView(v);tabs.appendChild(b)});
    document.getElementById('tableTitle').textContent=name;
    let thead=document.querySelector('#bhdTable thead'),tbody=document.querySelector('#bhdTable tbody');
    thead.innerHTML=''; tbody.innerHTML='';
    let rows=bhdViews[name]||[];
    if(typeof renderManualCategoryBlocks==='function') renderManualCategoryBlocks(true);

    if(['Personel Hareketleri','Manuel Kategori Detayı','Ticari Olmayan Transfer Gelen','Ticari Olmayan Transfer Giden','Transfer / Virman','Faizler','Ham Hareketler'].includes(name) || name.startsWith('Kategori: ')){
      thead.innerHTML='<tr><th>Tarih</th><th>Ay</th><th>Kişi/Firma</th><th>Personel</th><th>Şirket</th><th>Kategori</th><th>Alt Kategori</th><th>Analiz</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Açıklama</th><th>Kaynak</th></tr>';
      rows.forEach(r=>{tbody.innerHTML+=`<tr><td>${esc(r.tarih)}</td><td>${esc(r.ay)}</td><td>${esc(r.kisiFirma)}</td><td>${esc(r.personel||'')}</td><td>${esc(companyForRow(r))}</td><td>${esc(r.kategori||'')}</td><td>${esc(r.altKategori||'')}</td><td>${badge(r.analizTuru)}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td>${esc(r.aciklama)}</td><td>${esc(r.kaynak)}</td></tr>`});
      return;
    }

    if(name==='Firma Özeti'){
      thead.innerHTML='<tr><th>Detay</th><th>Kategori / Alt Kategori / Şirket Seç<br><span class="small">Tek Okey ile hepsi kaydedilir</span></th><th>Tarihler</th><th>Başlık</th><th>Mevcut Kategori</th><th>Alt Kategori</th><th>Şirket</th><th>Gelen</th><th>Giden</th><th>Net</th><th>İşlem Sayısı</th></tr>';
      rows.forEach((r,i)=>{
        const key=firmaKey(r.ad);
        const saved=manualCategoryMap[key]||r.kategori||'Diğer';
        const selectedCompany=canonicalCompany(loadMap()[key]||'')||'SEÇİLMEDİ';
        const detailId='summary_detail_'+normalizeMatch(name+'_'+r.ad+'_'+i);
        const detailRows=rowsForSummaryItem(name,r);
        tbody.innerHTML+=`<tr>
          <td><button class="detail-toggle" type="button" onclick="toggleSummaryDetail('${detailId}',this)">Detay</button></td>
          <td>
            <div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(150px,1fr) minmax(150px,1fr) auto;gap:7px;align-items:center;min-width:560px">
              <select class="category-select" id="cat_${key}" onchange="updateSubcategorySelect('${key}')">${categoryOptions(saved)}</select>
              <select class="subcategory-select" id="subcat_${key}">${subcategoryOptions(saved,manualSubcategoryMap[key]||'')}</select>
              <select class="category-select" id="sirket_${key}">${companyOptionsHtml(selectedCompany)}</select>
              <button class="ok-button" type="button" onclick="setFirmaSelections('${safeName(r.ad)}')">Okey</button>
            </div>
          </td>
          <td>${esc(r.tarihler||'')}</td>
          <td>${esc(r.ad)}</td>
          <td>${esc(saved)}</td>
          <td>${esc(manualSubcategoryMap[key]||'')}</td>
          <td>${esc(selectedCompany)}</td>
          <td class="amount positive">${formatTL(r.gelen)}</td>
          <td class="amount negative">${formatTL(r.giden)}</td>
          <td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td>
          <td class="amount">${r.islemSayisi}</td>
        </tr><tr id="${detailId}" class="summary-detail-row"><td colspan="11">${detailRowsHtml(detailRows,r.ad)}</td></tr>`;
      });
      return;
    }

    thead.innerHTML='<tr><th>Detay</th><th>Başlık</th><th>Gelen</th><th>Giden</th><th>Net</th><th>İşlem Sayısı</th></tr>';
    rows.forEach((r,i)=>{
      let detailId='summary_detail_'+normalizeMatch(name+'_'+r.ad+'_'+i);
      let detailRows=rowsForSummaryItem(name,r);
      tbody.innerHTML+=`<tr><td><button class="detail-toggle" type="button" onclick="toggleSummaryDetail('${detailId}',this)">Detay</button></td><td>${esc(r.ad)}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td class="amount">${r.islemSayisi}</td></tr><tr id="${detailId}" class="summary-detail-row"><td colspan="6">${detailRowsHtml(detailRows,r.ad)}</td></tr>`;
    });
  };

  const oldBuildViews=window.buildViews;
  if(typeof oldBuildViews==='function'){
    window.buildViews=function(){const r=oldBuildViews.apply(this,arguments); refreshCompanies(); return r;};
  }

  const oldAnalyze=window.analyzeBHD;
  if(typeof oldAnalyze==='function'){
    window.analyzeBHD=async function(){const r=await oldAnalyze.apply(this,arguments); refreshCompanies(); if(typeof renderBhdCompanyPanel==='function') renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL'); return r;};
  }
})();
