(function(){
  var ROWS='v233XmlInvoiceLines', CAT='v233XmlCategoryAssignments', COMP='v244XmlCompanyAssignments';
  function q(s,r){return (r||document).querySelector(s);} function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function read(k,fb){try{var raw=localStorage.getItem(k);if(raw==null)return fb;var v=JSON.parse(raw);return v==null?fb:v;}catch(e){return fb;}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(v){try{return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v||0));}catch(e){return String(v||0);}}
  function pct(v){return (isFinite(v)?Number(v):0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';}
  function n(v){return Number(v||0)||0;}
  function code(v){v=String(v||'').trim().toUpperCase();return v==='O'||v==='K'?v:'';}
  function firmName(c){return c==='O'?'ÖMAS OTOMASYON':(c==='K'?'ÖMAS KONSEPT':'FİRMA SEÇİLMEDİ');}
  function catOf(r,cats){var a=cats[r.id]||{};return {main:a.main||'Kategorisiz',sub:a.sub||'-'};}
  function rowFirm(r,companies){return code(companies[r.id]||r.companyCode||r.company||'');}
  function rowTotal(r){return n(r.total)||(n(r.matrah)+n(r.kdv));}
  function add(sum,r){sum.count++;sum.matrah+=n(r.matrah);sum.kdv+=n(r.kdv);sum.total+=rowTotal(r);sum.rows.push(r);return sum;}
  function blank(name,code){return {name:name,code:code||'',count:0,matrah:0,kdv:0,total:0,rows:[]};}
  function aggregate(){
    var rows=read(ROWS,[]),cats=read(CAT,{}),companies=read(COMP,{}),firms={O:blank('ÖMAS OTOMASYON','O'),K:blank('ÖMAS KONSEPT','K'),NONE:blank('FİRMA SEÇİLMEDİ','')},byCat={},grand=blank('TOPLAM','ALL'),categorized=0,firmSelected=0;
    rows.forEach(function(r){
      var c=rowFirm(r,companies),fk=c||'NONE',ct=catOf(r,cats),key=fk+'||'+ct.main+'||'+ct.sub;
      if(c)firmSelected++; if((cats[r.id]||{}).main)categorized++;
      add(firms[fk],r); add(grand,r);
      if(!byCat[key])byCat[key]={firmCode:c,firm:firmName(c),main:ct.main,sub:ct.sub,count:0,matrah:0,kdv:0,total:0,rows:[]};
      add(byCat[key],r);
    });
    var catRows=Object.keys(byCat).map(function(k){return byCat[k];}).sort(function(a,b){return String(a.firm).localeCompare(String(b.firm),'tr')||b.total-a.total||String(a.main).localeCompare(String(b.main),'tr');});
    return {rows:rows,firms:firms,cats:catRows,grand:grand,categorized:categorized,firmSelected:firmSelected};
  }
  function ensureShell(){
    if((!q('#v189InvoiceSide')||!q('#v189InvoiceMain'))&&typeof window.v189InvoiceLayout==='function'){try{window.v189InvoiceLayout();}catch(e){}}
    var side=q('#v189InvoiceSide'),main=q('#v189InvoiceMain');if(!side||!main)return null;
    var catBtn=q('[data-v189-page="category"]',side),companyBtn=q('[data-v189-page="company"]',side);
    if(!companyBtn){companyBtn=document.createElement('button');companyBtn.type='button';companyBtn.setAttribute('data-v189-page','company');companyBtn.textContent='Firma Bazlı Analiz';if(catBtn&&catBtn.parentNode)catBtn.parentNode.insertBefore(companyBtn,catBtn.nextSibling);else side.appendChild(companyBtn);}
    var page=q('#v189PageCompany');
    if(!page){page=document.createElement('section');page.id='v189PageCompany';page.className='v189-page';page.innerHTML='<div class="v189-page-head"><h3>Firma Bazlı Analiz</h3><span>XML kalemlerinde O/K firma seçimine göre harcama ve kategori özeti</span></div><div id="v258CompanyHost"></div>';var catPage=q('#v189PageCategory');if(catPage&&catPage.parentNode)catPage.parentNode.insertBefore(page,catPage.nextSibling);else main.appendChild(page);}
    if(!q('#v258CompanyHost',page)){var h=document.createElement('div');h.id='v258CompanyHost';page.appendChild(h);}
    return page;
  }
  function renderFirmCards(ag){
    return ['K','O'].map(function(k){
      var f=ag.firms[k],items=ag.cats.filter(function(x){return x.firmCode===k;}).slice(0,6);
      return '<div class="v258-card"><h5>'+esc(f.name)+' kategori dağılımı</h5><div class="v258-card-body">'+
        '<div class="v258-muted">Toplam: <strong>'+money(f.total)+' TL</strong> | Kalem: <strong>'+f.count+'</strong></div>'+
        '<div class="v258-list">'+(items.length?items.map(function(x){var p=f.total?x.total/f.total*100:0;return '<div class="v258-list-row"><strong><span>'+esc(x.main)+' / '+esc(x.sub)+'</span><span>'+pct(p)+'</span></strong><div class="v258-bar"><span class="v258-fill" style="width:'+Math.max(0,Math.min(100,p))+'%"></span></div><span>'+money(x.total)+' TL</span></div>';}).join(''):'<div class="v258-empty">Bu firmaya atanmış kategori yok.</div>')+'</div></div></div>';
    }).join('');
  }
  function firmSummaryRows(ag){
    return ['K','O','NONE'].map(function(k,i){
      var f=ag.firms[k],id='v258-firm-'+i,share=ag.grand.total?f.total/ag.grand.total*100:0;
      return '<tr><td><button class="v258-link" type="button" data-v258-toggle="'+id+'"><span class="v258-pill">'+esc(f.name)+'</span></button></td><td class="amount">'+f.count+'</td><td class="amount">'+money(f.matrah)+' TL</td><td class="amount">'+money(f.kdv)+' TL</td><td class="amount"><strong>'+money(f.total)+' TL</strong></td><td>'+percentBar(share)+'</td></tr>'+detailRow(id,f.name,f.rows,6);
    }).join('');
  }
  function percentBar(value){return '<strong>'+pct(value)+'</strong><div class="v258-bar"><span class="v258-fill" style="width:'+Math.max(0,Math.min(100,value))+'%"></span></div>';}
  function detailRow(id,title,rows,colspan){
    return '<tr class="v258-detail" data-v258-detail="'+esc(id)+'"><td colspan="'+colspan+'"><div class="v258-detail-box"><div class="v258-detail-title">'+esc(title)+' içindeki fatura kalemleri ('+rows.length+' kalem)</div>'+lineTable(rows)+'</div></td></tr>';
  }
  function lineTable(rows){
    if(!rows.length)return '<div class="v258-empty">Bu seçimin içinde fatura kalemi yok.</div>';
    return '<div class="v258-table-wrap"><table class="v258-table"><thead><tr><th>Fatura No</th><th>Tarih</th><th>Satıcı</th><th>Kalem</th><th>Adet</th><th>Döviz / Kur</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r.invoiceNo||'-')+'</td><td>'+esc(r.date||'')+'</td><td>'+esc(r.supplier||'-')+'</td><td><strong>'+esc(r.name||'')+'</strong></td><td class="amount">'+money(r.qty)+' '+esc(r.unit||'')+'</td><td>'+esc(r.currency||'TRY')+'<br><span class="v258-muted">Kur: '+money(r.exchangeRate||1)+'</span></td><td class="amount">'+money(r.matrah)+' TL</td><td class="amount">'+money(r.kdv)+' TL</td><td class="amount"><strong>'+money(rowTotal(r))+' TL</strong></td></tr>';}).join('')+'</tbody></table></div>';
  }
  function categoryRows(ag){
    if(!ag.cats.length)return '<tr><td colspan="9">XML fatura yükleyince firma bazlı kategori özeti burada görünecek.</td></tr>';
    return ag.cats.map(function(x,i){
      var id='v258-cat-'+i,firmBase=ag.firms[x.firmCode||'NONE'].total||0,totalShare=ag.grand.total?x.total/ag.grand.total*100:0,firmShare=firmBase?x.total/firmBase*100:0;
      return '<tr><td><span class="v258-pill">'+esc(x.firm)+'</span></td><td><button class="v258-link" type="button" data-v258-toggle="'+id+'">'+esc(x.main)+'</button><div class="v258-muted">Faturaları göster</div></td><td>'+esc(x.sub)+'</td><td class="amount">'+x.count+'</td><td>'+percentBar(firmShare)+'</td><td>'+percentBar(totalShare)+'</td><td class="amount">'+money(x.matrah)+' TL</td><td class="amount">'+money(x.kdv)+' TL</td><td class="amount"><strong>'+money(x.total)+' TL</strong></td></tr>'+detailRow(id,x.firm+' / '+x.main+' / '+x.sub,x.rows,9);
    }).join('');
  }
  function render(){
    var page=ensureShell();if(!page)return;
    ['v198CompanyAnalysisPanel','v205CompanyInvoicesPanel','v208CompanyPagePanel','v211CompanyPanel','v212CompanyPanel','v213CompanyPanel','v214CompanyPanel'].forEach(function(id){var el=q('#'+id);if(el)el.style.display='none';});
    var host=q('#v258CompanyHost',page),ag=aggregate(),fK=ag.firms.K,fO=ag.firms.O,fN=ag.firms.NONE;
    var panel=q('#v258CompanyXmlPanel',host);if(!panel){panel=document.createElement('div');panel.id='v258CompanyXmlPanel';host.insertBefore(panel,host.firstChild);}
    panel.innerHTML='<div class="v258-head"><div><h4>Firma Bazlı Analiz</h4><small>XML fatura kalemleri, O/K firma seçimi ve kategori kayıtlarına göre hesaplanır.</small></div><button class="v258-btn secondary" type="button" id="v258RefreshCompany">Yenile</button></div>'+
      '<div class="v258-body">'+(ag.rows.length?'<div class="v258-kpis"><div class="v258-kpi"><span>Toplam Harcama</span><strong>'+money(ag.grand.total)+' TL</strong><small>'+ag.rows.length+' XML kalemi</small></div><div class="v258-kpi"><span>ÖMAS Konsept Payı</span><strong>'+pct(ag.grand.total?fK.total/ag.grand.total*100:0)+'</strong><small>'+money(fK.total)+' TL | KDV '+money(fK.kdv)+' TL</small></div><div class="v258-kpi"><span>ÖMAS Otomasyon Payı</span><strong>'+pct(ag.grand.total?fO.total/ag.grand.total*100:0)+'</strong><small>'+money(fO.total)+' TL | KDV '+money(fO.kdv)+' TL</small></div><div class="v258-kpi"><span>Firma Seçilmedi</span><strong>'+money(fN.total)+' TL</strong><small>'+fN.count+' kalem | O/K seçimi yok</small></div></div><div class="v258-layout">'+renderFirmCards(ag)+'</div><div class="v258-card" style="margin-bottom:12px"><h5>Firma Özeti</h5><div class="v258-table-wrap"><table class="v258-table"><thead><tr><th>Firma</th><th>Kalem</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Toplam Harcama Payı</th></tr></thead><tbody>'+firmSummaryRows(ag)+'</tbody></table></div></div><div class="v258-card"><h5>Firma Bazlı Kategori Özeti</h5><div class="v258-table-wrap"><table class="v258-table"><thead><tr><th>Firma</th><th>Ana Kategori</th><th>Alt Kategori</th><th>Kalem</th><th>Firma İçi %</th><th>Toplam Harcama %</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th></tr></thead><tbody>'+categoryRows(ag)+'</tbody></table></div></div>':'<div class="v258-empty">Henüz XML fatura kalemi yok. Fatura XML Oku bölümünden dosya yükleyince firma bazlı analiz burada dolacak.</div>')+'</div>';
  }
  window.v258RenderCompanyCategoryAnalysis=render;
  window.v258ToggleCompanyDetail=function(id){var row=q('[data-v258-detail="'+id+'"]');if(row)row.classList.toggle('open');return false;};
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('[data-v258-toggle]');if(t){e.preventDefault();e.stopPropagation();window.v258ToggleCompanyDetail(t.getAttribute('data-v258-toggle'));return;}
    if(e.target&&e.target.closest&&e.target.closest('#v258RefreshCompany')){e.preventDefault();render();return;}
    var nav=e.target&&e.target.closest&&e.target.closest('[data-v189-page="company"]');if(nav){setTimeout(render,80);setTimeout(render,500);setTimeout(render,1100);}
  },true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(render,1000);});
  setInterval(function(){var p=q('#v189PageCompany');if(p&&(p.classList.contains('active')||p.style.display==='block')&&!q('#v258CompanyXmlPanel'))render();},1200);
})();
