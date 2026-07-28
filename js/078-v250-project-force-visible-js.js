(function(){
  function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1);}
  function forceProject(){
    try{if(typeof window.v247EnsureProjectManagement==='function')window.v247EnsureProjectManagement();}catch(e){}
    var side=document.getElementById('v189InvoiceSide'),main=document.getElementById('v189InvoiceMain'),page=document.getElementById('v189PageProject');
    if(!side||!main||!page)return false;
    side.querySelectorAll('[data-v189-page]').forEach(function(b){var on=b.getAttribute('data-v189-page')==='project';b.classList.toggle('active',on);});
    main.querySelectorAll('.v189-page').forEach(function(p){var on=p.id==='v189PageProject';p.classList.toggle('active',on);p.style.display=on?'block':'none';});
    page.style.display='block';page.classList.add('active');
    try{if(typeof window.v247RenderProjects==='function')window.v247RenderProjects();}catch(e){}
    return true;
  }
  document.addEventListener('click',function(e){var nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="project"]');if(!nav)return;e.preventDefault();e.stopImmediatePropagation();forceProject();setTimeout(forceProject,0);setTimeout(forceProject,120);setTimeout(forceProject,500);return false;},true);
  window.v250ForceProjectPage=forceProject;
})();
