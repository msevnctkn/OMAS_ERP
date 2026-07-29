-- ÖMAS ERP Admin Bakım V1
-- Supabase SQL Editor içinde bir kez çalıştırın.
-- Yalnızca company_members.role = admin olan kullanıcı çağırabilir.

begin;

create or replace function public.admin_reset_company_data(
  target_company_id uuid,
  reset_scope text default 'invoices'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  deleted_lines integer := 0;
  deleted_invoices integer := 0;
  deleted_payments integer := 0;
  deleted_bank_rows integer := 0;
  deleted_files integer := 0;
  deleted_materials integer := 0;
  deleted_projects integer := 0;
  deleted_categories integer := 0;
  deleted_cariler integer := 0;
  deleted_app_state integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Oturum bulunamadı';
  end if;

  select cm.role into caller_role
  from public.company_members cm
  where cm.company_id = target_company_id
    and cm.user_id = auth.uid()
  limit 1;

  if caller_role is distinct from 'admin' then
    raise exception 'Bu işlem yalnızca admin tarafından yapılabilir';
  end if;

  if reset_scope not in ('invoices', 'banking', 'all') then
    raise exception 'Geçersiz temizleme kapsamı: %', reset_scope;
  end if;

  if reset_scope in ('invoices', 'all') then
    delete from public.fatura_kalemleri where company_id = target_company_id;
    get diagnostics deleted_lines = row_count;

    delete from public.faturalar where company_id = target_company_id;
    get diagnostics deleted_invoices = row_count;
  end if;

  if reset_scope in ('banking', 'all') then
    delete from public.odemeler where company_id = target_company_id;
    get diagnostics deleted_payments = row_count;

    delete from public.banka_hareketleri where company_id = target_company_id;
    get diagnostics deleted_bank_rows = row_count;
  end if;

  if reset_scope = 'all' then
    delete from public.dosyalar where company_id = target_company_id;
    get diagnostics deleted_files = row_count;

    delete from public.malzemeler where company_id = target_company_id;
    get diagnostics deleted_materials = row_count;

    delete from public.projeler where company_id = target_company_id;
    get diagnostics deleted_projects = row_count;

    delete from public.kategoriler where company_id = target_company_id;
    get diagnostics deleted_categories = row_count;

    delete from public.cariler where company_id = target_company_id;
    get diagnostics deleted_cariler = row_count;

    delete from public.app_state where company_id = target_company_id;
    get diagnostics deleted_app_state = row_count;
  end if;

  insert into public.audit_log(company_id, user_id, action, entity_type, details)
  values (
    target_company_id,
    auth.uid(),
    'admin_data_reset',
    'company',
    jsonb_build_object(
      'scope', reset_scope,
      'deleted_lines', deleted_lines,
      'deleted_invoices', deleted_invoices,
      'deleted_payments', deleted_payments,
      'deleted_bank_rows', deleted_bank_rows,
      'deleted_files', deleted_files,
      'deleted_materials', deleted_materials,
      'deleted_projects', deleted_projects,
      'deleted_categories', deleted_categories,
      'deleted_cariler', deleted_cariler,
      'deleted_app_state', deleted_app_state
    )
  );

  return jsonb_build_object(
    'ok', true,
    'scope', reset_scope,
    'deleted', jsonb_build_object(
      'fatura_kalemleri', deleted_lines,
      'faturalar', deleted_invoices,
      'odemeler', deleted_payments,
      'banka_hareketleri', deleted_bank_rows,
      'dosyalar', deleted_files,
      'malzemeler', deleted_materials,
      'projeler', deleted_projects,
      'kategoriler', deleted_categories,
      'cariler', deleted_cariler,
      'app_state', deleted_app_state
    )
  );
end;
$$;

revoke all on function public.admin_reset_company_data(uuid, text) from public;
grant execute on function public.admin_reset_company_data(uuid, text) to authenticated;

commit;
