-- v0.2 — Cuentas y preferencias.
-- Tablas: perfiles, preferencias e intentos_ingreso. Cada persona ve y cambia solo lo suyo (RLS).
-- Las funciones auxiliares viven en el esquema `privado`, que la API de Supabase no expone.

create schema if not exists privado;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------------
-- Perfiles: los datos personales de cada cuenta (id = auth.users.id).
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  dni text,
  fecha_nacimiento date,
  telefono text,
  localidad text,
  rol text not null default 'solicitante' check (rol in ('solicitante', 'acompanante', 'admin')),
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- ¿La persona que hace la consulta es administradora?
-- Es security definer para poder leer `perfiles` sin chocar con su propia política (recursión).
create function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

revoke execute on function privado.es_admin() from public, anon;
grant execute on function privado.es_admin() to authenticated;

create policy "Cada persona ve su perfil; el admin ve todos"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()) or (select privado.es_admin()));

create policy "Cada persona edita su perfil"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Nadie crea ni borra perfiles desde la app: los crea el trigger de abajo y se borran con la cuenta.
-- Al editar, solo se pueden cambiar estas columnas. El rol queda afuera: nadie se lo cambia solo.
revoke insert, update, delete on public.perfiles from anon, authenticated;
grant update (nombre, apellido, dni, fecha_nacimiento, telefono, localidad) on public.perfiles to authenticated;

-- Cuando alguien se registra, creamos su perfil con los datos que mandó en el registro.
-- El rol 'admin' nunca se acepta desde el registro: se asigna a mano en la base.
create function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.perfiles (id, nombre, apellido, dni, fecha_nacimiento, telefono, localidad, rol)
  values (
    new.id,
    coalesce(datos ->> 'nombre', ''),
    coalesce(datos ->> 'apellido', ''),
    nullif(datos ->> 'dni', ''),
    nullif(datos ->> 'fecha_nacimiento', '')::date,
    nullif(datos ->> 'telefono', ''),
    nullif(datos ->> 'localidad', ''),
    case when datos ->> 'rol' = 'acompanante' then 'acompanante' else 'solicitante' end
  );
  return new;
end;
$$;

revoke execute on function privado.crear_perfil() from public, anon, authenticated;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- ---------------------------------------------------------------------------
-- Preferencias de accesibilidad guardadas en la cuenta.
-- Las columnas son las del tipo `Preferencias` (app/utils/preferencias.ts) más los avisos.
-- ---------------------------------------------------------------------------
create table public.preferencias (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  tamano_texto integer not null default 125 check (tamano_texto in (100, 125, 150, 175, 200)),
  alto_contraste boolean not null default false,
  reducir_movimiento boolean not null default true,
  lectura_voz boolean not null default false,
  velocidad_voz numeric(2, 1) not null default 0.9 check (velocidad_voz between 0.7 and 1.3),
  lenguaje_simple boolean not null default true,
  canal_aviso text not null default 'ambos' check (canal_aviso in ('visual', 'sonoro', 'ambos')),
  antelacion_horas integer not null default 24 check (antelacion_horas in (2, 24, 48)),
  actualizado_en timestamptz not null default now()
);

alter table public.preferencias enable row level security;

create policy "Cada persona ve sus preferencias"
  on public.preferencias for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Cada persona crea sus preferencias"
  on public.preferencias for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "Cada persona cambia sus preferencias"
  on public.preferencias for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on public.preferencias from anon;
revoke delete on public.preferencias from authenticated;

-- Guarda la fecha de cada cambio.
create function privado.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger al_cambiar_preferencias
  before update on public.preferencias
  for each row execute function privado.marcar_actualizado();

-- ---------------------------------------------------------------------------
-- Bloqueo temporal: después de 5 intentos fallidos, 15 minutos sin poder ingresar.
--
-- La tabla tiene RLS y ninguna política: solo se usa a través de las funciones de abajo.
--
-- LIMITACIÓN CONOCIDA: el bloqueo lo controla la app antes de llamar a Supabase Auth.
-- Quien llame a la API de Auth directamente se lo saltea, y cualquiera puede sumar
-- fallos a un correo ajeno. En producción esto se resuelve con un "auth hook" de Supabase
-- (o con el límite de intentos del propio Auth), que corre del lado del servidor.
-- ---------------------------------------------------------------------------
create table public.intentos_ingreso (
  correo text primary key,
  fallidos integer not null default 0,
  bloqueado_hasta timestamptz
);

alter table public.intentos_ingreso enable row level security;
revoke all on public.intentos_ingreso from anon, authenticated;

-- Devuelve hasta cuándo está bloqueado el correo, o null si puede ingresar.
create function public.estado_bloqueo(p_correo text)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select bloqueado_hasta
  from public.intentos_ingreso
  where correo = lower(trim(p_correo)) and bloqueado_hasta > now();
$$;

-- Suma un intento fallido. Al quinto, bloquea 15 minutos y devuelve hasta cuándo.
create function public.registrar_fallo(p_correo text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text := lower(trim(p_correo));
  v_fila public.intentos_ingreso;
  v_hasta timestamptz;
begin
  insert into public.intentos_ingreso (correo) values (v_correo)
  on conflict (correo) do nothing;

  select * into v_fila from public.intentos_ingreso where correo = v_correo for update;

  -- Si ya está bloqueado, no sumamos nada.
  if v_fila.bloqueado_hasta > now() then
    return v_fila.bloqueado_hasta;
  end if;

  if v_fila.fallidos + 1 >= 5 then
    v_hasta := now() + interval '15 minutes';
    -- Al bloquear, el contador vuelve a cero: cuando termine el bloqueo tiene 5 intentos nuevos.
    update public.intentos_ingreso set fallidos = 0, bloqueado_hasta = v_hasta where correo = v_correo;
  else
    update public.intentos_ingreso set fallidos = v_fila.fallidos + 1, bloqueado_hasta = null where correo = v_correo;
  end if;

  return v_hasta;
end;
$$;

-- Borra los intentos fallidos de quien acaba de ingresar bien.
-- Usa el correo de la sesión (no recibe uno): así nadie puede desbloquear un correo ajeno.
create function public.limpiar_intentos()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.intentos_ingreso
  where correo = lower(trim((select auth.jwt()) ->> 'email'));
$$;

revoke execute on function public.estado_bloqueo(text) from public;
revoke execute on function public.registrar_fallo(text) from public;
revoke execute on function public.limpiar_intentos() from public, anon;
grant execute on function public.estado_bloqueo(text) to anon, authenticated;
grant execute on function public.registrar_fallo(text) to anon, authenticated;
grant execute on function public.limpiar_intentos() to authenticated;
