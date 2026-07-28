(function(){
  var term='';
  function q(s,r){return (r||document).querySelector(s);} function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function norm(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/ı/g,'I');}
  function apply(){var root=q('#v237CategoryTools');if(!root)return;var inp=q('#v240CategoryManagerSearch');if(inp)term=inp.value;var find=norm(term),cats=qa('.v237-cat',root),shown=0;cats.forEach(function(card){var ok=!find||norm(card.textContent).indexOf(find)>-1;card.classList.toggle('v240-cat-hidden',!ok);if(ok)shown++;});var hit=q('#v240CategoryManagerSearchHit');if(hit)hit.textContent=find?(shown+' / '+cats.length+' kategori gösteriliyor'):(cats.length+' kategori');}
  function install(){var root=q('#v237CategoryTools');if(!root)return;var main=q('#v237MainInput',root);if(!main)return;var firstRow=main.closest('.v237-row');if(!firstRow)return;var box=q('#v240CategoryManagerSearch',root);if(!box){var wrap=document.createElement('div');wrap.className='v240-cat-search';wrap.innerHTML='<label>Kategori ara</label><input id="v240CategoryManagerSearch" type="search" placeholder="Ana kategori veya alt kategori ara"><small id="v240CategoryManagerSearchHit"></small>';firstRow.parentNode.insertBefore(wrap,firstRow);box=q('#v240CategoryManagerSearch',root);box.value=term;box.oninput=apply;}else if(box.value!==term){box.value=term;}apply();}
  document.addEventListener('input',function(e){if(e.target&&e.target.id==='v240CategoryManagerSearch')apply();},true);
  document.addEventListener('click',function(e){var t=e.target;while(t&&t!==document){if(t.getAttribute&&t.getAttribute('data-v189-page')==='category'){setTimeout(install,160);setTimeout(install,500);break;}t=t.parentNode;}},true);
  var old=window.v237InstallCategoryTools;if(typeof old==='function'&&!old.__v240){window.v237InstallCategoryTools=function(){var r=old.apply(this,arguments);setTimeout(install,0);setTimeout(install,80);return r;};window.v237InstallCategoryTools.__v240=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,1500);});else setTimeout(install,300);
  setInterval(function(){var page=q('#v189PageCategory');if(page&&page.classList.contains('active'))install();},1200);
  window.v240InstallCategoryManagerSearch=install;
})();
