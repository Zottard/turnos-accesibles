# Arquitectura

La regla: **código simple, pero correcto**. Lo justo para cumplir los requerimientos, sin capas de
más. Si algo se puede resolver con una función de 10 líneas, no se agrega una librería.

## Stack

| Capa | Elección | Por qué |
|---|---|---|
| Front + servidor | **Nuxt 4** (Vue 3, TypeScript, SSR) | Una sola app: páginas y API (`server/api`). SSR da HTML real al lector de pantalla. |
| Estilos | **CSS propio** con variables (`app/assets/css`) | Los temas (texto grande, alto contraste) son cambiar variables. Sin framework de UI. |
| Base de datos y cuentas | **Supabase** (Postgres + Auth + RLS) con `@nuxtjs/supabase` | Cuentas, correo de verificación y permisos por fila sin escribir un backend. |
| Voz | **Web Speech API** del navegador | Leer en voz alta y dictar, gratis y sin servidor. |
| IA | **Claude** (Anthropic) desde `server/api/interpretar.post.ts` | Solo del lado del servidor. Si no hay clave o falla, se usan reglas simples. |
| PWA | `@vite-pwa/nuxt` (v0.6) | Instalable y con página sin conexión. |
| Tests | **Vitest** | Funciones puras: validaciones, reglas del asistente, fechas. |
| Deploy | **Vercel** | Capa gratuita. |

Dependencias permitidas: `nuxt`, `@nuxtjs/supabase`, `@vite-pwa/nuxt` (v0.6), `vitest`,
`typescript`, `vue-tsc`. Cualquier otra se justifica en el PR.

## Carpetas

```
app/
  assets/css/        tokens.css (marca) y base.css (estilos globales)
  components/        componentes chicos y reutilizables (Boton, Campo, Aviso, LeerEnVoz...)
  composables/       lógica con estado: useAccesibilidad, useSesion, useTurnos, useReservas...
  layouts/           default.vue (header, menú de accesibilidad, footer)
  middleware/        auth.ts (pide sesión), admin.ts (pide rol admin)
  pages/             una página por pantalla
  utils/             funciones puras: validar.ts, fechas.ts, textos.ts
server/
  api/               endpoints propios (interpretar)
  utils/             reglas del asistente
supabase/
  migrations/        un archivo SQL por versión (v02_cuentas.sql, v03_turnos.sql...)
  seed.sql           datos de prueba
public/              logo.svg, icono.svg, karma-tech.svg
tests/               *.test.ts de Vitest
docs/                requerimientos, marca, plan de versiones, esta guía
```

## Reglas de código

- **Nombres en español**, como el dominio: `reservarTurno`, `useAccesibilidad`, `centros`.
- Componentes en `PascalCase.vue`, composables `useAlgo.ts`, utils en minúscula.
- `<script setup lang="ts">` siempre. Tipos simples (`type Turno = {...}`), sin genéricos raros.
- Sin Pinia: el estado compartido va en `useState()` de Nuxt dentro de un composable.
- Cada composable de datos devuelve `{ datos, error }` o lanza un `Error` con un mensaje en
  lenguaje simple. La página decide cómo mostrarlo.
- Las operaciones que tienen que ser atómicas (reservar, cancelar, reprogramar, invitar) viven en
  **funciones SQL (RPC)** con `security definer` y validan permisos adentro. El front nunca
  escribe `reservas` directo.
- **RLS en todas las tablas.** Cada persona ve lo suyo; el admin ve todo; el acompañante ve lo que
  se le autorizó.
- Nada de secretos en el cliente. La clave de Anthropic solo existe en el servidor.

## Accesibilidad (no negociable)

- HTML semántico: `button` para acciones, `a` para navegar, `label` en cada campo, un `h1` por página.
- Todo operable con teclado, con foco visible (`:focus-visible`).
- Al cambiar de paso o de página, el foco va al `h1` y un `aria-live` anuncia el cambio.
- Errores junto al campo (`aria-describedby`) y resumen arriba del formulario.
- Nada por debajo de 18 px, objetivos táctiles de 56 px, contraste AA.
- Sin timers que corten trámites, sin animaciones si `prefers-reduced-motion` o la preferencia.
- Un paso por pantalla en registro y asistente, con "Volver" que no pierde lo cargado.

## Modelo de datos

```
perfiles          id (= auth.users.id), nombre, apellido, dni, fecha_nacimiento, telefono,
                  localidad, rol (solicitante | acompanante | admin)
preferencias      usuario_id, tamano_texto, alto_contraste, reducir_movimiento, lectura_voz,
                  velocidad_voz, lenguaje_simple, canal_aviso, antelacion_horas
intentos_ingreso  correo, fallidos, bloqueado_hasta
localidades       nombre, lat, lng
centros           id, nombre, tipo, direccion, localidad, telefono, horario, lat, lng,
                  accesibilidad, activo
especialidades    id, nombre, nombre_simple, descripcion, palabras_clave[], activa
profesionales     id, nombre, especialidad_id, centro_id
turnos            id, profesional_id, centro_id, especialidad_id, inicio, estado, requisitos
reservas          numero (correlativo), turno_id, solicitante_id, creada_por, estado,
                  asistida, segundos, reserva_origen, creada_en
notificaciones    id, usuario_id, reserva_id, tipo, titulo, mensaje, enviar_desde, leida_en
acompanamientos   id, solicitante_id, acompanante_id, correo_invitado, alcance[], token,
                  vence_en, estado, consentido_en, revocado_en
eventos_uso       id, tipo, datos (jsonb, anónimo), creado_en
auditoria         id, tabla, accion, registro_id, usuario_id, creado_en
```

## Comandos

```bash
pnpm install
cp .env.example .env     # completar las claves de Supabase
pnpm dev                 # http://localhost:3000
pnpm test                # Vitest
pnpm typecheck
pnpm build
```
