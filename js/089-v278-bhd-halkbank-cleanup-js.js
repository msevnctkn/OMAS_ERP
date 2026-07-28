(function(){
  var BHD_ROWS='bhdPersistentRowsV267', BHD_COMPANY='bhdRowCompanyMapV267', BHD_CAT='bhdRowCategoryMapV267';
  function read(k,fb){try{var raw=localStorage.getItem(k);return raw==null?fb:(JSON.parse(raw)||fb)}catch(e){return fb}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function norm(v){try{return String(v||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(e){return String(v||'').toUpperCase()}}
  function idOf(r){return [r&&r.kaynak,r&&r.referans,r&&r.sira,r&&r.tarih,r&&r.aciklama].join('|')}
  function yearOf(t){var m=String(t||'').match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})/);if(!m)return 0;var y=+m[3];if(y<100)y+=(y>=70?1900:2000);return y}
  function isWrongHalkbankRow(r){var src=norm([r&&r.kaynak,r&&r.bhdUploadName,r&&r.bhdOriginalName,r&&r.aciklama].join(' ')),type=norm(r&&r.dosyaTipi),y=yearOf(r&&r.tarih);if(y&&y>((new Date()).getFullYear()+2))return true;if(/TL HESABI|HALK BANK|HALKBANK|HALK BANKASI/.test(src)&&/KREDI KARTI/.test(type))return true;return false}
  function cleanup(){var rs=read(BHD_ROWS,[]);if(!Array.isArray(rs)||!rs.length)return 0;var cm=read(BHD_COMPANY,{}),ct=read(BHD_CAT,{}),removed=0,kept=[];rs.forEach(function(r){if(isWrongHalkbankRow(r)){removed++;var id=idOf(r);delete cm[id];delete ct[id];}else kept.push(r)});if(!removed)return 0;kept.forEach(function(r,i){r.sira=i+1});write(BHD_ROWS,kept);write(BHD_COMPANY,cm);write(BHD_CAT,ct);if(window.bhdRawRows&&Array.isArray(window.bhdRawRows)){window.bhdRawRows.length=0;kept.forEach(function(r){window.bhdRawRows.push(r)})}return removed}
  window.v278CleanWrongBhdRows=cleanup;
  document.addEventListener('DOMContentLoaded',function(){setTimeout(cleanup,250);setTimeout(cleanup,1200)});
})();
