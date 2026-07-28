(function(){
  var ROWS_KEY='v233XmlInvoiceLines';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function num(v){var s=String(v==null?'':v).trim().replace(/\s/g,'');if(!s)return 0;if(s.indexOf(',')>-1){s=s.replace(/\./g,'').replace(',','.')}s=s.replace(/[^0-9.\-]/g,'');var n=Number(s);return isFinite(n)?n:0}
  function money(v){return Number(v||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function readRows(){try{return JSON.parse(localStorage.getItem(ROWS_KEY)||'[]')||[]}catch(e){return []}}
  function writeRows(rows){try{localStorage.setItem(ROWS_KEY,JSON.stringify(rows||[]))}catch(e){}}
  function supplier(r){return r&&((r.supplier)||(r.firma)||(r.company))||'-'}
  function rowId(r){return (r&&r.id)||[r&&r.file,r&&r.invoiceNo,r&&r.date,supplier(r),r&&r.lineNo,r&&r.name,Number(r&&r.matrah||0).toFixed(2)].join('||')}
  function persistValues(id,mat,kdv){
    var rows=readRows(),changed=false;
    rows.forEach(function(r){if(rowId(r)===id){if(!r.id)r.id=id;r.matrah=mat;r.kdv=kdv;r.total=mat+kdv;r.kdvDahil=mat+kdv;changed=true}});
    if(changed)writeRows(rows);
  }
  function updateLine(input){
    var tr=input&&input.closest&&input.closest('[data-v270-row]');if(!tr)return;
    var m=q('[data-v270-matrah]',tr),k=q('[data-v270-kdv]',tr),mat=num(m&&m.value),kdv=num(k&&k.value),total=mat+kdv,cells=qa('td',tr),cell=cells[7];
    if(cell)cell.innerHTML='<strong data-v288-line-total>'+money(total)+'</strong>';
    persistValues(tr.getAttribute('data-v270-row'),mat,kdv);
    updateGrand();
  }
  function updateGrand(){
    var host=q('#v270CategorizeHost');if(!host)return;
    var sum=0;qa('[data-v270-row]',host).forEach(function(tr){var m=q('[data-v270-matrah]',tr),k=q('[data-v270-kdv]',tr);sum+=num(m&&m.value)+num(k&&k.value)});
    var cards=qa('.v270-kpi',host),target=null;cards.forEach(function(c){var s=q('span',c);if(s&&/Toplam KDV Dahil/i.test(s.textContent||''))target=q('strong',c)});
    if(target)target.textContent=money(sum)+' TL';
  }
  document.addEventListener('input',function(e){
    var t=e.target;if(t&&t.matches&&t.matches('[data-v270-matrah],[data-v270-kdv]'))updateLine(t);
  },true);
  document.addEventListener('change',function(e){
    var t=e.target;if(t&&t.matches&&t.matches('[data-v270-matrah],[data-v270-kdv]'))updateLine(t);
  },true);
  window.v288UpdateCategorizeTotals=updateGrand;
})();
