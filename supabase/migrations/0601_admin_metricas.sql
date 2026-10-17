-- v0.6 — Panel administrativo, auditoría y métricas (RF-08, RF-09, RNF Confiabilidad).
--
-- 1. Catálogo: el admin (privado.es_admin()) carga y cambia centros, especialidades, profesionales y
--    turnos, y ve también lo inactivo. Para el resto no cambia nada.
-- 2. Bajas con reservas: un centro o una especialidad con turnos reservados (futuros) no se da de
--    baja; la base lo frena con un mensaje claro y la lista de esos turnos.
-- 3. Agendas: generar_agenda (sin superposiciones por profesional), dar_de_baja_agenda y
--    borrar_profesional. Los turnos dados de baja quedan con estado 'baja' (no se borran: son registro).
-- 4. Auditoría: cada alta, modificación y baja del catálogo hecha por un admin, cada cancelación o
--    cambio de fecha de una reserva y cada intento de entrar al panel sin permiso.
-- 5. Métricas: eventos_uso (anónimos) y la función metricas(desde, hasta, agrupar).
-- Los datos de prueba de las métricas están en supabase/seed.sql (sección v0.6).

-- ===========================================================================
-- 1. Catálogo: permisos del admin
-- ===========================================================================

-- Nada de nombres vacíos (la app ya lo valida; esto es la segunda defensa).
alter table public.centros add constraint centros_textos_check
  check (btrim(nombre) <> '' and btrim(direccion) <> '');
alter table public.especialidades add constraint especialidades_textos_check
  check (btrim(nombre) <> '' and btrim(nombre_simple) <> '' and btrim(descripcion) <> '');
alter table public.profesionales add constraint profesionales_nombre_check check (btrim(nombre) <> '');

-- 'baja': un turno libre que el admin sacó de la agenda. No aparece en la búsqueda ni se puede
-- reservar (reservar_turno pide 'disponible'), pero queda como registro.
alter table public.turnos drop constraint turnos_estado_check;
alter table public.turnos add constraint turnos_estado_check check (estado in ('disponible', 'reservado', 'baja'));

-- Lectura: sin cuenta, como antes. Con cuenta, lo mismo, y el admin además ve lo inactivo y lo pasado.
-- (Una política por rol: anon no puede ejecutar privado.es_admin().)
drop policy "Todos ven los centros activos" on public.centros;
create policy "Sin cuenta se ven los centros activos"
  on public.centros for select
  to anon
  using (activo);
create policy "Con cuenta se ven los centros activos; el admin ve todos"
  on public.centros for select
  to authenticated
  using (activo or (select privado.es_admin()));

drop policy "Todos ven las especialidades activas" on public.especialidades;
create policy "Sin cuenta se ven las especialidades activas"
  on public.especialidades for select
  to anon
  using (activa);
create policy "Con cuenta se ven las especialidades activas; el admin ve todas"
  on public.especialidades for select
  to authenticated
  using (activa or (select privado.es_admin()));

drop policy "Todos ven los turnos futuros" on public.turnos;
create policy "Sin cuenta se ven los turnos futuros"
  on public.turnos for select
  to anon
  using (inicio > now());
create policy "Con cuenta se ven los turnos futuros; el admin ve todos"
  on public.turnos for select
  to authenticated
  using (inicio > now() or (select privado.es_admin()));

-- Escritura: solo el admin. Los permisos van por columna (nunca el id).
-- Los centros y las especialidades no se borran: se dan de baja (activo / activa = false).
create policy "El admin carga centros"
  on public.centros for insert
  to authenticated
  with check ((select privado.es_admin()));
create policy "El admin cambia centros"
  on public.centros for update
  to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
grant insert (nombre, tipo, direccion, localidad, telefono, horario, lat, lng, accesibilidad, activo),
  update (nombre, tipo, direccion, localidad, telefono, horario, lat, lng, accesibilidad, activo)
  on public.centros to authenticated;

create policy "El admin carga especialidades"
  on public.especialidades for insert
  to authenticated
  with check ((select privado.es_admin()));
create policy "El admin cambia especialidades"
  on public.especialidades for update
  to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
grant insert (nombre, nombre_simple, descripcion, palabras_clave, activa),
  update (nombre, nombre_simple, descripcion, palabras_clave, activa)
  on public.especialidades to authenticated;

-- Los profesionales se borran con borrar_profesional() (revisa las reservas primero).
create policy "El admin carga profesionales"
  on public.profesionales for insert
  to authenticated
  with check ((select privado.es_admin()));
create policy "El admin cambia profesionales"
  on public.profesionales for update
  to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
grant insert (nombre, especialidad_id, centro_id), update (nombre, especialidad_id, centro_id)
  on public.profesionales to authenticated;

-- Los turnos se cargan de a muchos con generar_agenda(); de a uno también se puede (el trigger de
-- abajo revisa la superposición). De un turno ya cargado solo se cambian los requisitos: el estado
-- lo manejan las reservas y dar_de_baja_agenda().
create policy "El admin carga turnos"
  on public.turnos for insert
  to authenticated
  with check ((select privado.es_admin()));
create policy "El admin cambia turnos"
  on public.turnos for update
  to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));
grant insert (profesional_id, centro_id, especialidad_id, inicio, duracion_min, requisitos),
  update (requisitos)
  on public.turnos to authenticated;

-- buscar_turnos: igual que en 0301, pero además pide centro activo y especialidad activa (el admin
-- ve lo inactivo por RLS, y en la búsqueda tampoco tiene que aparecer).
create or replace function public.buscar_turnos(
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
      row_number() over (partition by c.id order by t.inicio) as orden_en_centro
    from public.turnos as t
    join public.centros as c on c.id = t.centro_id and c.activo
    join public.especialidades as e on e.id = t.especialidad_id and e.activa
    join public.profesionales as p on p.id = t.profesional_id
    where t.especialidad_id = p_especialidad_id
      and t.estado = 'disponible'
      and t.inicio > now()
      and (p_centro_id is null or t.centro_id = p_centro_id)
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

-- ===========================================================================
-- 2. Reservas vigentes y bajas
-- ===========================================================================

-- Los turnos reservados (confirmados y futuros) de un centro, una especialidad o un profesional,
-- y opcionalmente entre dos momentos. Devuelve { cantidad, turnos: [hasta 20] }. Sin datos
-- personales: número de reserva, día y hora, profesional, especialidad y centro.
create function privado.reservas_vigentes(
  p_centro_id bigint,
  p_especialidad_id bigint,
  p_profesional_id bigint,
  p_desde timestamptz default null,
  p_hasta timestamptz default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'cantidad', count(*),
    'turnos', coalesce(
      jsonb_agg(
        jsonb_build_object('numero', x.numero, 'inicio', x.inicio, 'profesional', x.profesional,
          'especialidad', x.especialidad, 'centro', x.centro)
        order by x.inicio
      ) filter (where x.orden <= 20),
      '[]'::jsonb
    )
  )
  from (
    select r.numero, t.inicio, p.nombre as profesional, e.nombre_simple as especialidad, c.nombre as centro,
      row_number() over (order by t.inicio) as orden
    from public.reservas as r
    join public.turnos as t on t.id = r.turno_id
    join public.profesionales as p on p.id = t.profesional_id
    join public.especialidades as e on e.id = t.especialidad_id
    join public.centros as c on c.id = t.centro_id
    where r.estado = 'confirmada'
      and t.inicio > now()
      and (p_centro_id is null or t.centro_id = p_centro_id)
      and (p_especialidad_id is null or t.especialidad_id = p_especialidad_id)
      and (p_profesional_id is null or t.profesional_id = p_profesional_id)
      and (p_desde is null or t.inicio >= p_desde)
      and (p_hasta is null or t.inicio < p_hasta)
  ) as x;
$$;

-- Frena una baja si hay turnos reservados. El mensaje sirve tal cual; en `detail` va la lista
-- (jsonb) y en `hint` la marca 'reservas_vigentes' para que la app la reconozca.
create function privado.frenar_baja(p_que text, p_vigentes jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cantidad integer := (p_vigentes ->> 'cantidad')::integer;
begin
  if v_cantidad > 0 then
    raise exception using
      message = format(
        'No podés dar de baja %s: tiene %s. Primero reasignalos o cancelalos.',
        p_que,
        case when v_cantidad = 1 then '1 turno reservado' else v_cantidad || ' turnos reservados' end
      ),
      detail = p_vigentes::text,
      hint = 'reservas_vigentes';
  end if;
end;
$$;

-- Centros: limpia los textos, completa las coordenadas con las de la localidad si no vienen,
-- no deja publicar (activo) un centro sin teléfono, horario o accesibilidad, y no deja darlo de
-- baja si tiene turnos reservados.
create function privado.al_guardar_centro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.nombre := btrim(new.nombre);
  new.direccion := btrim(new.direccion);
  new.telefono := nullif(btrim(new.telefono), '');
  new.horario := nullif(btrim(new.horario), '');
  new.accesibilidad := nullif(btrim(new.accesibilidad), '');
  if new.lat is null or new.lng is null then
    select l.lat, l.lng into new.lat, new.lng from public.localidades as l where l.nombre = new.localidad;
  end if;
  -- Faltan datos obligatorios: queda guardado, pero no se publica en la búsqueda.
  if new.telefono is null or new.horario is null or new.accesibilidad is null then
    new.activo := false;
  end if;
  if tg_op = 'UPDATE' and old.activo and not new.activo then
    perform privado.frenar_baja('este centro', privado.reservas_vigentes(new.id, null, null));
  end if;
  return new;
end;
$$;

create trigger al_guardar_centro
  before insert or update on public.centros
  for each row execute function privado.al_guardar_centro();

create function privado.al_guardar_especialidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.nombre := btrim(new.nombre);
  new.nombre_simple := btrim(new.nombre_simple);
  new.descripcion := btrim(new.descripcion);
  -- Palabras clave en minúscula, sin repetir ni vacías.
  new.palabras_clave := array(
    select distinct lower(btrim(palabra)) from unnest(new.palabras_clave) as palabra
    where btrim(palabra) <> ''
    order by 1
  );
  if tg_op = 'UPDATE' and old.activa and not new.activa then
    perform privado.frenar_baja('esta especialidad', privado.reservas_vigentes(null, new.id, null));
  end if;
  return new;
end;
$$;

create trigger al_guardar_especialidad
  before insert or update on public.especialidades
  for each row execute function privado.al_guardar_especialidad();

-- Profesionales: no se cambia el centro ni la especialidad si tiene turnos futuros en la agenda
-- (esos turnos dicen dónde y de qué atiende).
create function privado.al_cambiar_profesional()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.nombre := btrim(new.nombre);
  if (new.centro_id <> old.centro_id or new.especialidad_id <> old.especialidad_id)
    and exists (
      select 1 from public.turnos
      where profesional_id = new.id and inicio > now() and estado <> 'baja'
    )
  then
    raise exception using
      message = 'No podés cambiar el centro ni la especialidad: este profesional tiene turnos en la agenda. Primero dalos de baja.',
      hint = 'agenda_vigente';
  end if;
  return new;
end;
$$;

create trigger al_cambiar_profesional
  before update on public.profesionales
  for each row execute function privado.al_cambiar_profesional();

-- Turnos nuevos: el centro y la especialidad salen siempre del profesional, y no se puede cargar
-- un turno que se superpone con otro del mismo profesional (RF-08). El mismo horario exacto lo
-- frena la clave única (así privado.generar_turnos sigue pudiendo correr varias veces).
create function privado.al_cargar_turno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_otro timestamptz;
begin
  select p.centro_id, p.especialidad_id into new.centro_id, new.especialidad_id
  from public.profesionales as p where p.id = new.profesional_id;

  select t.inicio into v_otro
  from public.turnos as t
  where t.profesional_id = new.profesional_id
    and t.estado <> 'baja'
    and t.inicio <> new.inicio
    and t.inicio > new.inicio - interval '1 day'
    and t.inicio < new.inicio + make_interval(mins => new.duracion_min)
    and t.inicio + make_interval(mins => t.duracion_min) > new.inicio
  limit 1;
  if found then
    raise exception using
      message = 'Ese turno se superpone con otro del mismo profesional.',
      detail = jsonb_build_object('inicio', new.inicio, 'existente', v_otro)::text,
      hint = 'superpuesto';
  end if;
  return new;
end;
$$;

create trigger al_cargar_turno
  before insert on public.turnos
  for each row execute function privado.al_cargar_turno();

-- ===========================================================================
-- 3. Auditoría (RF-08 y RNF Confiabilidad)
-- ===========================================================================
-- tabla: centros, especialidades, profesionales, turnos, reservas o 'panel' (intentos sin permiso).
-- accion: alta | modificacion | baja | acceso_denegado.
-- registro_id: el id del centro, especialidad, profesional o turno; el número de la reserva; o, para
--   una agenda entera, el id del profesional.
-- usuario_id: quién lo hizo. detalle: qué cambió (nombres de campos y el nombre del registro), sin
--   datos personales. El texto en palabras lo arma textoAuditoria() (app/utils/admin.ts).
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null check (tabla in ('centros', 'especialidades', 'profesionales', 'turnos', 'reservas', 'panel')),
  accion text not null check (accion in ('alta', 'modificacion', 'baja', 'acceso_denegado')),
  registro_id text,
  usuario_id uuid references public.perfiles (id) on delete set null,
  detalle jsonb not null default '{}',
  creado_en timestamptz not null default now()
);

create index auditoria_creado_idx on public.auditoria (creado_en desc);
create index auditoria_tabla_idx on public.auditoria (tabla, creado_en desc);
create index auditoria_usuario_idx on public.auditoria (usuario_id);

alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon;
revoke insert, update, delete, truncate on public.auditoria from authenticated;

create policy "Solo el admin ve la auditoría"
  on public.auditoria for select
  to authenticated
  using ((select privado.es_admin()));

-- Trigger genérico.
-- - Catálogo (centros, especialidades, profesionales, turnos): solo lo que hace un admin. Los
--   cambios de estado de un turno por una reserva no se registran acá (son de la reserva), y las
--   agendas enteras dejan una sola fila (la escriben generar_agenda y dar_de_baja_agenda, que
--   prenden 'ta.agenda' mientras tanto).
-- - Reservas: cancelaciones y cambios de fecha, con quién lo hizo (actualizada_por).
create function privado.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nueva jsonb;
  v_vieja jsonb;
  v_fila jsonb;
  v_campos text[];
  v_accion text;
begin
  if tg_table_name = 'reservas' then
    if old.estado = 'confirmada' and new.estado in ('cancelada', 'reprogramada') then
      insert into public.auditoria (tabla, accion, registro_id, usuario_id, detalle)
      values (
        'reservas',
        case when new.estado = 'cancelada' then 'baja' else 'modificacion' end,
        new.numero::text,
        new.actualizada_por,
        jsonb_build_object(
          'numero', new.numero,
          'estado', new.estado,
          'asistida', new.actualizada_por is distinct from new.solicitante_id
        )
      );
    end if;
    return null;
  end if;

  if auth.uid() is null or not privado.es_admin() or coalesce(current_setting('ta.agenda', true), '') = 'on' then
    return null;
  end if;

  v_nueva := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_vieja := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_fila := coalesce(v_nueva, v_vieja);

  if tg_op = 'UPDATE' then
    select array_agg(n.clave order by n.clave) into v_campos
    from jsonb_each(v_nueva) as n (clave, valor)
    where n.valor is distinct from v_vieja -> n.clave;
    if v_campos is null or (tg_table_name = 'turnos' and v_campos = array['estado']) then
      return null;
    end if;
  end if;

  v_accion := case
    when tg_op = 'INSERT' then 'alta'
    when tg_op = 'DELETE' then 'baja'
    when (v_vieja ->> 'activo')::boolean and not (v_nueva ->> 'activo')::boolean then 'baja'
    when (v_vieja ->> 'activa')::boolean and not (v_nueva ->> 'activa')::boolean then 'baja'
    else 'modificacion'
  end;

  insert into public.auditoria (tabla, accion, registro_id, usuario_id, detalle)
  values (
    tg_table_name,
    v_accion,
    v_fila ->> 'id',
    auth.uid(),
    jsonb_strip_nulls(jsonb_build_object(
      'nombre', case when tg_table_name = 'turnos' then v_fila ->> 'inicio' else v_fila ->> 'nombre' end,
      'campos', to_jsonb(v_campos)
    ))
  );
  return null;
end;
$$;

create trigger auditar after insert or update or delete on public.centros
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.especialidades
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.profesionales
  for each row execute function privado.auditar();
create trigger auditar after insert or update or delete on public.turnos
  for each row execute function privado.auditar();
create trigger auditar after update of estado on public.reservas
  for each row execute function privado.auditar();

-- Intento de entrar al panel (o pedir las métricas) sin ser admin (RF-09). Si la misma persona ya
-- quedó registrada en esa ruta hace menos de 10 segundos, no se repite (la página y la función de
-- métricas pueden avisar el mismo intento).
create function privado.registrar_rechazo(p_ruta text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_ruta text := left(coalesce(p_ruta, ''), 120);
begin
  if v_usuario is null or privado.es_admin() or v_ruta not like '/admin%' then
    return;
  end if;
  if exists (
    select 1 from public.auditoria
    where usuario_id = v_usuario and accion = 'acceso_denegado' and detalle ->> 'ruta' = v_ruta
      and creado_en > now() - interval '10 seconds'
  ) then
    return;
  end if;
  insert into public.auditoria (tabla, accion, usuario_id, detalle)
  values ('panel', 'acceso_denegado', v_usuario, jsonb_build_object('ruta', v_ruta));
end;
$$;

-- La llama la página /admin/sin-permiso. Para un admin no hace nada.
create function public.registrar_acceso_denegado(p_ruta text)
returns void
language sql
security definer
set search_path = ''
as $$
  select privado.registrar_rechazo(p_ruta);
$$;

-- ===========================================================================
-- 4. Agendas
-- ===========================================================================

-- generar_agenda: crea los turnos de un profesional entre dos fechas, los días de la semana
-- elegidos (1 = lunes ... 7 = domingo), de hora_desde a hora_hasta, cada `duracion` minutos.
-- Devuelve { ok: true, creados } o { ok: false, motivo }:
--   sin_permiso     no es admin
--   no_existe       el profesional no existe
--   datos_invalidos fechas al revés o pasadas, más de 92 días, sin días, horario al revés,
--                   duración fuera de 5 a 240 minutos
--   sin_turnos      con esos datos no se arma ningún turno
--   demasiados      más de 2000 turnos de una vez
--   superpuesto     alguno choca con un turno que ya tiene el profesional. Trae `cantidad` y
--                   `conflictos` (hasta 20: { inicio, existente }). No se crea ninguno.
-- Los horarios son en hora argentina. Deja una sola fila de auditoría para toda la agenda.
create function public.generar_agenda(
  p_profesional_id bigint,
  p_desde date,
  p_hasta date,
  p_dias integer[],
  p_hora_desde time,
  p_hora_hasta time,
  p_duracion integer,
  p_requisitos text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profesional public.profesionales%rowtype;
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_total integer;
  v_conflictos jsonb;
  v_creados integer;
  v_requisitos text := coalesce(
    nullif(btrim(p_requisitos), ''),
    'Llevá tu DNI.' || E'\n' || 'Si tenés obra social, llevá la credencial.'
  );
begin
  if auth.uid() is null or not privado.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  select * into v_profesional from public.profesionales where id = p_profesional_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if p_desde is null or p_hasta is null or p_desde < v_hoy or p_hasta < p_desde or p_hasta - p_desde > 92
    or p_dias is null or cardinality(p_dias) = 0 or not (p_dias <@ array[1, 2, 3, 4, 5, 6, 7])
    or p_hora_desde is null or p_hora_hasta is null or p_hora_hasta <= p_hora_desde
    or p_duracion is null or p_duracion not between 5 and 240
  then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;

  create temporary table pg_temp.nuevos_turnos on commit drop as
  select (dia::date + p_hora_desde + cupo * make_interval(mins => p_duracion))
    at time zone 'America/Argentina/Buenos_Aires' as inicio
  from generate_series(p_desde, p_hasta, interval '1 day') as dia
  cross join generate_series(0, (extract(epoch from p_hora_hasta - p_hora_desde) / 60)::integer / p_duracion - 1) as cupo
  where extract(isodow from dia)::integer = any (p_dias);

  -- Los de hoy que ya pasaron no se crean.
  delete from pg_temp.nuevos_turnos where inicio <= now();
  select count(*) into v_total from pg_temp.nuevos_turnos;
  if v_total = 0 then
    drop table pg_temp.nuevos_turnos;
    return jsonb_build_object('ok', false, 'motivo', 'sin_turnos');
  end if;
  if v_total > 2000 then
    drop table pg_temp.nuevos_turnos;
    return jsonb_build_object('ok', false, 'motivo', 'demasiados', 'cantidad', v_total);
  end if;

  -- Cada turno nuevo que choca, con el primer turno existente con el que choca.
  select jsonb_build_object(
    'cantidad', count(*),
    'conflictos', coalesce(
      jsonb_agg(jsonb_build_object('inicio', choques.inicio, 'existente', choques.existente) order by choques.inicio)
        filter (where choques.orden <= 20),
      '[]'::jsonb
    )
  )
  into v_conflictos
  from (
    select n.inicio, min(t.inicio) as existente, row_number() over (order by n.inicio) as orden
    from pg_temp.nuevos_turnos as n
    join public.turnos as t
      on t.profesional_id = p_profesional_id
     and t.estado <> 'baja'
     and t.inicio < n.inicio + make_interval(mins => p_duracion)
     and t.inicio + make_interval(mins => t.duracion_min) > n.inicio
    group by n.inicio
  ) as choques;

  if (v_conflictos ->> 'cantidad')::integer > 0 then
    drop table pg_temp.nuevos_turnos;
    return jsonb_build_object('ok', false, 'motivo', 'superpuesto') || v_conflictos;
  end if;

  perform set_config('ta.agenda', 'on', true);
  insert into public.turnos (profesional_id, centro_id, especialidad_id, inicio, duracion_min, requisitos)
  select p_profesional_id, v_profesional.centro_id, v_profesional.especialidad_id, n.inicio, p_duracion, v_requisitos
  from pg_temp.nuevos_turnos as n
  order by n.inicio
  -- Un turno dado de baja a esa misma hora vuelve a la agenda.
  on conflict (profesional_id, inicio) do update
    set estado = 'disponible', duracion_min = excluded.duracion_min, requisitos = excluded.requisitos
    where public.turnos.estado = 'baja';
  get diagnostics v_creados = row_count;
  perform set_config('ta.agenda', '', true);
  drop table pg_temp.nuevos_turnos;

  insert into public.auditoria (tabla, accion, registro_id, usuario_id, detalle)
  values ('turnos', 'alta', p_profesional_id::text, auth.uid(), jsonb_build_object(
    'nombre', v_profesional.nombre, 'agenda', true, 'cantidad', v_creados, 'desde', p_desde, 'hasta', p_hasta
  ));

  return jsonb_build_object('ok', true, 'creados', v_creados);
end;
$$;

-- dar_de_baja_agenda: saca de la agenda los turnos libres y futuros de un profesional entre dos
-- fechas (quedan con estado 'baja'). Si en esas fechas hay turnos reservados, no se da de baja
-- ninguno hasta reasignarlos o cancelarlos (RF-08).
-- Devuelve { ok: true, cantidad } o { ok: false, motivo: sin_permiso | no_existe | datos_invalidos
-- | reservados (con `cantidad` y `turnos`) }.
create function public.dar_de_baja_agenda(p_profesional_id bigint, p_desde date, p_hasta date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profesional public.profesionales%rowtype;
  v_desde timestamptz := p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_hasta timestamptz := (p_hasta + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_vigentes jsonb;
  v_cantidad integer;
begin
  if auth.uid() is null or not privado.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  select * into v_profesional from public.profesionales where id = p_profesional_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;

  v_vigentes := privado.reservas_vigentes(null, null, p_profesional_id, v_desde, v_hasta);
  if (v_vigentes ->> 'cantidad')::integer > 0 then
    return jsonb_build_object('ok', false, 'motivo', 'reservados') || v_vigentes;
  end if;

  perform set_config('ta.agenda', 'on', true);
  update public.turnos
  set estado = 'baja'
  where profesional_id = p_profesional_id and estado = 'disponible'
    and inicio > now() and inicio >= v_desde and inicio < v_hasta;
  get diagnostics v_cantidad = row_count;
  perform set_config('ta.agenda', '', true);

  if v_cantidad > 0 then
    insert into public.auditoria (tabla, accion, registro_id, usuario_id, detalle)
    values ('turnos', 'baja', p_profesional_id::text, auth.uid(), jsonb_build_object(
      'nombre', v_profesional.nombre, 'agenda', true, 'cantidad', v_cantidad, 'desde', p_desde, 'hasta', p_hasta
    ));
  end if;
  return jsonb_build_object('ok', true, 'cantidad', v_cantidad);
end;
$$;

-- borrar_profesional: borra un profesional y su agenda libre. No se puede si tiene turnos
-- reservados (motivo 'reservados', con la lista) o si alguno de sus turnos tuvo reservas
-- (motivo 'con_historial': esas reservas son registro; en ese caso se da de baja su agenda).
-- Devuelve { ok: true } o { ok: false, motivo: sin_permiso | no_existe | reservados | con_historial }.
create function public.borrar_profesional(p_profesional_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vigentes jsonb;
begin
  if auth.uid() is null or not privado.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  if not exists (select 1 from public.profesionales where id = p_profesional_id) then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  v_vigentes := privado.reservas_vigentes(null, null, p_profesional_id);
  if (v_vigentes ->> 'cantidad')::integer > 0 then
    return jsonb_build_object('ok', false, 'motivo', 'reservados') || v_vigentes;
  end if;
  if exists (
    select 1 from public.reservas as r join public.turnos as t on t.id = r.turno_id
    where t.profesional_id = p_profesional_id
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'con_historial');
  end if;

  perform set_config('ta.agenda', 'on', true);
  delete from public.turnos where profesional_id = p_profesional_id;
  perform set_config('ta.agenda', '', true);
  delete from public.profesionales where id = p_profesional_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ===========================================================================
-- 5. Métricas (RF-09)
-- ===========================================================================
-- eventos_uso: lo que hace la gente en la app, sin decir quién. Nunca ids de personas ni texto
-- libre: solo el tipo y, si corresponde, especialidad_id, centro_id, localidad o valor
-- ('activado', 'desactivado', '150'). 'demo' marca los datos de prueba de seed.sql.
-- Cualquiera inserta (también sin cuenta); solo el admin lee.
create table public.eventos_uso (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in (
    'busqueda', 'asistente_inicio', 'asistente_ia',
    'preferencia_voz', 'preferencia_contraste', 'preferencia_tamano',
    'acompanante_ayudar', 'acompanante_invitar'
  )),
  datos jsonb not null default '{}' check (
    jsonb_typeof(datos) = 'object'
    and (datos - array['especialidad_id', 'centro_id', 'localidad', 'valor', 'demo']) = '{}'::jsonb
    and pg_column_size(datos) < 400
  ),
  creado_en timestamptz not null default now()
);

create index eventos_uso_tipo_idx on public.eventos_uso (tipo, creado_en);

alter table public.eventos_uso enable row level security;
revoke all on public.eventos_uso from anon, authenticated;
grant insert (tipo, datos) on public.eventos_uso to anon, authenticated;
grant select on public.eventos_uso to authenticated;

-- creado_en no se puede mandar (no tiene permiso de columna): siempre es el momento del insert.
create policy "Cualquiera registra un evento"
  on public.eventos_uso for insert
  to anon, authenticated
  with check (creado_en > now() - interval '1 minute');

create policy "Solo el admin ve los eventos"
  on public.eventos_uso for select
  to authenticated
  using ((select privado.es_admin()));

-- metricas: los indicadores del período (días en hora argentina, las dos fechas incluidas),
-- agrupados por 'dia', 'centro', 'especialidad' o 'localidad'.
-- Devuelve { ok: true, hay_datos, resumen, filas } o { ok: false, motivo }:
--   sin_sesion, sin_permiso (no es admin: el intento queda en la auditoría), datos_invalidos.
-- Cada fila (y el resumen) trae:
--   buscados       búsquedas hechas (eventos 'busqueda')
--   reservados     reservas nuevas (sin contar las que vienen de cambiar de fecha)
--   cancelados / reprogramados   por la fecha en que se cancelaron o cambiaron
--   completados    reservas confirmadas (o 'completada') cuyo turno ya pasó, por la fecha del turno
--   segundos_promedio  cuánto tardó en promedio una reserva (asistente)
--   autonomas / asistidas  reservas nuevas hechas por la persona o por su acompañante
-- El resumen además trae `uso`: cantidad de cada evento de accesibilidad y modo acompañante
-- (los 'desactivado' no cuentan).
create function public.metricas(p_desde date, p_hasta date, p_agrupar text default 'dia')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_hasta timestamptz := (p_hasta + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_resultado jsonb;
  v_uso jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if not privado.es_admin() then
    perform privado.registrar_rechazo('/admin/metricas');
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 366
    or p_agrupar is null or p_agrupar not in ('dia', 'centro', 'especialidad', 'localidad')
  then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;

  with hechos_reservas as (
    select x.tipo, x.fecha, r.segundos, r.asistida, c.nombre as centro, e.nombre_simple as especialidad,
      c.localidad
    from public.reservas as r
    join public.turnos as t on t.id = r.turno_id
    join public.centros as c on c.id = t.centro_id
    join public.especialidades as e on e.id = t.especialidad_id
    cross join lateral (
      select 'reservado' as tipo, r.creada_en as fecha where r.reserva_origen_id is null
      union all
      select 'cancelado', r.actualizada_en where r.estado = 'cancelada'
      union all
      select 'reprogramado', r.actualizada_en where r.estado = 'reprogramada'
      union all
      select 'completado', t.inicio
      where r.estado = 'completada' or (r.estado = 'confirmada' and t.inicio <= now())
    ) as x
    where x.fecha >= v_desde and x.fecha < v_hasta
  ),
  hechos_busquedas as (
    select 'buscado' as tipo, ev.creado_en as fecha, null::integer as segundos, null::boolean as asistida,
      c.nombre as centro, e.nombre_simple as especialidad, ev.datos ->> 'localidad' as localidad
    from public.eventos_uso as ev
    left join public.centros as c
      on c.id = case when ev.datos ->> 'centro_id' ~ '^\d{1,15}$' then (ev.datos ->> 'centro_id')::bigint end
    left join public.especialidades as e
      on e.id = case when ev.datos ->> 'especialidad_id' ~ '^\d{1,15}$' then (ev.datos ->> 'especialidad_id')::bigint end
    where ev.tipo = 'busqueda' and ev.creado_en >= v_desde and ev.creado_en < v_hasta
  ),
  hechos as (
    select h.*,
      coalesce(case p_agrupar
        when 'dia' then to_char(h.fecha at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD')
        when 'centro' then h.centro
        when 'especialidad' then h.especialidad
        else h.localidad
      end, 'Sin dato') as clave
    from (select * from hechos_reservas union all select * from hechos_busquedas) as h
  ),
  grupos as (
    select
      clave,
      count(*) filter (where tipo = 'buscado') as buscados,
      count(*) filter (where tipo = 'reservado') as reservados,
      count(*) filter (where tipo = 'cancelado') as cancelados,
      count(*) filter (where tipo = 'reprogramado') as reprogramados,
      count(*) filter (where tipo = 'completado') as completados,
      round(avg(segundos) filter (where tipo = 'reservado')) as segundos_promedio,
      count(*) filter (where tipo = 'reservado' and not asistida) as autonomas,
      count(*) filter (where tipo = 'reservado' and asistida) as asistidas
    from hechos
    group by clave
  )
  select jsonb_build_object(
    'filas', coalesce((
      select jsonb_agg(to_jsonb(g) order by
        case when p_agrupar = 'dia' then g.clave end,
        g.buscados + g.reservados desc,
        g.clave)
      from grupos as g
    ), '[]'::jsonb),
    'resumen', (
      select jsonb_build_object(
        'buscados', count(*) filter (where tipo = 'buscado'),
        'reservados', count(*) filter (where tipo = 'reservado'),
        'cancelados', count(*) filter (where tipo = 'cancelado'),
        'reprogramados', count(*) filter (where tipo = 'reprogramado'),
        'completados', count(*) filter (where tipo = 'completado'),
        'segundos_promedio', round(avg(segundos) filter (where tipo = 'reservado')),
        'autonomas', count(*) filter (where tipo = 'reservado' and not asistida),
        'asistidas', count(*) filter (where tipo = 'reservado' and asistida)
      )
      from hechos
    )
  )
  into v_resultado;

  select coalesce(jsonb_object_agg(tipo, cantidad), '{}'::jsonb) into v_uso
  from (
    select ev.tipo, count(*) as cantidad
    from public.eventos_uso as ev
    where ev.tipo <> 'busqueda'
      and ev.creado_en >= v_desde and ev.creado_en < v_hasta
      and coalesce(ev.datos ->> 'valor', '') <> 'desactivado'
    group by ev.tipo
  ) as usos;

  return jsonb_build_object(
    'ok', true,
    'hay_datos', jsonb_array_length(v_resultado -> 'filas') > 0 or v_uso <> '{}'::jsonb,
    'resumen', (v_resultado -> 'resumen') || jsonb_build_object('uso', v_uso),
    'filas', v_resultado -> 'filas'
  );
end;
$$;

-- ===========================================================================
-- Permisos de las funciones
-- ===========================================================================
revoke execute on function privado.reservas_vigentes(bigint, bigint, bigint, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function privado.frenar_baja(text, jsonb) from public, anon, authenticated;
revoke execute on function privado.al_guardar_centro() from public, anon, authenticated;
revoke execute on function privado.al_guardar_especialidad() from public, anon, authenticated;
revoke execute on function privado.al_cambiar_profesional() from public, anon, authenticated;
revoke execute on function privado.al_cargar_turno() from public, anon, authenticated;
revoke execute on function privado.auditar() from public, anon, authenticated;
revoke execute on function privado.registrar_rechazo(text) from public, anon, authenticated;

revoke execute on function public.registrar_acceso_denegado(text) from public, anon;
revoke execute on function public.generar_agenda(bigint, date, date, integer[], time, time, integer, text) from public, anon;
revoke execute on function public.dar_de_baja_agenda(bigint, date, date) from public, anon;
revoke execute on function public.borrar_profesional(bigint) from public, anon;
revoke execute on function public.metricas(date, date, text) from public, anon;
grant execute on function public.registrar_acceso_denegado(text) to authenticated;
grant execute on function public.generar_agenda(bigint, date, date, integer[], time, time, integer, text) to authenticated;
grant execute on function public.dar_de_baja_agenda(bigint, date, date) to authenticated;
grant execute on function public.borrar_profesional(bigint) to authenticated;
grant execute on function public.metricas(date, date, text) to authenticated;
