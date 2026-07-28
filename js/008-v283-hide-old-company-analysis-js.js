(function(){
  function hideOldCompanyAnalysis(){
    document.querySelectorAll('[data-v189-page="company"]').forEach(function(b){b.style.display='none';b.setAttribute('aria-hidden','true');});
    var p=document.getElementById('v189PageCompany');if(p){p.style.display='none';p.classList.remove('active');}
    var panel=document.getElementById('invoiceCompanyAnalysisPanel');if(panel)panel.style.display='none';
  }
  document.addEventListener('DOMContentLoaded',function(){hideOldCompanyAnalysis();setTimeout(hideOldCompanyAnalysis,500);setTimeout(hideOldCompanyAnalysis,1500);});
  document.addEventListener('click',function(){setTimeout(hideOldCompanyAnalysis,80);},true);
  if(document.readyState!=='loading')hideOldCompanyAnalysis();
})();
