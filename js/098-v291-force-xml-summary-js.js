(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function force(){try{if(typeof window.v233RenderXml==='function'){window.v233RenderXml();return}}catch(e){}try{if(typeof window.v233EnsureXmlPage==='function')window.v233EnsureXmlPage()}catch(e){}}
  function hasOldLineTable(out){var txt=String((out&&out.textContent)||'');return txt.indexOf('Kalem A??klamas?')>-1||txt.indexOf('Adet / Miktar')>-1||txt.indexOf('Birim Fiyat')>-1}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(force,100);setTimeout(force,600);setTimeout(force,1500)});
  document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="xml"],#v189InvoiceSide [data-v189-page="invoiceReview"]');if(b){setTimeout(force,50);setTimeout(force,250);setTimeout(force,800)}},true);
  setInterval(function(){var out=q('#v231XmlOut');if(out&&hasOldLineTable(out))force()},1000);
})();
