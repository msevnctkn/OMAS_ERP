Yükleme sırası:
1) bhd-v2-state.js
2) bhd-v2-api.js
3) bhd-v2-page.js
4) bhd-v2.css

HTML:
<link rel="stylesheet" href="assets/js/bhd-v2/bhd-v2.css">
<script src="assets/js/bhd-v2/bhd-v2-state.js"></script>
<script src="assets/js/bhd-v2/bhd-v2-api.js"></script>
<script src="assets/js/bhd-v2/bhd-v2-page.js"></script>
<div id="bhdV2Mount"></div>
<script>document.addEventListener('DOMContentLoaded',function(){OMAS.BHDV2.Page.mount('#bhdV2Mount');});</script>

Bu ilk sürüm Supabase'den kayıtları getirir, düzenler, INSERT/UPDATE/soft delete yapar.
Sonraki adım mevcut banka parser'larını adapter ile bağlamaktır.
