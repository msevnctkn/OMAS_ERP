(function(){
  function place(){var page=document.getElementById('v189PageCategory'),spend=document.getElementById('v237SpendMoved'),search=document.getElementById('v235CatSearchBox');if(page&&spend&&search&&search.nextSibling!==spend)search.parentNode.insertBefore(spend,search.nextSibling);}
  document.addEventListener('click',function(e){var t=e.target;while(t&&t!==document){if(t.getAttribute&&t.getAttribute('data-v189-page')==='category'){setTimeout(place,120);setTimeout(place,500);break;}t=t.parentNode;}},true);
  setInterval(function(){var page=document.getElementById('v189PageCategory');if(page&&page.classList.contains('active'))place();},1000);
})();
