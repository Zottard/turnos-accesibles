-- v0.4 — Reservas: el asistente de reserva y "Mis turnos".
-- Tabla `reservas` y las funciones que la escriben: reservar_turno, cancelar_reserva y
-- reprogramar_reserva. Las tres son atómicas (una sola transacción) y validan permisos adentro.
-- La app nunca escribe `reservas` directo: no hay políticas de insert, update ni delete.
-- mis_reservas: lo que muestra /mis-turnos (también turnos ya pasados, que `turnos` no deja ver).

-- ---------------------------------------------------------------------------
-- Reservas.
-- numero: el número correlativo que ve la persona ("Turno N.º 123").
-- solicitante_id: para quién es el turno. creada_por: quién apretó "Confirmar". Hoy son la misma
--   persona; en la v0.5 un acompañante puede reservar por otra persona.
-- estado: confirmada → cancelada | reprogramada. 'completada' queda para la v0.6 (panel): mientras
--   tanto, una reserva confirmada cuyo turno ya pasó se muestra como "cumplido" (se calcula al leer,
--   sin tareas programadas).
-- asistida: true cuando la hizo un acompañante (v0.5). segundos: cuánto tardó el asistente,
--   para las métricas de la v0.6.
-- reserva_origen_id: si viene de cambiar de fecha otra reserva, cuál era.
-- cancelada_tarde: se canceló con menos de 24 horas de aviso (la persona lo confirmó).
-- actualizada_en / actualizada_por: quién y cuándo canceló o cambió de fecha (auditoría).
-- ---------------------------------------------------------------------------
create table public.reservas (
  numero bigint generated always as identity unique,
  id uuid primary key default gen_random_uuid(),
  turno_id bigint not null references public.turnos (id),
  solicitante_id uuid not null references auth.users (id) on delete cascade,
  creada_por uuid references auth.users (id) on delete set null,
  estado text not null default 'confirmada'
    check (estado in ('confirmada', 'cancelada', 'reprogramada', 'completada')),
  asistida boolean not null default false,
  segundos integer check (segundos >= 0),
  reserva_origen_id uuid references public.reservas (id),
  cancelada_tarde boolean not null default false,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  actualizada_por uuid references auth.users (id) on delete set null
);

-- Un cupo, una sola reserva vigente. Es una segunda defensa: la primera es el update atómico
-- de reservar_turno.
create unique index reservas_turno_vigente_idx on public.reservas (turno_id) where estado = 'confirmada';
create index reservas_turno_idx on public.reservas (turno_id);
create index reservas_solicitante_idx on public.reservas (solicitante_id, estado);
create index reservas_creada_por_idx on public.reservas (creada_por);
create index reservas_origen_idx on public.reservas (reserva_origen_id);
create index reservas_actualizada_por_idx on public.reservas (actualizada_por);

alter table public.reservas enable row level security;
revoke all on public.reservas from anon;
revoke insert, update, delete, truncate on public.reservas from authenticated;

create policy "Cada persona ve sus reservas"
  on public.reservas for select
  to authenticated
  using (solicitante_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reservar_turno: reserva un turno para la persona que ingresó (RF-04).
--
-- Devuelve { ok: true, reserva_id, numero } o { ok: false, motivo }:
--   sin_sesion  no ingresó con su cuenta
--   no_existe   el turno no existe (o su centro se dio de baja)
--   vencido     el turno ya pasó
--   tomado      otra persona lo reservó (antes o mientras confirmaba)
--   superpuesto ya tiene un turno confirmado de la misma especialidad ese día, o cualquier otro
--               que empieza a menos de 2 horas. Trae `conflicto` con el resumen de ese turno.
--               Solo se avisa si p_confirmar_superposicion es false: la persona puede confirmar.
--
-- Atómica: el cupo se toma con un solo update "si sigue disponible". Si dos personas confirman
-- a la vez, Postgres hace esperar a la segunda; cuando le toca, el turno ya no está disponible y
-- recibe 'tomado'. Nunca quedan dos reservas para el mismo cupo.
--
-- v0.5: acá se agrega p_para (reservar para otra persona, si dio permiso) y se programan los
-- avisos y el recordatorio de la reserva.
-- ---------------------------------------------------------------------------
create function public.reservar_turno(
  p_turno_id bigint,
  p_confirmar_superposicion boolean default false,
  p_asistida boolean default false,
  p_segundos integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_turno public.turnos%rowtype;
  v_conflicto record;
  v_reserva public.reservas%rowtype;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select t.* into v_turno
  from public.turnos as t
  join public.centros as c on c.id = t.centro_id and c.activo
  where t.id = p_turno_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_turno.inicio <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'vencido');
  end if;
  if v_turno.estado <> 'disponible' then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  -- ¿Ya tiene otro turno que se superpone? (misma especialidad el mismo día, o a menos de 2 h)
  if not coalesce(p_confirmar_superposicion, false) then
    select r.numero, t.inicio, e.nombre_simple as especialidad, c.nombre as centro
    into v_conflicto
    from public.reservas as r
    join public.turnos as t on t.id = r.turno_id
    join public.especialidades as e on e.id = t.especialidad_id
    join public.centros as c on c.id = t.centro_id
    where r.solicitante_id = v_usuario
      and r.estado = 'confirmada'
      and t.inicio > now()
      and (
        (
          t.especialidad_id = v_turno.especialidad_id
          and (t.inicio at time zone 'America/Argentina/Buenos_Aires')::date
            = (v_turno.inicio at time zone 'America/Argentina/Buenos_Aires')::date
        )
        or abs(extract(epoch from t.inicio - v_turno.inicio)) < 2 * 60 * 60
      )
    order by t.inicio
    limit 1;
    if found then
      return jsonb_build_object(
        'ok', false,
        'motivo', 'superpuesto',
        'conflicto', jsonb_build_object(
          'numero', v_conflicto.numero,
          'inicio', v_conflicto.inicio,
          'especialidad', v_conflicto.especialidad,
          'centro', v_conflicto.centro
        )
      );
    end if;
  end if;

  -- El paso atómico: tomar el cupo solo si sigue disponible.
  update public.turnos
  set estado = 'reservado'
  where id = p_turno_id and estado = 'disponible' and inicio > now();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  insert into public.reservas (turno_id, solicitante_id, creada_por, asistida, segundos)
  values (
    p_turno_id,
    v_usuario,
    v_usuario,
    coalesce(p_asistida, false),
    -- Más de un día no es un dato real (por ejemplo, un borrador de la semana pasada).
    case when p_segundos between 0 and 86400 then p_segundos end
  )
  returning * into v_reserva;

  return jsonb_build_object('ok', true, 'reserva_id', v_reserva.id, 'numero', v_reserva.numero);
end;
$$;

-- ---------------------------------------------------------------------------
-- cancelar_reserva: cancela un turno propio y libera el cupo (RF-05).
--
-- Devuelve { ok: true, numero } o { ok: false, motivo }:
--   sin_sesion, no_existe (no existe o no es suya)
--   ya_paso         el turno ya se cumplió o venció: no se puede cancelar
--   no_vigente      ya estaba cancelado o se cambió de fecha
--   fuera_de_plazo  faltan menos de 24 horas. Trae `horas` (las que faltan). Si la persona
--                   confirma (p_confirmar_tarde), se cancela y queda registrado (cancelada_tarde).
--
-- v0.5: acá se dan de baja los recordatorios y se avisa la cancelación (también al acompañante).
-- ---------------------------------------------------------------------------
create function public.cancelar_reserva(
  p_reserva_id uuid,
  p_confirmar_tarde boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_reserva public.reservas%rowtype;
  v_inicio timestamptz;
  v_tarde boolean;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  -- "for update": si llegan dos pedidos juntos para la misma reserva, el segundo espera.
  select * into v_reserva
  from public.reservas
  where id = p_reserva_id and solicitante_id = v_usuario
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  select inicio into v_inicio from public.turnos where id = v_reserva.turno_id;
  if v_reserva.estado = 'completada' or v_inicio <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'ya_paso');
  end if;
  if v_reserva.estado <> 'confirmada' then
    return jsonb_build_object('ok', false, 'motivo', 'no_vigente');
  end if;

  v_tarde := v_inicio - now() < interval '24 hours';
  if v_tarde and not coalesce(p_confirmar_tarde, false) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'fuera_de_plazo',
      'horas', floor(extract(epoch from v_inicio - now()) / 3600)
    );
  end if;

  update public.reservas
  set estado = 'cancelada', cancelada_tarde = v_tarde, actualizada_en = now(), actualizada_por = v_usuario
  where id = v_reserva.id;

  -- El cupo vuelve a aparecer en la búsqueda.
  update public.turnos set estado = 'disponible' where id = v_reserva.turno_id;

  return jsonb_build_object('ok', true, 'numero', v_reserva.numero);
end;
$$;

-- ---------------------------------------------------------------------------
-- reprogramar_reserva: cambia un turno propio por otro de la misma especialidad (RF-05).
--
-- Primero intenta tomar el turno nuevo. Si ya no está disponible devuelve 'tomado' y la reserva
-- original queda como estaba. Si lo consigue, en la misma transacción: la reserva vieja pasa a
-- 'reprogramada', su cupo se libera y se crea la reserva nueva (reserva_origen_id = la vieja).
--
-- Devuelve { ok: true, reserva_id, numero } o { ok: false, motivo }:
--   sin_sesion, no_existe, ya_paso, no_vigente (como en cancelar_reserva)
--   tomado             el turno nuevo ya no está disponible (o ya pasó)
--   otra_especialidad  el turno nuevo es de otra especialidad
--   mismo_turno        eligió el mismo turno que ya tenía
--
-- v0.5: acá se reemplazan los recordatorios del turno viejo por los del nuevo.
-- ---------------------------------------------------------------------------
create function public.reprogramar_reserva(
  p_reserva_id uuid,
  p_nuevo_turno_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_reserva public.reservas%rowtype;
  v_viejo public.turnos%rowtype;
  v_nuevo public.turnos%rowtype;
  v_nueva public.reservas%rowtype;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select * into v_reserva
  from public.reservas
  where id = p_reserva_id and solicitante_id = v_usuario
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;

  select * into v_viejo from public.turnos where id = v_reserva.turno_id;
  if v_reserva.estado = 'completada' or v_viejo.inicio <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'ya_paso');
  end if;
  if v_reserva.estado <> 'confirmada' then
    return jsonb_build_object('ok', false, 'motivo', 'no_vigente');
  end if;
  if p_nuevo_turno_id = v_viejo.id then
    return jsonb_build_object('ok', false, 'motivo', 'mismo_turno');
  end if;

  select t.* into v_nuevo
  from public.turnos as t
  join public.centros as c on c.id = t.centro_id and c.activo
  where t.id = p_nuevo_turno_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;
  if v_nuevo.especialidad_id <> v_viejo.especialidad_id then
    return jsonb_build_object('ok', false, 'motivo', 'otra_especialidad');
  end if;

  -- Primero el turno nuevo: si no se puede, no tocamos nada.
  update public.turnos
  set estado = 'reservado'
  where id = p_nuevo_turno_id and estado = 'disponible' and inicio > now();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  update public.reservas
  set estado = 'reprogramada', actualizada_en = now(), actualizada_por = v_usuario
  where id = v_reserva.id;

  update public.turnos set estado = 'disponible' where id = v_viejo.id;

  insert into public.reservas (turno_id, solicitante_id, creada_por, asistida, reserva_origen_id)
  values (p_nuevo_turno_id, v_usuario, v_usuario, v_reserva.asistida, v_reserva.id)
  returning * into v_nueva;

  return jsonb_build_object('ok', true, 'reserva_id', v_nueva.id, 'numero', v_nueva.numero);
end;
$$;

-- ---------------------------------------------------------------------------
-- mis_reservas: las reservas de la persona que ingresó, con los datos del turno, la
-- especialidad y el centro. Con p_numero, solo esa (para el comprobante).
-- Es security definer porque `turnos` solo deja ver turnos futuros y acá también van los
-- anteriores. Igual filtra por auth.uid(): nadie ve reservas de otra persona.
-- origen_numero: el turno que reemplazó. nueva_numero: el turno por el que se cambió.
-- ---------------------------------------------------------------------------
create function public.mis_reservas(p_numero bigint default null)
returns table (
  id uuid,
  numero bigint,
  estado text,
  cancelada_tarde boolean,
  creada_en timestamptz,
  actualizada_en timestamptz,
  origen_numero bigint,
  nueva_numero bigint,
  turno_id bigint,
  inicio timestamptz,
  duracion_min integer,
  requisitos text,
  profesional text,
  especialidad_id bigint,
  especialidad_nombre text,
  especialidad_nombre_simple text,
  centro_id bigint,
  centro_nombre text,
  centro_tipo text,
  centro_direccion text,
  centro_localidad text,
  centro_telefono text,
  centro_horario text,
  centro_accesibilidad text,
  centro_lat double precision,
  centro_lng double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.numero, r.estado, r.cancelada_tarde, r.creada_en, r.actualizada_en,
    origen.numero, nueva.numero,
    t.id, t.inicio, t.duracion_min, t.requisitos,
    p.nombre,
    e.id, e.nombre, e.nombre_simple,
    c.id, c.nombre, c.tipo, c.direccion, c.localidad, c.telefono, c.horario, c.accesibilidad, c.lat, c.lng
  from public.reservas as r
  join public.turnos as t on t.id = r.turno_id
  join public.profesionales as p on p.id = t.profesional_id
  join public.especialidades as e on e.id = t.especialidad_id
  join public.centros as c on c.id = t.centro_id
  left join public.reservas as origen on origen.id = r.reserva_origen_id
  left join public.reservas as nueva on nueva.reserva_origen_id = r.id
  where r.solicitante_id = (select auth.uid())
    and (p_numero is null or r.numero = p_numero)
  order by t.inicio desc;
$$;

-- Solo para personas que ingresaron.
revoke execute on function public.reservar_turno(bigint, boolean, boolean, integer) from public, anon;
revoke execute on function public.cancelar_reserva(uuid, boolean) from public, anon;
revoke execute on function public.reprogramar_reserva(uuid, bigint) from public, anon;
revoke execute on function public.mis_reservas(bigint) from public, anon;
grant execute on function public.reservar_turno(bigint, boolean, boolean, integer) to authenticated;
grant execute on function public.cancelar_reserva(uuid, boolean) to authenticated;
grant execute on function public.reprogramar_reserva(uuid, bigint) to authenticated;
grant execute on function public.mis_reservas(bigint) to authenticated;
