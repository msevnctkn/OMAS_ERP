-- BHD satir bazli firma/kategori/silme durumunu banka_hareketleri uzerinde tutar.
-- Supabase SQL Editor icinde bir kez calistir.

alter table public.banka_hareketleri
add column if not exists company_code text,
add column if not exists category_main text,
add column if not exists category_sub text;

create index if not exists idx_banka_hareketleri_state
on public.banka_hareketleri(company_id, is_deleted, company_code, category_main);
