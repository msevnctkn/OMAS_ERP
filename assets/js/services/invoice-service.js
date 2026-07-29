(function () {
    "use strict";

    async function findExistingInvoice(client, companyId, group, helpers) {

        const row = group.first;
        const issueDate = helpers.dateOrNull(row.date);
        const total = helpers.round2(group.total);

        if (row.uuid) {

            const uuidResult = await client
            .from("faturalar")
            .select("id")
            .eq("company_id", companyId)
            .eq("uuid", String(row.uuid))
            .limit(1);

        if (uuidResult.error)
            throw uuidResult.error;

        if (uuidResult.data && uuidResult.data.length)
            return uuidResult.data[0];
        }

        const invoiceResult = await client
            .from("faturalar")
            .select("id")
            .eq("company_id", companyId)
            .eq("direction", "alis")
            .eq("invoice_no", String(row.invoiceNo || "").trim())
            .eq("issue_date", issueDate)
            .eq("total", total)
            .limit(1);

        if (invoiceResult.error)
            throw invoiceResult.error;

        if (invoiceResult.data && invoiceResult.data.length)
            return invoiceResult.data[0];

        return null;
    }

    async function ensureInvoice(client, companyId, cariId, group, helpers) {

        const existing = await findExistingInvoice(
            client,
            companyId,
            group,
            helpers
        );

        if (existing)
            return {
                id: existing.id,
                existed: true
            };

        const row = group.first;

        const insert = await client
            .from("faturalar")
            .insert({
                company_id: companyId,
                cari_id: cariId,
                direction: "alis",
                invoice_no: String(row.invoiceNo || "").trim(),
                uuid: row.uuid || null,
                issue_date: helpers.dateOrNull(row.date),
                supplier_name: row.supplier,
                currency: row.currency || "TRY",
                exchange_rate: helpers.n(row.exchangeRate) || 1,
                matrah: helpers.round2(group.matrah),
                kdv: helpers.round2(group.kdv),
                total: helpers.round2(group.total),
                xml_hash: group.key
            })
            .select("id")
            .single();

        if (insert.error)
            throw insert.error;

        return {
            id: insert.data.id,
            existed: false
        };
    }

    window.OMASInvoiceService = {
        findExistingInvoice,
        ensureInvoice
    };

})();