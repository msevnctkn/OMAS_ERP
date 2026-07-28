(function(){
  function hideDuplicateCategoryManager(){
    const oldBox=document.querySelector('#v191CategoryPanel > .v191-category-manager');
    if(oldBox)oldBox.style.display='none';
    const oldFlash=document.querySelector('#v191CategoryPanel > #v192CategoryFlash');
    if(oldFlash)oldFlash.style.display='none';
  }
  const oldRender=window.renderInvoiceCategoryAnalysis;
  if(typeof oldRender==='function'&&!oldRender.__v195HideDuplicate){
    window.renderInvoiceCategoryAnalysis=function(){const r=oldRender.apply(this,arguments);setTimeout(hideDuplicateCategoryManager,0);setTimeout(hideDuplicateCategoryManager,100);return r;};
    window.renderInvoiceCategoryAnalysis.__v195HideDuplicate=true;
  }
  const oldSet=window.v189InvoiceSetPage;
  if(typeof oldSet==='function'&&!oldSet.__v195HideDuplicate){
    window.v189InvoiceSetPage=function(){const r=oldSet.apply(this,arguments);setTimeout(hideDuplicateCategoryManager,0);setTimeout(hideDuplicateCategoryManager,100);return r;};
    window.v189InvoiceSetPage.__v195HideDuplicate=true;
  }
  document.addEventListener('DOMContentLoaded',hideDuplicateCategoryManager);
  setTimeout(hideDuplicateCategoryManager,100);setTimeout(hideDuplicateCategoryManager,800);setTimeout(hideDuplicateCategoryManager,1800);
})();
