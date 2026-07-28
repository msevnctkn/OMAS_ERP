(function(){
  const COMPANY_MAP_KEY='bhdFirmCompanyMapV167';
  const COMPANIES=['GENEL','ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'];
  function esc(v){return (typeof escapeHtml==='function')?escapeHtml(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){return (typeof formatTL==='function')?formatTL(Number(v||0)):(Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL');}
  function norm(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C');}
  function fkey(v){return (typeof getFirmaKey==='function')?getFirmaKey(v):norm(v).replace(/[^A-Z0-9]/g,'');}
  function safe(v){return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
  function loadMap(){try{return JSON.parse(localStorage.getItem(COMPANY_MAP_KEY)||'{}')||{};}catch(e){return {};}}
  function saveMap(m){localStorage.setItem(COMPANY_MAP_KEY,JSON.stringify(m||{}));}
  function canonicalCompany(v){
    const n=norm(v).replace(/[^A-Z0-9]+/g,' ').trim();
    if(n==='OMAS KONSEPT'||n==='KONSEPT')return 'ÖMAS KONSEPT';
    if(n==='OMAS OTOMASYON'||n==='OTOMASYON'||n==='OMAS ELEKTRIK')return 'ÖMAS OTOMASYON';
    if(n==='ORTAK')return 'ORTAK';
    if(n==='SECILMEDI'||n==='')return 'SEÇİLMEDİ';
    if(['ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ','GENEL'].includes(v))return v;
    return '';
  }
  function autoCompany(r){
    const t=norm([r?.kaynak,r?.aciklama,r?.kisiFirma,r?.personel,r?.kategori].join(' '));
    if(/KONSEPT|OMAS KONSEPT|TRENDYOL|HEPSIBURADA|IKAS|PAYTR|SIPAY|SAAT|DEKOR|KARGO|MARANGOZ/.test(t))return 'ÖMAS KONSEPT';
    if(/OTOMASYON|OMAS ELEKTRIK|ELEKTRIK|PLC|SERVO|LENZE|SENSOR|BETON|SANTRAL|PANO|SURUCU|SÜRÜCÜ|PEMSAN/.test(t))return 'ÖMAS OTOMASYON';
    return 'SEÇİLMEDİ';
  }
  function rowCompany(r){
    const m=loadMap();
    const manual=canonicalCompany(m[fkey(r?.kisiFirma||'')]||'');
    return manual&&manual!=='GENEL'?manual:autoCompany(r);
  }
  function refreshCompanies(){const rows=(typeof bhdRawRows!=='undefined'&&Array.isArray(bhdRawRows)?bhdRawRows:[]);rows.forEach(r=>{r.sirket=rowCompany(r);});}
  function rowsFor(company){refreshCompanies();const rows=(typeof bhdRawRows!=='undefined'&&Array.isArray(bhdRawRows)?bhdRawRows:[]);return company==='GENEL'?rows.slice():rows.filter(r=>(r.sirket||rowCompany(r))===company);}
  function group(rows,key,amount){const m={};rows.forEach(r=>{const k=String(key(r)||'Belirsiz').trim()||'Belirsiz';m[k]=(m[k]||0)+Number(amount(r)||0);});return Object.entries(m).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);}
  function dateVal(r){const s=String(r.tarih||'');let m=s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]).getTime();m=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]).getTime();return 0;}
  function barHtml(data,type){if(!data.length)return '<div class="bhd-company-empty">Kayıt yok.</div>';const max=Math.max(...data.map(x=>x[1]),1);return '<div class="bhd-bars">'+data.slice(0,14).map(([k,v])=>`<div class="bhd-bar-row"><div class="bhd-bar-label" title="${esc(k)}">${esc(k)}</div><div class="bhd-bar-wrap"><div class="${type==='in'?'bhd-bar-in':'bhd-bar-out'}" style="width:${Math.max(3,v/max*100)}%"></div></div><div class="bhd-bar-val">${fmt(v)}</div></div>`).join('')+'</div>';}
  function fundingChains(company){
    refreshCompanies();
    const sourceRows=((typeof bhdRawRows!=='undefined'&&Array.isArray(bhdRawRows)?bhdRawRows:[])).slice().sort((a,b)=>dateVal(a)-dateVal(b));
    const pool=[]; const chains=[];
    sourceRows.forEach(r=>{
      const rc=r.sirket||rowCompany(r);
      if(Number(r.gelen)>0){pool.push({company:rc,name:r.kisiFirma||r.aciklama||'Gelen para',left:Number(r.gelen),date:r.tarih,row:r});}
      if(Number(r.giden)>0 && (company==='GENEL'||rc===company)){
        let need=Number(r.giden), parts=[];
        for(const p of pool){if(need<=0)break;if(p.left<=0)continue;const take=Math.min(p.left,need);p.left-=take;need-=take;parts.push({company:p.company,name:p.name,amount:take,date:p.date});}
        if(need>0)parts.push({company:'Önceki Bakiye',name:'Önceki bakiye / kaynağı belirsiz',amount:need,date:''});
        chains.push({row:r,parts});
      }
    });
    return chains.sort((a,b)=>Number(b.row.giden)-Number(a.row.giden));
  }
  window.bhdCompanyOfRow=function(r){return rowCompany(r);};
  window.bhdCompanyRows=function(company){return rowsFor(company);};
  window.setBhdCompanyTab=function(company){window.bhdSelectedCompany=company;renderBhdCompanyPanel(company);};
  window.renderBhdCompanyPanel=function(company){
    const tabs=document.getElementById('bhdCompanyTabs'), content=document.getElementById('bhdCompanyContent');
    if(!tabs||!content)return; const all=(typeof bhdRawRows!=='undefined'&&Array.isArray(bhdRawRows)?bhdRawRows:[]);
    if(!all.length){content.innerHTML='<div class="bhd-company-empty">BHD dosyası yükleyip Analiz Et butonuna basınca bu panel otomatik dolacak.</div>';return;}
    refreshCompanies(); if(!COMPANIES.includes(company))company='GENEL'; window.bhdSelectedCompany=company;
    tabs.innerHTML=['GENEL','ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'].map(c=>`<button type="button" class="${c===company?'active':''}" onclick="setBhdCompanyTab('${c}')">${c}</button>`).join('');
    const rows=rowsFor(company); const gelen=rows.reduce((s,r)=>s+Number(r.gelen||0),0), giden=rows.reduce((s,r)=>s+Number(r.giden||0),0), net=gelen-giden;
    const resmi=rows.filter(r=>!/(GAYRI|GAYRİ|KİŞİSEL|KISISSEL)/.test(norm([r.kategori,r.altKategori,r.aciklama].join(' '))));
    const gayri=rows.filter(r=>!resmi.includes(r));
    const card=rows.filter(r=>/KREDI KART|KREDİ KART|KART/.test(norm([r.dosyaTipi,r.kaynak,r.aciklama].join(' '))));
    const catOut=group(rows.filter(r=>Number(r.giden)>0),r=>r.kategori||'Diğer',r=>r.giden);
    const inBy=group(rows.filter(r=>Number(r.gelen)>0),r=>r.kisiFirma||r.aciklama,r=>r.gelen);
    const outBy=group(rows.filter(r=>Number(r.giden)>0),r=>r.kisiFirma||r.aciklama,r=>r.giden);
    const chains=fundingChains(company).slice(0,10);
    content.innerHTML=`
      <div class="bhd-v169-top">
        <div class="bhd-v169-box"><span>Toplam Gelen</span><strong class="positive">${fmt(gelen)}</strong></div>
        <div class="bhd-v169-box"><span>Toplam Giden</span><strong class="negative">${fmt(giden)}</strong></div>
        <div class="bhd-v169-box"><span>Net Fark</span><strong class="${net>=0?'positive':'negative'}">${fmt(net)}</strong></div>
        <div class="bhd-v169-box"><span>Kredi Kartı Harcaması</span><strong class="negative">${fmt(card.reduce((s,r)=>s+Number(r.giden||0),0))}</strong></div>
        <div class="bhd-v169-box"><span>Resmi Gelen</span><strong class="positive">${fmt(resmi.reduce((s,r)=>s+Number(r.gelen||0),0))}</strong></div>
        <div class="bhd-v169-box"><span>Resmi Giden</span><strong class="negative">${fmt(resmi.reduce((s,r)=>s+Number(r.giden||0),0))}</strong></div>
        <div class="bhd-v169-box"><span>Gayriresmi Gelen</span><strong class="positive">${fmt(gayri.reduce((s,r)=>s+Number(r.gelen||0),0))}</strong></div>
        <div class="bhd-v169-box"><span>Gayriresmi Giden</span><strong class="negative">${fmt(gayri.reduce((s,r)=>s+Number(r.giden||0),0))}</strong></div>
      </div>
      <div class="bhd-v169-one">
        <div class="bhd-v169-card"><h4>Gelir Kaynakları</h4>${barHtml(inBy,'in')}</div>
        <div class="bhd-v169-card"><h4>Gider Yerleri</h4>${barHtml(outBy,'out')}</div>
        <div class="bhd-v169-card"><h4>Kategorilere Göre Gider</h4>${barHtml(catOut,'out')}</div>
        <div class="bhd-v169-card"><h4>Harcamayı Kim Finanse Etti?</h4><div class="bhd-flow-list">${chains.length?chains.map(ch=>`<div class="bhd-flow-item"><b>${esc(ch.row.sirket||rowCompany(ch.row))} → ${esc(ch.row.kisiFirma||ch.row.aciklama||'Harcama')}</b> <span class="negative">${fmt(ch.row.giden)}</span><small>${esc(ch.row.tarih||'')} • ${esc(ch.row.kategori||'')}</small><div class="bhd-flow-chain">${ch.parts.map(p=>`${esc(p.company)} / ${esc(p.name)} → <strong>${fmt(p.amount)}</strong>`).join('<br>')}</div></div>`).join(''):'<div class="bhd-company-empty">Gider hareketi yok.</div>'}</div></div>
      </div>
      <div id="bhdCompanyDetail" class="bhd-company-detail"><h4>Şirket Detayı</h4><div class="bhd-company-empty">Üstteki kutulara tıklayınca ilgili hareketler burada açılır.</div></div>`;
  };
  window.bhdCompanyShowDetail=function(kind){
    const el=document.getElementById('bhdCompanyDetail'); if(!el)return; const company=window.bhdSelectedCompany||'GENEL'; let rows=rowsFor(company); let title='Tüm Hareketler';
    if(kind==='in'){rows=rows.filter(r=>Number(r.gelen)>0);title='Gelen Paralar';} if(kind==='out'){rows=rows.filter(r=>Number(r.giden)>0);title='Giden Paralar';}
    const cmap=new Map(fundingChains(company).map(ch=>[ch.row.sira||ch.row.aciklama+ch.row.tarih,ch.parts]));
    let html=`<h4>${esc(company)}  -  ${esc(title)} (${rows.length} hareket)</h4><div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Şirket</th><th>Firma</th><th>Kategori</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Finansman</th><th>Açıklama</th></tr></thead><tbody>`;
    rows.sort((a,b)=>dateVal(b)-dateVal(a)).forEach(r=>{const parts=cmap.get(r.sira||r.aciklama+r.tarih)||[];html+=`<tr><td>${esc(r.tarih)}</td><td>${esc(r.sirket||rowCompany(r))}</td><td>${esc(r.kisiFirma||'')}</td><td>${esc(r.kategori||'')}</td><td class="amount positive">${fmt(r.gelen)}</td><td class="amount negative">${fmt(r.giden)}</td><td class="amount ${(Number(r.net||0)>=0)?'positive':'negative'}">${fmt(r.net)}</td><td>${Number(r.giden||0)?parts.map(p=>`${esc(p.company)} / ${esc(p.name)}: ${fmt(p.amount)}`).join('<br>'):'-'}</td><td>${esc(r.aciklama||'')}</td></tr>`;});
    html+='</tbody></table></div>'; el.innerHTML=html; el.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const companyOptionsHtml=sel=>['SEÇİLMEDİ','ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK'].map(c=>`<option value="${esc(c)}"${c===(canonicalCompany(sel)||'SEÇİLMEDİ')?' selected':''}>${esc(c)}</option>`).join('');
  window.setFirmaSelections=function(firma){
    const key=fkey(firma), cat=document.getElementById('cat_'+key), sub=document.getElementById('subcat_'+key), sir=document.getElementById('sirket_'+key);
    if(cat){manualCategoryMap[key]=cat.value;manualSubcategoryMap[key]=sub?sub.value:'';}
    if(sir){const m=loadMap();m[key]=canonicalCompany(sir.value)||'SEÇİLMEDİ';saveMap(m);} 
    localStorage.setItem('bhdManualCategoryMap',JSON.stringify(manualCategoryMap));localStorage.setItem('bhdManualSubcategoryMap',JSON.stringify(manualSubcategoryMap));
    if(typeof applyManualCategoriesToRows==='function')applyManualCategoriesToRows();refreshCompanies();if(typeof buildViews==='function')buildViews();if(typeof renderKpis==='function')renderKpis();if(typeof renderView==='function')renderView('Firma Özeti');renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL');
  };
  const oldRenderManual=window.renderView;
  window.renderView=function(name){
    refreshCompanies(); if(name!=='Firma Özeti' && typeof oldRenderManual==='function')return oldRenderManual.apply(this,arguments);
    currentView=name;document.getElementById('bhdResults').style.display='block';let tabs=document.getElementById('viewTabs');tabs.innerHTML='';Object.keys(bhdViews).forEach(v=>{let b=document.createElement('button');b.className='tab-button'+(v===name?' active':'');b.textContent=v;b.onclick=()=>renderView(v);tabs.appendChild(b)});document.getElementById('tableTitle').textContent=name;let thead=document.querySelector('#bhdTable thead'),tbody=document.querySelector('#bhdTable tbody');thead.innerHTML='';tbody.innerHTML='';let rows=bhdViews[name]||[];if(typeof renderManualCategoryBlocks==='function')renderManualCategoryBlocks(true);
    thead.innerHTML='<tr><th>Detay</th><th>Kategori / Şirket Seç</th><th>Tarihler</th><th>Başlık</th><th>Kategori</th><th>Alt Kategori</th><th>Şirket</th><th>Gelen</th><th>Giden</th><th>Net</th><th>İşlem</th></tr>';
    rows.forEach((r,i)=>{const key=fkey(r.ad), saved=manualCategoryMap[key]||r.kategori||'Diğer', selected=canonicalCompany(loadMap()[key]||'')||'SEÇİLMEDİ', detailId='summary_detail_'+normalizeMatch(name+'_'+r.ad+'_'+i), detailRows=rowsForSummaryItem(name,r);tbody.innerHTML+=`<tr><td><button class="detail-toggle" type="button" onclick="toggleSummaryDetail('${detailId}',this)">Detay</button></td><td><div class="bhd-v169-selectgrid"><select class="category-select" id="cat_${key}" onchange="updateSubcategorySelect('${key}')">${categoryOptions(saved)}</select><select class="subcategory-select" id="subcat_${key}">${subcategoryOptions(saved,manualSubcategoryMap[key]||'')}</select><select class="category-select" id="sirket_${key}">${companyOptionsHtml(selected)}</select><button class="ok-button" type="button" onclick="setFirmaSelections('${safe(r.ad)}')">Okey</button></div></td><td>${esc(r.tarihler||'')}</td><td>${esc(r.ad)}</td><td>${esc(saved)}</td><td>${esc(manualSubcategoryMap[key]||'')}</td><td>${esc(selected)}</td><td class="amount positive">${fmt(r.gelen)}</td><td class="amount negative">${fmt(r.giden)}</td><td class="amount ${Number(r.net||0)>=0?'positive':'negative'}">${fmt(r.net)}</td><td class="amount">${r.islemSayisi}</td></tr><tr id="${detailId}" class="summary-detail-row"><td colspan="11">${detailRowsHtml(detailRows,r.ad)}</td></tr>`;});
  };
  function projectSummary(rows){return group(rows,r=>r.projeKodu||r.proje||r.kisiFirma||'Belirsiz',r=>Math.abs(Number(r.gelen||0))+Math.abs(Number(r.giden||0))).map(([name])=>{const rr=rows.filter(r=>(r.projeKodu||r.proje||r.kisiFirma||'Belirsiz')===name);const gelen=rr.reduce((s,r)=>s+Number(r.gelen||0),0),giden=rr.reduce((s,r)=>s+Number(r.giden||0),0);return [name,gelen,giden,gelen-giden,(gelen-giden)>=0?'KAR':'ZARAR'];});}
  function aoaFor(company){const rows=rowsFor(company), gelen=rows.reduce((s,r)=>s+Number(r.gelen||0),0), giden=rows.reduce((s,r)=>s+Number(r.giden||0),0), net=gelen-giden;const card=rows.filter(r=>/KREDI KART|KREDİ KART|KART/.test(norm([r.dosyaTipi,r.kaynak,r.aciklama].join(' '))));const cardOut=card.reduce((s,r)=>s+Number(r.giden||0),0);const resmi=rows.filter(r=>!/(GAYRI|GAYRİ|KİŞİSEL|KISISEL)/.test(norm([r.kategori,r.altKategori,r.aciklama].join(' '))));const gayri=rows.filter(r=>!resmi.includes(r));const ps=projectSummary(rows);return [
    [`${company} DASHBOARD`],[],['RESMİ NAKİT KASA','','','KREDİ KARTI HARCAMASI','','RESMİ İŞLEMLER','','GAYRİRESMİ İŞLEMLER'],['TOPLAM GELEN',gelen,'','TOPLAM HARCAMA',cardOut,'GELEN PARA',resmi.reduce((s,r)=>s+Number(r.gelen||0),0),'GELEN PARA',gayri.reduce((s,r)=>s+Number(r.gelen||0),0)],['TOPLAM GİDEN',giden,'','','','GİDEN PARA',resmi.reduce((s,r)=>s+Number(r.giden||0),0),'GİDEN PARA',gayri.reduce((s,r)=>s+Number(r.giden||0),0)],['DURUM',net,'','','','FARK',resmi.reduce((s,r)=>s+Number(r.gelen||0)-Number(r.giden||0),0),'FARK',gayri.reduce((s,r)=>s+Number(r.gelen||0)-Number(r.giden||0),0)],[],['PROJE BAZLI ÖZET'],['PROJE KODU','GELEN PARA','GİDEN PARA','FARK','DURUM'],...ps];}
  window.downloadBHDReport=function(){
    if((typeof bhdRawRows==='undefined'||!Array.isArray(bhdRawRows)||!bhdRawRows.length)){alert('Önce dosya yükleyip analiz etmelisin.');return;} if(typeof XLSX==='undefined'){alert('Excel kütüphanesi yüklenemedi.');return;}
    if(typeof applyManualCategoriesToRows==='function')applyManualCategoriesToRows();refreshCompanies();
    const wb=XLSX.utils.book_new(); const widths=[{wch:24},{wch:16},{wch:16},{wch:24},{wch:16},{wch:16},{wch:16},{wch:18},{wch:16},{wch:16}];
    ['GENEL','ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'].forEach(c=>{const ws=XLSX.utils.aoa_to_sheet(aoaFor(c));ws['!cols']=widths;XLSX.utils.book_append_sheet(wb,ws,c.substring(0,31));});
    const det=[['Tarih','Ay','Şirket','Kişi/Firma','Kategori','Alt Kategori','Gelen','Giden','Net','Açıklama','Kaynak']];rowsFor('GENEL').forEach(r=>det.push([r.tarih,r.ay,r.sirket||rowCompany(r),r.kisiFirma,r.kategori||'',r.altKategori||'',Number(r.gelen||0),Number(r.giden||0),Number(r.net||0),r.aciklama||'',r.kaynak||'']));const ws=XLSX.utils.aoa_to_sheet(det);ws['!cols']=[{wch:12},{wch:12},{wch:18},{wch:28},{wch:20},{wch:20},{wch:14},{wch:14},{wch:14},{wch:55},{wch:24}];XLSX.utils.book_append_sheet(wb,ws,'Detay Hareketler');
    XLSX.writeFile(wb,'bhd_excel_ozeti_sirket_bazli.xlsx');
  };
  const oldAnalyze=window.analyzeBHD; if(typeof oldAnalyze==='function'){window.analyzeBHD=async function(){const r=await oldAnalyze.apply(this,arguments);refreshCompanies();renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL');return r;};}
})();
