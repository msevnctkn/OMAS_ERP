-- OMAS GRUP FINANS - Supabase ilk veritabani semasi
-- Supabase SQL Editor icinde tek parca calistir.
-- Automatic RLS acik olsa bile bu dosya tablolarda RLS'i tekrar garanti eder.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_no text,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','user','viewer')),
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_company_admin(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.role = 'admin'
  );
$$;

create table if not exists public.cariler (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  tax_no text,
  email text,
  phone text,
  address text,
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, normalized_name)
);

create table if not exists public.kategoriler (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.kategoriler(id) on delete cascade,
  name text not null,
  kind text not null default 'expense' check (kind in ('expense','income','asset','liability','other')),
  created_at timestamptz not null default now(),
  unique(company_id, parent_id, name)
);

create table if not exists public.projeler (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cari_id uuid references public.cariler(id) on delete set null,
  name text not null,
  code text,
  project_type text not null default 'resmi' check (project_type in ('resmi','grs')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.malzemeler (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  sku text,
  unit text,
  notes text,
  created_at timestamptz not null default now(),
  unique(company_id, normalized_name)
);

create table if not exists public.dosyalar (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_bucket text,
  storage_path text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  source_type text not null default 'upload',
  created_at timestamptz not null default now(),
  unique(company_id, sha256)
);

create table if not exists public.faturalar (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cari_id uuid references public.cariler(id) on delete set null,
  dosya_id uuid references public.dosyalar(id) on delete set null,
  direction text not null check (direction in ('alis','satis','masraf','iade')),
  invoice_no text not null,
  uuid text,
  issue_date date,
  supplier_name text,
  customer_name text,
  currency text not null default 'TRY',
  exchange_rate numeric(18,6) not null default 1,
  matrah numeric(18,2) not null default 0,
  kdv numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  xml_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fatura_kalemleri (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  fatura_id uuid not null references public.faturalar(id) on delete cascade,
  cari_id uuid references public.cariler(id) on delete set null,
  kategori_id uuid references public.kategoriler(id) on delete set null,
  proje_id uuid references public.projeler(id) on delete set null,
  malzeme_id uuid references public.malzemeler(id) on delete set null,
  company_code text,
  category_main text,
  category_sub text,
  project_kind text,
  project_key text,
  project_name text,
  is_deleted boolean not null default false,
  line_no integer not null default 1,
  item_name text not null,
  quantity numeric(18,4) not null default 0,
  unit text,
  unit_price numeric(18,6) not null default 0,
  currency text not null default 'TRY',
  matrah numeric(18,2) not null default 0,
  kdv_rate numeric(8,2) not null default 0,
  kdv numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique(company_id, dedupe_key)
);

create table if not exists public.banka_hareketleri (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cari_id uuid references public.cariler(id) on delete set null,
  dosya_id uuid references public.dosyalar(id) on delete set null,
  bank_name text,
  account_name text,
  transaction_date date not null,
  description text,
  party_name text,
  incoming numeric(18,2) not null default 0,
  outgoing numeric(18,2) not null default 0,
  balance numeric(18,2),
  category_id uuid references public.kategoriler(id) on delete set null,
  company_code text,
  category_main text,
  category_sub text,
  is_deleted boolean not null default false,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique(company_id, dedupe_key)
);

create table if not exists public.odemeler (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cari_id uuid references public.cariler(id) on delete set null,
  banka_hareket_id uuid references public.banka_hareketleri(id) on delete set null,
  dosya_id uuid references public.dosyalar(id) on delete set null,
  payment_date date,
  method text not null default 'banka',
  amount numeric(18,2) not null default 0,
  direction text not null default 'out' check (direction in ('in','out')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_state (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  state_key text not null,
  state_value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  unique(company_id, state_key)
);

create unique index if not exists uq_faturalar_dedupe
on public.faturalar (
  company_id,
  direction,
  coalesce(uuid, ''),
  invoice_no,
  coalesce(issue_date, '1900-01-01'::date),
  coalesce(supplier_name, ''),
  total
);
create index if not exists idx_cariler_company_name on public.cariler(company_id, normalized_name);
create index if not exists idx_faturalar_company_date on public.faturalar(company_id, issue_date desc);
create index if not exists idx_faturalar_cari on public.faturalar(cari_id);
create index if not exists idx_fatura_kalemleri_fatura on public.fatura_kalemleri(fatura_id);
create index if not exists idx_fatura_kalemleri_malzeme on public.fatura_kalemleri(malzeme_id);
create index if not exists idx_fatura_kalemleri_state on public.fatura_kalemleri(company_id, is_deleted, company_code, category_main, project_kind);
create index if not exists idx_banka_company_date on public.banka_hareketleri(company_id, transaction_date desc);
create unique index if not exists uq_odemeler_banka_hareket
on public.odemeler (company_id, banka_hareket_id)
where banka_hareket_id is not null;
create index if not exists idx_odemeler_cari on public.odemeler(cari_id);
create index if not exists idx_projeler_company on public.projeler(company_id);
create index if not exists idx_app_state_company_key on public.app_state(company_id, state_key);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.cariler enable row level security;
alter table public.kategoriler enable row level security;
alter table public.projeler enable row level security;
alter table public.malzemeler enable row level security;
alter table public.dosyalar enable row level security;
alter table public.faturalar enable row level security;
alter table public.fatura_kalemleri enable row level security;
alter table public.banka_hareketleri enable row level security;
alter table public.odemeler enable row level security;
alter table public.audit_log enable row level security;
alter table public.app_state enable row level security;

create policy "members can view companies" on public.companies
for select using (public.is_company_member(id));

create policy "admins can update companies" on public.companies
for update using (public.is_company_admin(id)) with check (public.is_company_admin(id));

create policy "members can view memberships" on public.company_members
for select using (user_id = auth.uid() or public.is_company_member(company_id));

create policy "admins can manage memberships" on public.company_members
for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

create policy "members can use cariler" on public.cariler
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use kategoriler" on public.kategoriler
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use projeler" on public.projeler
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use malzemeler" on public.malzemeler
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use dosyalar" on public.dosyalar
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use faturalar" on public.faturalar
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use fatura kalemleri" on public.fatura_kalemleri
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use banka hareketleri" on public.banka_hareketleri
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can use odemeler" on public.odemeler
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "members can view audit log" on public.audit_log
for select using (public.is_company_member(company_id));

create policy "members can use app state" on public.app_state
for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- Ilk sirketi ve kendi kullanicini eklemek icin:
-- 1) Supabase Authentication > Users kismindan kullanici olustur.
-- 2) Asagidaki iki satiri kendi auth user id'n ile calistir.
-- insert into public.companies (name) values ('ÖMAS GRUP') returning id;
-- insert into public.company_members (company_id, user_id, role) values ('BURAYA_COMPANY_ID', 'BURAYA_AUTH_USER_ID', 'admin');



