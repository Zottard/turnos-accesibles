create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  reserva_id uuid references public.reservas on delete cascade,
  tipo text not null check (tipo in ('reserva', 'recordatorio', 'cancelacion', 'reprogramacion', 'acompanante')),
  titulo text not null,
  cuerpo text not null,
  canal text not null default 'app' check (canal in ('app', 'email', 'ambos')),
  programada_para timestamptz not null default now(),
  enviada_en timestamptz,
  correo_enviado_en timestamptz,
  leida_en timestamptz,
  estado text not null default 'programada' check (estado in ('programada', 'enviada', 'entregada', 'leida', 'fallida')),
  error text,
  creado_en timestamptz not null default now()
);

create index notificaciones_bandeja_idx on public.notificaciones (profile_id, programada_para desc);
create index notificaciones_pendientes_idx on public.notificaciones (estado, programada_para);
create index notificaciones_reserva_idx on public.notificaciones (reserva_id);

alter table public.notificaciones enable row level security;

-- La bandeja muestra solo lo que ya salió (no los recordatorios todavía programados).
create policy "ver mis avisos" on public.notificaciones for select to authenticated
  using ((select auth.uid()) = profile_id and estado <> 'programada');

create function public.marcar_leidas(p_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notificaciones
  set leida_en = now(), estado = 'leida'
  where profile_id = (select auth.uid()) and leida_en is null and estado <> 'programada'
    and (p_id is null or id = p_id)
$$;

revoke execute on function public.marcar_leidas(uuid) from public, anon;
grant execute on function public.marcar_leidas(uuid) to authenticated;

create function privado.texto_turno(p_turno uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.nombre_comun || ' en ' || c.nombre || ', ' || c.direccion
  from public.turnos_disponibles t
  join public.especialidades e on e.id = t.especialidad_id
  join public.centros c on c.id = t.centro_id
  where t.id = p_turno
$$;

create function privado.avisar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fecha timestamptz;
  v_texto text;
  v_correo boolean;
  v_recordar timestamptz;
begin
  select fecha_hora into v_fecha from public.turnos_disponibles where id = new.turno_id;
  v_texto := privado.texto_turno(new.turno_id);
  select coalesce(avisos_por_correo, true) into v_correo from public.preferencias_accesibilidad where profile_id = new.solicitante_id;

  if tg_op = 'INSERT' then
    insert into public.notificaciones (profile_id, reserva_id, tipo, titulo, cuerpo, estado, enviada_en)
    values (new.solicitante_id, new.id,
      case when new.reserva_origen_id is null then 'reserva' else 'reprogramacion' end,
      case when new.reserva_origen_id is null then 'Reservaste un turno' else 'Cambiaste la fecha de tu turno' end,
      'Tu turno de ' || v_texto || ' quedó confirmado. Número de turno: ' || new.numero_correlativo || '.',
      'enviada', now());

    -- recordatorio el día anterior a las 10 de la mañana (hora de Argentina)
    v_recordar := ((v_fecha at time zone 'America/Argentina/Buenos_Aires')::date - 1 + time '10:00') at time zone 'America/Argentina/Buenos_Aires';
    if v_recordar > now() then
      insert into public.notificaciones (profile_id, reserva_id, tipo, titulo, cuerpo, canal, programada_para)
      values (new.solicitante_id, new.id, 'recordatorio', 'Mañana tenés un turno',
        'Mañana tenés turno de ' || v_texto || '. Llevá tu DNI. Número de turno: ' || new.numero_correlativo || '.',
        case when coalesce(v_correo, true) then 'ambos' else 'app' end,
        v_recordar);
    end if;
    return new;
  end if;

  if new.estado in ('cancelada', 'reprogramada') and old.estado = 'confirmada' then
    delete from public.notificaciones where reserva_id = new.id and estado = 'programada';
    if new.estado = 'cancelada' then
      insert into public.notificaciones (profile_id, reserva_id, tipo, titulo, cuerpo, estado, enviada_en)
      values (new.solicitante_id, new.id, 'cancelacion', 'Cancelaste un turno',
        'Cancelaste tu turno de ' || v_texto || '. El lugar quedó libre para otra persona.', 'enviada', now());
    end if;
  end if;
  return new;
end;
$$;

create trigger reservas_avisos
  after insert or update of estado on public.reservas
  for each row execute function privado.avisar_reserva();

-- Libera en la app los avisos cuya hora llegó. Los que también van por correo los procesa la Edge Function.
create function privado.despachar_avisos()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notificaciones
  set estado = 'enviada', enviada_en = now()
  where estado = 'programada' and programada_para <= now()
$$;

-- La Edge Function `enviar-correos` la usa para comprobar que la llamó el cron.
create function public.clave_cron_valida(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'clave_cron' and decrypted_secret = p_clave)
$$;

revoke execute on function public.clave_cron_valida(text) from public, anon, authenticated;
grant execute on function public.clave_cron_valida(text) to service_role;

create extension if not exists pg_net;

select cron.schedule('despachar-avisos', '*/10 * * * *', 'select privado.despachar_avisos()');
