(function () {
  'use strict';

  // OMAS veri politikası:
  // - Banka ekstresi PDF/XLS/CSV dosyaları geçici içe aktarma kaynağıdır.
  // - Bu dosyalar Supabase Storage'a veya dosyalar tablosuna YENİDEN kaydedilmez.
  // - Daha önce kaydedilmiş bhd_statement dosyaları bu panelden görüntülenip silinebilir.
  // - Ödeme dekontları payment_receipt olarak saklanmaya devam eder.

  var BUCKET = 'omas-files';
  var SOURCE_TYPE = 'bhd_statement';

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) {
      return null;
    }
    return {
      client: window.omasSupabase,
      companyId: window.OMAS_AUTH.company.id
    };
  }

  // Eski okuyucular bu fonksiyonu çağırmaya devam edebilir.
  // Bilinçli olarak hiçbir dosya yüklenmez.
  async function archiveFilesDisabled(files) {
    var list = Array.prototype.slice.call(files || []);
    return {
      saved: 0,
      skipped: list.length,
      errors: [],
      disabled: true
    };
  }

  async function loadLegacyArchive() {
    var a = auth();
    if (!a) return [];
    var result = await a.client
      .from('dosyalar')
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .eq('company_id', a.companyId)
      .eq('source_type', SOURCE_TYPE)
      .order('created_at', { ascending: false })
      .limit(500);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function deleteLegacyFile(file) {
    var a = auth();
    if (!a || !file || !file.id) throw new Error('Silinecek eski BHD dosyası bulunamadı.');

    if (file.storage_path) {
      var removed = await a.client.storage
        .from(file.storage_bucket || BUCKET)
        .remove([file.storage_path]);
      if (removed.error) throw new Error('Storage dosyası silinemedi: ' + removed.error.message);
    }

    var deleted = await a.client
      .from('dosyalar')
      .delete()
      .eq('company_id', a.companyId)
      .eq('source_type', SOURCE_TYPE)
      .eq('id', file.id);
    if (deleted.error) throw deleted.error;
    return true;
  }

  async function deleteLegacyById(id) {
    var a = auth();
    if (!a) throw new Error('Supabase oturumu yok.');
    var found = await a.client
      .from('dosyalar')
      .select('id,file_name,storage_bucket,storage_path,source_type')
      .eq('company_id', a.companyId)
      .eq('source_type', SOURCE_TYPE)
      .eq('id', id)
      .maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) throw new Error('Eski BHD arşiv kaydı bulunamadı.');
    return deleteLegacyFile(found.data);
  }

  async function deleteAllLegacyFiles() {
    var files = await loadLegacyArchive();
    var deleted = 0;
    var errors = [];
    for (var i = 0; i < files.length; i++) {
      try {
        await deleteLegacyFile(files[i]);
        deleted++;
      } catch (err) {
        errors.push((files[i].file_name || files[i].id) + ': ' + (err && err.message ? err.message : String(err)));
      }
    }
    return { deleted: deleted, errors: errors };
  }

  function renderLegacyBody() {
    var body = q('#omasBhdLegacyArchiveBody');
    if (!body) return;
    body.textContent = 'Eski arşiv kontrol ediliyor...';

    loadLegacyArchive().then(function (files) {
      if (!body) return;
      if (!files.length) {
        body.innerHTML = '<div class="bhd-v276-empty">Eski Supabase BHD dosyası yok. Yeni ekstre dosyaları artık Supabase’e yüklenmeyecek.</div>';
        return;
      }

      body.innerHTML = '<div class="bhd-v276-archive-list">' + files.map(function (file) {
        return '<div class="bhd-v276-archive-row"><div><strong>' + esc(file.file_name || '-') + '</strong><small>' +
          esc((file.created_at || '').slice(0, 19).replace('T', ' ')) + ' | ' +
          Number(file.size_bytes || 0).toLocaleString('tr-TR') + ' byte | Eski kayıt</small></div>' +
          '<button type="button" class="bhd-v276-btn danger" data-omas-bhd-legacy-delete="' + esc(file.id) + '">Eski Dosyayı Sil</button></div>';
      }).join('') + '</div>';
    }).catch(function (err) {
      if (body) body.textContent = 'Eski BHD arşivi okunamadı: ' + (err && err.message ? err.message : String(err));
    });
  }

  function installPolicyPanel() {
    var page = q('#bhdCategoryReportPage');
    if (!page || !q('[data-bhd-v276-view="memory"].active')) return;
    if (q('#omasBhdStoragePolicy')) return;

    var box = document.createElement('details');
    box.id = 'omasBhdStoragePolicy';
    box.className = 'bhd-v276-archive';
    box.open = true;
    box.innerHTML =
      '<summary>Dosya saklama politikası</summary>' +
      '<div style="padding:10px 0;line-height:1.55">' +
        '<strong>Banka ekstresi PDF/XLS/CSV dosyaları artık Supabase’e kaydedilmez.</strong><br>' +
        'Yalnızca düzenlenip onaylanan banka hareketleri veritabanında tutulur. ' +
        'Ödeme dekontları PDF/JPG/PNG olarak saklanmaya devam eder.' +
      '</div>' +
      '<div class="bhd-v276-tools" style="margin:10px 0">' +
        '<button type="button" class="bhd-v276-btn" data-omas-bhd-legacy-refresh>Eski Listeyi Yenile</button>' +
        '<button type="button" class="bhd-v276-btn danger" data-omas-bhd-legacy-delete-all>Tüm Eski BHD Dosyalarını Sil</button>' +
      '</div>' +
      '<div id="omasBhdLegacyArchiveBody">Yükleniyor...</div>';

    page.insertBefore(box, page.children[2] || page.firstChild);
    renderLegacyBody();
  }

  document.addEventListener('click', function (event) {
    var one = event.target && event.target.closest && event.target.closest('[data-omas-bhd-legacy-delete]');
    if (one) {
      event.preventDefault();
      event.stopPropagation();
      if (!confirm('Bu eski BHD ekstre dosyası Supabase Storage ve dosyalar tablosundan silinsin mi? Banka hareketlerine dokunulmaz.')) return false;
      var id = one.getAttribute('data-omas-bhd-legacy-delete');
      one.disabled = true;
      one.textContent = 'Siliniyor...';
      deleteLegacyById(id).then(renderLegacyBody).catch(function (err) {
        alert('Eski BHD dosyası silinemedi: ' + (err && err.message ? err.message : String(err)));
        renderLegacyBody();
      });
      return false;
    }

    var all = event.target && event.target.closest && event.target.closest('[data-omas-bhd-legacy-delete-all]');
    if (all) {
      event.preventDefault();
      event.stopPropagation();
      if (!confirm('Tüm eski BHD ekstre dosyaları silinsin mi? Banka hareketleri ve ödeme dekontları korunur.')) return false;
      all.disabled = true;
      all.textContent = 'Siliniyor...';
      deleteAllLegacyFiles().then(function (result) {
        all.disabled = false;
        all.textContent = 'Tüm Eski BHD Dosyalarını Sil';
        if (result.errors.length) alert('Bazı eski dosyalar silinemedi: ' + result.errors.join(' | '));
        else alert(result.deleted + ' eski BHD dosyası silindi.');
        renderLegacyBody();
      }).catch(function (err) {
        all.disabled = false;
        all.textContent = 'Tüm Eski BHD Dosyalarını Sil';
        alert('Eski BHD arşivi temizlenemedi: ' + (err && err.message ? err.message : String(err)));
        renderLegacyBody();
      });
      return false;
    }

    var refresh = event.target && event.target.closest && event.target.closest('[data-omas-bhd-legacy-refresh]');
    if (refresh) {
      event.preventDefault();
      event.stopPropagation();
      renderLegacyBody();
      return false;
    }
  }, true);

  // Geriye dönük uyumluluk: okuyucular bu fonksiyonu çağırsa bile upload yapılmaz.
  window.omasArchiveBhdFilesToSupabase = archiveFilesDisabled;
  window.omasInstallBhdSupabaseArchivePanel = installPolicyPanel;
  window.omasRefreshBhdSupabaseArchivePanel = renderLegacyBody;

  document.addEventListener('click', function () {
    setTimeout(installPolicyPanel, 250);
  }, true);
  setInterval(installPolicyPanel, 1500);
})();
