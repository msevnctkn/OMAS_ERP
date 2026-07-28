(function(){
  var OFFICIAL_PROJECTS='v247ProjectManagementProjects', OFFICIAL_ROWS='v233XmlInvoiceLines', OFFICIAL_MAP='v248ProjectLineAssignments';
  var GRS_PROJECTS='v256GrsProjects', GRS_ROWS='v256GrsCostLines', GRS_MAP='v256GrsCostMap';
  var currentLineId='';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function read(k,fb){try{var v=JSON.parse(localStorage.getItem(k)||JSON.stringify(fb));return v==null?fb:v}catch(e){return fb}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function supplier(r){return r&&((r.supplier)||(r.firma)||(r.company))||'-'}
  function rowId(r){return (r&&r.id)||[r&&r.file,r&&r.invoiceNo,r&&r.date,supplier(r),r&&r.lineNo,r&&r.name,Number(r&&r.matrah||0).toFixed(2)].join('||')}
  function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function today(){return new Date().toISOString().slice(0,10)}
  function ensureSideToggle(){
    var side=q('#v189InvoiceSide');if(!side||q('#v289SideToggle',side))return;
    var b=document.createElement('button');b.type='button';b.id='v289SideToggle';b.className='v289-side-toggle';b.textContent='Menüyü Daralt';
    side.insertBefore(b,side.firstChild);
  }
  function decorateRows(){
    ensureSideToggle();
    var host=q('#v270CategorizeHost');if(!host)return;
    qa('[data-v270-row]',host).forEach(function(tr){
      if(q('[data-v289-send-project]',tr))return;
      var id=tr.getAttribute('data-v270-row'),actions=tr.lastElementChild&&q('.v270-tools',tr.lastElementChild);
      if(!actions)return;
      var b=document.createElement('button');b.type='button';b.className='v289-project-send';b.setAttribute('data-v289-send-project',id);b.textContent='Projeye Gönder';
      actions.insertBefore(b,actions.firstChild);
    });
  }
  function findLine(id){
    var rows=read(OFFICIAL_ROWS,[]),found=null,changed=false;
    rows.forEach(function(r){if(rowId(r)===id){if(!r.id){r.id=id;changed=true}found=r}});
    if(changed)write(OFFICIAL_ROWS,rows);
    return found;
  }
  function projectOptions(kind){
    var arr=read(kind==='grs'?GRS_PROJECTS:OFFICIAL_PROJECTS,[]);
    return arr.map(function(p){return '<option value="'+esc(p.id)+'">'+esc((p.name||p.code||p.id)+' '+(p.customer?'- '+p.customer:''))+'</option>'}).join('');
  }
  function firmOptions(){
    var names={};
    read(OFFICIAL_ROWS,[]).forEach(function(r){var n=supplier(r);if(n&&n!=='-')names[n]=1});
    read('v282ManualCariCards',[]).forEach(function(c){if(c&&c.name)names[c.name]=1});
    read('v254ProjectSalesLines',[]).forEach(function(r){var n=supplier(r);if(n&&n!=='-')names[n]=1});
    read('v256GrsSalesLines',[]).forEach(function(r){var n=supplier(r);if(n&&n!=='-')names[n]=1});
    return Object.keys(names).sort(function(a,b){return a.localeCompare(b,'tr')}).map(function(n){return '<option value="'+esc(n)+'"></option>'}).join('');
  }
  function cariKey(v){try{return String(v||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,' ').trim()}catch(e){return String(v||'').toUpperCase()}}
  function ensureCariCard(name,note){
    name=String(name||'').trim();if(!name||name==='-')return;
    var list=read('v282ManualCariCards',[]),kk=cariKey(name),old=list.filter(function(c){return cariKey(c&&c.name)===kk})[0];
    if(old){old.note=old.note||note||'';old.updatedAt=new Date().toISOString()}
    else list.push({id:'cari-'+Date.now()+'-'+Math.random().toString(16).slice(2),name:name,note:note||'Projeden otomatik oluşturuldu.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    write('v282ManualCariCards',list);
  }
  function openModal(id){
    currentLineId=id;var line=findLine(id),old=q('#v289ProjectModal');if(old)old.remove();
    var div=document.createElement('div');div.id='v289ProjectModal';div.className='v289-modal-backdrop';
    div.innerHTML='<div class="v289-modal"><h3>Fatura Kalemini Projeye Gönder</h3><small>'+esc(line?((line.invoiceNo||'')+' | '+supplier(line)+' | '+(line.name||'')):'Satır bulunamadı')+'</small><div class="v289-grid"><div class="v289-field"><label>Proje Türü</label><select id="v289ProjectKind"><option value="official">Resmi Proje</option><option value="grs">GRS Proje</option></select></div><div class="v289-field"><label>Mevcut Proje</label><select id="v289ProjectSelect"></select></div><div class="v289-field full"><label>Yeni Proje Adı</label><input id="v289NewProjectName" placeholder="Boş bırakılırsa mevcut projeye gönderir"></div><div class="v289-field"><label>Cari / Müşteri</label><input id="v289NewProjectCustomer" list="v289CariList" value="'+esc(line?supplier(line):'')+'" placeholder="Cari adı yaz / listeden seç"><datalist id="v289CariList">'+firmOptions()+'</datalist></div><div class="v289-field"><label>Proje Kodu</label><input id="v289NewProjectCode" placeholder="İsteğe bağlı"></div><div class="v289-field"><label>Başlangıç</label><input id="v289NewProjectStart" type="date" value="'+today()+'"></div><div class="v289-field"><label>Durum</label><select id="v289NewProjectStatus"><option value="active">Devam Ediyor</option><option value="planned">Planlandı</option><option value="waiting">Beklemede</option><option value="done">Tamamlandı</option></select></div></div><div class="v289-note">Yeni proje adı yazarsan önce proje oluşturulur, sonra bu kalem o projeye maliyet olarak gönderilir.</div><div class="v289-actions"><button type="button" data-v289-close>Vazgeç</button><button type="button" class="primary" data-v289-save>Projeye Gönder</button></div></div>';
    document.body.appendChild(div);refreshProjectSelect();
  }
  function refreshProjectSelect(){var kind=(q('#v289ProjectKind')||{}).value||'official',sel=q('#v289ProjectSelect');if(sel)sel.innerHTML=projectOptions(kind==='grs'?'grs':'official')||'<option value="">Proje yok - aşağıdan hızlı oluştur</option>'}
  function createProject(kind){
    var name=(q('#v289NewProjectName')||{}).value||'';name=name.trim();if(!name)return '';
    var customer=((q('#v289NewProjectCustomer')||{}).value||'').trim();ensureCariCard(customer,'Projeden otomatik oluşturuldu.');
    var key=kind==='grs'?GRS_PROJECTS:OFFICIAL_PROJECTS,arr=read(key,[]),p={id:uid(kind==='grs'?'grs':'prj'),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),name:name,customer:customer,code:((q('#v289NewProjectCode')||{}).value||'').trim(),start:(q('#v289NewProjectStart')||{}).value||today(),end:'',status:(q('#v289NewProjectStatus')||{}).value||'active',note:'Fatura kaleminden hızlı oluşturuldu.'};
    arr.push(p);write(key,arr);return p.id;
  }
  function sendLine(){
    var kind=(q('#v289ProjectKind')||{}).value==='grs'?'grs':'official',line=findLine(currentLineId);if(!line){alert('Fatura kalemi bulunamadı.');return}
    var pid=createProject(kind)||((q('#v289ProjectSelect')||{}).value||'');if(!pid){alert('Önce mevcut proje seç veya yeni proje adı yaz.');return}
    ensureCariCard(((q('#v289NewProjectCustomer')||{}).value||'').trim()||supplier(line),'Projeye gönderilen fatura kaleminden otomatik oluşturuldu.');
    if(kind==='official'){var map=read(OFFICIAL_MAP,{});map[line.id||currentLineId]=pid;write(OFFICIAL_MAP,map);try{if(window.v247RenderProjects)window.v247RenderProjects()}catch(e){}}
    else{var rows=read(GRS_ROWS,[]),exists={};rows.forEach(function(r){exists[r.id]=1});var copy=Object.assign({},line);copy.id=copy.id||currentLineId;if(!exists[copy.id])rows.push(copy);write(GRS_ROWS,rows);var gm=read(GRS_MAP,{});gm[copy.id]=pid;write(GRS_MAP,gm);try{if(window.v256RenderGrsProject)window.v256RenderGrsProject()}catch(e){}}
    var m=q('#v289ProjectModal');if(m)m.remove();try{if(window.v286OpenProjectModule)window.v286OpenProjectModule(kind==='grs'?'projectGrs':'project')}catch(e){}
  }
  document.addEventListener('click',function(e){
    var toggle=e.target&&e.target.closest&&e.target.closest('#v289SideToggle');if(toggle){var mod=q('#invoiceAnalysisModule');if(mod){var on=!mod.classList.contains('v289-side-collapsed');mod.classList.toggle('v289-side-collapsed',on);toggle.textContent=on?'Menüyü Aç':'Menüyü Daralt'}return}
    var send=e.target&&e.target.closest&&e.target.closest('[data-v289-send-project]');if(send){e.preventDefault();e.stopImmediatePropagation();openModal(send.getAttribute('data-v289-send-project'));return false}
    if(e.target&&e.target.closest&&e.target.closest('[data-v289-close]')){var m=q('#v289ProjectModal');if(m)m.remove();return}
    if(e.target&&e.target.closest&&e.target.closest('[data-v289-save]')){sendLine();return}
  },true);
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='v289ProjectKind')refreshProjectSelect()},true);
  document.addEventListener('DOMContentLoaded',function(){setTimeout(decorateRows,800);setTimeout(decorateRows,1800)});
  setInterval(function(){if(q('#v189PageCategorize.active')||q('#v270CategorizeHost'))decorateRows()},1000);
  window.v289DecorateCategorizeProjects=decorateRows;
})();
