-- Usuarios de prueba. Contraseña de todos: demo1234 (documentada en el README).
-- prueba@demo.ar lo usan los tests de preferencias y perfil, para no tocar a los usuarios de la demo.
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
      ('admin@demo.ar', 'Admin', 'Demo', '20111222', '1990-01-01', 'Tigre', 'admin'),
      ('prueba@demo.ar', 'Pablo', 'Prueba', '25333444', '1960-05-20', 'Tigre', 'solicitante')
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

-- Los usuarios demo ya tienen preferencias (con los valores por defecto), así la demo no pasa por /bienvenida.
insert into public.preferencias_accesibilidad (profile_id)
select p.id from public.profiles p join auth.users u on u.id = p.id
where u.email in ('solicitante@demo.ar', 'acompanante@demo.ar', 'admin@demo.ar')
on conflict (profile_id) do nothing;

-- Datos de la fase 4.
-- Centros: reales, del Registro Federal de Establecimientos de Salud (REFES, diciembre 2025),
--   con dirección y coordenadas tal cual el registro. Teléfono, horario y accesibilidad edilicia
--   quedan vacíos porque el REFES no los trae: no se inventan.
-- Localidades: API Georef (apis.datos.gob.ar), centroide de cada localidad.
-- Especialidades por centro, profesionales, agendas y turnos: DE PRUEBA.

insert into public.especialidades (slug, nombre_comun, nombre_tecnico, descripcion_simple, icono) values
  ('oftalmologia', 'Oculista', 'Oftalmología', 'Para la vista: anteojos, visión borrosa, ojos irritados.', 'i-lucide-eye'),
  ('medicina-general', 'Médico de familia', 'Medicina general', 'Para controles, malestares comunes y pedir estudios.', 'i-lucide-stethoscope'),
  ('cardiologia', 'Cardiólogo', 'Cardiología', 'Para el corazón y la presión.', 'i-lucide-heart-pulse'),
  ('odontologia', 'Dentista', 'Odontología', 'Para los dientes y las encías.', 'i-lucide-smile'),
  ('dermatologia', 'Piel', 'Dermatología', 'Para manchas, lunares, alergias y problemas de la piel.', 'i-lucide-hand'),
  ('traumatologia', 'Huesos', 'Traumatología', 'Para golpes, fracturas y dolores de huesos o articulaciones.', 'i-lucide-bone'),
  ('ginecologia', 'Mujer', 'Ginecología', 'Para controles de la mujer.', 'i-lucide-venus'),
  ('pediatria', 'Niños', 'Pediatría', 'Para chicos y chicas desde que nacen hasta los 14 años.', 'i-lucide-baby'),
  ('otorrinolaringologia', 'Oído, nariz y garganta', 'Otorrinolaringología', 'Para problemas de oído, nariz o garganta.', 'i-lucide-ear'),
  ('salud-mental', 'Salud mental', 'Salud mental', 'Para hablar con un psicólogo o psiquiatra.', 'i-lucide-brain'),
  ('nefrologia', 'Riñón', 'Nefrología', 'Para los riñones.', 'i-lucide-droplets'),
  ('endocrinologia', 'Diabetes y tiroides', 'Endocrinología', 'Para la diabetes, la tiroides y las hormonas.', 'i-lucide-syringe'),
  ('neumonologia', 'Pulmón', 'Neumonología', 'Para los pulmones y la respiración.', 'i-lucide-wind'),
  ('laboratorio', 'Análisis', 'Laboratorio', 'Para sacarte sangre o hacer otros análisis.', 'i-lucide-test-tube'),
  ('imagenes', 'Estudios', 'Diagnóstico por imágenes', 'Para radiografías, ecografías y otros estudios.', 'i-lucide-scan-line')
on conflict (slug) do nothing;

insert into public.localidades (nombre, partido, lat, lng) values
  ('Benavídez', 'Tigre', -34.41157, -58.68993),
  ('Dique Luján', 'Tigre', -34.36131, -58.68656),
  ('Don Torcuato Este', 'Tigre', -34.48753, -58.61558),
  ('Don Torcuato Oeste', 'Tigre', -34.50131, -58.6267),
  ('El Talar', 'Tigre', -34.46358, -58.66135),
  ('General Pacheco', 'Tigre', -34.45492, -58.63415),
  ('Troncos del Talar', 'Tigre', -34.45481, -58.61334),
  ('Ricardo Rojas', 'Tigre', -34.45845, -58.68304),
  ('Rincón de Milberg', 'Tigre', -34.41046, -58.602),
  ('Tigre', 'Tigre', -34.42481, -58.57553),
  ('Acassuso', 'San Isidro', -34.47823, -58.50268),
  ('Béccar', 'San Isidro', -34.4602, -58.53136),
  ('Boulogne Sur Mer', 'San Isidro', -34.50948, -58.56691),
  ('Martínez', 'San Isidro', -34.48901, -58.49938),
  ('San Isidro', 'San Isidro', -34.46988, -58.51129),
  ('Villa Adelina', 'San Isidro', -34.51886, -58.54736),
  ('San Fernando', 'San Fernando', -34.44366, -58.55865),
  ('Victoria', 'San Fernando', -34.45305, -58.54219),
  ('Virreyes', 'San Fernando', -34.45375, -58.55434),
  ('Caseros', 'Tres de Febrero', -34.60794, -58.56394),
  ('Churruca', 'Tres de Febrero', -34.55909, -58.62109),
  ('Ciudad Jardín Lomas del Palomar', 'Tres de Febrero', -34.60206, -58.59181),
  ('Ciudadela', 'Tres de Febrero', -34.63792, -58.53934),
  ('El Libertador', 'Tres de Febrero', -34.55543, -58.61281),
  ('José Ingenieros', 'Tres de Febrero', -34.61717, -58.53595),
  ('Loma Hermosa', 'Tres de Febrero', -34.56868, -58.60214),
  ('Martín Coronado', 'Tres de Febrero', -34.58377, -58.5967),
  ('Once de Septiembre', 'Tres de Febrero', -34.56599, -58.6186),
  ('Pablo Podestá', 'Tres de Febrero', -34.58495, -58.61164),
  ('Remedios de Escalada', 'Tres de Febrero', -34.57097, -58.6198),
  ('Sáenz Peña', 'Tres de Febrero', -34.60015, -58.52763),
  ('Santos Lugares', 'Tres de Febrero', -34.60301, -58.54082),
  ('Villa Bosch', 'Tres de Febrero', -34.58682, -58.57381),
  ('Villa Raffo', 'Tres de Febrero', -34.6084, -58.53091),
  ('Carapachay', 'Vicente López', -34.52821, -58.53461),
  ('Florida', 'Vicente López', -34.53201, -58.49283),
  ('Florida Oeste', 'Vicente López', -34.53851, -58.51546),
  ('La Lucila', 'Vicente López', -34.4987, -58.4886),
  ('Munro', 'Vicente López', -34.5298, -58.52518),
  ('Olivos', 'Vicente López', -34.50932, -58.4814),
  ('Vicente López', 'Vicente López', -34.52574, -58.47415),
  ('Villa Adelina', 'Vicente López', -34.52651, -58.54547),
  ('Villa Martelli', 'Vicente López', -34.5513, -58.50663)
on conflict (nombre, partido) do nothing;

with datos (refes_id, nombre, tipo, dependencia, direccion, localidad, partido, lat, lng, especialidades) as (values
  ('10068052100391', 'Hospital Zonal General de Agudos Magdalena V. de Martínez', 'hospital', 'Provincial', 'Avenida de los Constituyentes 395', 'General Pacheco', 'Tigre', -34.456979, -58.638964, '{medicina-general,oftalmologia,cardiologia,dermatologia,traumatologia,ginecologia,pediatria,otorrinolaringologia,salud-mental,nefrologia,endocrinologia,neumonologia,laboratorio,imagenes}'),
  ('12068052217381', 'Hospital Municipal Materno Infantil de Tigre Dr. Florencio Escardó', 'hospital', 'Municipal', 'Carlos M. de Alvear 1666', 'Tigre', 'Tigre', -34.437126, -58.581860, '{pediatria,ginecologia,laboratorio,imagenes}'),
  ('10068052218742', 'Hospital Municipal de Diagnóstico Inmediato de Benavídez', 'hospital', 'Municipal', 'Fernando Fader 380', 'Benavídez', 'Tigre', -34.409308, -58.682298, '{medicina-general,pediatria,traumatologia,laboratorio,imagenes}'),
  ('50068052216886', 'Hospital Municipal de Diagnóstico Inmediato Don Torcuato', 'hospital', 'Municipal', 'Menéndez y Pelayo 1302', 'Don Torcuato', 'Tigre', -34.491485, -58.631097, '{medicina-general,pediatria,cardiologia,laboratorio,imagenes}'),
  ('14068052206943', 'Hospital Oftalmológico Municipal Dr. Ramón Carrillo', 'hospital', 'Municipal', 'Lisandro de la Torre 1324', 'Troncos del Talar', 'Tigre', -34.489130, -58.640616, '{oftalmologia}'),
  ('14068052216417', 'Hospital Municipal Odontológico Ricardo Guardo', 'hospital', 'Municipal', 'Avenida Hipólito Yrigoyen 1264', 'General Pacheco', 'Tigre', -34.462623, -58.638574, '{odontologia}'),
  ('50068052201085', 'Centro de Salud General Pacheco', 'caps', 'Municipal', 'Salta 550', 'General Pacheco', 'Tigre', -34.456756, -58.639174, '{medicina-general,pediatria,ginecologia,odontologia}'),
  ('50068052201219', 'Centro de Salud Don Torcuato', 'caps', 'Municipal', 'España 1450', 'Don Torcuato Este', 'Tigre', -34.500415, -58.626761, '{medicina-general,pediatria,ginecologia,salud-mental}'),
  ('50068052201206', 'Centro de Atención Familiar y de Salud Benavídez', 'caps', 'Municipal', 'Avenida Alvear 2290', 'Benavídez', 'Tigre', -34.414008, -58.693247, '{medicina-general,pediatria,ginecologia,odontologia}'),
  ('10067562200293', 'Hospital Central de San Isidro Dr. Melchor A. Posse', 'hospital', 'Municipal', 'Avenida Santa Fe 431', 'Acassuso', 'San Isidro', -34.477650, -58.509721, '{medicina-general,oftalmologia,cardiologia,dermatologia,traumatologia,ginecologia,pediatria,otorrinolaringologia,salud-mental,nefrologia,endocrinologia,neumonologia,laboratorio,imagenes}'),
  ('12067562207009', 'Hospital Materno Infantil Dr. Carlos Gianantonio', 'hospital', 'Municipal', 'Diego Palma 505', 'San Isidro', 'San Isidro', -34.473755, -58.522694, '{pediatria,ginecologia,laboratorio}'),
  ('10067492100393', 'Hospital Zonal General de Agudos Petrona V. de Cordero', 'hospital', 'Provincial', 'Belgrano 1955', 'Virreyes', 'San Fernando', -34.448113, -58.552260, '{medicina-general,oftalmologia,cardiologia,dermatologia,traumatologia,ginecologia,pediatria,otorrinolaringologia,salud-mental,nefrologia,endocrinologia,neumonologia,laboratorio,imagenes}'),
  ('10068402100398', 'Hospital Zonal General de Agudos Dr. Carlos Bocalandro', 'hospital', 'Provincial', 'Ruta 8 km 20,5 (9100)', 'Loma Hermosa', 'Tres de Febrero', -34.562963, -58.602007, '{medicina-general,oftalmologia,cardiologia,dermatologia,traumatologia,ginecologia,pediatria,otorrinolaringologia,salud-mental,nefrologia,endocrinologia,neumonologia,laboratorio,imagenes}'),
  ('10068612200298', 'Hospital Municipal Prof. Dr. Bernardo Houssay', 'hospital', 'Municipal', 'Hipólito Yrigoyen 1750', 'Florida', 'Vicente López', -34.522785, -58.489117, '{medicina-general,oftalmologia,cardiologia,dermatologia,traumatologia,ginecologia,pediatria,otorrinolaringologia,salud-mental,nefrologia,endocrinologia,neumonologia,laboratorio,imagenes}')
),
centros_nuevos as (
  insert into public.centros (refes_id, nombre, tipo, dependencia, direccion, localidad, partido, lat, lng, fuente)
  select refes_id, nombre, tipo::public.tipo_centro, dependencia, direccion, localidad, partido, lat, lng, 'REFES, diciembre 2025'
  from datos
  on conflict (refes_id) do nothing
  returning id, refes_id
)
insert into public.centro_especialidad (centro_id, especialidad_id, requisitos)
select c.id, e.id,
  case e.slug
    when 'laboratorio' then 'Llevá la orden del médico. Si es análisis de sangre, vení en ayunas.'
    when 'imagenes' then 'Llevá la orden del médico.'
    else 'Llevá tu DNI.'
  end
from centros_nuevos c
join datos d on d.refes_id = c.refes_id
join public.especialidades e on e.slug = any (d.especialidades::text[])
on conflict do nothing;

-- Genera profesionales (uno por centro y especialidad), agendas y turnos para los próximos días.
-- Se puede volver a correr: solo agrega los días que faltan. Deja ~30 % de los turnos ocupados.
create or replace function privado.generar_turnos_demo(p_dias int default 30)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  nombres text[] := array['Ana', 'Carlos', 'Laura', 'Jorge', 'Marta', 'Diego', 'Silvia', 'Pablo', 'Claudia', 'Martín', 'Graciela', 'Hernán', 'Patricia', 'Gustavo', 'Mónica', 'Andrés'];
  apellidos text[] := array['Pérez', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sosa', 'Romero', 'Álvarez', 'Torres', 'Ruiz', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Molina'];
  ce record;
  v_prof uuid;
  v_hash int;
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_fecha date;
  v_inicio time;
  v_agenda uuid;
  v_creados int := 0;
begin
  for ce in select centro_id, especialidad_id from public.centro_especialidad loop
    v_hash := abs(hashtext(ce.centro_id::text || ce.especialidad_id::text));

    select a.profesional_id into v_prof
    from public.agendas a
    where a.centro_id = ce.centro_id and a.especialidad_id = ce.especialidad_id
    limit 1;

    if v_prof is null then
      insert into public.profesionales (nombre, apellido, matricula, especialidad_id)
      values (
        nombres[1 + v_hash % array_length(nombres, 1)],
        apellidos[1 + (v_hash / 7) % array_length(apellidos, 1)],
        'MP ' || (100000 + v_hash % 900000),
        ce.especialidad_id
      )
      returning id into v_prof;
    end if;

    for v_fecha in select d::date from generate_series(v_hoy, v_hoy + p_dias - 1, interval '1 day') d loop
      continue when extract(isodow from v_fecha) > 5;
      -- cada profesional atiende 3 de los 5 días hábiles
      continue when (v_hash + extract(isodow from v_fecha)::int) % 5 >= 3;

      v_inicio := case when v_hash % 2 = 0 then time '08:00' else time '12:00' end;

      insert into public.agendas (centro_id, profesional_id, especialidad_id, fecha, hora_inicio, hora_fin, duracion_min, cupos_totales)
      values (ce.centro_id, v_prof, ce.especialidad_id, v_fecha, v_inicio, v_inicio + interval '4 hours', 20, 12)
      on conflict (profesional_id, fecha, hora_inicio) do nothing
      returning id into v_agenda;

      continue when v_agenda is null;

      insert into public.turnos_disponibles (agenda_id, centro_id, especialidad_id, profesional_id, fecha_hora, estado)
      select v_agenda, ce.centro_id, ce.especialidad_id, v_prof,
        ((v_fecha + v_inicio + make_interval(mins => 20 * n))::timestamp at time zone 'America/Argentina/Buenos_Aires'),
        case when random() < 0.3 then 'reservado'::public.estado_turno else 'disponible'::public.estado_turno end
      from generate_series(0, 11) n;

      v_creados := v_creados + 12;
      v_agenda := null;
    end loop;

    v_prof := null;
  end loop;

  return v_creados;
end;
$$;

revoke execute on function privado.generar_turnos_demo(int) from public, anon, authenticated;

select privado.generar_turnos_demo(30);

-- Coordenadas de la localidad de cada usuario demo, para "cerca de mi casa".
update public.profiles p set lat = l.lat, lng = l.lng
from public.localidades l
where p.lat is null and l.nombre = p.localidad;

-- Un turno de Pablo de hace una semana: lo usan los tests para verificar que no se cancela un turno que ya pasó.
do $$
declare
  v_pablo uuid := (select id from auth.users where email = 'prueba@demo.ar');
  v_ce record;
  v_prof uuid;
  v_agenda uuid;
  v_turno uuid;
  v_fecha date := (now() at time zone 'America/Argentina/Buenos_Aires')::date - 7;
begin
  if v_pablo is null or exists (
    select 1 from public.reservas r join public.turnos_disponibles t on t.id = r.turno_id
    where r.solicitante_id = v_pablo and t.fecha_hora < now()
  ) then return; end if;

  select ce.centro_id, ce.especialidad_id into v_ce
  from public.centro_especialidad ce join public.especialidades e on e.id = ce.especialidad_id
  where e.slug = 'medicina-general' limit 1;
  select a.profesional_id into v_prof from public.agendas a
  where a.centro_id = v_ce.centro_id and a.especialidad_id = v_ce.especialidad_id limit 1;

  insert into public.agendas (centro_id, profesional_id, especialidad_id, fecha, hora_inicio, hora_fin, duracion_min, cupos_totales)
  values (v_ce.centro_id, v_prof, v_ce.especialidad_id, v_fecha, '06:00', '06:20', 20, 1) returning id into v_agenda;
  insert into public.turnos_disponibles (agenda_id, centro_id, especialidad_id, profesional_id, fecha_hora, estado)
  values (v_agenda, v_ce.centro_id, v_ce.especialidad_id, v_prof,
    (v_fecha + time '06:00')::timestamp at time zone 'America/Argentina/Buenos_Aires', 'reservado') returning id into v_turno;
  insert into public.reservas (turno_id, solicitante_id, reservada_por_id, estado) values (v_turno, v_pablo, v_pablo, 'completada');
end $$;
