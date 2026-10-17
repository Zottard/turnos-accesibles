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


-- ===========================================================================
-- v0.5 — Lucía acompaña a Rosa.
-- Alcance: ver sus turnos y sacarle turnos, pero NO cancelar ni cambiar de fecha (así se ve el
-- límite en la demo). Es un vínculo ya aceptado; Rosa lo puede revocar desde /acompanantes.
-- Se puede correr varias veces: si ya hay un vínculo vigente, no hace nada. Si en una demo Rosa lo
-- revocó, correrlo de nuevo crea uno nuevo (el revocado queda como constancia).
-- ===========================================================================
insert into public.acompanamientos (
  solicitante_id, acompanante_id, nombre_invitado, correo_invitado, alcance, estado, consentido_en, aceptado_en
)
select
  '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Lucía', 'lucia@demo.ar',
  array['ver', 'reservar'], 'activo', now(), now()
where not exists (
  select 1 from public.acompanamientos
  where solicitante_id = '11111111-1111-4111-8111-111111111111' and correo_invitado = 'lucia@demo.ar'
    and estado in ('pendiente', 'activo')
);


-- ===========================================================================
-- v0.6 — DATOS DE PRUEBA para el tablero de métricas (/admin/metricas).
--
-- Para que el tablero no arranque vacío en la demo: los últimos 60 días de
-- 1. eventos de uso anónimos (búsquedas, asistente, accesibilidad, modo acompañante), marcados con
--    "demo": true en `datos`;
-- 2. reservas ya pasadas (cumplidas, canceladas y cambiadas de fecha; 1 de cada 4 asistida) de una
--    persona de prueba aparte, "Historial de prueba" (historial@demo.ar), sobre turnos pasados.
-- Todo con fechas pasadas: no toca los turnos que vienen ni las cuentas de Rosa, Lucía y el admin.
-- Las reservas se cargan directo con su estado final: así no generan avisos ni correos.
-- Se puede correr varias veces: si ya están, no hace nada. Para empezar de cero, ver el README.
-- ===========================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated',
  'authenticated', 'historial@demo.ar', extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nombre":"Historial","apellido":"de prueba","localidad":"General Pacheco"}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  '55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555',
  '55555555-5555-4555-8555-555555555555', 'email',
  '{"sub":"55555555-5555-4555-8555-555555555555","email":"historial@demo.ar","email_verified":true}'::jsonb,
  now(), now(), now()
)
on conflict do nothing;

-- 1. Eventos de uso: cada día, una cantidad parecida a la real (menos los fines de semana).
insert into public.eventos_uso (tipo, datos, creado_en)
select
  ev.tipo,
  case ev.tipo
    when 'busqueda' then jsonb_strip_nulls(jsonb_build_object(
      'demo', true,
      'especialidad_id', (select id from public.especialidades order by random() + n * 0 limit 1),
      'localidad', case when random() < 0.7 then (select nombre from public.localidades order by random() + n * 0 limit 1) end,
      'centro_id', case when random() < 0.25 then (select id from public.centros order by random() + n * 0 limit 1) end
    ))
    when 'preferencia_tamano' then jsonb_build_object('demo', true, 'valor', (array['125', '150', '175', '200'])[1 + floor(random() * 4)::integer])
    when 'preferencia_voz' then jsonb_build_object('demo', true, 'valor', 'activado')
    when 'preferencia_contraste' then jsonb_build_object('demo', true, 'valor', 'activado')
    else jsonb_build_object('demo', true)
  end,
  (dia::date + make_interval(hours => 8 + floor(random() * 12)::integer, mins => floor(random() * 60)::integer))
    at time zone 'America/Argentina/Buenos_Aires'
from generate_series(
  (now() at time zone 'America/Argentina/Buenos_Aires')::date - 60,
  (now() at time zone 'America/Argentina/Buenos_Aires')::date - 1,
  interval '1 day'
) as dia
cross join (
  values ('busqueda', 30), ('asistente_inicio', 12), ('asistente_ia', 6), ('preferencia_tamano', 5),
    ('preferencia_voz', 3), ('preferencia_contraste', 3), ('acompanante_ayudar', 2), ('acompanante_invitar', 1)
) as ev (tipo, por_dia)
cross join lateral generate_series(
  1,
  greatest(1, round(ev.por_dia * (case when extract(isodow from dia) >= 6 then 0.3 else 1 end) * (0.6 + random() * 0.8))::integer)
) as n
where not exists (select 1 from public.eventos_uso where datos ? 'demo');

-- 2. Turnos pasados con su reserva (2 por día hábil para algunos profesionales).
do $$
declare
  v_persona uuid := '55555555-5555-4555-8555-555555555555';
  v_hoy date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_turno record;
  v_azar double precision;
  v_creada timestamptz;
  v_asistida boolean;
  v_reserva uuid;
  v_esperando uuid; -- una reserva cambiada de fecha que espera su turno nuevo
begin
  if exists (select 1 from public.reservas where solicitante_id = v_persona) then
    return;
  end if;

  for v_turno in
    insert into public.turnos (profesional_id, centro_id, especialidad_id, inicio, estado, requisitos)
    select p.id, p.centro_id, p.especialidad_id,
      (dia::date + case when p.id % 2 = 0 then time '08:00' else time '13:00' end + cupo * interval '20 minutes')
        at time zone 'America/Argentina/Buenos_Aires',
      'reservado',
      'Llevá tu DNI.'
    from public.profesionales as p
    cross join generate_series(v_hoy - 60, v_hoy - 1, interval '1 day') as dia
    cross join generate_series(0, 1) as cupo
    where extract(isodow from dia) between 1 and 5
      and (extract(doy from dia)::integer + p.id::integer) % 4 = 0
    on conflict (profesional_id, inicio) do nothing
    returning id, inicio
  loop
    v_azar := random();
    v_creada := v_turno.inicio - make_interval(days => 1 + floor(random() * 10)::integer, hours => floor(random() * 6)::integer);
    v_asistida := random() < 0.25;

    if v_azar < 0.12 then
      -- Cancelada: el cupo quedó libre.
      insert into public.reservas (turno_id, solicitante_id, creada_por, estado, asistida, segundos,
        creada_en, actualizada_en, actualizada_por)
      values (v_turno.id, v_persona, case when v_asistida then null else v_persona end, 'cancelada', v_asistida,
        60 + floor(random() * 420)::integer, v_creada, v_creada + interval '1 day', v_persona);
      update public.turnos set estado = 'disponible' where id = v_turno.id;
    elsif v_azar < 0.20 and v_esperando is null then
      -- Cambiada de fecha: la reserva nueva es la del próximo turno de esta lista.
      insert into public.reservas (turno_id, solicitante_id, creada_por, estado, asistida, segundos,
        creada_en, actualizada_en, actualizada_por)
      values (v_turno.id, v_persona, case when v_asistida then null else v_persona end, 'reprogramada', v_asistida,
        60 + floor(random() * 420)::integer, v_creada, v_creada + interval '1 day', v_persona)
      returning id into v_reserva;
      update public.turnos set estado = 'disponible' where id = v_turno.id;
      v_esperando := v_reserva;
    else
      -- Cumplida. Si hay una cambiada de fecha esperando, esta es su turno nuevo.
      insert into public.reservas (turno_id, solicitante_id, creada_por, estado, asistida, segundos,
        reserva_origen_id, creada_en, actualizada_en)
      values (v_turno.id, v_persona, case when v_asistida then null else v_persona end, 'completada', v_asistida,
        case when v_esperando is null then 60 + floor(random() * 420)::integer end,
        v_esperando, v_creada, v_creada);
      v_esperando := null;
    end if;
  end loop;
end $$;
