(function(){
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){try{return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+' TL';}catch(e){return String(v||0);}}
  function rows(){const out=[];try{(invoicePurchaseRows||[]).forEach(r=>out.push({...r,__side:'Alış'}));}catch(e){}try{(invoiceSalesRows||[]).forEach(r=>out.push({...r,__side:'Satış'}));}catch(e){}try{(invoiceExpenseRows||[]).forEach(r=>out.push({...r,__side:'Masraf'}));}catch(e){}return out;}
  function val(r){return Number((r&&r.toplam)||(r&&r.kdvDahil)||(r&&r.matrah)||(r&&r.net)||0)}
  function panel(id,title){const c=document.getElementById('v189CategoryContent');if(!c)return null;let p=document.getElementById(id);if(!p){p=document.createElement('div');p.id=id;p.className='v198-panel';p.innerHTML='<h4>'+esc(title)+'</h4><div class="v198-body"></div>';c.appendChild(p);}return p.querySelector('.v198-body');}
  function build(){
    try{if(typeof window.renderInvoiceCategoryAnalysis==='function'&&!window.__v201Cat){window.__v201Cat=true;window.renderInvoiceCategoryAnalysis();window.__v201Cat=false;}}catch(e){window.__v201Cat=false;}
    const all=rows();
    const op=panel('v198CategoryOpsPanel','Kategori Bazlı İşlem ve Harcama Analizi');
    if(op){const total=all.filter(r=>r.__side!=='Satış').reduce((s,r)=>s+val(r),0);op.innerHTML='<div class="table-wrap"><table><thead><tr><th>Özet</th><th>Tutar</th></tr></thead><tbody><tr><td>Toplam harcama</td><td class="amount"><strong>'+fmt(total)+'</strong></td></tr><tr><td>Toplam işlem</td><td class="amount">'+all.length+'</td></tr></tbody></table></div>';}
    const cp=panel('v198CompanyAnalysisPanel','Firma Bazlı Fatura Analizi');
    if(cp){cp.innerHTML='<div class="table-wrap"><table><thead><tr><th>Durum</th></tr></thead><tbody><tr><td>Faturaları analiz ettikten sonra firma bazlı alış/satış/masraf burada listelenecek.</td></tr></tbody></table></div>';}
    const content=document.getElementById('v189CategoryContent');let target=document.getElementById('v198MovedExpenseWrap');if(content&&!target){target=document.createElement('div');target.id='v198MovedExpenseWrap';target.className='v198-panel';target.innerHTML='<h4>Masraf Fişleri Özeti</h4><div class="v198-body"></div>';content.appendChild(target);}const table=document.getElementById('expenseReceiptTable'),wrap=table&&table.closest('.table-wrap');if(target&&wrap&&!target.querySelector('.v198-body').contains(wrap))target.querySelector('.v198-body').appendChild(wrap);
  }
  const prev=window.v189InvoiceSetPage;
  window.v189InvoiceSetPage=function(page){if(typeof prev==='function')prev.apply(this,arguments);setTimeout(function(){if(page==='category')build();},180);};
  document.addEventListener('click',function(e){const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page="category"]');if(nav)setTimeout(build,220);},true);
})();
