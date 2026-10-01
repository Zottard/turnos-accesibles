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
