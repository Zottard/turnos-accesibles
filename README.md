# Turnos Accesibles

Una capa amable sobre los sistemas de turnos de salud pública. Pensada para personas mayores,
personas con discapacidad y personas que usan poco la computadora: **un paso por pantalla, texto
grande, alto contraste y lectura en voz alta**.

Proyecto final de **Karma Tech** — UTN FRGP, Metodología de Sistemas I, Grupo 28.
Es un prototipo académico: no reemplaza a los sistemas oficiales de turnos.

## Cómo correrlo

Necesitás Node 22 o más nuevo y [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Compila para producción (`.output/`) |
| `pnpm preview` | Sirve la compilación de producción |
| `pnpm generate` | Genera el sitio estático |
| `pnpm typecheck` | Revisa los tipos de TypeScript |
| `pnpm test` | Corre los tests (Vitest) |

### Variables de entorno

Desde la v0.2 la app usa Supabase. Creá un archivo `.env` en la raíz con:

```bash
SUPABASE_URL=https://rmvhepjmdxofksdlfvpo.supabase.co
SUPABASE_KEY=sb_publishable_...   # clave "publishable" (pública) del proyecto
```

La clave publishable es pública por diseño: lo que protege los datos son las políticas RLS de
la base. Nunca pongas acá la clave secreta (`service_role`).

Para correr la compilación (`node .output/server/index.mjs`) pasá las mismas variables como
`NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY`.

**Opcional (desde la v0.4):** `NUXT_ANTHROPIC_API_KEY=sk-ant-...` para que el asistente entienda
los pedidos en lenguaje natural con Claude. Solo la usa el servidor (`server/api/interpretar.post.ts`):
nunca llega al navegador. **Sin esta clave todo funciona igual**: el pedido se interpreta con
reglas simples (ver "Qué trae la v0.4").

**Opcional (desde la v0.5): avisos por correo.** Sin estas variables los avisos funcionan igual
dentro de la app (bandeja, banda y sonido); solo no salen por correo.

| Variable | Para qué |
|---|---|
| `NUXT_RESEND_API_KEY` | Clave de [Resend](https://resend.com) para mandar los correos. |
| `NUXT_CORREO_REMITENTE` | Quién manda: `Turnos Accesibles <avisos@tu-dominio.com>` (dominio verificado en Resend). |
| `NUXT_SUPABASE_SECRET_KEY` | Clave **secreta** de Supabase. Solo la usa `/api/avisos/enviar` en el servidor, para leer los avisos pendientes de todas las personas. |
| `NUXT_CRON_SECRET` | Protege `/api/avisos/enviar`. En Vercel poné **el mismo valor** en `CRON_SECRET` (es la que manda el cron). |

Con las dos primeras ya se manda la invitación a un acompañante por correo. Las cuatro hacen falta
para la copia de los avisos (comprobante, cancelación, cambio de fecha y recordatorio).
`NUXT_RESEND_BASE_URL` sirve solo para probar con un servidor falso.

## Base de datos (Supabase)

- Proyecto `rmvhepjmdxofksdlfvpo` (región São Paulo).
- `supabase/migrations/0201_cuentas.sql`: tablas `perfiles`, `preferencias` e `intentos_ingreso`,
  con RLS. Cada migración se aplica tal cual está en el archivo.
- `supabase/migrations/0301_turnos.sql`: catálogo (`localidades`, `centros`, `especialidades`,
  `profesionales`, `turnos`), `avisos_disponibilidad`, la búsqueda `buscar_turnos` y
  `privado.generar_turnos(dias)`.
- `supabase/migrations/0401_reservas.sql`: `reservas` (número correlativo, estado, quién la hizo,
  cuánto tardó) y las funciones atómicas `reservar_turno`, `cancelar_reserva`,
  `reprogramar_reserva` y `mis_reservas`. La app nunca escribe `reservas` directo.
- `supabase/migrations/0501_avisos_acompanantes.sql`: `notificaciones` (avisos, con los triggers que
  los crean), `acompanamientos` (vínculos y constancia del consentimiento), las funciones para
  invitar, aceptar, rechazar y revocar, y las reservas con `p_para` (reemplaza las de la v0.4).
- `supabase/seed.sql`: usuarios de prueba (ya confirmados) y, en la sección v0.3, el catálogo
  de prueba con la agenda de los próximos 30 días. Se puede correr varias veces.
- `app/types/database.types.ts`: tipos de la base. Si cambia una migración, hay que regenerarlos.

### Usuarios de prueba

Contraseña de todos: `Demo1234!`

| Correo | Quién es | Rol |
|---|---|---|
| `rosa@demo.ar` | Rosa Benítez, 78 años, General Pacheco | solicitante |
| `lucia@demo.ar` | Lucía Benítez, su hija, Tigre | acompañante |
| `admin@demo.ar` | Admin Karma | admin |

Rosa no tiene preferencias guardadas: al ingresar va a la bienvenida (primer ingreso).
Desde la v0.5, **Lucía acompaña a Rosa** con permiso para ver sus turnos y sacarle turnos, pero
no para cancelarlos ni cambiarlos (así se ve el límite en la demo).

### Correos (verificación y recuperación)

El envío de correos que trae Supabase **solo entrega a los miembros del equipo del proyecto** y
tiene un límite muy bajo por hora. Para mandar correos reales de verificación y recuperación,
configurá un SMTP propio (por ejemplo, la capa gratuita de [Resend](https://resend.com)) en
Supabase → Authentication → SMTP. Los usuarios de prueba ya están confirmados y no lo necesitan.

Los enlaces de los correos usan el flujo PKCE de Supabase: hay que abrirlos en el mismo
navegador donde se pidieron. Para que funcionen en cualquier dispositivo, se pueden cambiar las
plantillas de correo de Supabase para que usen `{{ .TokenHash }}`
(`/confirmar?token_hash={{ .TokenHash }}&type=email` y
`/nueva-clave?token_hash={{ .TokenHash }}&type=recovery`): las páginas ya lo aceptan.

## Versiones

Seis versiones, una feature completa por versión. El detalle está en
[docs/plan-versiones.md](docs/plan-versiones.md).

| Versión | Feature | Estado |
|---|---|---|
| v0.1 | Base, marca y accesibilidad | Lista |
| v0.2 | Cuentas y preferencias | Lista |
| v0.3 | Búsqueda de turnos | Lista |
| v0.4 | Asistente de reserva y mis turnos | Lista |
| v0.5 | Avisos y modo acompañante | Esta rama |
| v0.6 | Panel administrativo, métricas y PWA | Pendiente |

## Qué trae la v0.1

- Nuxt 4 con TypeScript y SSR.
- Marca: colores, tipografías (Lexend y Atkinson Hyperlegible) y logos.
- Menú de accesibilidad: tamaño de texto (100 % a 200 %), alto contraste, reducir movimiento,
  lectura en voz alta con velocidad y lenguaje simple. Se guarda en una cookie del navegador.
- Componentes base: `Boton`, `Campo`, `OpcionTarjeta`, `Aviso`, `LeerEnVoz`, `Interruptor`.
- Páginas: inicio, términos de uso y declaración de accesibilidad.

## Qué trae la v0.2

- Registro con un dato por pantalla (`/registrarme`), con "Revisá tus datos" al final y
  correo de activación. Lo cargado no se pierde si se recarga la página (menos la contraseña).
- Ingreso (`/ingresar`) y salida. Si el correo o la contraseña no coinciden, no decimos cuál
  falló. Después de 5 intentos fallidos, el ingreso con ese correo se pausa 15 minutos.
- Recuperar la contraseña (`/recuperar` → enlace de un solo uso → `/nueva-clave`).
- Primer ingreso (`/bienvenida`): una preferencia por pantalla, con vista previa, y
  "Saltar y usar lo recomendado".
- Inicio con la sesión iniciada (`/inicio`) y perfil (`/perfil`) para ver y editar los datos.
- Preferencias guardadas en la cuenta (`/perfil/accesibilidad`), también el canal de aviso y
  la antelación del recordatorio. Se aplican al ingresar en cualquier dispositivo. Los cambios
  del menú de accesibilidad se guardan solos en la cuenta.

Limitación conocida: el bloqueo por intentos lo controla la app antes de llamar a Supabase
Auth. Quien llame a la API de Auth directamente se lo saltea. En producción se resuelve con un
"auth hook" de Supabase (ver el comentario en la migración).

## Qué trae la v0.3

- Búsqueda de turnos (`/buscar`), sin necesidad de cuenta, en una sola página con tres preguntas:
  1. **¿Qué necesitás?** Se escribe como se habla ("me duele la rodilla", "oculista",
     "corazón") y aparecen sugerencias. También está la lista de todas las especialidades, con
     el nombre simple, el técnico y una frase que explica qué atiende.
  2. **¿Dónde?** "Usar mi ubicación" o elegir la localidad (con cuenta, se propone la del
     perfil). Opcional: un centro de salud.
  3. **¿Cuándo?** Opcional: desde y hasta qué día, y a la mañana o a la tarde.
- Resultados ordenados por cercanía y por fecha, con el día en palabras ("jueves 15 de
  octubre, a las 8:00"), el centro, la distancia, la especialidad y quién atiende. Se anuncia
  cuántos hay; con la lectura en voz alta activada, se lee un resumen.
- La búsqueda queda en la dirección (`/buscar?esp=4&loc=General+Pacheco`): se puede recargar,
  volver atrás o compartir.
- Sin resultados: buscar en todas las fechas, a cualquier hora o en otros centros, y
  "Avisame cuando haya turno" (con cuenta; el aviso se manda en la v0.5). Si lo que se
  escribió no es una especialidad: "¿Quisiste decir…?".
- Ficha del turno (`/turnos/:id`): especialidad, día y hora, profesional, dirección, teléfono,
  horario, cómo es el edificio, qué llevar (para ir tildando) y cómo llegar (Google Maps).

### Datos de prueba

**Los centros, profesionales y turnos son inventados** (zona norte del conurbano: Pacheco,
Tigre, San Fernando, Escobar...). Las páginas lo dicen. La agenda se arma para los próximos
30 días; cuando se acabe, en el editor SQL de Supabase:

```sql
select privado.generar_turnos(30);
```

Crea solo los turnos que faltan (de lunes a viernes, cada 20 minutos) y deja como tomados
más o menos 1 de cada 4.

Una búsqueda típica tarda unos 7 ms en la base y se ve en pantalla en unos 250 ms
(el requisito es menos de 3 segundos).

## Qué trae la v0.4

- **Asistente para pedir un turno** (`/asistente`), una pregunta por pantalla, con "Paso 2 de 5",
  "Volver" que no pierde nada y lectura en voz alta de cada paso:
  1. **Contanos qué necesitás** (se puede saltar): se escribe o se dice con la voz ("Decilo con tu
     voz", dictado del navegador en español de Argentina). El servidor lo interpreta y pregunta
     "¿Es así?": *"Entendimos que buscás un turno de Oculista (Oftalmología), cerca de tu casa."*
  2. **¿Qué médico necesitás?** (con las sugerencias de la búsqueda).
  3. **¿Dónde te queda cómodo?** (localidad del perfil, tu ubicación o un centro).
  4. **¿Qué día y hora?** Los turnos más próximos, de a 5 ("Ver más opciones").
  5. **Revisá y confirmá**: todo junto y "Confirmar turno". Recién ahí se reserva.
- Se puede empezar sin cuenta; para confirmar hay que ingresar y se vuelve al mismo paso.
  Lo elegido queda como borrador en el navegador (`sessionStorage`), sin datos personales.
- Desde la ficha de un turno, "Reservar este turno" abre el asistente directo en el paso 5.
- **Reserva atómica**: si otra persona toma el turno mientras confirmás, te lo decimos y te
  mostramos los más cercanos sin perder lo demás. Si ya tenés otro turno ese día (misma
  especialidad) o a menos de 2 horas, te avisa y podés confirmar igual.
- **Comprobante** (`/mis-turnos/123`): número correlativo, especialidad, día y hora en palabras,
  dirección, qué llevar y cómo llegar. "Imprimir o guardar como PDF" (sin menú ni pie). Desde la
  v0.5 también llega como aviso (y por correo, si está configurado).
- **Mis turnos** (`/mis-turnos`): próximos y anteriores (cumplidos, cancelados, cambiados de
  fecha), con el estado en texto e ícono. En `/inicio` aparece el próximo turno.
  - **Cancelar**: explica que el turno se libera y no se deshace. Con menos de 24 horas avisa y
    pide confirmar otra vez (queda registrado). Un turno que ya pasó no se cancela.
  - **Cambiar de fecha**: turnos de la misma especialidad cerca del mismo centro. Si el nuevo lo
    toma otra persona, el de antes queda igual.

### Cómo entiende el asistente (y qué pasa sin IA)

`POST /api/interpretar` siempre calcula primero un resultado con **reglas simples**
(`shared/utils/reglasAsistente.ts`): busca la especialidad con las mismas palabras clave que la
búsqueda, "cerca de casa", "a la mañana / a la tarde" y "hoy, mañana, pasado mañana, el lunes,
la semana que viene" (en hora argentina). Si hay clave de Anthropic, además le pregunta a
**Claude** (`claude-opus-5-5`, esfuerzo bajo, respuesta con formato JSON fijo) con un límite de
4 segundos. Si Claude no responde a tiempo, falla o responde algo que no es válido (una
especialidad que no existe, una fecha que ya pasó), se usan las reglas. Si nada entiende, el
asistente sigue por menús: **la IA nunca frena una reserva**. El texto de la persona no se guarda
ni se registra. Hay un límite de 10 pedidos por minuto por persona.

### Tiempos medidos

Desde "Confirmar turno" hasta ver el comprobante: unos 220 ms (el requisito es menos de 5 s).
Cambiar de fecha: unos 300 ms.

### Por qué "cumplido" no está en la base

Un turno confirmado cuyo horario ya pasó se muestra como **cumplido**: se calcula al leerlo
(`estadoVisible()` en `app/utils/reservas.ts`), sin tareas programadas. El estado `completada`
queda en la tabla para el panel de la v0.6.

## Qué trae la v0.5

### Avisos (RF-06)

- La base crea los avisos sola (triggers): al reservar (es el **comprobante**, con número), al
  cancelar y al cambiar de fecha, y un **recordatorio** con la antelación que eligió cada persona
  (2, 24 o 48 horas antes; 24 si no eligió). Al cancelar o cambiar, los recordatorios que todavía
  no salieron se borran (el turno nuevo trae el suyo). Si el momento del recordatorio ya pasó al
  reservar (un turno para dentro de 3 horas), no se programa: el aviso de la reserva ya lo dice.
- Si la persona cambia la antelación en "Mis preferencias", sus recordatorios pendientes se
  mueven a la nueva hora (si esa hora ya pasó, salen enseguida).
- **"Avisame cuando haya turno"** (v0.3): cuando aparece un turno libre de esa especialidad (nuevo o
  liberado por una cancelación), llega un aviso y el pedido se borra.
- **Banda de avisos** debajo del encabezado: tranquila, sin titilar ni irse sola, con "Ver aviso" y
  "Cerrar". Según el canal elegido: *en la pantalla* (solo la banda), *con sonido* (dos notas
  suaves hechas con Web Audio y la lectura del título) o *las dos cosas* (banda y sonido; la
  lectura si activó la lectura en voz alta). La app revisa al cambiar de página y cada minuto.
- **Avisos** (`/avisos`): primero los sin leer; día y hora, centro, dirección, qué llevar y "Cómo
  llegar"; "Marcar como leído" y el estado de cada aviso: **enviado** (llegó su hora), **visto en
  la app** (entregado) y **leído**. En el encabezado, "Avisos" con la cantidad sin leer.
- **Correo (opcional)**: `/api/avisos/enviar` manda la copia de los avisos de turnos con Resend
  (HTML con la marca y versión en texto). Reintenta hasta 3 veces; si el proveedor rechaza la
  dirección, se marca error y aparece un aviso en la app para revisar el correo (se puede cambiar
  en "Mi cuenta"). `vercel.json` la llama **una vez por día** (lo que permite el plan gratuito):
  el correo del recordatorio puede llegar hasta un día tarde, pero **el recordatorio en la app no
  depende del cron** (aparece apenas llega su hora).

### Modo acompañante (RF-07)

- **Personas que te ayudan** (`/acompanantes`): invitar a alguien en 4 pantallas (nombre, correo,
  qué puede hacer y la autorización explícita: *"Autorizo a Lucía a ver mis turnos y sacar turnos
  por mí. Puedo quitarle el permiso cuando quiera."*). Después: el enlace para copiar o mandar por
  WhatsApp (y por correo, si está configurado). La invitación vence a los 7 días.
- **Constancia** de cada permiso (quién, a quién, qué puede hacer, cuándo se autorizó, aceptó y
  quitó), para imprimir. Las filas no se borran nunca. **Quitar el permiso** es inmediato y se le
  avisa al acompañante.
- **La invitación** (`/invitacion/…`) se abre sin cuenta. Para aceptar hay que ingresar con el
  correo invitado; para decir que no alcanza con el enlace.
- **El acompañante** ve en su inicio "Personas que acompañás" y elige a quién ayudar: aparece la
  banda **"Estás ayudando a Rosa"** y "Mis turnos", el comprobante y el asistente pasan a ser los de
  Rosa. Lo que no tiene permitido no aparece y se explica (*"Rosa no te dio permiso para cancelar ni
  cambiar de fecha sus turnos. Pedile que lo cambie desde su cuenta."*); la base igual lo rechaza.
  Recibe una copia de los avisos de Rosa.
- El acompañante **nunca** ve el perfil de Rosa (DNI, teléfono, fecha de nacimiento ni
  preferencias): solo su nombre y sus turnos.

### La demo

1. Rosa ingresa, va a "Personas que te ayudan" e invita a alguien (o usa a Lucía, que ya está).
2. Lucía ingresa, toca "Ayudar a Rosa" y le saca un turno con el asistente.
3. Rosa ve la banda "Tenés un aviso nuevo: Lucía te sacó un turno", el turno en "Mis turnos" (con
   "Lo sacó Lucía") y el aviso en "Avisos".
4. Lucía intenta cancelarlo: no tiene ese permiso y la app se lo dice.
5. Rosa le quita el permiso: Lucía deja de ver sus turnos al instante y recibe el aviso.

Para volver a la demo después de revocar: correr de nuevo la sección v0.5 de `seed.sql`.

### Limitaciones conocidas

- Resend avisa los rebotes "tardíos" (la casilla no existe) con un webhook, que no está hecho: hoy
  se detecta cuando el proveedor rechaza la dirección al mandar.
- El correo de los avisos sale una vez por día (cron del plan gratuito de Vercel).
- Una invitación pendiente se puede rechazar con solo tener el enlace (sin cuenta), a propósito.

## Documentación

- [Arquitectura y reglas de código](docs/arquitectura.md)
- [Marca](docs/marca.md)
- [Plan de versiones](docs/plan-versiones.md)
