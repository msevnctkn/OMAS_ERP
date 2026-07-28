(function(){
  const COMPANIES=['ÖMAS KONSEPT','ÖMAS OTOMASYON','ORTAK','SEÇİLMEDİ'];
  function g(name, fallback){
    try{ const v=(0,eval)(name); return v==null?fallback:v; }catch(e){ return fallback; }
  }
  function arr(name){ const v=g(name,[]); return Array.isArray(v)?v:[]; }
  function n(v){
    if(typeof v==='number') return isFinite(v)?v:0;
    if(v==null) return 0;
    let s=String(v).trim().replace(/\s/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s=s.replace(',','.');
    s=s.replace(/[^0-9.\-]/g,'');
    const x=Number(s); return isFinite(x)?x:0;
  }
  function money(v){ return n(v); }
  function fmt(v){
    try{return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n(v));}
    catch(e){return String(n(v).toFixed(2));}
  }
  function pct(v){return n(v);}
  function normalizeCompany(c){
    c=String(c||'').trim().toUpperCase();
    if(c.includes('KONSEPT')) return 'ÖMAS KONSEPT';
    if(c.includes('OTOMASYON')) return 'ÖMAS OTOMASYON';
    if(c.includes('ORTAK')) return 'ORTAK';
    if(COMPANIES.includes(c)) return c;
    return 'SEÇİLMEDİ';
  }
  function rowCompany(r){
    let c='';
    try{ const f=g('getInvoiceRowCompany',null); if(typeof f==='function') c=f(r)||''; }catch(e){}
    if(!c && r){ c=r.firmaSirket||r.sirket||r.company||r.firmaSecim||r.firmaSeçim||''; }
    return normalizeCompany(c);
  }
  function isExcluded(r){
    if(!r) return true;
    const tip=String(r.faturaAltTipi||r.altTip||r.tip||'').toUpperCase();
    if(r.beyanHaric || r.hesapDisi || r.excluded) return true;
    if(tip.includes('İSTİSNA') || tip.includes('ISTISNA') || tip.includes('TEVKİFAT') || tip.includes('TEVKIFAT') || tip.includes('İADE') || tip.includes('IADE')) return true;
    return false;
  }
  function mainRows(side){
    const base=side==='Alış'?arr('invoicePurchaseRows'):arr('invoiceSalesRows');
    try{
      const mainFn=g('invoiceMainSummaryRows',null);
      if(typeof mainFn==='function'){
        const specials=[...arr('invoiceReturnRows').filter(r=>r.tur===side),...arr('invoiceTevkifatRows').filter(r=>r.tur===side),...arr('invoiceIstisnaRows').filter(r=>r.tur===side)];
        const x=mainFn(base,specials);
        if(Array.isArray(x)) return x;
      }
    }catch(e){}
    return base.filter(r=>!isExcluded(r));
  }
  function rowMatrah(r){ return n(r && (r.matrah ?? r.net ?? r.kdvMatrah ?? r.tutarKdvHaric ?? 0)); }
  function rowKdv(r){ return n(r && (r.kdv ?? r.kdvTutari ?? r.kdvTutar ?? 0)); }
  function rowTotal(r){
    const t=n(r && (r.toplam ?? r.kdvDahil ?? r.genelToplam ?? r.tutar ?? 0));
    if(t) return t;
    return rowMatrah(r)+rowKdv(r);
  }
  function empty(name){return {name,salesMatrah:0,salesKdv:0,salesTotal:0,purchaseMatrah:0,purchaseKdv:0,purchaseTotal:0,expenseMatrah:0,expenseKdv:0,expenseTotal:0,salesCount:0,purchaseCount:0,expenseCount:0};}
  function detectPeriod(rows){
    const months=[...new Set(rows.map(r=>String(r.ay||r.month||'').trim()).filter(Boolean))];
    if(months.length===1) return months[0]+' 2026';
    if(months.length>1) return months.join(' - ')+' 2026';
    const sources=[...new Set(rows.map(r=>String(r.kaynak||'')).filter(Boolean))].join(' ');
    const m=sources.match(/(OCAK|ŞUBAT|SUBAT|MART|NİSAN|NISAN|MAYIS|HAZİRAN|HAZIRAN|TEMMUZ|AĞUSTOS|AGUSTOS|EYLÜL|EYLUL|EKİM|EKIM|KASIM|ARALIK)/i);
    return m?(m[1].toUpperCase()+' 2026'):'FATURA ANALİZ RAPORU';
  }
  function reportDataV177(){
    const stats={}; COMPANIES.forEach(c=>stats[c]=empty(c));
    const sales=mainRows('Satış');
    const purchases=mainRows('Alış');
    const expenses=arr('invoiceExpenseRows').filter(r=>!isExcluded(r));
    sales.forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.salesMatrah+=rowMatrah(r);s.salesKdv+=rowKdv(r);s.salesTotal+=rowTotal(r);s.salesCount++;});
    purchases.forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.purchaseMatrah+=rowMatrah(r);s.purchaseKdv+=rowKdv(r);s.purchaseTotal+=rowTotal(r);s.purchaseCount++;});
    expenses.forEach(r=>{const s=stats[rowCompany(r)]||stats['SEÇİLMEDİ'];s.expenseMatrah+=rowMatrah(r);s.expenseKdv+=rowKdv(r);s.expenseTotal+=rowTotal(r);s.expenseCount++;});
    const rows=COMPANIES.map(c=>{
      const s=stats[c];
      s.totalMatrahOut=s.purchaseMatrah+s.expenseMatrah;
      s.totalKdvOut=s.purchaseKdv+s.expenseKdv;
      s.totalOut=s.purchaseTotal+s.expenseTotal;
      s.brutKar=s.salesMatrah-s.purchaseMatrah-s.expenseMatrah;
      s.karMarji=s.salesMatrah?(s.brutKar/s.salesMatrah*100):0;
      s.kdvDagilim=s.salesKdv-s.purchaseKdv-s.expenseKdv;
      return s;
    });
    const totals=empty('GENEL TOPLAM');
    rows.forEach(r=>['salesMatrah','salesKdv','salesTotal','purchaseMatrah','purchaseKdv','purchaseTotal','expenseMatrah','expenseKdv','expenseTotal','salesCount','purchaseCount','expenseCount'].forEach(k=>totals[k]+=n(r[k])));
    totals.totalMatrahOut=totals.purchaseMatrah+totals.expenseMatrah;
    totals.totalKdvOut=totals.purchaseKdv+totals.expenseKdv;
    totals.totalOut=totals.purchaseTotal+totals.expenseTotal;
    totals.brutKar=totals.salesMatrah-totals.purchaseMatrah-totals.expenseMatrah;
    totals.karMarji=totals.salesMatrah?(totals.brutKar/totals.salesMatrah*100):0;
    totals.kdvDagilim=totals.salesKdv-totals.purchaseKdv-totals.expenseKdv;
    rows.forEach(r=>r.harcamaPay=totals.totalOut?(r.totalOut/totals.totalOut*100):0);
    return {rows,totals,period:detectPeriod([...sales,...purchases,...expenses])};
  }
  function setCols(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}
  function aoaSheet(aoa,widths){const ws=XLSX.utils.aoa_to_sheet(aoa);if(widths)setCols(ws,widths);return ws;}
  function buildSummarySheet(data){
    const t=data.totals;
    const aoa=[
      ['FATURA ANALİZİ YÖNETİCİ RAPORU'],['Rapor Dönemi',data.period],['Rapor Tarihi',new Date().toLocaleDateString('tr-TR')],[],
      ['GENEL ÖZET','Tutar'],
      ['Toplam Satış Matrahı',money(t.salesMatrah)],['Toplam Alış Matrahı',money(t.purchaseMatrah)],['Toplam Masraf Matrahı',money(t.expenseMatrah)],
      ['Satış KDV',money(t.salesKdv)],['Alış KDV',money(t.purchaseKdv)],['Masraf KDV',money(t.expenseKdv)],
      ['Brüt Kar',money(t.brutKar)],['Kar Marjı %',pct(t.karMarji)],['Firma Bazlı KDV Farkı',money(t.kdvDagilim)],[],
      ['FİRMA','Satış Matrahı','Alış + Masraf Matrahı','Brüt Kar','Kar Marjı %','KDV Farkı','Harcama %']
    ];
    data.rows.forEach(r=>aoa.push([r.name,money(r.salesMatrah),money(r.purchaseMatrah+r.expenseMatrah),money(r.brutKar),pct(r.karMarji),money(r.kdvDagilim),pct(r.harcamaPay)]));
    aoa.push(['GENEL TOPLAM',money(t.salesMatrah),money(t.purchaseMatrah+t.expenseMatrah),money(t.brutKar),pct(t.karMarji),money(t.kdvDagilim),100]);
    return aoaSheet(aoa,[26,18,22,18,14,18,14]);
  }
  function buildCompanySheet(data){
    const t=data.totals;
    const aoa=[
      [null,'SATIŞ',null,null,'ALIŞ',null,null,null,'MASRAF',null,null,'KAR',null,null,'SATIŞ/ALIŞ/MASRAF ADETLERİ',null,null],
      ['Firma','Satış Matrahı','Satış KDV','Satış KDV Dahil','Alış Matrahı','Alış KDV','Alış KDV Dahil','Harcama %','Masraf Matrahı','Masraf KDV','Masraf KDV Dahil','Net Kar','Ödenecek KDV','Kar Marjı %','Satış Adedi','Alış Adedi','Masraf Satırı']
    ];
    data.rows.forEach(r=>aoa.push([r.name,money(r.salesMatrah),money(r.salesKdv),money(r.salesTotal),money(r.purchaseMatrah),money(r.purchaseKdv),money(r.purchaseTotal),pct(r.harcamaPay),money(r.expenseMatrah),money(r.expenseKdv),money(r.expenseTotal),money(r.brutKar),money(r.kdvDagilim),pct(r.karMarji),n(r.salesCount),n(r.purchaseCount),n(r.expenseCount)]));
    aoa.push(['GENEL TOPLAM',money(t.salesMatrah),money(t.salesKdv),money(t.salesTotal),money(t.purchaseMatrah),money(t.purchaseKdv),money(t.purchaseTotal),100,money(t.expenseMatrah),money(t.expenseKdv),money(t.expenseTotal),money(t.brutKar),money(t.kdvDagilim),pct(t.karMarji),n(t.salesCount),n(t.purchaseCount),n(t.expenseCount)]);
    const ws=aoaSheet(aoa,[20,16,14,16,16,14,16,12,16,14,16,16,16,13,14,12,13]);
    ws['!merges']=[{s:{r:0,c:1},e:{r:0,c:3}},{s:{r:0,c:4},e:{r:0,c:7}},{s:{r:0,c:8},e:{r:0,c:10}},{s:{r:0,c:11},e:{r:0,c:13}},{s:{r:0,c:14},e:{r:0,c:16}}];
    return ws;
  }
  window.exportInvoiceMayisTemplateReport=function(){
    const data=reportDataV177();
    const t=data.totals;
    if(!(n(t.salesCount)+n(t.purchaseCount)+n(t.expenseCount))){
      console.log('V177 rapor veri durumu', {sales:arr('invoiceSalesRows').length,purchase:arr('invoicePurchaseRows').length,expense:arr('invoiceExpenseRows').length, data});
      alert('Rapor boş görünüyor. Analiz satırları okunamadı. Faturaları Analiz Et butonundan sonra oluşan ekranda satır görünüyor mu kontrol et.');
      return;
    }
    if(typeof XLSX==='undefined'){alert('Excel kütüphanesi yüklenemedi.');return;}
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,buildSummarySheet(data),'Yönetici Özeti');
    XLSX.utils.book_append_sheet(wb,buildCompanySheet(data),'Firma Analizi');
    const safe=String(data.period||'RAPOR').replace(/[\\/:*?"<>|]/g,' ').trim()||'RAPOR';
    XLSX.writeFile(wb,safe+' FATURA ANALIZ RAPORU.xlsx');
  };
  window.exportInvoiceA4ReportExcel=window.exportInvoiceMayisTemplateReport;
  window.downloadInvoiceProfitReport=window.exportInvoiceMayisTemplateReport;
  function wire(){
    const btn=document.getElementById('downloadInvoiceProfitBtn');
    if(btn){btn.disabled=false;btn.textContent='Fatura Analizi Yönetici Raporu';btn.onclick=function(e){e.preventDefault();window.exportInvoiceMayisTemplateReport();};}
    const excel=document.getElementById('invoiceA4ExcelBtnV175'); if(excel) excel.style.display='none';
    const panel=document.getElementById('invoiceA4ReportPanel'); if(panel) panel.style.display='none';
  }
  const oldRender=g('renderInvoiceProfitResults',null);
  if(typeof oldRender==='function' && !oldRender.__v177Wrapped){
    const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(wire,0);setTimeout(wire,300);return r;};
    wrapped.__v177Wrapped=true;
    window.renderInvoiceProfitResults=wrapped;
  }
  document.addEventListener('DOMContentLoaded',wire);
  setTimeout(wire,100);setTimeout(wire,700);setTimeout(wire,1500);
})();
