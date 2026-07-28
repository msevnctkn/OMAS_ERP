(function(){
  function removeDuplicateCategoryManager(){
    document.querySelectorAll('#v191CategoryPanel > .v191-category-manager, #v191CategoryPanel > #v192CategoryFlash').forEach(el=>el.remove());
    document.querySelectorAll('#invoiceCategoryToolbar, #invoiceCategoryManager').forEach(el=>el.remove());
  }
  const oldRender=window.renderInvoiceCategoryAnalysis;
  if(typeof oldRender==='function'&&!oldRender.__v196RemoveDuplicate){
    window.renderInvoiceCategoryAnalysis=function(){const r=oldRender.apply(this,arguments);setTimeout(removeDuplicateCategoryManager,0);setTimeout(removeDuplicateCategoryManager,100);return r;};
    window.renderInvoiceCategoryAnalysis.__v196RemoveDuplicate=true;
  }
  const oldSet=window.v189InvoiceSetPage;
  if(typeof oldSet==='function'&&!oldSet.__v196RemoveDuplicate){
    window.v189InvoiceSetPage=function(){const r=oldSet.apply(this,arguments);setTimeout(removeDuplicateCategoryManager,0);setTimeout(removeDuplicateCategoryManager,100);return r;};
    window.v189InvoiceSetPage.__v196RemoveDuplicate=true;
  }
  document.addEventListener('DOMContentLoaded',removeDuplicateCategoryManager);
  setTimeout(removeDuplicateCategoryManager,100);setTimeout(removeDuplicateCategoryManager,800);setTimeout(removeDuplicateCategoryManager,1800);
})();
