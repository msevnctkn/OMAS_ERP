(function () {
  'use strict';

  function isDuplicateError(error) {
    return Boolean(error && String(error.code) === '23505');
  }

  function normalizeInvoiceNo(value) {
    return String(value || '').trim();
  }

  async function firstRow(query) {
    var result = await query.limit(1);
    if (result.error) throw result.error;
    return Array.isArray(result.data) && result.data.length ? result.data[0] : null;
  }

  async function findExistingInvoice(client, companyId, cariId, group, helpers) {
    var row = group.first;
    var issueDate = helpers.dateOrNull(row.date);
    var total = helpers.round2(group.total);
    var invoiceNo = normalizeInvoiceNo(row.invoiceNo);

    if (row.uuid) {
      var byUuid = await firstRow(
        client
          .from('faturalar')
          .select('id, uuid')
          .eq('company_id', companyId)
          .eq('uuid', String(row.uuid).trim())
      );

      if (byUuid) return byUuid;
    }

    return firstRow(
      client
        .from('faturalar')
        .select('id, uuid')
        .eq('company_id', companyId)
        .eq('cari_id', cariId)
        .eq('direction', 'alis')
        .eq('invoice_no', invoiceNo)
        .eq('issue_date', issueDate)
        .eq('total', total)
    );
  }

  async function ensureInvoice(client, companyId, cariId, group, helpers) {
    var existing = await findExistingInvoice(
      client,
      companyId,
      cariId,
      group,
      helpers
    );

    if (existing) {
      return { id: existing.id, existed: true };
    }

    var row = group.first;
    var payload = {
      company_id: companyId,
      cari_id: cariId,
      direction: 'alis',
      invoice_no: normalizeInvoiceNo(row.invoiceNo),
      uuid: row.uuid ? String(row.uuid).trim() : null,
      issue_date: helpers.dateOrNull(row.date),
      supplier_name: String(row.supplier || '').trim(),
      currency: String(row.currency || 'TRY').toUpperCase(),
      exchange_rate: helpers.n(row.exchangeRate) || 1,
      matrah: helpers.round2(group.matrah),
      kdv: helpers.round2(group.kdv),
      total: helpers.round2(group.total),
      xml_hash: group.key
    };

    var insert = await client
      .from('faturalar')
      .insert(payload)
      .select('id')
      .single();

    if (insert.error) {
      // Aynı fatura iki bilgisayardan eşzamanlı gönderilirse DB unique index'i kazanır.
      // Kullanıcıya hata göstermek yerine oluşmuş kaydı bulup devam ederiz.
      if (isDuplicateError(insert.error)) {
        var concurrentExisting = await findExistingInvoice(
          client,
          companyId,
          cariId,
          group,
          helpers
        );

        if (concurrentExisting) {
          return { id: concurrentExisting.id, existed: true };
        }
      }

      throw insert.error;
    }

    return { id: insert.data.id, existed: false };
  }

  window.OMASInvoiceService = {
    findExistingInvoice: findExistingInvoice,
    ensureInvoice: ensureInvoice
  };
})();
