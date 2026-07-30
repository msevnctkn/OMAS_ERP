begin;

create unique index if not exists banka_hareketleri_company_dedupe_uq
on public.banka_hareketleri (company_id, dedupe_key)
where dedupe_key is not null and btrim(dedupe_key) <> '';

create unique index if not exists odemeler_company_bank_movement_uq
on public.odemeler (company_id, banka_hareket_id)
where banka_hareket_id is not null;

commit;
