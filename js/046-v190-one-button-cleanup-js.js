(function(){
  function renameProfitCard(){
    const grid=document.getElementById('invoiceProfitExpenseGrid');
    const card=grid&&grid.closest('.upload-area');
    const title=card&&card.querySelector(':scope > strong');
    if(title) title.textContent='Kar Giderleri';
  }
  function clean(){renameProfitCard();}
  document.addEventListener('DOMContentLoaded',clean);
  setTimeout(clean,100);setTimeout(clean,800);setTimeout(clean,1800);
  const oldLayout=window.v189InvoiceLayout;
  if(typeof oldLayout==='function'&&!oldLayout.__v190Clean){
    window.v189InvoiceLayout=function(){const r=oldLayout.apply(this,arguments);setTimeout(clean,0);return r;};
    window.v189InvoiceLayout.__v190Clean=true;
  }
})();
