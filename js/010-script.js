if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let bhdRawRows=[], bhdViews={}, currentView='Firma Özeti';
let personnelList=JSON.parse(localStorage.getItem('bhdPersonnelList')||'[]');
let manualCategories=JSON.parse(localStorage.getItem('bhdManualCategories')||'["Diğer","Ticari İşlem","Ticari Olmayan Transfer","Malzeme","Kargo","Reklam","Yakıt","Vergi","SGK / Personel","Maaş","Yemek","Market","Faiz / Banka Ücreti"]');
let manualCategoryMap=JSON.parse(localStorage.getItem('bhdManualCategoryMap')||'{}');
let manualSubcategories=JSON.parse(localStorage.getItem('bhdManualSubcategories')||'{}');
let manualSubcategoryMap=JSON.parse(localStorage.getItem('bhdManualSubcategoryMap')||'{}');
const MONTHS=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
function openModule(id){document.getElementById('home').style.display='none';document.querySelectorAll('.module').forEach(m=>{m.classList.remove('active');m.style.display='none';});var target=document.getElementById(id);target.classList.add('active');target.style.display='block';window.scrollTo(0,0)}
function goHome(){document.querySelectorAll('.module').forEach(m=>{m.classList.remove('active');m.style.display='none';});document.getElementById('home').style.display='flex';window.scrollTo(0,0)}

function normalizeMatch(v){return normalizeHeader(v).replace(/[İI]/g,'I').replace(/[Ğ]/g,'G').replace(/[Ü]/g,'U').replace(/[Ş]/g,'S').replace(/[Ö]/g,'O').replace(/[Ç]/g,'C').replace(/[^A-Z0-9]/g,'')}
function savePersonnel(){localStorage.setItem('bhdPersonnelList',JSON.stringify(personnelList));renderPersonnelList();if(bhdRawRows.length){bhdRawRows.forEach(r=>{let m=findPersonnel(r.aciklama);r.personel=m?m.name:'';if(r.personel && r.giden>0 && r.analizTuru==='Gerçek Gider') r.kategori='Personel Ödemesi';});buildViews();renderKpis();renderView(currentView)}}
function addPersonnel(){let name=document.getElementById('personnelName').value.trim();let aliases=document.getElementById('personnelAliases').value.split(',').map(x=>x.trim()).filter(Boolean);if(!name)return;personnelList.push({name,aliases});document.getElementById('personnelName').value='';document.getElementById('personnelAliases').value='';savePersonnel()}
function removePersonnel(i){personnelList.splice(i,1);savePersonnel()}
function renderPersonnelList(){let el=document.getElementById('personnelList');if(!el)return;el.innerHTML=personnelList.length?personnelList.map((p,i)=>`<span class="personnel-chip">${p.name}${p.aliases&&p.aliases.length?` <span class="small">(${p.aliases.join(', ')})</span>`:''}<button type="button" onclick="removePersonnel(${i})">×</button></span>`).join(''):'<span class="small">Henüz personel eklenmedi.</span>'}
function findPersonnel(desc){let d=normalizeMatch(desc);if(!d)return null;for(const p of personnelList){let keys=[p.name,...(p.aliases||[])].map(normalizeMatch).filter(x=>x.length>=3);if(keys.some(k=>d.includes(k)))return p}return null}

function saveManualCategories(){
  localStorage.setItem('bhdManualCategories',JSON.stringify(manualCategories));
  localStorage.setItem('bhdManualCategoryMap',JSON.stringify(manualCategoryMap));
  localStorage.setItem('bhdManualSubcategories',JSON.stringify(manualSubcategories));
  localStorage.setItem('bhdManualSubcategoryMap',JSON.stringify(manualSubcategoryMap));
  renderManualCategoryList();
  renderSubcategoryParentOptions();
  if(bhdRawRows.length){
    applyManualCategoriesToRows();
    buildViews();
    renderKpis();
    renderView(currentView);
  }
}
function addManualCategory(){
  let name=document.getElementById('categoryName').value.trim();
  if(!name)return;
  if(!manualCategories.some(c=>normalizeHeader(c)===normalizeHeader(name)))manualCategories.push(name);
  if(!manualSubcategories[name])manualSubcategories[name]=[];
  document.getElementById('categoryName').value='';
  saveManualCategories();
}
function removeManualCategory(i){
  let cat=manualCategories[i];
  manualCategories.splice(i,1);
  delete manualSubcategories[cat];
  Object.keys(manualCategoryMap).forEach(k=>{if(manualCategoryMap[k]===cat){delete manualCategoryMap[k];delete manualSubcategoryMap[k];}});
  saveManualCategories();
}
function addManualSubcategory(){
  let parent=document.getElementById('subcategoryParent').value;
  let name=document.getElementById('subcategoryName').value.trim();
  if(!parent||!name)return;
  if(!manualSubcategories[parent])manualSubcategories[parent]=[];
  if(!manualSubcategories[parent].some(x=>normalizeHeader(x)===normalizeHeader(name)))manualSubcategories[parent].push(name);
  document.getElementById('subcategoryName').value='';
  saveManualCategories();
}
function removeManualSubcategory(parent,index){
  if(!manualSubcategories[parent])return;
  let sub=manualSubcategories[parent][index];
  manualSubcategories[parent].splice(index,1);
  Object.keys(manualSubcategoryMap).forEach(k=>{if(manualCategoryMap[k]===parent && manualSubcategoryMap[k]===sub)delete manualSubcategoryMap[k];});
  saveManualCategories();
}
function renderSubcategoryParentOptions(){
  let el=document.getElementById('subcategoryParent');
  if(!el)return;
  el.innerHTML=manualCategories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}
function renderManualCategoryList(){
  let el=document.getElementById('manualCategoryList');
  if(!el)return;
  if(!manualCategories.length){el.innerHTML='<span class="small">Henüz kategori eklenmedi.</span>';return;}
  el.innerHTML=manualCategories.map((c,i)=>{
    let safeC=String(c).replace(/'/g,"\\'");
    let subs=(manualSubcategories[c]||[]).map((s,j)=>`<span class="personnel-chip">${escapeHtml(c)} / ${escapeHtml(s)}<button type="button" onclick="removeManualSubcategory('${safeC}',${j})">×</button></span>`).join('');
    return `<span class="personnel-chip">${escapeHtml(c)}<button type="button" onclick="removeManualCategory(${i})">×</button></span>${subs}`;
  }).join('');
}
function getFirmaKey(name){return normalizeMatch(name)}
function getSummaryKey(name){
  return String(name||'').toLocaleUpperCase('tr-TR').replace(/\s+/g,' ').trim();
}
function applyManualCategoriesToRows(){bhdRawRows.forEach(r=>{
  if(!r.orijinalKategori) r.orijinalKategori=r.kategori;
  let key=getFirmaKey(r.kisiFirma);
  if(manualCategoryMap[key]){
    r.manuelKategori=manualCategoryMap[key];
    r.manuelAltKategori=manualSubcategoryMap[key]||'';
    r.kategori=manualCategoryMap[key];
    r.altKategori=manualSubcategoryMap[key]||'';
    r.kategoriKaynak='Manuel';
  }else{
    r.manuelKategori='';
    r.manuelAltKategori='';
    r.altKategori='';
    r.kategori=r.orijinalKategori||r.kategori;
    r.kategoriKaynak='Otomatik';
  }
})}
function setFirmaCategory(firma){
  let key=getFirmaKey(firma);
  let sel=document.getElementById('cat_'+key);
  let sub=document.getElementById('subcat_'+key);
  if(!sel)return;
  manualCategoryMap[key]=sel.value;
  manualSubcategoryMap[key]=sub?sub.value:'';

  // Seçim yapıldığı anda ilgili satırları güncelle
  bhdRawRows.forEach(r=>{
    if(getFirmaKey(r.kisiFirma)===key){
      if(!r.orijinalKategori) r.orijinalKategori=r.kategori;
      r.manuelKategori=sel.value;
      r.manuelAltKategori=sub?sub.value:'';
      r.kategori=sel.value;
      r.altKategori=sub?sub.value:'';
      r.kategoriKaynak='Manuel';
    }
  });

  saveManualCategories();
  applyManualCategoriesToRows();
  buildViews();
  renderKpis();
  renderView(currentView);
}
function categoryOptions(selected){return manualCategories.map(c=>`<option value="${escapeHtml(c)}"${c===selected?' selected':''}>${escapeHtml(c)}</option>`).join('')}
function subcategoryOptions(category,selected){
  let subs=manualSubcategories[category]||[];
  return `<option value="">Alt kategori yok</option>`+subs.map(s=>`<option value="${escapeHtml(s)}"${s===selected?' selected':''}>${escapeHtml(s)}</option>`).join('');
}
function updateSubcategorySelect(key){
  let cat=document.getElementById('cat_'+key);
  let sub=document.getElementById('subcat_'+key);
  if(!cat||!sub)return;
  sub.innerHTML=subcategoryOptions(cat.value,manualSubcategoryMap[key]||'');
}
function rowsForManualCategory(cat){return bhdRawRows.filter(r=>(r.kategoriKaynak==='Manuel' && r.kategori===cat))}
function renderManualCategoryBlocks(showAll=false){
  let section=document.getElementById('manualCategorySection');
  let el=document.getElementById('manualCategoryBlocks');
  if(!el||!section)return;
  if(!showAll){section.style.display='none';el.innerHTML='';return;}
  section.style.display='block';
  if(!manualCategories.length){el.innerHTML='<div class="manual-category-empty">Henüz manuel kategori oluşturulmadı.</div>';return;}
  el.innerHTML=manualCategories.map(cat=>{
    let rows=rowsForManualCategory(cat);
    let gelen=rows.reduce((s,r)=>s+r.gelen,0);
    let giden=rows.reduce((s,r)=>s+r.giden,0);
    let net=gelen-giden;
    let dates=[...new Set(rows.map(r=>r.tarih).filter(Boolean))].join(', ');
    let subHtml=(manualSubcategories[cat]||[]).map(sub=>{
      let sr=rows.filter(r=>r.altKategori===sub);
      let sg=sr.reduce((s,r)=>s+r.gelen,0);
      let sc=sr.reduce((s,r)=>s+r.giden,0);
      return `<div class="meta">↳ ${escapeHtml(sub)}: ${sr.length} hareket / Giden ${formatTL(sc)} / Gelen ${formatTL(sg)}</div>`;
    }).join('');
    return `<div class="manual-category-card">
      <h4>${escapeHtml(cat)}</h4>
      <div class="meta">${rows.length?escapeHtml(dates):'Bu kategoriye henüz hareket atanmadı.'}</div>
      ${subHtml}
      <div class="totals">
        <div>Gelen<strong class="positive">${formatTL(gelen)}</strong></div>
        <div>Giden<strong class="negative">${formatTL(giden)}</strong></div>
        <div>Net<strong class="${net>=0?'positive':'negative'}">${formatTL(net)}</strong></div>
      </div>
    </div>`
  }).join('');
}
function escapeHtml(str){return String(str??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function escapeForNote(str){return String(str??'').replace(/\s+/g,' ').trim()}
function normalizeHeader(v){return String(v||'').toLocaleUpperCase('tr-TR').replace(/\s+/g,' ').trim()}
function parseMoney(v, opts={}){
  if(v===null||v===undefined||v==='') return 0;
  const isZiraat = !!opts.ziraat;

  // Ziraat hesap hareketlerinde nokta her zaman binlik ayırıcı kabul edilir.
  // Örnek: 1.000.000 = 1000000 TL, 100.000 = 100000 TL, 8.686,98 = 8686.98 TL.
  // Bu yüzden Ziraat modunda nokta asla kuruş/ondalık ayıracı sayılmaz.
  if(typeof v==='number'){
    // Excel numeric hücreleri zaten gerçek değer olarak gelir.
    // Örnek Ziraat:
    // -100000   => 100.000 TL
    // -85005.81 => 85.005,81 TL
    // -11600.56 => 11.600,56 TL
    // Bu yüzden numeric hücreye /100 veya binlik düzeltmesi uygulanmaz.
    return Number(v) || 0;
  }

  let raw=String(v).trim();
  let neg=raw.includes('-')||/\bBORÇ\b|\bBORC\b/i.test(raw);
  let t=raw.replace(/TL|TRY|₺|USD/gi,'').replace(/\+/g,'').replace(/-/g,'').trim();
  t=t.replace(/\s/g,'');
  if(!t) return 0;

  const hasComma=t.includes(',');
  const hasDot=t.includes('.');

  if(isZiraat){
    // Ziraat özel kuralı: nokta binlik, virgül kuruş ayracıdır.
    // 1.000.000 -> 1000000
    // 100.000,00 -> 100000.00
    // 12.288,93 -> 12288.93
    if(hasComma) t=t.replace(/\./g,'').replace(',', '.');
    else if(hasDot) t=t.replace(/\./g,'');
  }else if(hasComma && hasDot){
    // 570.714,79 -> 570714.79 / 570,714.79 -> 570714.79
    if(t.lastIndexOf(',')>t.lastIndexOf('.')) t=t.replace(/\./g,'').replace(',', '.');
    else t=t.replace(/,/g,'');
  }else if(hasComma){
    const parts=t.split(',');
    if(parts.length>2){
      const dec=parts.pop();
      t=parts.join('')+'.'+dec;
    }else{
      t=t.replace(',', '.');
    }
  }else if(hasDot){
    const parts=t.split('.');
    const last=parts[parts.length-1];
    if(parts.length>2){
      // 1.234.567 veya 1.234.567.89 gibi karışık durumlar
      if(last.length===2) t=parts.slice(0,-1).join('')+'.'+last;
      else t=parts.join('');
    }else{
      // 570.714 = binlik, 570714.79 = ondalık
      if(last.length===3) t=parts.join('');
    }
  }else{
    // Ayraç yoksa normal sayı kabul edilir.
    // Sadece bazı banka dışa aktarımlarında dev ve ayraçsız kuruşlu ham sayı gelirse /100 uygula.
    // Örn: 57071479 tek başına geldiyse 570.714,79 olabilir; ama 100000 veya 85005 gibi değerler ASLA bozulmaz.
    if(!isZiraat && /^\d{9,}$/.test(t)) t=String(Number(t)/100);
  }

  let n=parseFloat(t);
  if(isNaN(n)) return 0;
  return neg?-Math.abs(n):Math.abs(n);
}

function isZiraatStatement(file, aoa, headers){
  const fileName=normalizeHeader(file && file.name ? file.name : '');
  const headText=(aoa||[]).slice(0,45).map(r=>(r||[]).join(' ')).join(' ');
  const headerText=(headers||[]).join(' ');
  const all=normalizeHeader(fileName+' '+headText+' '+headerText);
  // Ziraat hesap ekstresi dosyalarında genelde Şube/Hesap/IBAN alanları, BİM REF, B/A, VALOR, MENÜ kolonları olur.
  if(/ZİRAAT|ZIRAAT|HESAPEKSTRE/.test(all)) return true;
  if(/ŞUBE KODU|SUBE KODU|ŞUBE AD|SUBE AD/.test(all) && /HESAP NO|IBAN/.test(all)) return true;
  if(/BİM REF|BIM REF/.test(all) && /B\/A/.test(all) && /VALOR|VALÖR|MENÜ|MENU/.test(all)) return true;
  return false;
}

function extractDeclaredAmountFromDescription(desc){
  // Ziraat gibi banka hareketlerinde açıklama içinde gerçek tutar yazabiliyor.
  // Örnek: "bedeli:100.000,00TL" veya "12288,93TRY faiz geri ödemesi".
  // IBAN / hesap no / işlem no gibi uzun numaraları değil, sadece para formatlarını yakalıyoruz.
  const raw=String(desc||'');
  if(!raw) return 0;
  const candidates=[];
  const patterns=[
    /(?:BEDELİ|BEDELI|TUTAR[İI]?|MIKTAR|MİKTAR)\s*[:=]?\s*((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*(?:TL|TRY|₺)?/gi,
    /((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*(?:TL|TRY|₺)/gi
  ];
  for(const re of patterns){
    let m;
    while((m=re.exec(raw))!==null){
      const val=parseMoney(m[1]);
      if(val>0) candidates.push(val);
    }
  }
  if(!candidates.length) return 0;
  return Math.max(...candidates);
}
function reconcileAmountWithDescription(desc,incoming,outgoing){
  // ÖNEMLİ:
  // Açıklama içindeki rakamlar her zaman işlem tutarı değildir.
  // Örnek: "ÜCRET H2512737635974 45000,00 TRY ÜZ." satırında 45.000 TL matrahtır,
  // gerçek giden tutar ise tutar kolonundaki 12,80 TL'dir.
  // Bu yüzden artık açıklamadan tutar okuyup kolon tutarını EZMİYORUZ.
  return {incoming,outgoing};
}

function parseDate(v){if(!v)return null;if(v instanceof Date&&!isNaN(v))return v;if(typeof v==='number'){let p=XLSX.SSF.parse_date_code(v);if(p)return new Date(p.y,p.m-1,p.d)}let t=String(v).trim();let m=t.match(/(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/);if(m){let y=+m[3];if(y<100)y+=2000;let d=new Date(y,+m[2]-1,+m[1]);return isNaN(d)?null:d}let d=new Date(t);return isNaN(d)?null:d}
function monthKey(d){return d?MONTHS[d.getMonth()]+' '+d.getFullYear():'TARİHSİZ'}
function formatTL(v){return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v||0)+' TL'}
function displayName(txt){return String(txt||'').replace(/\s+/g,' ').trim()||'AÇIKLAMA YOK'}
function shouldIgnoreTransactionText(txt){
  const u=normalizeHeader(txt);
  const compact=u.replace(/\s+/g,' ');
  const ignore=[
    'NAKİT AVANS LİMİTİ',
    'NAKIT AVANS LIMITI',
    'KULLANILABİLİR NAKİT AVANS LİMİTİ',
    'KULLANILABILIR NAKIT AVANS LIMITI',
    'ASGARİ ÖDEME TUTARI TL',
    'ASGARI ODEME TUTARI TL',
    'DÖNEM BORCU USD',
    'DONEM BORCU USD',
    'HESAP ÖZETİNİZ İLE İLGİLİ AÇIKLAMALAR',
    'HESAP OZETINIZ ILE ILGILI ACIKLAMALAR',
    'ISBANK.COM.TR',
    'MAXIMUM.COM.TR',
    'BASIM TARİHİ',
    'BASIM TARIHI',
    'BA S IM TA RI H I',
    'B A S I M T A R I H I',
    'BELGE NUMARASI',
    'SAYFA ',
    'İŞLEM TARİHİ REFERANS AÇIKLAMA TUTAR',
    'ISLEM TARIHI REFERANS ACIKLAMA TUTAR',
    'BİR ÖNCEKİ HESAP ÖZETİ BAKİYENİZ',
    'BIR ONCEKI HESAP OZETI BAKIYENIZ',
    'ÖNCEKİ AYDAN DEVİR',
    'ONCEKI AYDAN DEVIR',
    'SON ÖDEME TARİHİ',
    'SON ODEME TARIHI',
    'BİR SONRAKİ HESAP KESİM TARİHİ',
    'BIR SONRAKI HESAP KESIM TARIHI',
    'BİR SONRAKİ SON ÖDEME TARİHİ',
    'BIR SONRAKI SON ODEME TARIHI',
    'TOPLAM MAXIPUAN',
    'TOPLAM BANKKART LIRA',
    'BUGÜNE KADAR KAZANILAN BANKKART LİRA',
    'BUGUNE KADAR KAZANILAN BANKKART LIRA',
    'KART LİMİTİ',
    'KART LIMITI',
    'KULLANILABİLİR KART LİMİTİ',
    'KULLANILABILIR KART LIMITI',
    'MÜŞTERİ NUMARASI',
    'MUSTERI NUMARASI',
    'HESAP KESİM TARİHİ',
    'HESAP KESIM TARIHI',
    'DÖNEM BORCU TL',
    'DONEM BORCU TL',
    'HESAP ÖZETİ BORCU',
    'HESAP OZETI BORCU',
    'ÖDENMESİ GEREKEN ASGARİ TUTAR',
    'ODENMESI GEREKEN ASGARI TUTAR',
    'ERTELENEBİLİR HESAP ÖZETİ BORCU',
    'ERTELENEBILIR HESAP OZETI BORCU'
  ];
  return ignore.some(x=>compact.includes(x));
}

function cleanName(txt){return displayName(txt).toLocaleUpperCase('tr-TR')}
function categoryFor(desc){let u=normalizeHeader(desc);let cat='Diğer', kind='Gerçek Gider', commercial=true;
  function set(c,k='Gerçek Gider',com=true){cat=c;kind=k;commercial=com}
  if(/FAIZ|FAİZ|FZ:|ÜCRET|UCRET|KESİNTİ|KESINTI|TAHSİLAT ÜCRETİ|TAHSILATI UCRETI|KOMİSYON|KOMISYON/.test(u)) set('Faiz / Banka Ücreti','Faiz',true);
  else if(/HESAPTAN AKTARIM|HESAPTAN ÖDEME|HESAPTAN ODEME|KREDİ KARTI ÖDEME|KREDI KARTI ODEME|ÖDEME-TEŞEKKÜR|ODEME-TESEKKUR|ŞUBE-HESAPTAN ÖDEME|SUBE-HESAPTAN ODEME|VIRMAN|VİRMAN|KENDİ HESAP|KENDI HESAP|KART ÖDEMESİ|KART ODEMESI/.test(u)) set('Diğer','Transfer',false);
  else if(/FACEBK|FB\.ME\/ADS|META|FACEBOOK/.test(u)) set('Reklam');
  else if(/GOOGLE|ADS/.test(u)) set('Reklam');
  else if(/OKSİJEN PETROL|OKSIJEN PETROL|PETROL|DAYIOĞLU PET|DAYIOGLU PET|AKARYAKIT/.test(u)) set('Yakıt');
  else if(/SGK|SOSYAL GUVENLIK|SOSYAL GÜVENLİK/.test(u)) set('SGK / Personel');
  else if(/GIB|GİB|VERGİ|VERGI|SULTANBEYLİ|SULTANBEYLI/.test(u)) set('Vergi');
  else if(/KARGO|YURTİÇİ|YURTICI|ARAS|PTT/.test(u)) set('Kargo');
  else if(/HEPSIPAY|HEPSİPAY|HEPSIBURADA|HEPSİBURADA|D-MARKET/.test(u)) set('E-Ticaret');
  else if(/BIM|BİM|A101|MARKET/.test(u)) set('Market');
  else if(/BIZIM HESAP|BİZİM HESAP|YAZILIM|SOFTWARE/.test(u)) set('Yazılım');
  else if(/IKAS|İKAS|PAYTR|SİPAY|SIPAY/.test(u)) set('Aracı Ödeme / POS');
  else if(/LEVHA|METAL|REKLAM URUN|REKLAM ÜRÜN|KIMYA|KİMYA|AMBALAJ|YAPI|NALBUR|CIVATA|CİVATA|MOBILYA|MOBİLYA|ORMAN|MARTAŞ|OTOMOTİV|ROBOCOMBO|DIRENC|DİRENÇ|RHINO|PIL|PİL/.test(u)) set('Tedarikçi / Malzeme');
  return {category:cat, kind, commercial};}
function extractParty(desc, ba, amount){
  // ÖNEMLİ: Açıklama/firma adını değiştirmiyoruz. PAYTR/SİPAY/İKAS gibi aracı isimleri tek başlıkta birleştirilmiyor.
  // Böylece PAYTR/RHINO, PAYTR/DİRENÇ, SİPAY/ikas.com gibi hareketler ayrı ayrı görünür.
  return displayName(desc);
}
function findColumn(headers,cands){let n=headers.map(normalizeHeader);for(let c of cands){let t=normalizeHeader(c);let i=n.findIndex(h=>h===t||h.includes(t));if(i>=0)return headers[i]}return null}
async function analyzeBHD(){let input=document.getElementById('bhdFile'), files=[...input.files], status=document.getElementById('bhdStatus'), btn=document.getElementById('downloadReportBtn');bhdRawRows=[];btn.disabled=true;document.getElementById('bhdResults').style.display='none';if(!files.length){status.textContent='Önce dosya yükle.';return}document.getElementById('fileList').innerHTML=files.map(f=>`<span class="file-chip">${f.name}</span>`).join('');status.textContent='Dosyalar okunuyor...';for(const file of files){try{let ext=file.name.split('.').pop().toLowerCase();if(ext==='pdf')await parsePdfFile(file);else await parseSheetFile(file)}catch(e){console.error(e);status.innerHTML += `<br>${file.name} okunurken hata: ${e.message}`}}if(!bhdRawRows.length){status.textContent='Okunabilir hareket bulunamadı. PDF tarama görüntü ise metin çıkarılamayabilir.';return}buildViews();renderKpis();if(typeof renderBhdCompanyPanel==='function') renderBhdCompanyPanel('GENEL');renderView('Firma Özeti');if(typeof renderBhdCompanyPanel==='function') renderBhdCompanyPanel(window.bhdSelectedCompany||'GENEL');btn.disabled=false;status.innerHTML=`<strong>${bhdRawRows.length}</strong> hareket okundu. Analiz hazır. Rapor Ver ile Excel indirebilirsin.`; if(typeof renderAllCalendars==='function') renderAllCalendars();}
async function parseSheetFile(file){
  let buf=await file.arrayBuffer();
  let wb=XLSX.read(buf,{type:'array',cellDates:true,raw:true});
  let parsedCount=0;
  for(const sname of wb.SheetNames){
    const sheet=wb.Sheets[sname];
    const aoa=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
    if(!aoa.length) continue;

    let headerRowIndex=-1;
    for(let i=0;i<Math.min(40,aoa.length);i++){
      const row=aoa[i].map(normalizeHeader);
      const hasDesc=row.some(h=>/AÇIKLAMA|ACIKLAMA|DETAY|İŞLEM AÇIKLAMASI|ISLEM ACIKLAMASI|TRANSACTION|DESCRIPTION/.test(h));
      const hasAmount=row.some(h=>/TUTAR|MİKTAR|MIKTAR|BORÇ|BORC|ALACAK|GİDEN|GIDEN|GELEN|BAKIYE/.test(h));
      const hasDate=row.some(h=>/TARİH|TARIH|VAL[ÖO]R|DATE/.test(h));
      if(hasDesc && (hasAmount||hasDate)){headerRowIndex=i;break;}
    }

    // Bazı banka CSV/XLS dosyalarında başlık yoksa yine satırları okumayı dene.
    let headers=[];
    let dataRows=[];
    if(headerRowIndex>=0){
      headers=aoa[headerRowIndex].map((h,i)=>displayName(h)||('KOLON_'+i));
      dataRows=aoa.slice(headerRowIndex+1);
    }else{
      // Fallback: ilk satırı başlık kabul et, ama hata mesajında bunu belirt.
      headers=aoa[0].map((h,i)=>displayName(h)||('KOLON_'+i));
      dataRows=aoa.slice(1);
    }

    const ziraatMode=isZiraatStatement(file, aoa, headers);
    const moneyOpts={ziraat:ziraatMode};

    const dateCol=findColumn(headers,['İŞLEM TARİHİ','ISLEM TARIHI','TARİH','TARIH','VALOR','VALÖR','DATE']);
    const descCol=findColumn(headers,['AÇIKLAMA','ACIKLAMA','İŞLEM AÇIKLAMASI','ISLEM ACIKLAMASI','DETAY','DESCRIPTION','AÇIKLAMA 1','ACIKLAMA 1']);
    const baCol=findColumn(headers,['B/A','BA','BORÇ ALACAK','BORC ALACAK','İŞLEM YÖNÜ','ISLEM YONU']);
    let inCol=findColumn(headers,['ALACAK','GELEN','GİRİŞ','GIRIS','CREDIT']);
    let outCol=findColumn(headers,['BORÇ','BORC','GİDEN','GIDEN','ÇIKIŞ','CIKIS','DEBIT']);
    let amountCol=findColumn(headers,['İŞLEM TUTARI','ISLEM TUTARI','HAREKET TUTARI','TL TUTAR','TUTAR','MİKTAR','MIKTAR','AMOUNT']);

    // Eğer amountCol yanlışlıkla bakiye ise kullanma.
    if(amountCol && /BAKİYE|BAKIYE/i.test(amountCol)) amountCol=null;
    if(!descCol || (!amountCol && !inCol && !outCol)) continue;

    const idxOf=(col)=>headers.indexOf(col);
    const dateIdx=idxOf(dateCol), descIdx=idxOf(descCol), baIdx=idxOf(baCol), amountIdx=idxOf(amountCol), inIdx=idxOf(inCol), outIdx=idxOf(outCol);

    dataRows.forEach((arr,idx)=>{
      const desc=displayName(arr[descIdx]);
      if(!desc || desc==='AÇIKLAMA YOK') return;
      const date=parseDate(dateIdx>=0?arr[dateIdx]:'');
      let incoming=0,outgoing=0;
      if(inIdx>=0 || outIdx>=0){
        incoming=inIdx>=0?Math.abs(parseMoney(arr[inIdx], moneyOpts)):0;
        outgoing=outIdx>=0?Math.abs(parseMoney(arr[outIdx], moneyOpts)):0;
      }else{
        const rawVal=arr[amountIdx];
        const ba=baIdx>=0?normalizeHeader(arr[baIdx]).charAt(0):'';
        const rawText=String(rawVal||'');
        const parsed=parseMoney(rawVal, moneyOpts);
        if(ba==='A' || /ALACAK|GELEN|\+$/.test(normalizeHeader(rawText))) incoming=Math.abs(parsed);
        else if(ba==='B' || /BORÇ|BORC|GİDEN|GIDEN|-/.test(normalizeHeader(rawText))) outgoing=Math.abs(parsed);
        else incoming=Math.abs(parsed);
      }
      let fixed=reconcileAmountWithDescription(desc,incoming,outgoing);
      incoming=fixed.incoming; outgoing=fixed.outgoing;
      if(!incoming && !outgoing) return;
      pushRow({source:file.name,type:ziraatMode?'Ziraat Banka Hareketi':'Banka Hareketi',date,desc,incoming,outgoing,ref:sname+'-'+(idx+1)});
      parsedCount++;
    });
  }
  if(parsedCount===0) throw new Error('Excel/CSV içinde uygun kolon bulunamadı. Tarih + Açıklama + Tutar/Borç/Alacak kolonlarını göremedim.');
}
async function parsePdfFile(file){let buf=await file.arrayBuffer();let pdf=await pdfjsLib.getDocument({data:buf}).promise;let text='';for(let p=1;p<=pdf.numPages;p++){let page=await pdf.getPage(p);let content=await page.getTextContent();text+=content.items.map(i=>i.str).join(' ')+'\n'}parseCreditCardText(text,file.name)}
function parseCreditCardText(text, source){let lines=text.split(/\n/).map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);let re=/(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})\s+(.+?)\s+((?:\d{1,3}\.)*\d{1,3},\d{2})\+?(?:\s|$)/g;let all=text.replace(/\n/g,' ');let m;while((m=re.exec(all))!==null){if(shouldIgnoreTransactionText(m[0])) continue;let date=parseDate(m[1]);let desc=m[2].replace(/^\d{6,}\s+/,'').trim();if(shouldIgnoreTransactionText(desc)) continue;let amount=parseMoney(m[3]);let cat=categoryFor(desc);let u0=normalizeHeader(m[0]);let isPayment=/\+$/.test(m[0].trim()) || /HESAPTAN ÖDEME|HESAPTAN ODEME|ŞUBE-HESAPTAN ÖDEME|SUBE-HESAPTAN ODEME|TEŞEKKÜR EDERİZ|TESEKKUR EDERIZ|KART ÖDEMESİ|KART ODEMESI/.test(u0);let isForcedExpense=/KURUM ODEME|KURUM ÖDEME|SOSYAL GUVENLIK|SOSYAL GÜVENLİK|SGK/.test(u0);if(isForcedExpense) isPayment=false;let incoming=isPayment?amount:0;let outgoing=isPayment?0:amount;pushRow({source,type:'Kredi Kartı PDF',date,desc,incoming,outgoing,ref:'PDF'})}
}
function pushRow(o){let meta=categoryFor(o.desc);let ba=o.incoming>0?'A':'B';let party=extractParty(o.desc,ba,o.incoming-o.outgoing);let person=findPersonnel(o.desc);let category=person&&o.outgoing>0&&meta.kind==='Gerçek Gider'?'Personel Ödemesi':meta.category;bhdRawRows.push({sira:bhdRawRows.length+1,kaynak:o.source,dosyaTipi:o.type,tarih:o.date?o.date.toLocaleDateString('tr-TR'):'',ay:monthKey(o.date),kisiFirma:party,personel:person?person.name:'',kategori:category,islemTuru:o.incoming>0?'Gelen':'Giden',analizTuru:meta.kind,ticariMi:meta.commercial?'Ticari':'Ticari Değil',gelen:o.incoming||0,giden:o.outgoing||0,net:(o.incoming||0)-(o.outgoing||0),aciklama:o.desc,referans:o.ref||''})}
function sumBy(key,filter=()=>true){
  let b={};
  bhdRawRows.filter(filter).forEach(r=>{
    let rawKey=r[key]||'BOŞ';
    let groupKey=(key==='kisiFirma')?getSummaryKey(rawKey):rawKey;
    if(!b[groupKey])b[groupKey]={ad:rawKey,gelen:0,giden:0,net:0,islemSayisi:0,tarihler:new Set(),kategori:r.kategori||''};
    b[groupKey].gelen+=r.gelen;
    b[groupKey].giden+=r.giden;
    b[groupKey].net+=r.net;
    b[groupKey].islemSayisi++;
    if(r.tarih)b[groupKey].tarihler.add(r.tarih);
    if(!b[groupKey].kategori&&r.kategori)b[groupKey].kategori=r.kategori;
  });
  return Object.values(b).map(x=>({...x,tarihler:[...x.tarihler].join(', ')})).sort((a,b)=>Math.abs(b.giden||b.net)-Math.abs(a.giden||a.net))
}
function buildViews(){
  applyManualCategoriesToRows();
  bhdViews={
    'Firma Özeti':sumBy('kisiFirma'),
    'Kategori Özeti':sumBy('kategori'),
    'Alt Kategori Özeti':sumBy('altKategori',r=>!!r.altKategori),
    'Aylık Özet':sumBy('ay'),
    'Gerçek Giderler':sumBy('kisiFirma',r=>r.giden>0&&r.analizTuru==='Gerçek Gider'),
    'Personel Ödemeleri':sumBy('personel',r=>!!r.personel),
    'Personel Hareketleri':bhdRawRows.filter(r=>!!r.personel),
    'Manuel Kategori Detayı':bhdRawRows.filter(r=>r.kategoriKaynak==='Manuel')
  };
  manualCategories.forEach(cat=>{
    bhdViews['Kategori: '+cat]=rowsForManualCategory(cat);
  });
  bhdViews['Ticari Olmayan Transfer Gelen']=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.gelen>0);
  bhdViews['Ticari Olmayan Transfer Giden']=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.giden>0);
  bhdViews['Transfer / Virman']=bhdRawRows.filter(r=>r.analizTuru==='Transfer');
  bhdViews['Faizler']=bhdRawRows.filter(r=>r.analizTuru==='Faiz');
  bhdViews['Ham Hareketler']=bhdRawRows;
}

function sameCategory(a,b){
  function normCat(x){
    return String(x||'')
      .toLocaleUpperCase('tr-TR')
      .replace(/İ/g,'I')
      .replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S')
      .replace(/Ö/g,'O').replace(/Ç/g,'C')
      .replace(/\s+/g,' ')
      .trim();
  }
  return normCat(a)===normCat(b);
}

function renderKpis(){
  applyManualCategoriesToRows();

  let totalIn=bhdRawRows.reduce((s,r)=>s+r.gelen,0);
  let totalOut=bhdRawRows.reduce((s,r)=>s+r.giden,0);

  // Ticari Olmayan Transfer artık ikiye ayrılır:
  // Gelen = bu kategoriye atanmış gelen hareketler
  // Giden = bu kategoriye atanmış giden hareketler
  let transIn=bhdRawRows
    .filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer'))
    .reduce((s,r)=>s+r.gelen,0);

  let transOut=bhdRawRows
    .filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer'))
    .reduce((s,r)=>s+r.giden,0);

  let faiz=bhdRawRows
    .filter(r=>r.kategori==='Faiz / Banka Ücreti' || r.analizTuru==='Faiz')
    .reduce((s,r)=>s+r.giden,0);

  let reklam=bhdRawRows
    .filter(r=>r.kategori==='Reklam')
    .reduce((s,r)=>s+r.giden,0);

  let yakit=bhdRawRows
    .filter(r=>r.kategori==='Yakıt')
    .reduce((s,r)=>s+r.giden,0);

  // Gerçek Ticari Gider:
  // Manuel olarak "Ticari İşlem" kategorisine atanmış
  // tüm giden hareketlerin toplamı.
  let real=bhdRawRows
    .filter(r=>r.giden>0)
    .filter(r=>sameCategory(r.kategori,'Ticari İşlem'))
    .reduce((s,r)=>s+r.giden,0);

  document.getElementById('totalIn').textContent=formatTL(totalIn);
  document.getElementById('totalOut').textContent=formatTL(totalOut);
  document.getElementById('realExpense').textContent=formatTL(real);
  document.getElementById('transferInTotal').textContent=formatTL(transIn);
  document.getElementById('transferOutTotal').textContent=formatTL(transOut);
  document.getElementById('interestTotal').textContent=formatTL(faiz);
  document.getElementById('adTotal').textContent=formatTL(reklam);
  document.getElementById('fuelTotal').textContent=formatTL(yakit);

  let net=totalIn-totalOut;
  let el=document.getElementById('totalNet');
  el.textContent=formatTL(net);
  el.className=net>=0?'positive':'negative';

  renderCategoryButtons();
}
function badge(v){let cls=v==='Gerçek Gider'?'real':v==='Transfer'?'transfer':v==='Faiz'?'interest':v.includes('Kart')?'card':'bank';return `<span class="badge ${cls}">${v}</span>`}

function getCategoryStats(){
  const map={};
  bhdRawRows.forEach(r=>{
    const cat=(r.kategori||'Diğer').trim()||'Diğer';
    if(!map[cat]) map[cat]={kategori:cat,gelen:0,giden:0,net:0,islemSayisi:0};
    map[cat].gelen+=r.gelen||0;
    map[cat].giden+=r.giden||0;
    map[cat].net+=r.net||0;
    map[cat].islemSayisi++;
  });
  return Object.values(map).sort((a,b)=>(b.gelen+b.giden)-(a.gelen+a.giden));
}

function renderCategoryButtons(){
  const el=document.getElementById('categoryKpiGrid');
  if(!el) return;
  const stats=getCategoryStats();
  if(!stats.length){
    el.innerHTML='<div class="small">Kategori butonları analizden sonra burada görünecek.</div>';
    return;
  }
  el.innerHTML=stats.map(c=>{
    const encoded=encodeURIComponent(c.kategori);
    const main=c.giden>0?c.giden:c.gelen;
    const mainClass=c.giden>0?'negative':'positive';
    return `<div class="kpi" onclick="showCategoryDetails('${encoded}')">
      <span>${escapeHtml(c.kategori)} • ${c.islemSayisi} hareket</span>
      <strong class="${mainClass}">${formatTL(main)}</strong>
      <div class="small" style="margin-top:8px">Gelen: ${formatTL(c.gelen)} / Giden: ${formatTL(c.giden)} / Net: ${formatTL(c.net)}</div>
    </div>`;
  }).join('');
}

function showCategoryDetails(encodedCategory){
  applyManualCategoriesToRows();
  const category=decodeURIComponent(encodedCategory);
  const title='Kategori Detayı: '+category;
  const rows=bhdRawRows.filter(r=>sameCategory(r.kategori,category));

  currentView=title;
  document.getElementById('tableTitle').textContent=title;

  const tabs=document.getElementById('viewTabs');
  if(tabs){tabs.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));}

  renderTransactionRows(rows,'Bu kategori için hareket bulunamadı.');
  renderManualCategoryBlocks(true);
  document.getElementById('tableTitle').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderTransactionRows(rows,emptyMessage){
  const thead=document.querySelector('#bhdTable thead');
  const tbody=document.querySelector('#bhdTable tbody');
  thead.innerHTML='<tr><th>Tarih</th><th>Ay</th><th>Kişi/Firma</th><th>Personel</th><th>Kategori</th><th>Alt Kategori</th><th>Analiz</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Açıklama</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="12">${emptyMessage||'Hareket bulunamadı.'}</td></tr>`;
    return;
  }
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr>
      <td>${r.tarih}</td>
      <td>${r.ay}</td>
      <td>${r.kisiFirma}</td>
      <td>${r.personel||''}</td>
      <td>${r.kategori}</td>
      <td>${r.altKategori||''}</td>
      <td>${badge(r.analizTuru)}</td>
      <td class="amount positive">${formatTL(r.gelen)}</td>
      <td class="amount negative">${formatTL(r.giden)}</td>
      <td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td>
      <td>${r.aciklama}</td>
      <td>${r.kaynak}</td>
    </tr>`;
  });
}

function showKpiDetails(type){
  applyManualCategoriesToRows();

  let title='KPI Detayı';
  let rows=[];

  if(type==='gelen'){
    title='Toplam Tahsilat / Gelen Hareketleri';
    rows=bhdRawRows.filter(r=>r.gelen>0);
  }else if(type==='giden'){
    title='Toplam Harcama / Giden Hareketleri';
    rows=bhdRawRows.filter(r=>r.giden>0);
  }else if(type==='ticari'){
    title='Gerçek Ticari Gider Hareketleri';
    rows=bhdRawRows.filter(r=>r.giden>0 && sameCategory(r.kategori,'Ticari İşlem'));
  }else if(type==='transfer_gelen'){
    title='Ticari Olmayan Transfer / Gelen Hareketleri';
    rows=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.gelen>0);
  }else if(type==='transfer_giden'){
    title='Ticari Olmayan Transfer / Giden Hareketleri';
    rows=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.giden>0);
  }else if(type==='faiz'){
    title='Faiz / Ücret Hareketleri';
    rows=bhdRawRows.filter(r=>sameCategory(r.kategori,'Faiz / Banka Ücreti'));
  }else if(type==='reklam'){
    title='Reklam Gideri Hareketleri';
    rows=bhdRawRows.filter(r=>sameCategory(r.kategori,'Reklam'));
  }else if(type==='yakit'){
    title='Yakıt Gideri Hareketleri';
    rows=bhdRawRows.filter(r=>sameCategory(r.kategori,'Yakıt'));
  }else if(type==='net'){
    title='Net Nakit Hareketleri - Tüm Gelen ve Giden';
    rows=bhdRawRows.filter(r=>r.gelen>0 || r.giden>0);
  }

  currentView=title;
  document.getElementById('tableTitle').textContent=title;

  const tabs=document.getElementById('viewTabs');
  if(tabs){
    tabs.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
  }

  renderTransactionRows(rows,'Bu KPI için hareket bulunamadı.');

  renderManualCategoryBlocks(true);
  document.getElementById('tableTitle').scrollIntoView({behavior:'smooth',block:'start'});
}

function rowsForSummaryItem(viewName,item){
  let ad=item&&item.ad!==undefined?item.ad:'';
  if(viewName==='Firma Özeti'){
    let key=getSummaryKey(ad);
    return bhdRawRows.filter(r=>getSummaryKey(r.kisiFirma)===key);
  }
  if(viewName==='Kategori Özeti') return bhdRawRows.filter(r=>sameCategory(r.kategori,ad));
  if(viewName==='Alt Kategori Özeti') return bhdRawRows.filter(r=>String(r.altKategori||'')===String(ad||''));
  if(viewName==='Aylık Özet') return bhdRawRows.filter(r=>String(r.ay||'')===String(ad||''));
  if(viewName==='Gerçek Giderler'){
    let key=getSummaryKey(ad);
    return bhdRawRows.filter(r=>getSummaryKey(r.kisiFirma)===key && r.giden>0 && r.analizTuru==='Gerçek Gider');
  }
  if(viewName==='Personel Ödemeleri') return bhdRawRows.filter(r=>String(r.personel||'')===String(ad||''));
  return [];
}
function toggleSummaryDetail(id,btn){
  const row=document.getElementById(id);
  if(!row)return;
  const open=row.classList.toggle('open');
  if(btn)btn.textContent=open?'Kapat':'Detay';
}
function detailRowsHtml(rows,title){
  if(!rows||!rows.length) return `<div class="summary-detail-box"><div class="summary-detail-empty">Bu başlık için hareket bulunamadı.</div></div>`;
  let html=`<div class="summary-detail-box"><div class="summary-detail-title">${escapeHtml(title)} kırılımı - ${rows.length} hareket</div><div class="table-wrap" style="margin-top:0"><table class="summary-detail-table"><thead><tr><th>Tarih</th><th>Ay</th><th>Kişi/Firma</th><th>Kategori</th><th>Alt Kategori</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Açıklama</th><th>Kaynak</th></tr></thead><tbody>`;
  rows.forEach(r=>{
    html+=`<tr><td>${escapeHtml(r.tarih)}</td><td>${escapeHtml(r.ay)}</td><td>${escapeHtml(r.kisiFirma)}</td><td>${escapeHtml(r.kategori||'')}</td><td>${escapeHtml(r.altKategori||'')}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td>${escapeHtml(r.aciklama)}</td><td>${escapeHtml(r.kaynak)}</td></tr>`;
  });
  html+='</tbody></table></div></div>';
  return html;
}
function renderView(name){
  currentView=name;
  document.getElementById('bhdResults').style.display='block';
  let tabs=document.getElementById('viewTabs');
  tabs.innerHTML='';
  Object.keys(bhdViews).forEach(v=>{let b=document.createElement('button');b.className='tab-button'+(v===name?' active':'');b.textContent=v;b.onclick=()=>renderView(v);tabs.appendChild(b)});
  document.getElementById('tableTitle').textContent=name;
  let thead=document.querySelector('#bhdTable thead'),tbody=document.querySelector('#bhdTable tbody');
  thead.innerHTML='';tbody.innerHTML='';
  let rows=bhdViews[name]||[];
  renderManualCategoryBlocks(true);

  if(['Personel Hareketleri','Manuel Kategori Detayı','Ticari Olmayan Transfer Gelen','Ticari Olmayan Transfer Giden','Transfer / Virman','Faizler','Ham Hareketler'].includes(name) || name.startsWith('Kategori: ')){
    thead.innerHTML='<tr><th>Tarih</th><th>Ay</th><th>Kişi/Firma</th><th>Personel</th><th>Kategori</th><th>Alt Kategori</th><th>Analiz</th><th>Gelen</th><th>Giden</th><th>Net</th><th>Açıklama</th><th>Kaynak</th></tr>';
    rows.forEach(r=>{tbody.innerHTML+=`<tr><td>${escapeHtml(r.tarih)}</td><td>${escapeHtml(r.ay)}</td><td>${escapeHtml(r.kisiFirma)}</td><td>${escapeHtml(r.personel||'')}</td><td>${escapeHtml(r.kategori||'')}</td><td>${escapeHtml(r.altKategori||'')}</td><td>${badge(r.analizTuru)}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td>${escapeHtml(r.aciklama)}</td><td>${escapeHtml(r.kaynak)}</td></tr>`})
  }else{
    if(name==='Firma Özeti'){
      thead.innerHTML='<tr><th>Detay</th><th>Kategori / Alt Kategori Seç<br><span class="small">SelectButton korundu</span></th><th>Tarihler</th><th>Başlık</th><th>Mevcut Kategori</th><th>Alt Kategori</th><th>Gelen</th><th>Giden</th><th>Net</th><th>İşlem Sayısı</th></tr>';
      rows.forEach((r,i)=>{
        let saved=manualCategoryMap[getFirmaKey(r.ad)]||r.kategori||'Diğer';
        let detailId='summary_detail_'+normalizeMatch(name+'_'+r.ad+'_'+i);
        let detailRows=rowsForSummaryItem(name,r);
        tbody.innerHTML+=`<tr>
          <td><button class="detail-toggle" type="button" onclick="toggleSummaryDetail('${detailId}',this)">Detay</button></td>
          <td>
            <select class="category-select" id="cat_${getFirmaKey(r.ad)}" onchange="updateSubcategorySelect('${getFirmaKey(r.ad)}')">${categoryOptions(saved)}</select>
            <select class="subcategory-select" id="subcat_${getFirmaKey(r.ad)}">${subcategoryOptions(saved,manualSubcategoryMap[getFirmaKey(r.ad)]||'')}</select>
            <button class="ok-button" type="button" onclick="setFirmaCategory('${String(r.ad).replace(/'/g,"\\'")}')">Okey</button>
          </td>
          <td>${escapeHtml(r.tarihler||'')}</td>
          <td>${escapeHtml(r.ad)}</td>
          <td>${escapeHtml(saved)}</td>
          <td>${escapeHtml(manualSubcategoryMap[getFirmaKey(r.ad)]||'')}</td>
          <td class="amount positive">${formatTL(r.gelen)}</td>
          <td class="amount negative">${formatTL(r.giden)}</td>
          <td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td>
          <td class="amount">${r.islemSayisi}</td>
        </tr><tr id="${detailId}" class="summary-detail-row"><td colspan="11">${detailRowsHtml(detailRows,r.ad)}</td></tr>`;
      })
    }else{
      thead.innerHTML='<tr><th>Detay</th><th>Başlık</th><th>Gelen</th><th>Giden</th><th>Net</th><th>İşlem Sayısı</th></tr>';
      rows.forEach((r,i)=>{
        let detailId='summary_detail_'+normalizeMatch(name+'_'+r.ad+'_'+i);
        let detailRows=rowsForSummaryItem(name,r);
        tbody.innerHTML+=`<tr><td><button class="detail-toggle" type="button" onclick="toggleSummaryDetail('${detailId}',this)">Detay</button></td><td>${escapeHtml(r.ad)}</td><td class="amount positive">${formatTL(r.gelen)}</td><td class="amount negative">${formatTL(r.giden)}</td><td class="amount ${r.net>=0?'positive':'negative'}">${formatTL(r.net)}</td><td class="amount">${r.islemSayisi}</td></tr><tr id="${detailId}" class="summary-detail-row"><td colspan="6">${detailRowsHtml(detailRows,r.ad)}</td></tr>`;
      })
    }
  }
}

function downloadBHDReport(){
  if(!bhdRawRows.length){
    alert('Önce dosya yükleyip analiz etmelisin. Rapor için veri yok.');
    return;
  }

  applyManualCategoriesToRows();
  buildViews();

  let wb=XLSX.utils.book_new();
  wb.Props={Title:'BHD Detaylı Okunabilir Rapor',Subject:'Banka Hareket Dökümü Analizi',Author:'ÖMAS Finans Analiz Araçları'};

  const usedSheetNames={};
  const moneyFmt='₺ #,##0.00;[Red]-₺ #,##0.00';
  const intFmt='#,##0';

  function safeSheetName(name){
    let s=String(name||'Sayfa').replace(/[\\\/\?\*\[\]\:]/g,' ').replace(/\s+/g,' ').trim();
    if(!s) s='Sayfa';
    s=s.substring(0,31);
    let base=s;
    let i=1;
    while(usedSheetNames[s]){
      let suffix=' '+i++;
      s=base.substring(0,31-suffix.length)+suffix;
    }
    usedSheetNames[s]=true;
    return s;
  }

  function addAoA(name, aoa, opts={}){
    const ws=XLSX.utils.aoa_to_sheet(aoa.length?aoa:[['Bilgi','Bu bölümde kayıt yok']]);
    if(opts.cols) ws['!cols']=opts.cols;
    if(opts.freeze) ws['!freeze']=opts.freeze;
    if(opts.autoFilter) ws['!autofilter']=opts.autoFilter;
    if(opts.rows) ws['!rows']=opts.rows;
    applyMoneyFormat(ws, opts.moneyCols||[], opts.startRow||1);
    applyIntegerFormat(ws, opts.integerCols||[], opts.startRow||1);
    XLSX.utils.book_append_sheet(wb,ws,safeSheetName(name));
  }

  function applyMoneyFormat(ws, cols, startRow){
    const range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
    for(const c of cols){
      for(let r=startRow;r<=range.e.r;r++){
        const addr=XLSX.utils.encode_cell({r,c});
        if(ws[addr] && typeof ws[addr].v==='number') ws[addr].z=moneyFmt;
      }
    }
  }

  function applyIntegerFormat(ws, cols, startRow){
    const range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
    for(const c of cols){
      for(let r=startRow;r<=range.e.r;r++){
        const addr=XLSX.utils.encode_cell({r,c});
        if(ws[addr] && typeof ws[addr].v==='number') ws[addr].z=intFmt;
      }
    }
  }

  function rowLine(label,value){return [label,value];}
  function detailAoARow(r){return [r.tarih,r.ay,r.kategori||'',r.altKategori||'',r.kisiFirma,r.personel||'',r.gelen,r.giden,r.net,r.analizTuru,r.islemTuru,r.aciklama,r.kaynak];}

  const totalIn=bhdRawRows.reduce((s,r)=>s+r.gelen,0);
  const totalOut=bhdRawRows.reduce((s,r)=>s+r.giden,0);
  const totalNet=totalIn-totalOut;
  const realExpense=bhdRawRows.filter(r=>r.giden>0 && sameCategory(r.kategori,'Ticari İşlem')).reduce((s,r)=>s+r.giden,0);
  const transferIn=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.gelen>0).reduce((s,r)=>s+r.gelen,0);
  const transferOut=bhdRawRows.filter(r=>sameCategory(r.kategori,'Ticari Olmayan Transfer') && r.giden>0).reduce((s,r)=>s+r.giden,0);
  const faiz=bhdRawRows.filter(r=>sameCategory(r.kategori,'Faiz / Banka Ücreti') || r.analizTuru==='Faiz').reduce((s,r)=>s+r.giden,0);

  const categorySummary=buildCategorySummary();
  const subcategorySummary=buildSubcategorySummary();

  const dashboard=[
    ['BHD DETAYLI OKUNABİLİR RAPOR'],
    ['Oluşturma Tarihi', new Date().toLocaleString('tr-TR')],
    ['Toplam Hareket Sayısı', bhdRawRows.length],
    [],
    ['GENEL ÖZET'],
    ...[
      rowLine('Toplam Tahsilat / Gelen', totalIn),
      rowLine('Toplam Harcama / Giden', totalOut),
      rowLine('Net Nakit', totalNet),
      rowLine('Gerçek Ticari Gider', realExpense),
      rowLine('Ticari Olmayan Transfer / Gelen', transferIn),
      rowLine('Ticari Olmayan Transfer / Giden', transferOut),
      rowLine('Faiz / Banka Ücreti', faiz)
    ],
    [],
    ['KATEGORİ TOPLAMLARI'],
    ['Kategori','Gelen','Giden','Net','İşlem Sayısı']
  ];
  categorySummary.forEach(r=>dashboard.push([r.kategori,r.gelen,r.giden,r.net,r.islemSayisi]));
  dashboard.push([],['NOT','Excelde detay butonu JavaScript gibi çalışmaz. Bu yüzden detaylar ayrı özet sayfalarında artı/eksi gruplu satır olarak verildi. Sol taraftaki 1-2 seviye/+/− düğmeleriyle açıp kapatabilirsin.']);

  addAoA('01 Okunabilir Ozet',dashboard,{
    cols:[{wch:42},{wch:18},{wch:18},{wch:18},{wch:14}],
    moneyCols:[1,2,3],
    integerCols:[4],
    startRow:1
  });

  addGroupedCategorySheet();
  addGroupedSubcategorySheet();
  addGroupedFirmaSheet();

  const readableDetail=[
    ['Detaylı Hareketler'],
    ['Tarih','Ay','Ana Kategori','Alt Kategori','Kişi/Firma','Personel','Gelen TL','Giden TL','Net TL','Analiz Türü','İşlem Türü','Açıklama','Kaynak Dosya']
  ];
  bhdRawRows.forEach(r=>readableDetail.push(detailAoARow(r)));
  addAoA('05 Detayli Hareketler',readableDetail,{
    cols:[{wch:14},{wch:15},{wch:28},{wch:28},{wch:42},{wch:22},{wch:16},{wch:16},{wch:16},{wch:16},{wch:14},{wch:60},{wch:28}],
    moneyCols:[6,7,8],startRow:2,
    autoFilter:{ref:'A2:M'+Math.max(2,readableDetail.length)}
  });

  const manualAoa=[
    ['Manuel Kategori Detayı'],
    ['Tarih','Ana Kategori','Alt Kategori','Kişi/Firma','Gelen TL','Giden TL','Net TL','Açıklama']
  ];
  bhdViews['Manuel Kategori Detayı'].forEach(r=>manualAoa.push([r.tarih,r.kategori||'',r.altKategori||'',r.kisiFirma,r.gelen,r.giden,r.net,r.aciklama]));
  addAoA('06 Manuel Kategori Detay',manualAoa,{
    cols:[{wch:14},{wch:28},{wch:28},{wch:42},{wch:16},{wch:16},{wch:16},{wch:60}],
    moneyCols:[4,5,6],startRow:2,
    autoFilter:{ref:'A2:H'+Math.max(2,manualAoa.length)}
  });

  addDetailSheet('07 Transfer Gelen',bhdViews['Ticari Olmayan Transfer Gelen']);
  addDetailSheet('08 Transfer Giden',bhdViews['Ticari Olmayan Transfer Giden']);
  addDetailSheet('09 Faizler',bhdViews['Faizler']);
  addDetailSheet('10 Personel Hareketleri',bhdViews['Personel Hareketleri']);

  try{
    XLSX.writeFile(wb,'BHD_OKUNAKLI_DETAYLI_RAPOR.xlsx');
  }catch(e){
    console.error(e);
    alert('Rapor oluşturulurken hata oluştu: '+e.message);
  }

  function addGroupedCategorySheet(){
    const aoa=[
      ['Kategori Toplamları + Altında Detay Hareketler'],
      ['Aç/Kapat','Kategori','Gelen TL','Giden TL','Net TL','İşlem Sayısı','Tarih','Ay','Alt Kategori','Kişi/Firma','Personel','Analiz','Açıklama','Kaynak']
    ];
    const rowMeta=[];
    categorySummary.forEach(sum=>{
      aoa.push(['DETAY +/−',sum.kategori,sum.gelen,sum.giden,sum.net,sum.islemSayisi,'','','','','','','','']);
      rowMeta.push({level:0});
      const rows=bhdRawRows.filter(r=>sameCategory(r.kategori,sum.kategori));
      rows.forEach(r=>{
        aoa.push(['',sum.kategori,r.gelen,r.giden,r.net,'',r.tarih,r.ay,r.altKategori||'',r.kisiFirma,r.personel||'',r.analizTuru,r.aciklama,r.kaynak]);
        rowMeta.push({level:1, hidden:true});
      });
    });
    addAoA('02 Kategori Detayli',aoa,{
      cols:[{wch:12},{wch:30},{wch:16},{wch:16},{wch:16},{wch:14},{wch:14},{wch:16},{wch:28},{wch:42},{wch:22},{wch:16},{wch:60},{wch:28}],
      moneyCols:[2,3,4],integerCols:[5],startRow:2,
      rows:[{},{}].concat(rowMeta),
      autoFilter:{ref:'A2:N'+Math.max(2,aoa.length)}
    });
  }

  function addGroupedSubcategorySheet(){
    const aoa=[
      ['Alt Kategori Özeti + Altında Detay Hareketler'],
      ['Aç/Kapat','Ana Kategori','Alt Kategori','Gelen TL','Giden TL','Net TL','İşlem Sayısı','Tarih','Ay','Kişi/Firma','Personel','Analiz','Açıklama','Kaynak']
    ];
    const rowMeta=[];
    subcategorySummary.forEach(sum=>{
      aoa.push(['DETAY +/−',sum.kategori,sum.altKategori,sum.gelen,sum.giden,sum.net,sum.islemSayisi,'','','','','','','']);
      rowMeta.push({level:0});
      const rows=bhdRawRows.filter(r=>sameCategory(r.kategori,sum.kategori) && String(r.altKategori||r.manuelAltKategori||'Alt kategori yok')===String(sum.altKategori));
      rows.forEach(r=>{
        aoa.push(['',sum.kategori,sum.altKategori,r.gelen,r.giden,r.net,'',r.tarih,r.ay,r.kisiFirma,r.personel||'',r.analizTuru,r.aciklama,r.kaynak]);
        rowMeta.push({level:1, hidden:true});
      });
    });
    addAoA('03 Alt Kategori Detayli',aoa,{
      cols:[{wch:12},{wch:30},{wch:30},{wch:16},{wch:16},{wch:16},{wch:14},{wch:14},{wch:16},{wch:42},{wch:22},{wch:16},{wch:60},{wch:28}],
      moneyCols:[3,4,5],integerCols:[6],startRow:2,
      rows:[{},{}].concat(rowMeta),
      autoFilter:{ref:'A2:N'+Math.max(2,aoa.length)}
    });
  }

  function addGroupedFirmaSheet(){
    const aoa=[
      ['Firma / Kişi Özeti + Altında Detay Hareketler'],
      ['Aç/Kapat','Kişi/Firma','Tarihler','Kategori','Alt Kategori','Gelen TL','Giden TL','Net TL','İşlem Sayısı','Tarih','Ay','Personel','Analiz','Açıklama','Kaynak']
    ];
    const rowMeta=[];
    bhdViews['Firma Özeti'].forEach(sum=>{
      const key=getFirmaKey(sum.ad);
      const cat=manualCategoryMap[key]||sum.kategori||'';
      const sub=manualSubcategoryMap[key]||'';
      aoa.push(['DETAY +/−',sum.ad,sum.tarihler||'',cat,sub,sum.gelen,sum.giden,sum.net,sum.islemSayisi,'','','','','','']);
      rowMeta.push({level:0});
      const rows=bhdRawRows.filter(r=>getSummaryKey(r.kisiFirma)===getSummaryKey(sum.ad));
      rows.forEach(r=>{
        aoa.push(['',sum.ad,'',r.kategori||'',r.altKategori||'',r.gelen,r.giden,r.net,'',r.tarih,r.ay,r.personel||'',r.analizTuru,r.aciklama,r.kaynak]);
        rowMeta.push({level:1, hidden:true});
      });
    });
    addAoA('04 Firma Detayli',aoa,{
      cols:[{wch:12},{wch:42},{wch:34},{wch:28},{wch:28},{wch:16},{wch:16},{wch:16},{wch:14},{wch:14},{wch:16},{wch:22},{wch:16},{wch:60},{wch:28}],
      moneyCols:[5,6,7],integerCols:[8],startRow:2,
      rows:[{},{}].concat(rowMeta),
      autoFilter:{ref:'A2:O'+Math.max(2,aoa.length)}
    });
  }

  function addDetailSheet(name,rows){
    rows=rows||[];
    const aoa=[
      [name],
      ['Tarih','Ay','Ana Kategori','Alt Kategori','Kişi/Firma','Gelen TL','Giden TL','Net TL','Açıklama','Kaynak']
    ];
    rows.forEach(r=>aoa.push([r.tarih,r.ay,r.kategori||'',r.altKategori||'',r.kisiFirma,r.gelen,r.giden,r.net,r.aciklama,r.kaynak]));
    addAoA(name,aoa,{cols:[{wch:14},{wch:15},{wch:28},{wch:28},{wch:42},{wch:16},{wch:16},{wch:16},{wch:60},{wch:28}],moneyCols:[5,6,7],startRow:2,autoFilter:{ref:'A2:J'+Math.max(2,aoa.length)}});
  }

  function buildCategorySummary(){
    const m={};
    bhdRawRows.forEach(r=>{
      const k=r.kategori||'Kategori Yok';
      if(!m[k])m[k]={kategori:k,gelen:0,giden:0,net:0,islemSayisi:0};
      m[k].gelen+=r.gelen;
      m[k].giden+=r.giden;
      m[k].net+=r.net;
      m[k].islemSayisi++;
    });
    return Object.values(m).sort((a,b)=>Math.abs(b.giden||b.gelen||b.net)-Math.abs(a.giden||a.gelen||a.net));
  }

  function buildSubcategorySummary(){
    const m={};
    bhdRawRows.forEach(r=>{
      const cat=r.kategori||'Kategori Yok';
      const sub=r.altKategori||r.manuelAltKategori||'Alt kategori yok';
      const key=cat+'|||'+sub;
      if(!m[key])m[key]={kategori:cat,altKategori:sub,gelen:0,giden:0,net:0,islemSayisi:0};
      m[key].gelen+=r.gelen;
      m[key].giden+=r.giden;
      m[key].net+=r.net;
      m[key].islemSayisi++;
    });
    return Object.values(m).sort((a,b)=>{
      const c=a.kategori.localeCompare(b.kategori,'tr');
      if(c!==0)return c;
      return Math.abs(b.giden||b.gelen||b.net)-Math.abs(a.giden||a.gelen||a.net);
    });
  }
}

function rowOut(r){return {'Sıra':r.sira,'Kaynak Dosya':r.kaynak,'Dosya Tipi':r.dosyaTipi,'Tarih':r.tarih,'Ay':r.ay,'Kişi/Firma':r.kisiFirma,'Personel':r.personel||'','Ana Kategori':r.kategori,'Alt Kategori':r.altKategori||'','Manuel Kategori':r.manuelKategori||'','Manuel Alt Kategori':r.manuelAltKategori||'','İşlem Türü':r.islemTuru,'Analiz Türü':r.analizTuru,'Ticari mi':r.ticariMi,'Gelen TL':r.gelen,'Giden TL':r.giden,'Net TL':r.net,'Açıklama':r.aciklama,'Referans':r.referans}}

let invoicePurchaseRows=[];
let invoiceSalesRows=[];
let invoiceExpenseRows=[];
let invoiceExcludedRows=[];
let invoiceReturnRows=[];
let invoiceTevkifatRows=[];
let invoiceIstisnaRows=[];
let invoiceMonthlySummary=[];
let invoiceCurrentPurchaseRows=[];
let invoiceCurrentSalesRows=[];
let invoiceCurrentExpenseRows=[];
let invoiceCurrentExcludedRows=[];
let invoiceCurrentReturnRows=[];
let invoiceCurrentTevkifatRows=[];
let invoiceCurrentIstisnaRows=[];
let invoiceCurrentAnalysisActive=false;
let invoiceDetailViewMode='current';
let skippedInvoiceSummaryRows=0;
let giderPusulasiAmount=invoiceNumber(localStorage.getItem('invoiceGiderPusulasiAmount')||0);
let giderPusulasiKdv20=invoiceNumber(localStorage.getItem('invoiceGiderPusulasiKdv20')||0);
let giderPusulasiKdv10=invoiceNumber(localStorage.getItem('invoiceGiderPusulasiKdv10')||0);
let giderPusulasiKdv1=invoiceNumber(localStorage.getItem('invoiceGiderPusulasiKdv1')||0);

let invoiceCommissions=JSON.parse(localStorage.getItem('invoiceCommissions')||'{}');
let invoiceProfitExpenses=JSON.parse(localStorage.getItem('invoiceProfitExpensesV1')||'{}');
const INVOICE_PROFIT_EXPENSE_CATEGORIES=[
  ['maas','Maaşlar'],['sgk','İşveren SGK'],['kira','Kira'],['elektrikSu','Elektrik / Su'],['internetTelefon','İnternet / Telefon'],['muhasebe','Muhasebe'],['kargo','Kargo'],['reklam','Reklam'],['bankaPos','Banka / POS'],['amortisman','Amortisman'],['faiz','Faiz Gideri'],['harcVergi','Damga / Harç / Gider Yazılabilen Vergiler'],['diger','Diğer Ticari Gider']
];
const INVOICE_YEARLY_STORE_KEY='invoiceYearlyAnalysisStoreV79';

function normalizeTurkishAsciiText(v){
  return String(v||'').toLocaleUpperCase('tr-TR')
    .replace(/İ/g,'I').replace(/IÌ‡/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/[^A-Z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function invoiceAccountingMonthFromFileName(fileName){
  const raw=normalizeTurkishAsciiText(fileName);
  const map=[
    ['OCAK',0],['01',0],['1',0],
    ['SUBAT',1],['ŞUBAT',1],['02',1],['2',1],
    ['MART',2],['03',2],['3',2],
    ['NISAN',3],['NİSAN',3],['04',3],['4',3],
    ['MAYIS',4],['05',4],['5',4],
    ['HAZIRAN',5],['HAZİRAN',5],['06',5],['6',5],
    ['TEMMUZ',6],['07',6],['7',6],
    ['AGUSTOS',7],['AĞUSTOS',7],['08',7],['8',7],
    ['EYLUL',8],['EYLÜL',8],['09',8],['9',8],
    ['EKIM',9],['EKİM',9],['10',9],
    ['KASIM',10],['11',10],
    ['ARALIK',11],['12',11]
  ];
  // Önce ay adı ara. En güvenlisi dosya adında OCAK/MART gibi yazması.
  for(const [word,idx] of map){
    if(word.length>2 && raw.split(' ').includes(normalizeTurkishAsciiText(word))) return invoiceMonthLabelFromIndex(idx);
  }
  // Sonra 2026-03, 03-2026, MART 2026 gibi sayısal desenleri dene.
  const m1=raw.match(/(?:^|\s)(20\d{2})\s*(0?[1-9]|1[0-2])(?:\s|$)/);
  if(m1) return invoiceMonthLabelFromIndex(Number(m1[2])-1);
  const m2=raw.match(/(?:^|\s)(0?[1-9]|1[0-2])\s*(20\d{2})(?:\s|$)/);
  if(m2) return invoiceMonthLabelFromIndex(Number(m2[1])-1);
  // En son tek başına 01..12 ara. Ama dosya adında başka numaralar olabileceği için düşük güvenli.
  const tokens=raw.split(' ');
  for(const tok of tokens){
    if(/^0?[1-9]$|^1[0-2]$/.test(tok)) return invoiceMonthLabelFromIndex(Number(tok)-1);
  }
  return 'TARİHSİZ';
}
function invoiceLoadYearlyMemory(){
  try{
    const data=JSON.parse(localStorage.getItem(INVOICE_YEARLY_STORE_KEY)||'{}');
    invoicePurchaseRows=Array.isArray(data.purchase)?data.purchase:[];
    invoiceSalesRows=Array.isArray(data.sales)?data.sales:[];
    invoiceExpenseRows=Array.isArray(data.expense)?data.expense:[];
    invoiceExcludedRows=Array.isArray(data.excluded)?data.excluded:[];
    invoiceReturnRows=Array.isArray(data.returns)?data.returns:[];
    invoiceTevkifatRows=Array.isArray(data.tevkifat)?data.tevkifat:[];
    invoiceIstisnaRows=Array.isArray(data.istisna)?data.istisna:[];
  }catch(e){
    invoicePurchaseRows=[]; invoiceSalesRows=[]; invoiceExpenseRows=[]; invoiceExcludedRows=[]; invoiceReturnRows=[]; invoiceTevkifatRows=[]; invoiceIstisnaRows=[];
  }
}
function invoiceSaveYearlyMemory(){
  const data={purchase:invoicePurchaseRows,sales:invoiceSalesRows,expense:invoiceExpenseRows,excluded:invoiceExcludedRows,returns:invoiceReturnRows,tevkifat:invoiceTevkifatRows,istisna:invoiceIstisnaRows,savedAt:new Date().toISOString()};
  try{localStorage.setItem(INVOICE_YEARLY_STORE_KEY,JSON.stringify(data));}
  catch(e){console.warn('Yıllık hafıza kaydedilemedi:',e);}
}
function removeInvoiceRowsBySource(type,fileName){
  if(type==='Alış') invoicePurchaseRows=invoicePurchaseRows.filter(r=>r.kaynak!==fileName);
  if(type==='Satış') invoiceSalesRows=invoiceSalesRows.filter(r=>r.kaynak!==fileName);
  if(type==='Masraf Fişi') invoiceExpenseRows=invoiceExpenseRows.filter(r=>r.kaynak!==fileName);
  invoiceExcludedRows=invoiceExcludedRows.filter(r=>!(r.tur===type && r.kaynak===fileName));
  invoiceReturnRows=invoiceReturnRows.filter(r=>!(r.tur===type && r.kaynak===fileName));
  invoiceTevkifatRows=invoiceTevkifatRows.filter(r=>!(r.tur===type && r.kaynak===fileName));
  invoiceIstisnaRows=invoiceIstisnaRows.filter(r=>!(r.tur===type && r.kaynak===fileName));
}
function clearInvoiceYearlyMemory(){
  if(!confirm('Yıllık hafızadaki tüm fatura analiz verileri silinsin mi? Komisyonlar ayrı kalır.')) return;
  localStorage.removeItem(INVOICE_YEARLY_STORE_KEY);
  invoicePurchaseRows=[]; invoiceSalesRows=[]; invoiceExpenseRows=[]; invoiceExcludedRows=[]; invoiceReturnRows=[]; invoiceTevkifatRows=[]; invoiceIstisnaRows=[]; invoiceMonthlySummary=[]; invoiceCurrentPurchaseRows=[]; invoiceCurrentSalesRows=[]; invoiceCurrentExpenseRows=[]; invoiceCurrentExcludedRows=[]; invoiceCurrentReturnRows=[]; invoiceCurrentTevkifatRows=[]; invoiceCurrentIstisnaRows=[]; invoiceCurrentAnalysisActive=false; skippedInvoiceSummaryRows=0;
  const results=document.getElementById('invoiceAnalysisResults'); if(results) results.style.display='none';
  const btn=document.getElementById('downloadInvoiceProfitBtn'); if(btn) btn.disabled=true;
  const status=document.getElementById('invoiceAnalysisStatus'); if(status) status.textContent='Yıllık fatura hafızası temizlendi.';
}

function invoiceMonthIndexFromAy(ay){
  const n=normalizeHeader(ay||'');
  for(let i=0;i<MONTHS.length;i++){
    if(n.includes(normalizeHeader(MONTHS[i]))) return i;
  }
  return 99;
}
function invoiceMonthLabelFromIndex(i){return MONTHS[i]||'TARİHSİZ';}
function getInvoiceCommissionTotal(){
  return Object.values(invoiceCommissions||{}).reduce((s,v)=>s+invoiceNumber(v),0);
}
function getInvoiceCommissionForMonthIndex(i){
  return invoiceNumber((invoiceCommissions||{})[i]||0);
}
function renderInvoiceCommissionInputs(){
  const grid=document.getElementById('invoiceCommissionGrid');
  if(!grid) return;
  grid.innerHTML=MONTHS.map((m,i)=>`<div class="commission-field"><label>${m}</label><input type="text" id="invoiceCommission_${i}" value="${getInvoiceCommissionForMonthIndex(i)?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(getInvoiceCommissionForMonthIndex(i)):''}" placeholder="0,00" /></div>`).join('');
  invoiceSetText('savedInvoiceCommissionTotal',invoiceFormatTL(getInvoiceCommissionTotal()));
  invoiceSetText('commissionTotalSummary',invoiceFormatTL(getInvoiceCommissionTotal()));
}
function saveInvoiceCommissions(){
  MONTHS.forEach((m,i)=>{
    const el=document.getElementById('invoiceCommission_'+i);
    invoiceCommissions[i]=invoiceNumber(el?el.value:0);
  });
  localStorage.setItem('invoiceCommissions',JSON.stringify(invoiceCommissions));
  renderInvoiceCommissionInputs();
  if(document.getElementById('invoiceAnalysisResults') && document.getElementById('invoiceAnalysisResults').style.display!=='none') renderInvoiceProfitResults();
}
function clearInvoiceCommissions(){
  invoiceCommissions={};
  localStorage.setItem('invoiceCommissions',JSON.stringify(invoiceCommissions));
  renderInvoiceCommissionInputs();
  if(document.getElementById('invoiceAnalysisResults') && document.getElementById('invoiceAnalysisResults').style.display!=='none') renderInvoiceProfitResults();
}

function getInvoiceProfitExpenseForMonthIndex(i){
  const row=(invoiceProfitExpenses||{})[i]||{};
  return Object.values(row).reduce((s,v)=>s+invoiceNumber(v),0);
}
function getInvoiceProfitExpenseTotal(){
  let total=0;
  MONTHS.forEach((m,i)=>{ total+=getInvoiceProfitExpenseForMonthIndex(i); });
  return total;
}
function renderInvoiceProfitExpenseInputs(){
  const grid=document.getElementById('invoiceProfitExpenseGrid');
  if(!grid) return;
  grid.innerHTML=MONTHS.map((m,i)=>{
    const monthTotal=getInvoiceProfitExpenseForMonthIndex(i);
    const cats=INVOICE_PROFIT_EXPENSE_CATEGORIES.map(([key,label])=>{
      const v=invoiceNumber(((invoiceProfitExpenses||{})[i]||{})[key]||0);
      const formatted=v?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v):'';
      return `<div class="commission-field"><label>${label}</label><input type="text" id="invoiceProfitExpense_${i}_${key}" value="${formatted}" placeholder="0,00" /></div>`;
    }).join('');
    return `<div style="grid-column:1/-1;border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:12px;margin-top:6px"><strong>${m}</strong> <small style="color:#64748b">Toplam: ${invoiceFormatTL(monthTotal)}</small><div class="commission-grid" style="margin-top:8px">${cats}</div></div>`;
  }).join('');
  invoiceSetText('savedInvoiceProfitExpenseTotal',invoiceFormatTL(getInvoiceProfitExpenseTotal()));
  invoiceSetText('profitExpenseTotalSummary',invoiceFormatTL(getInvoiceProfitExpenseTotal()));
}
function saveInvoiceProfitExpenses(){
  const data={};
  MONTHS.forEach((m,i)=>{
    data[i]={};
    INVOICE_PROFIT_EXPENSE_CATEGORIES.forEach(([key])=>{
      const el=document.getElementById(`invoiceProfitExpense_${i}_${key}`);
      data[i][key]=invoiceNumber(el?el.value:0);
    });
  });
  invoiceProfitExpenses=data;
  localStorage.setItem('invoiceProfitExpensesV1',JSON.stringify(invoiceProfitExpenses));
  renderInvoiceProfitExpenseInputs();
  if(document.getElementById('invoiceAnalysisResults') && document.getElementById('invoiceAnalysisResults').style.display!=='none') renderInvoiceProfitResults();
}
function clearInvoiceProfitExpenses(){
  invoiceProfitExpenses={};
  localStorage.setItem('invoiceProfitExpensesV1',JSON.stringify(invoiceProfitExpenses));
  renderInvoiceProfitExpenseInputs();
  if(document.getElementById('invoiceAnalysisResults') && document.getElementById('invoiceAnalysisResults').style.display!=='none') renderInvoiceProfitResults();
}

function invoiceNormalizeHeader(v){
  return String(v||'').toLocaleUpperCase('tr-TR')
    .replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/[^A-Z0-9]/g,'')
    .trim();
}
function invoiceFindColumn(headers,candidates){
  const normalized=headers.map(invoiceNormalizeHeader);

  // Önce birebir başlık eşleşmesi aranır. Böylece KDV Oranı kolonu yanlışlıkla KDV Tutarı gibi okunmaz.
  for(const c of candidates){
    const needle=invoiceNormalizeHeader(c);
    let idx=normalized.findIndex(h=>h===needle);
    if(idx>=0) return headers[idx];
  }

  // Sonra kontrollü kısmi eşleşme yapılır.
  for(const c of candidates){
    const needle=invoiceNormalizeHeader(c);
    let idx=normalized.findIndex(h=>h.includes(needle) || (needle.length>=5 && needle.includes(h)));
    if(idx>=0) return headers[idx];
  }
  return null;
}
function invoiceNumber(v){
  if(typeof parseMoney==='function') return Math.abs(parseMoney(v));
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return Math.abs(v)||0;
  let s=String(v).replace(/TL|TRY|₺/gi,'').replace(/\s/g,'').trim();
  let neg=s.includes('-');
  s=s.replace(/-/g,'');
  if(s.includes(',') && s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(s.includes(',')) s=s.replace(',','.');
  else if((s.match(/\./g)||[]).length>1) s=s.replace(/\./g,'');
  let n=parseFloat(s); if(isNaN(n)) return 0; return Math.abs(n);
}

function invoiceIsTotalSummaryRow(arr,idx){
  const rowText=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
  if(!rowText) return true;

  const dateVal=idx.date>=0?arr[idx.date]:'';
  const invoiceVal=idx.invoice>=0?String(arr[idx.invoice]||'').trim():'';
  const firmVal=idx.firm>=0?String(arr[idx.firm]||'').trim():'';
  const descVal=idx.desc>=0?String(arr[idx.desc]||'').trim():'';
  const d=invoiceParseDate(dateVal);
  const identityText=invoiceNormalizeHeader([invoiceVal,firmVal,descVal].join(' '));

  // V93 KRİTİK FIX:
  // Excelde görünen bu satırlar gerçek fatura değildir; sadece rapor/toplam satırıdır.
  // Bunlar alış/satış gibi hesaba katılırsa satış/alış iki katına çıkar.
  
  // REDDEDİLEN / İPTAL FATURALAR tamamen hesap dışı.
  if(/REDDEDILENFATURALAR|REDDEDILENFATURA|REDFATURA|IPTALFATURA|IPTALEDFATURA|IPTALEDILENFATURA/.test(rowText)){
    return true;
  }

  // Açıklama/firma/fatura no içinde red/iptal varsa alma
  if(/REDDEDILDI|REDDEDILEN|IPTAL/.test(identityText)){
    return true;
  }

  const hardSummaryPatterns=[
    /KDVDAHILFATURATUTARI/,
    /KDVHARICFATURATUTARI/,
    /KDVLIFATURATUTARI/,
    /FATURATUTARI/,
    /FATURATOPLAMI/,
    /FATURALARTOPLAMI/,
    /ALISFATURALARITOPLAMI/,
    /SATISFATURALARITOPLAMI/,
    /IADEFATURALARITOPLAMI/,
    /TEVKIFATFATURALARITOPLAMI/,
    /ISTISNAFATURALARITOPLAMI/,
    /GENELTOPLAM/,
    /ARATOPLAM/,
    /TOPLAMKDV/,
    /KDVTOPLAMI/,
    /MATRAHTOPLAMI/,
    /TOPLAMMATRAH/,
    /ODENECEKTOPLAM/,
    /ODENECEKTUTAR/,
    /TOPLAMTUTAR/,
    /TOPLAMLAR/,
    /^TOPLAM$/
  ];

  if(hardSummaryPatterns.some(re=>re.test(rowText))) return true;

  const totalWords=/GENELTOPLAM|ARATOPLAM|ALISFATURALARITOPLAMI|SATISFATURALARITOPLAMI|FATURALARTOPLAMI|FATURATOPLAMI|TOPLAMKDV|KDVTOPLAMI|MATRAHTOPLAMI|TOPLAMMATRAH|ODENECEKTOPLAM|ODENECEKTUTAR|TOPLAMTUTAR|TOPLAMLAR|TOPLAM/.test(rowText);

  // Excel sonundaki toplam satırları genelde tarih/fatura/cari taşımaz ve sadece toplam rakamları içerir.
  if(!d && !invoiceVal && !firmVal && totalWords) return true;
  if(!d && totalWords && (!identityText || /TOPLAM|GENELTOPLAM|ARATOPLAM|FATURALARTOPLAMI|ALISFATURALARITOPLAMI|SATISFATURALARITOPLAMI/.test(identityText))) return true;

  // Tamamen kimliksiz ama para içeren satırlar da özet/toplam satırı sayılır.
  const hasAnyMoney=(idx.net>=0&&invoiceNumber(arr[idx.net])>0)||(idx.vat>=0&&invoiceNumber(arr[idx.vat])>0)||(idx.total>=0&&invoiceNumber(arr[idx.total])>0);
  if(!d && !invoiceVal && !firmVal && !descVal && hasAnyMoney) return true;

  return false;
}

function invoiceFormatTL(v){
  if(typeof formatTL==='function') return formatTL(v);
  return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v||0)+' TL';
}
function invoiceParseDate(v){
  if(typeof parseDate==='function') return parseDate(v);
  if(!v)return null;
  if(v instanceof Date&&!isNaN(v))return v;
  let d=new Date(v);return isNaN(d)?null:d;
}
function invoiceMonthKey(d){
  if(typeof monthKey==='function') return monthKey(d);
  const months=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  return d?months[d.getMonth()]+' '+d.getFullYear():'TARİHSİZ';
}

function getGiderPusulasiKdvTotal(){
  return (giderPusulasiKdv20||0)+(giderPusulasiKdv10||0)+(giderPusulasiKdv1||0);
}
function getGiderPusulasiMatrah(){
  return Math.max((giderPusulasiAmount||0)-getGiderPusulasiKdvTotal(),0);
}
function saveGiderPusulasiAmount(){
  const amountInput=document.getElementById('giderPusulasiAmount');
  const kdv20Input=document.getElementById('giderPusulasiKdv20');
  const kdv10Input=document.getElementById('giderPusulasiKdv10');
  const kdv1Input=document.getElementById('giderPusulasiKdv1');
  giderPusulasiAmount=invoiceNumber(amountInput?amountInput.value:0);
  giderPusulasiKdv20=invoiceNumber(kdv20Input?kdv20Input.value:0);
  giderPusulasiKdv10=invoiceNumber(kdv10Input?kdv10Input.value:0);
  giderPusulasiKdv1=invoiceNumber(kdv1Input?kdv1Input.value:0);
  localStorage.setItem('invoiceGiderPusulasiAmount',String(giderPusulasiAmount));
  localStorage.setItem('invoiceGiderPusulasiKdv20',String(giderPusulasiKdv20));
  localStorage.setItem('invoiceGiderPusulasiKdv10',String(giderPusulasiKdv10));
  localStorage.setItem('invoiceGiderPusulasiKdv1',String(giderPusulasiKdv1));
  renderGiderPusulasiAmount();
  if(document.getElementById('invoiceAnalysisResults') && document.getElementById('invoiceAnalysisResults').style.display!=='none') renderInvoiceProfitResults();
}
function renderGiderPusulasiAmount(){
  const saved=document.getElementById('savedGiderPusulasiAmount');
  const amountInput=document.getElementById('giderPusulasiAmount');
  const kdv20Input=document.getElementById('giderPusulasiKdv20');
  const kdv10Input=document.getElementById('giderPusulasiKdv10');
  const kdv1Input=document.getElementById('giderPusulasiKdv1');
  if(saved) saved.textContent=invoiceFormatTL(giderPusulasiAmount);
  if(amountInput) amountInput.value=giderPusulasiAmount?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(giderPusulasiAmount):'';
  if(kdv20Input) kdv20Input.value=giderPusulasiKdv20?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(giderPusulasiKdv20):'';
  if(kdv10Input) kdv10Input.value=giderPusulasiKdv10?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(giderPusulasiKdv10):'';
  if(kdv1Input) kdv1Input.value=giderPusulasiKdv1?new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(giderPusulasiKdv1):'';
  invoiceSetText('giderPusulasiSummaryTotal',invoiceFormatTL(giderPusulasiAmount));
  invoiceSetText('giderPusulasiKdv20Summary',invoiceFormatTL(giderPusulasiKdv20));
  invoiceSetText('giderPusulasiKdv10Summary',invoiceFormatTL(giderPusulasiKdv10));
  invoiceSetText('giderPusulasiKdv1Summary',invoiceFormatTL(giderPusulasiKdv1));
  invoiceSetText('giderPusulasiKdvTotalSummary',invoiceFormatTL(getGiderPusulasiKdvTotal()));
  invoiceSetText('giderPusulasiMatrahSummary',invoiceFormatTL(getGiderPusulasiMatrah()));
}
async function analyzeInvoiceProfit(){
  const purchaseFiles=[...document.getElementById('purchaseInvoiceFiles').files];
  const salesFiles=[...document.getElementById('salesInvoiceFiles').files];
  const expenseFiles=[...document.getElementById('expenseReceiptFiles').files];
  const status=document.getElementById('invoiceAnalysisStatus');
  const btn=document.getElementById('downloadInvoiceProfitBtn');
  invoiceLoadYearlyMemory();
  invoiceMonthlySummary=[]; skippedInvoiceSummaryRows=0;
  invoiceCurrentPurchaseRows=[]; invoiceCurrentSalesRows=[]; invoiceCurrentExpenseRows=[]; invoiceCurrentExcludedRows=[]; invoiceCurrentReturnRows=[]; invoiceCurrentTevkifatRows=[]; invoiceCurrentIstisnaRows=[]; invoiceCurrentAnalysisActive=false;
  btn.disabled=true;
  document.getElementById('invoiceAnalysisResults').style.display='none';
  saveInvoiceCommissions();
  saveInvoiceProfitExpenses();

  const hasExisting=invoicePurchaseRows.length||invoiceSalesRows.length||invoiceExpenseRows.length||invoiceExcludedRows.length;
  if(!purchaseFiles.length && !salesFiles.length && !expenseFiles.length && !giderPusulasiAmount && !hasExisting){
    status.textContent='Önce alış, satış, masraf fişi yükle veya gider pusulası tutarı gir.';
    return;
  }

  status.textContent='Fatura dosyaları okunuyor... Yüklü eski aylar korunacak, yeni dosyalar yıllık hafızaya eklenecek.';
  try{
    let addedPurchase=0, addedSales=0, addedExpense=0;
    for(const file of purchaseFiles){
      removeInvoiceRowsBySource('Alış',file.name);
      const rows=await parseInvoiceExcelFile(file,'Alış');
      invoicePurchaseRows.push(...rows);
      invoiceCurrentPurchaseRows.push(...rows);
      addedPurchase+=rows.length;
    }
    for(const file of salesFiles){
      removeInvoiceRowsBySource('Satış',file.name);
      const rows=await parseInvoiceExcelFile(file,'Satış');
      invoiceSalesRows.push(...rows);
      invoiceCurrentSalesRows.push(...rows);
      addedSales+=rows.length;
    }
    for(const file of expenseFiles){
      removeInvoiceRowsBySource('Masraf Fişi',file.name);
      const rows=await parseInvoiceExcelFile(file,'Masraf Fişi');
      invoiceExpenseRows.push(...rows);
      invoiceCurrentExpenseRows.push(...rows);
      addedExpense+=rows.length;
    }
    const currentSources=new Set([...purchaseFiles,...salesFiles,...expenseFiles].map(f=>f.name));
    invoiceCurrentExcludedRows=invoiceExcludedRows.filter(r=>currentSources.has(r.kaynak));
    invoiceCurrentReturnRows=invoiceReturnRows.filter(r=>currentSources.has(r.kaynak));
    invoiceCurrentTevkifatRows=invoiceTevkifatRows.filter(r=>currentSources.has(r.kaynak));
    invoiceCurrentIstisnaRows=invoiceIstisnaRows.filter(r=>currentSources.has(r.kaynak));
    invoiceDetailViewMode=(currentSources.size>0)?'current':'all';
    invoiceCurrentAnalysisActive=(currentSources.size>0);
    invoiceSaveYearlyMemory();
    renderInvoiceProfitResults();
    btn.disabled=false;
    const months=[...new Set([...invoicePurchaseRows,...invoiceSalesRows,...invoiceExpenseRows].map(r=>r.ay).filter(Boolean))].sort((a,b)=>invoiceMonthIndexFromAy(a)-invoiceMonthIndexFromAy(b));
    status.innerHTML=`Bu analizde <strong>${addedPurchase}</strong> alış, <strong>${addedSales}</strong> satış, <strong>${addedExpense}</strong> masraf satırı eklendi/güncellendi. Yıllık hafızada toplam <strong>${invoicePurchaseRows.length}</strong> alış, <strong>${invoiceSalesRows.length}</strong> satış, <strong>${invoiceExpenseRows.length}</strong> masraf satırı var. Dönemler: <strong>${months.join(', ')||'-'}</strong>. Dosya adındaki ay esas alındı.`;
  }catch(e){
    console.error(e);
    status.textContent='Fatura analizi sırasında hata oluştu: '+e.message;
  }
}
async function parseInvoiceExcelFile(file,type){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array',cellDates:true,raw:true});
  const accountingAy=invoiceAccountingMonthFromFileName(file.name);
  let out=[];

  function findBestAmountColumn(headers){
    // Öncelik: Kullanıcının Excel'indeki "Tutar" artık KDV dahil fatura tutarı kabul edilir.
    const preferred=[
      'KDV Dahil Tutar','Kdv Dahil Tutar','Fatura Tutarı','Fatura Tutari','Tutar','Toplam Tutar',
      'Vergiler Dahil Toplam Tutar','Ödenecek Tutar','Odenecek Tutar','Genel Toplam','Fatura Toplamı','Fatura Toplami','Toplam'
    ];
    return invoiceFindColumn(headers,preferred);
  }

  function findMatrahColumn(headers){
    return invoiceFindColumn(headers,['Matrah','KDV Matrahı','Kdv Matrahi','Vergi Hariç Tutar','Vergi Haric Tutar','Mal Hizmet Tutarı','Mal Hizmet Tutari','Mal Hizmet Toplam Tutarı']);
  }

  function invoiceFindColumnExcluding(headers,candidates,excludeRegex){
    const normalized=headers.map(invoiceNormalizeHeader);
    for(const c of candidates){
      const needle=invoiceNormalizeHeader(c);
      let idx=normalized.findIndex(h=>h===needle && !excludeRegex.test(h));
      if(idx>=0) return headers[idx];
    }
    for(const c of candidates){
      const needle=invoiceNormalizeHeader(c);
      let idx=normalized.findIndex(h=>(h.includes(needle) || (needle.length>=5 && needle.includes(h))) && !excludeRegex.test(h));
      if(idx>=0) return headers[idx];
    }
    return null;
  }

  function findVatRateColumn(headers){
    // Sadece gerçekten oran belirten kolonlar. Genel "Oran" gibi gevşek eşleşme kaldırıldı.
    return invoiceFindColumnExcluding(headers,['KDV Oranı','Kdv Orani','KDV Oran','Kdv Oran','Vergi Oranı','Vergi Orani','KDV %','Kdv %','KDV Yüzdesi','Kdv Yuzdesi'],/TUTAR|MATRAH|TOPLAM|BEDEL/);
  }

  function findVatAmountColumn(headers){
    // KDV Oranı kolonunu yanlışlıkla KDV tutarı diye okumamak için ORAN/YÜZDE içeren başlıkları dışla.
    return invoiceFindColumnExcluding(headers,['KDV Tutarı','Kdv Tutari','Hesaplanan KDV','Hesaplanan Kdv','KDV','Vergi Tutarı','Vergi Tutari'],/ORAN|YUZDE|YUZDESI|%/);
  }

  function detectMasrafVatRateFromHeader(header){
    // Masraf fişlerinde KDV oranı açıklamada değil, KDV tutarının bulunduğu kolon başlığındadır.
    // ÖMAS masraf fişi formatı:
    //   0,01 / 0.01  => %1 KDV
    //   0,1  / 0.1   => %10 KDV
    //   0,2  / 0.2   => %20 KDV
    // Ayrıca eski tip %1 / %10 / %20 başlıklarını da destekler.
    const text=String(header ?? '').trim();
    const raw=text.toLocaleUpperCase('tr-TR');
    const norm=invoiceNormalizeHeader(text);

    // Önce ondalık başlık formatını yakala. Örn: "0.01", "0,1", "KDV ORANI 0.2"
    const decimalMatches=text.replace(/,/g,'.').match(/(?:^|[^0-9])(0?\.\d+)(?:[^0-9]|$)/g) || [];
    for(const m of decimalMatches){
      const val=parseFloat(m.replace(/[^0-9.]/g,''));
      if(Math.abs(val-0.01)<0.000001) return 1;
      if(Math.abs(val-0.10)<0.000001) return 10;
      if(Math.abs(val-0.20)<0.000001) return 20;
    }

    // Başlık tamamen numeric geldiyse. XLSX bazen header'ı number olarak verir.
    const direct=parseFloat(text.replace(',','.'));
    if(!isNaN(direct)){
      if(Math.abs(direct-0.01)<0.000001) return 1;
      if(Math.abs(direct-0.10)<0.000001) return 10;
      if(Math.abs(direct-0.20)<0.000001) return 20;
      if(Math.abs(direct-1)<0.000001) return 1;
      if(Math.abs(direct-10)<0.000001) return 10;
      if(Math.abs(direct-20)<0.000001) return 20;
    }

    if(!/KDV|%|ORAN|1|10|20/.test(norm)) return 0;
    if(/ORAN|YUZDE|YÜZDE/.test(norm) && !/TUTAR|KDV|0[,.]?0?1|0[,.]?1|0[,.]?2/.test(norm)) return 0;
    if(/(^|[^0-9])20(?:[,.]0+)?([^0-9]|$)/.test(raw) || /(^|[^0-9])20(?:[,.]0+)?([^0-9]|$)/.test(norm)) return 20;
    if(/(^|[^0-9])10(?:[,.]0+)?([^0-9]|$)/.test(raw) || /(^|[^0-9])10(?:[,.]0+)?([^0-9]|$)/.test(norm)) return 10;
    if(/(^|[^0-9])1(?:[,.]0+)?([^0-9]|$)/.test(raw) || /(^|[^0-9])1(?:[,.]0+)?([^0-9]|$)/.test(norm)) return 1;
    return 0;
  }

  function findMasrafVatAmountColumns(headers, aoa, headerRowIndex){
    const prev=(headerRowIndex>0 && aoa[headerRowIndex-1]) ? aoa[headerRowIndex-1] : [];
    return headers
      .map((h,i)=>{
        const combined=[prev[i], h].filter(v=>String(v||'').trim()).join(' ');
        return {header:h, idx:i, rate:detectMasrafVatRateFromHeader(combined || h), combinedHeader:combined};
      })
      .filter(x=>[1,10,20].includes(x.rate));
  }


  function findInvoiceVatAmountColumns(headers, aoa, headerRowIndex){
    // Alış/Satış faturalarında KDV tutarları bazen ayrı kolonlarda gelir:
    // K.D.V. (%20), K.D.V. (%10), K.D.V. (%1)
    // Bu kolonları birebir okuyup aynı fatura satırında ayrı KDV alanları olarak tutuyoruz.
    const prev=(headerRowIndex>0 && aoa[headerRowIndex-1]) ? aoa[headerRowIndex-1] : [];
    return headers
      .map((h,i)=>{
        const combined=[prev[i], h].filter(v=>String(v||'').trim()).join(' ');
        const rate=detectMasrafVatRateFromHeader(combined || h);
        const norm=invoiceNormalizeHeader(combined || h);
        const isVatAmount=/KDV|KDVSI|KDV20|KDV10|KDV1/.test(norm) && !/ORAN|YUZDE|YUZDESI/.test(norm);
        return {header:h, idx:i, rate, combinedHeader:combined, isVatAmount};
      })
      .filter(x=>[1,10,20].includes(x.rate) && x.isVatAmount);
  }

  function buildVatSplitFromColumns(arr, vatCols, kdvDahil){
    const split={};
    (vatCols||[]).forEach(c=>{
      const val=invoiceNumber(arr[c.idx]);
      if(val>0){
        const rate=invoiceCleanVatRate(c.rate);
        const key=String(rate);
        if(!split[key]) split[key]={rate, kdv:0, matrah:0, toplam:0, sourceHeaders:[]};
        split[key].kdv += val;
        split[key].sourceHeaders.push(c.combinedHeader||c.header);
      }
    });

    const detected=Object.values(split);
    if(!detected.length) return {hasSplit:false, split:{}, kdvTotal:0, matrahTotal:0, rate:0, note:''};

    const kdvTotal=detected.reduce((s,x)=>s+x.kdv,0);
    let matrahTotal=0;
    detected.forEach(x=>{
      x.matrah = x.rate ? x.kdv/(x.rate/100) : 0;
      x.toplam = x.matrah + x.kdv;
      matrahTotal += x.matrah;
    });

    // KDV dahil toplam varsa asıl toplam dosyadaki Fatura Tutarı kolonudur.
    // KDV kolonlarından matrahı kdv/oran diye üretmek özellikle GİB listelerinde fark oluşturuyor.
    // Bu yüzden tek oranlı satırda matrah = KDV Dahil Tutar - KDV olarak yazılır.
    const matrahFromTotal=kdvDahil ? Math.max(kdvDahil-kdvTotal,0) : 0;
    if(matrahFromTotal>0){
      matrahTotal=matrahFromTotal;
      if(detected.length===1){
        detected[0].matrah=matrahFromTotal;
        detected[0].toplam=kdvDahil;
      }
    }

    const rates=detected.map(x=>x.rate).filter(Boolean);
    const rate=rates.length===1 ? rates[0] : 0;
    const splitObj={};
    detected.forEach(x=>{ splitObj[String(x.rate)]={rate:x.rate,kdv:x.kdv,matrah:x.matrah,toplam:x.toplam}; });
    return {
      hasSplit:true,
      split:splitObj,
      kdvTotal,
      matrahTotal,
      rate,
      note: rates.length>1 ? 'Aynı fatura satırında birden fazla KDV oranı okundu.' : 'KDV oranı ayrı KDV kolonundan okundu.'
    };
  }

  function findMasrafHeaderRow(aoa){
    for(let i=0;i<Math.min(30,aoa.length);i++){
      const row=aoa[i]||[];
      const text=row.map(invoiceNormalizeHeader).join(' ');
      const hasMasraf=/MASRAFKALEMI|MASRAF KALEMI|GIDERKALEMI|GIDER KALEMI/.test(text);
      const hasVatRate=row.some(v=>[1,10,20].includes(detectMasrafVatRateFromHeader(v)));
      const hasTotal=/KDVDAHILTUTAR|KDV DAHIL TUTAR|TOPLAM/.test(text);
      if(hasMasraf && (hasVatRate || hasTotal)) return i;
    }
    return -1;
  }

  function findMasrafKalemiIndex(headers){
    const idx=headers.findIndex(h=>/MASRAFKALEMI|MASRAF KALEMI|GIDERKALEMI|GIDER KALEMI/.test(invoiceNormalizeHeader(h)));
    if(idx>=0) return idx;
    // ÖMAS OCAK 2026 formatında ana sayfada masraf kalemi D sütunundadır.
    return 3;
  }

  function isMasrafTotalOrSummaryRow(arr, idx, masrafKalemi){
    const rowText=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    const kalem=invoiceNormalizeHeader(masrafKalemi||'');
    if(!kalem) return true;
    if(/^(TOPLAM|ARATOPLAM|GENELTOPLAM|KDV|INDIRILECEKKDV|INDIRILECEK|MATRAH|KDVDENKALAN|ACIKLAMA)$/.test(kalem)) return true;
    if(/TOPLAM|ARATOPLAM|GENELTOPLAM|INDIRILECEKKDV|KDVTOPLAMI|MATRAHTOPLAMI|ODENECEKTUTAR/.test(kalem)) return true;
    if(rowText && /GENELTOPLAM|ARATOPLAM|TOPLAMKDV|KDVTOPLAMI|MATRAHTOPLAMI|INDIRILECEKKDV|ODENECEKTUTAR/.test(rowText)) return true;
    return false;
  }

  function isVehicleExpenseCategory(name){
    const n=invoiceNormalizeHeader(name||'');

    // Araçla alakalı tüm masraf kalemlerinde indirilecek KDV %70 alınır.
    // Örnekler:
    // - ARAÇ MASRAFI
    // - OTOPARK ÖDEMELERİ
    // - YAKIT / AKARYAKIT
    // - OTOYOL / HGS / OGS / KÖPRÜ
    // - SERVİS / BAKIM / ONARIM
    // - LASTİK / MUAYENE / KASKO / SİGORTA
    return /ARAC|ARABA|OTO|OTOPARK|PARK|YAKIT|AKARYAKIT|BENZIN|MOTORIN|PETROL|HGS|OGS|OTOYOL|KOPRU|KÖPRÜ|TUNEL|TÜNEL|SERVIS|SERVİS|BAKIM|ONARIM|LASTIK|LASTİK|MUAYENE|KASKO|SIGORTA|SİGORTA|MTV/.test(n);
  }

  function isBeyanEdilmeyecekInvoiceRow(arr){
    const text=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    return /BEYANEDILMEYECEK|BEYANEDILMEYECEKFATURA|BEYANEDILMEYECEKFATURALAR|BEYANADAHILEDILMEYECEK|BEYANNAMEDAHILEDILMEYECEK/.test(text);
  }

  function isBeyanEdilecekSectionStart(arr){
    const text=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    return /BEYANEDILECEK|BEYANEDILECEKFATURA|BEYANEDILECEKFATURALAR|BEYANADAHILEDILECEK|NORMALFATURALAR|SATISFATURALARI|ALISFATURALARI/.test(text)
      && !/BEYANEDILMEYECEK/.test(text);
  }

  function isRejectedInvoiceSectionStart(arr){
    const text=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    return /REDDEDILENFATURALAR|REDDEDILENFATURA|REDEDILENFATURALAR|REDEDILENFATURA|REDFATURALAR|REDFATURA/.test(text);
  }

  function isInvoiceSectionHeader(arr){
    const text=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    // Bu başlıklar yeni bir bölüm başlatır; önceki "reddedilen" bölümünü kapatır.
    return /ALISIADELERI|SATISIADELERI|IADEFATURASI|IADEFATURA|IADEFATURALARI|IADEFATURALAR|ISTISNAFATURASI|ISTISNAFATURA|ISTISNAFATURALARI|ISTISNAFATURALAR|TEVKIFATFATURASI|TEVKIFATFATURA|TEVKIFATFATURALARI|TEVKIFATFATURALAR|ALISFATURALARI|SATISFATURALARI|NORMALFATURALAR|BEYANEDILECEKFATURALAR/.test(text)
      && !/REDDEDILEN|REDEDILEN/.test(text);
  }

  function isOnlySectionHeaderRow(arr){
    const text=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    if(!text) return false;
    const hasMoney=(arr||[]).some(v=>invoiceNumber(v)>0);
    return !hasMoney && (isRejectedInvoiceSectionStart(arr) || isInvoiceSectionHeader(arr));
  }

  function isReturnInvoiceRow(arr, idx){
    const typeText=idx.invoiceType>=0 ? invoiceNormalizeHeader(arr[idx.invoiceType]) : '';
    const rowText=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    // İADE faturalar hesaplamaya dahildir; sadece ayrıca listelenir.
    return /IADE|İADE|IADEFATURA|IADEFATURASI|SATISIADE|SATIŞIADE/.test(typeText) ||
           /IADE|İADE|IADEFATURA|IADEFATURASI|SATISIADE|SATIŞIADE/.test(rowText);
  }

  function isCancelledSalesInvoiceRow(arr, idx){
    if(type!=='Satış') return false;
    const typeText=idx.invoiceType>=0 ? invoiceNormalizeHeader(arr[idx.invoiceType]) : '';
    const statusText=idx.status>=0 ? invoiceNormalizeHeader(arr[idx.status]) : '';
    const rowText=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
    // Öncelik fatura tipi ve durum kolonlarıdır.
    // IPTAL / İPTAL geçen satış faturaları hesaplamaya dahil edilmez.
    return /IPTAL|IPTALFATURA|FATURAIPTAL/.test(typeText) ||
           /IPTAL|IPTALFATURA|FATURAIPTAL/.test(statusText) ||
           /\bIPTAL\b|İPTAL|IPTALFATURA|FATURAIPTAL/.test(rowText);
  }

  function adjustedExpenseVat(kdv, masrafKalemi){
    const raw=Math.abs(Number(kdv)||0);
    if(!raw) return {kdv:0, note:''};
    if(isVehicleExpenseCategory(masrafKalemi)){
      return {kdv:raw*0.70, note:' Araç masrafı olduğu için indirilecek KDV %70 olarak alındı.'};
    }
    return {kdv:raw, note:''};
  }

  const sheetNamesToRead = type==='Masraf Fişi' ? wb.SheetNames.slice(0,1) : wb.SheetNames;
  for(const sname of sheetNamesToRead){
    const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sname],{header:1,defval:'',raw:true});
    if(!aoa.length) continue;
    let headerRowIndex=-1;
    if(type==='Masraf Fişi'){
      headerRowIndex=findMasrafHeaderRow(aoa);
    }
    if(headerRowIndex<0){
      for(let i=0;i<Math.min(25,aoa.length);i++){
        const text=aoa[i].map(invoiceNormalizeHeader).join(' ');
        const hasAmount=/TUTAR|TOPLAM|KDV|MATRAH|FIYAT|BEDEL/.test(text);
        const hasName=/FIRMA|CARI|UNVAN|MUSTERI|TEDARIKCI|ACIKLAMA|MALHIZMET|URUN|FATURA/.test(text);
        if(hasAmount && hasName){headerRowIndex=i;break;}
      }
    }
    if(headerRowIndex<0) headerRowIndex=0;
    const headers=aoa[headerRowIndex].map((h,i)=>String(h||'KOLON_'+i).trim()||('KOLON_'+i));
    const rows=aoa.slice(headerRowIndex+1);
    const dateCol=invoiceFindColumn(headers,['Fatura Tarihi','Tarih','Belge Tarihi','Düzenleme Tarihi','Issue Date']);
    const invoiceNoCol=invoiceFindColumn(headers,['Fatura No','Fatura Numarası','Belge No','Ettn','Invoice No']);
    const firmCol=invoiceFindColumn(headers,['Firma','Firma Ünvanı','Firma Unvani','Cari','Cari Ünvan','Unvan','Ünvan','Müşteri','Tedarikçi','Alıcı','Satıcı','Vkn Tckn']);
    const descCol=invoiceFindColumn(headers,['Mal Hizmet','Açıklama','Açıklama','Ürün','Urun','Stok Adı','Hizmet']);
    const invoiceTypeCol=invoiceFindColumn(headers,['Fatura Tipi','Fatura Türü','Fatura Turu','Tip','Belge Tipi']);
    const scenarioCol=invoiceFindColumn(headers,['Fatura Senaryosu','Senaryo','Fatura Senaryo']);
    const statusCol=invoiceFindColumn(headers,['Statü','Statu','Durum','Fatura Durumu']);
    const totalCol=findBestAmountColumn(headers);
    const matrahCol=findMatrahColumn(headers);
    const vatRateCol=findVatRateColumn(headers);
    const vatCol=findVatAmountColumn(headers);
    const getIdx=(c)=>headers.indexOf(c);
    const idx={date:getIdx(dateCol),invoice:getIdx(invoiceNoCol),firm:getIdx(firmCol),desc:getIdx(descCol),invoiceType:getIdx(invoiceTypeCol),scenario:getIdx(scenarioCol),status:getIdx(statusCol),net:getIdx(matrahCol),vat:getIdx(vatCol),total:getIdx(totalCol),vatRate:getIdx(vatRateCol)};
    const masrafVatCols = type==='Masraf Fişi' ? findMasrafVatAmountColumns(headers, aoa, headerRowIndex) : [];
    const invoiceVatCols = (type==='Alış' || type==='Satış') ? findInvoiceVatAmountColumns(headers, aoa, headerRowIndex) : [];
    const masrafKalemiIdx = type==='Masraf Fişi' ? findMasrafKalemiIndex(headers) : -1;

    // Alış/Satış dosyalarında "Beyan edilmeyecek faturalar" bir bölüm başlığıysa,
    // o başlığın ALTINDAKİ tüm fatura satırları hesaplamaya dahil edilmez.
    let beyanEdilmeyecekSection=false;
    let rejectedInvoiceSection=false;
    let invoiceSpecialSection='';

    function pushExcludedInvoiceRow(arr, ri, reason){
      const d0=invoiceParseDate(idx.date>=0?arr[idx.date]:'');
      const faturaNo0=idx.invoice>=0?String(arr[idx.invoice]||'').trim():'';
      const firma0=idx.firm>=0?String(arr[idx.firm]||'').trim():'';
      const aciklama0=idx.desc>=0?String(arr[idx.desc]||'').trim():'';
      const total0=idx.total>=0?invoiceNumber(arr[idx.total]):0;
      const matrah0=idx.net>=0?invoiceNumber(arr[idx.net]):0;
      const kdv0=idx.vat>=0?invoiceNumber(arr[idx.vat]):0;
      const hasUsefulData=!!(d0 || faturaNo0 || firma0 || aciklama0 || total0 || matrah0 || kdv0);
      if(!hasUsefulData) return false;
      invoiceExcludedRows.push({
        beyanHaric:true,
        tur:type,
        kaynak:file.name,
        sayfa:sname,
        tarih:d0?d0.toLocaleDateString('tr-TR'):'',
        ay:accountingAy,
        faturaNo:faturaNo0,
        firma:firma0,
        aciklama:açıklama0 || 'Beyan edilmeyecek faturalar',
        matrah:matrah0,
        kdv:kdv0,
        toplam:total0,
        sebep:reason || 'Beyan edilmeyecek faturalar bölümünde olduğu için hesaplamaya dahil edilmedi.'
      });
      return true;
    }

    rows.forEach((arr,ri)=>{
      const rowHasBeyanIbaresı=(type==='Alış' || type==='Satış') && isBeyanEdilmeyecekInvoiceRow(arr);
      const rowStartsNormalSection=(type==='Alış' || type==='Satış') && isBeyanEdilecekSectionStart(arr);
      const rowStartsRejectedSection=(type==='Alış' || type==='Satış') && isRejectedInvoiceSectionStart(arr);
      const rowStartsAnyKnownSection=(type==='Alış' || type==='Satış') && isInvoiceSectionHeader(arr);

      // V95 KRİTİK BÖLÜM TAKİBİ:
      // "REDDEDİLEN FATURALAR" başlığı açıldıktan sonra, bir sonraki bölüm başlığına kadar
      // altındaki tüm faturalar hesap dışı kalır. Satır tipi SATIS olsa bile dahil edilmez.
      if(rowStartsRejectedSection){
        rejectedInvoiceSection=true;
        beyanEdilmeyecekSection=false;
        skippedInvoiceSummaryRows++;
        return;
      }

      if(rowStartsAnyKnownSection){
        rejectedInvoiceSection=false;
        beyanEdilmeyecekSection=false;
        const sectionText=invoiceNormalizeHeader((arr||[]).map(x=>String(x||'')).join(' '));
        if(/TEVKIFAT/.test(sectionText)) invoiceSpecialSection='Tevkifat';
        else if(/ISTISNA/.test(sectionText)) invoiceSpecialSection='İstisna';
        else if(/IADE/.test(sectionText)) invoiceSpecialSection='İade';
        else invoiceSpecialSection='';
        skippedInvoiceSummaryRows++;
        return;
      }

      if(rejectedInvoiceSection){
        if(pushExcludedInvoiceRow(arr,ri,'Reddedilen faturalar bölümünde olduğu için hesaplamaya dahil edilmedi.')) skippedInvoiceSummaryRows++;
        return;
      }

      if(rowStartsNormalSection){
        beyanEdilmeyecekSection=false;
        invoiceSpecialSection='';
        skippedInvoiceSummaryRows++;
        return;
      }

      if(rowHasBeyanIbaresı){
        beyanEdilmeyecekSection=true;
        if(pushExcludedInvoiceRow(arr,ri,'Beyan edilmeyecek faturalar ibaresi bulunduğu için hesaplamaya dahil edilmedi.')) skippedInvoiceSummaryRows++;
        return;
      }

      if(isOnlySectionHeaderRow(arr)){skippedInvoiceSummaryRows++;return;}
      if(invoiceIsTotalSummaryRow(arr,idx)){skippedInvoiceSummaryRows++;return;}

      if((type==='Alış' || type==='Satış') && beyanEdilmeyecekSection){
        if(pushExcludedInvoiceRow(arr,ri,'Beyan edilmeyecek faturalar bölümünde olduğu için hesaplamaya dahil edilmedi.')) skippedInvoiceSummaryRows++;
        return;
      }

      if(type==='Satış' && isCancelledSalesInvoiceRow(arr,idx)){
        if(pushExcludedInvoiceRow(arr,ri,'İptal satış faturası olduğu için hesaplamaya dahil edilmedi.')) skippedInvoiceSummaryRows++;
        return;
      }

      const isReturnInvoice=(type==='Alış' || type==='Satış') && (invoiceSpecialSection==='İade' || isReturnInvoiceRow(arr,idx));

      const d=invoiceParseDate(idx.date>=0?arr[idx.date]:'');
      const faturaNo=idx.invoice>=0?String(arr[idx.invoice]||'').trim():'';
      const firma=idx.firm>=0?String(arr[idx.firm]||'').trim():'';
      const aciklama=idx.desc>=0?String(arr[idx.desc]||'').trim():'';
      const faturaTipiRaw=idx.invoiceType>=0?String(arr[idx.invoiceType]||'').trim():'';
      const faturaSenaryo=idx.scenario>=0?String(arr[idx.scenario]||'').trim():'';
      const faturaDurumu=idx.status>=0?String(arr[idx.status]||'').trim():'';
      let faturaAltTipi=detectInvoiceReviewGroup([faturaTipiRaw,faturaSenaryo,faturaDurumu,aciklama,faturaNo,(arr||[]).join(' ')]);
      if(faturaAltTipi==='Normal' && invoiceSpecialSection) faturaAltTipi=invoiceSpecialSection;

      // MASRAF FİŞİ KURALI: Masraf kalemi ayrı, KDV oran kolonları ayrıdır.
      // Ana formatta masraf kalemi D sütunundadır; eğer başlıkta "Masraf Kalemi" varsa başlığın bulunduğu kolon esas alınır.
      const masrafKalemi=type==='Masraf Fişi'?String(arr[masrafKalemiIdx]||'').trim():'';

      // Masraf fişlerinde sadece 1. sayfanın gerçek kalem satırları alınır.
      // Masraf kalemi boşsa, tarih yoksa veya TOPLAM / ARA TOPLAM / KDV TOPLAMI gibi özet satırıysa hesaba katılmaz.
      if(type==='Masraf Fişi'){
        const dForMasraf=invoiceParseDate(idx.date>=0?arr[idx.date]:'');
        if(!dForMasraf || isMasrafTotalOrSummaryRow(arr,idx,masrafKalemi)){ skippedInvoiceSummaryRows++; return; }
      }

      let kdvDahil=idx.total>=0?invoiceNumber(arr[idx.total]):0;
      let matrah=idx.net>=0?invoiceNumber(arr[idx.net]):0;
      let kdv=idx.vat>=0?invoiceNumber(arr[idx.vat]):0;
      let kdvOrani=idx.vatRate>=0?invoiceRateNumber(arr[idx.vatRate]):0;
      let kdvDagilim={};
      let kdvKolonNotu='';

      // Alış/Satışta dosyadaki K.D.V. (%20), K.D.V. (%10), K.D.V. (%1) kolonlarını birebir oku.
      // Tek satırda birden fazla KDV oranı varsa satırı bölmeden, aynı fatura satırında ayrı ayrı sakla.
      if((type==='Alış' || type==='Satış') && invoiceVatCols.length){
        const splitInfo=buildVatSplitFromColumns(arr, invoiceVatCols, kdvDahil);
        if(splitInfo.hasSplit){
          kdvDagilim=splitInfo.split;
          kdv=splitInfo.kdvTotal;
          matrah=matrah || splitInfo.matrahTotal;
          if(!kdvDahil) kdvDahil=matrah+kdv;
          kdvOrani=splitInfo.rate; // tek oran varsa oranı yaz; birden fazla oran varsa detay kolonlarında gösterilecek.
          kdvKolonNotu=splitInfo.note;
        }
      }

      if((type==='Alış' || type==='Satış') && faturaAltTipi==='İstisna'){
        const istisnaObj={
          beyanHaric:true,
          tur:type,
          kaynak:file.name,
          sayfa:sname,
          tarih:d?d.toLocaleDateString('tr-TR'):'',
          ay:accountingAy,
          faturaNo,
          firma,
          aciklama:açıklama || 'İstisna faturası',
          matrah:matrah||0,
          kdv:kdv||0,
          toplam:kdvDahil||0,
          sebep:'İstisna faturası olduğu için hesaplamaya dahil edilmedi.'
        };
        invoiceIstisnaRows.push(istisnaObj);
        invoiceExcludedRows.push(istisnaObj);
        skippedInvoiceSummaryRows++;
        return;
      }

      let kontrolNotu=kdvKolonNotu||'';

      if(type==='Masraf Fişi' && masrafVatCols.length){
        const detected=masrafVatCols
          .map(c=>({rate:c.rate,kdv:invoiceNumber(arr[c.idx]),header:c.combinedHeader||c.header}))
          .filter(x=>Math.abs(x.kdv)>0.000001);

        if(detected.length){
          const hasSingleRate=detected.length===1;

          detected.forEach((item)=>{
            const adjusted=adjustedExpenseVat(item.kdv,masrafKalemi);
            const rowKdv=Math.abs(adjusted.kdv);
            const originalRowKdv=Math.abs(item.kdv);
            const rowRate=item.rate;
            let rowMatrah=0;
            let rowTotal=0;
            let rowNote=`KDV oranı ${escapeForNote(item.header)} kolonundan okundu.`+adjusted.note;

            if(hasSingleRate && kdvDahil){
              rowTotal=kdvDahil;
              rowMatrah=Math.max(rowTotal-originalRowKdv,0);
            }else{
              rowMatrah=rowRate ? originalRowKdv/(rowRate/100) : 0;
              rowTotal=rowMatrah+originalRowKdv;
              if(kdvDahil && detected.length>1){
                rowNote += ' Aynı satırda birden fazla KDV oranı olduğu için satır oranlara bölündü.';
              }
            }

            out.push({
              tur:type,
              faturaAltTipi,
              faturaTipiRaw,
              faturaSenaryo,
              faturaDurumu,
              kaynak:file.name,
              sayfa:sname,
              tarih:d?d.toLocaleDateString('tr-TR'):'',
              ay:accountingAy,
              faturaNo,
              firma,
              açıklama,
              masrafKalemi,
              kdvOrani:rowRate,
              net:rowMatrah,
              matrah:rowMatrah,
              kdv:rowKdv,
              toplam:rowTotal,
              kontrolNotu:rowNote,
              satir:ri+1
            });
          });
          return;
        }
      }

      // KDV oranı dosyada ne yazıyorsa onu okur. %20 dışındaki oranlar ASLA dışlanmaz.
      // Sadece uçuk değerleri (örn. %1000, %1500) geçersiz kabul ederiz; oran uydurmayız.
      kdvOrani=invoiceCleanVatRate(kdvOrani);

      // Dosyada oran yoksa mevcut matrah/KDV/toplam değerlerinden oranı otomatik çıkar.
      // %1 / %10 / %20 ile sınırlı değil; %7, %15 vb. makul oranlar da kendi adıyla raporlanır.
      if(!kdvOrani){
        kdvOrani=invoiceDeriveVatRate({matrah,kdv,kdvDahil});
      }

      if(!kdvOrani && kdv>0){
        kontrolNotu='KDV oranı dosyadan veya matrah/KDV/toplam değerlerinden hesaplanamadı; KDV tutarı hesaba dahil edildi.';
      }

      // TUTAR / TOPLAM alanı KDV DAHİL kabul edilir. Üstüne tekrar KDV eklenmez.
      // KDV oranı yoksa matrah/KDV hesaplaması zorlanmaz; satır kontrol notuyla bırakılır.
      if(kdvDahil){
        if(kdvOrani){
          if(!matrah) matrah=kdvDahil/(1+(kdvOrani/100));
          if(!kdv) kdv=kdvDahil-matrah;
        }else if(matrah && !kdv){
          kdv=Math.max(kdvDahil-matrah,0);
        }
      }else if(matrah){
        if(kdvOrani && !kdv) kdv=matrah*(kdvOrani/100);
        kdvDahil=matrah+kdv;
      }else if(kdv && kdvOrani){
        matrah=kdv/(kdvOrani/100);
        kdvDahil=matrah+kdv;
      }

      if(type==='Masraf Fişi' && kdv){
        const adjusted=adjustedExpenseVat(kdv,masrafKalemi);
        if(adjusted.note){
          kdv=adjusted.kdv;
          kontrolNotu=(kontrolNotu||'')+adjusted.note;
        }
      }

      if(!matrah && !kdv && !kdvDahil) return;

      if(isReturnInvoice && faturaAltTipi==='Normal') faturaAltTipi='İade';

      const rowObj={
        tur:type,
        faturaAltTipi,
        faturaTipiRaw,
        faturaSenaryo,
        faturaDurumu,
        kaynak:file.name,
        sayfa:sname,
        tarih:d?d.toLocaleDateString('tr-TR'):'',
        ay:accountingAy,
        faturaNo,
        firma,
        açıklama,
        masrafKalemi,
        kdvOrani:kdvOrani||0,
        kdvDagilim,
        net:matrah||0,          // Eski alan adı rapor uyumu için duruyor; artık MATRAH anlamında.
        matrah:matrah||0,
        kdv:kdv||0,
        toplam:kdvDahil||0,     // KDV dahil tutar.
        kontrolNotu,
        satir:ri+1
      };
      out.push(rowObj);
      if((type==='Alış' || type==='Satış') && rowObj.faturaAltTipi==='Tevkifat'){
        invoiceTevkifatRows.push({...rowObj, sebep:'Tevkifatlı fatura'});
      }
      if((type==='Alış' || type==='Satış') && rowObj.faturaAltTipi==='İstisna' && !invoiceIstisnaRows.some(x=>x.kaynak===rowObj.kaynak && x.sayfa===rowObj.sayfa && x.satir===rowObj.satir)){
        invoiceIstisnaRows.push({...rowObj, beyanHaric:true, sebep:'İstisna faturası olduğu için hesaplamaya dahil edilmedi.'});
      }
      if(isReturnInvoice){
        invoiceReturnRows.push({...rowObj, sebep:'İade faturası'});
      }
    });
  }
  return out;
}

function invoiceRateNumber(v){
  if(v===null||v===undefined||v==='') return 0;
  let n=0;
  if(typeof v==='number'){
    n=Math.abs(v);
  }else{
    let s=String(v).replace(/%/g,'').replace(/KDV|kdv/gi,'').replace(/\s/g,'').trim();
    if(!s) return 0;

    // Oran alanları para gibi değil, oran gibi okunmalı.
    // Örn: "0,10" => 0.10 => %10, "10" => %10, "%10" => %10.
    if(s.includes(',') && !s.includes('.')) s=s.replace(',', '.');
    else if(s.includes(',') && s.includes('.')){
      // 1.000,00 gibi oran dışı yazımlar için yine para parserına düşmeden sadeleştir.
      if(s.lastIndexOf(',')>s.lastIndexOf('.')) s=s.replace(/\./g,'').replace(',', '.');
      else s=s.replace(/,/g,'');
    }
    n=parseFloat(s);
    if(isNaN(n)) n=invoiceNumber(v);
  }
  return invoiceCleanVatRate(n);
}
function invoiceCleanVatRate(n){
  n=Math.abs(Number(n)||0);
  if(!n) return 0;

  // Excel bazen %10'u 0,10 / 0.10 olarak verir.
  // Bunu %10'a çeviriyoruz. %1 oranı genelde 0.01 veya 1 gelir.
  if(n>0 && n<1) n=n*100;

  // Küçük yuvarlama farklarını bilinen oranlara yuvarla.
  // Bu whitelist değildir; sadece 9,98 => 10 gibi temizlik yapar.
  const known=[1,8,10,18,20];
  for(const k of known){
    if(Math.abs(n-k)<=0.35) return k;
  }

  // Uçuk değerleri oran kabul etmiyoruz. Diğer makul oranlar aynen kabul edilir.
  // Örn: %7, %15, %12 gibi oranlar "Kontrol" değil, kendi oranıyla raporlanır.
  if(n>30) return 0;
  return Number(n.toFixed(2));
}
function invoiceDeriveVatRate({matrah=0,kdv=0,kdvDahil=0}){
  matrah=Number(matrah)||0;
  kdv=Number(kdv)||0;
  kdvDahil=Number(kdvDahil)||0;

  const candidates=[];
  if(matrah>0 && kdv>0) candidates.push(kdv/matrah*100);
  if(kdvDahil>0 && kdv>0 && kdvDahil>kdv) candidates.push(kdv/(kdvDahil-kdv)*100);
  if(kdvDahil>0 && matrah>0 && kdvDahil>matrah) candidates.push((kdvDahil-matrah)/matrah*100);

  for(const c of candidates){
    const r=invoiceCleanVatRate(c);
    if(r) return r;
  }
  return 0;
}
function invoiceGuessVatRate(n){
  // Eski fonksiyon adı rapor kırılımlarında kullanılıyor; artık tüm makul oranları döndürür.
  return invoiceCleanVatRate(n);
}
function invoiceVatRateLabel(rate){
  const r=invoiceCleanVatRate(rate||0);
  return r?'%'+new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(r):'Oran Yok';
}
function invoiceVatRateSummary(rows){
  const rates=[];
  rows.forEach(r=>{
    if(r.kdvDagilim){
      Object.keys(r.kdvDagilim).forEach(k=>{ if(Number(r.kdvDagilim[k].kdv||0)>0) rates.push(invoiceCleanVatRate(k)); });
    }
    const rr=invoiceCleanVatRate(r.kdvOrani||0);
    if(rr) rates.push(rr);
  });
  const uniq=[...new Set(rates.filter(r=>r>0))].sort((a,b)=>a-b);
  return uniq.length?uniq.map(invoiceVatRateLabel).join(' / '):'-';
}

function invoiceRowVatAmount(r, rate){
  const key=String(invoiceCleanVatRate(rate));
  if(r && r.kdvDagilim && r.kdvDagilim[key]) return Number(r.kdvDagilim[key].kdv||0);
  const rowRate=invoiceCleanVatRate(r && r.kdvOrani || 0);
  if(rowRate===invoiceCleanVatRate(rate)) return Number(r && r.kdv || 0);
  return 0;
}
function invoiceRowMatrahForRate(r, rate){
  const key=String(invoiceCleanVatRate(rate));
  if(r && r.kdvDagilim && r.kdvDagilim[key]) return Number(r.kdvDagilim[key].matrah||0);
  const rowRate=invoiceCleanVatRate(r && r.kdvOrani || 0);
  if(rowRate===invoiceCleanVatRate(rate)) return Number((r && (r.matrah||r.net))||0);
  return 0;
}
function invoiceRowVatRateText(r){
  const rates=[];
  if(r && r.kdvDagilim){
    Object.keys(r.kdvDagilim).forEach(k=>{ if(Number(r.kdvDagilim[k].kdv||0)>0) rates.push(invoiceCleanVatRate(k)); });
  }
  const rowRate=invoiceCleanVatRate(r && r.kdvOrani || 0);
  if(rowRate) rates.push(rowRate);
  const uniq=[...new Set(rates.filter(Boolean))].sort((a,b)=>a-b);
  return uniq.length ? uniq.map(invoiceVatRateLabel).join(' + ') : 'Kontrol';
}
function detectInvoiceReviewGroup(parts){
  // Firma isminden değil;
  // sadece gerçek fatura tipi/senaryo/açıklama alanlarından analiz yapılır.
  const safeParts=(parts||[])
    .map(x=>String(x||''))
    .filter(x=>{
      const n=invoiceNormalizeHeader(x);

      // Şirket ünvanlarını analiz dışı bırak
      if(/LIMITED|LTD|SIRKETI|SANAYI|TICARET|ITHALAT|IHRACAT|ELEKTRONIK|ANONIM|AS|A\.S\.|VE/.test(n)){
        return false;
      }

      return true;
    });

  const t=invoiceNormalizeHeader(safeParts.join(' '));

  // İstisna sadece gerçek fatura tipi/senaryosuysa çalışır.
  if(/ISTISNA|KDVISTISNA|VERGIISTISNA|TAMISTISNA/.test(t)) return 'İstisna';

  if(/TEVKIFAT|KISMITEVKIFAT|TAMTEVKIFAT/.test(t)) return 'Tevkifat';

  return 'Normal';
}
function buildInvoiceTypeBreakdown(){
  const bucket={};
  function addRow(r){
    if(r.tur!=='Alış' && r.tur!=='Satış') return;
    const group=r.faturaAltTipi||detectInvoiceReviewGroup([r.faturaTipiRaw,r.faturaSenaryo,r.faturaDurumu,r.aciklama]);
    const tip=(String(r.faturaTipiRaw||'').replace(/\s+/g,' ').trim()) || 'Tip Yok';
    const senaryo=(String(r.faturaSenaryo||'').replace(/\s+/g,' ').trim()) || 'Senaryo Yok';
    const key=[r.tur,group,tip,senaryo].join('|||');
    if(!bucket[key]) bucket[key]={tur:r.tur,incelemeGrubu:group,faturaTipi:tip,senaryo:senaryo,matrah:0,kdv:0,toplam:0,satirSayisi:0};
    bucket[key].matrah+=(r.matrah||r.net||0);
    bucket[key].kdv+=(r.kdv||0);
    bucket[key].toplam+=(r.toplam||0);
    bucket[key].satirSayisi++;
  }
  invoicePurchaseRows.filter(r=>!r.beyanHaric).forEach(addRow);
  invoiceSalesRows.filter(r=>!r.beyanHaric).forEach(addRow);
  const order={'Alış':1,'Satış':2};
  const groupOrder={'Normal':1,'İstisna':2,'Tevkifat':3};
  return Object.values(bucket).sort((a,b)=>(order[a.tur]||9)-(order[b.tur]||9) || (groupOrder[a.incelemeGrubu]||9)-(groupOrder[b.incelemeGrubu]||9) || b.toplam-a.toplam);
}
function buildInvoiceVatRateBreakdown(){
  const bucket={};
  function addRow(r,side){
    const parts=[];
    if(r.kdvDagilim && Object.keys(r.kdvDagilim).length){
      Object.keys(r.kdvDagilim).forEach(k=>{
        const rate=invoiceCleanVatRate(k) || 0;
        const item=r.kdvDagilim[k]||{};
        parts.push({rate, matrah:Number(item.matrah||0), kdv:Number(item.kdv||0), toplam:Number(item.toplam||0)});
      });
    }else{
      const rate=invoiceCleanVatRate(r.kdvOrani||0) || 0;
      parts.push({rate, matrah:r.matrah||r.net||0, kdv:r.kdv||0, toplam:r.toplam||0});
    }
    parts.forEach(part=>{
      const key=String(part.rate);
      if(!bucket[key])bucket[key]={kdvOrani:part.rate,alisMatrah:0,alisKdv:0,alisToplam:0,masrafMatrah:0,masrafKdv:0,masrafToplam:0,satisMatrah:0,satisKdv:0,satisToplam:0};
      const b=bucket[key];
      if(side==='Alış'){
        b.alisMatrah+=part.matrah; b.alisKdv+=part.kdv; b.alisToplam+=part.toplam;
      }else if(side==='Masraf Fişi'){
        b.masrafMatrah+=part.matrah; b.masrafKdv+=part.kdv; b.masrafToplam+=part.toplam;
      }else{
        b.satisMatrah+=part.matrah; b.satisKdv+=part.kdv; b.satisToplam+=part.toplam;
      }
    });
  }
  invoicePurchaseRows.filter(r=>!r.beyanHaric).forEach(r=>addRow(r,'Alış'));
  invoiceExpenseRows.forEach(r=>addRow(r,'Masraf Fişi'));
  invoiceSalesRows.filter(r=>!r.beyanHaric).forEach(r=>addRow(r,'Satış'));
  function addGiderPusulasiKdv(rate,kdv){
    kdv=Number(kdv||0);
    if(!kdv) return;
    const key=String(rate);
    if(!bucket[key])bucket[key]={kdvOrani:rate,alisMatrah:0,alisKdv:0,alisToplam:0,masrafMatrah:0,masrafKdv:0,masrafToplam:0,satisMatrah:0,satisKdv:0,satisToplam:0};
    const matrah=rate?kdv/(rate/100):0;
    bucket[key].masrafMatrah+=matrah;
    bucket[key].masrafKdv+=kdv;
    bucket[key].masrafToplam+=matrah+kdv;
  }
  addGiderPusulasiKdv(20,giderPusulasiKdv20);
  addGiderPusulasiKdv(10,giderPusulasiKdv10);
  addGiderPusulasiKdv(1,giderPusulasiKdv1);
  return Object.values(bucket).sort((a,b)=>a.kdvOrani-b.kdvOrani);
}


function invoiceSideRateBreakdown(rows){
  const bucket={};
  rows.forEach(r=>{
    if(r.kdvDagilim && Object.keys(r.kdvDagilim).length){
      Object.keys(r.kdvDagilim).forEach(k=>{
        const rate=invoiceCleanVatRate(k) || 0;
        const item=r.kdvDagilim[k]||{};
        const key=String(rate);
        if(!bucket[key]) bucket[key]={rate,matrah:0,kdv:0,total:0};
        bucket[key].matrah += Number(item.matrah||0);
        bucket[key].kdv += Number(item.kdv||0);
        bucket[key].total += Number(item.toplam || (Number(item.matrah||0)+Number(item.kdv||0)) || 0);
      });
    }else{
      const rate=invoiceCleanVatRate(r.kdvOrani||0) || 0;
      const key=String(rate);
      if(!bucket[key]) bucket[key]={rate,matrah:0,kdv:0,total:0};
      bucket[key].matrah += r.matrah||r.net||0;
      bucket[key].kdv += r.kdv||0;
      bucket[key].total += r.toplam||0;
    }
  });
  return Object.values(bucket).sort((a,b)=>a.rate-b.rate);
}
function invoiceRateBreakdownHtml(rows,mode,special={}){
  const data=invoiceSideRateBreakdown(rows).filter(x=>x.rate || x.kdv || x.matrah || x.total);
  const totalMatrah=data.reduce((s,x)=>s+(x.matrah||0),0);
  const totalKdv=data.reduce((s,x)=>s+(x.kdv||0),0);
  const totalKdvDahil=data.reduce((s,x)=>s+(x.total||0),0);
  const rates=[1,10,20];
  const byRate={};
  data.forEach(x=>{byRate[String(invoiceCleanVatRate(x.rate||0))]=x;});
  let html='<div class="plain-kdv-lines">';
  html+=`<div class="summary-line"><span>KDV Matrah</span><strong>${invoiceFormatTL(totalMatrah)}</strong></div>`;
  rates.forEach(rate=>{
    const x=byRate[String(rate)]||{kdv:0};
    html+=`<div class="summary-line"><span>%${rate} KDV</span><strong>${invoiceFormatTL(x.kdv||0)}</strong></div>`;
  });
  const otherRates=data.filter(x=>![1,10,20].includes(invoiceCleanVatRate(x.rate||0)));
  otherRates.forEach(x=>{
    const label=x.rate ? invoiceVatRateLabel(x.rate)+' KDV' : 'Oran Yok KDV';
    html+=`<div class="summary-line"><span>${label}</span><strong>${invoiceFormatTL(x.kdv||0)}</strong></div>`;
  });
  const kdvLabel=mode==='sales'?'Hesaplanan KDV':'İndirilecek KDV';
  html+=`<div class="summary-line indirilecek"><span>${kdvLabel}</span><strong>${invoiceFormatTL(totalKdv)}</strong></div>`;
  html+=`<div class="summary-line total"><span>KDV Dahil Toplam Tutar</span><strong>${invoiceFormatTL(totalKdvDahil || (totalMatrah+totalKdv))}</strong></div>`;

  function specialTotals(list){
    return {
      matrah:(list||[]).reduce((s,r)=>s+Number((r.matrah||r.net)||0),0),
      kdv:(list||[]).reduce((s,r)=>s+Number(r.kdv||0),0),
      toplam:(list||[]).reduce((s,r)=>s+Number(r.toplam || (Number((r.matrah||r.net)||0)+Number(r.kdv||0))),0),
      count:(list||[]).length
    };
  }
  function specialBlock(title, cls, totals){
    if(!totals.count) return '';
    let h='';
    // Üstteki "İade Faturaları / 1 adet" başlığı kaldırıldı.
    // Fatura sayısı zaten en altta küçük puntolu alanda gösteriliyor.
    h+=`<div class="summary-line"><span>${title} Matrah</span><strong>${invoiceFormatTL(totals.matrah)}</strong></div>`;
    h+=`<div class="summary-line"><span>${title} KDV</span><strong>${invoiceFormatTL(totals.kdv)}</strong></div>`;
    const totalClass = cls==='tevkifat' ? 'summary-line no-black-line' : 'summary-line total';
    h+=`<div class="${totalClass}"><span>${title} KDV Dahil Tutar</span><strong>${invoiceFormatTL(totals.toplam)}</strong></div>`;
    return h;
  }

  const ret=specialTotals(special.returns||[]);
  const tev=specialTotals(special.tevkifat||[]);
  const ist=specialTotals(special.istisna||[]);
  html+=specialBlock('İade Faturaları','iade',ret);
  html+=specialBlock('Tevkifatlı Faturalar','tevkifat',tev);
  html+=specialBlock('İstisna Faturaları','istisna',ist);

  // V157: Satış kartında normal satış + iade faturaları toplamını ayrıca göster.
  // Aylık/Yıllık Özet de bu yeni toplamı kullanır.
  if(mode==='sales' && ret.count){
    const combined={
      matrah:totalMatrah+ret.matrah,
      kdv:totalKdv+ret.kdv,
      toplam:(totalKdvDahil || (totalMatrah+totalKdv))+ret.toplam
    };
    html+=`<div class="summary-line special-title"><span>Satış + İade Faturaları Toplamı</span><strong></strong></div>`;
    html+=`<div class="summary-line"><span>Satış + İade Matrah</span><strong>${invoiceFormatTL(combined.matrah)}</strong></div>`;
    html+=`<div class="summary-line"><span>Satış + İade KDV</span><strong>${invoiceFormatTL(combined.kdv)}</strong></div>`;
    html+=`<div class="summary-line total"><span>Satış + İade KDV Dahil</span><strong>${invoiceFormatTL(combined.toplam)}</strong></div>`;
  }

  const countLabel=mode==='expense'?'Fiş Sayısı':'Fatura Sayısı';
  const mini=[];
  mini.push(`${countLabel}: <strong>${(rows||[]).length}</strong>`);
  if(ret.count) mini.push(`İade: <strong>${ret.count}</strong>`);
  if(tev.count) mini.push(`Tevkifat: <strong>${tev.count}</strong>`);
  if(ist.count) mini.push(`İstisna: <strong>${ist.count}</strong>`);
  html+=`<div class="invoice-count-footnote">${mini.join(' &nbsp;•&nbsp; ')}</div>`;
  html+='</div>';
  return html;
}

function invoiceSetText(id,value){
  const el=document.getElementById(id);
  if(el) el.textContent=value;
}

function invoiceMainSummaryRows(rows, specialRows){
  const specialKeys=new Set((specialRows||[]).map(r=>[
    r.tur||'', r.kaynak||'', r.sayfa||'', r.satir||'', r.faturaNo||'', r.firma||'', r.toplam||0, r.matrah||r.net||0, r.kdv||0
  ].join('|')));
  return (rows||[]).filter(r=>{
    if(r.beyanHaric) return false;
    if(r.faturaAltTipi==='İstisna' || r.faturaAltTipi==='Tevkifat' || r.faturaAltTipi==='İade') return false;
    const key=[r.tur||'', r.kaynak||'', r.sayfa||'', r.satir||'', r.faturaNo||'', r.firma||'', r.toplam||0, r.matrah||r.net||0, r.kdv||0].join('|');
    return !specialKeys.has(key);
  });
}

function setInvoiceDetailViewMode(mode){
  invoiceDetailViewMode=(mode==='all')?'all':'current';
  renderInvoiceDetailSections();
}
function invoiceDetailUseCurrentRows(){
  return invoiceDetailViewMode!=='all' && invoiceCurrentAnalysisActive;
}
function invoiceDetailRows(allRows,currentRows){
  return invoiceDetailUseCurrentRows() ? (currentRows||[]) : (allRows||[]);
}
function updateInvoiceDetailToggleButtons(){
  const currentBtn=document.getElementById('invoiceDetailCurrentBtn');
  const allBtn=document.getElementById('invoiceDetailAllBtn');
  if(currentBtn) currentBtn.classList.toggle('active', invoiceDetailViewMode!=='all');
  if(allBtn) allBtn.classList.toggle('active', invoiceDetailViewMode==='all');
}
function renderInvoiceDetailSections(){
  updateInvoiceDetailToggleButtons();
  renderReturnInvoiceTable();
  renderTevkifatInvoiceTable();
  renderIstisnaInvoiceTable();
  renderExcludedInvoiceTable();
  renderInvoiceDetailTable('purchaseInvoiceTable', invoiceDetailRows(invoicePurchaseRows, invoiceCurrentPurchaseRows));
  renderExpenseReceiptSummaryTable();
  renderInvoiceDetailTable('salesInvoiceTable', invoiceDetailRows(invoiceSalesRows, invoiceCurrentSalesRows));
}

function renderInvoiceProfitResults(){
  // ÜST ÖZET KURALI:
  // Yeni dosya yüklendiyse üstteki özet sadece bu analizde yüklenen aya/dosyalara göre hesaplanır.
  // Yıllık hafızadaki eski aylar sadece aşağıdaki Aylık / Yıllık Özet tablosunda toplanır.
  const summaryPurchaseRows=(invoiceCurrentAnalysisActive?invoiceCurrentPurchaseRows:invoicePurchaseRows);
  const summarySalesRows=(invoiceCurrentAnalysisActive?invoiceCurrentSalesRows:invoiceSalesRows);
  const summaryExpenseRows=(invoiceCurrentAnalysisActive?invoiceCurrentExpenseRows:invoiceExpenseRows);
  const summarySources=new Set([...summaryPurchaseRows,...summarySalesRows,...summaryExpenseRows].map(r=>r.kaynak).filter(Boolean));
  function sideSpecialRows(arr,side){
    return (arr||[]).filter(r=>r.tur===side && (!invoiceCurrentAnalysisActive || summarySources.has(r.kaynak)));
  }
  const purchaseSpecialRows=[...sideSpecialRows(invoiceReturnRows,'Alış'),...sideSpecialRows(invoiceTevkifatRows,'Alış'),...sideSpecialRows(invoiceIstisnaRows,'Alış')];
  const salesSpecialRows=[...sideSpecialRows(invoiceReturnRows,'Satış'),...sideSpecialRows(invoiceTevkifatRows,'Satış'),...sideSpecialRows(invoiceIstisnaRows,'Satış')];
  const validPurchaseRows=invoiceMainSummaryRows(summaryPurchaseRows,purchaseSpecialRows);
  const validSalesRows=invoiceMainSummaryRows(summarySalesRows,salesSpecialRows);

  const purchaseMatrah=validPurchaseRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const purchaseVat=validPurchaseRows.reduce((s,r)=>s+r.kdv,0);
  const purchaseTotal=validPurchaseRows.reduce((s,r)=>s+r.toplam,0);
  const salesMatrah=validSalesRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const salesVat=validSalesRows.reduce((s,r)=>s+r.kdv,0);
  const salesTotal=validSalesRows.reduce((s,r)=>s+r.toplam,0);
  const expenseMatrah=summaryExpenseRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const expenseVat=summaryExpenseRows.reduce((s,r)=>s+r.kdv,0);
  const expenseTotal=summaryExpenseRows.reduce((s,r)=>s+r.toplam,0);
  // Yeni kâr mantığı:
  // Brüt Kâr = Satış KDV Dahil - Alış KDV Dahil - Masraf Fişleri KDV Dahil - Gider Pusulası KDV Dahil
  // Net Kâr = Satış Matrah - Alış Matrah - Masraf Fişleri Matrah - Gider Pusulası Matrah
  const summaryMonthIndexes=[...new Set([...summaryPurchaseRows,...summarySalesRows,...summaryExpenseRows].map(r=>invoiceMonthIndexFromAy(r.ay)).filter(i=>i>=0&&i<12))];
  const commissionTotal=invoiceCurrentAnalysisActive
    ? summaryMonthIndexes.reduce((s,i)=>s+getInvoiceCommissionForMonthIndex(i),0)
    : getInvoiceCommissionTotal();
  const profitExpenseTotal=invoiceCurrentAnalysisActive
    ? summaryMonthIndexes.reduce((s,i)=>s+getInvoiceProfitExpenseForMonthIndex(i),0)
    : getInvoiceProfitExpenseTotal();
  const grossProfit=salesTotal-purchaseTotal-expenseTotal-giderPusulasiAmount-commissionTotal-profitExpenseTotal;
  const netProfit=salesMatrah-purchaseMatrah-expenseMatrah-getGiderPusulasiMatrah()-commissionTotal-profitExpenseTotal;
  const grossRate=salesTotal?grossProfit/salesTotal*100:0;
  const netRate=salesMatrah?netProfit/salesMatrah*100:0;
  const vatDiff=salesVat-purchaseVat-expenseVat-getGiderPusulasiKdvTotal();
  invoiceSetText('purchaseSummaryMatrah',invoiceFormatTL(purchaseMatrah));
  invoiceSetText('purchaseSummaryTotal',invoiceFormatTL(purchaseTotal));
  const purchaseRatesEl=document.getElementById('purchaseSummaryRates'); 
  if(purchaseRatesEl) purchaseRatesEl.innerHTML=invoiceRateBreakdownHtml(validPurchaseRows,'purchase',{
    returns:sideSpecialRows(invoiceReturnRows,'Alış'),
    tevkifat:sideSpecialRows(invoiceTevkifatRows,'Alış'),
    istisna:sideSpecialRows(invoiceIstisnaRows,'Alış')
  });

  invoiceSetText('salesSummaryMatrah',invoiceFormatTL(salesMatrah));
  invoiceSetText('salesSummaryTotal',invoiceFormatTL(salesTotal));
  const salesRatesEl=document.getElementById('salesSummaryRates'); 
  if(salesRatesEl) salesRatesEl.innerHTML=invoiceRateBreakdownHtml(validSalesRows,'sales',{
    returns:sideSpecialRows(invoiceReturnRows,'Satış'),
    tevkifat:sideSpecialRows(invoiceTevkifatRows,'Satış'),
    istisna:sideSpecialRows(invoiceIstisnaRows,'Satış')
  });

  invoiceSetText('expenseSummaryMatrah',invoiceFormatTL(expenseMatrah));
  invoiceSetText('expenseSummaryTotal',invoiceFormatTL(expenseTotal));
  const expenseRatesEl=document.getElementById('expenseSummaryRates'); if(expenseRatesEl) expenseRatesEl.innerHTML=invoiceRateBreakdownHtml(summaryExpenseRows,'expense');

  renderGiderPusulasiAmount();
  renderInvoiceCommissionInputs();
  invoiceSetText('commissionTotalSummary',invoiceFormatTL(commissionTotal));
  invoiceSetText('profitExpenseTotalSummary',invoiceFormatTL(profitExpenseTotal));
  invoiceSetText('netProfitTotal',invoiceFormatTL(netProfit));

  document.getElementById('purchaseNetTotal').textContent=invoiceFormatTL(purchaseMatrah);
  document.getElementById('purchaseVatTotal').textContent=invoiceFormatTL(purchaseVat);
  document.getElementById('salesNetTotal').textContent=invoiceFormatTL(salesMatrah);
  document.getElementById('salesVatTotal').textContent=invoiceFormatTL(salesVat);
  const expenseEl=document.getElementById('expenseReceiptTotal'); if(expenseEl) expenseEl.textContent=invoiceFormatTL(expenseTotal);
  renderGiderPusulasiAmount();
  const rateEl=document.getElementById('invoiceVatRates');
  if(rateEl) rateEl.textContent=invoiceVatRateSummary([...validPurchaseRows,...validSalesRows,...summaryExpenseRows]);
  const gp=document.getElementById('grossProfitTotal'); gp.textContent=invoiceFormatTL(grossProfit); gp.className=grossProfit>=0?'positive':'negative';
  const np=document.getElementById('netProfitTotal'); if(np) np.className=netProfit>=0?'positive':'negative';
  const nr=document.getElementById('netProfitRate'); if(nr){ nr.textContent='%'+new Intl.NumberFormat('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(netRate); nr.className=netRate>=0?'positive':'negative'; }
  document.getElementById('grossProfitRate').textContent='%'+new Intl.NumberFormat('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(grossRate);
  const vd=document.getElementById('vatDifferenceTotal');
  const vdLabel=document.getElementById('vatDifferenceLabel');
  if(vdLabel) vdLabel.textContent=vatDiff>=0?'Ödenecek KDV':'Devreden KDV';
  if(vd){ vd.textContent=invoiceFormatTL(Math.abs(vatDiff)); vd.className=vatDiff>=0?'negative':'positive'; }
  const excludedEl=document.getElementById('excludedInvoiceCount'); if(excludedEl) excludedEl.textContent=String(invoiceCurrentAnalysisActive?invoiceCurrentExcludedRows.length:invoiceExcludedRows.length);
  const invoiceRowCountEl=document.getElementById('invoiceRowCount'); if(invoiceRowCountEl) invoiceRowCountEl.textContent=String(summaryPurchaseRows.length+summarySalesRows.length+summaryExpenseRows.length);
  buildInvoiceMonthlySummary();
  renderInvoiceMonthlyTable();
  renderInvoiceDetailSections();
  document.getElementById('invoiceAnalysisResults').style.display='block';
  if(typeof cashflowFocusRows==='function'){
    const focusRows=invoiceCurrentAnalysisActive?[...summaryPurchaseRows,...summarySalesRows,...summaryExpenseRows]:[...invoicePurchaseRows,...invoiceSalesRows,...invoiceExpenseRows];
    cashflowFocusRows(focusRows);
  }
  renderCashflowCalendar();
}
/* V89 PATCH: Aylık / Yıllık Özet kronolojik sıralama fix. Ocak monthIndex=0 olduğu için || 99 hatası Şubat'ı başa alıyordu. */
function buildInvoiceMonthlySummary(){
  const bucket={};
  function ensure(ay){
    const mi=invoiceMonthIndexFromAy(ay);
    const key=String(mi===99?ay:mi);
    if(!bucket[key]) bucket[key]={ay:mi===99?ay:invoiceMonthLabelFromIndex(mi),monthIndex:mi,alisMatrah:0,alisKdv:0,alisToplam:0,masrafMatrah:0,masrafKdv:0,masrafToplam:0,giderPusulasi:0,giderPusulasiMatrah:0,giderPusulasiKdv20:0,giderPusulasiKdv10:0,giderPusulasiKdv1:0,giderPusulasiKdvToplam:0,satisMatrah:0,satisKdv:0,satisToplam:0,komisyon:0,karGiderleri:0,brutKar:0,netKar:0,kdvFarki:0,kumulatifKar:0};
    return bucket[key];
  }
  function invoiceUpperSummaryTotals(rows){
    const data=invoiceSideRateBreakdown(rows||[]);
    return {
      matrah:data.reduce((s,x)=>s+Number(x.matrah||0),0),
      kdv:data.reduce((s,x)=>s+Number(x.kdv||0),0),
      toplam:data.reduce((s,x)=>s+Number(x.total||0),0)
    };
  }
  function applyUpperTotalsToBucket(rows, assign){
    const grouped={};
    (rows||[]).forEach(r=>{
      const mi=invoiceMonthIndexFromAy(r.ay);
      const key=String(mi===99?r.ay:mi);
      if(!grouped[key]) grouped[key]={ay:mi===99?r.ay:invoiceMonthLabelFromIndex(mi), rows:[]};
      grouped[key].rows.push(r);
    });
    Object.values(grouped).forEach(g=>{
      const totals=invoiceUpperSummaryTotals(g.rows);
      assign(ensure(g.ay), totals);
    });
  }

  // Aylık / Yıllık Özet artık KDV dahil tutarları yukarıdaki özetin kullandığı aynı kırılım mantığından çeker.
  // Böylece satır toplamı ile KDV dağılımı farklı olan dosyalarda alttaki tablo üst özetten sapmaz.
  const purchaseBaseRows=invoicePurchaseRows||[];
  const salesBaseRows=invoiceSalesRows||[];
  const expenseBaseRows=(invoiceExpenseRows||[]).filter(r=>!r.beyanHaric);
  function sideSpecialRows(arr,side){
    return (arr||[]).filter(r=>r.tur===side);
  }
  const purchaseSpecialRows=[...sideSpecialRows(invoiceReturnRows,'Alış'),...sideSpecialRows(invoiceTevkifatRows,'Alış'),...sideSpecialRows(invoiceIstisnaRows,'Alış')];
  const salesSpecialRows=[...sideSpecialRows(invoiceReturnRows,'Satış'),...sideSpecialRows(invoiceTevkifatRows,'Satış'),...sideSpecialRows(invoiceIstisnaRows,'Satış')];
  const monthlyPurchaseRows=invoiceMainSummaryRows(purchaseBaseRows,purchaseSpecialRows);
  const monthlySalesBaseRows=invoiceMainSummaryRows(salesBaseRows,salesSpecialRows);
  // V157: Yıllık/Aylık satış değerlerinde normal satış + satış iade faturaları beraber kullanılır.
  // Tevkifat ve istisna hâlâ ayrı gösterilir; ana ciro hesabına eklenmez.
  const monthlySalesReturnRows=sideSpecialRows(invoiceReturnRows,'Satış');
  const monthlySalesRows=[...monthlySalesBaseRows,...monthlySalesReturnRows];

  applyUpperTotalsToBucket(monthlyPurchaseRows,(b,t)=>{b.alisMatrah=t.matrah;b.alisKdv=t.kdv;b.alisToplam=t.toplam || (t.matrah+t.kdv);});
  applyUpperTotalsToBucket(monthlySalesRows,(b,t)=>{b.satisMatrah=t.matrah;b.satisKdv=t.kdv;b.satisToplam=t.toplam || (t.matrah+t.kdv);});
  applyUpperTotalsToBucket(expenseBaseRows,(b,t)=>{b.masrafMatrah=t.matrah;b.masrafKdv=t.kdv;b.masrafToplam=t.toplam || (t.matrah+t.kdv);});

  const monthIndexes=[...new Set([...monthlyPurchaseRows,...monthlySalesRows,...expenseBaseRows].map(r=>invoiceMonthIndexFromAy(r.ay)).filter(i=>i>=0&&i<12))];
  if((giderPusulasiAmount || getGiderPusulasiKdvTotal()) && monthIndexes.length){
    monthIndexes.forEach(mi=>{
      let b=ensure(invoiceMonthLabelFromIndex(mi));
      b.giderPusulasi+=giderPusulasiAmount;
      b.giderPusulasiMatrah+=getGiderPusulasiMatrah();
      b.giderPusulasiKdv20+=giderPusulasiKdv20;
      b.giderPusulasiKdv10+=giderPusulasiKdv10;
      b.giderPusulasiKdv1+=giderPusulasiKdv1;
      b.giderPusulasiKdvToplam+=getGiderPusulasiKdvTotal();
    });
  }else if(giderPusulasiAmount || getGiderPusulasiKdvTotal()){
    let b=ensure('GİDER PUSULASI');
    b.giderPusulasi+=giderPusulasiAmount;
    b.giderPusulasiMatrah+=getGiderPusulasiMatrah();
    b.giderPusulasiKdv20+=giderPusulasiKdv20;
    b.giderPusulasiKdv10+=giderPusulasiKdv10;
    b.giderPusulasiKdv1+=giderPusulasiKdv1;
    b.giderPusulasiKdvToplam+=getGiderPusulasiKdvTotal();
  }

  Object.keys(invoiceCommissions||{}).forEach(k=>{
    let i=Number(k);
    if(i>=0&&i<12){
      let b=ensure(invoiceMonthLabelFromIndex(i));
      b.komisyon+=invoiceNumber(invoiceCommissions[k]);
    }
  });
  MONTHS.forEach((m,i)=>{
    const v=getInvoiceProfitExpenseForMonthIndex(i);
    if(v){
      let b=ensure(invoiceMonthLabelFromIndex(i));
      b.karGiderleri+=v;
    }
  });
  invoiceMonthlySummary=Object.values(bucket).map(b=>{
    b.brutKar=b.satisToplam-b.alisToplam-b.masrafToplam-b.giderPusulasi-b.komisyon-b.karGiderleri;
    b.netKar=b.satisMatrah-b.alisMatrah-b.masrafMatrah-(b.giderPusulasiMatrah||b.giderPusulasi)-b.komisyon-b.karGiderleri;
    b.kdvFarki=b.satisKdv-b.alisKdv-b.masrafKdv-(b.giderPusulasiKdvToplam||0);
    b.kumulatifKar=0;
    return b;
  }).sort((a,b)=>{
    const ai=Number.isFinite(Number(a.monthIndex)) ? Number(a.monthIndex) : 99;
    const bi=Number.isFinite(Number(b.monthIndex)) ? Number(b.monthIndex) : 99;
    return ai-bi;
  });
  let kumulatifKar=0;
  invoiceMonthlySummary.forEach(r=>{
    kumulatifKar+=Number(r.netKar||0);
    r.kumulatifKar=kumulatifKar;
  });
}
function renderInvoiceMonthlyTable(){
  const thead=document.querySelector('#invoiceMonthlyTable thead');
  const tbody=document.querySelector('#invoiceMonthlyTable tbody');
  if(!thead||!tbody) return;
  thead.innerHTML='<tr><th>Ay</th><th>Ciro / Satış KDV Dahil</th><th class="monthly-separator">Satış KDV Toplamı</th><th>Alış KDV Dahil</th><th class="monthly-separator">Alış KDV Toplamı</th><th>Masraf KDV Dahil</th><th class="monthly-separator">Masraf Fişleri KDV Toplamı</th><th>Komisyon</th><th class="monthly-separator">Maaş / SGK / Diğer Gider</th><th>Brüt Kâr</th><th class="monthly-separator">Net Kâr</th><th>KDV Farkı</th><th>Kümülatif Kâr</th></tr>';
  tbody.innerHTML='';
  if(!invoiceMonthlySummary.length){tbody.innerHTML='<tr><td colspan="13">Özet yok.</td></tr>';return;}

  const total={satisToplam:0,satisKdv:0,satisMatrah:0,alisToplam:0,alisKdv:0,alisMatrah:0,masrafToplam:0,masrafKdv:0,giderPusulasi:0,komisyon:0,karGiderleri:0,brutKar:0,netKar:0,kdvFarki:0,kumulatifKar:0};
  invoiceMonthlySummary.forEach(r=>{
    total.satisToplam+=Number(r.satisToplam||0);
    total.satisKdv+=Number(r.satisKdv||0);
    total.satisMatrah+=Number(r.satisMatrah||0);
    total.alisToplam+=Number(r.alisToplam||0);
    total.alisKdv+=Number(r.alisKdv||0);
    total.alisMatrah+=Number(r.alisMatrah||0);
    total.masrafToplam+=Number(r.masrafToplam||0);
    total.masrafKdv+=Number(r.masrafKdv||0);
    total.giderPusulasi+=Number(r.giderPusulasi||0);
    total.komisyon+=Number(r.komisyon||0);
    total.karGiderleri+=Number(r.karGiderleri||0);
    total.brutKar+=Number(r.brutKar||0);
    total.netKar+=Number(r.netKar||0);
    total.kdvFarki+=Number(r.kdvFarki||0);
    total.kumulatifKar=Number(r.kumulatifKar||0);

    tbody.innerHTML+=`<tr><td><strong>${escapeHtml(r.ay)}</strong></td><td class="amount positive"><strong>${invoiceFormatTL(r.satisToplam)}</strong></td><td class="amount positive monthly-separator">${invoiceFormatTL(r.satisKdv)}</td><td class="amount negative"><strong>${invoiceFormatTL(r.alisToplam)}</strong></td><td class="amount negative monthly-separator">${invoiceFormatTL(r.alisKdv)}</td><td class="amount negative">${invoiceFormatTL((r.masrafToplam||0)+(r.giderPusulasi||0))}</td><td class="amount negative monthly-separator">${invoiceFormatTL(r.masrafKdv||0)}</td><td class="amount negative">${invoiceFormatTL(r.komisyon)}</td><td class="amount negative monthly-separator">${invoiceFormatTL(r.karGiderleri||0)}</td><td class="amount ${r.brutKar>=0?'positive':'negative'}"><strong>${invoiceFormatTL(r.brutKar)}</strong></td><td class="amount ${r.netKar>=0?'positive':'negative'} monthly-separator"><strong>${invoiceFormatTL(r.netKar)}</strong></td><td class="amount ${r.kdvFarki>=0?'negative':'positive'}">${invoiceFormatTL(r.kdvFarki)}</td><td class="amount ${r.kumulatifKar>=0?'positive':'negative'}"><strong>${invoiceFormatTL(r.kumulatifKar)}</strong></td></tr>`;
  });

  const totalMasraf=total.masrafToplam+total.giderPusulasi;
  tbody.innerHTML+=`<tr style="background:#111827;color:white;font-weight:bold;position:sticky;bottom:0;">
    <td>GENEL TOPLAM</td>
    <td class="amount">${invoiceFormatTL(total.satisToplam)}</td>
    <td class="amount monthly-separator">${invoiceFormatTL(total.satisKdv)}</td>
    <td class="amount">${invoiceFormatTL(total.alisToplam)}</td>
    <td class="amount monthly-separator">${invoiceFormatTL(total.alisKdv)}</td>
    <td class="amount">${invoiceFormatTL(totalMasraf)}</td>
    <td class="amount monthly-separator">${invoiceFormatTL(total.masrafKdv)}</td>
    <td class="amount">${invoiceFormatTL(total.komisyon)}</td>
    <td class="amount monthly-separator">${invoiceFormatTL(total.karGiderleri)}</td>
    <td class="amount">${invoiceFormatTL(total.brutKar)}</td>
    <td class="amount monthly-separator">${invoiceFormatTL(total.netKar)}</td>
    <td class="amount">${invoiceFormatTL(total.kdvFarki)}</td>
    <td class="amount">${invoiceFormatTL(total.kumulatifKar)}</td>
  </tr>`;
}
function renderInvoiceVatBreakdownTable(){
  const table=document.getElementById('invoiceVatBreakdownTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  const rows=buildInvoiceVatRateBreakdown();
  thead.innerHTML='<tr><th>KDV Oranı</th><th>Alış Matrah</th><th>Alış KDV</th><th>Alış KDV Dahil</th><th>Masraf Matrah</th><th>Masraf KDV</th><th>Masraf KDV Dahil</th><th>Satış Matrah</th><th>Satış KDV</th><th>Satış KDV Dahil</th><th>KDV Farkı</th><th>Kümülatif Kâr</th></tr>';
  tbody.innerHTML='';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="11">KDV oran kırılımı yok.</td></tr>';return;}
  rows.forEach(r=>{
    const diff=r.satisKdv-r.alisKdv-r.masrafKdv;
    tbody.innerHTML+=`<tr><td><strong>${invoiceVatRateLabel(r.kdvOrani)}</strong></td><td class="amount negative">${invoiceFormatTL(r.alisMatrah)}</td><td class="amount negative">${invoiceFormatTL(r.alisKdv)}</td><td class="amount negative">${invoiceFormatTL(r.alisToplam)}</td><td class="amount negative">${invoiceFormatTL(r.masrafMatrah)}</td><td class="amount negative">${invoiceFormatTL(r.masrafKdv)}</td><td class="amount negative">${invoiceFormatTL(r.masrafToplam)}</td><td class="amount positive">${invoiceFormatTL(r.satisMatrah)}</td><td class="amount positive">${invoiceFormatTL(r.satisKdv)}</td><td class="amount positive">${invoiceFormatTL(r.satisToplam)}</td><td class="amount ${diff>=0?'negative':'positive'}">${invoiceFormatTL(diff)}</td></tr>`;
  });
}


function renderInvoiceTypeBreakdownTable(){
  const table=document.getElementById('invoiceTypeBreakdownTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  const rows=buildInvoiceTypeBreakdown();
  thead.innerHTML='<tr><th>Taraf</th><th>Fatura Tipi</th><th>Matrah</th><th>KDV</th><th>KDV Dahil Tutar</th><th>Satır</th></tr>';
  tbody.innerHTML='';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="6">Fatura tipi kırılımı yok.</td></tr>';return;}
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr><td>${escapeHtml(r.tur)}</td><td>${escapeHtml(r.faturaTipi)}</td><td class="amount">${invoiceFormatTL(r.matrah)}</td><td class="amount">${invoiceFormatTL(r.kdv)}</td><td class="amount"><strong>${invoiceFormatTL(r.toplam)}</strong></td><td class="amount">${r.satirSayisi}</td></tr>`;
  });
}

function invoiceExpenseGroupName(r){
  // MASRAF FİŞİ KURALI:
  // Masraf kalemi doğrudan Excel'deki "Masraf Kalemi" alanından gelir.
  // 0.01 / 0.1 / 0.2 başlıklı KDV kolonları asla masraf kalemi değildir.
  const direct=String(r.masrafKalemi||'').replace(/\s+/g,' ').trim();
  return direct;
}

function buildExpenseReceiptSummaryRows(){
  // Pivot mantığı:
  // Sol: Masraf Kalemi
  // Üst: %1 / %10 / %20 KDV kolonları
  // Aynı masraf kalemi tek satırda birleşir.
  const bucket={};
  invoiceDetailRows(invoiceExpenseRows,invoiceCurrentExpenseRows).forEach(r=>{
    const kategori=invoiceExpenseGroupName(r);
    // Masraf kalemi boş olan satırlar toplam/not/hesap satırı kabul edilir; ana özete alınmaz.
    if(!kategori) return;

    const rate=invoiceCleanVatRate(r.kdvOrani||0);
    if(!bucket[kategori]){
      bucket[kategori]={
        kategori,
        satirSayisi:0,
        matrah1:0,kdv1:0,toplam1:0,
        matrah10:0,kdv10:0,toplam10:0,
        matrah20:0,kdv20:0,toplam20:0,
        matrahDiger:0,kdvDiger:0,toplamDiger:0,
        matrahToplam:0,kdvToplam:0,genelToplam:0,
        ornekler:new Set()
      };
    }
    const b=bucket[kategori];
    const matrah=(r.matrah||r.net||0);
    const kdv=(r.kdv||0);
    const toplam=(r.toplam||0);
    b.satirSayisi++;
    b.matrahToplam+=matrah;
    b.kdvToplam+=kdv;
    b.genelToplam+=toplam;

    if(rate===1){ b.matrah1+=matrah; b.kdv1+=kdv; b.toplam1+=toplam; }
    else if(rate===10){ b.matrah10+=matrah; b.kdv10+=kdv; b.toplam10+=toplam; }
    else if(rate===20){ b.matrah20+=matrah; b.kdv20+=kdv; b.toplam20+=toplam; }
    else { b.matrahDiger+=matrah; b.kdvDiger+=kdv; b.toplamDiger+=toplam; }

    const sample=String(r.aciklama||r.firma||'').trim();
    if(sample && b.ornekler.size<4) b.ornekler.add(sample);
  });

  return Object.values(bucket)
    .map(x=>({...x,ornekler:[...x.ornekler].join(' | ')}))
    .sort((a,b)=>b.genelToplam-a.genelToplam || a.kategori.localeCompare(b.kategori,'tr'));
}

function buildUndefinedExpenseReceiptRows(){
  // Tanımsız görünen kalemleri kontrol etmek için: D/Masraf Kalemi boş ama KDV/tutar okunan satırlar.
  return invoiceExpenseRows.filter(r=>!invoiceExpenseGroupName(r) && ((r.kdv||0)!==0 || (r.toplam||0)!==0 || (r.matrah||r.net||0)!==0));
}





function buildSpecialInvoiceVatRateBreakdown(rows){
  const bucket={};
  function addAmount(rate,matrah,kdv,total){
    rate=invoiceCleanVatRate(rate||0)||0;
    const key=String(rate);
    if(!bucket[key]) bucket[key]={kdvOrani:rate,matrah:0,kdv:0,toplam:0,satirSayisi:0};
    bucket[key].matrah+=Number(matrah||0);
    bucket[key].kdv+=Number(kdv||0);
    bucket[key].toplam+=Number(total||0);
    bucket[key].satirSayisi++;
  }
  (rows||[]).forEach(r=>{
    let usedSplit=false;
    if(r.kdvDagilim){
      Object.keys(r.kdvDagilim).forEach(k=>{
        const x=r.kdvDagilim[k];
        if(Number(x.kdv||0)>0){
          addAmount(x.rate||Number(k),x.matrah||0,x.kdv||0,x.toplam||0);
          usedSplit=true;
        }
      });
    }
    if(!usedSplit){
      addAmount(r.kdvOrani||0,(r.matrah||r.net||0),r.kdv||0,r.toplam||0);
    }
  });
  return Object.values(bucket).sort((a,b)=>a.kdvOrani-b.kdvOrani);
}

function renderOneSpecialVatBreakdownTable(tableId,rows,emptyText){
  const table=document.getElementById(tableId);
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  const data=buildSpecialInvoiceVatRateBreakdown(rows||[]);
  thead.innerHTML='<tr><th>KDV Oranı</th><th>Matrah</th><th>KDV</th><th>KDV Dahil / Toplam</th><th>Satır</th></tr>';
  tbody.innerHTML='';
  if(!data.length){tbody.innerHTML=`<tr><td colspan="5">${emptyText||'Kayıt yok.'}</td></tr>`;return;}
  let totalMatrah=0,totalKdv=0,totalToplam=0,totalSatir=0;
  data.forEach(r=>{
    totalMatrah+=r.matrah; totalKdv+=r.kdv; totalToplam+=r.toplam; totalSatir+=r.satirSayisi;
    tbody.innerHTML+=`<tr><td><strong>${invoiceVatRateLabel(r.kdvOrani)}</strong></td><td class="amount">${invoiceFormatTL(r.matrah)}</td><td class="amount">${invoiceFormatTL(r.kdv)}</td><td class="amount">${invoiceFormatTL(r.toplam)}</td><td class="amount">${r.satirSayisi}</td></tr>`;
  });
  tbody.innerHTML+=`<tr style="background:#fef3c7;border-top:3px solid #111827;"><td><strong>GENEL TOPLAM</strong></td><td class="amount"><strong>${invoiceFormatTL(totalMatrah)}</strong></td><td class="amount"><strong>${invoiceFormatTL(totalKdv)}</strong></td><td class="amount"><strong>${invoiceFormatTL(totalToplam)}</strong></td><td class="amount"><strong>${totalSatir}</strong></td></tr>`;
}

function renderSpecialInvoiceVatBreakdownTables(){
  renderOneSpecialVatBreakdownTable('returnVatBreakdownTable',invoiceReturnRows,'İade faturası bulunmadı.');
  renderOneSpecialVatBreakdownTable('tevkifatVatBreakdownTable',invoiceTevkifatRows,'Tevkifatlı fatura bulunmadı.');
  renderOneSpecialVatBreakdownTable('istisnaVatBreakdownTable',invoiceIstisnaRows,'İstisna faturası bulunmadı.');
}


function renderTevkifatInvoiceTable(){
  const table=document.getElementById('tevkifatInvoiceTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  thead.innerHTML='<tr><th>Tür</th><th>Tarih</th><th>Ay</th><th>Fatura No</th><th>Firma</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  const rows=invoiceDetailRows(invoiceTevkifatRows,invoiceCurrentTevkifatRows);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9">Tevkifatlı fatura bulunmadı.</td></tr>';
    return;
  }
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr>
      <td>${escapeHtml(r.tur||'')}</td>
      <td>${escapeHtml(r.tarih||'')}</td>
      <td>${escapeHtml(r.ay||'')}</td>
      <td>${escapeHtml(r.faturaNo||'')}</td>
      <td>${escapeHtml(r.firma||'')}</td>
      <td class="amount">${invoiceFormatTL(r.matrah||0)}</td>
      <td class="amount">${invoiceFormatTL(r.kdv||0)}</td>
      <td class="amount">${invoiceFormatTL(r.toplam||0)}</td>
      <td>${escapeHtml(r.kaynak||'')}</td>
    </tr>`;
  });
}

function renderIstisnaInvoiceTable(){
  const table=document.getElementById('istisnaInvoiceTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  thead.innerHTML='<tr><th>Tür</th><th>Tarih</th><th>Ay</th><th>Fatura No</th><th>Firma</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Sebep</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  const rows=invoiceDetailRows(invoiceIstisnaRows,invoiceCurrentIstisnaRows);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="10">İstisna faturası bulunmadı.</td></tr>';
    return;
  }
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr>
      <td>${escapeHtml(r.tur||'')}</td>
      <td>${escapeHtml(r.tarih||'')}</td>
      <td>${escapeHtml(r.ay||'')}</td>
      <td>${escapeHtml(r.faturaNo||'')}</td>
      <td>${escapeHtml(r.firma||'')}</td>
      <td class="amount">${invoiceFormatTL(r.matrah||0)}</td>
      <td class="amount">${invoiceFormatTL(r.kdv||0)}</td>
      <td class="amount">${invoiceFormatTL(r.toplam||0)}</td>
      <td>${escapeHtml(r.sebep||'')}</td>
      <td>${escapeHtml(r.kaynak||'')}</td>
    </tr>`;
  });
}


function renderReturnInvoiceTable(){
  const table=document.getElementById('returnInvoiceTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  thead.innerHTML='<tr><th>Tür</th><th>Tarih</th><th>Ay</th><th>Fatura No</th><th>Firma</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  const rows=invoiceDetailRows(invoiceReturnRows,invoiceCurrentReturnRows);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9">İade faturası bulunmadı.</td></tr>';
    return;
  }
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr>
      <td>${escapeHtml(r.tur||'')}</td>
      <td>${escapeHtml(r.tarih||'')}</td>
      <td>${escapeHtml(r.ay||'')}</td>
      <td>${escapeHtml(r.faturaNo||'')}</td>
      <td>${escapeHtml(r.firma||'')}</td>
      <td class="amount">${invoiceFormatTL(r.matrah||0)}</td>
      <td class="amount">${invoiceFormatTL(r.kdv||0)}</td>
      <td class="amount">${invoiceFormatTL(r.toplam||0)}</td>
      <td>${escapeHtml(r.kaynak||'')}</td>
    </tr>`;
  });
}

function renderExcludedInvoiceTable(){
  const table=document.getElementById('excludedInvoiceTable');
  if(!table) return;
  const thead=table.querySelector('thead');
  const tbody=table.querySelector('tbody');
  thead.innerHTML='<tr><th>Tür</th><th>Tarih</th><th>Ay</th><th>Fatura No</th><th>Firma</th><th>Matrah</th><th>KDV</th><th>KDV Dahil</th><th>Sebep</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  const rows=invoiceDetailRows(invoiceExcludedRows,invoiceCurrentExcludedRows);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="10">Beyan edilmeyecek fatura bulunmadı.</td></tr>';
    return;
  }
  rows.forEach(r=>{
    tbody.innerHTML+=`<tr>
      <td>${escapeHtml(r.tur||'')}</td>
      <td>${escapeHtml(r.tarih||'')}</td>
      <td>${escapeHtml(r.ay||'')}</td>
      <td>${escapeHtml(r.faturaNo||'')}</td>
      <td>${escapeHtml(r.firma||'')}</td>
      <td class="amount">${invoiceFormatTL(r.matrah||0)}</td>
      <td class="amount">${invoiceFormatTL(r.kdv||0)}</td>
      <td class="amount">${invoiceFormatTL(r.toplam||0)}</td>
      <td>${escapeHtml(r.sebep||'')}</td>
      <td>${escapeHtml(r.kaynak||'')}</td>
    </tr>`;
  });
}

function renderExpenseReceiptSummaryTable(){
  const thead=document.querySelector('#expenseReceiptTable thead');
  const tbody=document.querySelector('#expenseReceiptTable tbody');
  const rows=buildExpenseReceiptSummaryRows();

  // SADE MASRAF FİŞİ ÖZETİ:
  // Sol tarafta masraf kalemi, üstte sadece KDV tutarları ve en sağda KDV dahil tutar.
  // En alta GENEL TOPLAM satırı eklendi.
  thead.innerHTML=`<tr>
    <th>Masraf Kalemi</th>
    <th>%1 KDV</th>
    <th>%10 KDV</th>
    <th>%20 KDV</th>
    <th>İndirilecek KDV</th>
    <th>KDV Dahil Tutar</th>
  </tr>`;

  tbody.innerHTML='';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="6">Masraf fişi kaydı yok.</td></tr>';return;}

  let totalKdv1=0;
  let totalKdv10=0;
  let totalKdv20=0;
  let totalİndirilecekKdv=0;
  let totalKdvDahil=0;

  rows.forEach(r=>{
    const kdv1=Number(r.kdv1||0);
    const kdv10=Number(r.kdv10||0);
    const kdv20=Number(r.kdv20||0);
    const kdvDiger=Number(r.kdvDiger||0);
    const indirilecekKdv=kdv1+kdv10+kdv20+kdvDiger;
    const genelToplam=Number(r.genelToplam||0);

    totalKdv1+=kdv1;
    totalKdv10+=kdv10;
    totalKdv20+=kdv20;
    totalİndirilecekKdv+=indirilecekKdv;
    totalKdvDahil+=genelToplam;

    tbody.innerHTML+=`<tr>
      <td><strong>${escapeHtml(r.kategori)}</strong></td>
      <td class="amount">${invoiceFormatTL(kdv1)}</td>
      <td class="amount">${invoiceFormatTL(kdv10)}</td>
      <td class="amount">${invoiceFormatTL(kdv20)}</td>
      <td class="amount"><strong>${invoiceFormatTL(indirilecekKdv)}</strong></td>
      <td class="amount"><strong>${invoiceFormatTL(genelToplam)}</strong></td>
    </tr>`;
  });

  tbody.innerHTML+=`<tr style="background:#fef3c7;border-top:3px solid #111827;">
    <td><strong>GENEL TOPLAM</strong></td>
    <td class="amount"><strong>${invoiceFormatTL(totalKdv1)}</strong></td>
    <td class="amount"><strong>${invoiceFormatTL(totalKdv10)}</strong></td>
    <td class="amount"><strong>${invoiceFormatTL(totalKdv20)}</strong></td>
    <td class="amount"><strong>${invoiceFormatTL(totalİndirilecekKdv)}</strong></td>
    <td class="amount"><strong>${invoiceFormatTL(totalKdvDahil)}</strong></td>
  </tr>`;
}

function renderInvoiceDetailTable(tableId,rows){
  const thead=document.querySelector('#'+tableId+' thead');
  const tbody=document.querySelector('#'+tableId+' tbody');

  // V78 DÜZELTME:
  // Başlık ve satır hücreleri aynı sırada üretildi. Kolon adı silip td bırakma yok.
  // Kaldırılan kolonlar: İnceleme Grubu, Fatura Senaryosu, Masraf Kalemi, Açıklama, Kontrol Notu.
  thead.innerHTML='<tr><th>Firma</th><th>Fatura No</th><th>Tarih</th><th>Matrah</th><th>%20 KDV</th><th>%10 KDV</th><th>%1 KDV</th><th>Diğer KDV</th><th>Toplam KDV</th><th>Genel Toplam</th><th>Kaynak</th></tr>';
  tbody.innerHTML='';
  if(!rows.length){tbody.innerHTML='<tr><td colspan="11">Kayıt yok.</td></tr>';return;}

  rows.forEach(r=>{
    const kdv20=invoiceRowVatAmount(r,20);
    const kdv10=invoiceRowVatAmount(r,10);
    const kdv1=invoiceRowVatAmount(r,1);
    const knownKdv=kdv20+kdv10+kdv1;
    const otherKdv=Math.max((r.kdv||0)-knownKdv,0);
    tbody.innerHTML+=`<tr>
      <td>${escapeHtml(r.firma)}</td>
      <td>${escapeHtml(r.faturaNo)}</td>
      <td>${escapeHtml(r.tarih)}</td>
      <td class="amount">${invoiceFormatTL(r.matrah||r.net)}</td>
      <td class="amount">${invoiceFormatTL(kdv20)}</td>
      <td class="amount">${invoiceFormatTL(kdv10)}</td>
      <td class="amount">${invoiceFormatTL(kdv1)}</td>
      <td class="amount">${invoiceFormatTL(otherKdv)}</td>
      <td class="amount"><strong>${invoiceFormatTL(r.kdv)}</strong></td>
      <td class="amount"><strong>${invoiceFormatTL(r.toplam)}</strong></td>
      <td>${escapeHtml(r.kaynak)}</td>
    </tr>`;
  });
}
function downloadInvoiceProfitReport(){
  if(!invoicePurchaseRows.length && !invoiceSalesRows.length){alert('Önce fatura analizi yap.');return;}
  const wb=XLSX.utils.book_new();
  function moneyNum(v){return Number(v||0);}
  const validPurchaseRows=invoiceMainSummaryRows(invoicePurchaseRows,[...invoiceReturnRows.filter(r=>r.tur==='Alış'),...invoiceTevkifatRows.filter(r=>r.tur==='Alış'),...invoiceIstisnaRows.filter(r=>r.tur==='Alış')]);
  const validSalesRows=invoiceMainSummaryRows(invoiceSalesRows,[...invoiceReturnRows.filter(r=>r.tur==='Satış'),...invoiceTevkifatRows.filter(r=>r.tur==='Satış'),...invoiceIstisnaRows.filter(r=>r.tur==='Satış')]);
  const purchaseMatrah=validPurchaseRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const purchaseVat=validPurchaseRows.reduce((s,r)=>s+r.kdv,0);
  const purchaseTotal=validPurchaseRows.reduce((s,r)=>s+r.toplam,0);
  const salesMatrah=validSalesRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const salesVat=validSalesRows.reduce((s,r)=>s+r.kdv,0);
  const salesTotal=validSalesRows.reduce((s,r)=>s+r.toplam,0);
  const expenseMatrah=invoiceExpenseRows.reduce((s,r)=>s+(r.matrah||r.net||0),0);
  const expenseVat=invoiceExpenseRows.reduce((s,r)=>s+r.kdv,0);
  const expenseTotal=invoiceExpenseRows.reduce((s,r)=>s+r.toplam,0);
  const commissionTotal=getInvoiceCommissionTotal();
  buildInvoiceMonthlySummary();
  const totals=[{
    'Alış Matrah':purchaseMatrah,
    'Alış KDV':purchaseVat,
    'Alış KDV Dahil Tutar':purchaseTotal,
    'Satış Matrah':salesMatrah,
    'Satış KDV':salesVat,
    'Satış KDV Dahil Tutar':salesTotal,
    'Masraf Fişleri Matrah':expenseMatrah,
    'Masraf Fişleri KDV':expenseVat,
    'Masraf Fişleri KDV Dahil Tutar':expenseTotal,
    'Gider Pusulası KDV Dahil':giderPusulasiAmount,
    'Gider Pusulası Matrah':getGiderPusulasiMatrah(),
    'Gider Pusulası %20 KDV':giderPusulasiKdv20,
    'Gider Pusulası %10 KDV':giderPusulasiKdv10,
    'Gider Pusulası %1 KDV':giderPusulasiKdv1,
    'Gider Pusulası İndirilecek KDV':getGiderPusulasiKdvTotal(),
    'İade Matrah':invoiceReturnRows.reduce((s,r)=>s+Number((r.matrah||r.net)||0),0),
    'İade KDV':invoiceReturnRows.reduce((s,r)=>s+Number(r.kdv||0),0),
    'Tevkifat Matrah':invoiceTevkifatRows.reduce((s,r)=>s+Number((r.matrah||r.net)||0),0),
    'Tevkifat KDV':invoiceTevkifatRows.reduce((s,r)=>s+Number(r.kdv||0),0),
    'İstisna Matrah':invoiceIstisnaRows.reduce((s,r)=>s+Number((r.matrah||r.net)||0),0),
    'İstisna Fatura Toplamı':invoiceIstisnaRows.reduce((s,r)=>s+Number(r.toplam||0),0),
    'Komisyonlar':commissionTotal,
    'Brüt Kâr':salesTotal-purchaseTotal-expenseTotal-giderPusulasiAmount-commissionTotal,
    'Net Kâr':salesMatrah-purchaseMatrah-expenseMatrah-getGiderPusulasiMatrah()-commissionTotal,
    'KDV Farkı':salesVat-purchaseVat-expenseVat-getGiderPusulasiKdvTotal(),
    'KDV Oranları':invoiceVatRateSummary([...validPurchaseRows,...validSalesRows,...invoiceExpenseRows])
  }];
  function add(name,data){
    const ws=XLSX.utils.json_to_sheet(data.length?data:[{'Bilgi':'Kayıt yok'}]);
    const range=XLSX.utils.decode_range(ws['!ref']);
    for(let R=1;R<=range.e.r;R++){
      for(let C=0;C<=range.e.c;C++){
        const addr=XLSX.utils.encode_cell({r:R,c:C});
        if(ws[addr] && typeof ws[addr].v==='number'){
          ws[addr].z='₺ #,##0.00';
        }
      }
    }
    XLSX.utils.book_append_sheet(wb,ws,name.substring(0,31));
  }
  add('01 Genel Ozet',totals);
  const monthlyExportRows=invoiceMonthlySummary.map(r=>({'Ay':r.ay,'Ciro / Satış KDV Dahil':r.satisToplam,'Satış KDV Toplamı':r.satisKdv,'Alış KDV Dahil':r.alisToplam,'Alış KDV Toplamı':r.alisKdv,'Masraf KDV Dahil':(r.masrafToplam||0)+(r.giderPusulasi||0),'Masraf Fişleri KDV Toplamı':(r.masrafKdv||0),'Komisyon':r.komisyon,'Brüt Kâr':r.brutKar,'Net Kâr':r.netKar,'KDV Farkı':r.kdvFarki,'Kümülatif Kâr':r.kumulatifKar}));
  if(monthlyExportRows.length){
    monthlyExportRows.push({
      'Ay':'GENEL TOPLAM',
      'Ciro / Satış KDV Dahil':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.satisToplam||0),0),
      'Satış KDV Toplamı':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.satisKdv||0),0),
      'Alış KDV Dahil':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.alisToplam||0),0),
      'Alış KDV Toplamı':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.alisKdv||0),0),
      'Masraf KDV Dahil':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.masrafToplam||0)+Number(r.giderPusulasi||0),0),
      'Komisyon':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.komisyon||0),0),
      'Brüt Kâr':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.brutKar||0),0),
      'Net Kâr':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.netKar||0),0),
      'KDV Farkı':invoiceMonthlySummary.reduce((s,r)=>s+Number(r.kdvFarki||0),0),
      'Kümülatif Kâr':invoiceMonthlySummary.length?Number(invoiceMonthlySummary[invoiceMonthlySummary.length-1].kumulatifKar||0):0
    });
  }
  add('01A Aylik Yillik Ozet',monthlyExportRows);
  add('01B Komisyonlar',MONTHS.map((m,i)=>({'Ay':m,'Komisyon':getInvoiceCommissionForMonthIndex(i)})));
  add('02 KDV Oran Kirilimi',buildInvoiceVatRateBreakdown().map(r=>({'KDV Oranı':invoiceVatRateLabel(r.kdvOrani),'Alış Matrah':r.alisMatrah,'Alış KDV':r.alisKdv,'Alış KDV Dahil Tutar':r.alisToplam,'Masraf Matrah':r.masrafMatrah,'Masraf KDV':r.masrafKdv,'Masraf KDV Dahil Tutar':r.masrafToplam,'Satış Matrah':r.satisMatrah,'Satış KDV':r.satisKdv,'Satış KDV Dahil Tutar':r.satisToplam,'KDV Farkı':r.satisKdv-r.alisKdv-r.masrafKdv})));
  add('03A Tevkifatli Faturalar',invoiceTevkifatRows.map(r=>({'Tür':r.tur,'Tarih':r.tarih,'Ay':r.ay,'Fatura No':r.faturaNo,'Firma':r.firma,'Matrah':moneyNum(r.matrah),'Tevkifat KDV':moneyNum(r.kdv),'KDV Dahil Tutar':moneyNum(r.toplam),'Kaynak Dosya':r.kaynak,'Sayfa':r.sayfa})));
  add('03B Istisna Faturalari',invoiceIstisnaRows.map(r=>({'Tür':r.tur,'Tarih':r.tarih,'Ay':r.ay,'Fatura No':r.faturaNo,'Firma':r.firma,'Matrah':moneyNum(r.matrah),'KDV':moneyNum(r.kdv),'KDV Dahil Tutar':moneyNum(r.toplam),'Sebep':r.sebep,'Kaynak Dosya':r.kaynak,'Sayfa':r.sayfa})));
  add('03C Iade Faturalari',invoiceReturnRows.map(r=>({'Tür':r.tur,'Tarih':r.tarih,'Ay':r.ay,'Fatura No':r.faturaNo,'Firma':r.firma,'Matrah':moneyNum(r.matrah),'KDV':moneyNum(r.kdv),'KDV Dahil Tutar':moneyNum(r.toplam),'Kaynak Dosya':r.kaynak,'Sayfa':r.sayfa})));
  add('03B Hesap Disi Faturalar',invoiceExcludedRows.map(r=>({'Tür':r.tur,'Tarih':r.tarih,'Ay':r.ay,'Fatura No':r.faturaNo,'Firma':r.firma,'Matrah':moneyNum(r.matrah),'KDV':moneyNum(r.kdv),'KDV Dahil Tutar':moneyNum(r.toplam),'Sebep':r.sebep,'Kaynak Dosya':r.kaynak,'Sayfa':r.sayfa})));
  const mapRow=r=>({'Firma':r.firma,'Fatura No':r.faturaNo,'Tarih':r.tarih,'Matrah':moneyNum(r.matrah||r.net),'%20 KDV':moneyNum(invoiceRowVatAmount(r,20)),'%10 KDV':moneyNum(invoiceRowVatAmount(r,10)),'%1 KDV':moneyNum(invoiceRowVatAmount(r,1)),'Diğer KDV':moneyNum(Math.max((r.kdv||0)-invoiceRowVatAmount(r,20)-invoiceRowVatAmount(r,10)-invoiceRowVatAmount(r,1),0)),'Toplam KDV':moneyNum(r.kdv),'Genel Toplam':moneyNum(r.toplam),'Kaynak Dosya':r.kaynak});
  add('04 Alis Faturalari',validPurchaseRows.map(mapRow));
  {
    const expenseSummaryRows=buildExpenseReceiptSummaryRows().map(r=>({'Masraf Kalemi':r.kategori,'%1 KDV':moneyNum(r.kdv1),'%10 KDV':moneyNum(r.kdv10),'%20 KDV':moneyNum(r.kdv20),'İndirilecek KDV':moneyNum((r.kdv1||0)+(r.kdv10||0)+(r.kdv20||0)+(r.kdvDiger||0)),'KDV Dahil Tutar':moneyNum(r.genelToplam)}));
    const totalRow={
      'Masraf Kalemi':'GENEL TOPLAM',
      '%1 KDV':expenseSummaryRows.reduce((s,r)=>s+moneyNum(r['%1 KDV']),0),
      '%10 KDV':expenseSummaryRows.reduce((s,r)=>s+moneyNum(r['%10 KDV']),0),
      '%20 KDV':expenseSummaryRows.reduce((s,r)=>s+moneyNum(r['%20 KDV']),0),
      'İndirilecek KDV':expenseSummaryRows.reduce((s,r)=>s+moneyNum(r['İndirilecek KDV']),0),
      'KDV Dahil Tutar':expenseSummaryRows.reduce((s,r)=>s+moneyNum(r['KDV Dahil Tutar']),0)
    };
    if(expenseSummaryRows.length) expenseSummaryRows.push(totalRow);
    add('05 Masraf Fisleri Ozet',expenseSummaryRows);
  }
  add('06 Satis Faturalari',validSalesRows.map(mapRow));
  add('07 Gider Pusulasi',(giderPusulasiAmount||getGiderPusulasiKdvTotal())?[{'KDV Dahil Tutar':giderPusulasiAmount,'Matrah':getGiderPusulasiMatrah(),'%20 KDV':giderPusulasiKdv20,'%10 KDV':giderPusulasiKdv10,'%1 KDV':giderPusulasiKdv1,'İndirilecek KDV':getGiderPusulasiKdvTotal()}]:[]);
  XLSX.writeFile(wb,'FATURA_ANALIZ_YILLIK_KOMISYON_RAPORU.xlsx');
}


/* =========================
   V86 GENEL TAKVİM VE NAKİT AKIŞ TAKVİMİ
   ========================= */
let cashflowCurrentDate=new Date();
let cashflowSelectedKey='';
let cashflowManualEvents=JSON.parse(localStorage.getItem('cashflowManualEvents')||'[]');

function cashflowPad(n){return String(n).padStart(2,'0');}
function cashflowDateKey(d){return d.getFullYear()+'-'+cashflowPad(d.getMonth()+1)+'-'+cashflowPad(d.getDate());}
function cashflowTrDateToKey(v){
  if(!v)return '';
  if(v instanceof Date && !isNaN(v)) return cashflowDateKey(v);
  const s=String(v).trim();
  let m=s.match(/(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/);
  if(m){let y=Number(m[3]); if(y<100)y+=2000; return y+'-'+cashflowPad(Number(m[2]))+'-'+cashflowPad(Number(m[1]));}
  let d=new Date(s); return isNaN(d)?'':cashflowDateKey(d);
}
function cashflowTrDateParts(v){
  if(!v)return null;
  if(v instanceof Date && !isNaN(v)) return {y:v.getFullYear(),m:v.getMonth()+1,d:v.getDate()};
  const s=String(v).trim();
  let m=s.match(/(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/);
  if(m){let y=Number(m[3]); if(y<100)y+=2000; return {y:y,m:Number(m[2]),d:Number(m[1])};}
  let d=new Date(s);
  return isNaN(d)?null:{y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};
}
function cashflowYearFromRow(row){
  const parts=cashflowTrDateParts(row && row.tarih);
  if(parts && parts.y) return parts.y;
  const src=String((row && row.kaynak)||'');
  const m=src.match(/(20\d{2})/);
  if(m) return Number(m[1]);
  return (new Date()).getFullYear();
}
function cashflowDateKeyFromAccountingMonth(row){
  // Takvimde dönem ayı dosya adından gelen row.ay alanıdır.
  // Satırın kendi tarihi sadece GÜN bilgisini verir. Ay asla satır tarihinden alınmaz.
  // Böylece Şubat dosyasında Ocak tarihli fiş varsa Şubat ayının aynı gününe yazılır.
  const parts=cashflowTrDateParts(row && row.tarih);
  const mi=(typeof invoiceMonthIndexFromAy==='function')?invoiceMonthIndexFromAy(row && row.ay):99;
  const y=cashflowYearFromRow(row);
  if(mi>=0 && mi<12){
    const day=(parts&&parts.d)?parts.d:1;
    const last=new Date(y,mi+1,0).getDate();
    return y+'-'+cashflowPad(mi+1)+'-'+cashflowPad(Math.min(Math.max(day,1),last));
  }
  // Ay dosya adından bulunamazsa satır tarihine düş; o da yoksa bugüne değil, yılın 1 Ocak gününe yaz.
  return cashflowTrDateToKey(row && row.tarih) || (y+'-01-01');
}
function cashflowFocusRows(rows){
  const keys=(rows||[]).map(r=>cashflowDateKeyFromAccountingMonth(r)).filter(Boolean).sort();
  if(!keys.length) return;
  cashflowSelectedKey=keys[keys.length-1];
  const [y,m]=cashflowSelectedKey.split('-').map(Number);
  cashflowCurrentDate=new Date(y,m-1,1);
}
function cashflowKeyToDisplay(key){
  if(!key)return '-';
  const [y,m,d]=key.split('-').map(Number);
  return cashflowPad(d)+'.'+cashflowPad(m)+'.'+y;
}
function cashflowMonthTitle(d){return MONTHS[d.getMonth()]+' '+d.getFullYear();}
function cashflowSaveManual(){localStorage.setItem('cashflowManualEvents',JSON.stringify(cashflowManualEvents));}
function addCashflowManualEvent(){
  const date=document.getElementById('cashflowManualDate')?.value||'';
  const type=document.getElementById('cashflowManualType')?.value||'Diğer';
  const title=(document.getElementById('cashflowManualTitle')?.value||'').trim();
  const gelen=invoiceNumber(document.getElementById('cashflowManualIn')?.value||0);
  const giden=invoiceNumber(document.getElementById('cashflowManualOut')?.value||0);
  if(!date || !title){alert('Tarih ve açıklama yazmalısın.');return;}
  cashflowManualEvents.push({id:Date.now(),date,type,title,gelen,giden});
  cashflowSaveManual();
  document.getElementById('cashflowManualTitle').value='';
  document.getElementById('cashflowManualIn').value='';
  document.getElementById('cashflowManualOut').value='';
  cashflowSelectedKey=date;
  const [y,m]=date.split('-').map(Number); cashflowCurrentDate=new Date(y,m-1,1);
  renderCashflowCalendar();
}
function removeCashflowManualEvent(id){
  cashflowManualEvents=cashflowManualEvents.filter(e=>String(e.id)!==String(id));
  cashflowSaveManual();
  renderCashflowCalendar();
}
function cashflowAddEvent(list,e){
  if(!e.dateKey)return;
  e.gelen=Number(e.gelen||0); e.giden=Number(e.giden||0); e.net=e.gelen-e.giden;
  list.push(e);
}
function buildCashflowEvents(){
  const events=[];
  const seen=new Set();

  function eventKey(e){
    return [e.dateKey,e.type,e.title,e.gelen,e.giden,e.source,e.detail].join('|');
  }
  function pushUnique(e){
    const k=eventKey(e);
    if(seen.has(k)) return;
    seen.add(k);
    cashflowAddEvent(events,e);
  }
  function safeTitle(r, fallback){
    const firm=String((r&&r.firma)||'').trim();
    const no=String((r&&r.faturaNo)||'').trim();
    const kalem=String((r&&r.masrafKalemi)||'').trim();
    if(firm || no) return (firm||fallback)+(no?' / '+no:'');
    if(kalem) return kalem;
    return fallback;
  }

  // Yıllık hafızadaki TÜM alış faturaları takvime düşer.
  // Üst özet aktif ay olabilir ama takvim finansal hafızadaki tüm hareketleri gösterir.
  (Array.isArray(invoicePurchaseRows)?invoicePurchaseRows:[])
    .filter(r=>!r.beyanHaric)
    .forEach(r=>pushUnique({
      dateKey:cashflowDateKeyFromAccountingMonth(r),
      type:'Alış Faturası',
      title:safeTitle(r,'Alış faturası'),
      gelen:0,
      giden:Number(r.toplam||0),
      detail:'Tarih: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),
      source:r.kaynak||''
    }));

  // Yıllık hafızadaki TÜM satış faturaları takvime düşer.
  (Array.isArray(invoiceSalesRows)?invoiceSalesRows:[])
    .filter(r=>!r.beyanHaric)
    .forEach(r=>pushUnique({
      dateKey:cashflowDateKeyFromAccountingMonth(r),
      type:'Satış Faturası',
      title:safeTitle(r,'Satış faturası'),
      gelen:Number(r.toplam||0),
      giden:0,
      detail:'Tarih: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),
      source:r.kaynak||''
    }));

  // Yıllık hafızadaki TÜM masraf fişi satırları takvime düşer.
  (Array.isArray(invoiceExpenseRows)?invoiceExpenseRows:[])
    .forEach(r=>pushUnique({
      dateKey:cashflowDateKeyFromAccountingMonth(r),
      type:'Masraf Fişi',
      title:safeTitle(r,'Masraf fişi'),
      gelen:0,
      giden:Number(r.toplam||0),
      detail:'Tarih: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),
      source:r.kaynak||''
    }));

  // BHD / banka-kredi kartı tarafı varsa o da takvimde görünür.
  if(typeof bhdRawRows!=='undefined' && Array.isArray(bhdRawRows)){
    bhdRawRows.forEach(r=>{
      const isCard=String(r.dosyaTipi||'').includes('Kredi Kartı');
      pushUnique({
        dateKey:cashflowTrDateToKey(r.tarih),
        type:isCard?'Kredi Kartı / Ekstre':'Banka Hareketi',
        title:r.kisiFirma||r.aciklama||'Banka hareketi',
        gelen:Number(r.gelen||0),
        giden:Number(r.giden||0),
        detail:(r.kategori||'')+(r.aciklama?' | '+r.aciklama:''),
        source:r.kaynak||''
      });
    });
  }

  (cashflowManualEvents||[]).forEach(e=>pushUnique({
    dateKey:e.date,
    type:e.type||'Manuel',
    title:e.title||'',
    gelen:Number(e.gelen||0),
    giden:Number(e.giden||0),
    detail:'Manuel kayıt',
    source:'Manuel',
    manualId:e.id
  }));
  return events;
}
function cashflowEventsByDate(){
  const map={};
  buildCashflowEvents().forEach(e=>{if(!map[e.dateKey])map[e.dateKey]=[];map[e.dateKey].push(e);});
  return map;
}
function cashflowChangeMonth(delta){cashflowCurrentDate=new Date(cashflowCurrentDate.getFullYear(),cashflowCurrentDate.getMonth()+delta,1);renderCashflowCalendar();}
function cashflowSelectDay(key){cashflowSelectedKey=key;renderCashflowCalendar();}
function renderCashflowCalendar(){
  const daysEl=document.getElementById('cashflowCalendarDays');
  const titleEl=document.getElementById('cashflowMonthTitle');
  const detailEl=document.getElementById('cashflowDayDetail');
  if(!daysEl||!titleEl||!detailEl)return;
  const map=cashflowEventsByDate();
  const eventKeys=Object.keys(map).sort();
  if(!cashflowSelectedKey && eventKeys.length){
    cashflowSelectedKey=eventKeys[eventKeys.length-1];
    const [y,m]=cashflowSelectedKey.split('-').map(Number); cashflowCurrentDate=new Date(y,m-1,1);
  }
  if(!cashflowSelectedKey){ cashflowSelectedKey=cashflowDateKey(new Date()); cashflowCurrentDate=new Date(); }
  titleEl.textContent=cashflowMonthTitle(cashflowCurrentDate)+' • '+Object.values(map).reduce((s,a)=>s+a.length,0)+' hareket';
  const y=cashflowCurrentDate.getFullYear(), m=cashflowCurrentDate.getMonth();
  const first=new Date(y,m,1);
  const start=(first.getDay()+6)%7; // Pazartesi başlangıç
  const lastDay=new Date(y,m+1,0).getDate();
  let html='';
  for(let i=0;i<start;i++) html+='<div class="cashflow-day empty"></div>';
  for(let d=1;d<=lastDay;d++){
    const key=y+'-'+cashflowPad(m+1)+'-'+cashflowPad(d);
    const rows=map[key]||[];
    const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
    const dots=rows.slice(0,8).map(x=>`<span class="cashflow-dot ${x.gelen>x.giden?'in':x.giden>x.gelen?'out':'neutral'}"></span>`).join('');
    html+=`<div class="cashflow-day ${cashflowSelectedKey===key?'selected':''}" onclick="cashflowSelectDay('${key}')">
      <div class="cashflow-day-number">${d}</div>
      <div class="cashflow-day-mini">${rows.length?`<span>${rows.length} hareket</span><span class="in">+ ${invoiceFormatTL(gelen)}</span><span class="out">- ${invoiceFormatTL(giden)}</span><span class="net">Net ${invoiceFormatTL(net)}</span>`:'<span class="small">Hareket yok</span>'}</div>
      <div class="cashflow-dot-row">${dots}</div>
    </div>`;
  }
  daysEl.innerHTML=html;
  renderCashflowDayDetail(map[cashflowSelectedKey]||[]);
}
function renderCashflowDayDetail(rows){
  const el=document.getElementById('cashflowDayDetail'); if(!el)return;
  const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
  let html=`<div class="cashflow-detail-title">${cashflowKeyToDisplay(cashflowSelectedKey)} Gün Detayı</div><div class="cashflow-detail-sub">Bu panel o güne ait tüm şirket hareketlerini gösterir. Bu nakit akışı değil; genel hareket takvimidir.</div>`;
  if(!rows.length){html+='<div class="cashflow-empty">Bu gün için kayıt yok. Çek, ödeme veya tahsilat gibi manuel hareket ekleyebilirsin.</div>';}
  const groups={}; rows.forEach(r=>{const k=r.type||'Diğer'; if(!groups[k])groups[k]=[]; groups[k].push(r);});
  Object.keys(groups).forEach(type=>{
    html+=`<div class="cashflow-event-group"><h4>${escapeHtml(type)}</h4>`;
    groups[type].forEach(r=>{
      html+=`<div class="cashflow-event"><div><strong>${escapeHtml(r.title||'')}</strong><small>${escapeHtml(r.detail||'')}</small><small>${escapeHtml(r.source||'')}</small>${r.manualId?`<small><button class="detail-toggle" type="button" onclick="removeCashflowManualEvent('${r.manualId}')">Sil</button></small>`:''}</div><div class="amounts">${r.gelen?`<div class="in">+ ${invoiceFormatTL(r.gelen)}</div>`:''}${r.giden?`<div class="out">- ${invoiceFormatTL(r.giden)}</div>`:''}<div class="net">${invoiceFormatTL((r.gelen||0)-(r.giden||0))}</div></div></div>`;
    });
    html+='</div>';
  });
  html+=`<div class="cashflow-balance"><h4>Günün Bilançosu</h4><div class="cashflow-balance-grid"><div><span>Toplam Gelen</span><strong class="positive">${invoiceFormatTL(gelen)}</strong></div><div><span>Toplam Giden</span><strong class="negative">${invoiceFormatTL(giden)}</strong></div><div><span>Net Günlük Hareket</span><strong class="${net>=0?'positive':'negative'}">${invoiceFormatTL(net)}</strong></div><div><span>Hareket Sayısı</span><strong>${rows.length}</strong></div></div></div>`;
  el.innerHTML=html;
}




/* =========================
   V87 GLOBAL TAKVIM MODAL + GERÇEK NAKİT AKIŞ TAKVİMİ
   ========================= */
let cashOnlyCurrentDate=new Date();
let cashOnlySelectedKey='';

function openGlobalCalendar(kind){
  const id=kind==='cash'?'cashOnlyCalendarModal':'generalCalendarModal';
  const el=document.getElementById(id);
  if(el) el.classList.add('open');
  if(kind==='cash') renderCashOnlyCalendar();
  else renderCashflowCalendar();
}
function closeGlobalCalendar(kind){
  const id=kind==='cash'?'cashOnlyCalendarModal':'generalCalendarModal';
  const el=document.getElementById(id);
  if(el) el.classList.remove('open');
}
function renderAllCalendars(){
  if(document.getElementById('generalCalendarModal')?.classList.contains('open')) renderCashflowCalendar();
  if(document.getElementById('cashOnlyCalendarModal')?.classList.contains('open')) renderCashOnlyCalendar();
}
function cashOnlyBuildEvents(){
  const events=[];
  if(typeof bhdRawRows==='undefined' || !Array.isArray(bhdRawRows)) return events;
  bhdRawRows.forEach(r=>{
    const key=cashflowTrDateToKey(r.tarih);
    if(!key) return;
    const isCard=String(r.dosyaTipi||'').includes('Kredi Kartı');
    events.push({
      dateKey:key,
      type:isCard?'Kredi Kartı Ekstresi':'Banka Hareketi',
      title:r.kisiFirma||r.aciklama||'Nakit hareketi',
      gelen:Number(r.gelen||0),
      giden:Number(r.giden||0),
      detail:(r.kategori||'')+(r.aciklama?' | '+r.aciklama:''),
      source:r.kaynak||''
    });
  });
  return events;
}
function cashOnlyEventsByDate(){
  const map={};
  cashOnlyBuildEvents().forEach(e=>{if(!map[e.dateKey])map[e.dateKey]=[];map[e.dateKey].push(e);});
  return map;
}
function cashOnlyChangeMonth(delta){cashOnlyCurrentDate=new Date(cashOnlyCurrentDate.getFullYear(),cashOnlyCurrentDate.getMonth()+delta,1);renderCashOnlyCalendar();}
function cashOnlySelectDay(key){cashOnlySelectedKey=key;renderCashOnlyCalendar();}
function renderCashOnlyCalendar(){
  const daysEl=document.getElementById('cashOnlyCalendarDays');
  const titleEl=document.getElementById('cashOnlyMonthTitle');
  const detailEl=document.getElementById('cashOnlyDayDetail');
  if(!daysEl||!titleEl||!detailEl)return;
  const map=cashOnlyEventsByDate();
  const keys=Object.keys(map).sort();
  if(!cashOnlySelectedKey && keys.length){
    cashOnlySelectedKey=keys[keys.length-1];
    const [y,m]=cashOnlySelectedKey.split('-').map(Number); cashOnlyCurrentDate=new Date(y,m-1,1);
  }
  if(!cashOnlySelectedKey){cashOnlySelectedKey=cashflowDateKey(new Date());cashOnlyCurrentDate=new Date();}
  titleEl.textContent=cashflowMonthTitle(cashOnlyCurrentDate)+' • '+Object.values(map).reduce((s,a)=>s+a.length,0)+' nakit hareketi';
  const y=cashOnlyCurrentDate.getFullYear(), m=cashOnlyCurrentDate.getMonth();
  const first=new Date(y,m,1); const start=(first.getDay()+6)%7; const lastDay=new Date(y,m+1,0).getDate();
  let html='';
  for(let i=0;i<start;i++) html+='<div class="cashflow-day empty"></div>';
  for(let d=1;d<=lastDay;d++){
    const key=y+'-'+cashflowPad(m+1)+'-'+cashflowPad(d);
    const rows=map[key]||[];
    const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
    const dots=rows.slice(0,8).map(x=>`<span class="cashflow-dot ${x.gelen>x.giden?'in':x.giden>x.gelen?'out':'neutral'}"></span>`).join('');
    html+=`<div class="cashflow-day ${cashOnlySelectedKey===key?'selected':''}" onclick="cashOnlySelectDay('${key}')">
      <div class="cashflow-day-number">${d}</div>
      <div class="cashflow-day-mini">${rows.length?`<span>${rows.length} nakit hareketi</span><span class="in">+ ${invoiceFormatTL(gelen)}</span><span class="out">- ${invoiceFormatTL(giden)}</span><span class="net">Net ${invoiceFormatTL(net)}</span>`:'<span class="small">Nakit hareket yok</span>'}</div>
      <div class="cashflow-dot-row">${dots}</div>
    </div>`;
  }
  daysEl.innerHTML=html;
  renderCashOnlyDayDetail(map[cashOnlySelectedKey]||[]);
}
function renderCashOnlyDayDetail(rows){
  const el=document.getElementById('cashOnlyDayDetail'); if(!el)return;
  const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
  let html=`<div class="cashflow-detail-title">${cashflowKeyToDisplay(cashOnlySelectedKey)} Nakit Akışı</div><div class="cashflow-detail-sub">Bu panel sadece BHD modülünden okunan banka/kredi kartı hareketlerini gösterir. Fatura kesildi diye nakit girişi veya çıkışı varsaymaz.</div>`;
  if(!rows.length){html+='<div class="cashflow-empty">Bu gün için banka/kredi kartı nakit hareketi yok. BHD modülüne banka hareketi veya kredi kartı ekstresi yükleyince burası dolar.</div>';}
  const groups={}; rows.forEach(r=>{const k=r.type||'Diğer'; if(!groups[k])groups[k]=[]; groups[k].push(r);});
  Object.keys(groups).forEach(type=>{
    html+=`<div class="cashflow-event-group"><h4>${escapeHtml(type)}</h4>`;
    groups[type].forEach(r=>{
      html+=`<div class="cashflow-event"><div><strong>${escapeHtml(r.title||'')}</strong><small>${escapeHtml(r.detail||'')}</small><small>${escapeHtml(r.source||'')}</small></div><div class="amounts">${r.gelen?`<div class="in">+ ${invoiceFormatTL(r.gelen)}</div>`:''}${r.giden?`<div class="out">- ${invoiceFormatTL(r.giden)}</div>`:''}<div class="net">${invoiceFormatTL((r.gelen||0)-(r.giden||0))}</div></div></div>`;
    });
    html+='</div>';
  });
  html+=`<div class="cashflow-balance"><h4>Günün Gerçek Nakit Akışı</h4><div class="cashflow-balance-grid"><div><span>Hesaba Giren</span><strong class="positive">${invoiceFormatTL(gelen)}</strong></div><div><span>Hesaptan Çıkan</span><strong class="negative">${invoiceFormatTL(giden)}</strong></div><div><span>Net Nakit</span><strong class="${net>=0?'positive':'negative'}">${invoiceFormatTL(net)}</strong></div><div><span>Nakit Hareket Sayısı</span><strong>${rows.length}</strong></div></div></div>`;
  el.innerHTML=html;
}


renderPersonnelList();
renderManualCategoryList();
renderSubcategoryParentOptions();
renderGiderPusulasiAmount();
renderInvoiceCommissionInputs();
if(typeof renderCashflowCalendar==='function') renderCashflowCalendar();


/* =========================
   V87 - KREDİ KARTI / GERÇEK NAKİT / MÜKERRER KONTROL OVERRIDE
   ========================= */
function v87NormText(txt){
  return String(txt||'')
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g,'I').replace(/Ğ/g,'G').replace(/Ü/g,'U').replace(/Ş/g,'S').replace(/Ö/g,'O').replace(/Ç/g,'C')
    .replace(/[^A-Z0-9 ]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function v87Tokens(txt){
  const stop=new Set(['VE','ILE','AŞ','AS','LTD','LIMITED','ŞIRKETI','SIRKETI','SANAYI','TICARET','ANONIM','NO','REF','TR','TL','TRY','ODEME','ÖDEME','HAVALE','EFT','FAST']);
  return v87NormText(txt).split(' ').filter(x=>x.length>=3 && !stop.has(x));
}
function v87TextSimilarity(a,b){
  const A=new Set(v87Tokens(a));
  const B=new Set(v87Tokens(b));
  if(!A.size || !B.size) return 0;
  let common=0; A.forEach(x=>{if(B.has(x)) common++;});
  return common/Math.min(A.size,B.size);
}
function v87AmountKey(v){return Math.round(Math.abs(Number(v||0))*100)/100;}
function v87DirectionAmount(e){
  const gelen=Number(e.gelen||0), giden=Number(e.giden||0);
  return {direction:gelen>=giden?'IN':'OUT', amount:v87AmountKey(gelen>=giden?gelen:giden)};
}
function v87EventDuplicateSignature(e){
  const da=v87DirectionAmount(e);
  return [e.dateKey||e.date||'', da.direction, da.amount].join('|');
}
function v87IsCreditCardSource(rowOrEvent){
  const text=v87NormText([(rowOrEvent&&rowOrEvent.dosyaTipi),(rowOrEvent&&rowOrEvent.type),(rowOrEvent&&rowOrEvent.source),(rowOrEvent&&rowOrEvent.kaynak),(rowOrEvent&&rowOrEvent.detail),(rowOrEvent&&rowOrEvent.aciklama)].join(' '));
  return /KREDI KARTI|KREDIKARTI|KART EKSTRE|CREDIT CARD|KREDI KARTI PDF|KREDI KARTI EKSTRESI/.test(text);
}
function v87IsCreditCardPayment(rowOrEvent){
  const text=v87NormText([(rowOrEvent&&rowOrEvent.aciklama),(rowOrEvent&&rowOrEvent.detail),(rowOrEvent&&rowOrEvent.title),(rowOrEvent&&rowOrEvent.kategori),(rowOrEvent&&rowOrEvent.type)].join(' '));
  return /KREDI KARTI ODEME|KREDIKARTI ODEME|KART ODEMESI|KARTODEMESI|HESAPTAN ODEME|SUBE HESAPTAN ODEME|ODEME TESEKKUR|TESEKKUR EDERIZ|KREDI KART BORC|KREDI KARTI BORC/.test(text);
}
function v87IsCashRelevantBhd(row){
  // Kredi kartı ekstresindeki alışverişler gerçek nakit çıkışı değildir.
  // Banka hesabından yapılan kredi kartı ödemesi gerçek nakit çıkışıdır.
  const isCardStatement=v87IsCreditCardSource(row);
  const isCardPayment=v87IsCreditCardPayment(row);
  if(isCardStatement && !isCardPayment) return false;
  if(isCardStatement && isCardPayment) return false; // Ekstredeki ödeme kaydı kart borcunu azaltır; banka nakdi değildir.
  return (Number(row.gelen||0)>0 || Number(row.giden||0)>0);
}
function v87ImportedBhdEvents(cashOnly){
  const out=[];
  if(typeof bhdRawRows==='undefined' || !Array.isArray(bhdRawRows)) return out;
  bhdRawRows.forEach(r=>{
    const key=cashflowTrDateToKey(r.tarih);
    if(!key) return;
    const isCard=v87IsCreditCardSource(r);
    const isPayment=v87IsCreditCardPayment(r);
    if(cashOnly && !v87IsCashRelevantBhd(r)) return;
    out.push({
      dateKey:key,
      type:isCard?(isPayment?'Kredi Kartı Ödemesi':'Kredi Kartı Harcaması / Ekstre'):'Banka Hareketi',
      title:r.kisiFirma||r.aciklama||'Banka hareketi',
      gelen:Number(r.gelen||0),
      giden:Number(r.giden||0),
      detail:(r.kategori||'')+(r.aciklama?' | '+r.aciklama:''),
      source:r.kaynak||'',
      rawSource:'bhd'
    });
  });
  return out;
}
function v87ManualTypeIsCash(type){
  const t=v87NormText(type);
  // Çek kayıtları nakit akışında vade/tahsil/ödeme gününe yazıldığı için nakit kabul edilir.
  return /BANKA|TAHSILAT|ODEME|CEK ALINDI|CEK VERILDI|KREDI KARTI ODEMESI|KART ODEMESI|NAKIT/.test(t);
}
function v87ManualEventToCalendarEvent(e){
  return {
    dateKey:e.date,
    type:e.type||'Manuel',
    title:e.title||'',
    gelen:Number(e.gelen||0),
    giden:Number(e.giden||0),
    detail:e.mergedWithBank?'Banka ekstresiyle eşleşti, mükerrer sayılmadı.':'Manuel kayıt',
    source:e.mergedWithBank?'Manuel / Banka ile eşleşti':'Manuel',
    manualId:e.id,
    rawSource:'manual'
  };
}
function v87FindDuplicateImportedEvent(manualEvent, importedEvents){
  const me=v87ManualEventToCalendarEvent(manualEvent);
  const sig=v87EventDuplicateSignature(me);
  const title=me.title||me.detail||'';
  for(const be of importedEvents){
    if(v87EventDuplicateSignature(be)!==sig) continue;
    const sim=v87TextSimilarity(title, [be.title,be.detail].join(' '));
    // Tarih+tutar+yön aynıysa açıklama çok farklı olsa bile muhtemel aynı harekettir.
    if(sim>=0.18 || title.length<4) return be;
  }
  return null;
}
function v87FilterManualAgainstImported(manualEvents, importedEvents, cashOnly){
  const shown=[];
  (manualEvents||[]).forEach(e=>{
    if(cashOnly && !v87ManualTypeIsCash(e.type)) return;
    const dup=v87FindDuplicateImportedEvent(e, importedEvents);
    if(dup){
      e.mergedWithBank=true;
      e.mergedInfo='Banka ekstresiyle eşleşti: '+(dup.title||dup.detail||'');
      return; // mükerrer sayma
    }
    e.mergedWithBank=false;
    shown.push(v87ManualEventToCalendarEvent(e));
  });
  try{cashflowSaveManual();}catch(err){}
  return shown;
}
function v87PushUniqueEvent(list, seen, e){
  if(!e || !e.dateKey) return;
  e.gelen=Number(e.gelen||0); e.giden=Number(e.giden||0); e.net=e.gelen-e.giden;
  const key=[e.dateKey,e.type,e.title,v87AmountKey(e.gelen),v87AmountKey(e.giden),v87NormText(e.detail),e.rawSource||e.source||''].join('|');
  if(seen.has(key)) return;
  seen.add(key);
  list.push(e);
}

// Manuel eklemede aynı gün+tutar+yön ve benzer açıklama varsa uyar.
const v87OriginalAddCashflowManualEvent = typeof addCashflowManualEvent==='function' ? addCashflowManualEvent : null;
addCashflowManualEvent=function(){
  const date=document.getElementById('cashflowManualDate')?.value||'';
  const type=document.getElementById('cashflowManualType')?.value||'Diğer';
  const title=(document.getElementById('cashflowManualTitle')?.value||'').trim();
  const gelen=invoiceNumber(document.getElementById('cashflowManualIn')?.value||0);
  const giden=invoiceNumber(document.getElementById('cashflowManualOut')?.value||0);
  if(!date || !title){alert('Tarih ve açıklama yazmalısın.');return;}
  const candidate={id:'candidate',date,type,title,gelen,giden};
  const imported=v87ImportedBhdEvents(false);
  const dupBank=v87FindDuplicateImportedEvent(candidate,imported);
  const dupManual=(cashflowManualEvents||[]).find(x=>v87EventDuplicateSignature(v87ManualEventToCalendarEvent(x))===v87EventDuplicateSignature(v87ManualEventToCalendarEvent(candidate)) && v87TextSimilarity(x.title,title)>=0.18);
  if(dupBank){
    alert('Bu manuel hareket banka ekstresindeki bir hareketle eşleşiyor. Mükerrer olmaması için manuel kayıt eklenmedi.');
    return;
  }
  if(dupManual){
    alert('Bu manuel harekete çok benzeyen bir manuel kayıt zaten var. Mükerrer olmaması için eklenmedi.');
    return;
  }
  cashflowManualEvents.push({id:Date.now(),date,type,title,gelen,giden,mergedWithBank:false});
  cashflowSaveManual();
  document.getElementById('cashflowManualTitle').value='';
  document.getElementById('cashflowManualIn').value='';
  document.getElementById('cashflowManualOut').value='';
  cashflowSelectedKey=date;
  const [y,m]=date.split('-').map(Number); cashflowCurrentDate=new Date(y,m-1,1);
  renderAllCalendars();
};

// Genel Takvim: fatura + masraf + bütün BHD hareketleri + mükerrer olmayan manuel hareketler.
buildCashflowEvents=function(){
  const events=[]; const seen=new Set();
  function safeTitle(r, fallback){
    const firm=String((r&&r.firma)||'').trim();
    const no=String((r&&r.faturaNo)||'').trim();
    const kalem=String((r&&r.masrafKalemi)||'').trim();
    if(firm || no) return (firm||fallback)+(no?' / '+no:'');
    if(kalem) return kalem;
    return fallback;
  }
  (Array.isArray(invoicePurchaseRows)?invoicePurchaseRows:[]).filter(r=>!r.beyanHaric).forEach(r=>v87PushUniqueEvent(events,seen,{dateKey:cashflowDateKeyFromAccountingMonth(r),type:'Alış Faturası',title:safeTitle(r,'Alış faturası'),gelen:0,giden:Number(r.toplam||0),detail:'Fatura tarihi: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),source:r.kaynak||'',rawSource:'invoice_purchase'}));
  (Array.isArray(invoiceSalesRows)?invoiceSalesRows:[]).filter(r=>!r.beyanHaric).forEach(r=>v87PushUniqueEvent(events,seen,{dateKey:cashflowDateKeyFromAccountingMonth(r),type:'Satış Faturası',title:safeTitle(r,'Satış faturası'),gelen:Number(r.toplam||0),giden:0,detail:'Fatura tarihi: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),source:r.kaynak||'',rawSource:'invoice_sales'}));
  (Array.isArray(invoiceExpenseRows)?invoiceExpenseRows:[]).forEach(r=>v87PushUniqueEvent(events,seen,{dateKey:cashflowDateKeyFromAccountingMonth(r),type:'Masraf Fişi',title:safeTitle(r,'Masraf fişi'),gelen:0,giden:Number(r.toplam||0),detail:'Fiş tarihi: '+(r.tarih||'-')+' | Matrah: '+invoiceFormatTL(r.matrah||r.net||0)+' | KDV: '+invoiceFormatTL(r.kdv||0),source:r.kaynak||'',rawSource:'expense'}));
  const imported=v87ImportedBhdEvents(false);
  imported.forEach(e=>v87PushUniqueEvent(events,seen,e));
  v87FilterManualAgainstImported(cashflowManualEvents, imported, false).forEach(e=>v87PushUniqueEvent(events,seen,e));
  return events;
};

// Nakit Akış Takvimi: sadece gerçek banka nakit hareketleri + banka ekstresinde karşılığı olmayan nakit manuel hareketler.
cashOnlyBuildEvents=function(){
  const events=[]; const seen=new Set();
  const imported=v87ImportedBhdEvents(true);
  imported.forEach(e=>v87PushUniqueEvent(events,seen,e));
  v87FilterManualAgainstImported(cashflowManualEvents, imported, true).forEach(e=>v87PushUniqueEvent(events,seen,e));
  return events;
};

renderCashOnlyDayDetail=function(rows){
  const el=document.getElementById('cashOnlyDayDetail'); if(!el)return;
  const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
  let html=`<div class="cashflow-detail-title">${cashflowKeyToDisplay(cashOnlySelectedKey)} Nakit Akışı</div><div class="cashflow-detail-sub">Kredi kartı harcamaları burada gider sayılmaz. Sadece banka hesabından çıkan/giren para ve kredi kartı ödeme günü nakit hareketi kabul edilir.</div>`;
  if(!rows.length){html+='<div class="cashflow-empty">Bu gün için gerçek nakit hareketi yok. Kredi kartı harcaması varsa Genel Takvimde görünür; burada ancak kart ödemesi/banka çıkışı görünür.</div>';}
  const groups={}; rows.forEach(r=>{const k=r.type||'Diğer'; if(!groups[k])groups[k]=[]; groups[k].push(r);});
  Object.keys(groups).forEach(type=>{
    html+=`<div class="cashflow-event-group"><h4>${escapeHtml(type)}</h4>`;
    groups[type].forEach(r=>{
      html+=`<div class="cashflow-event"><div><strong>${escapeHtml(r.title||'')}</strong><small>${escapeHtml(r.detail||'')}</small><small>${escapeHtml(r.source||'')}</small>${r.manualId?`<small><button class="detail-toggle" type="button" onclick="removeCashflowManualEvent('${r.manualId}')">Sil</button></small>`:''}</div><div class="amounts">${r.gelen?`<div class="in">+ ${invoiceFormatTL(r.gelen)}</div>`:''}${r.giden?`<div class="out">- ${invoiceFormatTL(r.giden)}</div>`:''}<div class="net">${invoiceFormatTL((r.gelen||0)-(r.giden||0))}</div></div></div>`;
    });
    html+='</div>';
  });
  html+=`<div class="cashflow-balance"><h4>Günün Gerçek Nakit Akışı</h4><div class="cashflow-balance-grid"><div><span>Hesaba Giren</span><strong class="positive">${invoiceFormatTL(gelen)}</strong></div><div><span>Hesaptan Çıkan</span><strong class="negative">${invoiceFormatTL(giden)}</strong></div><div><span>Net Nakit</span><strong class="${net>=0?'positive':'negative'}">${invoiceFormatTL(net)}</strong></div><div><span>Nakit Hareket Sayısı</span><strong>${rows.length}</strong></div></div></div>`;
  el.innerHTML=html;
};

if(typeof renderAllCalendars==='function') renderAllCalendars();


/* =========================
   V88 - ÇEK VADE TARİHİ NAKİT AKIŞ FIX
   =========================
   Kural:
   - Çek Alınan: Genel Takvimde görünsün, vade/tahsil tarihinde Nakit Akış Takviminde GELEN sayılsın.
   - Çek Verilen: Genel Takvimde görünsün, vade/ödeme tarihinde Nakit Akış Takviminde GİDEN sayılsın.
   - Manuel çek kaydında tarih alanı nakit akışı için vade/tahsil/ödeme tarihi kabul edilir.
*/
function v88IsChequeType(type){
  const t=v87NormText(type);
  return /CEK/.test(t);
}
function v88IsChequeIn(type){
  const t=v87NormText(type);
  return /CEK/.test(t) && /(ALINAN|ALINDI|TAHSIL|TAHSILAT|GIRIS|GELEN)/.test(t);
}
function v88IsChequeOut(type){
  const t=v87NormText(type);
  return /CEK/.test(t) && /(VERILEN|VERILDI|ODEME|ODENECEK|CIKIS|GIDEN)/.test(t);
}
function v88ManualTypeIsCash(type){
  const t=v87NormText(type);
  if(v88IsChequeType(type)) return true;
  return /BANKA|TAHSILAT|ODEME|KREDI KARTI ODEMESI|KART ODEMESI|NAKIT/.test(t);
}
function v88ManualEventToCalendarEvent(e){
  let gelen=Number(e.gelen||0);
  let giden=Number(e.giden||0);
  let detail=e.mergedWithBank?'Banka ekstresiyle eşleşti, mükerrer sayılmadı.':'Manuel kayıt';
  if(v88IsChequeIn(e.type)){
    // Kullanıcı yanlışlıkla çıkış alanına yazdıysa bile alınan çek nakit akışında giriş sayılır.
    const amount=gelen || giden;
    gelen=Number(amount||0); giden=0;
    detail='Alınan çek: tarih alanı tahsil/vade tarihi kabul edildi. '+detail;
  }else if(v88IsChequeOut(e.type)){
    // Kullanıcı yanlışlıkla giriş alanına yazdıysa bile verilen çek nakit akışında çıkış sayılır.
    const amount=giden || gelen;
    giden=Number(amount||0); gelen=0;
    detail='Verilen çek: tarih alanı ödeme/vade tarihi kabul edildi. '+detail;
  }
  return {
    dateKey:e.date,
    type:e.type||'Manuel',
    title:e.title||'',
    gelen,
    giden,
    detail,
    source:e.mergedWithBank?'Manuel / Banka ile eşleşti':'Manuel',
    manualId:e.id,
    rawSource:'manual'
  };
}

// V87 fonksiyonlarını çek vadesi mantığıyla override et.
v87ManualTypeIsCash = v88ManualTypeIsCash;
v87ManualEventToCalendarEvent = v88ManualEventToCalendarEvent;

// Manuel ekleme override: çeklerde tarih=vade kabul edilir ve yön otomatik düzeltilir.
addCashflowManualEvent=function(){
  const date=document.getElementById('cashflowManualDate')?.value||'';
  const type=document.getElementById('cashflowManualType')?.value||'Diğer';
  const title=(document.getElementById('cashflowManualTitle')?.value||'').trim();
  let gelen=invoiceNumber(document.getElementById('cashflowManualIn')?.value||0);
  let giden=invoiceNumber(document.getElementById('cashflowManualOut')?.value||0);
  if(!date || !title){alert('Tarih ve açıklama yazmalısın. Çeklerde bu tarih vade/tahsil/ödeme tarihi kabul edilir.');return;}
  if(v88IsChequeIn(type)){
    const amount=gelen || giden;
    gelen=Number(amount||0); giden=0;
  }else if(v88IsChequeOut(type)){
    const amount=giden || gelen;
    giden=Number(amount||0); gelen=0;
  }
  const candidate={id:'candidate',date,type,title,gelen,giden};
  const imported=v87ImportedBhdEvents(false);
  const dupBank=v87FindDuplicateImportedEvent(candidate,imported);
  const dupManual=(cashflowManualEvents||[]).find(x=>v87EventDuplicateSignature(v87ManualEventToCalendarEvent(x))===v87EventDuplicateSignature(v87ManualEventToCalendarEvent(candidate)) && v87TextSimilarity(x.title,title)>=0.18);
  if(dupBank){
    alert('Bu manuel hareket banka ekstresindeki bir hareketle eşleşiyor. Mükerrer olmaması için manuel kayıt eklenmedi.');
    return;
  }
  if(dupManual){
    alert('Bu manuel harekete çok benzeyen bir manuel kayıt zaten var. Mükerrer olmaması için eklenmedi.');
    return;
  }
  cashflowManualEvents.push({id:Date.now(),date,type,title,gelen,giden,mergedWithBank:false});
  cashflowSaveManual();
  document.getElementById('cashflowManualTitle').value='';
  document.getElementById('cashflowManualIn').value='';
  document.getElementById('cashflowManualOut').value='';
  cashflowSelectedKey=date;
  cashOnlySelectedKey=date;
  const [y,m]=date.split('-').map(Number);
  cashflowCurrentDate=new Date(y,m-1,1);
  cashOnlyCurrentDate=new Date(y,m-1,1);
  renderAllCalendars();
};

renderCashOnlyDayDetail=function(rows){
  const el=document.getElementById('cashOnlyDayDetail'); if(!el)return;
  const gelen=rows.reduce((s,x)=>s+(x.gelen||0),0), giden=rows.reduce((s,x)=>s+(x.giden||0),0), net=gelen-giden;
  let html=`<div class="cashflow-detail-title">${cashflowKeyToDisplay(cashOnlySelectedKey)} Nakit Akışı</div><div class="cashflow-detail-sub">Kredi kartı harcamaları burada gider sayılmaz. Kredi kartı ödemesi, banka hesabı hareketi, çek tahsilatı ve çek ödemesi gerçek nakit hareketi kabul edilir.</div>`;
  if(!rows.length){html+='<div class="cashflow-empty">Bu gün için gerçek nakit hareketi yok. Alış/satış faturaları Genel Takvimde görünür; burada sadece fiili nakit giriş/çıkış görünür.</div>';}
  const groups={}; rows.forEach(r=>{const k=r.type||'Diğer'; if(!groups[k])groups[k]=[]; groups[k].push(r);});
  Object.keys(groups).forEach(type=>{
    html+=`<div class="cashflow-event-group"><h4>${escapeHtml(type)}</h4>`;
    groups[type].forEach(r=>{
      html+=`<div class="cashflow-event"><div><strong>${escapeHtml(r.title||'')}</strong><small>${escapeHtml(r.detail||'')}</small><small>${escapeHtml(r.source||'')}</small>${r.manualId?`<small><button class="detail-toggle" type="button" onclick="removeCashflowManualEvent('${r.manualId}')">Sil</button></small>`:''}</div><div class="amounts">${r.gelen?`<div class="in">+ ${invoiceFormatTL(r.gelen)}</div>`:''}${r.giden?`<div class="out">- ${invoiceFormatTL(r.giden)}</div>`:''}<div class="net">${invoiceFormatTL((r.gelen||0)-(r.giden||0))}</div></div></div>`;
    });
    html+='</div>';
  });
  html+=`<div class="cashflow-balance"><h4>Günün Gerçek Nakit Akışı</h4><div class="cashflow-balance-grid"><div><span>Hesaba Giren / Tahsil Edilen</span><strong class="positive">${invoiceFormatTL(gelen)}</strong></div><div><span>Hesaptan Çıkan / Ödenen</span><strong class="negative">${invoiceFormatTL(giden)}</strong></div><div><span>Net Nakit</span><strong class="${net>=0?'positive':'negative'}">${invoiceFormatTL(net)}</strong></div><div><span>Nakit Hareket Sayısı</span><strong>${rows.length}</strong></div></div></div>`;
  el.innerHTML=html;
};

if(typeof renderAllCalendars==='function') renderAllCalendars();


/* V90_ARAC_MASRAFI_YUZDE70_FIX */
