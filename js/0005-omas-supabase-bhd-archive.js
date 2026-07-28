(function () {
  var BUCKET = 'omas-files';

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safeFileName(name) {
    return String(name || 'dosya')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/[^A-Za-z0-9._ -]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 120) || 'dosya';
  }

  async function sha256File(file) {
    if (!window.crypto || !window.crypto.subtle || !file.arrayBuffer) {
      return 'sha-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }
    var hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.prototype.map.call(new Uint8Array(hash), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }

  async function archiveFile(file) {
    var a = auth();
    if (!a || !file) return null;
    var sha = await sha256File(file);
    var existing = await a.client
      .from('dosyalar')
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .eq('company_id', a.companyId)
      .eq('sha256', sha)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.id) return existing.data;

    var originalName = file.name || 'bhd-dosyasi';
    var path = a.companyId + '/bhd/' + Date.now() + '-' + safeFileName(originalName);
    var upload = await a.client.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });
    if (upload.error) throw new Error('BHD dosyası Storage kaydı: ' + upload.error.message);

    var inserted = await a.client
      .from('dosyalar')
      .insert({
        company_id: a.companyId,
        storage_bucket: BUCKET,
        storage_path: path,
        file_name: originalName,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size || 0,
        sha256: sha,
        source_type: 'bhd_statement'
      })
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .single();
    if (inserted.error) throw inserted.error;
    return inserted.data;
  }

  async function archiveFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    var saved = 0;
    var skipped = 0;
    var errors = [];
    for (var i = 0; i < list.length; i++) {
      try {
        var row = await archiveFile(list[i]);
        if (row) saved++;
        else skipped++;
      } catch (err) {
        errors.push((list[i] && list[i].name ? list[i].name + ': ' : '') + (err && err.message ? err.message : String(err)));
      }
    }
    return { saved: saved, skipped: skipped, errors: errors };
  }

  async function loadArchive() {
    var a = auth();
    if (!a) return [];
    var result = await a.client
      .from('dosyalar')
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .eq('company_id', a.companyId)
      .eq('source_type', 'bhd_statement')
      .order('created_at', { ascending: false })
      .limit(300);
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function deleteArchiveFile(file) {
    var a = auth();
    if (!a || !file || !file.id) throw new Error('Silinecek Supabase dosyası bulunamadı.');
    var bucket = file.storage_bucket || BUCKET;
    if (file.storage_path) {
      var removed = await a.client.storage.from(bucket).remove([file.storage_path]);
      if (removed.error) throw new Error('Storage dosyası silinemedi: ' + removed.error.message);
    }
    var deleted = await a.client
      .from('dosyalar')
      .delete()
      .eq('company_id', a.companyId)
      .eq('id', file.id);
    if (deleted.error) throw deleted.error;
    return true;
  }

  async function deleteArchiveById(id) {
    var a = auth();
    if (!a) throw new Error('Supabase oturumu yok.');
    var found = await a.client
      .from('dosyalar')
      .select('id,file_name,storage_bucket,storage_path,source_type')
      .eq('company_id', a.companyId)
      .eq('source_type', 'bhd_statement')
      .eq('id', id)
      .maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) throw new Error('Dosya Supabase arşivinde bulunamadı.');
    return deleteArchiveFile(found.data);
  }

  async function deleteAllArchiveFiles() {
    var files = await loadArchive();
    var ok = 0;
    var errors = [];
    for (var i = 0; i < files.length; i++) {
      try {
        await deleteArchiveFile(files[i]);
        ok++;
      } catch (err) {
        errors.push((files[i].file_name || files[i].id) + ': ' + (err && err.message ? err.message : String(err)));
      }
    }
    return { deleted: ok, errors: errors };
  }

  function renderArchiveBody() {
    var body = q('#omasBhdSupabaseArchiveBody');
    if (!body) return;
    body.textContent = 'Yükleniyor...';
    loadArchive()
      .then(function (files) {
        if (!body) return;
        body.innerHTML = files.length ? '<div class="bhd-v276-archive-list">' + files.map(function (file) {
          return '<div class="bhd-v276-archive-row"><div><strong>' + esc(file.file_name || '-') + '</strong><small>' +
            esc((file.created_at || '').slice(0, 19).replace('T', ' ')) + ' | ' +
            Number(file.size_bytes || 0).toLocaleString('tr-TR') + ' byte</small></div><button type="button" class="bhd-v276-btn danger" data-omas-bhd-supa-delete="' + esc(file.id) + '">Supabase Dosyasını Sil</button></div>';
        }).join('') + '</div>' : '<div class="bhd-v276-empty">Supabase arşivinde BHD dosyası yok.</div>';
      })
      .catch(function (err) {
        if (body) body.textContent = 'Supabase BHD arşivi okunamadı: ' + (err && err.message ? err.message : String(err));
      });
  }

  function installArchivePanel() {
    var page = q('#bhdCategoryReportPage');
    if (!page || !q('[data-bhd-v276-view="memory"].active')) return;
    if (q('#omasBhdSupabaseArchive')) return;
    var box = document.createElement('details');
    box.id = 'omasBhdSupabaseArchive';
    box.className = 'bhd-v276-archive';
    box.open = true;
    box.innerHTML = '<summary>Supabase kayıtlı BHD dosyaları</summary><div class="bhd-v276-tools" style="margin:10px 0"><button type="button" class="bhd-v276-btn" data-omas-bhd-supa-refresh>Supabase Listeyi Yenile</button><button type="button" class="bhd-v276-btn danger" data-omas-bhd-supa-delete-all>Tüm Supabase BHD Dosyalarını Sil</button></div><div id="omasBhdSupabaseArchiveBody">Yükleniyor...</div>';
    page.insertBefore(box, page.children[2] || page.firstChild);
    renderArchiveBody();
  }

  document.addEventListener('click', function (ev) {
    var del = ev.target && ev.target.closest && ev.target.closest('[data-omas-bhd-supa-delete]');
    if (del) {
      ev.preventDefault();
      ev.stopPropagation();
      var id = del.getAttribute('data-omas-bhd-supa-delete');
      if (!confirm('Bu BHD dosyası Supabase arşivinden silinsin mi?')) return false;
      del.disabled = true;
      del.textContent = 'Siliniyor...';
      deleteArchiveById(id).then(renderArchiveBody).catch(function (err) {
        alert('Supabase dosyası silinemedi: ' + (err && err.message ? err.message : String(err)));
        renderArchiveBody();
      });
      return false;
    }

    var all = ev.target && ev.target.closest && ev.target.closest('[data-omas-bhd-supa-delete-all]');
    if (all) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!confirm('Supabase arşivindeki tüm BHD dosyaları silinsin mi? Yerel aktif hareketlere dokunmaz.')) return false;
      all.disabled = true;
      all.textContent = 'Siliniyor...';
      deleteAllArchiveFiles().then(function (res) {
        if (res.errors && res.errors.length) alert('Bazı dosyalar silinemedi: ' + res.errors.join(' | '));
        renderArchiveBody();
      }).catch(function (err) {
        alert('Supabase BHD arşivi silinemedi: ' + (err && err.message ? err.message : String(err)));
        renderArchiveBody();
      });
      return false;
    }

    var ref = ev.target && ev.target.closest && ev.target.closest('[data-omas-bhd-supa-refresh]');
    if (ref) {
      ev.preventDefault();
      ev.stopPropagation();
      renderArchiveBody();
      return false;
    }
  }, true);

  window.omasArchiveBhdFilesToSupabase = archiveFiles;
  window.omasInstallBhdSupabaseArchivePanel = installArchivePanel;
  window.omasRefreshBhdSupabaseArchivePanel = renderArchiveBody;

  document.addEventListener('click', function () { setTimeout(installArchivePanel, 250); }, true);
  setInterval(installArchivePanel, 1500);
})();
