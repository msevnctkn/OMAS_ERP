(function(){
  function fix(){
    document.querySelectorAll('#v215MemoryPanel button').forEach(b=>{b.style.setProperty('display','inline-flex','important');b.style.setProperty('visibility','visible','important');b.style.setProperty('opacity','1','important');b.style.setProperty('pointer-events','auto','important');});
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(fix,600);});setTimeout(fix,900);setTimeout(fix,2200);
  const oldRender=window.renderInvoiceProfitResults;if(typeof oldRender==='function'&&!oldRender.__v216ShowMemoryButtons){window.renderInvoiceProfitResults=function(){const r=oldRender.apply(this,arguments);setTimeout(fix,500);return r;};window.renderInvoiceProfitResults.__v216ShowMemoryButtons=true;}
})();
