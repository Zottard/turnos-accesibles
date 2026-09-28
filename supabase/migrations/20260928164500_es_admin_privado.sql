-- es_admin no tiene por qué estar expuesta en la API REST
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and rol = 'admin')
$$;

revoke execute on function privado.es_admin() from public, anon;
grant execute on function privado.es_admin() to authenticated;

drop policy "cada uno ve su perfil" on public.profiles;
create policy "cada uno ve su perfil" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select privado.es_admin()));

drop function public.es_admin();
