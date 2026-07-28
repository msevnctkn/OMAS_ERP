(function(){
  const searchState={purchaseInvoiceTable:'',salesInvoiceTable:'',expenseReceiptTable:''};
  const labels={purchaseInvoiceTable:'Alış faturası ara',salesInvoiceTable:'Satış faturası ara',expenseReceiptTable:'Masraf fişi ara'};
  const placeholders={purchaseInvoiceTable:'Alış fatura no, firma veya kaynak yaz',salesInvoiceTable:'Satış fatura no, firma veya kaynak yaz',expenseReceiptTable:'Masraf kalemi, firma veya kaynak yaz'};
  function normalize(v){return String(v??'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function rowText(r){return normalize([r&&r.faturaNo,r&&r.firma,r&&r.kaynak,r&&r.tarih,r&&r.aciklama,r&&r.masrafKalemi,r&&r.tur].join(' '));}
  function boxId(tableId){return 'v202Search_'+tableId;}
  function inputId(tableId){return 'v202Input_'+tableId;}
  function ensureSearch(tableId){
    const table=document.getElementById(tableId), wrap=table&&table.closest('.table-wrap');
    if(!wrap)return;
    let box=document.getElementById(boxId(tableId));
    if(!box){
      box=document.createElement('div');
      box.id=boxId(tableId);
      box.className='v202-search-box';
      box.innerHTML=`<div><label>${labels[tableId]||'Ara'}</label><input id="${inputId(tableId)}" placeholder="${placeholders[tableId]||'Fatura no, firma veya kaynak yaz'}"><div class="v202-search-info">Arama yazınca bu tablo filtrelenir.</div></div><button class="v202-clear" type="button">Temizle</button>`;
      const title=wrap.previousElementSibling&&wrap.previousElementSibling.classList.contains('section-title')?wrap.previousElementSibling:wrap;
      wrap.parentNode.insertBefore(box,title);
      const input=box.querySelector('input');
      input.addEventListener('input',function(){searchState[tableId]=this.value||'';try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}});
      box.querySelector('button').addEventListener('click',function(){searchState[tableId]='';input.value='';try{if(typeof renderInvoiceDetailSections==='function')renderInvoiceDetailSections();}catch(e){}});
    }
    const input=box.querySelector('input');
    if(input&&input.value!==searchState[tableId])input.value=searchState[tableId]||'';
  }
  const prev=window.renderInvoiceDetailTable;
  window.renderInvoiceDetailTable=function(tableId,rows){
    if(searchState[tableId]){
      const q=normalize(searchState[tableId]);
      rows=(rows||[]).filter(r=>rowText(r).includes(q));
    }
    const result=prev?prev.call(this,tableId,rows):undefined;
    if(['purchaseInvoiceTable','salesInvoiceTable','expenseReceiptTable'].includes(tableId)){
      setTimeout(()=>{
        ensureSearch(tableId);
        const box=document.getElementById(boxId(tableId));
        const info=box&&box.querySelector('.v202-search-info');
        if(info&&searchState[tableId])info.textContent='Arama sonucu: '+((rows||[]).length)+' kayıt';
      },0);
    }
    return result;
  };
  function init(){['purchaseInvoiceTable','salesInvoiceTable','expenseReceiptTable'].forEach(ensureSearch);}
  document.addEventListener('DOMContentLoaded',init);setTimeout(init,300);setTimeout(init,1200);setTimeout(init,2500);
})();
