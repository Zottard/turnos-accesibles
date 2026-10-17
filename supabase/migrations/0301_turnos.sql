-- v0.3 — Búsqueda de turnos.
-- Tablas del catálogo: localidades, centros, especialidades, profesionales y turnos.
-- Cualquiera (con o sin cuenta) puede leer el catálogo: solo lo activo y los turnos futuros.
-- Nadie lo escribe desde la app: la carga de centros y agendas llega con el panel (v0.6).
-- Además: avisos_disponibilidad ("Avisame cuando haya turno"), que guarda cada persona.
-- Los datos de prueba están en supabase/seed.sql (sección v0.3).

-- ---------------------------------------------------------------------------
-- Localidades: sirven para ordenar por cercanía cuando no tenemos la ubicación del navegador.
-- ---------------------------------------------------------------------------
create table public.localidades (
  nombre text primary key,
  lat double precision not null,
  lng double precision not null
);

-- ---------------------------------------------------------------------------
-- Centros de salud.
-- ---------------------------------------------------------------------------
create table public.centros (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  tipo text not null check (tipo in ('hospital', 'centro_de_salud', 'unidad_sanitaria')),
  direccion text not null,
  localidad text not null references public.localidades (nombre),
  telefono text,
  horario text,
  lat double precision not null,
  lng double precision not null,
  -- Accesibilidad del edificio, en frases cortas: "Rampa en la entrada. Baño adaptado."
  accesibilidad text,
  activo boolean not null default true
);

create index centros_localidad_idx on public.centros (localidad);

-- ---------------------------------------------------------------------------
-- Especialidades: el nombre técnico ("Oftalmología") y el simple ("Oculista").
-- palabras_clave: cómo lo dice la gente ("ojos", "vista", "anteojos"). Las usa el buscador.
-- ---------------------------------------------------------------------------
create table public.especialidades (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  nombre_simple text not null,
  descripcion text not null,
  palabras_clave text[] not null default '{}',
  activa boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Profesionales: cada uno atiende una especialidad en un centro.
-- ---------------------------------------------------------------------------
create table public.profesionales (
  id bigint generated always as identity primary key,
  nombre text not null,
  especialidad_id bigint not null references public.especialidades (id),
  centro_id bigint not null references public.centros (id),
  unique (nombre, centro_id)
);

create index profesionales_especialidad_idx on public.profesionales (especialidad_id);
create index profesionales_centro_idx on public.profesionales (centro_id);

-- ---------------------------------------------------------------------------
-- Turnos: un cupo de la agenda de un profesional.
-- centro_id y especialidad_id repiten los del profesional para que la búsqueda sea directa.
-- ---------------------------------------------------------------------------
create table public.turnos (
  id bigint generated always as identity primary key,
  profesional_id bigint not null references public.profesionales (id),
  centro_id bigint not null references public.centros (id),
  especialidad_id bigint not null references public.especialidades (id),
  inicio timestamptz not null,
  duracion_min integer not null default 20 check (duracion_min > 0),
  estado text not null default 'disponible' check (estado in ('disponible', 'reservado')),
  -- Qué llevar, una frase por renglón: "Llevá tu DNI.\nSi usás anteojos, traelos."
  requisitos text,
  -- Un profesional no puede tener dos turnos a la misma hora.
  unique (profesional_id, inicio)
);

-- La búsqueda filtra por especialidad, solo disponibles y ordena por fecha.
create index turnos_busqueda_idx on public.turnos (especialidad_id, inicio) where estado = 'disponible';
create index turnos_centro_idx on public.turnos (centro_id, inicio);

-- ---------------------------------------------------------------------------
-- Permisos del catálogo: lectura para todos, escritura para nadie (por ahora).
-- ---------------------------------------------------------------------------
alter table public.localidades enable row level security;
alter table public.centros enable row level security;
alter table public.especialidades enable row level security;
alter table public.profesionales enable row level security;
alter table public.turnos enable row level security;

revoke insert, update, delete, truncate on public.localidades, public.centros, public.especialidades,
  public.profesionales, public.turnos from anon, authenticated;

create policy "Todos ven las localidades"
  on public.localidades for select
  to anon, authenticated
  using (true);

create policy "Todos ven los centros activos"
  on public.centros for select
  to anon, authenticated
  using (activo);

create policy "Todos ven las especialidades activas"
  on public.especialidades for select
  to anon, authenticated
  using (activa);

create policy "Todos ven los profesionales"
  on public.profesionales for select
  to anon, authenticated
  using (true);

-- Se ven los turnos futuros, libres o tomados (la ficha avisa si ya lo tomó otra persona).
-- Quién reservó cada turno no está acá: eso va en `reservas` (v0.4).
create policy "Todos ven los turnos futuros"
  on public.turnos for select
  to anon, authenticated
  using (inicio > now());

-- ---------------------------------------------------------------------------
-- Avisos de disponibilidad: "Avisame cuando haya turno" (RF-03, sin resultados).
-- Acá solo se guarda el pedido. El aviso en sí se manda en la v0.5.
-- localidad null = en cualquier lugar.
-- ---------------------------------------------------------------------------
create table public.avisos_disponibilidad (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  especialidad_id bigint not null references public.especialidades (id),
  localidad text references public.localidades (nombre),
  creado_en timestamptz not null default now(),
  -- El mismo pedido una sola vez (también con localidad null).
  unique nulls not distinct (usuario_id, especialidad_id, localidad)
);

create index avisos_especialidad_idx on public.avisos_disponibilidad (especialidad_id);
create index avisos_localidad_idx on public.avisos_disponibilidad (localidad);

alter table public.avisos_disponibilidad enable row level security;
revoke all on public.avisos_disponibilidad from anon;
revoke update, delete, truncate on public.avisos_disponibilidad from authenticated;

create policy "Cada persona ve sus avisos"
  on public.avisos_disponibilidad for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Cada persona pide sus avisos"
  on public.avisos_disponibilidad for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- buscar_turnos: la búsqueda de la página /buscar, en una sola llamada.
--
-- - Solo turnos disponibles y futuros de la especialidad pedida.
-- - Filtros opcionales: centro, rango de fechas y franja ('manana' antes de las 13, 'tarde'
--   desde las 13). Fechas y horas en la hora de Argentina.
-- - Si llega una ubicación (p_lat, p_lng), calcula la distancia en línea recta a cada centro
--   (fórmula de haversine) y ordena primero por cercanía y después por fecha.
-- - Sin centro elegido, trae como mucho los 3 turnos más próximos de cada centro, para que
--   un centro con muchos turnos no tape a los demás.
--
-- Es security invoker (la opción por defecto): corre con los permisos de quien busca, así
-- que las políticas de arriba se siguen aplicando (centros inactivos, turnos pasados).
-- ---------------------------------------------------------------------------
create function public.buscar_turnos(
  p_especialidad_id bigint,
  p_centro_id bigint default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_desde date default null,
  p_hasta date default null,
  p_franja text default null,
  p_limite integer default 30
)
returns table (
  id bigint,
  inicio timestamptz,
  centro_id bigint,
  centro_nombre text,
  centro_direccion text,
  centro_localidad text,
  especialidad_nombre text,
  especialidad_nombre_simple text,
  profesional text,
  distancia_km double precision,
  requisitos text
)
language sql
stable
set search_path = ''
as $$
  with candidatos as (
    select
      t.id,
      t.inicio,
      c.id as centro_id,
      c.nombre as centro_nombre,
      c.direccion as centro_direccion,
      c.localidad as centro_localidad,
      e.nombre as especialidad_nombre,
      e.nombre_simple as especialidad_nombre_simple,
      p.nombre as profesional,
      case
        when p_lat is null or p_lng is null then null
        else 2 * 6371 * asin(sqrt(
          power(sin(radians(c.lat - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians(c.lat)) * power(sin(radians(c.lng - p_lng) / 2), 2)
        ))
      end as distancia_km,
      t.requisitos,
      -- Orden de cada turno dentro de su centro (1 = el más próximo).
      row_number() over (partition by c.id order by t.inicio) as orden_en_centro
    from public.turnos as t
    join public.centros as c on c.id = t.centro_id
    join public.especialidades as e on e.id = t.especialidad_id
    join public.profesionales as p on p.id = t.profesional_id
    where t.especialidad_id = p_especialidad_id
      and t.estado = 'disponible'
      and t.inicio > now()
      and (p_centro_id is null or t.centro_id = p_centro_id)
      -- Desde el comienzo del día p_desde hasta el final del día p_hasta, en hora argentina.
      and (p_desde is null or t.inicio >= p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires')
      and (p_hasta is null or t.inicio < (p_hasta + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
      and (
        p_franja is null
        or (p_franja = 'manana' and extract(hour from t.inicio at time zone 'America/Argentina/Buenos_Aires') < 13)
        or (p_franja = 'tarde' and extract(hour from t.inicio at time zone 'America/Argentina/Buenos_Aires') >= 13)
      )
  )
  select
    id, inicio, centro_id, centro_nombre, centro_direccion, centro_localidad,
    especialidad_nombre, especialidad_nombre_simple, profesional, distancia_km, requisitos
  from candidatos
  where p_centro_id is not null or orden_en_centro <= 3
  order by distancia_km asc nulls last, inicio asc
  limit least(greatest(coalesce(p_limite, 30), 1), 100);
$$;

revoke execute on function public.buscar_turnos(bigint, bigint, double precision, double precision, date, date, text, integer) from public;
grant execute on function public.buscar_turnos(bigint, bigint, double precision, double precision, date, date, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- privado.generar_turnos(dias): arma la agenda de prueba para los próximos `dias` días.
--
-- - Solo días hábiles (lunes a viernes). Cada profesional atiende 3 de esos 5 días.
-- - Turnos de 20 minutos: a la mañana (8 a 12) o a la tarde (13 a 17), según el profesional.
-- - Más o menos 1 de cada 4 turnos ya aparece como reservado, para que la agenda sea creíble.
-- - Si un turno ya existe, no lo toca: se puede correr las veces que haga falta.
-- Devuelve cuántos turnos nuevos creó.
-- Para la demo: `select privado.generar_turnos(30);` desde el editor SQL de Supabase.
-- ---------------------------------------------------------------------------
create function privado.generar_turnos(dias integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creados integer;
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  insert into public.turnos (profesional_id, centro_id, especialidad_id, inicio, estado, requisitos)
  select
    p.id,
    p.centro_id,
    p.especialidad_id,
    (dia::date + hora_inicio + cupo * interval '20 minutes') at time zone 'America/Argentina/Buenos_Aires',
    case when random() < 0.25 then 'reservado' else 'disponible' end,
    'Llevá tu DNI.' || E'\n' ||
    case e.nombre
      when 'Oftalmología' then 'Si usás anteojos o lentes de contacto, traelos.'
      when 'Pediatría' then 'Llevá la libreta sanitaria y el carnet de vacunas del chico o la chica.'
      when 'Cardiología' then 'Traé tus últimos estudios del corazón y la lista de remedios que tomás.'
      when 'Traumatología' then 'Traé las radiografías o estudios que tengas. Vení con ropa cómoda.'
      when 'Odontología' then 'Lavate los dientes antes de venir.'
      when 'Clínica médica' then 'Traé la lista de remedios que tomás.'
      when 'Ginecología' then 'Traé tus últimos estudios (Papanicolaou, mamografía) si los tenés.'
      when 'Dermatología' then 'No te pongas crema ni maquillaje en la zona que querés mostrar.'
      when 'Otorrinolaringología' then 'Traé los estudios de audición que tengas.'
      when 'Kinesiología' then 'Traé la orden del médico. Vení con ropa cómoda.'
      when 'Nutrición' then 'Traé tus últimos análisis de sangre si los tenés.'
      when 'Salud mental' then 'Si tomás algún remedio, traé el nombre anotado.'
      else 'Si tenés estudios anteriores, traelos.'
    end || E'\n' ||
    'Si tenés obra social, llevá la credencial.'
  from public.profesionales as p
  join public.especialidades as e on e.id = p.especialidad_id
  cross join generate_series(v_hoy + 1, v_hoy + dias, interval '1 day') as dia
  -- Mañana (8:00) para los profesionales con id par; tarde (13:00) para los impares.
  cross join lateral (select case when p.id % 2 = 0 then time '08:00' else time '13:00' end as hora_inicio) as franja
  -- 12 turnos de 20 minutos: 4 horas.
  cross join generate_series(0, 11) as cupo
  where extract(isodow from dia) between 1 and 5
    -- 3 de los 5 días hábiles, distintos según el profesional.
    and (extract(isodow from dia)::integer + p.id::integer) % 5 in (0, 2, 4)
  on conflict (profesional_id, inicio) do nothing;

  get diagnostics v_creados = row_count;
  return v_creados;
end;
$$;

revoke execute on function privado.generar_turnos(integer) from public, anon, authenticated;
