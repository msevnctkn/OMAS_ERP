(function(){
  var current='project';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function ensureCard(){
    var grid=q('#home .menu-grid');if(!grid||q('[data-v286-project-card]'))return;
    var card=document.createElement('div');card.className='menu-card';card.setAttribute('data-v286-project-card','1');card.innerHTML='<h2>Proje Yönetimi</h2><p>Resmi proje yönetimi ve GRS proje yönetimi tek modülde tutulur.</p><button type="button">Proje Yönetimine Git</button>';
    var cari=qa('.menu-card',grid).filter(function(c){return /cariCardsModule/.test(String(c.getAttribute('onclick')||''))})[0];
    if(cari&&cari.parentNode)cari.parentNode.insertBefore(card,cari);else grid.appendChild(card);
  }
  function ensureModule(){
    var mod=q('#projectManagementModule');if(mod)return mod;
    mod=document.createElement('section');mod.id='projectManagementModule';mod.className='module';mod.innerHTML='<div class="module-box"><div class="module-title"><h2>Proje Yönetimi</h2><button class="back-button" type="button" onclick="goHome()">Ana Sayfa</button></div><div class="v286-project-nav"><button type="button" data-v286-project-tab="project">Proje Yönetimi</button><button type="button" data-v286-project-tab="projectGrs">Proje Yönetimi GRS</button></div><div id="projectManagementHost"></div></div>';
    var bhd=q('#bhdModule');if(bhd&&bhd.parentNode)bhd.parentNode.insertBefore(mod,bhd);else document.body.appendChild(mod);
    return mod;
  }
  function removeInvoiceProjectButtons(){
    qa('#v189InvoiceSide [data-v189-page="project"],#v189InvoiceSide [data-v189-page="projectGrs"]').forEach(function(el){if(el&&el.parentNode)el.parentNode.removeChild(el)});
  }
  function preparePages(){
    try{if(typeof window.v247EnsureProjectManagement==='function')window.v247EnsureProjectManagement()}catch(e){}
    try{if(typeof window.v256EnsureGrsProject==='function')window.v256EnsureGrsProject()}catch(e){}
    var host=q('#projectManagementHost');if(!host)return;
    ['v189PageProject','v189PageProjectGrs'].forEach(function(id){var p=q('#'+id);if(p&&p.parentNode!==host)host.appendChild(p)});
    removeInvoiceProjectButtons();
  }
  function openProjectModule(tab){
    current=tab||current||'project';ensureCard();ensureModule();preparePages();
    if(typeof window.openModule==='function')window.openModule('projectManagementModule');else{qa('.module').forEach(function(m){m.classList.remove('active');m.style.display='none'});var home=q('#home');if(home)home.style.display='none';var mod=q('#projectManagementModule');if(mod){mod.classList.add('active');mod.style.display='block'}}
    qa('[data-v286-project-tab]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-v286-project-tab')===current)});
    var p=q('#v189PageProject'),g=q('#v189PageProjectGrs');if(p){p.classList.toggle('active',current==='project');p.style.display=current==='project'?'block':'none'}if(g){g.classList.toggle('active',current==='projectGrs');g.style.display=current==='projectGrs'?'block':'none'}
    if(current==='project'){try{if(typeof window.v247RenderProjects==='function')window.v247RenderProjects()}catch(e){}}else{try{if(typeof window.v256RenderGrsProject==='function')window.v256RenderGrsProject()}catch(e){}}
    setTimeout(function(){preparePages();var h=q('#projectManagementHost');if(h){var p2=q('#v189PageProject'),g2=q('#v189PageProjectGrs');if(p2&&p2.parentNode!==h)h.appendChild(p2);if(g2&&g2.parentNode!==h)h.appendChild(g2)}},80);
  }
  document.addEventListener('click',function(e){
    var card=e.target&&e.target.closest&&e.target.closest('[data-v286-project-card]');if(card){e.preventDefault();e.stopImmediatePropagation();openProjectModule('project');return false}
    var tab=e.target&&e.target.closest&&e.target.closest('[data-v286-project-tab]');if(tab){e.preventDefault();e.stopImmediatePropagation();openProjectModule(tab.getAttribute('data-v286-project-tab'));return false}
    var old=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="project"],#v189InvoiceSide [data-v189-page="projectGrs"]');if(old){e.preventDefault();e.stopImmediatePropagation();openProjectModule(old.getAttribute('data-v189-page'));return false}
  },true);
  document.addEventListener('DOMContentLoaded',function(){ensureCard();ensureModule();setTimeout(removeInvoiceProjectButtons,100);setTimeout(removeInvoiceProjectButtons,800)});
  setInterval(function(){ensureCard();ensureModule();removeInvoiceProjectButtons();if(q('#projectManagementModule.active'))preparePages()},1500);
  window.v286OpenProjectModule=openProjectModule;
})();
