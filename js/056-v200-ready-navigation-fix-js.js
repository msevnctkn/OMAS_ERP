(function(){
  function activate(page){
    page=page||'analysis';
    try{if(typeof window.v189InvoiceLayout==='function')window.v189InvoiceLayout();}catch(e){}
    setTimeout(function(){
      document.querySelectorAll('#v189InvoiceSide [data-v189-page]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-v189-page')===page));
      document.querySelectorAll('#v189InvoiceMain .v189-page').forEach(p=>p.classList.remove('active'));
      const target=document.getElementById('v189Page'+page.charAt(0).toUpperCase()+page.slice(1));
      if(target)target.classList.add('active');
      if(page==='category'){
        try{if(typeof window.renderInvoiceCategoryAnalysis==='function'&&!window.__v200Cat){window.__v200Cat=true;window.renderInvoiceCategoryAnalysis();window.__v200Cat=false;}}catch(e){window.__v200Cat=false;}
        try{document.querySelectorAll('#v198CategoryOpsPanel,#v198CompanyAnalysisPanel,#v198MovedExpenseWrap').forEach(x=>x.remove());}catch(e){}
      }
    },60);
  }
  window.v189InvoiceSetPage=activate;
  document.addEventListener('click',function(e){const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page]');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();window.v189InvoiceSetPage(nav.getAttribute('data-v189-page'));},true);
})();
