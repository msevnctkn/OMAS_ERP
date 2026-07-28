(function(){
  const specialTables={tevkifatInvoiceTable:{label:'Tevkifatlı',hint:'KDV tevkifatı olan faturalar burada.'},istisnaInvoiceTable:{label:'İstisna',hint:'KDV istisna faturaları burada.'},returnInvoiceTable:{label:'İade',hint:'İade faturaları burada.'},excludedInvoiceTable:{label:'Hesap Dışı',hint:'Analize dahil edilmeyen faturalar burada.'}};
  const expenseState={open:false,tab:'commission'};
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){try{return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+' TL';}catch(e){return String(v||0);}}
  function byId(id){return document.getElementById(id);}  
  function closestUpload(el){return el?el.closest('.upload-area'):null;}
  function markExpenseSources(){['invoiceCommissionGrid','invoiceProfitExpenseGrid'].forEach(id=>{const box=closestUpload(byId(id));if(box)box.classList.add('v187-expense-source');});}
  function makeMenu(){
    const module=byId('invoiceAnalysisModule'); if(!module)return;
    const actions=[...module.querySelectorAll('.actions')].find(a=>a.querySelector('[onclick="analyzeInvoiceProfit()"]'));
    if(!actions || byId('v187ExpenseMenu'))return;
    const menu=document.createElement('div');menu.id='v187ExpenseMenu';menu.className='v187-expense-menu';
    menu.innerHTML='<div><strong>Giderler</strong><small>Komisyonlar, kar giderleri ve kategori raporu analizden ayrı yönetilir.</small></div><div class="v187-menu-actions"><button class="secondary-button" type="button" data-v187-expense="commission">Komisyonlar</button><button class="secondary-button" type="button" data-v187-expense="profit">Kar Giderleri</button><button class="secondary-button" type="button" data-v187-expense="category">Kategori Raporu</button></div>';
    const drawer=document.createElement('div');drawer.id='v187ExpenseDrawer';drawer.className='v187-expense-drawer';
    drawer.innerHTML='<div class="v187-expense-tabs"><button type="button" data-v187-expense-tab="commission">Komisyonlar</button><button type="button" data-v187-expense-tab="profit">Kar Giderleri</button><button type="button" data-v187-expense-tab="category">Kategori Raporu</button></div><div id="v187ExpensePaneCommission" class="v187-expense-pane"></div><div id="v187ExpensePaneProfit" class="v187-expense-pane"></div><div id="v187ExpensePaneCategory" class="v187-expense-pane"></div>';
    actions.parentNode.insertBefore(menu,actions); actions.parentNode.insertBefore(drawer,actions.nextSibling);
    menu.addEventListener('click',e=>{const b=e.target.closest('[data-v187-expense]');if(!b)return;openExpense(b.getAttribute('data-v187-expense'));});
    drawer.addEventListener('click',e=>{const b=e.target.closest('[data-v187-expense-tab]');if(!b)return;openExpense(b.getAttribute('data-v187-expense-tab'));});
  }
  function moveExpensePanels(){
    markExpenseSources(); makeMenu();
    const commission=closestUpload(byId('invoiceCommissionGrid')); const profit=closestUpload(byId('invoiceProfitExpenseGrid'));
    const p1=byId('v187ExpensePaneCommission'),p2=byId('v187ExpensePaneProfit'),p3=byId('v187ExpensePaneCategory');
    if(commission&&p1&&!p1.contains(commission))p1.appendChild(commission);
    if(profit&&p2&&!p2.contains(profit))p2.appendChild(profit);
    const toolbar=byId('invoiceCategoryToolbar'),panel=byId('invoiceCategoryAnalysisPanel'),manager=byId('invoiceCategoryManager');
    if(p3){[toolbar,panel,manager].forEach(x=>{if(x&&!p3.contains(x))p3.appendChild(x);});}
    applyExpenseState();
  }
  function applyExpenseState(){
    const drawer=byId('v187ExpenseDrawer'); if(drawer)drawer.classList.toggle('open',expenseState.open);
    document.querySelectorAll('[data-v187-expense-tab]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-v187-expense-tab')===expenseState.tab));
    const map={commission:'v187ExpensePaneCommission',profit:'v187ExpensePaneProfit',category:'v187ExpensePaneCategory'};
    Object.keys(map).forEach(k=>{const el=byId(map[k]); if(el)el.classList.toggle('active',k===expenseState.tab);});
  }
  window.openInvoiceExpenseMenu=function(tab){openExpense(tab||'commission');};
  function openExpense(tab){expenseState.open=true;expenseState.tab=tab||'commission';moveExpensePanels();if(tab==='category'&&typeof window.renderInvoiceCategoryAnalysis==='function')setTimeout(()=>window.renderInvoiceCategoryAnalysis(),0);}
  function hideAutoPanels(){const cat=byId('invoiceCategoryAnalysisPanel');if(cat && !expenseState.open)cat.style.display='none';}
  function wireAutosave(){
    document.addEventListener('change',function(e){
      const sel=e.target&&e.target.closest&&e.target.closest('.invoice-company-select'); if(!sel)return;
      try{if(typeof window.saveInvoiceCompanySelections==='function')window.saveInvoiceCompanySelections(true);}catch(err){}
      let note=sel.parentNode.querySelector('.v187-autosave-note'); if(!note){note=document.createElement('span');note.className='v187-autosave-note';sel.parentNode.appendChild(note);} note.textContent='Kaydedildi';
      setTimeout(()=>{if(note)note.textContent='';},1600);
      try{if(typeof window.renderInvoiceCompanyAnalysis==='function')window.renderInvoiceCompanyAnalysis();}catch(err){}
    },true);
  }
  function removeSaveButtons(){
    const toolbar=byId('invoiceCompanyToolbar'); if(toolbar)toolbar.remove();
    document.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim(); if(t==='Firma Seçimlerini Kaydet')b.remove();});
  }
  function specialCount(tableId){const tbody=document.querySelector('#'+tableId+' tbody'); if(!tbody)return 0; const rows=[...tbody.querySelectorAll('tr')]; if(rows.length===1 && /bulunmadı|yok|kayıt yok/i.test(rows[0].textContent||''))return 0; return rows.length;}
  function buildSpecialTabs(){
    const results=byId('invoiceAnalysisResults'); if(!results)return;
    let shell=byId('v187SpecialShell');
    if(!shell){shell=document.createElement('div');shell.id='v187SpecialShell';shell.className='v187-special-shell';shell.innerHTML='<div class="v187-special-head"><div><h3>Özel Fatura Sekmeleri</h3><small>Tevkifat, istisna, iade ve hesap dışı faturalar tek alanda açılır.</small></div><div id="v187SpecialTabs" class="v187-special-tabs"></div></div><div id="v187SpecialContent"></div>'; const monthly=byId('invoiceMonthlyTable')?.closest('.table-wrap'); (monthly&&monthly.parentNode?monthly.parentNode:results).insertBefore(shell,monthly?monthly.nextSibling:results.firstChild);}
    const tabs=byId('v187SpecialTabs'),content=byId('v187SpecialContent'); if(!tabs||!content)return;
    Object.keys(specialTables).forEach((id,i)=>{const table=byId(id); if(!table)return; const h=table.closest('.table-wrap')?.previousElementSibling; const wrap=table.closest('.table-wrap'); let pane=byId('v187Pane_'+id); if(!pane){pane=document.createElement('div');pane.id='v187Pane_'+id;pane.className='v187-special-pane';content.appendChild(pane);} if(h)pane.appendChild(h); if(wrap)pane.appendChild(wrap);});
    const active=window.v187ActiveSpecialTab||'tevkifatInvoiceTable';
    tabs.innerHTML=Object.keys(specialTables).map(id=>`<button type="button" class="${id===active?'active':''}" onclick="window.setV187SpecialTab('${id}')">${specialTables[id].label} <span>(${specialCount(id)})</span></button>`).join('');
    setSpecialTab(active);
  }
  window.setV187SpecialTab=function(id){window.v187ActiveSpecialTab=id;setSpecialTab(id);};
  function setSpecialTab(id){Object.keys(specialTables).forEach(k=>{const p=byId('v187Pane_'+k); if(p)p.classList.toggle('active',k===id);}); const tabs=byId('v187SpecialTabs'); if(tabs)[...tabs.children].forEach((b,i)=>b.classList.toggle('active',Object.keys(specialTables)[i]===id));}
  function addAllSummary(){
    const results=byId('invoiceAnalysisResults'); if(!results || byId('v187AllSummary'))return;
    const board=results.querySelector('.invoice-summary-wrapper'); if(!board)return;
    const box=document.createElement('div');box.id='v187AllSummary';box.className='v187-summary-all';
    box.innerHTML='<div class="v187-summary-card"><span>Toplam Satış</span><strong id="v187SalesAll">0 TL</strong></div><div class="v187-summary-card"><span>Toplam Alış + Masraf</span><strong id="v187CostAll">0 TL</strong></div><div class="v187-summary-card"><span>Net Kâr</span><strong id="v187NetAll">0 TL</strong></div><div class="v187-summary-card"><span>Özel / Hesap Dışı</span><strong id="v187SpecialAll">0</strong></div>';
    board.parentNode.insertBefore(box,board.nextSibling);
  }
  function refreshAllSummary(){
    addAllSummary();
    const text=id=>byId(id)?.textContent||'0 TL';
    const sumSpecial=Object.keys(specialTables).reduce((s,id)=>s+specialCount(id),0);
    const sales=text('salesSummaryRates');
    byId('v187SalesAll')&&(byId('v187SalesAll').textContent=text('salesNetTotal')!=='0 TL'?text('salesNetTotal'):sales.replace(/\s+/g,' ').slice(0,24));
    byId('v187CostAll')&&(byId('v187CostAll').textContent=text('purchaseNetTotal'));
    byId('v187NetAll')&&(byId('v187NetAll').textContent=text('netProfitTotal'));
    byId('v187SpecialAll')&&(byId('v187SpecialAll').textContent=String(sumSpecial));
  }
  function afterRender(){moveExpensePanels();removeSaveButtons();hideAutoPanels();buildSpecialTabs();refreshAllSummary();}
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function'&&!oldRender.__v187Modern){const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(afterRender,0);setTimeout(afterRender,250);return r;};wrapped.__v187Modern=true;window.renderInvoiceProfitResults=wrapped;}
  const oldAnalyze=window.analyzeInvoiceProfit;
  if(typeof oldAnalyze==='function'&&!oldAnalyze.__v187Modern){const wrapped=async function(){expenseState.open=false;applyExpenseState();const r=await oldAnalyze.apply(this,arguments);setTimeout(afterRender,0);return r;};wrapped.__v187Modern=true;window.analyzeInvoiceProfit=wrapped;}
  const oldCategory=window.renderInvoiceCategoryAnalysis;
  if(typeof oldCategory==='function'&&!oldCategory.__v187Modern){const wrapped=function(){const r=oldCategory.apply(this,arguments);moveExpensePanels();const p=byId('invoiceCategoryAnalysisPanel');if(p)p.style.display=expenseState.open&&expenseState.tab==='category'?'block':'none';return r;};wrapped.__v187Modern=true;window.renderInvoiceCategoryAnalysis=wrapped;}
  function init(){moveExpensePanels();wireAutosave();removeSaveButtons();setTimeout(afterRender,300);}
  document.addEventListener('DOMContentLoaded',init); setTimeout(init,100); setTimeout(init,800); setTimeout(init,1800);
})();
