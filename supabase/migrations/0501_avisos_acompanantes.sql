-- v0.5 — Avisos y modo acompañante (RF-06 y RF-07).
--
-- acompanamientos: el vínculo entre una persona (solicitante) y quien la ayuda (acompañante),
--   con el alcance que le dio. Es también la constancia del consentimiento: las filas nunca se
--   borran, solo cambian de estado.
-- notificaciones: los avisos de cada persona (reserva, cancelación, cambio, recordatorio...).
--   Los crean solo los triggers y funciones de esta migración, nunca la app.
-- Las reservas ahora aceptan p_para: un acompañante opera los turnos de otra persona, siempre
-- dentro del alcance (privado.puede_actuar).

-- ===========================================================================
-- 1. Acompañamientos
-- ===========================================================================
-- estado: pendiente (invitación enviada) → activo (aceptada) → revocado (la persona le sacó el
--   permiso). Una invitación pendiente también puede terminar rechazada o vencida.
-- vence_en: hasta cuándo se puede aceptar la invitación (7 días). Un vínculo activo no vence:
--   dura hasta que la persona lo revoca.
-- consentido_en: cuándo la persona confirmó "Autorizo a ..." (fecha, hora y alcance = constancia).
-- alcance: siempre incluye 'ver'. 'reservar' = sacar turnos; 'cancelar' = cancelar o cambiar de fecha.
-- correo_invitado: la invitación solo la puede aceptar una cuenta con ese correo.
create table public.acompanamientos (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references auth.users (id) on delete cascade,
  acompanante_id uuid references auth.users (id) on delete set null,
  nombre_invitado text not null check (char_length(nombre_invitado) between 1 and 80),
  correo_invitado text not null check (correo_invitado = lower(trim(correo_invitado))),
  alcance text[] not null check (alcance <@ array['ver', 'reservar', 'cancelar'] and 'ver' = any (alcance)),
  token uuid not null unique default gen_random_uuid(),
  vence_en timestamptz not null default now() + interval '7 days',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'activo', 'revocado', 'vencido', 'rechazado')),
  consentido_en timestamptz not null default now(),
  aceptado_en timestamptz,
  revocado_en timestamptz,
  creado_en timestamptz not null default now(),
  check (acompanante_id is null or acompanante_id <> solicitante_id)
);

create index acompanamientos_solicitante_idx on public.acompanamientos (solicitante_id, estado);
create index acompanamientos_acompanante_idx on public.acompanamientos (acompanante_id, estado);
-- Una sola invitación vigente por correo, y un solo vínculo activo entre dos personas.
create unique index acompanamientos_correo_vigente_idx on public.acompanamientos (solicitante_id, correo_invitado)
  where estado in ('pendiente', 'activo');
create unique index acompanamientos_par_activo_idx on public.acompanamientos (solicitante_id, acompanante_id)
  where estado = 'activo';

alter table public.acompanamientos enable row level security;
revoke all on public.acompanamientos from anon;
revoke insert, update, delete, truncate on public.acompanamientos from authenticated;

-- La persona ve sus invitaciones (con el estado de cada una); el acompañante, las que aceptó.
create policy "Cada persona ve sus acompañamientos"
  on public.acompanamientos for select
  to authenticated
  using (solicitante_id = (select auth.uid()) or acompanante_id = (select auth.uid()));

-- ¿p_actor puede hacer p_accion ('ver', 'reservar', 'cancelar') con los turnos de p_solicitante?
-- Sí si es la misma persona, o si tiene un acompañamiento activo que incluye esa acción.
-- Es security definer para poder usarla en las políticas de `reservas` sin depender de la RLS
-- de `acompanamientos`.
create function privado.puede_actuar(p_actor uuid, p_solicitante uuid, p_accion text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor is not null and p_solicitante is not null and (
    p_actor = p_solicitante
    or exists (
      select 1 from public.acompanamientos as a
      where a.solicitante_id = p_solicitante
        and a.acompanante_id = p_actor
        and a.estado = 'activo'
        and p_accion = any (a.alcance)
    )
  );
$$;

-- Por qué no puede: 'sin_permiso' (lo acompaña, pero esa acción no está en el alcance) o
-- 'sin_vinculo' (no lo acompaña, o le sacaron el permiso).
create function privado.motivo_sin_permiso(p_actor uuid, p_solicitante uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when privado.puede_actuar(p_actor, p_solicitante, 'ver') then 'sin_permiso' else 'sin_vinculo' end;
$$;

revoke execute on function privado.puede_actuar(uuid, uuid, text) from public, anon;
revoke execute on function privado.motivo_sin_permiso(uuid, uuid) from public, anon, authenticated;
grant execute on function privado.puede_actuar(uuid, uuid, text) to authenticated;

-- El acompañante ve las reservas de la persona que acompaña (alcance 'ver', que siempre está).
-- Nada más: los datos personales (perfiles) siguen siendo solo de cada persona.
drop policy "Cada persona ve sus reservas" on public.reservas;
create policy "Cada persona ve sus reservas y las de quien acompaña"
  on public.reservas for select
  to authenticated
  using (solicitante_id = (select auth.uid()) or privado.puede_actuar((select auth.uid()), solicitante_id, 'ver'));

-- ===========================================================================
-- 2. Notificaciones (avisos)
-- ===========================================================================
-- usuario_id: quién recibe el aviso. solicitante_id: de quién es el turno (si es una copia para
--   un acompañante, la persona acompañada). reserva_id: el turno del aviso, si tiene.
-- tipo: reserva (es el comprobante), cancelacion, reprogramacion, recordatorio,
--   acompanamiento (aceptó, rechazó o se revocó un permiso), disponibilidad ("hay turno") y
--   correo (no pudimos mandarle correos: que revise su dirección).
-- datos: una foto del turno al momento del aviso (número, día y hora, especialidad, centro,
--   dirección, requisitos, ubicación) y quién lo hizo. El texto en lenguaje simple lo arma
--   textoAviso() (shared/utils/avisos.ts), igual en la app y en el correo.
-- Estados: enviada = ya llegó enviar_desde (antes no se ve); entregada = la app lo mostró
--   (entregada_en); leída = la persona lo abrió o lo marcó (leida_en).
-- correo_*: el envío por correo (server/api/avisos/enviar.ts). null = no va por correo.
create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  solicitante_id uuid references auth.users (id) on delete cascade,
  reserva_id uuid references public.reservas (id) on delete cascade,
  tipo text not null check (tipo in (
    'reserva', 'cancelacion', 'reprogramacion', 'recordatorio', 'acompanamiento', 'disponibilidad', 'correo'
  )),
  datos jsonb not null default '{}',
  enviar_desde timestamptz not null default now(),
  entregada_en timestamptz,
  leida_en timestamptz,
  correo_estado text check (correo_estado in ('pendiente', 'enviado', 'error')),
  correo_error text,
  intentos integer not null default 0 check (intentos >= 0),
  creada_en timestamptz not null default now()
);

create index notificaciones_usuario_idx on public.notificaciones (usuario_id, enviar_desde desc);
create index notificaciones_solicitante_idx on public.notificaciones (solicitante_id);
create index notificaciones_reserva_idx on public.notificaciones (reserva_id, tipo);
create index notificaciones_correo_idx on public.notificaciones (enviar_desde) where correo_estado = 'pendiente';

alter table public.notificaciones enable row level security;
revoke all on public.notificaciones from anon;
revoke insert, update, delete, truncate on public.notificaciones from authenticated;
-- Desde la app solo se marca "entregada" y "leída".
grant update (entregada_en, leida_en) on public.notificaciones to authenticated;

create policy "Cada persona ve sus avisos ya enviados"
  on public.notificaciones for select
  to authenticated
  using (usuario_id = (select auth.uid()) and enviar_desde <= now());

create policy "Cada persona marca sus avisos"
  on public.notificaciones for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- Quién recibe los avisos de los turnos de una persona: ella y sus acompañantes activos.
create function privado.destinatarios(p_solicitante uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p_solicitante
  union
  select a.acompanante_id from public.acompanamientos as a
  where a.solicitante_id = p_solicitante and a.estado = 'activo' and a.acompanante_id is not null;
$$;

-- La foto del turno que va en `datos`. para = nombre de la persona del turno.
create function privado.datos_reserva(p_reserva_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', r.numero,
    'inicio', t.inicio,
    'especialidad', e.nombre,
    'especialidad_simple', e.nombre_simple,
    'profesional', p.nombre,
    'centro', c.nombre,
    'direccion', c.direccion,
    'localidad', c.localidad,
    'telefono', c.telefono,
    'requisitos', t.requisitos,
    'lat', c.lat,
    'lng', c.lng,
    'para', coalesce(persona.nombre, '')
  )
  from public.reservas as r
  join public.turnos as t on t.id = r.turno_id
  join public.especialidades as e on e.id = t.especialidad_id
  join public.profesionales as p on p.id = t.profesional_id
  join public.centros as c on c.id = t.centro_id
  left join public.perfiles as persona on persona.id = r.solicitante_id
  where r.id = p_reserva_id;
$$;

-- El momento del recordatorio: `horas` antes del turno. null si ese momento ya pasó (por
-- ejemplo, un turno para dentro de 3 horas con recordatorio de 24): el aviso de la reserva
-- recién llegado ya cumple esa función. Es el mismo cálculo que momentoRecordatorio() en la app.
create function privado.momento_recordatorio(p_inicio timestamptz, p_horas integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case when p_inicio - make_interval(hours => p_horas) > now() then p_inicio - make_interval(hours => p_horas) end;
$$;

-- Avisa un cambio de una reserva a la persona y a sus acompañantes. p_actor: quién lo hizo.
-- Los avisos de turnos también van por correo (correo_estado 'pendiente').
create function privado.avisar_reserva(p_reserva_id uuid, p_tipo text, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva public.reservas%rowtype;
  v_datos jsonb;
begin
  select * into v_reserva from public.reservas where id = p_reserva_id;
  v_datos := privado.datos_reserva(p_reserva_id);
  -- Si lo hizo un acompañante, el aviso lo dice ("Lo sacó Lucía").
  if p_actor is not null and p_actor <> v_reserva.solicitante_id then
    v_datos := v_datos || jsonb_build_object(
      'por_id', p_actor,
      'por', coalesce((select nombre from public.perfiles where id = p_actor), '')
    );
  end if;
  -- Cambio de fecha: también el día y la hora de antes.
  if p_tipo = 'reprogramacion' and v_reserva.reserva_origen_id is not null then
    v_datos := v_datos || jsonb_build_object('antes', (
      select t.inicio from public.reservas as r join public.turnos as t on t.id = r.turno_id
      where r.id = v_reserva.reserva_origen_id
    ));
  end if;

  insert into public.notificaciones (usuario_id, solicitante_id, reserva_id, tipo, datos, correo_estado)
  select destinatario, v_reserva.solicitante_id, p_reserva_id, p_tipo, v_datos, 'pendiente'
  from privado.destinatarios(v_reserva.solicitante_id) as destinatario;
end;
$$;

-- Programa el recordatorio de una reserva para cada destinatario, con la antelación que eligió
-- cada uno (24 horas si todavía no eligió).
create function privado.programar_recordatorios(p_reserva_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitante uuid;
  v_inicio timestamptz;
  v_datos jsonb;
begin
  select r.solicitante_id, t.inicio into v_solicitante, v_inicio
  from public.reservas as r join public.turnos as t on t.id = r.turno_id
  where r.id = p_reserva_id;
  v_datos := privado.datos_reserva(p_reserva_id);

  insert into public.notificaciones (usuario_id, solicitante_id, reserva_id, tipo, datos, enviar_desde, correo_estado)
  select destinatario, v_solicitante, p_reserva_id, 'recordatorio', v_datos, momento, 'pendiente'
  from privado.destinatarios(v_solicitante) as destinatario
  cross join lateral (
    select privado.momento_recordatorio(
      v_inicio,
      coalesce((select p.antelacion_horas from public.preferencias as p where p.usuario_id = destinatario), 24)
    ) as momento
  ) as calculo
  where momento is not null;
end;
$$;

-- Trigger de `reservas`: avisos y recordatorios (RF-04, RF-05 y RF-06).
-- - Reserva nueva confirmada: aviso 'reserva' (el comprobante) o 'reprogramacion' si viene de
--   cambiar de fecha otra, y su recordatorio.
-- - Cancelada o cambiada de fecha: se borran sus recordatorios que todavía no salieron. Si se
--   canceló, aviso 'cancelacion'. (Si se cambió de fecha, avisa la reserva nueva al crearse.)
create function privado.al_cambiar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'confirmada' then
      perform privado.avisar_reserva(
        new.id,
        case when new.reserva_origen_id is null then 'reserva' else 'reprogramacion' end,
        new.creada_por
      );
      perform privado.programar_recordatorios(new.id);
    end if;
  elsif old.estado = 'confirmada' and new.estado in ('cancelada', 'reprogramada') then
    delete from public.notificaciones
    where reserva_id = new.id and tipo = 'recordatorio' and enviar_desde > now();
    if new.estado = 'cancelada' then
      perform privado.avisar_reserva(new.id, 'cancelacion', new.actualizada_por);
    end if;
  end if;
  return null;
end;
$$;

create trigger al_cambiar_reserva
  after insert or update of estado on public.reservas
  for each row execute function privado.al_cambiar_reserva();

-- Trigger de `preferencias`: si la persona cambia la antelación, sus recordatorios que todavía
-- no salieron se mueven a la nueva hora. Si la nueva hora ya pasó, salen enseguida.
create function privado.al_cambiar_antelacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.antelacion_horas = new.antelacion_horas then
    return null;
  end if;
  update public.notificaciones as n
  set enviar_desde = greatest(t.inicio - make_interval(hours => new.antelacion_horas), now())
  from public.reservas as r
  join public.turnos as t on t.id = r.turno_id
  where n.reserva_id = r.id
    and n.usuario_id = new.usuario_id
    and n.tipo = 'recordatorio'
    and n.enviar_desde > now();
  return null;
end;
$$;

create trigger al_cambiar_antelacion
  after insert or update of antelacion_horas on public.preferencias
  for each row execute function privado.al_cambiar_antelacion();

-- Trigger de `turnos`: "Avisame cuando haya turno" (v0.3). Cuando aparece un turno libre (nuevo o
-- liberado por una cancelación) de una especialidad que alguien pidió, le avisamos y el pedido se
-- borra (es de una sola vez; puede volver a pedirlo).
create function privado.al_liberar_turno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado <> 'disponible' or new.inicio <= now() or (tg_op = 'UPDATE' and old.estado = 'disponible') then
    return null;
  end if;
  with avisados as (
    delete from public.avisos_disponibilidad as a
    using public.centros as c
    where c.id = new.centro_id
      and a.especialidad_id = new.especialidad_id
      and (a.localidad is null or a.localidad = c.localidad)
    returning a.usuario_id
  )
  insert into public.notificaciones (usuario_id, solicitante_id, tipo, datos)
  select
    avisados.usuario_id,
    avisados.usuario_id,
    'disponibilidad',
    jsonb_build_object(
      'turno_id', new.id,
      'inicio', new.inicio,
      'especialidad', e.nombre,
      'especialidad_simple', e.nombre_simple,
      'centro', c.nombre,
      'direccion', c.direccion,
      'localidad', c.localidad,
      'lat', c.lat,
      'lng', c.lng
    )
  from avisados
  join public.especialidades as e on e.id = new.especialidad_id
  join public.centros as c on c.id = new.centro_id;
  return null;
end;
$$;

create trigger al_liberar_turno
  after insert or update of estado on public.turnos
  for each row execute function privado.al_liberar_turno();

revoke execute on function privado.destinatarios(uuid) from public, anon, authenticated;
revoke execute on function privado.datos_reserva(uuid) from public, anon, authenticated;
revoke execute on function privado.momento_recordatorio(timestamptz, integer) from public, anon, authenticated;
revoke execute on function privado.avisar_reserva(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function privado.programar_recordatorios(uuid) from public, anon, authenticated;
revoke execute on function privado.al_cambiar_reserva() from public, anon, authenticated;
revoke execute on function privado.al_cambiar_antelacion() from public, anon, authenticated;
revoke execute on function privado.al_liberar_turno() from public, anon, authenticated;

-- ===========================================================================
-- 3. Reservas con p_para (reemplazan a las de la v0.4)
-- ===========================================================================
-- Las cuatro aceptan p_para: el id de la persona para la que se opera. Sin p_para, es para uno
-- mismo (como en la v0.4). Con p_para, quien llama tiene que ser su acompañante activo y la
-- acción tiene que estar en el alcance; si no, { ok: false, motivo: 'sin_permiso' } (lo acompaña
-- pero no puede hacer eso) o 'sin_vinculo' (no lo acompaña o le sacaron el permiso).
-- creada_por / actualizada_por = quien apretó el botón; asistida = lo hizo un acompañante.
-- Las superposiciones se revisan con los turnos de la persona, no del acompañante.
drop function public.reservar_turno(bigint, boolean, boolean, integer);
drop function public.cancelar_reserva(uuid, boolean);
drop function public.reprogramar_reserva(uuid, bigint);
drop function public.mis_reservas(bigint);

-- reservar_turno: ver 0401_reservas.sql (motivos sin_sesion, no_existe, vencido, tomado,
-- superpuesto) + sin_permiso / sin_vinculo. Alcance necesario: 'reservar'.
create function public.reservar_turno(
  p_turno_id bigint,
  p_confirmar_superposicion boolean default false,
  p_segundos integer default null,
  p_para uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_solicitante uuid := coalesce(p_para, auth.uid());
  v_turno public.turnos%rowtype;
  v_conflicto record;
  v_reserva public.reservas%rowtype;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if not privado.puede_actuar(v_actor, v_solicitante, 'reservar') then
    return jsonb_build_object('ok', false, 'motivo', privado.motivo_sin_permiso(v_actor, v_solicitante));
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

  if not coalesce(p_confirmar_superposicion, false) then
    select r.numero, t.inicio, e.nombre_simple as especialidad, c.nombre as centro
    into v_conflicto
    from public.reservas as r
    join public.turnos as t on t.id = r.turno_id
    join public.especialidades as e on e.id = t.especialidad_id
    join public.centros as c on c.id = t.centro_id
    where r.solicitante_id = v_solicitante
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

  update public.turnos
  set estado = 'reservado'
  where id = p_turno_id and estado = 'disponible' and inicio > now();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  -- El trigger al_cambiar_reserva manda el aviso (comprobante) y programa el recordatorio.
  insert into public.reservas (turno_id, solicitante_id, creada_por, asistida, segundos)
  values (
    p_turno_id,
    v_solicitante,
    v_actor,
    v_actor <> v_solicitante,
    case when p_segundos between 0 and 86400 then p_segundos end
  )
  returning * into v_reserva;

  return jsonb_build_object('ok', true, 'reserva_id', v_reserva.id, 'numero', v_reserva.numero);
end;
$$;

-- cancelar_reserva: ver 0401_reservas.sql. Alcance necesario: 'cancelar'.
create function public.cancelar_reserva(
  p_reserva_id uuid,
  p_confirmar_tarde boolean default false,
  p_para uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_solicitante uuid := coalesce(p_para, auth.uid());
  v_reserva public.reservas%rowtype;
  v_inicio timestamptz;
  v_tarde boolean;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if not privado.puede_actuar(v_actor, v_solicitante, 'cancelar') then
    return jsonb_build_object('ok', false, 'motivo', privado.motivo_sin_permiso(v_actor, v_solicitante));
  end if;

  select * into v_reserva
  from public.reservas
  where id = p_reserva_id and solicitante_id = v_solicitante
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

  -- El trigger al_cambiar_reserva borra los recordatorios pendientes y avisa la cancelación.
  update public.reservas
  set estado = 'cancelada', cancelada_tarde = v_tarde, actualizada_en = now(), actualizada_por = v_actor
  where id = v_reserva.id;

  update public.turnos set estado = 'disponible' where id = v_reserva.turno_id;

  return jsonb_build_object('ok', true, 'numero', v_reserva.numero);
end;
$$;

-- reprogramar_reserva: ver 0401_reservas.sql. Alcance necesario: 'cancelar' (cancelar o cambiar).
create function public.reprogramar_reserva(
  p_reserva_id uuid,
  p_nuevo_turno_id bigint,
  p_para uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_solicitante uuid := coalesce(p_para, auth.uid());
  v_reserva public.reservas%rowtype;
  v_viejo public.turnos%rowtype;
  v_nuevo public.turnos%rowtype;
  v_nueva public.reservas%rowtype;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if not privado.puede_actuar(v_actor, v_solicitante, 'cancelar') then
    return jsonb_build_object('ok', false, 'motivo', privado.motivo_sin_permiso(v_actor, v_solicitante));
  end if;

  select * into v_reserva
  from public.reservas
  where id = p_reserva_id and solicitante_id = v_solicitante
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

  update public.turnos
  set estado = 'reservado'
  where id = p_nuevo_turno_id and estado = 'disponible' and inicio > now();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  -- El trigger borra los recordatorios pendientes de la vieja y avisa con la nueva.
  update public.reservas
  set estado = 'reprogramada', actualizada_en = now(), actualizada_por = v_actor
  where id = v_reserva.id;

  update public.turnos set estado = 'disponible' where id = v_viejo.id;

  insert into public.reservas (turno_id, solicitante_id, creada_por, asistida, reserva_origen_id)
  values (p_nuevo_turno_id, v_solicitante, v_actor, v_actor <> v_solicitante, v_reserva.id)
  returning * into v_nueva;

  return jsonb_build_object('ok', true, 'reserva_id', v_nueva.id, 'numero', v_nueva.numero);
end;
$$;

-- mis_reservas: ver 0401_reservas.sql. Con p_para, las de la persona que acompaña (alcance 'ver').
-- Si no tiene permiso, da un error con código 42501 (la app dice "dejó de compartir sus turnos").
-- asistida / creada_por_nombre: si la reservó un acompañante, su nombre.
create function public.mis_reservas(p_numero bigint default null, p_para uuid default null)
returns table (
  id uuid,
  numero bigint,
  estado text,
  cancelada_tarde boolean,
  creada_en timestamptz,
  actualizada_en timestamptz,
  asistida boolean,
  creada_por_nombre text,
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
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_solicitante uuid := coalesce(p_para, auth.uid());
begin
  if not privado.puede_actuar(auth.uid(), v_solicitante, 'ver') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
  select
    r.id, r.numero, r.estado, r.cancelada_tarde, r.creada_en, r.actualizada_en,
    r.asistida,
    case when r.creada_por is distinct from r.solicitante_id then quien.nombre end,
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
  left join public.perfiles as quien on quien.id = r.creada_por
  where r.solicitante_id = v_solicitante
    and (p_numero is null or r.numero = p_numero)
  order by t.inicio desc;
end;
$$;

revoke execute on function public.reservar_turno(bigint, boolean, integer, uuid) from public, anon;
revoke execute on function public.cancelar_reserva(uuid, boolean, uuid) from public, anon;
revoke execute on function public.reprogramar_reserva(uuid, bigint, uuid) from public, anon;
revoke execute on function public.mis_reservas(bigint, uuid) from public, anon;
grant execute on function public.reservar_turno(bigint, boolean, integer, uuid) to authenticated;
grant execute on function public.cancelar_reserva(uuid, boolean, uuid) to authenticated;
grant execute on function public.reprogramar_reserva(uuid, bigint, uuid) to authenticated;
grant execute on function public.mis_reservas(bigint, uuid) to authenticated;

-- ===========================================================================
-- 4. Invitar, aceptar, rechazar y revocar (RF-07)
-- ===========================================================================

-- invitar_acompanante: la persona que ingresó invita a alguien a acompañarla.
-- p_consiento tiene que ser true: es la confirmación explícita ("Autorizo a ...") que queda
-- registrada con fecha, hora y alcance (consentido_en, alcance).
-- Devuelve { ok: true, id, token, vence_en } o { ok: false, motivo }:
--   sin_sesion, sin_consentimiento, datos_invalidos (nombre, correo o alcance),
--   es_tu_correo (no te podés invitar), ya_invitado (ya hay una invitación vigente a ese correo).
create function public.invitar_acompanante(
  p_nombre text,
  p_correo text,
  p_alcance text[],
  p_consiento boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_correo text := lower(trim(coalesce(p_correo, '')));
  v_alcance text[];
  v_fila public.acompanamientos%rowtype;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if p_consiento is not true then
    return jsonb_build_object('ok', false, 'motivo', 'sin_consentimiento');
  end if;
  if char_length(v_nombre) not between 1 and 80
    or v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    or exists (select 1 from unnest(coalesce(p_alcance, '{}')) as x where x not in ('ver', 'reservar', 'cancelar'))
  then
    return jsonb_build_object('ok', false, 'motivo', 'datos_invalidos');
  end if;
  if v_correo = lower((select auth.jwt()) ->> 'email') then
    return jsonb_build_object('ok', false, 'motivo', 'es_tu_correo');
  end if;

  -- 'ver' siempre; el resto en un orden fijo.
  v_alcance := array(
    select accion from unnest(array['ver', 'reservar', 'cancelar']) with ordinality as o (accion, orden)
    where accion = 'ver' or accion = any (p_alcance)
    order by orden
  );

  -- Las invitaciones viejas sin aceptar pasan a 'vencido'.
  update public.acompanamientos
  set estado = 'vencido'
  where solicitante_id = v_usuario and estado = 'pendiente' and vence_en <= now();

  if exists (
    select 1 from public.acompanamientos
    where solicitante_id = v_usuario and correo_invitado = v_correo and estado in ('pendiente', 'activo')
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_invitado');
  end if;

  insert into public.acompanamientos (solicitante_id, nombre_invitado, correo_invitado, alcance)
  values (v_usuario, v_nombre, v_correo, v_alcance)
  returning * into v_fila;

  return jsonb_build_object('ok', true, 'id', v_fila.id, 'token', v_fila.token, 'vence_en', v_fila.vence_en);
end;
$$;

-- ver_invitacion: lo que muestra /invitacion/[token], también sin cuenta.
-- Solo el nombre de quien invita, el nombre que puso para el invitado, el alcance y el estado.
-- Nada de correos, documentos ni turnos.
create function public.ver_invitacion(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'ok', true,
        'nombre', p.nombre,
        'nombre_invitado', a.nombre_invitado,
        'alcance', a.alcance,
        'estado', case when a.estado = 'pendiente' and a.vence_en <= now() then 'vencido' else a.estado end,
        'vence_en', a.vence_en
      )
      from public.acompanamientos as a
      join public.perfiles as p on p.id = a.solicitante_id
      where a.token = p_token
    ),
    jsonb_build_object('ok', false, 'motivo', 'no_existe')
  );
$$;

-- aceptar_invitacion: la cuenta que ingresó acepta. Tiene que tener el correo invitado.
-- Devuelve { ok: true, solicitante_id, nombre } o { ok: false, motivo }:
--   sin_sesion, no_existe, vencida (pasaron los 7 días: queda 'vencido'), no_vigente (ya se
--   aceptó, rechazó o revocó), otro_correo, es_tuya, ya_acompanas.
-- No cambia el rol de la cuenta: lo que da acceso es el vínculo, no el rol.
create function public.aceptar_invitacion(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_fila public.acompanamientos%rowtype;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  select * into v_fila from public.acompanamientos where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_fila.estado = 'activo' and v_fila.acompanante_id = v_usuario then
    return jsonb_build_object('ok', true, 'solicitante_id', v_fila.solicitante_id,
      'nombre', (select nombre from public.perfiles where id = v_fila.solicitante_id));
  end if;
  if v_fila.estado = 'pendiente' and v_fila.vence_en <= now() then
    update public.acompanamientos set estado = 'vencido' where id = v_fila.id;
    return jsonb_build_object('ok', false, 'motivo', 'vencida');
  end if;
  if v_fila.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', case when v_fila.estado = 'vencido' then 'vencida' else 'no_vigente' end);
  end if;
  if v_fila.solicitante_id = v_usuario then
    return jsonb_build_object('ok', false, 'motivo', 'es_tuya');
  end if;
  if lower((select auth.jwt()) ->> 'email') is distinct from v_fila.correo_invitado then
    return jsonb_build_object('ok', false, 'motivo', 'otro_correo');
  end if;
  if exists (
    select 1 from public.acompanamientos
    where solicitante_id = v_fila.solicitante_id and acompanante_id = v_usuario and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_acompanas');
  end if;

  update public.acompanamientos
  set estado = 'activo', acompanante_id = v_usuario, aceptado_en = now()
  where id = v_fila.id;

  insert into public.notificaciones (usuario_id, tipo, datos)
  values (v_fila.solicitante_id, 'acompanamiento',
    jsonb_build_object('evento', 'aceptado', 'nombre', v_fila.nombre_invitado, 'alcance', v_fila.alcance));

  return jsonb_build_object('ok', true, 'solicitante_id', v_fila.solicitante_id,
    'nombre', (select nombre from public.perfiles where id = v_fila.solicitante_id));
end;
$$;

-- rechazar_invitacion: el invitado dice que no. Alcanza con el enlace (puede no tener cuenta).
-- Devuelve { ok: true } o { ok: false, motivo: no_existe | vencida | no_vigente }.
create function public.rechazar_invitacion(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila public.acompanamientos%rowtype;
begin
  select * into v_fila from public.acompanamientos where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_fila.estado = 'pendiente' and v_fila.vence_en <= now() then
    update public.acompanamientos set estado = 'vencido' where id = v_fila.id;
    return jsonb_build_object('ok', false, 'motivo', 'vencida');
  end if;
  if v_fila.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', case when v_fila.estado = 'vencido' then 'vencida' else 'no_vigente' end);
  end if;

  update public.acompanamientos set estado = 'rechazado' where id = v_fila.id;
  insert into public.notificaciones (usuario_id, tipo, datos)
  values (v_fila.solicitante_id, 'acompanamiento', jsonb_build_object('evento', 'rechazado', 'nombre', v_fila.nombre_invitado));
  return jsonb_build_object('ok', true);
end;
$$;

-- revocar_acompanamiento: la persona le saca el permiso a su acompañante (o cancela una
-- invitación pendiente). Es inmediato: desde ese momento puede_actuar da false.
-- Al acompañante se le avisa ("Rosa dejó de compartir sus turnos con vos") y se le borran las
-- copias de los avisos de los turnos de la persona.
-- Devuelve { ok: true } o { ok: false, motivo: sin_sesion | no_existe | no_vigente }.
create function public.revocar_acompanamiento(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_fila public.acompanamientos%rowtype;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  select * into v_fila from public.acompanamientos
  where id = p_id and solicitante_id = v_usuario
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_fila.estado not in ('pendiente', 'activo') then
    return jsonb_build_object('ok', false, 'motivo', 'no_vigente');
  end if;

  update public.acompanamientos set estado = 'revocado', revocado_en = now() where id = v_fila.id;

  if v_fila.estado = 'activo' and v_fila.acompanante_id is not null then
    delete from public.notificaciones
    where usuario_id = v_fila.acompanante_id and solicitante_id = v_usuario;
    insert into public.notificaciones (usuario_id, tipo, datos)
    values (v_fila.acompanante_id, 'acompanamiento', jsonb_build_object(
      'evento', 'revocado',
      'nombre', coalesce((select nombre from public.perfiles where id = v_usuario), '')
    ));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- personas_que_acompano: las personas que acompaña quien ingresó, con su alcance.
-- Solo nombre y apellido: nunca DNI, teléfono, fecha de nacimiento ni preferencias.
create function public.personas_que_acompano()
returns table (
  acompanamiento_id uuid,
  solicitante_id uuid,
  nombre text,
  apellido text,
  alcance text[],
  aceptado_en timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.solicitante_id, p.nombre, p.apellido, a.alcance, a.aceptado_en
  from public.acompanamientos as a
  join public.perfiles as p on p.id = a.solicitante_id
  where a.acompanante_id = (select auth.uid()) and a.estado = 'activo'
  order by p.nombre, p.apellido;
$$;

revoke execute on function public.invitar_acompanante(text, text, text[], boolean) from public, anon;
revoke execute on function public.ver_invitacion(uuid) from public;
revoke execute on function public.aceptar_invitacion(uuid) from public, anon;
revoke execute on function public.rechazar_invitacion(uuid) from public;
revoke execute on function public.revocar_acompanamiento(uuid) from public, anon;
revoke execute on function public.personas_que_acompano() from public, anon;
grant execute on function public.invitar_acompanante(text, text, text[], boolean) to authenticated;
-- Ver y rechazar una invitación no piden cuenta: alcanza con el enlace (token difícil de adivinar).
grant execute on function public.ver_invitacion(uuid) to anon, authenticated;
grant execute on function public.aceptar_invitacion(uuid) to authenticated;
grant execute on function public.rechazar_invitacion(uuid) to anon, authenticated;
grant execute on function public.revocar_acompanamiento(uuid) to authenticated;
grant execute on function public.personas_que_acompano() to authenticated;

-- ===========================================================================
-- 5. Envío por correo (solo el servidor, con la clave secreta)
-- ===========================================================================
-- avisos_por_correo: los avisos que ya tienen que salir por correo, con la dirección de cada
-- persona (está en auth.users, que la API no expone). Solo la puede llamar service_role
-- (server/api/avisos/enviar.ts). El estado de cada envío se actualiza directo en la tabla.
create function public.avisos_por_correo(p_limite integer default 50)
returns table (
  id uuid,
  usuario_id uuid,
  tipo text,
  datos jsonb,
  intentos integer,
  correo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.usuario_id, n.tipo, n.datos, n.intentos, u.email::text
  from public.notificaciones as n
  join auth.users as u on u.id = n.usuario_id
  where n.correo_estado = 'pendiente' and n.enviar_desde <= now()
  order by n.enviar_desde
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

revoke execute on function public.avisos_por_correo(integer) from public, anon, authenticated;
grant execute on function public.avisos_por_correo(integer) to service_role;
