(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function removeOldCompanyAnalysis(){
    qa('#v189InvoiceSide [data-v189-page="company"], #invoiceCompanyToolbar, #invoiceCompanyAnalysisPanel').forEach(function(el){if(el&&el.parentNode)el.parentNode.removeChild(el)});
    qa('#v189InvoiceMain #v189PageCompany').forEach(function(el){if(el&&el.parentNode)el.parentNode.removeChild(el)});
    qa('#v189InvoiceSide button').forEach(function(b){if((b.textContent||'').trim()==='Firma Bazlı Analiz'&&b.parentNode)b.parentNode.removeChild(b)});
    if(q('#v189InvoiceSide [data-v189-page="xml"]')&&!q('#v189InvoiceSide [data-v189-page].active')){var first=q('#v189InvoiceSide [data-v189-page="xml"]');if(first)first.classList.add('active')}
  }
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="company"]');if(b){e.preventDefault();e.stopImmediatePropagation();removeOldCompanyAnalysis();return false}},true);
  document.addEventListener('DOMContentLoaded',function(){[80,400,1200,2500].forEach(function(ms){setTimeout(removeOldCompanyAnalysis,ms)})});
  try{new MutationObserver(removeOldCompanyAnalysis).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
  setInterval(removeOldCompanyAnalysis,120);
  window.v284RemoveOldInvoiceCompanyAnalysis=removeOldCompanyAnalysis;
})();
