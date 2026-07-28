(function(){
  function dedupeCategoryManageButtons(){
    const toolbar=document.getElementById('invoiceCategoryToolbar');
    if(!toolbar) return;
    const buttons=[...toolbar.querySelectorAll('button')].filter(b=>(b.textContent||'').trim()==='Kategori Yönet' || b.id==='invoiceCategoryManageBtnV182');
    buttons.forEach((b,i)=>{if(i>0)b.remove();});
    let btn=buttons[0]||null;
    if(!btn || !btn.isConnected){
      btn=document.createElement('button');
      toolbar.appendChild(btn);
    }
    btn.id='invoiceCategoryManageBtn';
    btn.className='secondary-button';
    btn.type='button';
    btn.textContent='Kategori Yönet';
    btn.onclick=function(e){
      e.preventDefault();
      if(typeof window.toggleInvoiceCategoryManager==='function') window.toggleInvoiceCategoryManager();
    };
  }
  function runSoon(){
    dedupeCategoryManageButtons();
    setTimeout(dedupeCategoryManageButtons,50);
    setTimeout(dedupeCategoryManageButtons,250);
  }
  const oldEnsure=window.ensureCategoryPanel;
  if(typeof oldEnsure==='function'){
    window.ensureCategoryPanel=function(){
      const r=oldEnsure.apply(this,arguments);
      runSoon();
      return r;
    };
  }
  const oldReport=window.renderInvoiceCategoryAnalysis;
  if(typeof oldReport==='function'){
    window.renderInvoiceCategoryAnalysis=function(){
      const r=oldReport.apply(this,arguments);
      runSoon();
      return r;
    };
  }
  document.addEventListener('DOMContentLoaded',runSoon);
  setTimeout(runSoon,300);
  setTimeout(runSoon,1200);
})();
