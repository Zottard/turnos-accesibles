create type public.estado_reserva as enum ('confirmada', 'cancelada', 'reprogramada', 'completada', 'ausente');

create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  numero_correlativo bigint generated always as identity unique,
  turno_id uuid not null references public.turnos_disponibles,
  solicitante_id uuid not null references public.profiles,
  reservada_por_id uuid not null references public.profiles,
  estado public.estado_reserva not null default 'confirmada',
  reserva_origen_id uuid references public.reservas,
  creada_en timestamptz not null default now(),
  cancelada_en timestamptz,
  motivo_cancelacion text
);

-- Un turno no puede estar reservado dos veces (RF 4). Si se cancela, se puede volver a reservar.
create unique index reservas_turno_activo_idx on public.reservas (turno_id) where estado = 'confirmada';
create index reservas_solicitante_idx on public.reservas (solicitante_id, estado);
create index reservas_reservada_por_idx on public.reservas (reservada_por_id);
create index reservas_origen_idx on public.reservas (reserva_origen_id);

alter table public.reservas enable row level security;

-- Se escribe solo por las funciones de abajo. Lectura: la persona, quien la reservó y administración.
create policy "ver mis reservas" on public.reservas for select to authenticated
  using ((select auth.uid()) in (solicitante_id, reservada_por_id) or (select privado.es_admin()));

-- Quién puede actuar en nombre de quién. La fase 8 suma a los acompañantes.
create or replace function privado.puede_actuar(p_actor uuid, p_solicitante uuid, p_accion text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor = p_solicitante
$$;

create function public.reservar_turno(
  p_turno uuid,
  p_confirmar_superposicion boolean default false,
  p_solicitante uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_solicitante uuid := coalesce(p_solicitante, auth.uid());
  v_turno public.turnos_disponibles;
  v_otro record;
  v_reserva public.reservas;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if not privado.puede_actuar(v_actor, v_solicitante, 'reservar') then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;

  select * into v_turno from public.turnos_disponibles where id = p_turno for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_turno.fecha_hora <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'vencido');
  end if;
  if v_turno.estado <> 'disponible' then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  if not p_confirmar_superposicion then
    select t.fecha_hora, c.nombre as centro, e.nombre_comun as especialidad into v_otro
    from public.reservas r
    join public.turnos_disponibles t on t.id = r.turno_id
    join public.centros c on c.id = t.centro_id
    join public.especialidades e on e.id = t.especialidad_id
    where r.solicitante_id = v_solicitante
      and r.estado = 'confirmada'
      and abs(extract(epoch from (t.fecha_hora - v_turno.fecha_hora))) < 2 * 3600
    order by t.fecha_hora
    limit 1;
    if found then
      return jsonb_build_object('ok', false, 'motivo', 'superpuesto',
        'otro', jsonb_build_object('fecha_hora', v_otro.fecha_hora, 'centro', v_otro.centro, 'especialidad', v_otro.especialidad));
    end if;
  end if;

  update public.turnos_disponibles set estado = 'reservado' where id = p_turno and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  insert into public.reservas (turno_id, solicitante_id, reservada_por_id)
  values (p_turno, v_solicitante, v_actor)
  returning * into v_reserva;

  return jsonb_build_object('ok', true, 'reserva_id', v_reserva.id, 'numero', v_reserva.numero_correlativo);
end;
$$;

revoke execute on function public.reservar_turno(uuid, boolean, uuid) from public, anon;
grant execute on function public.reservar_turno(uuid, boolean, uuid) to authenticated;
revoke execute on function privado.puede_actuar(uuid, uuid, text) from public, anon;
grant execute on function privado.puede_actuar(uuid, uuid, text) to authenticated;
