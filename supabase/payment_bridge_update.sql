-- BHD odeme/tahsilat entegrasyonu icin tekrar kaydi engelleyen index
create unique index if not exists uq_odemeler_banka_hareket
on public.odemeler (company_id, banka_hareket_id)
where banka_hareket_id is not null;
