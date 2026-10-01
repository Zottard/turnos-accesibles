-- Canal de contacto de la declaración de accesibilidad (Ley 26.653) y de los pedidos sobre datos (Ley 25.326).
create table public.consultas (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('accesibilidad', 'datos', 'otra')),
  mensaje text not null check (char_length(mensaje) between 10 and 2000),
  correo text check (correo is null or char_length(correo) <= 254),
  usuario_id uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en timestamptz not null default now()
);

create index consultas_usuario_idx on public.consultas (usuario_id);

alter table public.consultas enable row level security;
create policy "cualquiera escribe" on public.consultas for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = (select auth.uid()));
create policy "admin lee" on public.consultas for select to authenticated
  using ((select privado.es_admin()));
