(function(){
  function refreshCategoryReports(){
    try{if(typeof window.v189InvoiceSetPage==='function'){const active=document.querySelector('#v189InvoiceSide [data-v189-page="category"].active');if(active&&typeof window.renderInvoiceProfitResults==='function')window.renderInvoiceProfitResults();}}
    catch(e){}
  }
  document.addEventListener('click',function(e){
    const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="category"]');
    if(nav)setTimeout(refreshCategoryReports,350);
  },true);
})();
