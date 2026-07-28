-- Omas payment receipt/image storage setup
-- Run once in Supabase SQL Editor after the main schema.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'omas-files',
  'omas-files',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'omas files members read'
  ) then
    create policy "omas files members read"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'omas-files'
      and exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id::text = (storage.foldername(name))[1]
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'omas files members insert'
  ) then
    create policy "omas files members insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'omas-files'
      and exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id::text = (storage.foldername(name))[1]
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'omas files members update'
  ) then
    create policy "omas files members update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'omas-files'
      and exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id::text = (storage.foldername(name))[1]
      )
    )
    with check (
      bucket_id = 'omas-files'
      and exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id::text = (storage.foldername(name))[1]
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'omas files members delete'
  ) then
    create policy "omas files members delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'omas-files'
      and exists (
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and cm.company_id::text = (storage.foldername(name))[1]
      )
    );
  end if;
end $$;
