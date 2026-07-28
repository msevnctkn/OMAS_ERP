(function(){
  window.v203InvoiceSearch='';
  function normalize(v){return String(v??'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function rowText(r){return normalize([r&&r.faturaNo,r&&r.firma,r&&r.kaynak,r&&r.tarih,r&&r.aciklama,r&&r.masrafKalemi,r&&r.tur].join(' '));}
  function ensureGlobalSearch(){
    const results=document.getElementById('invoiceAnalysisResults');
    if(!results)return;
    let box=document.getElementById('v203GlobalInvoiceSearch');
    if(!box){
      box=document.createElement('div');
      box.id='v203GlobalInvoiceSearch';
      box.innerHTML='<div><label>Fatura / masraf ara</label><input id="v203GlobalInvoiceInput" placeholder="Fatura no, firma, kaynak, tarih veya masraf kalemi yaz"><div id="v203GlobalInvoiceInfo">Tek arama; alış, satış ve masraf tablolarını birlikte filtreler.</div></div><button class="v203-clear" type="button" id="v203GlobalInvoiceClear">Temizle</button>';
      const detailPanel=results.querySelector('.invoice-detail-toggle-panel');
      if(detailPanel&&detailPanel.parentNode)detailPanel.parentNode.insertBefore(box,detailPanel.nextSibling);
      else results.insertBefore(box,results.firstChild);
      box.querySelector('#v203GlobalInvoiceInput').addEventListener('input',function(){window.v203InvoiceSearch=this.value||'';try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}});
      box.querySelector('#v203GlobalInvoiceClear').addEventListener('click',function(){window.v203InvoiceSearch='';box.querySelector('#v203GlobalInvoiceInput').value='';try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}});
    }
    const input=box.querySelector('#v203GlobalInvoiceInput');
    if(input&&input.value!==window.v203InvoiceSearch)input.value=window.v203InvoiceSearch||'';
    document.querySelectorAll('#v198PurchaseSearchBox,.v202-search-box').forEach(el=>el.remove());
  }
  const prev=window.renderInvoiceDetailTable;
  window.renderInvoiceDetailTable=function(tableId,rows){
    if(['purchaseInvoiceTable','salesInvoiceTable','expenseReceiptTable'].includes(tableId) && window.v203InvoiceSearch){
      const q=normalize(window.v203InvoiceSearch);
      rows=(rows||[]).filter(r=>rowText(r).includes(q));
    }
    const result=prev?prev.call(this,tableId,rows):undefined;
    if(['purchaseInvoiceTable','salesInvoiceTable','expenseReceiptTable'].includes(tableId)){
      setTimeout(()=>{
        ensureGlobalSearch();
        const info=document.getElementById('v203GlobalInvoiceInfo');
        if(info&&window.v203InvoiceSearch)info.textContent='Arama aktif: alış, satış ve masraf tabloları filtreleniyor.';
        else if(info)info.textContent='Tek arama; alış, satış ve masraf tablolarını birlikte filtreler.';
      },0);
    }
    return result;
  };
  function init(){ensureGlobalSearch();document.querySelectorAll('#v198PurchaseSearchBox,.v202-search-box').forEach(el=>el.remove());}
  document.addEventListener('DOMContentLoaded',init);setTimeout(init,300);setTimeout(init,1200);setTimeout(init,2500);
})();
