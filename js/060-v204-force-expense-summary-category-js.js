(function(){
  function moveExpenseSummaryToCategory(){
    const content=document.getElementById('v189CategoryContent');
    const table=document.getElementById('expenseReceiptTable');
    if(!content||!table)return;
    let panel=document.getElementById('v204ExpenseSummaryPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='v204ExpenseSummaryPanel';
      panel.innerHTML='<h4>Masraf Fişleri Özeti</h4><small>Masraf fişleri kategori raporu altında gösterilir.</small><div id="v204ExpenseSummaryBody"></div>';
      content.appendChild(panel);
    }
    const body=document.getElementById('v204ExpenseSummaryBody');
    const wrap=table.closest('.table-wrap');
    const title=wrap&&wrap.previousElementSibling&&wrap.previousElementSibling.classList.contains('section-title')?wrap.previousElementSibling:null;
    if(title)title.remove();
    if(wrap&&!body.contains(wrap))body.appendChild(wrap);
  }
  function refresh(){setTimeout(moveExpenseSummaryToCategory,0);setTimeout(moveExpenseSummaryToCategory,250);}
  const oldSet=window.v189InvoiceSetPage;
  if(typeof oldSet==='function'&&!oldSet.__v204ExpenseMove){
    window.v189InvoiceSetPage=function(page){const r=oldSet.apply(this,arguments);if(page==='category')refresh();return r;};
    window.v189InvoiceSetPage.__v204ExpenseMove=true;
  }
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function'&&!oldRender.__v204ExpenseMove){
    window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);refresh();return r;};
    window.renderInvoiceProfitResults.__v204ExpenseMove=true;
  }
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="category"]'))refresh();},true);
  document.addEventListener('DOMContentLoaded',refresh);setTimeout(moveExpenseSummaryToCategory,800);setTimeout(moveExpenseSummaryToCategory,2000);
})();
