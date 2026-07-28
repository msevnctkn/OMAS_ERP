(function(){
  const COMPANIES=['ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'];
  function getArr(name){
    try{const v=(0,eval)(name); return Array.isArray(v)?v:[];}catch(e){return [];}
  }
  function getFn(name){
    try{const v=(0,eval)(name); return typeof v==='function'?v:null;}catch(e){return null;}
  }
  function fmt(v){
    v=Number(v||0);
    try{const f=getFn('invoiceFormatTL'); if(f) return f(v);}catch(e){}
    return v.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL';
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function pct(v,t){return t?Number(v||0)/Number(t||0)*100:0;}
  function matrah(r){return Number((r&&(r.matrah||r.net))||0);}
  function kdv(r){return Number((r&&r.kdv)||0);}
  function total(r){return Number((r&&r.toplam)||0);}
  function empty(name){return {name, salesMatrah:0,salesKdv:0,salesTotal:0,purchaseMatrah:0,purchaseKdv:0,purchaseTotal:0,expenseMatrah:0,expenseKdv:0,expenseTotal:0,salesCount:0,purchaseCount:0,expenseCount:0,totalMatrahOut:0,totalKdvOut:0,totalOut:0,brutKar:0,karMarji:0,kdvDagilim:0,harcamaPay:0};}
  function rowCompany(r){
    let c='';
    try{ if(typeof window.getInvoiceRowCompany==='function') c=window.getInvoiceRowCompany(r)||''; }catch(e){}
    if(!c && r && r.firmaSirket) c=r.firmaSirket;
    return COMPANIES.includes(c)?c:'SEÇİLMEDİ';
  }
  function validRows(side){
    const sourceRows=side==='Alış'?getArr('invoicePurchaseRows'):getArr('invoiceSalesRows');
    const special=[...getArr('invoiceReturnRows').filter(r=>r.tur===side),...getArr('invoiceTevkifatRows').filter(r=>r.tur===side),...getArr('invoiceIstisnaRows').filter(r=>r.tur===side)];
    const fn=getFn('invoiceMainSummaryRows');
    if(fn){try{return fn(sourceRows,special)||[];}catch(e){}}
    return sourceRows.filter(r=>!r.beyanHaric && !['İstisna','Tevkifat','İade'].includes(r.faturaAltTipi));
  }
  function reportDataV175(){
    try{ if(typeof window.saveInvoiceCompanySelections==='function') window.saveInvoiceCompanySelections(true); }catch(e){}
    const stats={}; COMPANIES.forEach(c=>stats[c]=empty(c));
    validRows('Satış').forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.salesMatrah+=matrah(r);s.salesKdv+=kdv(r);s.salesTotal+=total(r);s.salesCount++;});
    validRows('Alış').forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.purchaseMatrah+=matrah(r);s.purchaseKdv+=kdv(r);s.purchaseTotal+=total(r);s.purchaseCount++;});
    getArr('invoiceExpenseRows').forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.expenseMatrah+=matrah(r);s.expenseKdv+=kdv(r);s.expenseTotal+=total(r);s.expenseCount++;});
    const rows=COMPANIES.map(c=>{const s=stats[c];s.totalMatrahOut=s.purchaseMatrah+s.expenseMatrah;s.totalKdvOut=s.purchaseKdv+s.expenseKdv;s.totalOut=s.purchaseTotal+s.expenseTotal;s.brutKar=s.salesMatrah-s.purchaseMatrah-s.expenseMatrah;s.karMarji=s.salesMatrah?s.brutKar/s.salesMatrah*100:0;s.kdvDagilim=s.salesKdv-s.purchaseKdv-s.expenseKdv;return s;});
    const totals=empty('GENEL TOPLAM');
    rows.forEach(r=>['salesMatrah','salesKdv','salesTotal','purchaseMatrah','purchaseKdv','purchaseTotal','expenseMatrah','expenseKdv','expenseTotal','salesCount','purchaseCount','expenseCount'].forEach(k=>totals[k]+=Number(r[k]||0)));
    totals.totalMatrahOut=totals.purchaseMatrah+totals.expenseMatrah; totals.totalKdvOut=totals.purchaseKdv+totals.expenseKdv; totals.totalOut=totals.purchaseTotal+totals.expenseTotal; totals.brutKar=totals.salesMatrah-totals.purchaseMatrah-totals.expenseMatrah; totals.karMarji=totals.salesMatrah?totals.brutKar/totals.salesMatrah*100:0; totals.kdvDagilim=totals.salesKdv-totals.purchaseKdv-totals.expenseKdv;
    rows.forEach(r=>r.harcamaPay=pct(r.totalOut,totals.totalOut));
    const months=[...new Set([...getArr('invoicePurchaseRows'),...getArr('invoiceSalesRows'),...getArr('invoiceExpenseRows')].map(r=>r.ay).filter(Boolean))];
    return {rows,totals,period:months.length?months.join(', '):'Tüm dönem / mevcut hafıza'};
  }
  function bar(label,val,total){return `<div class="invoice-a4-bar-row"><div class="invoice-a4-bar-label">${esc(label)}</div><div class="invoice-a4-bar-wrap"><div class="invoice-a4-bar-fill" style="width:${Math.min(100,Math.max(0,pct(val,total))).toFixed(2)}%"></div></div><div class="invoice-a4-bar-val">%${pct(val,total).toFixed(1).replace('.',',')}</div></div>`;}
  function buildReportHtml(){
    const {rows,totals,period}=reportDataV175();
    const activeRows=rows.filter(r=>r.name!=='SEÇİLMEDİ' || (r.salesTotal+r.purchaseTotal+r.expenseTotal));
    const mostSale=[...rows].sort((a,b)=>b.salesMatrah-a.salesMatrah)[0]||empty('-');
    const mostExpense=[...rows].sort((a,b)=>b.totalOut-a.totalOut)[0]||empty('-');
    const bestProfit=[...rows].sort((a,b)=>b.brutKar-a.brutKar)[0]||empty('-');
    const konsept=rows.find(r=>r.name==='ÖMAS KONSEPT')||empty('ÖMAS KONSEPT');
    const oto=rows.find(r=>r.name==='ÖMAS OTOMASYON')||empty('ÖMAS OTOMASYON');
    const labels={salesMatrah:'Satış Matrahı',purchaseMatrah:'Alış Matrahı',expenseMatrah:'Masraf Matrahı',salesKdv:'Satış KDV',purchaseKdv:'Alış KDV',expenseKdv:'Masraf KDV',brutKar:'Brüt Kâr'};
    const compareRows=['salesMatrah','purchaseMatrah','expenseMatrah','salesKdv','purchaseKdv','expenseKdv','brutKar'].map(k=>`<tr><td>${labels[k]}</td><td class="amount">${fmt(konsept[k])}</td><td class="amount">${fmt(oto[k])}</td><td class="amount ${(konsept[k]-oto[k])>=0?'positive':'negative'}">${fmt(konsept[k]-oto[k])}</td></tr>`).join('');
    return `<div id="invoiceA4Sheet" class="invoice-a4-sheet">
      <div class="invoice-a4-title"><div><h2>Fatura Analizi Yönetici Raporu</h2><small>Firma seçimlerine göre satış, alış, masraf, matrah, KDV, brüt kâr ve kar marjı özeti.</small></div><div class="invoice-a4-period">Rapor Dönemi<br>${esc(period)}<br><span>${new Date().toLocaleDateString('tr-TR')}</span></div></div>
      <div class="invoice-a4-kpis">
        <div class="invoice-a4-kpi"><span>Toplam Satış Matrahı</span><strong>${fmt(totals.salesMatrah)}</strong></div>
        <div class="invoice-a4-kpi"><span>Toplam Alış + Masraf Matrahı</span><strong>${fmt(totals.totalMatrahOut)}</strong></div>
        <div class="invoice-a4-kpi"><span>Brüt Kâr</span><strong class="${totals.brutKar>=0?'positive':'negative'}">${fmt(totals.brutKar)}</strong></div>
        <div class="invoice-a4-kpi"><span>Kar Marjı</span><strong>%${totals.karMarji.toFixed(1).replace('.',',')}</strong></div>
        <div class="invoice-a4-kpi"><span>Satış KDV</span><strong>${fmt(totals.salesKdv)}</strong></div>
        <div class="invoice-a4-kpi"><span>Alış KDV</span><strong>${fmt(totals.purchaseKdv)}</strong></div>
        <div class="invoice-a4-kpi"><span>Masraf KDV</span><strong>${fmt(totals.expenseKdv)}</strong></div>
        <div class="invoice-a4-kpi"><span>Firma Bazlı KDV Farkı</span><strong class="${totals.kdvDagilim>=0?'negative':'positive'}">${fmt(totals.kdvDagilim)}</strong></div>
      </div>
      <div class="invoice-a4-card"><h4>Firma Bazlı Matrah / KDV / Kârlılık Tablosu</h4><div class="inner"><table class="invoice-a4-table"><thead><tr><th>Firma</th><th>Satış Matrah</th><th>Satış KDV</th><th>Alış Matrah</th><th>Alış KDV</th><th>Masraf Matrah</th><th>Masraf KDV</th><th>Brüt Kâr</th><th>Kar Marjı</th><th>KDV Dağılımı</th><th>Harcama %</th></tr></thead><tbody>
        ${activeRows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><br><small>${r.salesCount} satış / ${r.purchaseCount} alış / ${r.expenseCount} masraf</small></td><td class="amount">${fmt(r.salesMatrah)}</td><td class="amount">${fmt(r.salesKdv)}</td><td class="amount">${fmt(r.purchaseMatrah)}</td><td class="amount">${fmt(r.purchaseKdv)}</td><td class="amount">${fmt(r.expenseMatrah)}</td><td class="amount">${fmt(r.expenseKdv)}</td><td class="amount ${r.brutKar>=0?'positive':'negative'}">${fmt(r.brutKar)}</td><td class="amount">%${r.karMarji.toFixed(1).replace('.',',')}</td><td class="amount ${r.kdvDagilim>=0?'negative':'positive'}">${fmt(r.kdvDagilim)}</td><td class="amount">%${r.harcamaPay.toFixed(1).replace('.',',')}</td></tr>`).join('')}
        <tr style="background:#111827;color:#fff"><td><strong>GENEL TOPLAM</strong></td><td class="amount">${fmt(totals.salesMatrah)}</td><td class="amount">${fmt(totals.salesKdv)}</td><td class="amount">${fmt(totals.purchaseMatrah)}</td><td class="amount">${fmt(totals.purchaseKdv)}</td><td class="amount">${fmt(totals.expenseMatrah)}</td><td class="amount">${fmt(totals.expenseKdv)}</td><td class="amount">${fmt(totals.brutKar)}</td><td class="amount">%${totals.karMarji.toFixed(1).replace('.',',')}</td><td class="amount">${fmt(totals.kdvDagilim)}</td><td class="amount">%100</td></tr>
      </tbody></table></div></div>
      <div class="invoice-a4-grid">
        <div class="invoice-a4-card"><h4>Konsept / Otomasyon Karşılaştırması</h4><div class="inner"><table class="invoice-a4-table"><thead><tr><th>Gösterge</th><th>ÖMAS KONSEPT</th><th>ÖMAS OTOMASYON</th><th>Fark</th></tr></thead><tbody>${compareRows}</tbody></table></div></div>
        <div class="invoice-a4-card"><h4>Harcama ve KDV Dağılımı</h4><div class="inner"><div class="invoice-a4-bars">${activeRows.map(r=>bar(r.name,r.totalOut,totals.totalOut)).join('')}</div><div class="invoice-a4-note"><span class="invoice-a4-pill">En yüksek satış: ${esc(mostSale.name)}</span><span class="invoice-a4-pill">En yüksek gider: ${esc(mostExpense.name)}</span><span class="invoice-a4-pill">En kârlı: ${esc(bestProfit.name)}</span></div></div></div>
      </div>
      <div class="invoice-a4-note"><strong>Not:</strong> Matrah, KDV hariç tutardır. KDV dağılımı firma bazında <strong>Satış KDV - Alış KDV - Masraf KDV</strong> mantığıyla hesaplanır. Firma seçimi yapılmamış kayıtlar SEÇİLMEDİ altında gösterilir.</div>
    </div>`;
  }
  function ensureHiddenHost(){
    let host=document.getElementById('invoiceA4HiddenPrintHost');
    if(!host){host=document.createElement('div');host.id='invoiceA4HiddenPrintHost';document.body.appendChild(host);}
    return host;
  }
  window.renderInvoiceA4Report=function(){
    const host=ensureHiddenHost();
    host.innerHTML=buildReportHtml();
    return host.innerHTML;
  };
  window.printInvoiceA4Report=function(){
    const data=reportDataV175();
    if(!(data.totals.salesCount+data.totals.purchaseCount+data.totals.expenseCount)){alert('Rapor boş. Önce faturaları analiz et veya yıllık hafızada kayıt olduğundan emin ol.');return;}
    window.renderInvoiceA4Report();
    document.body.classList.add('print-invoice-a4');
    setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('print-invoice-a4'),500);},100);
  };
  window.exportInvoiceA4ReportExcel=function(){
    const data=reportDataV175();
    const rows=data.rows, totals=data.totals, period=data.period;
    if(!(totals.salesCount+totals.purchaseCount+totals.expenseCount)){alert('Excel raporu boş. Önce faturaları analiz et veya yıllık hafızada kayıt olduğundan emin ol.');return;}
    if(typeof XLSX==='undefined'){alert('Excel kütüphanesi yüklenemedi.');return;}
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Fatura Analizi Yönetici Raporu'],['Rapor Dönemi',period],[],['Gösterge','Tutar'],['Toplam Satış Matrahı',totals.salesMatrah],['Toplam Alış Matrahı',totals.purchaseMatrah],['Toplam Masraf Matrahı',totals.expenseMatrah],['Satış KDV',totals.salesKdv],['Alış KDV',totals.purchaseKdv],['Masraf KDV',totals.expenseKdv],['Brüt Kar',totals.brutKar],['Kar Marjı %',totals.karMarji],['Firma Bazlı KDV Farkı',totals.kdvDagilim]]),'Yönetici Özeti');
    const companyRows=rows.map(r=>({'Firma':r.name,'Satış Matrahı':r.salesMatrah,'Satış KDV':r.salesKdv,'Satış KDV Dahil':r.salesTotal,'Alış Matrahı':r.purchaseMatrah,'Alış KDV':r.purchaseKdv,'Alış KDV Dahil':r.purchaseTotal,'Masraf Matrahı':r.expenseMatrah,'Masraf KDV':r.expenseKdv,'Masraf KDV Dahil':r.expenseTotal,'Brüt Kar':r.brutKar,'Kar Marjı %':r.karMarji,'KDV Dağılımı':r.kdvDagilim,'Harcama %':r.harcamaPay,'Satış Adedi':r.salesCount,'Alış Adedi':r.purchaseCount,'Masraf Satırı':r.expenseCount}));
    companyRows.push({'Firma':'GENEL TOPLAM','Satış Matrahı':totals.salesMatrah,'Satış KDV':totals.salesKdv,'Satış KDV Dahil':totals.salesTotal,'Alış Matrahı':totals.purchaseMatrah,'Alış KDV':totals.purchaseKdv,'Alış KDV Dahil':totals.purchaseTotal,'Masraf Matrahı':totals.expenseMatrah,'Masraf KDV':totals.expenseKdv,'Masraf KDV Dahil':totals.expenseTotal,'Brüt Kar':totals.brutKar,'Kar Marjı %':totals.karMarji,'KDV Dağılımı':totals.kdvDagilim,'Harcama %':100,'Satış Adedi':totals.salesCount,'Alış Adedi':totals.purchaseCount,'Masraf Satırı':totals.expenseCount});
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(companyRows),'Firma Analizi');
    XLSX.writeFile(wb,'fatura_analizi_yonetici_raporu_v175.xlsx');
  };
  function wireButtons(){
    const reportBtn=document.getElementById('downloadInvoiceProfitBtn');
    if(reportBtn){reportBtn.textContent='Fatura Analizi Yönetici Raporu';reportBtn.disabled=false;reportBtn.onclick=function(e){e.preventDefault();window.printInvoiceA4Report();};}
    const actions=reportBtn&&reportBtn.parentNode;
    if(actions && !document.getElementById('invoiceA4ExcelBtnV175')){
      const excel=document.createElement('button');excel.id='invoiceA4ExcelBtnV175';excel.className='secondary-button';excel.type='button';excel.textContent="Yönetici Raporu Excel'e Aktar";excel.onclick=window.exportInvoiceA4ReportExcel;actions.insertBefore(excel, reportBtn.nextSibling);
    }
    const panel=document.getElementById('invoiceA4ReportPanel'); if(panel) panel.style.display='none';
  }
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function' && !oldRender.__v175Wrapped){
    const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(wireButtons,0);return r;};wrapped.__v175Wrapped=true;window.renderInvoiceProfitResults=wrapped;
  }
  document.addEventListener('DOMContentLoaded',wireButtons);
  setTimeout(wireButtons,300);setTimeout(wireButtons,1200);
})();
