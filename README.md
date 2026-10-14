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

## Base de datos (Supabase)

- Proyecto `rmvhepjmdxofksdlfvpo` (región São Paulo).
- `supabase/migrations/0201_cuentas.sql`: tablas `perfiles`, `preferencias` e `intentos_ingreso`,
  con RLS. Cada migración se aplica tal cual está en el archivo.
- `supabase/migrations/0301_turnos.sql`: catálogo (`localidades`, `centros`, `especialidades`,
  `profesionales`, `turnos`), `avisos_disponibilidad`, la búsqueda `buscar_turnos` y
  `privado.generar_turnos(dias)`.
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
| v0.3 | Búsqueda de turnos | Esta rama |
| v0.4 | Asistente de reserva y mis turnos | Pendiente |
| v0.5 | Avisos y modo acompañante | Pendiente |
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
  "Reservar" llega en la v0.4.

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

## Documentación

- [Arquitectura y reglas de código](docs/arquitectura.md)
- [Marca](docs/marca.md)
- [Plan de versiones](docs/plan-versiones.md)
