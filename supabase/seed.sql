-- Usuarios de prueba. Contraseña de todos: demo1234 (documentada en el README).
-- Se crean ya confirmados para no depender del envío de correos.
do $$
declare
  u record;
  v_id uuid;
begin
  for u in
    select * from (values
      ('solicitante@demo.ar', 'Rosa', 'Gómez', '12345678', '1950-03-14', 'General Pacheco', 'solicitante'),
      ('acompanante@demo.ar', 'Lucía', 'Gómez', '30123456', '1982-07-02', 'General Pacheco', 'acompanante'),
      ('admin@demo.ar', 'Admin', 'Demo', '20111222', '1990-01-01', 'Tigre', 'admin')
    ) as t(email, nombre, apellido, documento, nacimiento, localidad, rol)
  loop
    if exists (select 1 from auth.users where email = u.email) then
      continue;
    end if;

    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('nombre', u.nombre, 'apellido', u.apellido, 'documento', u.documento,
                         'fecha_nacimiento', u.nacimiento, 'localidad', u.localidad),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    update public.profiles set rol = u.rol::public.rol where id = v_id;
  end loop;
end $$;
