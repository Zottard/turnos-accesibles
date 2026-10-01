-- Sin fila = la persona todavía no configuró nada y pasa por /bienvenida.
create table public.preferencias_accesibilidad (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles on delete cascade,
  text_scale text not null default '125' check (text_scale in ('100', '125', '150', '200')),
  contraste text not null default 'alto' check (contraste in ('normal', 'alto')),
  voz_activa boolean not null default false,
  voz_velocidad text not null default 'normal' check (voz_velocidad in ('lenta', 'normal', 'rapida')),
  reduce_motion text not null default 'siempre' check (reduce_motion in ('auto', 'siempre')),
  lenguaje_simple boolean not null default true,
  canal_notificacion text not null default 'ambos' check (canal_notificacion in ('visual', 'sonoro', 'ambos')),
  avisos_por_correo boolean not null default true,
  actualizado_en timestamptz not null default now()
);

alter table public.preferencias_accesibilidad enable row level security;

create policy "cada uno ve sus preferencias" on public.preferencias_accesibilidad
  for select to authenticated using ((select auth.uid()) = profile_id);
create policy "cada uno crea sus preferencias" on public.preferencias_accesibilidad
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "cada uno cambia sus preferencias" on public.preferencias_accesibilidad
  for update to authenticated using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

create function privado.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger preferencias_actualizado_en
  before update on public.preferencias_accesibilidad
  for each row execute function privado.tocar_actualizado_en();
