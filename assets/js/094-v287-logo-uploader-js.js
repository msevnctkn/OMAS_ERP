(function(){
  var KEY='omasUserLogoV287';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function read(){try{return localStorage.getItem(KEY)||''}catch(e){return ''}}
  function write(v){try{if(v)localStorage.setItem(KEY,v);else localStorage.removeItem(KEY)}catch(e){alert('Logo hafızaya kaydedilemedi. Dosya çok büyük olabilir.');}}
  function logoImg(cls){var img=document.createElement('img');img.className='v287-brand-logo '+(cls||'');img.alt='ÖMAS Logo';img.src=read();return img}
  function applyFavicon(data){var link=q('link[rel="icon"],link[rel="shortcut icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}link.href=data||'omas-logo.png'}
  function applyLogo(){
    var data=read();document.body.classList.toggle('v287-has-logo',!!data);
    qa('.v287-brand-logo').forEach(function(img){if(data)img.src=data;else img.remove()});
    if(data){var h=q('.header h1');if(h&&!q('.v287-brand-logo',h))h.insertBefore(logoImg(),h.firstChild);qa('.module-title h2').forEach(function(t){if(!q('.v287-brand-logo',t))t.insertBefore(logoImg('small'),t.firstChild)});var top=q('.top-menu-logo');if(top)top.src=data}
    applyFavicon(data);
  }
  function ensureTools(){
    var head=q('.header');if(!head||q('#v287LogoTools'))return;
    var box=document.createElement('div');box.id='v287LogoTools';box.className='v287-logo-tools';box.innerHTML='<input id="v287LogoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"><button class="v287-logo-btn primary" type="button" id="v287LogoPick">Logo Yükle</button><button class="v287-logo-btn danger" type="button" id="v287LogoClear">Logoyu Sil</button>';
    head.appendChild(box);
    q('#v287LogoPick').onclick=function(){var f=q('#v287LogoFile');if(f)f.click()};
    q('#v287LogoClear').onclick=function(){write('');applyLogo()};
    q('#v287LogoFile').onchange=function(){var file=this.files&&this.files[0];if(!file)return;if(!/^image\//.test(file.type)){alert('PNG, JPG, WEBP veya SVG logo seç.');return}var fr=new FileReader();fr.onload=function(){write(fr.result);applyLogo()};fr.readAsDataURL(file)};
  }
  document.addEventListener('DOMContentLoaded',function(){ensureTools();applyLogo();setTimeout(applyLogo,500);setTimeout(applyLogo,1500)});
  document.addEventListener('click',function(){setTimeout(function(){ensureTools();applyLogo()},80)},true);
  setInterval(function(){if(q('.module.active')||q('#home'))applyLogo()},1500);
  window.v287ApplyLogo=applyLogo;
})();
