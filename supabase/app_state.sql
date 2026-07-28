-- OMAS GRUP FINANS - eski modullerin JSON ayarlari icin Supabase state tablosu
-- Supabase SQL Editor icinde bir kez calistir.

create table if not exists public.app_state (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  state_key text not null,
  state_value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now(),
  unique(company_id, state_key)
);

create index if not exists idx_app_state_company_key
on public.app_state(company_id, state_key);

alter table public.app_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_state'
      and policyname = 'members can use app state'
  ) then
    create policy "members can use app state" on public.app_state
    for all
    using (public.is_company_member(company_id))
    with check (public.is_company_member(company_id));
  end if;
end $$;
