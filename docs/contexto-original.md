# Turnos Accesibles — Contexto completo para desarrollo del frontend

> Documento de contexto para Claude Code. Copiar este archivo a la raíz del repo como
> `CLAUDE.md` (o `docs/CONTEXTO.md` y referenciarlo desde `CLAUDE.md`).
> Al final hay un **prompt de arranque** listo para pegar.

---

## 0. TL;DR del proyecto

**Nombre de trabajo:** Turnos Accesibles
**Qué es:** aplicación web (PWA) que funciona como **capa de accesibilidad** sobre los sistemas de turnos de salud pública. No reemplaza los sistemas oficiales (tipo "Turnos Web" de PBA): simplifica buscar y reservar un turno mediante un **flujo guiado, un paso por pantalla, en lenguaje claro**, con lectura en voz alta y entrada por voz.

**Para quién:** personas mayores, personas con discapacidad y personas con baja alfabetización digital. El usuario primario **no** es un usuario digital experto. Cada decisión de UI se juzga contra esa persona, no contra nosotros.

**Contexto académico:** Trabajo Final — Metodología de Sistemas I, UTN FRGP, Grupo 28 (Marco D'Antino, Miguel Tello, Nicolas Rosso). El entregable es un **prototipo funcional desplegado con datos de prueba**, no un producto en producción.

**Qué queda explícitamente fuera del alcance:**

- Integración real con sistemas oficiales de turnos provinciales u obras sociales (se documenta como trabajo futuro).
- Autenticación oficial contra ReNaPer / AFIP / ANSES (se simula).
- App móvil nativa (se cubre con PWA instalable).
- Recetas, historia clínica o cualquier información médica sensible.
- Puesta en producción con usuarios reales.

**La regla que ordena todo el resto:** la accesibilidad es un **requisito funcional prioritario**, no un pase de polish al final. Si una feature no es operable con teclado y lector de pantalla, no está terminada.

---

## 1. Stack fijado (no reabrir la discusión salvo bloqueo real)

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Nuxt 3 + TypeScript**, modo SSR | SSR mejora tiempo a contenido útil en conexiones lentas y da HTML semántico real al lector de pantalla |
| Estilos | **Tailwind CSS v4** con design tokens en CSS custom properties | Los temas (alto contraste, escala de texto) se cambian sobre variables, no sobre clases |
| Primitivas UI | **Reka UI** (headless, sucesor de Radix Vue) para dialog, combobox, popover, tabs | Foco, roles ARIA y navegación por teclado ya resueltos y testeados |
| Estado | **Pinia** | Preferencias de accesibilidad, sesión, borrador del asistente de reserva |
| Backend | **Supabase** (Postgres + Auth + RLS + Storage + Edge Functions) | Ya definido en la propuesta; el front consume el SDK directamente |
| Módulo Supabase | `@nuxtjs/supabase` | Composables `useSupabaseClient` / `useSupabaseUser` y middleware de sesión |
| PWA | `@vite-pwa/nuxt` | Instalable, offline shell, sin desarrollo nativo |
| Formularios | **vee-validate + zod** | Validación declarativa con mensajes en lenguaje simple |
| Voz | **VueUse**: `useSpeechSynthesis` (leer en voz alta), `useSpeechRecognition` (dictado) | API del navegador, sin costo ni backend |
| Fechas | **date-fns** con locale `es` | Formateo de fechas en lenguaje natural ("martes 14 de octubre, a las 10 de la mañana") |
| Íconos | `@nuxt/icon` con set **Lucide** | Trazo grueso, legible en tamaño grande |
| Tests unitarios | **Vitest** + `@vue/test-utils` + `vitest-axe` | |
| Tests E2E | **Playwright** + `@axe-core/playwright` | Corre la auditoría de accesibilidad en CI |
| Deploy | **Vercel** (capa gratuita) | |

**Reglas de stack:**

- No agregar librerías de UI pesadas con estilos propios (Vuetify, PrimeVue, Element). Rompen el control sobre contraste y foco.
- No agregar dependencias sin justificarlo en el PR.
- El servicio de IA (interpretación de lenguaje natural) se invoca **siempre desde una Edge Function**, nunca desde el cliente. El front llama a un endpoint propio. **Si ese servicio no responde, el flujo por menús tiene que funcionar igual** — esto es un requerimiento, no un nice to have.

---

## 2. Principios de diseño accesible (esto es el corazón del proyecto)

Estas reglas son vinculantes. Cuando una decisión de UI entre en conflicto con "lo que se ve más moderno", gana la regla.

### 2.1 Reglas duras

1. **Un paso por pantalla** en todo flujo de más de dos campos. Nada de formularios largos con scroll.
2. **Confirmación explícita antes de avanzar.** Cada paso muestra lo que se eligió y pide "Sí, continuar" / "Volver atrás". Nunca se avanza en automático al elegir una opción.
3. **Siempre se puede volver atrás sin perder lo cargado.** El borrador del asistente vive en Pinia + `sessionStorage`.
4. **Objetivo táctil mínimo 48×48 px** y separación mínima de 8 px entre controles. Los botones principales son grandes: ancho completo en mobile, altura mínima 56 px.
5. **Texto base 18 px** (no 16). Cuerpo mínimo 18 px, nunca menos de 16 px en ningún lugar de la app.
6. **Contraste**: mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande y elementos gráficos). Apuntar a **7:1 (AAA)** en el texto de contenido principal. El modo alto contraste es un tema aparte, no un filtro CSS.
7. **Foco visible siempre**: outline de 3 px sólido + offset de 2 px, con contraste ≥3:1 contra el fondo. Nunca `outline: none` sin reemplazo.
8. **Nada depende solo del color.** Estado disponible/ocupado/cancelado lleva ícono + texto, no solo un punto de color.
9. **Sin animaciones agresivas.** Respetar `prefers-reduced-motion`. Sin carruseles automáticos, sin parallax, sin nada que se mueva solo.
10. **Sin temporizadores de sesión sin aviso.** Si la sesión vence, avisar con anticipación y ofrecer extenderla (WCAG 2.2.1).
11. **Sin dark patterns ni notificaciones ansiógenas.** Nada de "¡3 personas están viendo este turno!".
12. **Todo el contenido dinámico se anuncia** vía `aria-live="polite"` (o `assertive` para errores). El asistente de reserva anuncia cada paso nuevo.
13. **Landmarks semánticos obligatorios**: `header`/`nav`/`main`/`footer`, un solo `h1` por página, jerarquía de headings sin saltos.
14. **Skip link** "Saltar al contenido principal" como primer elemento focuseable.
15. **Idioma**: `<html lang="es-AR">`. Toda la UI en español. Las fechas se escriben en palabras, no en formato `14/10/2026`.

### 2.2 Lenguaje simple

Hay un **modo lenguaje simple** (toggle en preferencias, activo por defecto). Afecta a los textos de la interfaz, no solo al contenido.

Reglas de redacción:

- Oraciones de máximo ~15 palabras, una idea por oración.
- Voz activa y segunda persona: "Elegí el día" y no "Deberá seleccionarse la fecha".
- Cero vocabulario administrativo sin traducir. Ejemplos del glosario obligatorio:

| No escribir | Escribir |
|---|---|
| "Solicitud de asignación de turno" | "Pedir un turno" |
| "Credenciales" | "Tu correo y tu contraseña" |
| "Autenticación fallida" | "El correo o la contraseña no coinciden. Probá de nuevo." |
| "Especialidad médica" | "¿Qué médico necesitás?" (con ejemplos: oculista, cardiólogo…) |
| "Efector de salud" / "Centro asistencial" | "Hospital o centro de salud" |
| "Confirmar operación" | "Sí, reservar este turno" |
| "Turno reprogramado exitosamente" | "Listo. Cambiamos tu turno al jueves 16 de octubre." |

- Los nombres de especialidades se muestran con el nombre común primero: **"Oculista"** y abajo, en menor jerarquía, *"Oftalmología"*.
- Los errores dicen **qué pasó y qué hacer ahora**, nunca códigos.

### 2.3 Preferencias de accesibilidad (RF #2)

Se ofrecen en el primer ingreso y viven permanentemente en el perfil. Se guardan en Supabase (`preferencias_accesibilidad`) **y** en `localStorage` para aplicarlas antes de la hidratación (evitar flash).

| Preferencia | Valores | Implementación |
|---|---|---|
| Tamaño de texto | 100 / 125 / 150 / 200 % | `data-text-scale` en `<html>`, escala sobre `rem` |
| Contraste | normal / alto | `data-theme="alto-contraste"` con su propio set de tokens |
| Lectura en voz alta | on / off | `useSpeechSynthesis`, botón 🔊 en cada pantalla y lectura automática del paso |
| Velocidad de lectura | lenta / normal / rápida | `rate: 0.8 / 1 / 1.3` |
| Reducción de movimiento | auto / siempre | `data-reduce-motion`, además de la media query |
| Lenguaje simple | on / off | Cambia el set de copys (ver §2.2) |
| Canal de notificación | visual / sonoro / ambos | Afecta a los avisos in-app |

**Perfil por defecto si el usuario no configura nada: texto 125 %, alto contraste activado, movimiento reducido.** Optamos por el default accesible, no por el default "bonito".

### 2.4 Declaración de accesibilidad

La app tiene una página `/accesibilidad` con la declaración de conformidad, el nivel alcanzado (WCAG 2.1 AA), las limitaciones conocidas y un canal de contacto. Lo exige la **Ley 26.653**, y en la defensa del trabajo suma.

---

## 3. Design tokens

Definir en `assets/css/tokens.css`. Todo color, espacio y tamaño sale de acá; **cero valores hardcodeados en componentes**.

```css
:root {
  /* Tipografía — base 18px */
  --font-sans: "Atkinson Hyperlegible", system-ui, sans-serif; /* diseñada para baja visión */
  --text-base: 1.125rem;   /* 18px */
  --text-sm:   1rem;       /* 16px — mínimo absoluto */
  --text-lg:   1.375rem;
  --text-xl:   1.75rem;
  --text-2xl:  2.25rem;
  --leading-body: 1.6;     /* WCAG 1.4.12 */

  /* Espaciado */
  --space-1: 0.5rem; --space-2: 1rem; --space-3: 1.5rem;
  --space-4: 2rem;   --space-5: 3rem;

  /* Targets táctiles */
  --target-min: 48px;
  --button-height: 56px;

  /* Color — tema claro (verificar cada par con el validador) */
  --c-bg:            #ffffff;
  --c-surface:       #f4f6f8;
  --c-text:          #10161c;  /* 17.4:1 sobre bg → AAA */
  --c-text-muted:    #45525f;  /* 8.1:1 → AAA */
  --c-border:        #6b7885;
  --c-primary:       #0b4f9e;  /* 8.0:1 sobre blanco */
  --c-primary-text:  #ffffff;
  --c-success:       #0f6b3d;
  --c-warning:       #8a5a00;
  --c-danger:        #a4161a;
  --c-focus:         #b45309;  /* distinto de primary para que el foco se distinga */

  --radius: 8px;
  --focus-ring: 3px solid var(--c-focus);
  --focus-offset: 2px;
}

:root[data-theme="alto-contraste"] {
  --c-bg: #000000; --c-surface: #0d0d0d; --c-text: #ffffff;
  --c-text-muted: #e6e6e6; --c-border: #ffffff;
  --c-primary: #ffdd00; --c-primary-text: #000000;
  --c-success: #4ade80; --c-warning: #fbbf24; --c-danger: #ff6b6b;
  --c-focus: #00e5ff;
}

:root[data-text-scale="125"] { font-size: 125%; }
:root[data-text-scale="150"] { font-size: 150%; }
:root[data-text-scale="200"] { font-size: 200%; }

*:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
:root[data-reduce-motion="true"] * { animation: none !important; transition: none !important; }
```

**Tipografía:** usar **Atkinson Hyperlegible** (Braille Institute, gratuita, diseñada para baja visión). Fallback a system-ui.

**Verificación obligatoria:** cada par de colores nuevo se valida con un script de contraste antes de mergear. Incluir `scripts/check-contrast.ts` que recorra los tokens y falle si algún par cae debajo del umbral.

---

## 4. Modelo de datos (Supabase)

El front tipa todo contra esto. Generar tipos con `supabase gen types typescript` en `types/database.ts`.

```
profiles                (id uuid PK → auth.users, nombre, apellido, documento, fecha_nacimiento,
                         telefono, localidad, lat, lng, rol: 'solicitante'|'acompanante'|'admin',
                         creado_en)

preferencias_accesibilidad (id, profile_id FK, text_scale, contraste, voz_activa, voz_velocidad,
                         reduce_motion, lenguaje_simple, canal_notificacion, actualizado_en)

centros                 (id, nombre, tipo, direccion, localidad, provincia, lat, lng, telefono,
                         horario_atencion, accesibilidad_edilicia jsonb, como_llegar text, activo)

especialidades          (id, nombre_comun, nombre_tecnico, descripcion_simple, icono, activo)

profesionales           (id, nombre, apellido, matricula, especialidad_id FK)

centro_especialidad     (centro_id FK, especialidad_id FK, requisitos text)  -- PK compuesta

agendas                 (id, centro_id FK, profesional_id FK, especialidad_id FK,
                         fecha date, hora_inicio time, hora_fin time, duracion_min, cupos_totales)

turnos_disponibles      (id, agenda_id FK, centro_id FK, especialidad_id FK, profesional_id FK,
                         fecha_hora timestamptz, estado: 'disponible'|'reservado'|'bloqueado')
                         -- UNIQUE(profesional_id, fecha_hora) evita superposición (RF #8)

reservas                (id, numero_correlativo serial, turno_id FK UNIQUE, solicitante_id FK,
                         reservada_por_id FK,        -- distinto si la hizo un acompañante
                         estado: 'confirmada'|'cancelada'|'reprogramada'|'completada'|'ausente',
                         reserva_origen_id FK NULL,  -- si viene de una reprogramación
                         creada_en, cancelada_en, motivo_cancelacion)

acompanamientos         (id, solicitante_id FK, acompanante_id FK NULL, email_invitado,
                         alcance text[] ('ver'|'reservar'|'cancelar'), token_invitacion,
                         estado: 'pendiente'|'activo'|'revocado'|'vencido',
                         invitado_en, aceptado_en, revocado_en, vence_en)

consentimientos         (id, acompanamiento_id FK, solicitante_id FK, alcance text[],
                         otorgado_en, revocado_en, ip, user_agent)

notificaciones          (id, profile_id FK, reserva_id FK NULL, tipo, titulo, cuerpo,
                         canal: 'app'|'email'|'ambos', programada_para, enviada_en, leida_en,
                         estado: 'programada'|'enviada'|'entregada'|'leida'|'fallida')

eventos_uso             (id, profile_id FK NULL, tipo_evento, payload jsonb, creado_en)
                         -- métricas agregadas y anónimas (RF #9)

auditoria               (id, actor_id FK, entidad, entidad_id, accion, antes jsonb,
                         despues jsonb, creado_en)   -- RF #8
```

**RLS (esperado del lado backend, el front asume que existe):** cada usuario lee y escribe solo sus propias reservas, preferencias y notificaciones. Un acompañante activo accede a las reservas de su solicitante **solo dentro del alcance consentido**. `admin` accede a todo. `centros`, `especialidades`, `turnos_disponibles` son de lectura pública.

**Invariante crítica (RF #4 / NFR Confiabilidad):** un turno no puede reservarse dos veces. La reserva se hace en una **RPC/Edge Function transaccional** (`reservar_turno(turno_id)`) que hace el `UPDATE ... WHERE estado = 'disponible'` y devuelve error si afectó 0 filas. **El front nunca hace `insert` en `reservas` directamente.**

---

## 5. Mapa de rutas y pantallas

Rutas en español (el usuario ve las URLs y a veces las dicta por teléfono).

```
/                           Landing: qué es, un CTA enorme "Sacar un turno", "Ingresar"
/ingresar                   Login
/registrarme                Registro — un campo por pantalla
/confirmar-correo           Aviso post-registro
/recuperar-clave            Pedido de enlace
/restablecer-clave          Con token

/bienvenida                 Wizard de preferencias de accesibilidad (primer ingreso)   [RF #2]

/inicio                     Panel del solicitante:
                              - Próximo turno en tarjeta grande
                              - Botón primario "Sacar un turno"
                              - "Mis turnos", "Ayuda"

/turnos/buscar              Búsqueda guiada por menús (fallback sin IA)                [RF #3]
/turnos/asistente           Asistente conversacional paso a paso (texto o voz)         [RF #4]
/turnos/:turnoId            Ficha de detalle del turno disponible
/turnos/:turnoId/confirmar  Resumen + confirmación explícita
/reservas/:id               Comprobante de la reserva
/mis-turnos                 Listado: próximos / pasados                                [RF #5]
/reservas/:id/cancelar      Cancelación con confirmación
/reservas/:id/reprogramar   Reprogramación (busca nuevo turno, libera el viejo)

/acompanantes               Invitar / listar / revocar acompañantes                    [RF #7]
/acompanantes/invitar       Alta de invitación con selección de alcance
/invitacion/:token          Aceptación por parte del acompañante
/asistiendo/:solicitanteId  Vista del acompañante sobre el trámite del solicitante

/perfil                     Datos personales
/perfil/accesibilidad       Preferencias (mismas que /bienvenida)                      [RF #2]
/notificaciones             Bandeja in-app                                             [RF #6]

/admin                      Panel (solo rol admin)                                     [RF #8]
/admin/centros              CRUD de centros
/admin/especialidades       CRUD de especialidades
/admin/profesionales        CRUD de profesionales
/admin/agendas              Generación de agendas y cupos
/admin/metricas             Tablero + exportación                                      [RF #9]

/ayuda                      Guía en lenguaje simple, con video corto
/accesibilidad              Declaración de accesibilidad (Ley 26.653)
/terminos                   Términos de uso (incluye el descargo: no es el sistema oficial)
```

### 5.1 El asistente de reserva, paso a paso (RF #4 — la pantalla estrella)

Este es el flujo que define el proyecto. Detalle obligatorio:

```
Paso 0  Entrada libre (opcional)
        "Contame qué necesitás" — campo de texto + botón de micrófono grande.
        Ej: "necesito un turno con el oculista cerca de casa"
        → POST /api/asistente/interpretar (Edge Function)
        → devuelve { especialidad_id?, centro_id?, preferencia_fecha?, confianza }
        → Si confianza < umbral O el servicio falla → se salta al Paso 1 sin drama,
          con el mensaje: "Vamos paso a paso entonces."

Paso 1  ¿Qué médico necesitás?
        Lista de especialidades con nombre común + ícono + nombre técnico chico.
        Buscador con autocompletado accesible (Reka UI Combobox).

Paso 2  ¿Dónde te queda cómodo?
        Opciones: "Cerca de mi casa" / "Elegir el hospital de una lista" / "Donde haya antes"
        Si elige cercanía: usa lat/lng del perfil. Si no hay → pide la localidad a mano.

Paso 3  ¿Cuándo podés ir?
        "Lo antes posible" / "Elegir una fecha" / franja: mañana / tarde
        Calendario accesible solo si eligió "Elegir una fecha" (navegable con flechas).

Paso 4  Estos son los turnos que encontré
        Máximo 5 resultados por pantalla, tarjetas grandes.
        Cada una: día en palabras, hora en palabras, hospital, dirección, cuánto queda de distancia.
        Estado con ícono + texto, nunca solo color.

Paso 5  Confirmá que está todo bien
        Resumen en oraciones cortas + botón "Sí, reservar este turno" (primario, grande)
        y "Volver atrás" (secundario, igual de visible).
        Antes de confirmar: revalidar disponibilidad y chequear superposición del solicitante.

Paso 6  ¡Listo! Turno reservado
        Número de turno, comprobante, "Agregar a mi calendario", "Cómo llegar",
        "Te vamos a recordar el turno el día anterior".
        Se lee en voz alta automáticamente si la preferencia está activa.
```

**Reglas del asistente:**

- Una sola pregunta por pantalla. Progreso visible: "Paso 3 de 6" (texto, no solo barra).
- `aria-live="polite"` en el contenedor del paso; al montar cada paso, mover el foco al `h1` del paso.
- El borrador se persiste en `sessionStorage`; si el usuario se va y vuelve, retoma donde estaba.
- Manejo de errores del §6.

---

## 6. Estados y errores (implementar desde el principio, no después)

Cada vista tiene **cinco estados** y los cinco se construyen: `cargando` / `vacío` / `error` / `sin permiso` / `contenido`.

Errores concretos que exige la especificación:

| Situación | Comportamiento esperado |
|---|---|
| El turno lo tomó otro mientras completaba el flujo | Mensaje claro + mostrar alternativas más cercanas **sin perder lo ya cargado** |
| La IA no interpreta el pedido | Caer al flujo por menús, sin cortar el trámite |
| La IA está caída | Idéntico al anterior. El botón de voz se oculta, todo lo demás funciona |
| Turno superpuesto del mismo solicitante | Advertir y pedir confirmación extra |
| Abandona antes de confirmar | No se reserva, se libera el cupo, queda borrador |
| Sin resultados en la búsqueda | Sugerir: otra fecha / otro centro cercano / avisarme si aparece |
| Sin geolocalización | Pedir localidad a mano y seguir sin el criterio de proximidad |
| Navegador sin síntesis de voz | Avisar la limitación y ofrecer texto ampliado |
| 5 logins fallidos | Bloqueo temporal con mensaje que dice cuánto hay que esperar |
| Acompañante actúa fuera del alcance | Rechazar y explicar qué sí puede hacer |
| Cancelar un turno vencido/cumplido | No permitir, explicar por qué |
| Falla la exportación de reportes | Mantener la vista en pantalla, avisar |

Formato de todo mensaje de error: **qué pasó** + **qué hacer ahora**. Sin códigos, sin "error inesperado".

---

## 7. Estructura del proyecto

```
/
├── app.vue
├── nuxt.config.ts
├── CLAUDE.md                    ← este documento
├── assets/css/
│   ├── tokens.css               design tokens
│   └── main.css                 Tailwind + base
├── components/
│   ├── base/                    BaseButton, BaseInput, BaseCard, BaseAlert, BaseBadge,
│   │                            BaseModal, BaseCombobox, BaseRadioCards, BaseStepper
│   ├── a11y/                    SkipLink, LiveRegion, ReadAloudButton, VoiceInputButton,
│   │                            AccessibilityMenu, FocusTrap
│   ├── turnos/                  TurnoCard, TurnoDetalle, BuscadorEspecialidad,
│   │                            SelectorFecha, ResumenReserva, ComprobanteTurno
│   ├── asistente/               AsistentePaso, PasoEspecialidad, PasoUbicacion,
│   │                            PasoFecha, PasoResultados, PasoConfirmacion, PasoExito
│   ├── acompanante/             InvitacionForm, AcompananteList, ConsentimientoBanner
│   └── admin/                   CentroForm, AgendaGenerator, MetricasTablero
├── composables/
│   ├── useAccesibilidad.ts      lee/escribe preferencias, aplica atributos a <html>
│   ├── useLecturaEnVozAlta.ts   wrapper de useSpeechSynthesis con cola y cancelación
│   ├── useEntradaPorVoz.ts      wrapper de useSpeechRecognition con fallback
│   ├── useAnuncio.ts            empuja mensajes a la live region global
│   ├── useTurnos.ts             búsqueda y filtros
│   ├── useReserva.ts            máquina de estados del asistente + RPC de reserva
│   ├── useAcompanamiento.ts
│   ├── useNotificaciones.ts
│   └── useLenguajeSimple.ts     resuelve copys según la preferencia
├── stores/
│   ├── accesibilidad.ts
│   ├── sesion.ts
│   └── borradorReserva.ts
├── layouts/
│   ├── default.vue              con skip link, header, live region global, footer
│   ├── asistente.vue            minimalista, sin distracciones
│   └── admin.vue
├── middleware/
│   ├── auth.ts
│   ├── rol.ts                   protege /admin
│   └── onboarding.ts            manda a /bienvenida si no configuró preferencias
├── pages/                       según §5
├── server/api/
│   ├── asistente/interpretar.post.ts    proxy a la Edge Function
│   └── reservas/reservar.post.ts        proxy a la RPC transaccional
├── types/
│   ├── database.ts              generado por Supabase CLI
│   └── dominio.ts               tipos de negocio propios
├── utils/
│   ├── fechas.ts                formateo en lenguaje natural
│   ├── distancia.ts             haversine
│   └── copys.ts                 diccionario técnico ↔ lenguaje simple
├── tests/
│   ├── unit/
│   └── e2e/                     incluye a11y.spec.ts con axe
└── supabase/
    ├── migrations/
    └── seed.sql                 datos de prueba realistas
```

---

## 8. Plan de trabajo por fases

Cada fase termina con la app funcionando y desplegable. Nada de ramas largas.

**Fase 0 — Andamiaje**
Nuxt 3 + TS + Tailwind v4 + Pinia + Supabase + PWA. Tokens de diseño. Layout base con skip link, landmarks y live region global. Vitest y Playwright corriendo. `check-contrast` en CI.

**Fase 1 — Design system accesible**
Componentes `base/` y `a11y/` con sus estados. Página `/demo-ui` (solo dev) con todos los componentes en los 4 combinaciones tema × escala de texto. Tests con `vitest-axe` para cada componente.

**Fase 2 — Auth** *(RF #1)*
Registro paso a paso, login, verificación por correo, recuperación de contraseña, bloqueo tras 5 intentos. Middleware de sesión y rol.

**Fase 3 — Preferencias de accesibilidad** *(RF #2)*
Wizard `/bienvenida` y `/perfil/accesibilidad`. Aplicación sin flash (plugin que lee `localStorage` antes de hidratar). Sincronización con Supabase. Default accesible.

**Fase 4 — Datos y búsqueda** *(RF #3)*
Migraciones + `seed.sql` con ~8 centros, ~15 especialidades, agendas de 30 días. Búsqueda por menús con filtros, orden por proximidad y fecha, ficha de detalle. Los cinco estados de vista.

**Fase 5 — Asistente de reserva** *(RF #4)* ← *el núcleo del proyecto*
Los 7 pasos del §5.1, con voz y sin voz. Borrador persistente. RPC transaccional de reserva. Comprobante. Todos los errores del §6.

**Fase 6 — Mis turnos, cancelar y reprogramar** *(RF #5)*
Listado de próximos y pasados, cancelación con confirmación, reprogramación encadenada con la búsqueda, liberación de cupo.

**Fase 7 — Recordatorios y notificaciones** *(RF #6)*
Bandeja in-app, preferencias de canal, aviso visual y sonoro, estados enviada/entregada/leída. Programación desde Edge Function (el front consume y marca leídas).

**Fase 8 — Modo asistido** *(RF #7)*
Invitación con alcance, aceptación por token, vista del acompañante, registro y revocación de consentimiento, banner permanente "Estás ayudando a X".

**Fase 9 — Panel administrativo** *(RF #8)*
CRUD de centros, especialidades, profesionales. Generador de agendas con validación de superposición. Bloqueo de baja con turnos reservados.

**Fase 10 — Métricas** *(RF #9)*
Tablero con turnos buscados/reservados/cancelados/completados, tiempo promedio de reserva, proporción autónomo vs. asistido. Exportación a CSV y PDF. Gráficos accesibles: tabla de datos equivalente siempre disponible.

**Fase 11 — PWA, auditoría y cierre**
Manifest, íconos, service worker, shell offline, prompt de instalación accesible. Auditoría axe en todas las rutas, recorrido completo solo con teclado, prueba con NVDA y con VoiceOver, Lighthouse ≥95 en Accessibility y Performance. Página `/accesibilidad`. README y diagramas.

---

## 9. Definition of Done

Una feature está terminada cuando **todo** esto se cumple:

- [ ] Se completa el flujo entero **solo con teclado**, en orden lógico, sin trampas de foco.
- [ ] Pasa `axe` sin violaciones críticas ni serias.
- [ ] Todos los pares de color usados cumplen el umbral de contraste (script verde).
- [ ] Funciona legible y usable con el texto al **200 %**, sin scroll horizontal.
- [ ] Funciona en **modo alto contraste**.
- [ ] Todo contenido dinámico se anuncia en la live region.
- [ ] Los cinco estados de vista están construidos (§6).
- [ ] Los copys pasaron la revisión de lenguaje simple (§2.2).
- [ ] Funciona en mobile a 360 px de ancho.
- [ ] Si depende del servicio de IA: **funciona también con el servicio caído**.
- [ ] Tiene test unitario del componente y, si es un flujo, un E2E.

---

## 10. Convenciones

- **Componentes** en PascalCase; **composables** `useAlgo`; **archivos de páginas** en kebab-case español.
- **Código en inglés** (variables, funciones, tipos). **Textos de UI y nombres de tablas en español.**
- `<script setup lang="ts">` siempre. Composition API, nada de Options API.
- Sin `any`. Sin `!` para silenciar el compilador.
- Ningún `div` con `@click`: si es interactivo, es `<button>` o `<a>`.
- Ningún texto hardcodeado en el template si tiene variante de lenguaje simple → pasa por `useLenguajeSimple`.
- Commits en español, imperativo: `agrega paso de especialidad al asistente`.
- Ramas: `feat/…`, `fix/…`, `a11y/…`.

---

## 11. Datos de prueba (`seed.sql`)

Que sean realistas, del conurbano norte de Buenos Aires (contexto de la facultad):

- **Centros:** Hospital Municipal de General Pacheco, Hospital Zonal General de Agudos Dr. Carlos Bocalandro (Tres de Febrero), CAPS San Jorge (Don Torcuato), Hospital de Trauma de Tigre, CAPS Benavídez, Hospital Municipal Dr. Carlos Gianantonio (San Isidro), CAPS Rincón de Milberg, Hospital Materno Infantil de Tigre.
- **Especialidades** (nombre común / técnico): Oculista / Oftalmología · Médico de familia / Medicina general · Cardiólogo / Cardiología · Dentista / Odontología · Piel / Dermatología · Huesos / Traumatología · Mujer / Ginecología · Niños / Pediatría · Oído, nariz y garganta / Otorrinolaringología · Mental / Salud mental · Riñón / Nefrología · Diabetes / Endocrinología · Pulmón / Neumonología · Análisis / Laboratorio · Estudios / Diagnóstico por imágenes.
- **Agendas:** próximos 30 días, lunes a viernes, turnos de 20 minutos entre 8:00 y 16:00, con ~30 % ya reservados para que la UI no se vea vacía.
- **Usuarios de prueba:** `solicitante@demo.ar`, `acompanante@demo.ar`, `admin@demo.ar` — todos con contraseña `demo1234`, documentados en el README.

---

## 12. Lo que NO hay que hacer

- No construir el backend real de integración con sistemas provinciales. Está fuera de alcance.
- No guardar ni mostrar información clínica. La app gestiona turnos, punto.
- No poner la API key del modelo de lenguaje en el cliente. Nunca.
- No usar `localStorage` para datos que tienen que sobrevivir entre dispositivos — esos van a Supabase.
- No dejar la accesibilidad para el final.
- No agregar animaciones "para que quede lindo".
- No inventar requerimientos nuevos: si algo no está en la especificación, preguntarlo antes de construirlo.

---

## 13. Prompt de arranque (pegar en Claude Code)

```
Vamos a construir el frontend completo de "Turnos Accesibles", el trabajo final de
Metodología de Sistemas I (UTN FRGP, Grupo 28). Leé CLAUDE.md en la raíz: tiene el
contexto completo, el stack fijado, los principios de accesibilidad, el modelo de
datos, el mapa de rutas y el plan por fases. Es vinculante — no cambies decisiones
de stack sin avisarme.

Contexto en una línea: es una PWA en Nuxt 3 + Supabase que funciona como capa de
accesibilidad sobre los sistemas de turnos de salud pública, pensada para personas
mayores, con discapacidad o con baja alfabetización digital. La accesibilidad
(WCAG 2.1 AA como piso) es requisito funcional, no polish.

Arrancá por la Fase 0 del plan:

1. Inicializar Nuxt 3 con TypeScript, Tailwind CSS v4, Pinia, @nuxtjs/supabase,
   @vite-pwa/nuxt, Reka UI, VueUse, vee-validate + zod, date-fns, @nuxt/icon (Lucide).
2. Crear assets/css/tokens.css con los design tokens de la sección 3 tal cual están,
   incluyendo el tema de alto contraste y las escalas de texto.
3. Armar el layout default con: skip link, landmarks semánticos, header con el menú
   de accesibilidad, live region global (aria-live polite + assertive) y footer con
   enlaces a /ayuda, /accesibilidad y /terminos.
4. Crear el composable useAccesibilidad + el store de Pinia, y un plugin que aplique
   las preferencias desde localStorage ANTES de la hidratación (sin flash).
5. Configurar Vitest con vitest-axe y Playwright con @axe-core/playwright, más un
   script scripts/check-contrast.ts que valide todos los pares de tokens y falle si
   alguno no llega al umbral.
6. Dejar una página /demo-ui (solo en dev) donde se vean los componentes en las 4
   combinaciones de tema × escala de texto.

Cuando termines la Fase 0, mostrame un resumen de lo que quedó armado y el árbol de
archivos, y esperá mi OK antes de pasar a la Fase 1. No avances de fase sin que te
lo confirme.

Trabajá en español para los textos de UI y en inglés para el código. Commits en
español, imperativo.
```

---

## Anexo — Trazabilidad: requerimiento → pantalla

| RF | Nombre | Pantallas | Fase |
|---|---|---|---|
| 1 | Registrar y autenticar usuario | `/registrarme` `/ingresar` `/recuperar-clave` `/restablecer-clave` `/confirmar-correo` | 2 |
| 2 | Configurar preferencias de accesibilidad | `/bienvenida` `/perfil/accesibilidad` + menú global | 3 |
| 3 | Buscar turnos disponibles | `/turnos/buscar` `/turnos/:id` | 4 |
| 4 | Reservar turno con asistente guiado | `/turnos/asistente` `/turnos/:id/confirmar` `/reservas/:id` | 5 |
| 5 | Cancelar o reprogramar | `/mis-turnos` `/reservas/:id/cancelar` `/reservas/:id/reprogramar` | 6 |
| 6 | Recordatorios y notificaciones | `/notificaciones` + toasts accesibles | 7 |
| 7 | Modo asistido con acompañante | `/acompanantes` `/acompanantes/invitar` `/invitacion/:token` `/asistiendo/:id` | 8 |
| 8 | Administrar centros, especialidades y agendas | `/admin/*` | 9 |
| 9 | Métricas y reportes | `/admin/metricas` | 10 |

| NFR | Dónde se materializa en el front |
|---|---|
| Desempeño | SSR, lazy de rutas, imágenes optimizadas, presupuesto: LCP < 2.5 s en 3G simulada |
| Confiabilidad | Reserva vía RPC transaccional; el front nunca inserta reservas directo |
| Disponibilidad | Degradación del asistente de IA al flujo por menús; shell offline de la PWA |
| Seguridad | RLS de Supabase, middleware de rol, alcance del acompañante validado en UI y en RLS |
| Mantenibilidad | Tokens de diseño, composables, cero valores hardcodeados |
| Portabilidad | PWA instalable, responsive desde 360 px |
| Usabilidad y accesibilidad | Todo el documento, verificado en la Definition of Done |
