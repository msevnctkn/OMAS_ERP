window.bhdSelectedCompany='GENEL';
function bhdNormTR(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C');}
function bhdCompanyOfRow(r){
  if(r && r.sirket) return r.sirket;
  const txt=bhdNormTR([r?.kaynak,r?.aciklama,r?.kisiFirma,r?.personel,r?.kategori].join(' '));
  if(/KONSEPT|OMAS KONSEPT|ÖMAS KONSEPT|OMER SEVINCTEKIN|ÖMER SEVİNÇTEKİN|MUHAMMED SEVINCTEKIN|MUHAMMED SEVİNÇTEKİN|TRENDYOL|HEPSIBURADA|IKAS|PAYTR|SIPAY|KARGO|SAAT|DEKOR|MARANGOZ|MOTOROBIT|SETAPOWER/.test(txt)) return 'ÖMAS KONSEPT';
  if(/OTOMASYON|OMAS ELEKTRIK|ÖMAS ELEKTRİK|PEMSAN|DOSTEL|BOTEK|ILX|İLX|SENSOR|SENSÖR|PLC|SERVO|LENZE|PAN[OA]|ELEKTRIK|ELEKTRONIK|BETON|SANTRAL/.test(txt)) return 'ÖMAS OTOMASYON';
  return 'GENEL';
}
function bhdCompanyRows(company){
  const rows=(typeof bhdRawRows!=='undefined' && Array.isArray(bhdRawRows))?bhdRawRows:[];
  rows.forEach(r=>{r.sirket=bhdCompanyOfRow(r)});
  if(company==='GENEL') return rows.slice();
  return rows.filter(r=>r.sirket===company);
}
function bhdGroup(rows,keyFn,amountFn){
  const m={};
  rows.forEach(r=>{const k=(keyFn(r)||'Belirsiz').trim()||'Belirsiz'; m[k]=(m[k]||0)+Number(amountFn(r)||0);});
  return Object.entries(m).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
}
function bhdDateVal(r){
  const s=String(r.tarih||'');
  const m=s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if(m) return new Date(+m[3],+m[2]-1,+m[1]).getTime();
  return 0;
}
function bhdBuildFundingChains(rows){
  const sorted=rows.slice().sort((a,b)=>bhdDateVal(a)-bhdDateVal(b));
  const pool=[]; const out=[];
  sorted.forEach(r=>{
    if(Number(r.gelen)>0){pool.push({name:r.kisiFirma||r.aciklama||'Gelen para',left:Number(r.gelen),date:r.tarih,raw:r});}
    if(Number(r.giden)>0){
      let need=Number(r.giden), parts=[];
      for(const p of pool){
        if(need<=0) break; if(p.left<=0) continue;
        const take=Math.min(p.left,need); p.left-=take; need-=take; parts.push({name:p.name,amount:take,date:p.date});
      }
      if(need>0) parts.push({name:'Önceki bakiye / kaynağı belirsiz',amount:need,date:''});
      out.push({row:r,parts});
    }
  });
  return out.sort((a,b)=>Number(b.row.giden)-Number(a.row.giden));
}
function bhdBarsHtml(data,type){
  if(!data.length) return '<div class="bhd-company-empty">Kayıt yok.</div>';
  const max=Math.max(...data.map(x=>x[1]),1);
  return '<div class="bhd-bars">'+data.slice(0,12).map(([k,v])=>`<div class="bhd-bar-row"><div class="bhd-bar-label" title="${escapeHtml(k)}">${escapeHtml(k)}</div><div class="bhd-bar-wrap"><div class="${type==='in'?'bhd-bar-in':'bhd-bar-out'}" style="width:${Math.max(2,v/max*100)}%"></div></div><div class="bhd-bar-val">${formatTL(v)}</div></div>`).join('')+'</div>';
}
function setBhdCompanyTab(company){window.bhdSelectedCompany=company;renderBhdCompanyPanel(company);}
function renderBhdCompanyPanel(company){
  const panel=document.getElementById('bhdCompanyPanel'), tabs=document.getElementById('bhdCompanyTabs'), content=document.getElementById('bhdCompanyContent');
  if(!panel||!tabs||!content) return;
  const all=(typeof bhdRawRows!=='undefined' && Array.isArray(bhdRawRows))?bhdRawRows:[];
  if(!all.length){content.innerHTML='<div class="bhd-company-empty">BHD dosyası yükleyip Analiz Et butonuna basınca bu panel otomatik dolacak.</div>';return;}
  all.forEach(r=>{r.sirket=bhdCompanyOfRow(r)});
  const companies=['GENEL','ÖMAS KONSEPT','ÖMAS OTOMASYON'];
  if(!companies.includes(company)) company='GENEL';
  window.bhdSelectedCompany=company;
  tabs.innerHTML=companies.map(c=>`<button type="button" class="${c===company?'active':''}" onclick="setBhdCompanyTab('${c}')">${c}</button>`).join('');
  const rows=bhdCompanyRows(company);
  const gelen=rows.reduce((s,r)=>s+Number(r.gelen||0),0), giden=rows.reduce((s,r)=>s+Number(r.giden||0),0), net=gelen-giden;
  const real=rows.filter(r=>Number(r.giden)>0 && (sameCategory(r.kategori,'Ticari İşlem') || r.analizTuru==='Gerçek Gider')).reduce((s,r)=>s+Number(r.giden||0),0);
  const inBy=bhdGroup(rows.filter(r=>Number(r.gelen)>0),r=>r.kisiFirma||r.aciklama,r=>r.gelen);
  const outBy=bhdGroup(rows.filter(r=>Number(r.giden)>0),r=>r.kisiFirma||r.aciklama,r=>r.giden);
  const catOut=bhdGroup(rows.filter(r=>Number(r.giden)>0),r=>r.kategori||'Diğer',r=>r.giden);
  const chains=bhdBuildFundingChains(rows).slice(0,8);
  const topIn=inBy[0]||['-',0], topOut=outBy[0]||['-',0];
  content.innerHTML=`
    <div class="bhd-company-kpis">
      <div class="bhd-company-kpi" onclick="bhdCompanyShowDetail('in')"><span>Şirkete Gelen Para</span><strong class="positive">${formatTL(gelen)}</strong><small>En büyük kaynak: ${escapeHtml(topIn[0])}</small></div>
      <div class="bhd-company-kpi" onclick="bhdCompanyShowDetail('out')"><span>Şirketten Giden Para</span><strong class="negative">${formatTL(giden)}</strong><small>En büyük çıkış: ${escapeHtml(topOut[0])}</small></div>
      <div class="bhd-company-kpi" onclick="bhdCompanyShowDetail('all')"><span>Net Nakit / Kâr Durumu</span><strong class="${net>=0?'positive':'negative'}">${formatTL(net)}</strong><small>${net>=0?'Bu şirket nakit olarak artıda.':'Bu şirket nakit olarak ekside.'}</small></div>
      <div class="bhd-company-kpi" onclick="bhdCompanyShowDetail('real')"><span>Gerçek Ticari Gider</span><strong class="negative">${formatTL(real)}</strong><small>Transfer ve finans dışı hareketlerden ayrıştırılmış gider.</small></div>
    </div>
    <div class="bhd-company-grid">
      <div class="bhd-company-card"><h4>Kimden Geldi?</h4>${bhdBarsHtml(inBy,'in')}</div>
      <div class="bhd-company-card"><h4>Kime Gitti?</h4>${bhdBarsHtml(outBy,'out')}</div>
      <div class="bhd-company-card"><h4>Gider Kategorileri</h4>${bhdBarsHtml(catOut,'out')}</div>
      <div class="bhd-company-card"><h4>Harcamayı Kim Finanse Etti?</h4><div class="bhd-flow-list">${chains.length?chains.map(ch=>`<div class="bhd-flow-item"><b>${escapeHtml(ch.row.kisiFirma||ch.row.aciklama||'Harcama')}</b> <span class="negative">${formatTL(ch.row.giden)}</span><small>${escapeHtml(ch.row.tarih||'')} • ${escapeHtml(ch.row.kategori||'')}</small><div class="bhd-flow-chain">${ch.parts.map(p=>`${escapeHtml(p.name)} → <strong>${formatTL(p.amount)}</strong>`).join('<br>')}</div></div>`).join(''):'<div class="bhd-company-empty">Gider hareketi yok.</div>'}</div></div>
    </div>
    <div id="bhdCompanyDetail" class="bhd-company-detail"><h4>Şirket Detayı</h4><div class="bhd-company-empty">Üstteki kutulara tıklayınca ilgili hareketler burada açılır.</div></div>`;
}
function bhdCompanyShowDetail(kind){
  const el=document.getElementById('bhdCompanyDetail'); if(!el) return;
  const company=window.bhdSelectedCompany||'GENEL';
  let rows=bhdCompanyRows(company), title='Tüm Hareketler';
  if(kind==='in'){rows=rows.filter(r=>Number(r.gelen)>0);title='Şirkete Gelen Para: Kimden geldi / hangi şirkete geldi';}
  else if(kind==='out'){rows=rows.filter(r=>Number(r.giden)>0);title='Şirketten Giden Para: Kime harcandı';}
  else if(kind==='real'){rows=rows.filter(r=>Number(r.giden)>0 && (sameCategory(r.kategori,'Ticari İşlem') || r.analizTuru==='Gerçek Gider'));title='Gerçek Ticari Gider Hareketleri';}
  const chains=bhdBuildFundingChains(bhdCompanyRows(company));
  const chainMap=new Map(chains.map(ch=>[ch.row.sira,ch.parts]));
  let html=`<h4>${escapeHtml(company)}  -  ${escapeHtml(title)} (${rows.length} hareket)</h4>`;
  if(!rows.length){html+='<div class="bhd-company-empty">Bu seçimde hareket yok.</div>';el.innerHTML=html;return;}
  html+='<div class="table-wrap"><table><thead><tr><th>Tarih</th><th>Şirket</th><th>Kimden / Kime</th><th>Kategori</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Finansman Kaynağı</th><th>Açıklama</th></tr></thead><tbody>';
  rows.sort((a,b)=>bhdDateVal(a)-bhdDateVal(b)).forEach(r=>{
    const parts=chainMap.get(r.sira)||[];
    html+=`<tr><td>${escapeHtml(r.tarih||'')}</td><td>${escapeHtml(r.sirket||'')}</td><td>${escapeHtml(r.kisiFirma||'')}</td><td>${escapeHtml(r.kategori||'')}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td>${r.giden?parts.map(p=>`${escapeHtml(p.name)}: ${formatTL(p.amount)}`).join('<br>'):'-'}</td><td>${escapeHtml(r.aciklama||'')}</td></tr>`;
  });
  html+='</tbody></table></div>'; el.innerHTML=html; el.scrollIntoView({behavior:'smooth',block:'start'});
}
