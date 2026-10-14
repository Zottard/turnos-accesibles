-- Usuarios de prueba (ya confirmados). Contraseña de todos: Demo1234!
-- Se puede correr varias veces: si el usuario ya existe, no hace nada.
-- El perfil de cada uno lo crea el trigger `al_crear_usuario` con los datos de raw_user_meta_data.
--
-- GoTrue (Supabase Auth) falla si las columnas *_token quedan en null: por eso van como ''.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, u.datos, now(), now(),
  '', '', '', '', '', '', '', ''
from (
  values
    (
      '11111111-1111-4111-8111-111111111111'::uuid, 'rosa@demo.ar',
      '{"nombre":"Rosa","apellido":"Benítez","dni":"5123456","fecha_nacimiento":"1948-03-12","telefono":"1145678901","localidad":"General Pacheco","rol":"solicitante"}'::jsonb
    ),
    (
      '22222222-2222-4222-8222-222222222222'::uuid, 'lucia@demo.ar',
      '{"nombre":"Lucía","apellido":"Benítez","dni":"27123456","fecha_nacimiento":"1979-07-21","telefono":"1156789012","localidad":"Tigre","rol":"acompanante"}'::jsonb
    ),
    (
      '33333333-3333-4333-8333-333333333333'::uuid, 'admin@demo.ar',
      '{"nombre":"Admin","apellido":"Karma","localidad":"General Pacheco"}'::jsonb
    )
) as u (id, email, datos)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  u.id, u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users as u
where u.email in ('rosa@demo.ar', 'lucia@demo.ar', 'admin@demo.ar')
on conflict do nothing;

-- El rol de administrador nunca llega desde el registro: se asigna acá.
update public.perfiles set rol = 'admin' where id = '33333333-3333-4333-8333-333333333333';
