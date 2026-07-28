(function(){
  const ASSIGN='invoiceCategoryAssignmentsV1';
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(v){try{return (typeof invoiceFormatTL==='function')?invoiceFormatTL(Number(v||0)):new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0))+' TL';}catch(e){return String(v||0);}}
  function pct(v){return '%'+Number(v||0).toFixed(1).replace('.',',');}
  function loadAssign(){try{return JSON.parse(localStorage.getItem(ASSIGN)||'{}')||{};}catch(e){return {};}}
  function rowKey(r){try{if(typeof invoiceRowCompanyKey==='function')return invoiceRowCompanyKey(r);}catch(e){}return [r&&r.tur||'',r&&r.kaynak||'',r&&r.faturaNo||'',r&&r.firma||'',r&&r.tarih||'',Number(r&&r.toplam||0).toFixed(2)].join('|');}
  function rowCompany(r){try{if(typeof getInvoiceRowCompany==='function')return getInvoiceRowCompany(r)||'SEÇİLMEDİ';}catch(e){}return (r&&r.firmaSirket)||'SEÇİLMEDİ';}
  function amount(r){return Number((r&&r.toplam)||(r&&r.kdvDahil)||(r&&r.matrah)||(r&&r.net)||0);}
  function arr(name){try{return Array.isArray(window[name])?window[name]:[];}catch(e){return [];}}
  function allRows(){const out=[];arr('invoicePurchaseRows').forEach(r=>out.push(Object.assign({},r,{__side:'Alış'})));arr('invoiceSalesRows').forEach(r=>out.push(Object.assign({},r,{__side:'Satış'})));arr('invoiceExpenseRows').forEach(r=>out.push(Object.assign({},r,{__side:'Masraf'})));return out;}
  function cat(r){const a=loadAssign()[rowKey(r)]||{};return {main:a.main||'Kategorisiz',sub:a.sub||'-'};}
  function percentCell(value){const w=Math.max(0,Math.min(100,Number(value)||0));return '<div class="v208-percent"><strong>'+pct(w)+'</strong><span class="v208-bar"><i style="width:'+w.toFixed(2)+'%"></i></span></div>';}
  function invoiceLine(r,withCat){const c=cat(r);return '<div class="v208-invoice-line"><span class="v208-chip">'+esc(r.__side)+'</span><span class="v208-muted">'+esc(r.tarih||'-')+'</span><strong>'+esc(r.faturaNo||r.belgeNo||'-')+'</strong><span>'+esc(rowCompany(r)||r.firma||'-')+(withCat?'<span class="v206-sub">'+esc(c.main)+' / '+esc(c.sub)+'</span>':'')+'</span><span class="v208-amount">'+fmt(amount(r))+'</span></div>';}
  function ensureCompanyPage(){
    const side=document.getElementById('v189InvoiceSide'),main=document.getElementById('v189InvoiceMain');if(!side||!main)return;
    let btn=side.querySelector('[data-v189-page="company"]');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.setAttribute('data-v189-page','company');btn.textContent='Firma Bazlı Analiz';const catBtn=side.querySelector('[data-v189-page="category"]');if(catBtn&&catBtn.parentNode)catBtn.parentNode.insertBefore(btn,catBtn.nextSibling);else side.appendChild(btn);}
    let page=document.getElementById('v189PageCompany');
    if(!page){page=document.createElement('section');page.id='v189PageCompany';page.className='v189-page';page.innerHTML='<div class="v189-page-head"><h3>Firma Bazlı Analiz</h3><span>Firma seçimine göre özet ve faturalar</span></div><div id="v208CompanyContent"></div>';const catPage=document.getElementById('v189PageCategory');if(catPage&&catPage.parentNode)catPage.parentNode.insertBefore(page,catPage.nextSibling);else main.appendChild(page);}  
  }
  function renderCompanyPage(){
    ensureCompanyPage();const content=document.getElementById('v208CompanyContent');if(!content)return;
    let panel=document.getElementById('v208CompanyPagePanel');if(!panel){panel=document.createElement('div');panel.id='v208CompanyPagePanel';panel.innerHTML='<h4>Firma Bazlı Fatura Analizi</h4><small>Firmaya tıklayınca o firmaya ait alış, satış ve masraf kayıtları açılır.</small><div class="v208-body"></div>';content.appendChild(panel);}else if(!content.contains(panel))content.appendChild(panel);
    const body=panel.querySelector('.v208-body');const rows=allRows();const totalSpend=rows.filter(r=>r.__side!=='Satış').reduce((s,r)=>s+amount(r),0);const totalSales=rows.filter(r=>r.__side==='Satış').reduce((s,r)=>s+amount(r),0);const by={};
    rows.forEach(r=>{const name=rowCompany(r)||'SEÇİLMEDİ';if(!by[name])by[name]={name,alis:0,satis:0,masraf:0,rows:[]};if(r.__side==='Satış')by[name].satis+=amount(r);else if(r.__side==='Masraf')by[name].masraf+=amount(r);else by[name].alis+=amount(r);by[name].rows.push(r);});
    const data=Object.values(by).sort((a,b)=>(b.alis+b.satis+b.masraf)-(a.alis+a.satis+a.masraf));
    body.innerHTML=data.length?'<div class="table-wrap"><table class="v206-table"><thead><tr><th>Firma</th><th>Alış</th><th>Satış</th><th>Masraf</th><th>Net</th><th>Harcama %</th><th>Sat&#305;&#351; %</th><th>Detay</th></tr></thead><tbody>'+data.map((g,i)=>{const spend=g.alis+g.masraf,sp=totalSpend?spend/totalSpend*100:0,salesShare=totalSales?g.satis/totalSales*100:0,id='v208-firm-'+i;return '<tr class="v208-summary" data-v208-toggle="'+id+'"><td><span class="v208-arrow">+</span><strong>'+esc(g.name)+'</strong></td><td class="amount">'+fmt(g.alis)+'</td><td class="amount">'+fmt(g.satis)+'</td><td class="amount">'+fmt(g.masraf)+'</td><td class="amount"><strong>'+fmt(g.satis-g.alis-g.masraf)+'</strong></td><td>'+percentCell(sp)+'</td><td>'+percentCell(salesShare)+'</td><td><strong>'+g.rows.length+'</strong> fatura/fiş</td></tr><tr class="v208-detail-row" data-v208-detail="'+id+'"><td colspan="8"><div class="v208-invoice-list">'+g.rows.map(r=>invoiceLine(r,true)).join('')+'</div></td></tr>';}).join('')+'</tbody></table></div>':'<div class="v208-empty">Faturaları analiz edince firma bazlı analiz burada dolacak.</div>';
  }
  function renderCategoryOnly(){
    const panel=document.getElementById('v205CompanyInvoicesPanel');if(panel)panel.remove();
    const rows=allRows();const content=document.getElementById('v189CategoryContent');if(!content)return;
    let p=document.getElementById('v205CategoryDetailsPanel');if(!p){p=document.createElement('div');p.id='v205CategoryDetailsPanel';p.innerHTML='<h4>Kategori Bazlı Analiz</h4><small>Kategori satırına tıklayınca sadece o kategorideki faturalar açılır.</small><div class="v205-body"></div>';content.appendChild(p);}else{let h=p.querySelector('h4');if(h)h.textContent='Kategori Bazlı Analiz';let s=p.querySelector('small');if(s)s.textContent='Kategori satırına tıklayınca sadece o kategorideki faturalar açılır.';}
    const body=p.querySelector('.v205-body');const spendTotal=rows.filter(r=>r.__side!=='Satış').reduce((s,r)=>s+amount(r),0);const by={};
    rows.forEach(r=>{const c=cat(r),key=c.main+'||'+c.sub;if(!by[key])by[key]={main:c.main,sub:c.sub,alis:0,satis:0,masraf:0,rows:[]};if(r.__side==='Satış')by[key].satis+=amount(r);else if(r.__side==='Masraf')by[key].masraf+=amount(r);else by[key].alis+=amount(r);by[key].rows.push(r);});
    const data=Object.values(by).sort((a,b)=>(b.alis+b.masraf)-(a.alis+a.masraf));
    body.innerHTML=data.length?'<div class="table-wrap"><table class="v206-table"><thead><tr><th>Kategori</th><th>Alt Kategori</th><th>Harcama</th><th>Harcama %</th><th>Alış</th><th>Masraf</th><th>Satış</th><th>Detay</th></tr></thead><tbody>'+data.map((g,i)=>{const spend=g.alis+g.masraf,share=spendTotal?spend/spendTotal*100:0,id='v208-cat-'+i;return '<tr class="v208-summary" data-v208-toggle="'+id+'"><td><span class="v208-arrow">+</span><strong>'+esc(g.main)+'</strong></td><td>'+esc(g.sub)+'</td><td class="amount"><strong>'+fmt(spend)+'</strong></td><td>'+percentCell(share)+'</td><td class="amount">'+fmt(g.alis)+'</td><td class="amount">'+fmt(g.masraf)+'</td><td class="amount">'+fmt(g.satis)+'</td><td><strong>'+g.rows.length+'</strong> işlem</td></tr><tr class="v208-detail-row" data-v208-detail="'+id+'"><td colspan="8"><div class="v208-invoice-list">'+g.rows.map(r=>invoiceLine(r,false)).join('')+'</div></td></tr>';}).join('')+'</tbody></table></div>':'<div class="v208-empty">Faturaları analiz edince kategori bazlı tablo burada dolacak.</div>';
  }
  function restoreExpenseSummary(){
    const results=document.getElementById('invoiceAnalysisResults'),table=document.getElementById('expenseReceiptTable');if(!results||!table)return;
    let wrap=table.closest('.table-wrap');if(!wrap){wrap=document.createElement('div');wrap.className='table-wrap';table.parentNode&&table.parentNode.insertBefore(wrap,table);wrap.appendChild(table);} 
    let holder=document.getElementById('v208ExpenseSummaryHome');if(!holder){holder=document.createElement('div');holder.id='v208ExpenseSummaryHome';holder.innerHTML='<h3 class="section-title">Masraf Fişleri Özeti</h3>';results.appendChild(holder);}if(!holder.contains(wrap))holder.appendChild(wrap);
    ['v204ExpenseSummaryPanel','v198MovedExpenseWrap'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  }
  function setActive(page){
    ensureCompanyPage();
    document.querySelectorAll('#v189InvoiceSide [data-v189-page]').forEach(b=>b.classList.toggle('active',b.getAttribute('data-v189-page')===page));
    document.querySelectorAll('#v189InvoiceMain .v189-page').forEach(p=>p.classList.toggle('active',p.id==='v189Page'+page.charAt(0).toUpperCase()+page.slice(1)));
    if(page==='category'){setTimeout(renderCategoryOnly,120);setTimeout(renderCategoryOnly,450);}if(page==='company'){setTimeout(renderCompanyPage,120);setTimeout(renderCompanyPage,450);}setTimeout(restoreExpenseSummary,220);
  }
  const prevSet=window.v189InvoiceSetPage;
  window.v189InvoiceSetPage=function(page){page=page||'analysis';let r;if(typeof prevSet==='function'&&page!=='company'){r=prevSet.apply(this,arguments);}else{try{if(typeof window.v189InvoiceLayout==='function')window.v189InvoiceLayout();}catch(e){}}
    setActive(page);return r;};
  const prevRender=window.renderInvoiceProfitResults;if(typeof prevRender==='function'&&!prevRender.__v208Clean){window.renderInvoiceProfitResults=function(){const r=prevRender.apply(this,arguments);setTimeout(function(){ensureCompanyPage();renderCategoryOnly();renderCompanyPage();restoreExpenseSummary();},350);return r;};window.renderInvoiceProfitResults.__v208Clean=true;}
  document.addEventListener('click',function(e){const t=e.target&&e.target.closest&&e.target.closest('[data-v208-toggle]');if(t){e.preventDefault();const id=t.getAttribute('data-v208-toggle');const row=document.querySelector('[data-v208-detail="'+CSS.escape(id)+'"]');const open=!t.classList.contains('is-open');t.classList.toggle('is-open',open);const a=t.querySelector('.v208-arrow');if(a)a.textContent=open?'−':'+';if(row)row.classList.toggle('is-open',open);return;}const nav=e.target&&e.target.closest&&e.target.closest('#v189InvoiceSide [data-v189-page]');if(nav){setTimeout(function(){setActive(nav.getAttribute('data-v189-page'));},40);}},true);
  function init(){ensureCompanyPage();restoreExpenseSummary();if(document.querySelector('#v189InvoiceSide [data-v189-page="category"].active'))renderCategoryOnly();if(document.querySelector('#v189InvoiceSide [data-v189-page="company"].active'))renderCompanyPage();}
  document.addEventListener('DOMContentLoaded',function(){setTimeout(init,500);});setTimeout(init,900);setTimeout(init,2200);
})();
