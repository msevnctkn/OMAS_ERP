(function () {
  var BHD_ROWS = 'bhdPersistentRowsV267';
  var LINKS = 'bhdPaymentLinksV273';

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function debugStatus(message, ok) {
    var page = q('#bhdCategoryReportPage') || q('#bhdModule') || document.body;
    var box = q('#omasBhdSupabaseStatus');
    if (!box && page) {
      box = document.createElement('div');
      box.id = 'omasBhdSupabaseStatus';
      box.style.margin = '10px 0';
      box.style.padding = '10px 12px';
      box.style.borderRadius = '8px';
      box.style.fontWeight = '800';
      box.style.border = '1px solid #dbe3ef';
      box.style.background = '#f8fafc';
      box.style.color = '#0f172a';
      var anchor = q('#bhdV267Subnav', page) || q('.v189-page-head', page) || page.firstElementChild || page;
      if (anchor && anchor.insertAdjacentElement) {
        anchor.insertAdjacentElement(anchor.id === 'bhdV267Subnav' ? 'afterend' : 'afterbegin', box);
      } else {
        page.appendChild(box);
      }
    }
    if (!box) return;
    box.textContent = message;
    box.style.background = ok ? '#dcfce7' : '#fee2e2';
    box.style.borderColor = ok ? '#86efac' : '#fecaca';
    box.style.color = ok ? '#166534' : '#991b1b';
  }

  function readJson(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value == null ? fallback : value;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function norm(value) {
    return String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function n(value) {
    var num = Number(value || 0);
    return isFinite(num) ? num : 0;
  }

  function rows() {
    var live = window.bhdRawRows && Array.isArray(window.bhdRawRows) ? window.bhdRawRows : [];
    return live.length ? live : readJson(BHD_ROWS, []);
  }

  function idOf(row) {
    return [row && row.kaynak, row && row.referans, row && row.sira, row && row.tarih, row && row.aciklama].join('|');
  }

  function findRow(id) {
    return rows().filter(function (row) { return idOf(row) === id; })[0] || null;
  }

  function movementInfo(row) {
    var outgoing = n(row && row.giden);
    var incoming = n(row && row.gelen);
    var net = n(row && row.net);
    if (outgoing > 0) return { amount: outgoing, direction: 'out', label: 'Giden ödeme', method: 'Banka Havalesi/EFT' };
    if (incoming > 0) return { amount: incoming, direction: 'in', label: 'Gelen tahsilat', method: 'Banka Tahsilatı' };
    if (net < 0) return { amount: Math.abs(net), direction: 'out', label: 'Giden ödeme', method: 'Banka Havalesi/EFT' };
    if (net > 0) return { amount: net, direction: 'in', label: 'Gelen tahsilat', method: 'Banka Tahsilatı' };
    return { amount: 0, direction: 'out', label: 'Tutar yok', method: 'Banka Hareketi' };
  }

  function paymentDate(row) {
    var s = String(row && row.tarih || '').trim();
    var m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (!m) return null;
    var year = Number(m[3]);
    if (year < 100) year += 2000;
    return year + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  }

  function requireAuth() {
    if (!window.omasSupabase) throw new Error('Supabase oturumu hazır değil. Önce giriş yap.');
    if (!window.OMAS_AUTH || !window.OMAS_AUTH.company || !window.OMAS_AUTH.company.id) {
      throw new Error('Aktif şirket bulunamadı. Önce giriş yap.');
    }
    return {
      client: window.omasSupabase,
      companyId: window.OMAS_AUTH.company.id
    };
  }

  async function ensureCari(client, companyId, firmName) {
    var name = String(firmName || '-').trim() || '-';
    var normalized = norm(name) || 'BILINMEYEN';
    var result = await client
      .from('cariler')
      .upsert({
        company_id: companyId,
        name: name,
        normalized_name: normalized,
        source: 'bhd'
      }, { onConflict: 'company_id,normalized_name' })
      .select('id,name')
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  function dedupeKey(row, firmName, movement) {
    return [
      row && row.kaynak || '',
      row && row.referans || '',
      row && row.sira || '',
      row && row.tarih || '',
      firmName || '',
      row && row.aciklama || '',
      movement.direction,
      Number(movement.amount || 0).toFixed(2)
    ].map(norm).join('|');
  }

  async function ensureBankMovement(client, companyId, cariId, row, firmName, movement) {
    var key = dedupeKey(row, firmName, movement);
    var existing = await client
      .from('banka_hareketleri')
      .select('id')
      .eq('company_id', companyId)
      .eq('dedupe_key', key)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.id) return existing.data.id;

    var insert = await client
      .from('banka_hareketleri')
      .insert({
        company_id: companyId,
        cari_id: cariId,
        bank_name: row && (row.banka || row.bankName || row.kaynak) || null,
        account_name: row && (row.hesap || row.accountName) || null,
        transaction_date: paymentDate(row) || new Date().toISOString().slice(0, 10),
        description: row && row.aciklama || '',
        party_name: firmName,
        incoming: movement.direction === 'in' ? movement.amount : 0,
        outgoing: movement.direction === 'out' ? movement.amount : 0,
        balance: row && row.bakiye != null ? n(row.bakiye) : null,
        dedupe_key: key
      })
      .select('id')
      .single();
    if (insert.error) throw insert.error;
    return insert.data.id;
  }

  async function ensurePayment(client, companyId, cariId, bankMovementId, row, firmName, movement) {
    var existing = await client
      .from('odemeler')
      .select('id')
      .eq('company_id', companyId)
      .eq('banka_hareket_id', bankMovementId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.id) return existing.data.id;

    var insert = await client
      .from('odemeler')
      .insert({
        company_id: companyId,
        cari_id: cariId,
        banka_hareket_id: bankMovementId,
        payment_date: paymentDate(row),
        method: movement.method,
        amount: movement.amount,
        direction: movement.direction,
        note: (movement.direction === 'in' ? 'BHD Tahsilat: ' : 'BHD Ödeme: ') + (row && (row.aciklama || row.kisiFirma || row.kaynak) || '')
      })
      .select('id')
      .single();
    if (insert.error) throw insert.error;
    return insert.data.id;
  }

  async function sendToSupabase(id, firmName) {
    try {
      debugStatus('Supabase ödeme kaydı hazırlanıyor...', true);
      var row = findRow(id);
      if (!row) throw new Error('Banka hareketi bulunamadı. Listeyi yenileyip tekrar dene.');
      var movement = movementInfo(row);
      if (!movement.amount) throw new Error('Bu banka hareketinde tutar bulunamadı.');
      var auth = requireAuth();
      var cari = await ensureCari(auth.client, auth.companyId, firmName);
      var bankMovementId = await ensureBankMovement(auth.client, auth.companyId, cari.id, row, firmName, movement);
      var paymentId = await ensurePayment(auth.client, auth.companyId, cari.id, bankMovementId, row, firmName, movement);

      var links = readJson(LINKS, {});
      if (!links[id]) links[id] = {};
      links[id].supabasePaymentId = paymentId;
      links[id].supabaseBankMovementId = bankMovementId;
      links[id].supabaseCariId = cari.id;
      links[id].firm = firmName;
      links[id].direction = movement.direction === 'in' ? 'incoming' : 'outgoing';
      links[id].amount = movement.amount;
      writeJson(LINKS, links);

      debugStatus('Supabase ödeme kaydı tamamlandı: ' + firmName + ' / ' + movement.amount + ' TL', true);
      if (window.omasRenderSupabaseCariCards) {
        try { window.omasRenderSupabaseCariCards(true); } catch (err) {}
      }
      window.dispatchEvent(new CustomEvent('omas:bhd-payment-synced', {
        detail: { paymentId: paymentId, bankMovementId: bankMovementId, cariId: cari.id }
      }));
      return { paymentId: paymentId, bankMovementId: bankMovementId, cariId: cari.id };
    } catch (err2) {
      debugStatus('Supabase ödeme kaydı hatası: ' + (err2 && err2.message ? err2.message : String(err2)), false);
      throw err2;
    }
  }

  function selectValueFor(id) {
    var selector = '[data-bhd-v273-firm="' + (window.CSS && CSS.escape ? CSS.escape(id) : String(id).replace(/"/g, '\\"')) + '"]';
    var select = q(selector);
    return select && select.value ? select.value : '';
  }

  async function syncExistingLocalLinks() {
    var links = readJson(LINKS, {});
    var ids = Object.keys(links || {}).filter(function (id) {
      var link = links[id] || {};
      return link.firm && !link.supabasePaymentId;
    });
    if (!ids.length) {
      alert('Supabase’e aktarılacak eski gönderilmiş ödeme bulunamadı.');
      return { synced: 0, skipped: 0 };
    }

    var synced = 0;
    var skipped = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var link = links[id] || {};
      try {
        await sendToSupabase(id, link.firm);
        synced++;
      } catch (err) {
        skipped++;
        console.warn('BHD Supabase sync skipped', id, err);
      }
    }

    alert('Eski gönderilmiş ödemeler Supabase’e aktarıldı. Başarılı: ' + synced + ', atlanan: ' + skipped + '.');
    debugStatus('Eski gönderilmiş ödemeler Supabase’e aktarıldı. Başarılı: ' + synced + ', atlanan: ' + skipped + '.', true);
    if (window.omasRenderSupabaseCariCards) {
      try { window.omasRenderSupabaseCariCards(true); } catch (err2) {}
    }
    return { synced: synced, skipped: skipped };
  }

  function installRepairButton() {
    var page = q('#bhdCategoryReportPage') || q('#bhdModule');
    if (!page || q('#omasBhdSyncOldPayments')) return;
    var anchor = q('#bhdV267Subnav', page) || q('.v189-page-head', page) || page;
    var btn = document.createElement('button');
    btn.id = 'omasBhdSyncOldPayments';
    btn.type = 'button';
    btn.textContent = 'Eski Gönderilenleri Supabase’e Aktar';
    btn.style.background = '#16a34a';
    btn.style.color = '#fff';
    btn.style.border = '0';
    btn.style.borderRadius = '8px';
    btn.style.padding = '9px 12px';
    btn.style.fontWeight = '900';
    btn.style.margin = '8px';
    btn.style.cursor = 'pointer';
    anchor.insertAdjacentElement(anchor.id === 'bhdV267Subnav' ? 'afterend' : 'afterbegin', btn);
    btn.onclick = function () {
      btn.disabled = true;
      btn.textContent = 'Supabase’e aktarılıyor...';
      syncExistingLocalLinks()
        .catch(function (err) {
          alert('Eski ödeme aktarım hatası: ' + (err && err.message ? err.message : String(err)));
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Eski Gönderilenleri Supabase’e Aktar';
        });
    };
  }

  document.addEventListener('click', function (event) {
    var send = event.target && event.target.closest && event.target.closest('[data-bhd-v273-send]');
    if (!send) return;
    var id = send.getAttribute('data-bhd-v273-send');
    var firm = selectValueFor(id);
    if (!firm) return;
    setTimeout(function () {
      sendToSupabase(id, firm)
        .then(function () {
          send.textContent = 'Supabase OK';
          send.style.background = '#16a34a';
        })
        .catch(function (err) {
          alert('Supabase ödeme kaydı hatası: ' + (err && err.message ? err.message : String(err)));
      });
    }, 120);
  }, true);

  window.omasSendBhdPaymentToSupabase = sendToSupabase;
  window.omasSyncExistingBhdPaymentsToSupabase = syncExistingLocalLinks;
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(installRepairButton, 800);
    setTimeout(installRepairButton, 1800);
  });
  document.addEventListener('click', function (event) {
    var nav = event.target && event.target.closest && event.target.closest('#bhdModule button, #bhdModule [data-bhd-v272-view], #bhdModule [data-bhd-v267-view]');
    if (nav) {
      setTimeout(installRepairButton, 200);
      setTimeout(installRepairButton, 900);
    }
  }, true);
  setInterval(function () {
    if (q('#bhdModule') && q('#bhdModule').style.display !== 'none') installRepairButton();
  }, 1500);
})();

