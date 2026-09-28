create type public.rol as enum ('solicitante', 'acompanante', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  apellido text not null,
  documento text not null,
  fecha_nacimiento date,
  telefono text,
  localidad text,
  lat double precision,
  lng double precision,
  rol public.rol not null default 'solicitante',
  creado_en timestamptz not null default now()
);

create index profiles_documento_idx on public.profiles (documento);

alter table public.profiles enable row level security;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and rol = 'admin')
$$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

create policy "cada uno ve su perfil" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.es_admin()));

create policy "cada uno edita su perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- el rol no se puede cambiar desde el cliente
revoke update on public.profiles from authenticated, anon;
grant update (nombre, apellido, documento, fecha_nacimiento, telefono, localidad, lat, lng) on public.profiles to authenticated;

-- el rol nunca sale de los metadatos del alta: siempre arranca como solicitante
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, apellido, documento, fecha_nacimiento, localidad)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    coalesce(new.raw_user_meta_data ->> 'documento', ''),
    nullif(new.raw_user_meta_data ->> 'fecha_nacimiento', '')::date,
    new.raw_user_meta_data ->> 'localidad'
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Bloqueo tras 5 intentos fallidos (RF #1). Se cuenta por correo, exista o no la cuenta,
-- para no revelar qué correos están registrados.
create table public.intentos_login (
  email text primary key,
  fallos int not null default 0,
  ultimo_fallo timestamptz,
  bloqueado_hasta timestamptz
);

alter table public.intentos_login enable row level security;
revoke all on public.intentos_login from anon, authenticated;

create function public.estado_bloqueo(p_email text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select greatest(0, ceil(extract(epoch from (bloqueado_hasta - now()))))::int
     from public.intentos_login
     where email = lower(trim(p_email)) and bloqueado_hasta > now()),
    0
  )
$$;

create function public.registrar_fallo(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_fila public.intentos_login;
  max_fallos constant int := 5;
  ventana constant interval := interval '15 minutes';
begin
  insert into public.intentos_login (email) values (v_email) on conflict (email) do nothing;
  select * into v_fila from public.intentos_login where email = v_email for update;

  if v_fila.bloqueado_hasta > now() then
    return jsonb_build_object('restantes', 0, 'bloqueado_segundos', ceil(extract(epoch from (v_fila.bloqueado_hasta - now())))::int);
  end if;

  if v_fila.ultimo_fallo is null or v_fila.ultimo_fallo < now() - ventana then
    v_fila.fallos := 0;
  end if;

  v_fila.fallos := v_fila.fallos + 1;

  if v_fila.fallos >= max_fallos then
    update public.intentos_login
      set fallos = 0, ultimo_fallo = now(), bloqueado_hasta = now() + ventana
      where email = v_email;
    return jsonb_build_object('restantes', 0, 'bloqueado_segundos', extract(epoch from ventana)::int);
  end if;

  update public.intentos_login
    set fallos = v_fila.fallos, ultimo_fallo = now(), bloqueado_hasta = null
    where email = v_email;
  return jsonb_build_object('restantes', max_fallos - v_fila.fallos, 'bloqueado_segundos', 0);
end;
$$;

-- solo el dueño de la sesión puede limpiar su propio contador
create function public.limpiar_intentos()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.intentos_login where email = lower((select auth.jwt()) ->> 'email')
$$;

revoke execute on function public.estado_bloqueo(text) from public;
revoke execute on function public.registrar_fallo(text) from public;
revoke execute on function public.limpiar_intentos() from public, anon;
grant execute on function public.estado_bloqueo(text) to anon, authenticated;
grant execute on function public.registrar_fallo(text) to anon, authenticated;
grant execute on function public.limpiar_intentos() to authenticated;
revoke execute on function public.crear_perfil() from public, anon, authenticated;
