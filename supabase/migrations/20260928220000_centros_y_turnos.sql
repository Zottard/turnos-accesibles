create type public.tipo_centro as enum ('hospital', 'caps');
-- app: los turnos se sacan en esta app. derivacion: la app guía y deriva al canal oficial del centro.
create type public.modo_turnos as enum ('app', 'derivacion');
create type public.estado_turno as enum ('disponible', 'reservado', 'bloqueado');

create table public.localidades (
  id smallint generated always as identity primary key,
  nombre text not null,
  partido text not null,
  lat double precision not null,
  lng double precision not null,
  unique (nombre, partido)
);

create table public.especialidades (
  id smallint generated always as identity primary key,
  slug text not null unique,
  nombre_comun text not null,
  nombre_tecnico text not null,
  descripcion_simple text not null,
  icono text not null,
  activo boolean not null default true
);

create table public.centros (
  id uuid primary key default gen_random_uuid(),
  refes_id text unique,
  nombre text not null,
  tipo public.tipo_centro not null,
  dependencia text not null,
  direccion text not null,
  localidad text not null,
  partido text not null,
  provincia text not null default 'Buenos Aires',
  lat double precision not null,
  lng double precision not null,
  telefono text,
  horario_atencion text,
  accesibilidad_edilicia jsonb,
  como_llegar text,
  modo_turnos public.modo_turnos not null default 'app',
  web_turnos text,
  telefono_turnos text,
  instrucciones_turno text,
  fuente text,
  activo boolean not null default true
);

create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  matricula text not null,
  especialidad_id smallint not null references public.especialidades
);

create table public.centro_especialidad (
  centro_id uuid not null references public.centros on delete cascade,
  especialidad_id smallint not null references public.especialidades,
  requisitos text,
  primary key (centro_id, especialidad_id)
);

create table public.agendas (
  id uuid primary key default gen_random_uuid(),
  centro_id uuid not null references public.centros,
  profesional_id uuid not null references public.profesionales,
  especialidad_id smallint not null references public.especialidades,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  duracion_min smallint not null,
  cupos_totales int not null,
  check (hora_fin > hora_inicio),
  unique (profesional_id, fecha, hora_inicio)
);

create table public.turnos_disponibles (
  id uuid primary key default gen_random_uuid(),
  agenda_id uuid not null references public.agendas on delete cascade,
  centro_id uuid not null references public.centros,
  especialidad_id smallint not null references public.especialidades,
  profesional_id uuid not null references public.profesionales,
  fecha_hora timestamptz not null,
  estado public.estado_turno not null default 'disponible',
  unique (profesional_id, fecha_hora)
);

create index turnos_busqueda_idx on public.turnos_disponibles (especialidad_id, estado, fecha_hora);
create index turnos_centro_idx on public.turnos_disponibles (centro_id, especialidad_id, fecha_hora);
create index agendas_centro_idx on public.agendas (centro_id);
create index profesionales_especialidad_idx on public.profesionales (especialidad_id);
create index centro_especialidad_especialidad_idx on public.centro_especialidad (especialidad_id);

alter table public.localidades enable row level security;
alter table public.especialidades enable row level security;
alter table public.centros enable row level security;
alter table public.profesionales enable row level security;
alter table public.centro_especialidad enable row level security;
alter table public.agendas enable row level security;
alter table public.turnos_disponibles enable row level security;

-- Lectura pública: buscar turnos no pide cuenta. La escritura llega con el panel de administración (fase 9).
create policy "lectura pública" on public.localidades for select to anon, authenticated using (true);
-- anon no tiene acceso al schema privado: su política no puede llamar a es_admin()
create policy "lectura pública" on public.especialidades for select to anon using (activo);
create policy "lectura con sesión" on public.especialidades for select to authenticated using (activo or (select privado.es_admin()));
create policy "lectura pública" on public.centros for select to anon using (activo);
create policy "lectura con sesión" on public.centros for select to authenticated using (activo or (select privado.es_admin()));
create policy "lectura pública" on public.profesionales for select to anon, authenticated using (true);
create policy "lectura pública" on public.centro_especialidad for select to anon, authenticated using (true);
create policy "lectura pública" on public.turnos_disponibles for select to anon, authenticated using (true);
create policy "solo administración" on public.agendas for select to authenticated using ((select privado.es_admin()));

create function public.distancia_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Sin centro elegido devuelve el primer turno libre de cada centro (para comparar lugares).
-- Con centro elegido devuelve los horarios de ese centro.
create function public.buscar_turnos(
  p_especialidad smallint,
  p_centro uuid default null,
  p_desde date default null,
  p_franja text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_orden text default 'fecha',
  p_limite int default 5,
  p_offset int default 0
)
returns table (
  id uuid,
  fecha_hora timestamptz,
  estado public.estado_turno,
  centro_id uuid,
  centro_nombre text,
  centro_direccion text,
  centro_localidad text,
  especialidad_nombre_comun text,
  especialidad_nombre_tecnico text,
  profesional text,
  distancia_km double precision,
  total bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with libres as (
    select t.*
    from public.turnos_disponibles t
    where t.especialidad_id = p_especialidad
      and t.estado = 'disponible'
      and t.fecha_hora > now()
      and (p_centro is null or t.centro_id = p_centro)
      and (p_desde is null or t.fecha_hora >= (p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires'))
      and (
        p_franja is null
        or (p_franja = 'manana' and extract(hour from t.fecha_hora at time zone 'America/Argentina/Buenos_Aires') < 12)
        or (p_franja = 'tarde' and extract(hour from t.fecha_hora at time zone 'America/Argentina/Buenos_Aires') >= 12)
      )
  ),
  candidatos as (
    select distinct on (case when p_centro is null then l.centro_id else l.id end) l.*
    from libres l
    order by case when p_centro is null then l.centro_id else l.id end, l.fecha_hora
  ),
  enriquecidos as (
    select
      c.id, c.fecha_hora, c.estado, c.centro_id,
      ce.nombre as centro_nombre, ce.direccion as centro_direccion, ce.localidad as centro_localidad,
      e.nombre_comun as especialidad_nombre_comun, e.nombre_tecnico as especialidad_nombre_tecnico,
      p.nombre || ' ' || p.apellido as profesional,
      case when p_lat is null or p_lng is null then null
           else public.distancia_km(p_lat, p_lng, ce.lat, ce.lng) end as distancia_km
    from candidatos c
    join public.centros ce on ce.id = c.centro_id and ce.activo
    join public.especialidades e on e.id = c.especialidad_id
    join public.profesionales p on p.id = c.profesional_id
  )
  select en.*, count(*) over () as total
  from enriquecidos en
  order by
    case when p_orden = 'cercania' then en.distancia_km end nulls last,
    en.fecha_hora
  limit least(greatest(p_limite, 1), 20)
  offset greatest(p_offset, 0)
$$;

grant execute on function public.buscar_turnos(smallint, uuid, date, text, double precision, double precision, text, int, int) to anon, authenticated;
grant execute on function public.distancia_km(double precision, double precision, double precision, double precision) to anon, authenticated;
