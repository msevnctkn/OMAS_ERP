(function(){
  var ASSIGN='v233XmlCategoryAssignments', COMPANY='v244XmlCompanyAssignments', CATALOG='invoiceCategoryCatalogV2';
  var refreshTimer=null;
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function read(k,fb){try{var raw=localStorage.getItem(k);return raw==null?fb:(JSON.parse(raw)||fb);}catch(e){return fb;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
  function normCompany(v){v=String(v||'').trim().toUpperCase();return v==='O'||v==='K'?v:'';}
  function companyName(v){v=normCompany(v);return v==='O'?'Otomasyon':(v==='K'?'Konsept':'Firma seçilmedi');}
  function catalog(){var c=read(CATALOG,null);if(!c||typeof c!=='object')c={'Direkt Malzeme':['PLC','Sürücü','Kablo','Sensör','Pano Ekipmanı','Otomasyon Malzemesi'],'Sarf / Yardımcı Malzeme':['Bağlantı Elemanı','Klemens','Etiket','Diğer'],'Hizmet':['Nakliye','Montaj','Danışmanlık','Diğer'],'Genel Gider':['Kargo Nakliye','Ofis','Yazılım','Diğer'],'Kategorisiz':['-']};return c;}
  function scheduleLightRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(function(){
      try{if(window.v244InstallCompanySummary)window.v244InstallCompanySummary();}catch(e){}
      try{if(window.v258RenderCompanyCategoryAnalysis)window.v258RenderCompanyCategoryAnalysis();}catch(e){}
    },250);
  }
  function updateSubSelect(mainSel,id){
    var sub=q('[data-v233-sub="'+CSS.escape(id)+'"]');if(!sub)return;
    var subs=(catalog()[mainSel.value]||[]);
    sub.innerHTML=[''].concat(subs).map(function(v){return '<option value="'+esc(v)+'">'+(v?esc(v):'Alt kategori seç')+'</option>';}).join('');
    sub.value='';
  }
  function handleMain(sel){
    var id=sel.getAttribute('data-v233-main');if(!id)return;
    var data=read(ASSIGN,{});
    if(sel.value)data[id]={main:sel.value,sub:''};else delete data[id];
    write(ASSIGN,data);
    updateSubSelect(sel,id);
    scheduleLightRefresh();
  }
  function handleSub(sel){
    var id=sel.getAttribute('data-v233-sub');if(!id)return;
    var data=read(ASSIGN,{}),main=q('[data-v233-main="'+CSS.escape(id)+'"]');
    if(!data[id])data[id]={main:main?main.value:'',sub:''};
    data[id].sub=sel.value;
    if(!data[id].main&&!data[id].sub)delete data[id];
    write(ASSIGN,data);
    scheduleLightRefresh();
  }
  function handleCompany(inp){
    var id=inp.getAttribute('data-v233-company');if(!id)return;
    var data=read(COMPANY,{}),v=normCompany(inp.value);
    inp.value=v;
    if(v)data[id]=v;else delete data[id];
    write(COMPANY,data);
    var small=inp.parentNode&&inp.parentNode.querySelector('small');if(small)small.textContent=companyName(v);
    scheduleLightRefresh();
  }
  document.addEventListener('input',function(e){
    var t=e.target;if(t&&t.matches&&t.matches('[data-v233-company]')){t.value=normCompany(t.value);}
  },true);
  document.addEventListener('change',function(e){
    var t=e.target;if(!t||!t.matches)return;
    if(t.matches('[data-v233-main]')){e.preventDefault();e.stopImmediatePropagation();handleMain(t);return false;}
    if(t.matches('[data-v233-sub]')){e.preventDefault();e.stopImmediatePropagation();handleSub(t);return false;}
    if(t.matches('[data-v233-company]')){e.preventDefault();e.stopImmediatePropagation();handleCompany(t);return false;}
  },true);
})();
