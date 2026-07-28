(function(){
  window.openQuoteCRM=window.openQuoteCRM||function(){alert('Teklif Hazırlama modülü kaldırıldı.');};
  window.closeQuoteCRM=window.closeQuoteCRM||function(){};
  window.openMaterialsCRM=window.openMaterialsCRM||function(){alert('Malzemeler modülü kaldırıldı.');};
  window.closeMaterialsCRM=window.closeMaterialsCRM||function(){};
  window.quoteNorm=window.quoteNorm||function(v){try{return String(v||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(e){return String(v||'').toUpperCase()}};
  window.quoteFormat=window.quoteFormat||function(v,cur){try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency:cur||'TRY'}).format(Number(v||0))}catch(e){return String(v||0)}};
  window.escapeHtml=window.escapeHtml||function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
})();
