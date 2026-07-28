(function(){
  var MOD="invoiceAnalysisModule";
  function byId(id){return document.getElementById(id);}
  function cap(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1);}
  function hasClass(el,cls){return !!(el&&(" "+(el.className||"")+" ").indexOf(" "+cls+" ")>-1);}
  function addClass(el,cls){if(el&&!hasClass(el,cls))el.className=(el.className?el.className+" ":"")+cls;}
  function removeClass(el,cls){if(!el)return;el.className=(" "+(el.className||"")+" ").split(" "+cls+" ").join(" ").replace(/^ +| +$/g,"");}
  function isActive(){return hasClass(byId(MOD),"active");}
  function showInvoice(){
    var home=byId("home");if(home)home.style.display="none";
    var mods=document.querySelectorAll(".module");
    for(var i=0;i<mods.length;i++){var m=mods[i];if(m.id===MOD){addClass(m,"active");m.style.display="block";m.style.visibility="visible";m.style.opacity="1";}else{removeClass(m,"active");if(m.id==="concrete3DModule")m.style.display="none";}}
    document.body.style.overflow="";
  }
  function ensureShell(){if(!isActive())return false;try{if(typeof window.v189InvoiceLayout==="function")window.v189InvoiceLayout();}catch(e){}try{if(page==="project"&&typeof window.v247EnsureProjectManagement==="function")window.v247EnsureProjectManagement();}catch(e){}return !!(byId("v189InvoiceSide")&&byId("v189InvoiceMain"));}
  function ensureReport(){var side=byId("v189InvoiceSide"),page=byId("v189PageReport");if(side){var btns=side.querySelectorAll('[data-v189-page="report"]');for(var i=0;i<btns.length;i++)btns[i].parentNode.removeChild(btns[i]);}if(page&&page.parentNode)page.parentNode.removeChild(page);}
  function fixGeom(){
    var side=byId("v189InvoiceSide"),main=byId("v189InvoiceMain");if(!side||!main)return false;
    side.style.setProperty("display","block","important");side.style.setProperty("visibility","visible","important");side.style.setProperty("pointer-events","auto","important");side.style.setProperty("min-width","190px","important");side.style.setProperty("width","220px","important");side.style.setProperty("position","relative","important");side.style.setProperty("z-index","999","important");
    main.style.setProperty("min-width","0","important");
    var bs=side.querySelectorAll("[data-v189-page]");
    for(var i=0;i<bs.length;i++){var b=bs[i];b.disabled=false;b.style.setProperty("display","flex","important");b.style.setProperty("align-items","center","important");b.style.setProperty("min-height","38px","important");b.style.setProperty("width","100%","important");b.style.setProperty("visibility","visible","important");b.style.setProperty("pointer-events","auto","important");b.style.setProperty("opacity","1","important");b.style.setProperty("cursor","pointer","important");}
    return true;
  }
  function activate(page){
    page=page||"analysis";if(page==="report")page="analysis";showInvoice();ensureShell();ensureReport();fixGeom();
    var side=byId("v189InvoiceSide"),main=byId("v189InvoiceMain");if(!side||!main)return false;
    var bs=side.querySelectorAll("[data-v189-page]");
    for(var i=0;i<bs.length;i++){removeClass(bs[i],"active");if(bs[i].getAttribute("data-v189-page")===page)addClass(bs[i],"active");}
    var pages=main.querySelectorAll(".v189-page");
    for(var j=0;j<pages.length;j++){removeClass(pages[j],"active");pages[j].style.display="none";if(pages[j].id==="v189Page"+cap(page)){addClass(pages[j],"active");pages[j].style.display="block";}}
    try{if(page==="category"&&typeof window.renderInvoiceCategoryAnalysis==="function")window.renderInvoiceCategoryAnalysis();}catch(e){}try{if(page==="project"&&typeof window.v247RenderProjects==="function")window.v247RenderProjects();}catch(e){}
    try{if(page==="company"&&typeof window.v214RenderCompanyAnalysis==="function")window.v214RenderCompanyAnalysis();}catch(e){}try{if(page==="project"&&typeof window.v247RenderProjects==="function")window.v247RenderProjects();}catch(e){}
    return true;
  }
  var oldOpen=window.openModule;
  window.openModule=function(id){if(id===MOD){try{if(typeof oldOpen==="function")oldOpen(id);}catch(e){}setTimeout(function(){activate("analysis");},0);setTimeout(function(){activate("analysis");},120);return;}if(typeof oldOpen==="function")return oldOpen.apply(this,arguments);};
  window.openModule.__v222InvoiceRouter=true;window.v222InvoiceActivate=activate;
  document.addEventListener("click",function(ev){var t=ev.target;while(t&&t!==document){if(t.getAttribute&&t.getAttribute("data-v237-toggle")){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();try{if(typeof window.v246ToggleCategoryDetail==="function")window.v246ToggleCategoryDetail(t);else{var id=t.getAttribute("data-v237-toggle"),row=document.querySelector("#v189PageCategory [data-v237-detail=\""+id+"\"]");if(row){var on=!(row.className.indexOf("open")>-1||row.style.display==="table-row");row.className=(" "+row.className+" ").replace(" open "," ").replace(/^ +| +$/g,"")+(on?" open":"");row.style.display=on?"table-row":"none";var hint=t.parentNode&&t.parentNode.querySelector(".v237-toggle-cell");if(hint)hint.textContent=on?"Faturaları gizle":"Faturaları göster";}}}catch(e){}return false;}if(t.getAttribute&&t.getAttribute("data-v189-page")){ev.preventDefault();ev.stopImmediatePropagation();activate(t.getAttribute("data-v189-page"));return false;}if(t.className&&String(t.className).indexOf("menu-card")>-1&&String(t.getAttribute("onclick")||"").indexOf(MOD)>-1){ev.preventDefault();ev.stopImmediatePropagation();window.openModule(MOD);return false;}t=t.parentNode;}},true);
  if(isActive())setTimeout(function(){activate("analysis");},0);
})();
