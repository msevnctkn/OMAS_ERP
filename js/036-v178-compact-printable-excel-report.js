(function(){
  function n(v){return Math.round((Number(v||0)+Number.EPSILON)*100)/100;}
  function pct(v){return Math.round((Number(v||0)+Number.EPSILON)*100)/100;}
  function dateStr(){try{return new Date().toLocaleDateString('tr-TR');}catch(e){return '';}}
  function periodFromData(data){return (data&&data.period)||'FATURA RAPORU';}
  function getData(){
    if(typeof reportDataV175==='function') return reportDataV175();
    return {rows:[],totals:{},period:'FATURA RAPORU'};
  }
  function setNumFormats(ws){
    const range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
    for(let R=range.s.r;R<=range.e.r;R++){
      for(let C=range.s.c;C<=range.e.c;C++){
        const addr=XLSX.utils.encode_cell({r:R,c:C});
        const cell=ws[addr];
        if(!cell) continue;
        if(typeof cell.v==='number'){
          cell.t='n';
          const headerCell=ws[XLSX.utils.encode_cell({r:Math.max(0,R-1),c:C})];
          const h=String((headerCell&&headerCell.v)||'').toLocaleUpperCase('tr-TR');
          if(/%|MARJ|PAY/.test(h)) cell.z='0.0%';
          else cell.z='#,##0.00 [$₺-tr-TR]';
        }
      }
    }
  }
  function makeCompactSheet(data){
    const rows=(data.rows||[]).filter(r=>r.name!=='SEÇİLMEDİ' || ((r.salesTotal||0)+(r.purchaseTotal||0)+(r.expenseTotal||0)>0));
    const t=data.totals||{};
    const period=periodFromData(data);
    const out=[];
    out.push(['FATURA ANALİZİ YÖNETİCİ RAPORU','','','','','','','','','','','']);
    out.push(['Rapor Dönemi',period,'Rapor Tarihi',dateStr(),'','','','','','','','']);
    out.push([]);
    out.push(['YÖNETİCİ ÖZETİ','','','','','','','','','','','']);
    out.push(['Gösterge','Tutar','Gösterge','Tutar','Gösterge','Tutar','Gösterge','Tutar','','','','']);
    out.push(['Toplam Satış Matrahı',n(t.salesMatrah),'Toplam Alış Matrahı',n(t.purchaseMatrah),'Toplam Masraf Matrahı',n(t.expenseMatrah),'Brüt Kâr',n(t.brutKar),'','','','']);
    out.push(['Satış KDV',n(t.salesKdv),'Alış KDV',n(t.purchaseKdv),'Masraf KDV',n(t.expenseKdv),'Kar Marjı',Number(t.karMarji||0)/100,'','','','']);
    out.push(['Satış KDV Dahil',n(t.salesTotal),'Alış KDV Dahil',n(t.purchaseTotal),'Masraf KDV Dahil',n(t.expenseTotal),'Firma Bazlı KDV Farkı',n(t.kdvDagilim),'','','','']);
    out.push([]);
    out.push(['FİRMA ANALİZİ TABLOSU','','','','','','','','','','','']);
    out.push(['Firma','Satış Matrahı','Satış KDV','Alış Matrahı','Alış KDV','Masraf Matrahı','Masraf KDV','Brüt Kâr','Kar Marjı','KDV Farkı','Harcama Payı','İşlem Adedi']);
    rows.forEach(r=>out.push([
      r.name,
      n(r.salesMatrah),n(r.salesKdv),
      n(r.purchaseMatrah),n(r.purchaseKdv),
      n(r.expenseMatrah),n(r.expenseKdv),
      n(r.brutKar),Number(r.karMarji||0)/100,
      n(r.kdvDagilim),Number(r.harcamaPay||0)/100,
      Number(r.salesCount||0)+Number(r.purchaseCount||0)+Number(r.expenseCount||0)
    ]));
    out.push(['GENEL TOPLAM',n(t.salesMatrah),n(t.salesKdv),n(t.purchaseMatrah),n(t.purchaseKdv),n(t.expenseMatrah),n(t.expenseKdv),n(t.brutKar),Number(t.karMarji||0)/100,n(t.kdvDagilim),1,Number(t.salesCount||0)+Number(t.purchaseCount||0)+Number(t.expenseCount||0)]);
    out.push([]);
    out.push(['KONSEPT / OTOMASYON KARŞILAŞTIRMASI','','','','','','','','','','','']);
    const konsept=(data.rows||[]).find(r=>r.name==='ÖMAS KONSEPT')||{};
    const oto=(data.rows||[]).find(r=>r.name==='ÖMAS OTOMASYON')||{};
    out.push(['Gösterge','ÖMAS KONSEPT','ÖMAS OTOMASYON','Fark','','','','','','','','']);
    [
      ['Satış Matrahı','salesMatrah'],['Satış KDV','salesKdv'],['Alış Matrahı','purchaseMatrah'],['Alış KDV','purchaseKdv'],['Masraf Matrahı','expenseMatrah'],['Masraf KDV','expenseKdv'],['Brüt Kâr','brutKar'],['KDV Farkı','kdvDagilim']
    ].forEach(([label,key])=>out.push([label,n(konsept[key]),n(oto[key]),n((konsept[key]||0)-(oto[key]||0)),'','','','','','','','']));
    out.push([]);
    out.push(['NOT','Matrah KDV hariç tutardır. KDV Farkı = Satış KDV - Alış KDV - Masraf KDV. Bu sayfa A4 yatay yazdırma için kompakt tablo düzeninde hazırlanmıştır.','','','','','','','','','','']);
    const ws=XLSX.utils.aoa_to_sheet(out);
    ws['!cols']=[
      {wch:24},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:14},{wch:10},{wch:14},{wch:11},{wch:11}
    ];
    ws['!merges']=[
      {s:{r:0,c:0},e:{r:0,c:11}},
      {s:{r:3,c:0},e:{r:3,c:11}},
      {s:{r:9,c:0},e:{r:9,c:11}},
      {s:{r:12+rows.length,c:0},e:{r:12+rows.length,c:11}},
      {s:{r:24+rows.length,c:1},e:{r:24+rows.length,c:11}}
    ];
    ws['!rows']=[{hpt:24},{hpt:18},{hpt:8},{hpt:20},{hpt:18},{hpt:18},{hpt:18},{hpt:18},{hpt:8},{hpt:20}];
    ws['!autofilter']={ref:'A11:L'+(12+rows.length)};
    ws['!margins']={left:0.25,right:0.25,top:0.45,bottom:0.45,header:0.2,footer:0.2};
    ws['!pageSetup']={orientation:'landscape',fitToWidth:1,fitToHeight:1,paperSize:9};
    setNumFormats(ws);
    return ws;
  }
  window.exportInvoiceA4ReportExcel=function(){
    const data=getData();
    const t=data.totals||{};
    if(!((Number(t.salesCount||0)+Number(t.purchaseCount||0)+Number(t.expenseCount||0))>0)){
      alert('Excel raporu boş. Önce faturaları analiz et veya yıllık hafızada kayıt olduğundan emin ol.');
      return;
    }
    if(typeof XLSX==='undefined'){alert('Excel kütüphanesi yüklenemedi.');return;}
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,makeCompactSheet(data),'A4 Yönetici Raporu');
    XLSX.writeFile(wb,'fatura_analizi_yonetici_raporu_tablo.xlsx');
  };
  function wireV178(){
    const excel=document.getElementById('invoiceA4ExcelBtnV175');
    if(excel){excel.textContent="Tablo Excel Raporu";excel.onclick=window.exportInvoiceA4ReportExcel;}
  }
  document.addEventListener('DOMContentLoaded',wireV178);
  setTimeout(wireV178,300);setTimeout(wireV178,1200);setTimeout(wireV178,2500);
})();
