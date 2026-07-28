(function(){
  const MODULE_ID='invoiceAnalysisModule';
  function invoiceActive(){
    const mod=document.getElementById(MODULE_ID);
    return !!(mod && mod.classList.contains('active'));
  }
  function hardOpenInvoice(){
    const home=document.getElementById('home');
    if(home) home.style.display='none';
    document.querySelectorAll('.module').forEach(function(m){
      m.classList.toggle('active',m.id===MODULE_ID);
      if(m.id!==MODULE_ID && m.id==='concrete3DModule') m.style.display='none';
    });
    document.body.classList.remove('concrete-3d-open','v118-3d-open','v134-3d-open','v135-3d-open');
    document.body.style.overflow='';
    const mod=document.getElementById(MODULE_ID);
    if(mod){
      mod.style.display='block';
      mod.style.visibility='visible';
      mod.style.opacity='1';
      mod.classList.add('active');
    }
    window.scrollTo(0,0);
  }
  function fixMenuGeometry(){
    if(!invoiceActive()) return false;
    const side=document.getElementById('v189InvoiceSide');
    const main=document.getElementById('v189InvoiceMain');
    if(!side || !main) return false;
    side.style.setProperty('display','block','important');
    side.style.setProperty('visibility','visible','important');
    side.style.setProperty('pointer-events','auto','important');
    side.style.setProperty('min-width','190px','important');
    side.style.setProperty('width','220px','important');
    side.style.setProperty('position','relative','important');
    side.style.setProperty('z-index','999','important');
    main.style.setProperty('min-width','0','important');
    side.querySelectorAll('[data-v189-page]').forEach(function(btn){
      btn.style.setProperty('display','flex','important');
      btn.style.setProperty('align-items','center','important');
      btn.style.setProperty('min-height','38px','important');
      btn.style.setProperty('width','100%','important');
      btn.style.setProperty('visibility','visible','important');
      btn.style.setProperty('pointer-events','auto','important');
      btn.style.setProperty('opacity','1','important');
      btn.disabled=false;
    });
    return true;
  }
  function buildInvoiceUi(){
    if(!invoiceActive()) return;
    try{ if(typeof window.v189InvoiceLayout==='function') window.v189InvoiceLayout(); }catch(e){}
    try{ if(typeof window.v189InvoiceSetPage==='function' && !document.querySelector('#v189InvoiceSide [data-v189-page="project"].active')) window.v189InvoiceSetPage('analysis'); }catch(e){}
    fixMenuGeometry();
    const oldReport=document.getElementById('v189PageReport');
    if(oldReport) oldReport.remove();
    side.querySelectorAll('[data-v189-page="report"]').forEach(function(btn){btn.remove();});
    fixMenuGeometry();
  }
  function afterInvoiceOpen(){
    hardOpenInvoice();
    [0,80,250,700].forEach(function(ms){setTimeout(buildInvoiceUi,ms);});
  }
  const previousOpen=window.openModule;
  window.openModule=function(id){
    if(id===MODULE_ID){
      try{ if(typeof previousOpen==='function') previousOpen(id); }catch(e){}
      afterInvoiceOpen();
      return;
    }
    return typeof previousOpen==='function'?previousOpen.apply(this,arguments):undefined;
  };
  window.openModule.__v221InvoiceFix=true;
  document.addEventListener('click',function(e){
    const card=e.target&&e.target.closest&&e.target.closest('.menu-card');
    if(!card) return;
    const attr=card.getAttribute('onclick')||'';
    if(attr.indexOf("invoiceAnalysisModule")===-1) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.openModule(MODULE_ID);
  },true);
  document.addEventListener('click',function(e){
    const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page]');
    if(!nav || !invoiceActive()) return;
    fixMenuGeometry();
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    if(invoiceActive()) afterInvoiceOpen();
  });
  if(invoiceActive()) afterInvoiceOpen();
})();
