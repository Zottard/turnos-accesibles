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


-- ===========================================================================
-- v0.3 — Catálogo de prueba: localidades, centros, especialidades, profesionales y turnos.
--
-- DATOS DE PRUEBA. Los centros y los profesionales son inventados (nombres, direcciones y
-- teléfonos no son reales). Las coordenadas de las localidades son aproximadas.
-- Se puede correr varias veces: lo que ya existe no se duplica.
-- Al final se arma la agenda de los próximos 30 días con privado.generar_turnos(30).
-- ===========================================================================

insert into public.localidades (nombre, lat, lng) values
  ('General Pacheco', -34.4606, -58.6440),
  ('Tigre', -34.4260, -58.5797),
  ('Don Torcuato', -34.4889, -58.6233),
  ('El Talar', -34.4733, -58.6556),
  ('Benavídez', -34.4128, -58.6939),
  ('San Fernando', -34.4417, -58.5600),
  ('Victoria', -34.4533, -58.5422),
  ('Escobar', -34.3467, -58.7953),
  ('Garín', -34.4236, -58.7614),
  ('Ingeniero Maschwitz', -34.3817, -58.7433),
  ('Grand Bourg', -34.4878, -58.7264)
on conflict (nombre) do nothing;

insert into public.centros (nombre, tipo, direccion, localidad, telefono, horario, lat, lng, accesibilidad) values
  (
    'Hospital Municipal de Pacheco (demo)', 'hospital', 'Av. Hipólito Yrigoyen 2150', 'General Pacheco',
    '011 4740-1100', 'Lunes a viernes de 7 a 19', -34.4588, -58.6461,
    'Rampa en la entrada. Ascensor. Baño adaptado. Sillas de ruedas en la guardia.'
  ),
  (
    'Centro de Salud Barrio Las Tunas', 'centro_de_salud', 'Calle Los Ceibos 830', 'General Pacheco',
    '011 4740-2230', 'Lunes a viernes de 8 a 17', -34.4475, -58.6298,
    'Sin ascensor: la atención es en planta baja. Rampa en la entrada.'
  ),
  (
    'Hospital Zonal de Tigre (demo)', 'hospital', 'Av. Cazón 1450', 'Tigre',
    '011 4749-3300', 'Lunes a viernes de 7 a 20', -34.4243, -58.5822,
    'Rampa en la entrada. Ascensor. Baño adaptado. Lugar para estacionar cerca de la puerta.'
  ),
  (
    'Unidad Sanitaria Don Torcuato Oeste', 'unidad_sanitaria', 'Calle Ricardo Gutiérrez 2040', 'Don Torcuato',
    '011 4727-4410', 'Lunes a viernes de 8 a 16', -34.4902, -58.6301,
    'Sin rampa: hay un escalón en la entrada. La atención es en planta baja.'
  ),
  (
    'Centro de Salud El Talar Norte', 'centro_de_salud', 'Calle Las Heras 1290', 'El Talar',
    '011 4736-5520', 'Lunes a viernes de 8 a 18', -34.4701, -58.6589,
    'Rampa en la entrada. Baño adaptado. Sin ascensor: la atención es en planta baja.'
  ),
  (
    'Hospital de San Fernando Sur (demo)', 'hospital', 'Av. Avellaneda 3100', 'San Fernando',
    '011 4744-6600', 'Lunes a viernes de 7 a 19', -34.4459, -58.5641,
    'Rampa en la entrada. Ascensor. Baño adaptado. Bucle magnético en la recepción.'
  ),
  (
    'Unidad Sanitaria Benavídez Centro', 'unidad_sanitaria', 'Calle Mendoza 560', 'Benavídez',
    '0348 446-7710', 'Lunes a viernes de 8 a 15', -34.4137, -58.6905,
    'Rampa en la entrada. Baño adaptado.'
  ),
  (
    'Centro de Salud Garín Este', 'centro_de_salud', 'Calle Belgrano 1720', 'Garín',
    '0348 447-8820', 'Lunes a viernes de 8 a 17', -34.4209, -58.7562,
    'Sin ascensor: la atención es en planta baja. La entrada tiene un escalón chico.'
  ),
  (
    'Hospital Regional de Escobar (demo)', 'hospital', 'Av. Tapia de Cruz 900', 'Escobar',
    '0348 442-9900', 'Lunes a viernes de 7 a 19', -34.3489, -58.7921,
    'Rampa en la entrada. Ascensor. Baño adaptado.'
  )
on conflict (nombre) do nothing;

-- palabras_clave: como lo dice la gente, en minúscula y sin tildes (el buscador también las saca).
insert into public.especialidades (nombre, nombre_simple, descripcion, palabras_clave) values
  (
    'Clínica médica', 'Médico clínico', 'Te revisa en general y te dice si tenés que ver a otro especialista.',
    '{clinico,clinica,medico,doctor,generalista,control,chequeo,fiebre,gripe,tos,dolor,cansancio,analisis,panza,estomago,diarrea}'
  ),
  (
    'Pediatría', 'Médico de chicos', 'Atiende a bebés, chicos y adolescentes.',
    '{pediatra,chicos,chico,nene,nena,bebe,hijo,hija,nieto,nieta,vacunas}'
  ),
  (
    'Oftalmología', 'Oculista', 'Revisa la vista y los ojos.',
    '{ojos,ojo,vista,anteojos,lentes,oculista,borroso,cataratas,lagrimeo}'
  ),
  (
    'Cardiología', 'Médico del corazón', 'Revisa el corazón y la presión.',
    '{corazon,presion,hipertension,palpitaciones,pecho,arritmia,cardiologo,electrocardiograma,colesterol}'
  ),
  (
    'Traumatología', 'Huesos y articulaciones', 'Atiende golpes, fracturas y dolores de huesos, rodillas o espalda.',
    '{huesos,hueso,rodilla,cadera,espalda,cintura,columna,hombro,tobillo,fractura,esguince,caida,golpe,articulaciones,traumatologo}'
  ),
  (
    'Ginecología', 'Salud de la mujer', 'Controles de salud de la mujer, Papanicolaou y embarazo.',
    '{ginecologo,ginecologa,mujer,papanicolaou,pap,embarazo,menopausia,mamas,anticonceptivos}'
  ),
  (
    'Odontología', 'Dentista', 'Atiende los dientes, las muelas y las encías.',
    '{dientes,diente,muela,muelas,encias,dentista,odontologo,caries,dentadura}'
  ),
  (
    'Dermatología', 'Médico de la piel', 'Revisa la piel, los lunares, las uñas y el pelo.',
    '{piel,lunar,lunares,manchas,granos,alergia,picazon,unas,pelo,dermatologo,sarpullido}'
  ),
  (
    'Otorrinolaringología', 'Oídos, nariz y garganta', 'Revisa los oídos, la nariz y la garganta.',
    '{oidos,oido,sordera,nariz,garganta,mareos,vertigo,ronquidos,sinusitis,anginas,otorrino}'
  ),
  (
    'Kinesiología', 'Rehabilitación', 'Ejercicios y masajes para recuperar el movimiento después de una lesión.',
    '{kinesiologo,kine,rehabilitacion,ejercicios,masajes,contractura,movilidad}'
  ),
  (
    'Nutrición', 'Nutricionista', 'Te ayuda a comer mejor y a cuidar el peso.',
    '{nutricionista,dieta,comida,alimentacion,peso,adelgazar,diabetes,azucar,panza}'
  ),
  (
    'Salud mental', 'Psicólogo', 'Un espacio para hablar de lo que te preocupa o te angustia.',
    '{psicologo,psicologa,psicologia,angustia,ansiedad,tristeza,depresion,nervios,estres,insomnio,terapia}'
  )
on conflict (nombre) do nothing;

-- Los profesionales se cargan por el nombre del centro y de la especialidad.
insert into public.profesionales (nombre, especialidad_id, centro_id)
select v.nombre, e.id, c.id
from (
  values
    ('Dra. Marta Giménez', 'Clínica médica', 'Hospital Municipal de Pacheco (demo)'),
    ('Dr. Jorge Ledesma', 'Pediatría', 'Hospital Municipal de Pacheco (demo)'),
    ('Dra. Silvia Romero', 'Cardiología', 'Hospital Municipal de Pacheco (demo)'),
    ('Dr. Pablo Acosta', 'Traumatología', 'Hospital Municipal de Pacheco (demo)'),
    ('Dra. Laura Méndez', 'Oftalmología', 'Hospital Municipal de Pacheco (demo)'),
    ('Dra. Carolina Paz', 'Ginecología', 'Hospital Municipal de Pacheco (demo)'),
    ('Dr. Ramón Ortiz', 'Clínica médica', 'Centro de Salud Barrio Las Tunas'),
    ('Dra. Natalia Ferreyra', 'Pediatría', 'Centro de Salud Barrio Las Tunas'),
    ('Dr. Hugo Salinas', 'Odontología', 'Centro de Salud Barrio Las Tunas'),
    ('Dr. Esteban Vidal', 'Cardiología', 'Hospital Zonal de Tigre (demo)'),
    ('Dra. Mónica Herrera', 'Oftalmología', 'Hospital Zonal de Tigre (demo)'),
    ('Dr. Alberto Quiroga', 'Otorrinolaringología', 'Hospital Zonal de Tigre (demo)'),
    ('Dra. Verónica Luna', 'Dermatología', 'Hospital Zonal de Tigre (demo)'),
    ('Dr. Gustavo Ríos', 'Traumatología', 'Hospital Zonal de Tigre (demo)'),
    ('Dra. Andrea Molina', 'Clínica médica', 'Unidad Sanitaria Don Torcuato Oeste'),
    ('Dr. Fernando Castro', 'Pediatría', 'Unidad Sanitaria Don Torcuato Oeste'),
    ('Dr. Martín Aguirre', 'Clínica médica', 'Centro de Salud El Talar Norte'),
    ('Lic. Paula Benítez', 'Nutrición', 'Centro de Salud El Talar Norte'),
    ('Lic. Diego Sosa', 'Salud mental', 'Centro de Salud El Talar Norte'),
    ('Dra. Claudia Navarro', 'Cardiología', 'Hospital de San Fernando Sur (demo)'),
    ('Lic. Sergio Domínguez', 'Kinesiología', 'Hospital de San Fernando Sur (demo)'),
    ('Dra. Gabriela Torres', 'Ginecología', 'Hospital de San Fernando Sur (demo)'),
    ('Dra. Rosana Peralta', 'Clínica médica', 'Unidad Sanitaria Benavídez Centro'),
    ('Dr. Luis Cabrera', 'Odontología', 'Unidad Sanitaria Benavídez Centro'),
    ('Dra. Lorena Vega', 'Pediatría', 'Centro de Salud Garín Este'),
    ('Lic. Mariana Godoy', 'Salud mental', 'Centro de Salud Garín Este'),
    ('Dr. Ricardo Figueroa', 'Cardiología', 'Hospital Regional de Escobar (demo)'),
    ('Dra. Julieta Campos', 'Dermatología', 'Hospital Regional de Escobar (demo)'),
    ('Dr. Daniel Rojas', 'Oftalmología', 'Hospital Regional de Escobar (demo)')
) as v (nombre, especialidad, centro)
join public.especialidades as e on e.nombre = v.especialidad
join public.centros as c on c.nombre = v.centro
on conflict (nombre, centro_id) do nothing;

-- Agenda de los próximos 30 días. Cuando la demo se quede sin turnos, correr esto de nuevo.
select privado.generar_turnos(30);
