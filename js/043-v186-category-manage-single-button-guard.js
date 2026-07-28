(function(){
  let busy=false;
  function isManageButton(b){return b && b.tagName==='BUTTON' && (((b.textContent||'').trim()==='Kategori Yï¿½net') || /^invoiceCategoryManageBtn/.test(b.id||''));}
  function schedule(){if(busy)return;busy=true;setTimeout(function(){busy=false;dedupe();},0);}
  function dedupe(){
    const toolbar=document.getElementById('invoiceCategoryToolbar');
    if(!toolbar) return;
    const buttons=[...toolbar.querySelectorAll('button')].filter(isManageButton);
    let keep=buttons[0]||null;
    buttons.forEach(function(b,i){if(i>0)b.remove();});
    if(!keep || !keep.isConnected){keep=document.createElement('button');toolbar.appendChild(keep);}
    keep.id='invoiceCategoryManageBtnSingle';
    keep.className='secondary-button';
    keep.type='button';
    keep.textContent='Kategori Yï¿½net';
    keep.onclick=function(e){e.preventDefault();if(typeof window.toggleInvoiceCategoryManager==='function') window.toggleInvoiceCategoryManager();setTimeout(dedupe,0);};
  }
  function watch(){dedupe();const target=document.getElementById('invoiceAnalysisResults')||document.body;if(!target || target.__invoiceCategoryDedupeWatchV186) return;target.__invoiceCategoryDedupeWatchV186=true;new MutationObserver(schedule).observe(target,{childList:true,subtree:true});}
  const oldReport=window.renderInvoiceCategoryAnalysis;
  if(typeof oldReport==='function'){window.renderInvoiceCategoryAnalysis=function(){const r=oldReport.apply(this,arguments);dedupe();setTimeout(dedupe,50);return r;};}
  document.addEventListener('click',function(e){if(e.target && e.target.closest && e.target.closest('#invoiceCategoryToolbar'))setTimeout(dedupe,0);},true);
  document.addEventListener('DOMContentLoaded',watch);
  setTimeout(watch,100);setTimeout(watch,700);setTimeout(watch,1500);
})();
