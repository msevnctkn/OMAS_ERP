(function () {
  var BHD_ROWS = 'bhdPersistentRowsV267';
  var BHD_COMPANY = 'bhdRowCompanyMapV267';
  var BHD_CAT = 'bhdRowCategoryMapV267';
  var BHD_DELETED = 'bhdDeletedRowsV272';

  function q(s, r) { return (r || document).querySelector(s); }
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) || fallback);
    } catch (err) {
      return fallback;
    }
  }
  function auth() {
    if (!window.omasSupabase || !window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) return null;
    return { client: window.omasSupabase, companyId: window.OMAS_AUTH.company.id };
  }
  function idOf(row) {
    return [row && row.kaynak, row && row.referans, row && row.sira, row && row.tarih, row && row.aciklama].join('|');
  }
  function rows() {
    var live = window.bhdRawRows && Array.isArray(window.bhdRawRows) ? window.bhdRawRows : [];
    return live.length ? live : read(BHD_ROWS, []);
  }
  function findRow(id) {
    return rows().filter(function (row) { return idOf(row) === id; })[0] || null;
  }
  function showStatus(text, ok) {
    var host = q('#bhdV267Status') || q('#omasBhdAutoSyncStatus') || q('#omasRuntimeBootstrapStatus');
    if (!host) return;
    host.textContent = text;
    host.style.color = ok === false ? '#991b1b' : '#166534';
  }
  async function updateBankRow(row, patch) {
    var a = auth();
    if (!a || !row) return false;
    var query = a.client.from('banka_hareketleri').update(patch).eq('company_id', a.companyId);
    if (row.supabaseBankMovementId) query = query.eq('id', row.supabaseBankMovementId);
    else if (row.supabaseDedupeKey) query = query.eq('dedupe_key', row.supabaseDedupeKey);
    else if (row.referans && /^BHD\|/.test(String(row.referans))) query = query.eq('dedupe_key', row.referans);
    else return false;
    var result = await query.select('id').maybeSingle();
    if (result.error) throw result.error;
    return !!result.data;
  }
  async function syncState(id) {
    var row = findRow(id);
    if (!row) return false;
    var company = read(BHD_COMPANY, {})[id] || row.sirket || row.firma || '';
    var cat = read(BHD_CAT, {})[id] || {};
    var ok = await updateBankRow(row, {
      company_code: company || null,
      category_main: cat.main || row.kategori || null,
      category_sub: cat.sub || row.altKategori || null
    });
    if (ok) showStatus('BHD satir ayari Supabase OK', true);
    return ok;
  }
  async function markDeleted(row, deleted) {
    var ok = await updateBankRow(row, { is_deleted: !!deleted });
    if (ok) showStatus(deleted ? 'BHD hareketi Supabase silindi olarak islendi.' : 'BHD hareketi Supabase geri alindi.', true);
    return ok;
  }
  async function markManyDeleted(list, deleted) {
    var ok = 0;
    var items = Array.isArray(list) ? list : [];
    for (var i = 0; i < items.length; i++) {
      try {
        if (await markDeleted(items[i], deleted)) ok++;
      } catch (err) {
        console.warn('BHD bulk state sync skipped', items[i], err);
      }
    }
    return ok;
  }
  function deletedRows() {
    return read(BHD_DELETED, []);
  }
  function paymentIdFromLink(link) {
    if (!link) return '';
    if (link.supabasePaymentId) return link.supabasePaymentId;
    if (/^sb-pay-/.test(String(link.paymentId || ''))) return String(link.paymentId).replace(/^sb-pay-/, '');
    return '';
  }
  async function deleteLinkedPaymentsForRows(list) {
    var a = auth();
    if (!a) return 0;
    var links = read('bhdPaymentLinksV273', {});
    var ids = [];
    (Array.isArray(list) ? list : []).forEach(function (row) {
      var link = links[idOf(row)];
      var pid = paymentIdFromLink(link);
      if (pid && ids.indexOf(pid) < 0) ids.push(pid);
    });
    var deleted = 0;
    for (var i = 0; i < ids.length; i++) {
      var res = await a.client.from('odemeler').delete().eq('company_id', a.companyId).eq('id', ids[i]);
      if (res.error) throw res.error;
      deleted++;
    }
    return deleted;
  }
  function rowsForGroup(groupId) {
    return rows().filter(function (row) {
      var id = row.bhdFileId || ('legacy:' + String(row.kaynak || 'Bilinmeyen kaynak'));
      return id === groupId;
    });
  }
  function scheduleStateSync(id) {
    setTimeout(function () {
      syncState(id).catch(function (err) {
        showStatus('BHD Supabase ayar hatasi: ' + (err && err.message ? err.message : String(err)), false);
      });
    }, 250);
  }

  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!target || !target.matches) return;
    var id = '';
    if (target.matches('[data-bhd-v267-company]')) id = target.getAttribute('data-bhd-v267-company') || '';
    if (target.matches('[data-bhd-v267-main]')) id = target.getAttribute('data-bhd-v267-main') || '';
    if (target.matches('[data-bhd-v267-sub]')) id = target.getAttribute('data-bhd-v267-sub') || '';
    if (id) scheduleStateSync(id);
  }, true);

  document.addEventListener('click', function (event) {
    var del = event.target && event.target.closest && event.target.closest('[data-bhd-v272-del]');
    if (del) {
      var row = findRow(del.getAttribute('data-bhd-v272-del'));
      setTimeout(function () {
        deleteLinkedPaymentsForRows([row]).then(function () { return markDeleted(row, true); }).catch(function (err) {
          showStatus('BHD Supabase silme hatasi: ' + (err && err.message ? err.message : String(err)), false);
        });
      }, 250);
      return;
    }
    var groupDel = event.target && event.target.closest && event.target.closest('[data-bhd-v276-delete]');
    if (groupDel) {
      var groupRows = rowsForGroup(groupDel.getAttribute('data-bhd-v276-delete'));
      setTimeout(function () {
        deleteLinkedPaymentsForRows(groupRows)
          .then(function () { return markManyDeleted(groupRows, true); })
          .then(function (count) { if (count) showStatus('BHD dosya grubu Supabase silindi: ' + count + ' hareket.', true); })
          .catch(function (err) {
            showStatus('BHD dosya grubu Supabase silme hatasi: ' + (err && err.message ? err.message : String(err)), false);
          });
      }, 650);
      return;
    }
    var restore = event.target && event.target.closest && event.target.closest('[data-bhd-v272-restore]');
    if (restore) {
      var item = deletedRows()[Number(restore.getAttribute('data-bhd-v272-restore'))];
      var restoreRow = item && item.row;
      setTimeout(function () {
        markDeleted(restoreRow, false).catch(function (err) {
          showStatus('BHD Supabase geri alma hatasi: ' + (err && err.message ? err.message : String(err)), false);
        });
      }, 250);
    }
  }, true);

  window.omasSyncBhdRowStateToSupabase = syncState;
  window.omasMarkBhdRowDeletedInSupabase = markDeleted;
  window.omasMarkBhdRowsDeletedInSupabase = markManyDeleted;
})();
