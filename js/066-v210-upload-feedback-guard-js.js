(function(){
  function byId(id){return document.getElementById(id);} 
  function files(id){const el=byId(id);return el&&el.files?[...el.files]:[];}
  function status(){return byId('invoiceAnalysisStatus');}
  function ensureFeedback(){
    const page=byId('v189PageAnalysis')||byId('invoiceAnalysisModule');if(!page)return null;
    let box=byId('v210InvoiceUploadFeedback');
    if(!box){box=document.createElement('div');box.id='v210InvoiceUploadFeedback';const actions=[...document.querySelectorAll('#invoiceAnalysisModule .actions')].find(a=>a.querySelector('[onclick="analyzeInvoiceProfit()"]'));if(actions&&actions.parentNode)actions.parentNode.insertBefore(box,actions);else page.appendChild(box);}return box;
  }
  function renderFeedback(){
    const pur=files('purchaseInvoiceFiles'),sal=files('salesInvoiceFiles'),exp=files('expenseReceiptFiles');const all=[...pur.map(f=>['Alış',f]),...sal.map(f=>['Satış',f]),...exp.map(f=>['Masraf',f])];const box=ensureFeedback();if(!box)return;
    if(!all.length){box.innerHTML='Henüz dosya seçilmedi.';return;}
    box.innerHTML='<strong>'+all.length+' dosya seçildi.</strong> Analiz için Faturaları Analiz Et butonuna bas.<div>'+all.slice(0,8).map(x=>'<span class="v210-file-pill">'+x[0]+': '+String(x[1].name||'dosya').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</span>').join('')+(all.length>8?'<span class="v210-file-pill">+'+(all.length-8)+' dosya</span>':'')+'</div>';
    const st=status();if(st)st.textContent=all.length+' dosya seçildi. Analiz Et butonuna basınca okunacak.';
  }
  function bindUploads(){['purchaseInvoiceFiles','salesInvoiceFiles','expenseReceiptFiles'].forEach(id=>{const el=byId(id);if(el&&!el.__v210UploadFeedback){el.__v210UploadFeedback=true;el.addEventListener('change',renderFeedback);}});renderFeedback();}
  const previousAnalyze=window.analyzeInvoiceProfit;
  if(typeof previousAnalyze==='function'&&!previousAnalyze.__v210UploadGuard){
    const wrapped=async function(){
      const st=status();const pur=files('purchaseInvoiceFiles'),sal=files('salesInvoiceFiles'),exp=files('expenseReceiptFiles');
      if(st)st.textContent='Analiz başlatıldı. Dosyalar okunuyor...';
      const started=Date.now();
      const timer=setTimeout(function(){const s=status();if(s&&/Analiz başlatıldı|Dosyalar okunuyor/i.test(s.textContent||''))s.textContent='Dosyalar okunuyor, büyük Excel dosyalarında bu işlem biraz sürebilir...';},1800);
      try{
        if(!pur.length&&!sal.length&&!exp.length){renderFeedback();}
        const r=await previousAnalyze.apply(this,arguments);
        clearTimeout(timer);
        const res=byId('invoiceAnalysisResults');
        if(st&&res&&getComputedStyle(res).display!=='none'&&!/eklendi|hata|Önce/i.test(st.textContent||''))st.textContent='Analiz tamamlandı. Sonuçlar aşağıda güncellendi.';
        setTimeout(function(){try{if(typeof window.v189InvoiceSetPage==='function')window.v189InvoiceSetPage('analysis');}catch(e){}},60);
        return r;
      }catch(e){
        clearTimeout(timer);console.error(e);if(st)st.textContent='Fatura analizi çalışmadı: '+(e&&e.message?e.message:e);throw e;
      }finally{setTimeout(bindUploads,250);}
    };
    wrapped.__v210UploadGuard=true;window.analyzeInvoiceProfit=wrapped;
  }
  document.addEventListener('click',function(e){const btn=e.target&&e.target.closest&&e.target.closest('[onclick="analyzeInvoiceProfit()"]');if(btn){const st=status();if(st)st.textContent='Analiz butonuna basıldı. Dosyalar kontrol ediliyor...';}},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(bindUploads,200);});setTimeout(bindUploads,800);setTimeout(bindUploads,2000);
})();
