create table public.acompanamientos (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references public.profiles on delete cascade,
  acompanante_id uuid references public.profiles on delete cascade,
  email_invitado text not null,
  alcance text[] not null check (alcance <@ array['ver', 'reservar', 'cancelar'] and 'ver' = any (alcance)),
  token_invitacion text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo', 'revocado', 'vencido')),
  invitado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  revocado_en timestamptz,
  vence_en timestamptz not null default now() + interval '7 days'
);

create index acompanamientos_solicitante_idx on public.acompanamientos (solicitante_id);
create index acompanamientos_acompanante_idx on public.acompanamientos (acompanante_id);

create table public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  acompanamiento_id uuid not null references public.acompanamientos on delete cascade,
  solicitante_id uuid not null references public.profiles on delete cascade,
  alcance text[] not null,
  otorgado_en timestamptz not null default now(),
  revocado_en timestamptz,
  ip text,
  user_agent text
);

create index consentimientos_acompanamiento_idx on public.consentimientos (acompanamiento_id);
create index consentimientos_solicitante_idx on public.consentimientos (solicitante_id);

alter table public.acompanamientos enable row level security;
alter table public.consentimientos enable row level security;

create policy "ver mis acompañamientos" on public.acompanamientos for select to authenticated
  using ((select auth.uid()) in (solicitante_id, acompanante_id));
create policy "ver mis consentimientos" on public.consentimientos for select to authenticated
  using ((select auth.uid()) = solicitante_id);

create function privado.acompana(p_acompanante uuid, p_solicitante uuid, p_accion text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acompanamientos
    where acompanante_id = p_acompanante and solicitante_id = p_solicitante
      and estado = 'activo' and p_accion = any (alcance)
  )
$$;

create or replace function privado.puede_actuar(p_actor uuid, p_solicitante uuid, p_accion text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_actor = p_solicitante or privado.acompana(p_actor, p_solicitante, p_accion)
$$;

revoke execute on function privado.acompana(uuid, uuid, text) from public, anon;
grant execute on function privado.acompana(uuid, uuid, text) to authenticated;

-- El acompañante ve los turnos y el nombre de quien acompaña, solo si tiene permiso de "ver".
create policy "acompañante ve turnos" on public.reservas for select to authenticated
  using ((select privado.acompana((select auth.uid()), solicitante_id, 'ver')));
create policy "acompañante ve el perfil" on public.profiles for select to authenticated
  using ((select privado.acompana((select auth.uid()), id, 'ver')));
create policy "solicitante ve a su acompañante" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.acompanamientos a
    where a.acompanante_id = profiles.id and a.solicitante_id = (select auth.uid()) and a.estado = 'activo'
  ));

create function public.invitar_acompanante(p_email text, p_alcance text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_nuevo public.acompanamientos;
begin
  if v_yo is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if v_email = lower((select auth.jwt()) ->> 'email') then
    return jsonb_build_object('ok', false, 'motivo', 'a_vos_mismo');
  end if;
  if exists (select 1 from public.acompanamientos where solicitante_id = v_yo and email_invitado = v_email and estado in ('pendiente', 'activo')) then
    return jsonb_build_object('ok', false, 'motivo', 'ya_existe');
  end if;

  insert into public.acompanamientos (solicitante_id, email_invitado, alcance)
  values (v_yo, v_email, (select array_agg(distinct a) from unnest(array_append(p_alcance, 'ver')) a))
  returning * into v_nuevo;

  return jsonb_build_object('ok', true, 'id', v_nuevo.id, 'token', v_nuevo.token_invitacion);
end;
$$;

-- Para mostrar la invitación antes de ingresar: solo el nombre de quien invita, el alcance y el estado.
create function public.ver_invitacion(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', p.nombre || ' ' || p.apellido,
    'email_invitado', a.email_invitado,
    'alcance', a.alcance,
    'estado', case when a.estado = 'pendiente' and a.vence_en < now() then 'vencido' else a.estado end
  )
  from public.acompanamientos a join public.profiles p on p.id = a.solicitante_id
  where a.token_invitacion = p_token
$$;

create function public.aceptar_invitacion(p_token text, p_user_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_inv public.acompanamientos;
  v_nombre text;
begin
  if v_yo is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  select * into v_inv from public.acompanamientos where token_invitacion = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_inv.estado <> 'pendiente' then
    return jsonb_build_object('ok', false, 'motivo', 'usada');
  end if;
  if v_inv.vence_en < now() then
    update public.acompanamientos set estado = 'vencido' where id = v_inv.id;
    return jsonb_build_object('ok', false, 'motivo', 'vencida');
  end if;
  if lower((select auth.jwt()) ->> 'email') <> v_inv.email_invitado then
    return jsonb_build_object('ok', false, 'motivo', 'otro_correo', 'email', v_inv.email_invitado);
  end if;
  if v_yo = v_inv.solicitante_id then
    return jsonb_build_object('ok', false, 'motivo', 'a_vos_mismo');
  end if;

  update public.acompanamientos set acompanante_id = v_yo, estado = 'activo', aceptado_en = now() where id = v_inv.id;
  insert into public.consentimientos (acompanamiento_id, solicitante_id, alcance, user_agent)
  values (v_inv.id, v_inv.solicitante_id, v_inv.alcance, left(p_user_agent, 300));

  select nombre || ' ' || apellido into v_nombre from public.profiles where id = v_yo;
  insert into public.notificaciones (profile_id, tipo, titulo, cuerpo, estado, enviada_en)
  values (v_inv.solicitante_id, 'acompanante', v_nombre || ' aceptó acompañarte',
    v_nombre || ' ya puede ayudarte con tus turnos. Podés quitarle el permiso cuando quieras desde "Mis acompañantes".', 'enviada', now());

  return jsonb_build_object('ok', true, 'solicitante_id', v_inv.solicitante_id);
end;
$$;

create function public.revocar_acompanamiento(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := auth.uid();
  v_a public.acompanamientos;
begin
  select * into v_a from public.acompanamientos where id = p_id for update;
  if not found or v_yo not in (v_a.solicitante_id, coalesce(v_a.acompanante_id, v_a.solicitante_id)) then
    return jsonb_build_object('ok', false, 'motivo', 'no_existe');
  end if;
  if v_a.estado not in ('pendiente', 'activo') then
    return jsonb_build_object('ok', false, 'motivo', 'usada');
  end if;

  update public.acompanamientos set estado = 'revocado', revocado_en = now() where id = p_id;
  update public.consentimientos set revocado_en = now() where acompanamiento_id = p_id and revocado_en is null;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.invitar_acompanante(text, text[]) from public, anon;
revoke execute on function public.aceptar_invitacion(text, text) from public, anon;
revoke execute on function public.revocar_acompanamiento(uuid) from public, anon;
revoke execute on function public.ver_invitacion(text) from public;
grant execute on function public.invitar_acompanante(text, text[]) to authenticated;
grant execute on function public.aceptar_invitacion(text, text) to authenticated;
grant execute on function public.revocar_acompanamiento(uuid) to authenticated;
grant execute on function public.ver_invitacion(text) to anon, authenticated;
