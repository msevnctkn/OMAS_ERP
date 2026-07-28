(function(){
  function rebindCategoryButtons(){
    const panel=document.getElementById('v191CategoryPanel');
    if(!panel)return;
    const buttons=[...panel.querySelectorAll('button')];
    buttons.forEach(b=>{
      const txt=(b.textContent||'').trim();
      if(txt==='Ana Kategori Ekle'||txt==='Ana Kategori Kaydet'){
        b.textContent='Ana Kategori Kaydet';
        b.removeAttribute('onclick');
        b.onclick=function(e){e.preventDefault();e.stopPropagation();if(typeof window.v192AddMainCategory==='function')window.v192AddMainCategory();return false;};
      }
      if(txt==='Alt Kategori Ekle'||txt==='Alt Kategori Kaydet'){
        b.textContent='Alt Kategori Kaydet';
        b.removeAttribute('onclick');
        b.onclick=function(e){e.preventDefault();e.stopPropagation();if(typeof window.v192AddSubCategory==='function')window.v192AddSubCategory();return false;};
      }
    });
  }
  document.addEventListener('click',function(e){
    const b=e.target&&e.target.closest&&e.target.closest('#v191CategoryPanel button');
    if(!b)return;
    const txt=(b.textContent||'').trim();
    if(txt==='Ana Kategori Kaydet'){
      e.preventDefault();e.stopImmediatePropagation();
      if(typeof window.v192AddMainCategory==='function')window.v192AddMainCategory();
      return false;
    }
    if(txt==='Alt Kategori Kaydet'){
      e.preventDefault();e.stopImmediatePropagation();
      if(typeof window.v192AddSubCategory==='function')window.v192AddSubCategory();
      return false;
    }
  },true);
  const oldRender=window.renderInvoiceCategoryAnalysis;
  if(typeof oldRender==='function'&&!oldRender.__v193ButtonFix){
    window.renderInvoiceCategoryAnalysis=function(){const r=oldRender.apply(this,arguments);setTimeout(rebindCategoryButtons,0);setTimeout(rebindCategoryButtons,100);return r;};
    window.renderInvoiceCategoryAnalysis.__v193ButtonFix=true;
  }
  const oldSet=window.v189InvoiceSetPage;
  if(typeof oldSet==='function'&&!oldSet.__v193ButtonFix){
    window.v189InvoiceSetPage=function(){const r=oldSet.apply(this,arguments);setTimeout(rebindCategoryButtons,0);setTimeout(rebindCategoryButtons,100);return r;};
    window.v189InvoiceSetPage.__v193ButtonFix=true;
  }
  document.addEventListener('DOMContentLoaded',rebindCategoryButtons);
  setTimeout(rebindCategoryButtons,100);setTimeout(rebindCategoryButtons,800);setTimeout(rebindCategoryButtons,1800);
})();
