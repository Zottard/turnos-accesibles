# Plan de versiones

Seis versiones. Cada una es una feature completa que se puede mostrar funcionando y entra en un
PR propio contra la rama `karma`. Cada integrante del grupo es responsable de dos.

| Versión | Feature | Responsable | Requerimientos |
|---|---|---|---|
| **v0.1** | Base, marca y accesibilidad | Marco D'Antino | RF2 (parcial), RNF 7 |
| **v0.2** | Cuentas y preferencias | Miguel Tello | RF1, RF2 |
| **v0.3** | Búsqueda de turnos | Nicolas Rosso | RF3 |
| **v0.4** | Asistente de reserva y mis turnos | Marco D'Antino | RF4, RF5 |
| **v0.5** | Avisos y modo acompañante | Miguel Tello | RF6, RF7 |
| **v0.6** | Panel administrativo, métricas y PWA | Nicolas Rosso | RF8, RF9, RNF 6 |

Cada versión se apoya en la anterior: la rama `version/N` sale de `version/N-1`.

---

## v0.1 — Base, marca y accesibilidad · Marco

Lo que cualquier pantalla futura necesita para ser accesible desde el primer día.

- Proyecto Nuxt 4 + TypeScript, estructura de carpetas y comandos.
- Tokens de marca (colores, tipografías, tamaños) y estilos base.
- Layout con encabezado, logo, pie con Karma Tech y enlace "Saltar al contenido".
- Menú de accesibilidad: tamaño de texto, alto contraste, reducir movimiento, lectura en voz alta.
  En esta versión se guarda en el navegador.
- Componentes base: botón, campo de formulario, tarjeta de opción, aviso, botón "Leer en voz alta".
- Página de inicio, términos de uso y declaración de accesibilidad.

**Se muestra:** abrir la app, agrandar el texto, pasar a alto contraste y escuchar la página.

## v0.2 — Cuentas y preferencias · Miguel

- Base de datos en Supabase: tabla `perfiles` con rol (solicitante, acompañante, administrador).
- Registro con un dato por pantalla, verificación por correo, ingreso y salida.
- Bloqueo temporal después de cinco intentos fallidos.
- Recuperar la contraseña con enlace de un solo uso.
- Perfil: ver y editar datos personales.
- Preferencias de accesibilidad guardadas en la cuenta, ofrecidas en el primer ingreso, con
  perfil accesible por defecto.

**Se muestra:** crear una cuenta, configurar las preferencias, salir y volver a entrar con todo igual.

## v0.3 — Búsqueda de turnos · Nico

- Tablas `centros`, `especialidades`, `profesionales` y `turnos`, con datos de prueba de
  centros de la zona norte del conurbano.
- Búsqueda por especialidad, centro, localidad, fecha y franja horaria.
- Orden por cercanía (ubicación del navegador o localidad cargada) y por fecha.
- Ficha del turno: dirección, requisitos, cómo llegar (enlace a mapa) y accesibilidad del edificio.
- Sin resultados: sugerencias (otra fecha, otro centro, especialidades parecidas).

**Se muestra:** buscar "cardiología" cerca de Pacheco y abrir la ficha de un turno.

## v0.4 — Asistente de reserva y mis turnos · Marco

- Asistente de un paso por pantalla: qué necesitás → dónde → cuándo → confirmar.
- Pedido en lenguaje natural (texto o voz): el servidor lo interpreta con IA y, si no está
  disponible o no entiende, se sigue por menús sin cortar el trámite.
- Reserva atómica en la base (`reservar_turno`): nadie puede tomar el mismo cupo, aviso de
  superposición, número correlativo y comprobante.
- Borrador guardado si la persona se va antes de confirmar.
- Mis turnos: ver, cancelar y cambiar de fecha, con confirmación en lenguaje simple.

**Se muestra:** decir "necesito un turno con el oculista cerca de casa" y terminar con el comprobante.

## v0.5 — Avisos y modo acompañante · Miguel

- Avisos de reserva, cancelación y cambio, y recordatorio con la antelación que elija la persona.
- Bandeja de avisos con estado (nuevo / leído), aviso visual fijo y tono sonoro según preferencias.
- Invitar a un acompañante con alcance (ver, reservar, cancelar). La invitación vence a los 7 días.
- Registro del consentimiento con fecha, hora y alcance. Revocar en cualquier momento.
- El acompañante ve y opera los turnos de la persona solo dentro del alcance.

**Se muestra:** Rosa invita a su hija Lucía; Lucía le reserva un turno; Rosa revoca el permiso.

## v0.6 — Panel administrativo, métricas y PWA · Nico

- Panel solo para administradores: alta, edición y baja de centros, especialidades y agendas.
- Validaciones: sin turnos superpuestos por profesional, sin bajas con reservas vigentes.
- Auditoría de cambios con usuario y fecha.
- Métricas: buscados, reservados, cancelados, completados, tiempo promedio, autónomos vs. asistidos.
- Exportar a planilla (CSV) y a PDF (impresión).
- PWA instalable y página sin conexión. Deploy en Vercel.

**Se muestra:** cargar una agenda nueva, verla en la búsqueda y descargar el reporte del mes.

---

## Cómo trabajar cada versión

1. `git switch version/N` (la rama ya existe con el código de la versión).
2. Leer el PR, probarlo en local (`pnpm dev`) y ajustar lo que haga falta.
3. Abrir o aprobar el PR contra `karma` y mergear en orden: v0.1 → v0.6.
