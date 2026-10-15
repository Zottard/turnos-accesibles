# Turnos Accesibles — guía para agentes

Antes de tocar código, leé:

- `docs/arquitectura.md` — stack, carpetas, reglas de código y de accesibilidad (obligatorias).
- `docs/marca.md` — colores, tipografías, formas y tono de voz.
- `docs/plan-versiones.md` — qué entra en cada versión. No adelantes features de otra versión.

## Comandos

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm typecheck   # tiene que dar 0 errores
pnpm test        # Vitest, solo funciones puras (tests/*.test.ts)
pnpm build
```

## Convenciones de la v0.1

- Código simple y correcto. Sin librerías nuevas sin justificarlas.
- Nombres y comentarios en español. Texto de la interfaz en español rioplatense neutro, con
  "vos", frases cortas y lenguaje simple.
- Estilos: CSS propio. Usá los tokens semánticos de `app/assets/css/tokens.css` (`--fondo`,
  `--texto`, `--primario`...), nunca colores sueltos: así funciona el alto contraste.
- Medidas en `rem`: crecen con el tamaño de texto que elige la persona.
- Preferencias: `useAccesibilidad()` (cookie `ta_prefs`, la lee también el servidor) y
  `normalizarPreferencias()` en `app/utils/preferencias.ts`. Se aplican como atributos de
  `<html>`: `data-texto`, `data-contraste`, `data-movimiento`.
- Anuncios para lectores de pantalla: `useAnuncio().anunciar(texto)`.
- Voz: `app/utils/voz.ts` (`hablar`, `callar`, `vozDisponible`). Solo en el navegador.
- Al cambiar de página el foco va al `h1` (`app/plugins/foco-al-navegar.client.ts`).
  Cada página tiene un solo `h1` y su `useSeoMeta({ title })`.
- Botones: `<Boton>` (enlace si tiene `to`). Nunca se deshabilitan por datos faltantes.
- Commits: conventional commits en inglés.

## Convenciones de la v0.2 (cuentas)

- Variables: `SUPABASE_URL` y `SUPABASE_KEY` (publishable) en `.env`. Nunca la clave secreta.
- Supabase: `useSupabaseClient()` y `useSupabaseUser()` de `@nuxtjs/supabase` (v2).
  `useSupabaseUser()` devuelve los *claims* del JWT: el id es `usuario.value?.sub` (no `.id`).
  `redirect: false`: las redirecciones las hacen `middleware/auth.ts` e `invitado.ts`.
- Sesión: todo pasa por `useSesion()` (ingresar, registrarse, salir, recuperar, cambiar
  clave). Devuelve `{ ok: true }` o `{ ok: false, mensaje }` en lenguaje simple.
  Después de ingresar, `useSesion` actualiza `useSupabaseUser()` a mano: el módulo lo hace
  un rato después y el middleware lo necesita ya.
- Preferencias de la cuenta: `usePreferenciasCuenta()`. La cookie `ta_prefs` sigue siendo la
  que pinta la página; la fila de `preferencias` se lee una vez al ingresar o al abrir la app
  (`plugins/preferencias-cuenta.ts`). Sin fila → `/bienvenida`. Si la consulta falla, no se
  redirige. Conversión fila ↔ app en `utils/preferencias.ts` (`aFilaPreferencias`,
  `desdeFilaPreferencias`).
- Páginas con sesión: `definePageMeta({ middleware: 'auth' })`. Para invitados: `'invitado'`.
- `?volver=` siempre pasa por `rutaSegura()` (`utils/validar.ts`): solo rutas internas.
- Validaciones de formularios en `utils/validar.ts` (puras, con tests).
- Controles de accesibilidad sueltos en `components/preferencias/` (`PreferenciasTamano`,
  `PreferenciasSiNo`, `PreferenciasVelocidad`, `PreferenciasCanal`, `PreferenciasAntelacion`):
  los usan el menú, `/bienvenida` y `/perfil/accesibilidad`.
- Base: una migración por versión en `supabase/migrations/` (`0201_cuentas.sql`). Se aplica el
  archivo tal cual. Funciones auxiliares en el esquema `privado` (no expuesto). Toda función
  `security definer` lleva `set search_path = ''`. Si cambia el esquema, regenerar
  `app/types/database.types.ts`.
- El rol nunca se cambia desde la app: la columna `rol` no tiene permiso de `update` y el
  registro no acepta `admin`.
- El correo de Supabase por defecto solo llega al equipo del proyecto: para probar el registro
  de punta a punta hace falta un SMTP propio. Los usuarios de `seed.sql` ya están confirmados.

## Convenciones de la v0.3 (búsqueda de turnos)

- Base: `0301_turnos.sql`. El catálogo se lee sin sesión (`anon`): solo centros activos,
  especialidades activas y turnos futuros (RLS). Nadie lo escribe desde la app todavía
  (el panel es la v0.6). `avisos_disponibilidad`: cada persona inserta y ve solo los suyos.
- Búsqueda: una sola llamada, la RPC `buscar_turnos` (security invoker, así respeta RLS).
  Distancia con haversine en SQL; sin centro elegido trae como mucho 3 turnos por centro.
  Mañana = antes de las 13, en hora argentina (igual en SQL y en `franjaDe()`).
- Datos de prueba en la sección v0.3 de `seed.sql`. **Si la demo se queda sin turnos:**
  `select privado.generar_turnos(30);` en el editor SQL (no duplica los que ya existen).
  Los requisitos de cada especialidad están en esa función.
- Datos en `useTurnos()`: `cargarCatalogo`, `buscarTurnos`, `cargarTurno`, `pedirAviso`.
- Funciones puras (con tests): `shared/utils/fechas.ts` (fechas en palabras con `Intl` y la zona
  `America/Argentina/Buenos_Aires`, nunca la del navegador), `shared/utils/especialidades.ts`
  (`normalizar`, `buscarEspecialidades`, `elegirEspecialidad`, `nombreCompleto`) y
  `utils/turnos.ts` (filtros ↔ query, distancia, resumen para leer).
- Las especialidades parecidas se calculan en el navegador con `buscarEspecialidades` (son
  pocas y ya están cargadas): no hace falta `unaccent` ni otra RPC.
- `/buscar` guarda todo en la query (`esp`, `q`, `loc`, `lat`, `lng`, `centro`, `desde`, `hasta`,
  `franja`). La dirección manda: el formulario se copia desde ahí y cada cambio de query
  vuelve a buscar. La ubicación va redondeada a 2 decimales.
- Los utils que usan otro util lo importan explícito (`import ... from './fechas'`) para que
  Vitest los encuentre (Nuxt los auto-importa, Vitest no).
- Siempre mostrar el nombre simple con el técnico: `nombreCompleto()` → "Oculista (Oftalmología)".
- Las pantallas con datos de prueba lo dicen ("Datos de prueba").

## Convenciones de la v0.4 (asistente de reserva y mis turnos)

- Base: `0401_reservas.sql`. `reservas` solo tiene política de `select` (cada persona ve las
  suyas): se escribe únicamente con las RPC `reservar_turno`, `cancelar_reserva` y
  `reprogramar_reserva` (security definer, validan `auth.uid()` adentro). `mis_reservas` también
  es security definer porque `turnos` solo deja ver turnos futuros.
- Las RPC devuelven jsonb `{ ok: true, numero, ... }` o `{ ok: false, motivo }`. Motivos:
  `sin_sesion`, `no_existe`, `vencido`, `tomado`, `superpuesto` (trae `conflicto`), `ya_paso`,
  `no_vigente`, `fuera_de_plazo` (trae `horas`), `otra_especialidad`, `mismo_turno`. El mensaje
  para la persona sale siempre de `mensajeReserva(motivo)` (`utils/reservas.ts`).
- Atomicidad: el cupo se toma con un único `update ... where estado = 'disponible'`; además hay un
  índice único de una reserva confirmada por turno. Reprogramar toma primero el turno nuevo.
- "Cumplido" no se guarda: `estadoVisible()` lo calcula (confirmada + turno pasado). Sin pg_cron.
- Datos en `useReservas()`: `reservarTurno`, `cancelarReserva`, `reprogramarReserva`,
  `cargarReservas`, `cargarReserva`.
- Asistente (`pages/asistente.vue`): un paso por pantalla; al cambiar de paso, foco en el `h1`
  (la pregunta) y `anunciar()` con la pregunta y el resumen (con lectura en voz alta activada, se
  lee solo). Borrador en `sessionStorage` con la clave `ta_asistente` (solo ids y opciones, nunca
  el texto libre). Se borra al reservar. Puras y con tests en `utils/asistente.ts`
  (`validarPaso`, `normalizarBorrador`, `filtrosDelBorrador`).
- Intérprete: `POST /api/interpretar` → `PedidoInterpretado` (`shared/utils/reglasAsistente.ts`).
  Siempre reglas primero; Claude solo si hay `NUXT_ANTHROPIC_API_KEY` (`server/utils/claude.ts`,
  `fetch` directo, 4 s). La respuesta de la IA pasa por `validarRespuestaIA`; si falla, reglas.
  Nunca registrar ni guardar el texto de la persona. Límite: 10 pedidos por minuto por IP.
  `NUXT_ANTHROPIC_BASE_URL` sirve para probar con un servidor falso.
- `shared/utils/` tiene lo que usan la app y el servidor (`fechas.ts`, `especialidades.ts`,
  `reglasAsistente.ts`). Nuxt lo auto-importa en los dos lados; entre archivos, import relativo.
- Componentes nuevos: `ElegirEspecialidad` (cuadro + sugerencias, lo usan `/buscar` y el
  asistente), `OpcionesTurno` (radios de turnos con "Ver más opciones"), `EstadoTurno` (ícono +
  palabra), `DictarBoton` (dictado con `dictar()` de `utils/voz.ts`).
- Impresión: `@media print` en `base.css` oculta encabezado, pie y todo lo que tenga
  `.no-imprimir`.
- v0.5 engancha en: `p_para` en `reservar_turno` (acompañante), avisos y recordatorios en las tres
  RPC (comentarios "v0.5" en la migración) y la copia del comprobante por correo.
