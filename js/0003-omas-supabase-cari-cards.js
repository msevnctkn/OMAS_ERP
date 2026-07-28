(function () {
  var state = {
    term: '',
    selectedCariId: '',
    tab: 'ozet',
    cache: null,
    loading: false
  };

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function money(value) {
    return Number(value || 0).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
    if (typeof value === 'string') {
      value = value.indexOf(',') > -1 ? value.replace(/\./g, '').replace(',', '.') : value;
    }
    var num = Number(value || 0);
    return isFinite(num) ? num : 0;
  }

  function dateValue(value) {
    return String(value || '').slice(0, 10);
  }

  function safeFileName(name) {
    return String(name || 'dosya')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ıİ]/g, 'i')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[şŞ]/g, 's')
      .replace(/[öÖ]/g, 'o')
      .replace(/[çÇ]/g, 'c')
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

  async function fetchAll(table, columns, companyId) {
    var all = [];
    var from = 0;
    var step = 1000;
    while (true) {
      var result = await window.omasSupabase
        .from(table)
        .select(columns)
        .eq('company_id', companyId)
        .range(from, from + step - 1);
      if (result.error) throw result.error;
      var rows = result.data || [];
      all = all.concat(rows);
      if (rows.length < step) break;
      from += step;
    }
    return all;
  }

  async function loadData(force) {
    if (state.cache && !force) return state.cache;
    var auth = requireAuth();
    var cariler = await fetchAll('cariler', 'id,name,normalized_name,tax_no,email,phone,address,notes,source,created_at', auth.companyId);
    var faturalar = await fetchAll('faturalar', 'id,cari_id,invoice_no,uuid,issue_date,supplier_name,currency,exchange_rate,matrah,kdv,total,direction,created_at', auth.companyId);
    var kalemler = await fetchAll('fatura_kalemleri', 'id,fatura_id,cari_id,line_no,item_name,quantity,unit,unit_price,currency,matrah,kdv_rate,kdv,total,dedupe_key,proje_id,malzeme_id', auth.companyId);
    var odemeler = await fetchAll('odemeler', 'id,cari_id,dosya_id,payment_date,method,amount,direction,note,created_at', auth.companyId);
    var dosyalar = await fetchAll('dosyalar', 'id,file_name,mime_type,size_bytes,source_type,created_at', auth.companyId);

    state.cache = {
      cariler: cariler,
      faturalar: faturalar,
      kalemler: kalemler,
      odemeler: odemeler,
      dosyalar: dosyalar,
      loadedAt: new Date()
    };
    return state.cache;
  }

  function buildCariRows(data) {
    var byCari = {};
    data.cariler.forEach(function (cari) {
      byCari[cari.id] = {
        cari: cari,
        invoiceCount: 0,
        lineCount: 0,
        buyTotal: 0,
        matrah: 0,
        kdv: 0,
        paidOut: 0,
        paidIn: 0
      };
    });

    data.faturalar.forEach(function (inv) {
      if (!inv.cari_id) return;
      if (!byCari[inv.cari_id]) return;
      byCari[inv.cari_id].invoiceCount++;
      byCari[inv.cari_id].buyTotal += n(inv.total);
      byCari[inv.cari_id].matrah += n(inv.matrah);
      byCari[inv.cari_id].kdv += n(inv.kdv);
    });

    data.kalemler.forEach(function (line) {
      if (line.cari_id && byCari[line.cari_id]) byCari[line.cari_id].lineCount++;
    });

    data.odemeler.forEach(function (pay) {
      if (!pay.cari_id || !byCari[pay.cari_id]) return;
      if (pay.direction === 'in') byCari[pay.cari_id].paidIn += n(pay.amount);
      else byCari[pay.cari_id].paidOut += n(pay.amount);
    });

    return Object.values(byCari).sort(function (a, b) {
      return b.buyTotal - a.buyTotal || String(a.cari.name).localeCompare(String(b.cari.name), 'tr');
    });
  }

  function selectedData(data) {
    var rows = buildCariRows(data);
    var term = norm(state.term);
    if (term) {
      rows = rows.filter(function (row) {
        return norm(row.cari.name).indexOf(term) > -1 || norm(row.cari.tax_no).indexOf(term) > -1;
      });
    }
    if (!state.selectedCariId && rows[0]) state.selectedCariId = rows[0].cari.id;
    var selected = rows.find(function (row) { return row.cari.id === state.selectedCariId; }) || rows[0] || null;
    if (selected) state.selectedCariId = selected.cari.id;
    return { rows: rows, selected: selected };
  }

  function table(rows, columns, emptyText) {
    if (!rows.length) return '<div class="v282-empty">' + esc(emptyText || 'Kayıt yok.') + '</div>';
    return '<div class="v282-table-wrap"><table class="v282-table"><thead><tr>' +
      columns.map(function (col) { return '<th' + (col.num ? ' class="amount"' : '') + '>' + esc(col.h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' + columns.map(function (col) {
          return '<td' + (col.num ? ' class="amount"' : '') + '>' + col.v(row) + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function tabs() {
    var list = [
      ['ozet', 'Özet'],
      ['faturalar', 'Faturalar'],
      ['kalemler', 'Kalemler'],
      ['odemeler', 'Ödemeler']
    ];
    return '<div class="v282-tabs">' + list.map(function (tab) {
      return '<button type="button" class="' + (state.tab === tab[0] ? 'active' : '') + '" data-omas-cari-tab="' + tab[0] + '">' + tab[1] + '</button>';
    }).join('') + '</div>';
  }

  function fileForPayment(data, payment) {
    if (!payment || !payment.dosya_id) return null;
    return (data.dosyalar || []).find(function (file) { return file.id === payment.dosya_id; }) || null;
  }

  async function savePaymentFile(file, paymentId) {
    var auth = requireAuth();
    var bucket = 'omas-files';
    var sha = await sha256File(file);
    var existing = await auth.client
      .from('dosyalar')
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .eq('company_id', auth.companyId)
      .eq('sha256', sha)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data && existing.data.id) return existing.data;

    var originalName = file.name || 'odeme-goruntu';
    var cleanName = safeFileName(originalName);
    var cleanPaymentId = safeFileName(paymentId || 'manual');
    var path = auth.companyId + '/payments/' + cleanPaymentId + '/' + Date.now() + '-' + cleanName;
    var upload = await auth.client.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });
    if (upload.error) {
      throw new Error('Storage yükleme hatası: ' + upload.error.message);
    }

    var result = await auth.client
      .from('dosyalar')
      .insert({
        company_id: auth.companyId,
        storage_bucket: bucket,
        storage_path: path,
        file_name: originalName,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size || 0,
        sha256: sha,
        source_type: 'payment_receipt'
      })
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .single();
    if (result.error) throw result.error;
    return result.data;
  }

  async function updatePayment(paymentId, values, file) {
    var auth = requireAuth();
    var patch = {
      cari_id: values.cari_id || null,
      payment_date: values.payment_date || null,
      method: values.method || 'banka',
      amount: n(values.amount),
      direction: values.direction === 'in' ? 'in' : 'out',
      note: values.note || ''
    };
    var savedFile = null;
    if (file) {
      savedFile = await savePaymentFile(file, paymentId);
      patch.dosya_id = savedFile.id;
    }
    var result = await auth.client
      .from('odemeler')
      .update(patch)
      .eq('company_id', auth.companyId)
      .eq('id', paymentId)
      .select('id,cari_id,dosya_id,payment_date,method,amount,direction,note,created_at')
      .single();
    if (result.error) throw result.error;
    var data = state.cache;
    if (data) {
      data.odemeler = data.odemeler.map(function (pay) { return pay.id === paymentId ? result.data : pay; });
      if (savedFile && !data.dosyalar.some(function (f) { return f.id === savedFile.id; })) data.dosyalar.push(savedFile);
      state.selectedCariId = result.data.cari_id || state.selectedCariId;
      renderLoaded(data);
    } else {
      await render(true);
    }
    return result.data;
  }

  async function deletePayment(paymentId) {
    var auth = requireAuth();
    var result = await auth.client
      .from('odemeler')
      .delete()
      .eq('company_id', auth.companyId)
      .eq('id', paymentId);
    if (result.error) throw result.error;
    if (state.cache) {
      state.cache.odemeler = (state.cache.odemeler || []).filter(function (pay) { return pay.id !== paymentId; });
      renderLoaded(state.cache);
    } else {
      await render(true);
    }
    try { if (window.omasLoadRuntimeFromSupabase) window.omasLoadRuntimeFromSupabase(); } catch (e) {}
    return true;
  }

  function openDataUrl(file, win) {
    if (!file || !file.storage_path) return alert('Dosya verisi bulunamadı.');
    win = win || window.open('');
    if (!win) {
      var a = document.createElement('a');
      a.href = file.storage_path;
      a.download = file.file_name || 'odeme-goruntu';
      a.click();
      return;
    }
    if (String(file.mime_type || '').indexOf('image/') === 0) {
      win.document.write('<title>' + esc(file.file_name || 'Görüntü') + '</title><img src="' + file.storage_path + '" style="max-width:100%;height:auto;display:block;margin:0 auto">');
    } else {
      win.location.href = file.storage_path;
    }
  }

  async function openPaymentFile(fileId) {
    var win = window.open('');
    var auth = requireAuth();
    var cached = state.cache && (state.cache.dosyalar || []).find(function (item) { return item.id === fileId; });
    var result = await auth.client
      .from('dosyalar')
      .select('id,file_name,mime_type,size_bytes,storage_bucket,storage_path,source_type,created_at')
      .eq('company_id', auth.companyId)
      .eq('id', fileId)
      .single();
    if (result.error) throw result.error;
    var file = result.data;
    if (state.cache) {
      state.cache.dosyalar = (state.cache.dosyalar || []).map(function (item) {
        return item.id === fileId ? file : item;
      });
    }
    if (file.storage_bucket === 'db-dataurl' || String(file.storage_path || '').indexOf('data:') === 0) {
      return openDataUrl(file, win);
    }
    var signed = await auth.client.storage
      .from(file.storage_bucket || 'omas-files')
      .createSignedUrl(file.storage_path, 60 * 10);
    if (signed.error) throw signed.error;
    if (win) {
      win.location.href = signed.data.signedUrl;
    } else {
      window.open(signed.data.signedUrl, '_blank');
    }
  }

  function openPaymentEditor(paymentId) {
    var data = state.cache;
    if (!data) return;
    var pay = data.odemeler.find(function (item) { return item.id === paymentId; });
    if (!pay) return alert('Ödeme kaydı bulunamadı.');
    var modal = q('#omasPaymentEditModal');
    if (modal) modal.remove();
    var cariOptions = (data.cariler || []).slice().sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
    }).map(function (cari) {
      return '<option value="' + esc(cari.id) + '"' + (cari.id === pay.cari_id ? ' selected' : '') + '>' + esc(cari.name || '-') + '</option>';
    }).join('');
    modal = document.createElement('div');
    modal.id = 'omasPaymentEditModal';
    modal.className = 'v282-pay-modal';
    modal.innerHTML =
      '<div class="v282-pay-card">' +
        '<div class="v282-pay-head"><h3>Ödeme Düzenle</h3><button type="button" data-omas-pay-close>×</button></div>' +
        '<label>Cari<select id="omasPayCari">' + cariOptions + '</select></label>' +
        '<label>Ödeme/Tahsilat Adı<input id="omasPayNote" value="' + esc(pay.note || '') + '" placeholder="Açıklama / isim"></label>' +
        '<div class="v282-pay-grid">' +
          '<label>Tarih<input id="omasPayDate" type="date" value="' + esc(dateValue(pay.payment_date)) + '"></label>' +
          '<label>Yön<select id="omasPayDirection"><option value="out"' + (pay.direction !== 'in' ? ' selected' : '') + '>Ödeme</option><option value="in"' + (pay.direction === 'in' ? ' selected' : '') + '>Tahsilat</option></select></label>' +
          '<label>Yöntem<input id="omasPayMethod" value="' + esc(pay.method || '') + '" placeholder="Banka / Nakit / Kart"></label>' +
          '<label>Tutar<input id="omasPayAmount" inputmode="decimal" value="' + esc(String(pay.amount || 0).replace('.', ',')) + '"></label>' +
        '</div>' +
        '<label>Görüntü / Makbuz<input id="omasPayFile" type="file" accept="image/*,application/pdf"></label>' +
        '<div class="v282-pay-actions"><button type="button" class="primary" data-omas-pay-save="' + esc(pay.id) + '">Kaydet</button><button type="button" data-omas-pay-close>Vazgeç</button></div>' +
      '</div>';
    document.body.appendChild(modal);
  }

  function detailPanel(data, selected) {
    if (!selected) return '<div class="v282-empty">Cari seç.</div>';
    var cariId = selected.cari.id;
    var invoices = data.faturalar
      .filter(function (inv) { return inv.cari_id === cariId; })
      .sort(function (a, b) { return String(b.issue_date || '').localeCompare(String(a.issue_date || '')); });
    var lines = data.kalemler
      .filter(function (line) { return line.cari_id === cariId; })
      .sort(function (a, b) { return String(b.id).localeCompare(String(a.id)); });
    var pays = data.odemeler
      .filter(function (pay) { return pay.cari_id === cariId; })
      .sort(function (a, b) { return String(b.payment_date || '').localeCompare(String(a.payment_date || '')); });

    if (state.tab === 'faturalar') {
      return table(invoices, [
        { h: 'Tarih', v: function (r) { return esc(r.issue_date || ''); } },
        { h: 'Fatura No', v: function (r) { return esc(r.invoice_no || ''); } },
        { h: 'Matrah', num: true, v: function (r) { return money(r.matrah); } },
        { h: 'KDV', num: true, v: function (r) { return money(r.kdv); } },
        { h: 'KDV Dahil', num: true, v: function (r) { return '<strong>' + money(r.total) + '</strong>'; } },
        { h: 'Döviz', v: function (r) { return esc(r.currency || 'TRY'); } }
      ], 'Fatura kaydı yok.');
    }

    if (state.tab === 'kalemler') {
      return table(lines, [
        { h: 'Fatura', v: function (r) {
          var inv = invoices.find(function (x) { return x.id === r.fatura_id; });
          return esc(inv ? inv.invoice_no : '');
        } },
        { h: 'Kalem', v: function (r) { return esc(r.item_name || ''); } },
        { h: 'Miktar', num: true, v: function (r) { return money(r.quantity) + ' ' + esc(r.unit || ''); } },
        { h: 'Birim', num: true, v: function (r) { return money(r.unit_price) + ' ' + esc(r.currency || 'TRY'); } },
        { h: 'Matrah', num: true, v: function (r) { return money(r.matrah); } },
        { h: 'KDV', num: true, v: function (r) { return money(r.kdv); } },
        { h: 'KDV Dahil', num: true, v: function (r) { return '<strong>' + money(r.total) + '</strong>'; } }
      ], 'Kalem kaydı yok.');
    }

    if (state.tab === 'odemeler') {
      return table(pays, [
        { h: 'Tarih', v: function (r) { return esc(r.payment_date || ''); } },
        { h: 'Cari', v: function (r) {
          var cari = data.cariler.find(function (c) { return c.id === r.cari_id; });
          return esc(cari ? cari.name : '');
        } },
        { h: 'Yön', v: function (r) { return r.direction === 'in' ? 'Tahsilat' : 'Ödeme'; } },
        { h: 'Yöntem', v: function (r) { return esc(r.method || ''); } },
        { h: 'Tutar', num: true, v: function (r) { return money(r.amount); } },
        { h: 'Not', v: function (r) { return esc(r.note || ''); } },
        { h: 'Görüntü', v: function (r) {
          var file = fileForPayment(data, r);
          return file ? '<button type="button" class="v282-mini-btn" data-omas-pay-file="' + esc(file.id) + '">' + esc(file.file_name || 'Aç') + '</button>' : '-';
        } },
        { h: 'İşlem', v: function (r) {
          return '<button type="button" class="v282-mini-btn primary" data-omas-pay-edit="' + esc(r.id) + '">Düzenle</button> ' +
            '<button type="button" class="v282-mini-btn" style="background:#991b1b;color:#fff;border-color:#991b1b" data-omas-pay-delete="' + esc(r.id) + '">Sil</button>';
        } }
      ], 'Ödeme kaydı yok.');
    }

    var byItem = {};
    lines.forEach(function (line) {
      var key = norm(line.item_name) || line.id;
      if (!byItem[key]) byItem[key] = { name: line.item_name, count: 0, qty: 0, total: 0 };
      byItem[key].count++;
      byItem[key].qty += n(line.quantity);
      byItem[key].total += n(line.total);
    });

    return '<div class="v282-note"><strong>Supabase Cari:</strong> ' + esc(selected.cari.name) +
      (selected.cari.tax_no ? ' | Vergi No: ' + esc(selected.cari.tax_no) : '') +
      (selected.cari.phone ? ' | Tel: ' + esc(selected.cari.phone) : '') +
      '</div>' +
      table(Object.values(byItem).sort(function (a, b) { return b.total - a.total; }).slice(0, 60), [
        { h: 'Malzeme / Kalem', v: function (r) { return esc(r.name); } },
        { h: 'Satır', num: true, v: function (r) { return r.count; } },
        { h: 'Miktar', num: true, v: function (r) { return money(r.qty); } },
        { h: 'Toplam', num: true, v: function (r) { return '<strong>' + money(r.total) + '</strong>'; } }
      ], 'Özet kalem yok.');
  }

  function renderLoaded(data) {
    var host = q('#v282CariHost');
    if (!host) return;
    var activeId = document.activeElement && document.activeElement.id;
    var caretStart = 0;
    var caretEnd = 0;
    if (activeId === 'omasSupaCariSearch') {
      try {
        caretStart = document.activeElement.selectionStart || 0;
        caretEnd = document.activeElement.selectionEnd || caretStart;
      } catch (err) {}
    }
    var view = selectedData(data);
    var rows = view.rows;
    var selected = view.selected;
    var totalBuy = rows.reduce(function (sum, row) { return sum + row.buyTotal; }, 0);
    var totalInvoices = rows.reduce(function (sum, row) { return sum + row.invoiceCount; }, 0);
    var totalLines = rows.reduce(function (sum, row) { return sum + row.lineCount; }, 0);
    var paid = selected ? selected.paidOut : 0;
    var balance = selected ? selected.buyTotal - paid : 0;

    host.innerHTML =
      '<div class="v282-shell omas-supa-cari">' +
        '<aside class="v282-side">' +
          '<div class="v282-search">' +
            '<input id="omasSupaCariSearch" placeholder="Firma adı ara" value="' + esc(state.term) + '">' +
            '<button class="primary-button" type="button" id="omasSupaCariRefresh">Yenile</button>' +
          '</div>' +
          '<div class="v282-note">Supabase verisi · Cari: <strong>' + rows.length + '</strong> · Fatura: <strong>' + totalInvoices + '</strong> · Kalem: <strong>' + totalLines + '</strong></div>' +
          '<div class="v282-list">' +
            (rows.length ? rows.slice(0, 220).map(function (row) {
              return '<button type="button" class="v282-item ' + (selected && row.cari.id === selected.cari.id ? 'active' : '') + '" data-omas-supa-cari="' + esc(row.cari.id) + '">' +
                esc(row.cari.name) +
                '<small>Alış ' + money(row.buyTotal) + ' TL | Fatura ' + row.invoiceCount + ' | Kalem ' + row.lineCount + '</small>' +
              '</button>';
            }).join('') : '<div class="v282-empty">Cari bulunamadı.</div>') +
          '</div>' +
        '</aside>' +
        '<main class="v282-main">' +
          (selected ? '<div class="v282-head"><div><h3>' + esc(selected.cari.name) + '</h3><small>Supabase cari kartı</small></div></div>' +
          '<div class="v282-kpis">' +
            '<div class="v282-kpi"><span>Toplam Alış</span><strong>' + money(selected.buyTotal) + ' TL</strong></div>' +
            '<div class="v282-kpi"><span>Matrah</span><strong>' + money(selected.matrah) + ' TL</strong></div>' +
            '<div class="v282-kpi"><span>KDV</span><strong>' + money(selected.kdv) + ' TL</strong></div>' +
            '<div class="v282-kpi"><span>Fatura / Kalem</span><strong>' + selected.invoiceCount + ' / ' + selected.lineCount + '</strong></div>' +
            '<div class="v282-kpi"><span>Ödeme</span><strong>' + money(paid) + ' TL</strong></div>' +
            '<div class="v282-kpi"><span>Kalan</span><strong>' + (balance >= 0 ? money(balance) + ' TL Borç' : money(Math.abs(balance)) + ' TL Alacak') + '</strong></div>' +
          '</div>' + tabs() + '<div class="v282-panel">' + detailPanel(data, selected) + '</div>' :
          '<div class="v282-empty">Cari seç.</div>') +
        '</main>' +
      '</div>';
    wire();
    if (activeId === 'omasSupaCariSearch') {
      var search = q('#omasSupaCariSearch');
      if (search) {
        try {
          search.focus({ preventScroll: true });
          search.setSelectionRange(caretStart, caretEnd);
        } catch (err2) {
          search.focus();
        }
      }
    }
  }

  async function render(force) {
    var host = q('#v282CariHost');
    if (!host) return;
    if (state.loading) return;
    state.loading = true;
    host.innerHTML = '<div class="v282-empty">Supabase cari kartları yükleniyor...</div>';
    try {
      var data = await loadData(!!force);
      renderLoaded(data);
    } catch (err) {
      host.innerHTML = '<div class="v282-empty">Supabase cari kartları okunamadı: ' + esc(err && err.message ? err.message : String(err)) + '</div>';
    } finally {
      state.loading = false;
    }
  }

  function wire() {
    var search = q('#omasSupaCariSearch');
    if (search) {
      search.oninput = function () {
        state.term = this.value;
        if (state.cache) renderLoaded(state.cache);
      };
      search.onkeydown = function (event) {
        if (event.key === 'Enter' && state.cache) renderLoaded(state.cache);
      };
    }
    var refresh = q('#omasSupaCariRefresh');
    if (refresh) refresh.onclick = function () { render(true); };
    qa('[data-omas-supa-cari]').forEach(function (btn) {
      btn.onclick = function () {
        state.selectedCariId = this.getAttribute('data-omas-supa-cari');
        if (state.cache) renderLoaded(state.cache);
      };
    });
    qa('[data-omas-cari-tab]').forEach(function (btn) {
      btn.onclick = function () {
        state.tab = this.getAttribute('data-omas-cari-tab') || 'ozet';
        if (state.cache) renderLoaded(state.cache);
      };
    });
    qa('[data-omas-pay-edit]').forEach(function (btn) {
      btn.onclick = function () {
        openPaymentEditor(this.getAttribute('data-omas-pay-edit'));
      };
    });
    qa('[data-omas-pay-delete]').forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute('data-omas-pay-delete');
        if (!confirm('Bu ödeme/tahsilat kaydı silinsin mi?')) return;
        this.disabled = true;
        this.textContent = 'Siliniyor...';
        deletePayment(id).catch(function (err) {
          alert('Ödeme silinemedi: ' + (err && err.message ? err.message : String(err)));
          render(true);
        });
      };
    });
    qa('[data-omas-pay-file]').forEach(function (btn) {
      btn.onclick = function () {
        var id = this.getAttribute('data-omas-pay-file');
        openPaymentFile(id).catch(function (err) {
          alert('Görüntü açılamadı: ' + (err && err.message ? err.message : String(err)));
        });
      };
    });
  }

  document.addEventListener('click', function (event) {
    var close = event.target && event.target.closest && event.target.closest('[data-omas-pay-close]');
    if (close) {
      var modal = q('#omasPaymentEditModal');
      if (modal) modal.remove();
      return;
    }
    var save = event.target && event.target.closest && event.target.closest('[data-omas-pay-save]');
    if (!save) return;
    var paymentId = save.getAttribute('data-omas-pay-save');
    var fileInput = q('#omasPayFile');
    save.disabled = true;
    save.textContent = 'Kaydediliyor...';
    updatePayment(paymentId, {
      cari_id: q('#omasPayCari') && q('#omasPayCari').value,
      note: q('#omasPayNote') && q('#omasPayNote').value,
      payment_date: q('#omasPayDate') && q('#omasPayDate').value,
      direction: q('#omasPayDirection') && q('#omasPayDirection').value,
      method: q('#omasPayMethod') && q('#omasPayMethod').value,
      amount: q('#omasPayAmount') && q('#omasPayAmount').value
    }, fileInput && fileInput.files && fileInput.files[0])
      .then(function () {
        var modal = q('#omasPaymentEditModal');
        if (modal) modal.remove();
      })
      .catch(function (err) {
        alert('Ödeme güncellenemedi: ' + (err && err.message ? err.message : String(err)));
        save.disabled = false;
        save.textContent = 'Kaydet';
      });
  }, true);

  function activateIfCariClick(event) {
    var card = event.target && event.target.closest && event.target.closest('.menu-card');
    if (card && /cariCardsModule/.test(String(card.getAttribute('onclick') || ''))) {
      setTimeout(function () { render(false); }, 120);
      setTimeout(function () { render(false); }, 500);
    }
  }

  window.v282RenderCariCards = function () {
    render(false);
  };
  window.omasRenderSupabaseCariCards = render;

  document.addEventListener('click', activateIfCariClick, true);
  window.addEventListener('omas:auth-ready', function () {
    if (q('#cariCardsModule') && q('#cariCardsModule').style.display !== 'none') {
      render(true);
    }
  });
})();
