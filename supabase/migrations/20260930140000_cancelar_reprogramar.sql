create function public.cancelar_reserva(p_reserva uuid, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_reserva public.reservas;
  v_fecha timestamptz;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select * into v_reserva from public.reservas where id = p_reserva for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if not privado.puede_actuar(v_actor, v_reserva.solicitante_id, 'cancelar') then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  if v_reserva.estado <> 'confirmada' then
    return jsonb_build_object('ok', false, 'motivo', 'no_confirmada');
  end if;

  select fecha_hora into v_fecha from public.turnos_disponibles where id = v_reserva.turno_id;
  if v_fecha <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'vencido');
  end if;

  update public.reservas
    set estado = 'cancelada', cancelada_en = now(), motivo_cancelacion = nullif(trim(p_motivo), '')
    where id = p_reserva;
  -- se libera el lugar para otra persona
  update public.turnos_disponibles set estado = 'disponible' where id = v_reserva.turno_id;

  return jsonb_build_object('ok', true);
end;
$$;

create function public.reprogramar_reserva(
  p_reserva uuid,
  p_turno_nuevo uuid,
  p_confirmar_superposicion boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_vieja public.reservas;
  v_fecha_vieja timestamptz;
  v_turno public.turnos_disponibles;
  v_otro record;
  v_nueva public.reservas;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  select * into v_vieja from public.reservas where id = p_reserva for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if not privado.puede_actuar(v_actor, v_vieja.solicitante_id, 'reservar') then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  if v_vieja.estado <> 'confirmada' then
    return jsonb_build_object('ok', false, 'motivo', 'no_confirmada');
  end if;
  select fecha_hora into v_fecha_vieja from public.turnos_disponibles where id = v_vieja.turno_id;
  if v_fecha_vieja <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'vencido');
  end if;

  select * into v_turno from public.turnos_disponibles where id = p_turno_nuevo for update;
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
    where r.solicitante_id = v_vieja.solicitante_id
      and r.estado = 'confirmada'
      and r.id <> v_vieja.id
      and abs(extract(epoch from (t.fecha_hora - v_turno.fecha_hora))) < 2 * 3600
    limit 1;
    if found then
      return jsonb_build_object('ok', false, 'motivo', 'superpuesto',
        'otro', jsonb_build_object('fecha_hora', v_otro.fecha_hora, 'centro', v_otro.centro, 'especialidad', v_otro.especialidad));
    end if;
  end if;

  update public.turnos_disponibles set estado = 'reservado' where id = p_turno_nuevo and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'tomado');
  end if;

  update public.reservas set estado = 'reprogramada' where id = v_vieja.id;
  update public.turnos_disponibles set estado = 'disponible' where id = v_vieja.turno_id;

  insert into public.reservas (turno_id, solicitante_id, reservada_por_id, reserva_origen_id)
  values (p_turno_nuevo, v_vieja.solicitante_id, v_actor, v_vieja.id)
  returning * into v_nueva;

  return jsonb_build_object('ok', true, 'reserva_id', v_nueva.id, 'numero', v_nueva.numero_correlativo);
end;
$$;

revoke execute on function public.cancelar_reserva(uuid, text) from public, anon;
revoke execute on function public.reprogramar_reserva(uuid, uuid, boolean) from public, anon;
grant execute on function public.cancelar_reserva(uuid, text) to authenticated;
grant execute on function public.reprogramar_reserva(uuid, uuid, boolean) to authenticated;

-- Las reservas cuyo turno ya pasó quedan como completadas. Corre cada hora.
create extension if not exists pg_cron;

create function privado.completar_reservas_pasadas()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reservas r set estado = 'completada'
  from public.turnos_disponibles t
  where t.id = r.turno_id and r.estado = 'confirmada' and t.fecha_hora < now() - interval '1 hour'
$$;

select cron.schedule('completar-reservas-pasadas', '15 * * * *', 'select privado.completar_reservas_pasadas()');
