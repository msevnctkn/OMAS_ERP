(function(){
  const STORE='invoiceCompanyAssignmentsV1';
  const COMPANIES=['ÖMAS OTOMASYON','ÖMAS KONSEPT','ORTAK'];
  function loadAssignments(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(e){return {};}}
  function saveAssignments(data){try{localStorage.setItem(STORE,JSON.stringify(data||{}));}catch(e){console.warn('Firma seçimleri kaydedilemedi',e);}}
  function rowKey(r){return [r&&r.tur||'',r&&r.kaynak||'',r&&r.sayfa||'',r&&r.satir||'',r&&r.faturaNo||'',r&&r.firma||'',r&&r.tarih||'',Number(r&&r.toplam||0).toFixed(2),Number((r&&(r.matrah||r.net))||0).toFixed(2),Number(r&&r.kdv||0).toFixed(2)].join('|');}
  window.invoiceCompanyAssignments=loadAssignments();
  window.invoiceRowCompanyKey=rowKey;
  window.getInvoiceRowCompany=function(r){
    const direct=r&&r.firmaSirket;
    const stored=window.invoiceCompanyAssignments[rowKey(r)];
    return direct||stored||'';
  };
  window.setInvoiceRowCompany=function(key,val){
    window.invoiceCompanyAssignments=loadAssignments();
    if(val) window.invoiceCompanyAssignments[key]=val; else delete window.invoiceCompanyAssignments[key];
  };
  window.saveInvoiceCompanySelections=function(silent){
    const data=loadAssignments();
    document.querySelectorAll('.invoice-company-select[data-invoice-key]').forEach(sel=>{
      const key=sel.getAttribute('data-invoice-key');
      const val=sel.value||'';
      if(val) data[key]=val; else delete data[key];
    });
    window.invoiceCompanyAssignments=data;
    saveAssignments(data);
    if(typeof invoicePurchaseRows!=='undefined') {
      [...(invoicePurchaseRows||[]),...(invoiceSalesRows||[]),...(invoiceExpenseRows||[]),...(invoiceReturnRows||[]),...(invoiceTevkifatRows||[]),...(invoiceIstisnaRows||[]),...(invoiceExcludedRows||[])].forEach(r=>{const c=data[rowKey(r)]; if(c) r.firmaSirket=c; else delete r.firmaSirket;});
      if(typeof invoiceSaveYearlyMemory==='function') invoiceSaveYearlyMemory();
    }
    const st=document.getElementById('invoiceAnalysisStatus');
    if(st) st.innerHTML='Firma seçimleri kaydedildi. <strong>Firma Analiz Et</strong> butonuna basarak dağılımı görebilirsin.';
    if(!silent && document.getElementById('invoiceCompanyAnalysisPanel')) renderInvoiceCompanyAnalysis();
  };
  function optionsHtml(selected){
    return '<option value="">Firma Seç</option>'+COMPANIES.map(c=>`<option value="${escapeHtml(c)}" ${selected===c?'selected':''}>${escapeHtml(c)}</option>`).join('');
  }
  window.renderInvoiceDetailTable=function(tableId,rows){
    const thead=document.querySelector('#'+tableId+' thead');
    const tbody=document.querySelector('#'+tableId+' tbody');
    if(!thead||!tbody) return;
    thead.innerHTML='<tr><th>Firma Seç</th><th>Firma</th><th>Fatura No</th><th>Tarih</th><th>Matrah</th><th>%20 KDV</th><th>%10 KDV</th><th>%1 KDV</th><th>Diğer KDV</th><th>Toplam KDV</th><th>Genel Toplam</th><th>Kaynak</th></tr>';
    tbody.innerHTML='';
    rows=rows||[];
    if(!rows.length){tbody.innerHTML='<tr><td colspan="12">Kayıt yok.</td></tr>';return;}
    rows.forEach(r=>{
      const kdv20=invoiceRowVatAmount(r,20);
      const kdv10=invoiceRowVatAmount(r,10);
      const kdv1=invoiceRowVatAmount(r,1);
      const knownKdv=kdv20+kdv10+kdv1;
      const otherKdv=Math.max((r.kdv||0)-knownKdv,0);
      const key=rowKey(r);
      const selected=getInvoiceRowCompany(r);
      tbody.innerHTML+=`<tr>
        <td><select class="invoice-company-select" data-invoice-key="${escapeHtml(key)}">${optionsHtml(selected)}</select></td>
        <td>${escapeHtml(r.firma||'')}</td>
        <td>${escapeHtml(r.faturaNo||'')}</td>
        <td>${escapeHtml(r.tarih||'')}</td>
        <td class="amount">${invoiceFormatTL(r.matrah||r.net)}</td>
        <td class="amount">${invoiceFormatTL(kdv20)}</td>
        <td class="amount">${invoiceFormatTL(kdv10)}</td>
        <td class="amount">${invoiceFormatTL(kdv1)}</td>
        <td class="amount">${invoiceFormatTL(otherKdv)}</td>
        <td class="amount"><strong>${invoiceFormatTL(r.kdv)}</strong></td>
        <td class="amount"><strong>${invoiceFormatTL(r.toplam)}</strong></td>
        <td>${escapeHtml(r.kaynak||'')}</td>
      </tr>`;
    });
  };
  function emptyStats(name){return {name,alisMatrah:0,alisKdv:0,alisToplam:0,satisMatrah:0,satisKdv:0,satisToplam:0,masrafMatrah:0,masrafKdv:0,masrafToplam:0,adetAlis:0,adetSatis:0,adetMasraf:0};}
  function addRow(st,r,kind){
    const mat=Number((r&&(r.matrah||r.net))||0), kdv=Number(r&&r.kdv||0), top=Number(r&&r.toplam||0);
    if(kind==='Alış'){st.alisMatrah+=mat;st.alisKdv+=kdv;st.alisToplam+=top;st.adetAlis++;}
    if(kind==='Satış'){st.satisMatrah+=mat;st.satisKdv+=kdv;st.satisToplam+=top;st.adetSatis++;}
    if(kind==='Masraf'){st.masrafMatrah+=mat;st.masrafKdv+=kdv;st.masrafToplam+=top;st.adetMasraf++;}
  }
  function pct(part,total){return total?((part/total)*100):0;}
  function barRow(label,val,max,cls){const w=max?Math.max(2,Math.min(100,Math.abs(val)/max*100)):0;return `<div class="invoice-company-bar-row"><div class="invoice-company-bar-label">${escapeHtml(label)}</div><div class="invoice-company-bar-wrap"><div class="${cls}" style="width:${w}%"></div></div><div class="invoice-company-bar-val">${invoiceFormatTL(val)}</div></div>`;}
  window.renderInvoiceCompanyAnalysis=function(){
    saveInvoiceCompanySelections(true);
    const panel=document.getElementById('invoiceCompanyAnalysisPanel');
    const body=document.getElementById('invoiceCompanyAnalysisBody');
    if(!panel||!body) return;
    panel.style.display='block';
    const assignments=loadAssignments();
    const companies=[...COMPANIES,'SEÇİLMEDİ'];
    const stats={}; companies.forEach(c=>stats[c]=emptyStats(c));
    const validPurchase=(typeof invoiceMainSummaryRows==='function')?invoiceMainSummaryRows(invoicePurchaseRows||[],[...(invoiceReturnRows||[]).filter(r=>r.tur==='Alış'),...(invoiceTevkifatRows||[]).filter(r=>r.tur==='Alış'),...(invoiceIstisnaRows||[]).filter(r=>r.tur==='Alış')]):(invoicePurchaseRows||[]);
    const validSales=(typeof invoiceMainSummaryRows==='function')?invoiceMainSummaryRows(invoiceSalesRows||[],[...(invoiceReturnRows||[]).filter(r=>r.tur==='Satış'),...(invoiceTevkifatRows||[]).filter(r=>r.tur==='Satış'),...(invoiceIstisnaRows||[]).filter(r=>r.tur==='Satış')]):(invoiceSalesRows||[]);
    validPurchase.forEach(r=>addRow(stats[getInvoiceRowCompany(r)||'SEÇİLMEDİ'],r,'Alış'));
    validSales.forEach(r=>addRow(stats[getInvoiceRowCompany(r)||'SEÇİLMEDİ'],r,'Satış'));
    // Masraf fişlerinde ayrı firma seçimi olmadığı için firma seçilmemiş kabul edilir. İstersen sonraki sürümde masraf satırına da seçim ekleriz.
    (invoiceExpenseRows||[]).forEach(r=>addRow(stats['SEÇİLMEDİ'],r,'Masraf'));
    const rows=companies.map(c=>{const s=stats[c];s.girdi=s.satisToplam;s.cikti=s.alisToplam+s.masrafToplam;s.net=s.girdi-s.cikti;s.odenecekKdv=s.satisKdv-s.alisKdv-s.masrafKdv;return s;});
    const totals=rows.reduce((a,s)=>{['alisToplam','satisToplam','masrafToplam','alisKdv','satisKdv','masrafKdv','cikti','girdi','net','odenecekKdv'].forEach(k=>a[k]=(a[k]||0)+Number(s[k]||0));return a;},{});
    const maxOut=Math.max(1,...rows.map(r=>r.cikti));
    const maxIn=Math.max(1,...rows.map(r=>r.girdi));
    const assignedCount=Object.keys(assignments).length;
    const unassigned=rows.find(r=>r.name==='SEÇİLMEDİ')||emptyStats('SEÇİLMEDİ');
    body.innerHTML=`
      <div class="invoice-company-kpis">
        <div class="invoice-company-kpi"><span>Toplam Girdi / Satış</span><strong>${invoiceFormatTL(totals.girdi||0)}</strong><small>Kesilen satış faturaları KDV dahil.</small></div>
        <div class="invoice-company-kpi"><span>Toplam Çıktı / Alış + Masraf</span><strong>${invoiceFormatTL(totals.cikti||0)}</strong><small>Alış faturaları + masraf fişleri KDV dahil.</small></div>
        <div class="invoice-company-kpi"><span>Net Fatura Farkı</span><strong class="${(totals.net||0)>=0?'positive':'negative'}">${invoiceFormatTL(totals.net||0)}</strong><small>Satış - alış - masraf.</small></div>
        <div class="invoice-company-kpi"><span>Firma Seçimi</span><strong>${assignedCount}</strong><small>Seçilmemiş fatura/masraf etkisi: ${invoiceFormatTL(unassigned.cikti+unassigned.girdi)}</small></div>
      </div>
      <div class="invoice-company-grid">
        <div class="invoice-company-card"><h4>Girdi Dağılımı / Satış Faturaları</h4><div class="invoice-company-bars">${rows.map(r=>barRow(r.name+' • %'+pct(r.girdi,totals.girdi||0).toFixed(1).replace('.',','),r.girdi,maxIn,'invoice-company-bar-in')).join('')}</div></div>
        <div class="invoice-company-card"><h4>Harcama Dağılımı / Alış + Masraf</h4><div class="invoice-company-bars">${rows.map(r=>barRow(r.name+' • %'+pct(r.cikti,totals.cikti||0).toFixed(1).replace('.',','),r.cikti,maxOut,'invoice-company-bar-out')).join('')}</div></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Firma</th><th>Alış Faturası</th><th>Satış Faturası</th><th>Masraf Fişi</th><th>Girdi</th><th>Çıktı</th><th>Net</th><th>Alış KDV</th><th>Satış KDV</th><th>Masraf KDV</th><th>Ödenecek KDV Payı</th><th>Harcama %</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td><strong>${escapeHtml(r.name)}</strong></td><td class="amount">${invoiceFormatTL(r.alisToplam)}<br><small>${r.adetAlis} adet</small></td><td class="amount">${invoiceFormatTL(r.satisToplam)}<br><small>${r.adetSatis} adet</small></td><td class="amount">${invoiceFormatTL(r.masrafToplam)}<br><small>${r.adetMasraf} satır</small></td><td class="amount positive">${invoiceFormatTL(r.girdi)}</td><td class="amount negative">${invoiceFormatTL(r.cikti)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${invoiceFormatTL(r.net)}</td><td class="amount">${invoiceFormatTL(r.alisKdv)}</td><td class="amount">${invoiceFormatTL(r.satisKdv)}</td><td class="amount">${invoiceFormatTL(r.masrafKdv)}</td><td class="amount ${r.odenecekKdv>=0?'negative':'positive'}">${invoiceFormatTL(r.odenecekKdv)}</td><td class="amount">%${pct(r.cikti,totals.cikti||0).toFixed(1).replace('.',',')}</td></tr>`).join('')}
      <tr style="background:#111827;color:#fff"><td><strong>GENEL TOPLAM</strong></td><td class="amount">${invoiceFormatTL(totals.alisToplam||0)}</td><td class="amount">${invoiceFormatTL(totals.satisToplam||0)}</td><td class="amount">${invoiceFormatTL(totals.masrafToplam||0)}</td><td class="amount">${invoiceFormatTL(totals.girdi||0)}</td><td class="amount">${invoiceFormatTL(totals.cikti||0)}</td><td class="amount">${invoiceFormatTL(totals.net||0)}</td><td class="amount">${invoiceFormatTL(totals.alisKdv||0)}</td><td class="amount">${invoiceFormatTL(totals.satisKdv||0)}</td><td class="amount">${invoiceFormatTL(totals.masrafKdv||0)}</td><td class="amount">${invoiceFormatTL(totals.odenecekKdv||0)}</td><td class="amount">%100</td></tr>
      </tbody></table></div>
      <div class="invoice-company-empty" style="margin-top:14px"><strong>Not:</strong> Ödenecek KDV payı firma bazında <strong>Satış KDV - Alış KDV - Masraf KDV</strong> mantığıyla hesaplanır. Firma seçilmeyen satırlar <strong>SEÇİLMEDİ</strong> altında toplanır; seçimleri yapıp Kaydet'e bastığında tablo netleşir.</div>
    `;
  };
  function ensureCompanyPanel(){
    const results=document.getElementById('invoiceAnalysisResults');
    if(!results) return;
    const toolbar=document.getElementById('invoiceCompanyToolbar');
    let panel=document.getElementById('invoiceCompanyAnalysisPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='invoiceCompanyAnalysisPanel';
      panel.className='invoice-company-panel';
      panel.style.display='none';
      panel.innerHTML='<div class="invoice-company-head"><div><h3>Firma Bazlı Fatura Analizi</h3><small>Konsept / Otomasyon / Ortak ayrımına göre alış, satış, girdi, çıktı, KDV ve harcama yüzdeleri.</small></div><button class="primary-button" type="button" onclick="renderInvoiceCompanyAnalysis()">Yenile</button></div><div id="invoiceCompanyAnalysisBody" class="invoice-company-body"></div>';
    }
    if(toolbar && toolbar.parentNode){
      if(toolbar.nextSibling!==panel) toolbar.parentNode.insertBefore(panel, toolbar.nextSibling);
    }else if(!panel.parentNode){
      results.insertBefore(panel, results.firstChild);
    }
  }
  function ensureCompanyToolbar(){
    const results=document.getElementById('invoiceAnalysisResults');
    if(!results || document.getElementById('invoiceCompanyToolbar')) return;
    const toggle=document.querySelector('.invoice-detail-toggle-panel');
    const toolbar=document.createElement('div');
    toolbar.id='invoiceCompanyToolbar';
    toolbar.className='invoice-company-toolbar';
    toolbar.innerHTML='<div><strong>Firma Seçimleri</strong><br><small>Alış ve satış fatura tablolarında firma adının solundaki seçimleri yap, sonra kaydet. Seçimler tarayıcı hafızasında kalır.</small></div><button class="primary-button" type="button" onclick="saveInvoiceCompanySelections()">Firma Seçimlerini Kaydet</button><button class="secondary-button" type="button" onclick="renderInvoiceCompanyAnalysis()">Firma Analiz Et</button>';
    if(toggle) toggle.parentNode.insertBefore(toolbar,toggle); else results.appendChild(toolbar);
  }
  function moveProfitExpenseBlock(){
    const grid=document.querySelector('#invoiceAnalysisModule .mini-grid');
    if(!grid) return;
    const blocks=[...grid.querySelectorAll('.upload-area')];
    const target=blocks.find(b=>(b.textContent||'').includes('Vergi Mevzuatına Uygun Kar Giderleri'));
    if(!target || target.dataset.moved==='1') return;
    target.dataset.moved='1';
    target.style.gridColumn='1 / -1';
    const actions=[...document.querySelectorAll('#invoiceAnalysisModule .actions')].find(a=>a.querySelector('[onclick="analyzeInvoiceProfit()"]'));
    if(actions) actions.parentNode.insertBefore(target, actions);
  }
  const oldRender=window.renderInvoiceProfitResults;
  if(typeof oldRender==='function'){
    window.renderInvoiceProfitResults=function(){
      oldRender.apply(this,arguments);
      ensureCompanyToolbar(); ensureCompanyPanel();
      if(typeof renderInvoiceDetailSections==='function') renderInvoiceDetailSections();
    };
  }
  document.addEventListener('DOMContentLoaded',function(){moveProfitExpenseBlock(); ensureCompanyToolbar(); ensureCompanyPanel();});
  setTimeout(function(){moveProfitExpenseBlock(); ensureCompanyToolbar(); ensureCompanyPanel();},500);
})();
