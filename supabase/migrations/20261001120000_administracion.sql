-- Escritura de administración
create policy "admin escribe centros" on public.centros for all to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "admin escribe especialidades" on public.especialidades for all to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "admin escribe profesionales" on public.profesionales for all to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy "admin escribe oferta" on public.centro_especialidad for all to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));

-- No se da de baja nada que tenga turnos reservados a futuro (RF 8)
create function privado.reservas_futuras(p_columna text, p_id text)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total int;
begin
  execute format(
    'select count(*) from public.reservas r join public.turnos_disponibles t on t.id = r.turno_id
     where r.estado = ''confirmada'' and t.fecha_hora > now() and t.%I::text = $1', p_columna)
  into v_total using p_id;
  return v_total;
end;
$$;

create function privado.impedir_baja_con_reservas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_columna text := tg_argv[0];
  v_total int;
begin
  if tg_op = 'UPDATE' then
    if not (old.activo and not new.activo) then
      return new;
    end if;
  end if;
  v_total := privado.reservas_futuras(v_columna, old.id::text);
  if v_total > 0 then
    raise exception using
      errcode = 'P0001',
      message = format('No se puede dar de baja: tiene %s %s reservados a futuro. Cancelalos o esperá a que pasen.',
        v_total, case when v_total = 1 then 'turno' else 'turnos' end);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger centros_sin_baja_con_reservas before update of activo on public.centros
  for each row execute function privado.impedir_baja_con_reservas('centro_id');
create trigger especialidades_sin_baja_con_reservas before update of activo on public.especialidades
  for each row execute function privado.impedir_baja_con_reservas('especialidad_id');
create trigger profesionales_sin_baja_con_reservas before delete on public.profesionales
  for each row execute function privado.impedir_baja_con_reservas('profesional_id');

-- Generador de agendas con validación de superposición
create function public.generar_agenda(
  p_centro uuid,
  p_especialidad smallint,
  p_profesional uuid,
  p_desde date,
  p_hasta date,
  p_dias int[],
  p_hora_inicio time,
  p_hora_fin time,
  p_duracion int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fecha date;
  v_agenda uuid;
  v_choques date[];
  v_agendas int := 0;
  v_turnos int := 0;
  v_cupos int;
begin
  if not privado.es_admin() then
    return jsonb_build_object('ok', false, 'motivo', 'sin_permiso');
  end if;
  if p_hasta < p_desde or p_hasta > p_desde + 120 then
    return jsonb_build_object('ok', false, 'motivo', 'rango');
  end if;
  if p_hora_fin <= p_hora_inicio or p_duracion < 5 then
    return jsonb_build_object('ok', false, 'motivo', 'horario');
  end if;

  select array_agg(distinct a.fecha order by a.fecha) into v_choques
  from public.agendas a
  where a.profesional_id = p_profesional
    and a.fecha between p_desde and p_hasta
    and extract(isodow from a.fecha)::int = any (p_dias)
    and a.hora_inicio < p_hora_fin and a.hora_fin > p_hora_inicio;
  if v_choques is not null then
    return jsonb_build_object('ok', false, 'motivo', 'superpuesta', 'fechas', to_jsonb(v_choques));
  end if;

  insert into public.centro_especialidad (centro_id, especialidad_id, requisitos)
  values (p_centro, p_especialidad, 'Llevá tu DNI.')
  on conflict do nothing;

  v_cupos := floor(extract(epoch from (p_hora_fin - p_hora_inicio)) / 60 / p_duracion);

  for v_fecha in select d::date from generate_series(p_desde, p_hasta, interval '1 day') d loop
    continue when not (extract(isodow from v_fecha)::int = any (p_dias));

    insert into public.agendas (centro_id, profesional_id, especialidad_id, fecha, hora_inicio, hora_fin, duracion_min, cupos_totales)
    values (p_centro, p_profesional, p_especialidad, v_fecha, p_hora_inicio, p_hora_fin, p_duracion, v_cupos)
    returning id into v_agenda;

    insert into public.turnos_disponibles (agenda_id, centro_id, especialidad_id, profesional_id, fecha_hora)
    select v_agenda, p_centro, p_especialidad, p_profesional,
      ((v_fecha + p_hora_inicio + make_interval(mins => p_duracion * n))::timestamp at time zone 'America/Argentina/Buenos_Aires')
    from generate_series(0, v_cupos - 1) n
    on conflict (profesional_id, fecha_hora) do nothing;

    v_agendas := v_agendas + 1;
    v_turnos := v_turnos + v_cupos;
  end loop;

  return jsonb_build_object('ok', true, 'agendas', v_agendas, 'turnos', v_turnos);
end;
$$;

revoke execute on function public.generar_agenda(uuid, smallint, uuid, date, date, int[], time, time, int) from public, anon;
grant execute on function public.generar_agenda(uuid, smallint, uuid, date, date, int[], time, time, int) to authenticated;

-- Auditoría (RF 8): quién cambió qué y cómo estaba antes
create table public.auditoria (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entidad text not null,
  entidad_id text not null,
  accion text not null,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);

create index auditoria_entidad_idx on public.auditoria (entidad, creado_en desc);

alter table public.auditoria enable row level security;
create policy "admin ve auditoría" on public.auditoria for select to authenticated using ((select privado.es_admin()));

create function privado.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.auditoria (actor_id, entidad, entidad_id, accion, antes, despues)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(to_jsonb(new), to_jsonb(old)) ->> 'id',
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger auditar_centros after insert or update or delete on public.centros for each row execute function privado.auditar();
create trigger auditar_especialidades after insert or update or delete on public.especialidades for each row execute function privado.auditar();
create trigger auditar_profesionales after insert or update or delete on public.profesionales for each row execute function privado.auditar();
create trigger auditar_agendas after insert or delete on public.agendas for each row execute function privado.auditar();
create trigger auditar_reservas after insert or update on public.reservas for each row execute function privado.auditar();
