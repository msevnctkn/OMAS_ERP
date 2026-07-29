-- ÖMAS ERP - Yeni kayıtlar için duplicate koruması V2
-- Supabase SQL Editor içinde tek parça çalıştırın.
-- Mevcut kayıtları silmez.

begin;

-- UUID/ETTN bulunan faturalar: aynı şirket içinde ikinci kez eklenemez.
create unique index if not exists faturalar_company_uuid_uq
on public.faturalar (company_id, uuid)
where uuid is not null and btrim(uuid) <> '';

-- UUID bulunmayan faturalar: aynı cari, yön, numara, tarih ve toplam ikinci kez eklenemez.
-- Cari eşleştirmesi normalized_name üzerinden yapıldığı için tedarikçi yazım farklarından etkilenmez.
create unique index if not exists faturalar_no_uuid_business_key_uq
on public.faturalar (
  company_id,
  cari_id,
  direction,
  invoice_no,
  issue_date,
  total
)
where uuid is null or btrim(uuid) = '';

-- Fatura kalemleri için mevcut dedupe anahtarını DB seviyesinde garanti et.
create unique index if not exists fatura_kalemleri_company_dedupe_uq
on public.fatura_kalemleri (company_id, dedupe_key)
where dedupe_key is not null and btrim(dedupe_key) <> '';

commit;
