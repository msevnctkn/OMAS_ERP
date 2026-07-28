(function(){
  let activePage='analysis';
  let wired=false;
  function byId(id){return document.getElementById(id);}
  function uploadOf(id){const el=byId(id);return el?el.closest('.upload-area'):null;}
  function hasInvoiceAnalysis(){
    try{return !!((invoicePurchaseRows&&invoicePurchaseRows.length)||(invoiceSalesRows&&invoiceSalesRows.length)||(invoiceExpenseRows&&invoiceExpenseRows.length)||(invoiceExcludedRows&&invoiceExcludedRows.length));}
    catch(e){return false;}
  }
  function makeShell(){
    const module=byId('invoiceAnalysisModule');
    const box=module&&module.querySelector('.module-box');
    if(!box)return;
    if(byId('v189InvoiceShell'))return;
    const shell=document.createElement('div');
    shell.id='v189InvoiceShell';
    shell.innerHTML=`
      <aside id="v189InvoiceSide">
        <div class="v189-side-title">Fatura Modülü</div>
        <button type="button" data-v189-page="analysis">Fatura Analiz</button>
        <button type="button" data-v189-page="expenses">Giderler</button>
        <button type="button" data-v189-page="categorize">Fatura Kalemlerini Kategorile</button>
        <button type="button" data-v189-page="category">Kategori Raporu</button>
      </aside>
      <main id="v189InvoiceMain">
        <section id="v189PageAnalysis" class="v189-page"><div class="v189-page-head"><h3>Fatura Analiz</h3><span>Tek analiz butonu</span></div><div id="v189UploadGrid" class="v189-upload-grid"></div></section>
        <section id="v189PageExpenses" class="v189-page"><div class="v189-page-head"><h3>Giderler</h3><span>Otomatik kaydeder</span></div><div id="v189ExpenseSaveNote">Giderler kaydedildi, analiz güncellendi.</div><div id="v189ExpenseGrid" class="v189-expense-grid"></div></section>
        <section id="v189PageCategory" class="v189-page"><div class="v189-page-head"><h3>Kategori Raporu</h3><span>Fatura analizi sonrası dolar</span></div><div id="v189CategoryEmpty">Önce Fatura Analiz sayfasından faturaları analiz et.</div><div id="v189CategoryContent"></div></section>
      </main>`;
    const title=box.querySelector('.module-title');
    if(title&&title.parentNode)title.parentNode.insertBefore(shell,title.nextSibling); else box.insertBefore(shell,box.firstChild);
    shell.addEventListener('click',function(e){const btn=e.target.closest('[data-v189-page]');if(!btn)return;setPage(btn.getAttribute('data-v189-page'));});
  }
  function moveAnalysis(){
    const page=byId('v189PageAnalysis'),grid=byId('v189UploadGrid'); if(!page||!grid)return;
    const module=byId('invoiceAnalysisModule');
    const info=module&&module.querySelector('.module-box > .info-box'); if(info)info.classList.add('v189-muted-panel');
    ['purchaseInvoiceFiles','salesInvoiceFiles','expenseReceiptFiles','giderPusulasiAmount'].forEach(id=>{const card=uploadOf(id);if(card&&!grid.contains(card))grid.appendChild(card);});
    const actions=[...document.querySelectorAll('#invoiceAnalysisModule .actions')].find(a=>a.querySelector('[onclick="analyzeInvoiceProfit()"]'));
    if(actions&&!page.contains(actions))page.appendChild(actions);
    const status=byId('invoiceAnalysisStatus'); if(status&&!page.contains(status))page.appendChild(status);
    const results=byId('invoiceAnalysisResults'); if(results&&!page.contains(results))page.appendChild(results);
  }
  function moveExpenses(){
    const grid=byId('v189ExpenseGrid'); if(!grid)return;
    ['invoiceCommissionGrid','invoiceProfitExpenseGrid'].forEach(id=>{const card=uploadOf(id);if(card){card.classList.add('v187-expense-source');if(!grid.contains(card))grid.appendChild(card);}});
  }
  function moveCategory(){
    const content=byId('v189CategoryContent'); if(!content)return;
    ['invoiceCategoryAnalysisPanel','invoiceCategoryToolbar','invoiceCategoryManager'].forEach(id=>{const el=byId(id);if(el&&!content.contains(el))content.appendChild(el);});
    refreshCategoryState();
  }
  function refreshCategoryState(){
    const page=byId('v189PageCategory'); if(!page)return;
    const ready=hasInvoiceAnalysis();
    page.classList.toggle('waiting',!ready);
    if(ready&&activePage==='category'&&typeof window.renderInvoiceCategoryAnalysis==='function'){
      setTimeout(function(){try{window.renderInvoiceCategoryAnalysis();moveCategory();}catch(e){}},0);
    }
  }
  function setPage(page){
    activePage=page||'analysis';
    makeShell();moveAnalysis();moveExpenses();moveCategory();
    document.querySelectorAll('#v189InvoiceSide [data-v189-page]').forEach(b=>{b.classList.toggle('active',b.getAttribute('data-v189-page')===activePage);b.classList.toggle('locked',b.getAttribute('data-v189-page')==='category'&&!hasInvoiceAnalysis());});
    document.querySelectorAll('#v189InvoiceMain .v189-page').forEach(p=>p.classList.toggle('active',p.id==='v189Page'+activePage.charAt(0).toUpperCase()+activePage.slice(1)));
    refreshCategoryState();
  }
  function saveExpensesFromInputs(){
    try{if(typeof window.saveInvoiceCommissions==='function')window.saveInvoiceCommissions();}catch(e){}
    try{if(typeof window.saveInvoiceProfitExpenses==='function')window.saveInvoiceProfitExpenses();}catch(e){}
    const note=byId('v189ExpenseSaveNote'); if(note){note.classList.add('show');setTimeout(()=>note.classList.remove('show'),1600);}
    setTimeout(function(){layout();if(typeof window.renderInvoiceProfitResults==='function'&&byId('invoiceAnalysisResults')&&getComputedStyle(byId('invoiceAnalysisResults')).display!=='none'){try{window.renderInvoiceProfitResults();}catch(e){}}},0);
  }
  function wire(){
    if(wired)return; wired=true;
    document.addEventListener('change',function(e){const t=e.target;if(!t||!t.closest)return;if(t.closest('#v189PageExpenses')&&(t.id||'').match(/^invoice(Commission|ProfitExpense)_/))saveExpensesFromInputs();},true);
  }
  function layout(){makeShell();moveAnalysis();moveExpenses();moveCategory();setPage(activePage);wire();}
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function'&&!oldRender.__v189LeftMenu){const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(layout,0);setTimeout(layout,250);return r;};wrapped.__v189LeftMenu=true;window.renderInvoiceProfitResults=wrapped;}
  const oldAnalyze=window.analyzeInvoiceProfit;
  if(typeof oldAnalyze==='function'&&!oldAnalyze.__v189LeftMenu){const wrapped=async function(){activePage='analysis';const r=await oldAnalyze.apply(this,arguments);setTimeout(layout,0);setTimeout(layout,300);return r;};wrapped.__v189LeftMenu=true;window.analyzeInvoiceProfit=wrapped;}
  const oldCategory=window.renderInvoiceCategoryAnalysis;
  if(typeof oldCategory==='function'&&!oldCategory.__v189LeftMenu){const wrapped=function(){const r=oldCategory.apply(this,arguments);setTimeout(moveCategory,0);return r;};wrapped.__v189LeftMenu=true;window.renderInvoiceCategoryAnalysis=wrapped;}
  document.addEventListener('DOMContentLoaded',layout);
  setTimeout(layout,100);setTimeout(layout,700);setTimeout(layout,1600);
  window.v189InvoiceLayout=layout;
  window.v189InvoiceSetPage=setPage;
})();
