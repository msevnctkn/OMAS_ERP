(function(){
  function money(v){return Math.round((Number(v||0)+Number.EPSILON)*100)/100;}
  function pct(v){return Math.round((Number(v||0)+Number.EPSILON)*100)/100;}
  function safePeriod(){
    try{
      const d=(typeof reportDataV175==='function')?reportDataV175():null;
      if(d && d.period) return d.period;
    }catch(e){}
    const rows=[...(window.invoicePurchaseRows||[]),...(window.invoiceSalesRows||[]),...(window.invoiceExpenseRows||[])];
    const months=[...new Set(rows.map(r=>r&&r.ay).filter(Boolean))];
    return months.length?months.join(' / '):'RAPOR';
  }
  function getReportData(){
    if(typeof window.reportDataV175==='function') return window.reportDataV175();
    if(typeof reportDataV175==='function') return reportDataV175();
    return {rows:[],totals:{},period:safePeriod()};
  }
  function makeRows(){
    const data=getReportData();
    const rows=(data.rows||[]).slice();
    const order=['ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'];
    const by={}; rows.forEach(r=>by[r.name]=r);
    return order.map(n=>by[n]||{name:n,salesMatrah:0,salesKdv:0,salesTotal:0,purchaseMatrah:0,purchaseKdv:0,purchaseTotal:0,expenseMatrah:0,expenseKdv:0,expenseTotal:0,brutKar:0,kdvDagilim:0,karMarji:0,harcamaPay:0,salesCount:0,purchaseCount:0,expenseCount:0,totalOut:0});
  }
  function setCols(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}
  function addStylePlaceholders(ws){
    // SheetJS açık kaynak sürümünde stil desteği sınırlı olabilir; yine de okuyan uygulamalar için temel stil objeleri bırakılır.
    Object.keys(ws).forEach(a=>{
      if(a[0]==='!') return;
      const r=Number(a.replace(/[A-Z]/g,''));
      ws[a].s=ws[a].s||{};
      if(r===1 || r===4 || r===2){ws[a].s.font={bold:true};}
    });
  }
  function buildSummarySheet(data){
    const t=data.totals||{};
    const aoa=[
      ['Fatura Analizi Yönetici Raporu'],
      ['Rapor Dönemi',data.period||safePeriod()],
      [],
      ['Gösterge','Tutar'],
      ['Toplam Satış Matrahı',money(t.salesMatrah)],
      ['Toplam Alış Matrahı',money(t.purchaseMatrah)],
      ['Toplam Masraf Matrahı',money(t.expenseMatrah)],
      ['Satış KDV',money(t.salesKdv)],
      ['Alış KDV',money(t.purchaseKdv)],
      ['Masraf KDV',money(t.expenseKdv)],
      ['Brüt Kar',money(t.brutKar)],
      ['Kar Marjı %',pct(t.karMarji)],
      ['Firma Bazlı KDV Farkı',money(t.kdvDagilim)]
    ];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    setCols(ws,[34,18]);
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:1}}];
    addStylePlaceholders(ws);
    return ws;
  }
  function buildCompanySheet(data){
    const rows=makeRows();
    const t=data.totals||{};
    const aoa=[
      [null,'SATIŞ',null,null,'ALIŞ',null,null,null,'MASRAF',null,null,'KAR',null,null,'SATIŞ/ALIŞ/MASRAF ADETLERİ',null,null],
      ['Firma','Satış Matrahı','Satış KDV','Satış KDV Dahil','Alış Matrahı','Alış KDV','Alış KDV Dahil','Harcama %','Masraf Matrahı','Masraf KDV','Masraf KDV Dahil','Net Kar','Ödenecek KDV','Kar Marjı %','Satış Adedi','Alış Adedi','Masraf Satırı']
    ];
    rows.forEach(r=>aoa.push([
      r.name,
      money(r.salesMatrah),money(r.salesKdv),money(r.salesTotal),
      money(r.purchaseMatrah),money(r.purchaseKdv),money(r.purchaseTotal),pct(r.harcamaPay),
      money(r.expenseMatrah),money(r.expenseKdv),money(r.expenseTotal),
      money(r.brutKar),money(r.kdvDagilim),pct(r.karMarji),
      Number(r.salesCount||0),Number(r.purchaseCount||0),Number(r.expenseCount||0)
    ]));
    aoa.push([
      'GENEL TOPLAM',money(t.salesMatrah),money(t.salesKdv),money(t.salesTotal),
      money(t.purchaseMatrah),money(t.purchaseKdv),money(t.purchaseTotal),100,
      money(t.expenseMatrah),money(t.expenseKdv),money(t.expenseTotal),
      money(t.brutKar),money(t.kdvDagilim),pct(t.karMarji),
      Number(t.salesCount||0),Number(t.purchaseCount||0),Number(t.expenseCount||0)
    ]);
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    setCols(ws,[20,16,14,16,16,14,16,12,16,14,16,16,16,13,14,12,13]);
    ws['!merges']=[
      {s:{r:0,c:1},e:{r:0,c:3}},
      {s:{r:0,c:4},e:{r:0,c:7}},
      {s:{r:0,c:8},e:{r:0,c:10}},
      {s:{r:0,c:11},e:{r:0,c:13}},
      {s:{r:0,c:14},e:{r:0,c:16}}
    ];
    addStylePlaceholders(ws);
    return ws;
  }
  window.exportInvoiceMayisTemplateReport=function(){
    const data=getReportData();
    const totals=data.totals||{};
    if(!(Number(totals.salesCount||0)+Number(totals.purchaseCount||0)+Number(totals.expenseCount||0))){
      alert('Rapor boş. Önce faturaları analiz et veya yıllık hafızada kayıt olduğundan emin ol.');
      return;
    }
    if(typeof XLSX==='undefined'){alert('Excel kütüphanesi yüklenemedi.');return;}
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,buildSummarySheet(data),'Yönetici Özeti');
    XLSX.utils.book_append_sheet(wb,buildCompanySheet(data),'Firma Analizi');
    const period=String(data.period||safePeriod()||'RAPOR').replace(/[\/:*?"<>|]/g,' ').trim()||'RAPOR';
    XLSX.writeFile(wb,period+' FATURA ANALIZ RAPORU.xlsx');
  };
  // Bundan sonra hem eski Excel butonu hem ana rapor butonu Mayıs 2026 rapor şablonuyla dosya üretir.
  window.exportInvoiceA4ReportExcel=window.exportInvoiceMayisTemplateReport;
  function wireV176(){
    const reportBtn=document.getElementById('downloadInvoiceProfitBtn');
    if(reportBtn){
      reportBtn.textContent='Fatura Analizi Yönetici Raporu';
      reportBtn.disabled=false;
      reportBtn.onclick=function(e){e.preventDefault();window.exportInvoiceMayisTemplateReport();};
    }
    const excel=document.getElementById('invoiceA4ExcelBtnV175');
    if(excel){excel.textContent="Mayıs Şablonu Excel'e Aktar";excel.onclick=window.exportInvoiceMayisTemplateReport;}
  }
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function' && !oldRender.__v176MayisWrapped){
    const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(wireV176,0);setTimeout(wireV176,300);return r;};
    wrapped.__v176MayisWrapped=true;
    window.renderInvoiceProfitResults=wrapped;
  }
  document.addEventListener('DOMContentLoaded',wireV176);
  setTimeout(wireV176,250);setTimeout(wireV176,1200);
})();
