-- Eventos de uso anónimos (RF 9). No se guarda quién fue: solo qué pasó.
create table public.eventos_uso (
  id bigint generated always as identity primary key,
  tipo_evento text not null check (tipo_evento in ('busqueda', 'asistente_inicio', 'reserva_asistente')),
  payload jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index eventos_uso_tipo_idx on public.eventos_uso (tipo_evento, creado_en);

alter table public.eventos_uso enable row level security;
create policy "cualquiera registra eventos" on public.eventos_uso for insert to anon, authenticated
  with check (pg_column_size(payload) < 500);

create function public.metricas(p_desde date, p_hasta date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_hasta timestamptz := (p_hasta + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
begin
  if not privado.es_admin() then
    return null;
  end if;

  return jsonb_build_object(
    'busquedas', (select count(*) from public.eventos_uso where tipo_evento = 'busqueda' and creado_en >= v_desde and creado_en < v_hasta),
    'asistentes_iniciados', (select count(*) from public.eventos_uso where tipo_evento = 'asistente_inicio' and creado_en >= v_desde and creado_en < v_hasta),
    'segundos_promedio', (
      select round(avg((payload ->> 'segundos')::numeric))
      from public.eventos_uso where tipo_evento = 'reserva_asistente' and creado_en >= v_desde and creado_en < v_hasta
    ),
    'reservas', (
      select jsonb_build_object(
        'total', count(*),
        'confirmadas', count(*) filter (where estado = 'confirmada'),
        'canceladas', count(*) filter (where estado = 'cancelada'),
        'reprogramadas', count(*) filter (where estado = 'reprogramada'),
        'completadas', count(*) filter (where estado = 'completada'),
        'ausentes', count(*) filter (where estado = 'ausente'),
        'asistidas', count(*) filter (where reservada_por_id <> solicitante_id),
        'autonomas', count(*) filter (where reservada_por_id = solicitante_id)
      )
      from public.reservas where creada_en >= v_desde and creada_en < v_hasta
    ),
    'por_especialidad', (
      select coalesce(jsonb_agg(jsonb_build_object('especialidad', x.nombre, 'reservas', x.total) order by x.total desc, x.nombre), '[]'::jsonb)
      from (
        select e.nombre_comun as nombre, count(*) as total
        from public.reservas r
        join public.turnos_disponibles t on t.id = r.turno_id
        join public.especialidades e on e.id = t.especialidad_id
        where r.creada_en >= v_desde and r.creada_en < v_hasta and r.reserva_origen_id is null
        group by e.nombre_comun
      ) x
    )
  );
end;
$$;

revoke execute on function public.metricas(date, date) from public, anon;
grant execute on function public.metricas(date, date) to authenticated;
