function v246ToggleCategoryDetail(btn){
  try{
    var id=btn&&btn.getAttribute&&btn.getAttribute('data-v237-toggle');
    if(!id)return false;
    var row=document.querySelector('#v189PageCategory [data-v237-detail="'+id+'"]');
    if(!row)return false;
    var on=!(row.classList.contains('open')||row.style.display==='table-row');
    row.classList.toggle('open',on);
    row.style.display=on?'table-row':'none';
    var hint=btn.parentNode&&btn.parentNode.querySelector('.v237-toggle-cell');
    if(hint)hint.textContent=on?'Faturaları gizle':'Faturaları göster';
  }catch(e){}
  return false;
}
