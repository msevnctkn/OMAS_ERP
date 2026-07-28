(function(){
  function restoreExpenseSummary(){
    const results=document.getElementById('invoiceAnalysisResults'),table=document.getElementById('expenseReceiptTable');if(!results||!table)return;
    let wrap=table.closest('.table-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='table-wrap';table.parentNode&&table.parentNode.insertBefore(wrap,table);wrap.appendChild(table);} 
    let holder=document.getElementById('v208ExpenseSummaryHome');if(!holder){holder=document.createElement('div');holder.id='v208ExpenseSummaryHome';holder.innerHTML='<h3 class="section-title">Masraf Fişleri Özeti</h3>';results.appendChild(holder);}if(!holder.contains(wrap))holder.appendChild(wrap);
    ['v204ExpenseSummaryPanel','v198MovedExpenseWrap'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  }
  function pulse(){setTimeout(restoreExpenseSummary,80);setTimeout(restoreExpenseSummary,320);setTimeout(restoreExpenseSummary,700);}
  const oldRender=window.renderInvoiceProfitResults;if(typeof oldRender==='function'&&!oldRender.__v209ExpenseStable){window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);pulse();return r;};window.renderInvoiceProfitResults.__v209ExpenseStable=true;}
  const oldSet=window.v189InvoiceSetPage;if(typeof oldSet==='function'&&!oldSet.__v209ExpenseStable){window.v189InvoiceSetPage=function(){const r=oldSet.apply(this,arguments);pulse();return r;};window.v189InvoiceSetPage.__v209ExpenseStable=true;}
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page]'))pulse();},true);
  document.addEventListener('DOMContentLoaded',pulse);setTimeout(pulse,1200);
})();
