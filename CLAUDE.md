# Turnos Accesibles

El contexto completo del proyecto está en [docs/CONTEXTO.md](docs/CONTEXTO.md) y es vinculante.
Patrones de front de referencia en [docs/manual-front.md](docs/manual-front.md).

## Decisiones que pisan al CONTEXTO

Acordadas con el grupo al arrancar (2026-09-28). Donde choquen con `docs/CONTEXTO.md`, gana esto:

- **Nuxt 4** (carpeta `app/`), no Nuxt 3. Las rutas de §7 del CONTEXTO van dentro de `app/`.
- **Nuxt UI 4** como librería de componentes (usa Reka UI por debajo). No se escriben primitivas
  `Base*` propias: los componentes propios son de dominio o de a11y (`components/a11y/`).
- Los tokens de `app/assets/css/tokens.css` son la fuente de verdad. `main.css` mapea las
  variables `--ui-*` de Nuxt UI a esos tokens, así los componentes siguen al tema y la escala.
- `--text-xs` se fuerza a 1rem: nada baja de 16 px, ni siquiera dentro de Nuxt UI.
- Las preferencias de accesibilidad se guardan en la **cookie `ta_prefs`** (no en localStorage):
  el server renderiza `<html>` con los atributos correctos y no hay flash. Supabase se suma en la Fase 3.
- **TypeScript 5.9**, no 7: `vue-tsc` todavía no funciona con TS 7.
- Validación con `UForm` de Nuxt UI + zod 4 (schemas en `utils/validacion.ts`). Sin vee-validate.
- `pnpm` como gestor de paquetes.
- El manual de front dice "sin Paso 1 de 2" y "front en JS": acá **no aplica**. Rige el CONTEXTO
  (progreso visible en el asistente, TS strict).

## Comandos

```bash
pnpm dev              # http://localhost:3000, /demo-ui solo en dev
pnpm check:contrast   # valida los pares de tokens
pnpm typecheck
pnpm test:unit        # Vitest + vitest-axe
pnpm test:e2e         # Playwright + axe, levanta build + preview
```

## Design system (Fase 1)

- El tema de Nuxt UI se ajusta en `app/app.config.ts`. Ojo: las clases de `variants.size.xl` pisan a
  las de `slots`, así que los tamaños van en la variante, no en el slot.
- Componentes propios: `a11y/` (SkipLink, LiveRegion, AccessibilityMenu, ReadAloudButton,
  VoiceInputButton), `patrones/` (AccionesPaso, VistaEstados, OpcionesTarjeta), `asistente/AsistentePaso`,
  `turnos/EstadoBadge`. Los estados de dominio viven en `utils/estados.ts` con fallback.
- Textos con variante de lenguaje simple: `utils/copys.ts` + `useLenguajeSimple().t()`.
- El botón de confirmar nunca se deshabilita por falta de datos: se deja activo y al tocarlo se
  explica qué falta (error en el campo + `alert` en la live region).
- Radios y checkboxes van en variante tarjeta: toda la tarjeta es el objetivo táctil.
- `overflow-wrap: anywhere` + `hyphens: auto` en el body: sin eso, a 360 px con texto al 200 %
  las palabras largas desbordan los items flex.

## Auth (Fase 2)

- Proyecto Supabase `turnos-accesibles` (`ynolirfzjcjsvesnfpes`, sa-east-1). Migraciones en
  `supabase/migrations/`, usuarios demo en `supabase/seed.sql`, tipos en `app/types/database.ts`
  (regenerarlos después de cada migración).
- Toda la lógica de sesión vive en `useSesion()`: devuelve `{ ok }` o `{ ok: false, motivo, aviso }`,
  y `aviso` ya viene en lenguaje simple (qué pasó + qué hacer).
- `useSupabaseUser()` devuelve los claims del JWT: el id es `user.sub`, no `user.id`.
- Bloqueo tras 5 intentos: funciones `estado_bloqueo` / `registrar_fallo` / `limpiar_intentos` en la base.
  Se cuenta por correo (exista o no la cuenta). **Límite conocido:** alguien que llame a la API de
  Supabase directo se lo saltea. La solución de fondo es el Password Verification Hook, que es del plan Teams.
- `es_admin()` vive en el schema `privado`, no expuesto en la API.
- Middlewares: `auth` (pide sesión), `invitado` (saca a quien ya tiene sesión), `rol` (lee `meta.roles`,
  por defecto `['admin']`). El `?volver=` pasa siempre por `rutaSegura()`.
- Formularios: `UForm` con `method="post"` y `:validate-on="['input']"`. El POST evita que un envío
  antes de hidratar mande datos en la URL. Sin validar en blur, porque el error que desaparece al salir
  del campo mueve el botón entre el mousedown y el mouseup, y el click se pierde.
  Errores de envío: `useFormulario().alFallar` (lleva el foco al primer campo y lo anuncia).
- Sin sesiones que venzan mientras la app está abierta: Supabase renueva el token solo (WCAG 2.2.1).

## Preferencias (Fase 3)

- Tabla `preferencias_accesibilidad`. Sin fila = no configuró: el middleware `auth` lo manda a
  `/bienvenida`. Si la consulta falla, el estado queda desconocido y **no** se redirige.
- La cookie `ta_prefs` se lee solo en el servidor; el cliente usa el estado hidratado y reescribe la cookie.
  Al ingresar se cargan las de la cuenta (una vez por usuario, `prefs-cargadas-de`) y cada cambio se guarda
  solo (`plugins/preferencias.client.ts`, debounce 600 ms). Si la persona cambia algo mientras llega la
  respuesta, gana lo que eligió.
- `PreferenciaControl` es la pregunta de una preferencia: el wizard muestra una por pantalla,
  `/perfil/accesibilidad` todas juntas.
- **Todo campo de formulario lleva `id` explícito** (`<pagina>-<campo>`). Nuxt UI asocia label e input con
  `useId()` y, con íconos asíncronos en SSR, el contador no coincide entre servidor y cliente: el label
  queda apuntando a un id que no existe. `a11y.spec.ts` revisa que cada `label[for]` exista.
- No hacer `await` en el setup de páginas con formularios: cargar en `onMounted` y mostrar `VistaEstados`
  en `cargando` hasta tener los datos (si no, se puede enviar el formulario a medio llenar).
- El service worker **no** cachea navegaciones (`navigateFallback: null`): servía el HTML de `/` para
  cualquier página, con datos y preferencias viejas.

## Datos y búsqueda (Fase 4)

- Centros **reales** del REFES (diciembre 2025) y localidades de la API Georef. Teléfono, horario y
  accesibilidad edilicia quedan vacíos porque el REFES no los trae: no se inventan.
  Especialidades por centro, profesionales, agendas y turnos son **de prueba**, y la ficha lo dice.
- `privado.generar_turnos_demo(dias)` completa agendas y turnos para los días que falten (~30 %
  ocupados). Volver a correrla si la demo se queda sin turnos: `select privado.generar_turnos_demo(30);`
- `buscar_turnos()` (SQL): sin centro devuelve el primer turno libre de cada centro; con centro, sus
  horarios. Calcula la distancia y filtra la franja en hora de Argentina.
- Columnas `modo_turnos`/`web_turnos`/`telefono_turnos`/`instrucciones_turno` de `centros`: preparadas
  para el modo derivación (la ficha ya muestra el bloque si el centro es `derivacion`).
- Fechas y horas siempre con `utils/fechas.ts` (zona America/Argentina/Buenos_Aires, en palabras).
- Íconos que vienen de la base van en `icon.clientBundle.icons` de `nuxt.config.ts`.

## Asistente y reservas (Fase 5)

- `reservas` se escribe **solo** con la RPC `reservar_turno` (transaccional: `UPDATE ... WHERE estado =
  'disponible'`). Devuelve `{ ok, reserva_id, numero }` o `{ ok: false, motivo }` con motivo `tomado`,
  `superpuesto` (otro turno de la persona a menos de 2 h; se reintenta con `p_confirmar_superposicion`),
  `vencido`, `no_existe`, `sin_sesion`, `sin_permiso`. Los textos para cada motivo: `avisoReserva()`.
- `privado.puede_actuar(actor, solicitante, accion)` decide si alguien reserva por otra persona (fase 8).
- Paso 0 del asistente: Edge Function `interpretar` (reglas en `supabase/functions/interpretar/reglas.ts`,
  testeadas en `tests/unit/interpretar.spec.ts`). El front llama a `/api/asistente/interpretar` (proxy con
  rate limit y timeout de 4 s). Si falla o no entiende: "Vamos paso a paso entonces" y sigue por menús.
  La función tiene `verify_jwt`: el proxy usa `NUXT_SUPABASE_ANON_JWT` (anon key JWT, pública).
- Borrador del asistente en `sessionStorage` (`ta_asistente`): sobrevive a recargar y a ir a ingresar.
- Para los datos de Supabase con tipos profundos usar `shallowRef` (con `ref` el typecheck explota) y
  `fetch` nativo en vez de `$fetch` para endpoints propios (los tipos de rutas de Nitro también explotan).

## Mis turnos (Fase 6)

- `cancelar_reserva` y `reprogramar_reserva` (RPC): no dejan tocar un turno que ya pasó y liberan el lugar.
  La reprogramación deja la vieja como `reprogramada` y la nueva con `reserva_origen_id`.
- pg_cron `completar-reservas-pasadas` (minuto 15 de cada hora) pasa a `completada` las confirmadas viejas.
- `tests/e2e/ayudas.ts`: helpers para crear turnos y reservas desde los tests.

## Avisos (Fase 7)

- `notificaciones`: un trigger en `reservas` crea el aviso inmediato (reserva, cambio, cancelación) y
  programa el recordatorio para el día anterior a las 10 (hora de Argentina). Cancelar o cambiar borra
  los recordatorios pendientes. La bandeja solo ve lo que ya salió (`estado <> 'programada'`).
- pg_cron `despachar-avisos` (cada 10 min) libera los programados; `enviar-correos` (cada 10 min, minuto 5)
  llama a la Edge Function `enviar-correos` con la clave de Vault `clave_cron`.
- **Correo:** la función necesita el secreto `RESEND_API_KEY` (y opcional `CORREO_REMITENTE`) en
  Supabase → Edge Functions → Secrets. Sin eso deja el error anotado en el aviso y la app sigue igual.
- En la app: `plugins/avisos.client.ts` revisa cada minuto y en cada navegación. Si hay uno nuevo, según
  la preferencia muestra un aviso fijo bajo el header (no toast: los toasts de Reka meten spans
  focuseables con `aria-hidden` y además se van solos) y/o suena un tono.

## Acompañantes (Fase 8)

- `acompanamientos` (alcance `ver` siempre + `reservar`/`cancelar`, token que vence a los 7 días) y
  `consentimientos` (registro de lo que se autorizó y cuándo se revocó). Todo se escribe por RPC:
  `invitar_acompanante`, `ver_invitacion` (también sin sesión), `aceptar_invitacion` (el correo de la
  cuenta tiene que ser el invitado), `revocar_acompanamiento`.
- `privado.puede_actuar` ahora incluye `privado.acompana(actor, solicitante, accion)`: las RPC de reservar,
  cancelar y cambiar respetan el alcance. RLS deja ver turnos y perfil solo con `ver`.
- "Estás ayudando a X" vive en `sessionStorage` (`ta_asistiendo`) para no perderlo al recargar; el
  borrador del asistente guarda `para` y se descarta si no coincide con la persona actual.
- Demo: Lucía acompaña a Rosa con `ver` y `reservar` (sin `cancelar`), para mostrar el límite.
- E2E con dos personas: `acompanantes.spec.ts` abre un contexto por sesión (Pablo y Lucía).
- Playwright corre con 4 workers en local (con 10 la máquina se quedó sin memoria).

## Administración (Fase 9)

- Escritura de centros, especialidades, profesionales y oferta: políticas `for all` con `privado.es_admin()`.
- Trigger `impedir_baja_con_reservas`: no deja dar de baja centro/especialidad ni borrar profesional con
  reservas confirmadas a futuro; el mensaje (`P0001`) se muestra tal cual con `mensajeDeError()`.
- `generar_agenda()` (RPC, solo admin): rechaza si se superpone con otra agenda del profesional y
  devuelve las fechas que chocan. Crea la oferta centro-especialidad si no existía.
- `auditoria`: trigger `privado.auditar()` en centros, especialidades, profesionales, agendas y reservas.
- Listas de filas de Supabase en `shallowRef` (con `ref` el typecheck explota por `Json`).
- Los tests de admin crean datos con nombres `Prueba <timestamp>` y agendas a +100 días.

## Métricas (Fase 10)

- `eventos_uso` guarda eventos anónimos (`busqueda`, `asistente_inicio`, `reserva_asistente` con
  `segundos`): cualquiera inserta, nadie lee. `useEventos().registrar()` es fire-and-forget.
- `metricas(p_desde, p_hasta)` (solo admin) junta eventos y reservas por día de Buenos Aires.
- El gráfico de barras es `aria-hidden`: la tabla de abajo tiene los mismos datos. CSV con BOM y `;`
  para que Excel en español lo abra bien. El layout oculta header/footer al imprimir (`print:hidden`).

## PWA y contenido (Fase 11)

- Sin conexión, el SW responde cualquier navegación con `public/offline/index.html` (estática, sin datos).
  Va en una carpeta porque `@vite-pwa/nuxt` le saca el `.html` a las entradas del precache: un
  `offline.html` suelto quedaba como `/offline`, que Nitro no sirve, y rompía la instalación del SW.
- Íconos: `public/icono.svg` es la fuente; los PNG se regeneran con `node scripts/generar-iconos.mjs`.
- `beforeinstallprompt` llega una sola vez al cargar: lo guarda `plugins/instalar.client.ts` y lo usa
  `<InstalarApp>` (en `/inicio` y `/ayuda`).
- `consultas`: formulario de `/ayuda#escribinos` (canal de contacto de la Ley 26.653 y pedidos de la
  Ley 25.326). Insertan anon y autenticados, lee solo admin (`/admin`, "Mensajes recibidos").
- `/ayuda` queda en borrador en el alcance: falta el video con subtítulos y LSA.

## Deploy

- Vercel, proyecto `turnos-accesibles` (https://turnos-accesibles.vercel.app), deploy con
  `npx vercel deploy --prod`. Variables en el proyecto (producción): las 3 de Supabase y `NUXT_PUBLIC_DEMO=true`.
- `.vercelignore` deja afuera `.env` y lo que no hace falta para el build.

## Modo demo

- `NUXT_PUBLIC_DEMO=true` muestra la barra de demo (entrar como cada usuario de prueba) y `/demo`
  (alcance completo). También deja `/demo-ui` en el build. En el deploy real va apagado.
- **Al terminar cada fase, actualizar el `estado` de sus pantallas en `app/utils/alcance.ts`.**

## Notas

- Sin `NUXT_PUBLIC_SUPABASE_URL` el SSR se cae. Copiar `.env.example` a `.env` (tiene placeholders).
  En Vitest se pasa como `overrides` en `vitest.config.ts`; sin eso la app no arranca y Pinia no existe.
- `@vite-pwa/nuxt` se excluye cuando corre Vitest (rompe el entorno de tests).
- `/demo-ui` se saca del build de producción salvo con `DEMO_UI=1`, que es como lo corre Playwright.
- E2E: importar `test`/`expect` de `tests/e2e/fixtures.ts` (espera la hidratación en `goto`/`reload`).
  Las sesiones (solicitante, admin, prueba) se crean una vez en `sesiones.setup.ts` (Supabase limita
  a ~30 ingresos cada 5 minutos por IP). `auth.spec.ts` corre solo en escritorio.
- `prueba@demo.ar` es solo para tests que cambian datos (preferencias, perfil): no usar a Rosa.
- Para verificar navegación usar `toHaveURL((u) => u.pathname === '/x')`: una regex como `/\/inicio$/`
  también matchea `?volver=/inicio`.
- CI necesita las variables de repo `NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY`.
- Flechas en radios (Reka): elige la opción solo si la tecla sigue apretada al recibir foco.
  En Playwright usar `keyboard.down/up`, no `press`.
