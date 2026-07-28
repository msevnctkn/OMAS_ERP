-- Fatura kalemi satir bazli firma/kategori/proje/silme durumunu DB'de tutar.
-- Supabase SQL Editor icinde bir kez calistir.

alter table public.fatura_kalemleri
add column if not exists company_code text,
add column if not exists category_main text,
add column if not exists category_sub text,
add column if not exists project_kind text,
add column if not exists project_key text,
add column if not exists project_name text,
add column if not exists is_deleted boolean not null default false;

create index if not exists idx_fatura_kalemleri_state
on public.fatura_kalemleri(company_id, is_deleted, company_code, category_main, project_kind);
