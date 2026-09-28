# Manual de front

Cómo se construye el front de Postix, escrito para poder repetirlo en otro repo
desde cero. Sale de leer el código, no de lo que se dijo que se iba a hacer.

Todo lo que está acá es portable: el stack, las convenciones, los tokens y los
patrones no dependen del dominio de esta app. Donde hay un ejemplo con posts,
perfiles o redes, cambialo por lo tuyo y el patrón sigue valiendo.

Orden de lectura si vas a arrancar un repo nuevo: sección 1 (copiar), sección 4
(tokens), sección 8 (datos). El resto se consulta cuando aparece el caso.

---

## 1. Lo mínimo para arrancar

Seis archivos se copian tal cual y ya te dejan el 80% del sistema montado:

| Archivo | Qué trae |
|---|---|
| `nuxt.config.ts` | Módulos, fuentes, íconos, `pathPrefix: false` |
| `app/app.config.ts` | Nombre de la app y los overrides de Nuxt UI |
| `app/assets/css/main.css` | Tokens, breakpoints, utilidades, transiciones |
| `app/composables/useFlash.js` | Avisos por toast |
| `app/composables/useAccent.js` | Color principal elegible por usuario |
| `app/plugins/accent.js` | Aplica el color antes del render |

Después: `app/app.vue` con `<UApp>`, un layout, y a construir.

```bash
pnpm install
pnpm dev
```

`pnpm`, nada de npm ni yarn. Si el proyecto va a Vercel, el lockfile de pnpm es
parte del contrato del build.

---

## 2. Stack

| Tecnología | Versión | Por qué |
|---|---|---|
| Nuxt | ^4.1 | Carpeta `app/`, SSR, auto import |
| Vue | ^3.5 | Composition API, `<script setup>` |
| Tailwind | ^4.1 | CSS first, tokens en `@theme`, sin `tailwind.config.js` |
| Nuxt UI | ^4.0 | Componentes de app |
| @vueuse/core + integrations | ^15 | `useDebounceFn`, `useSortable` |
| chart.js + vue-chartjs | ^4.5 / ^5.3 | Gráficos |
| marked | ^18 | Markdown a HTML |
| @iconify-json/lucide + simple-icons | | Íconos |

Tailwind v4 entra como plugin de Vite, no como módulo de Nuxt:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  components: [{ path: '~/components', pathPrefix: false }],
  ui: { fonts: false, colorMode: false },
  icon: { mode: 'svg', clientBundle: { scan: true } },
})
```

Las cuatro decisiones de ese bloque:

- **`pathPrefix: false`**: `components/post/PostImage.vue` se usa como
  `<PostImage />`. Las carpetas ordenan el repo, no el nombre del componente.
- **`ui.fonts: false`**: las fuentes se cargan a mano desde el `head`, así no
  entra el módulo de fuentes de Nuxt UI.
- **`ui.colorMode: false`**: no hay modo oscuro ni toggle. Decisión de producto,
  y saca de encima un eje entero de bugs visuales.
- **`icon.mode: 'svg'` con `clientBundle.scan`**: los íconos se inlinean en el
  bundle, sin request a la API de Iconify en runtime.

Fuentes, en `app.head`:

```ts
link: [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
  { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap' },
  { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/GeistMono-Variable.woff2', crossorigin: '' },
]
```

La sans va por Google Fonts y la mono se sirve local. Meta obligatorias:
`viewport-fit=cover`, `color-scheme: light` y `theme-color` con el fondo real de
la app, para que la barra del navegador en mobile no quede blanca contra un
fondo crema.

---

## 3. Estructura

```
app/
  app.vue                 UApp + NuxtLayout + NuxtPage, nada más
  app.config.ts           appName y overrides de Nuxt UI
  assets/css/main.css     tokens y utilidades
  components/<feature>/   PascalCase, agrupados por dominio
  composables/useXxx.js   lógica compartida con estado
  layouts/                default y auth
  middleware/             auth.global.js
  pages/                  rutas
  plugins/                accent.js
  utils/                  funciones puras, auto importadas
```

`utils/` y `composables/` se auto importan: `red()`, `MODULOS`, `ETAPAS`,
`validatePost()`, `useFlash()` se usan sin `import` en cualquier `.vue`. Los
`import` explícitos quedan solo para paquetes externos (`marked`, `chart.js`,
`useSortable`, `useDebounceFn`).

Qué va en `utils/`: constantes de dominio con su ícono y su label, y funciones
puras. El patrón que se repite:

```js
export const REDES = [
  { value: 'linkedin', label: 'LinkedIn', icon: 'i-simple-icons-linkedin', clase: 'text-linkedin' },
  { value: 'instagram', label: 'Instagram', icon: 'i-simple-icons-instagram', clase: 'text-pink-600' },
]

export const red = (value) => REDES.find((r) => r.value === value) ?? REDES[0]
```

Una lista, y un buscador que **siempre devuelve algo**. Así el template nunca
chequea null: `red(x.network).icon` no puede romper. Este patrón se usa para
redes, etapas, roles y módulos, y es la razón de que los templates estén limpios.

---

## 4. Sistema visual

Todo vive en `app/assets/css/main.css`. No hay `tailwind.config.js`.

### Tipografía

Una sans para todo y una mono para números. La mono aparece solo en fechas,
cantidades y datos tabulares, siempre con la utilidad `.num-tabular` para que los
dígitos no bailen cuando el valor cambia.

### Neutra propia

```css
@theme static {
  --color-arena-50: #faf9f7;
  --color-arena-100: #f2f0ec;
  --color-arena-200: #e6e3dc;
  --color-arena-300: #d3cec3;
  --color-arena-400: #a8a296;
  --color-arena-500: #7d776b;
  --color-arena-600: #5c574d;
  --color-arena-700: #433f38;
  --color-arena-800: #2b2925;
  --color-arena-900: #1a1917;
  --color-arena-950: #0f0e0d;
}
```

Una neutra cálida que reemplaza al gris de Tailwind y es el 99% de la interfaz.
Se registra como `neutral` en `app.config.ts`. Cambiar esta rampa cambia la
temperatura de toda la app de una.

### El texto es siempre negro

```css
:root {
  --ui-radius: 0.375rem;
  --ui-text: var(--color-arena-950);
  --ui-text-toned: var(--color-arena-950);
  --ui-text-muted: var(--color-arena-950);
  --ui-text-highlighted: var(--color-arena-950);
}
```

Nuxt UI trae cuatro niveles de gris para el texto. Acá los cuatro apuntan al
mismo negro: la jerarquía se hace con **peso y tamaño**, no con gris. Es la
decisión que más se nota en pantalla y la que más pelea con el instinto de
"bajarle un poco el gris a esto". `text-dimmed` queda gris y se usa solo para
placeholders y deshabilitados.

Como los tokens ya están redefinidos, en el markup se sigue escribiendo
`text-highlighted` y `text-muted` normal. Nada de hex suelto.

### Colores de estado

```css
@theme static {
  --color-estado-borrador: #6b6459;    --color-estado-borrador-bg: #f0eee9;
  --color-estado-listo: #8a6a12;       --color-estado-listo-bg: #fdf3d7;
  --color-estado-publicado: #3f6b48;   --color-estado-publicado-bg: #e3f1e5;
  --color-estado-salteado: #97455f;    --color-estado-salteado-bg: #fbe7ed;
  --color-estado-urgente: #a8521f;     --color-estado-urgente-bg: #fdebdd;
}
```

**Un color = un estado.** Cinco pasteles, cada uno con su par de texto y fondo,
y son los únicos colores con significado en la app. Si algo no es un estado de
la entidad principal, va sin color. La regla se sostiene sola: cuando todo tiene
color, el color no informa nada.

En el markup: `text-estado-listo` y `bg-estado-listo-bg`.

Lo urgente es la excepción y va con `red-500` en un borde, no con un pastel.

### Color principal elegible

El `primary` de Nuxt UI lo elige cada usuario entre nueve colores. Se guarda en
cookie y se aplica en un plugin antes del render para que no parpadee:

```js
// composables/useAccent.js
export const ACENTOS = [
  { value: 'blue', label: 'Azul', clase: 'bg-blue-500' },
  // ...nueve
]

export function useAccent() {
  const appConfig = useAppConfig()
  const cookie = useCookie('pipeline_color', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })

  function set(value) {
    cookie.value = value
    appConfig.ui.colors.primary = value
  }

  return { actual: computed(() => appConfig.ui.colors.primary), set }
}
```

```js
// plugins/accent.js
export default defineNuxtPlugin(() => {
  const color = useCookie('pipeline_color').value
  if (ACENTOS.some((a) => a.value === color)) useAppConfig().ui.colors.primary = color
})
```

La consecuencia para el markup: **nunca escribas una rampa fija** (`bg-blue-50`).
Siempre `primary-50`, `primary-100`, `text-primary`. Si hardcodeás una rampa,
ese pedazo de UI deja de seguir al usuario.

### Radios y breakpoints

```css
--radius-card: 0.625rem;
--radius-control: 0.375rem;

--breakpoint-*: initial;
--breakpoint-iph: 402px;
--breakpoint-sm: 480px;
--breakpoint-tab: 600px;
--breakpoint-md: 768px;
--breakpoint-lg: 1080px;
--breakpoint-xl: 1280px;
--breakpoint-xxl: 1440px;
```

`--breakpoint-*: initial` borra la escala default de Tailwind antes de definir la
propia. Sin esa línea te quedan las dos escalas mezcladas y `lg` significa dos
cosas distintas según la clase.

Ojo con que `lg` es 1080 y no 1024: es el punto donde entra el sidebar fijo.

Hay un breakpoint por **altura**, para notebooks de pantalla baja:

```css
@custom-variant mac (@media (min-width: 1280px) and (max-height: 820px));
```

Se usa como `mac:p-10`, `mac:text-4xl`, `mac:line-clamp-2`. Sirve para que una
pantalla que entra justo en un monitor no explote en una laptop de 13 pulgadas.

### Utilidades propias

Solo dos, y las dos se ganan el lugar:

```css
.num-tabular { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }

.label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

### Base

```css
@layer base {
  button, [role="button"], a { -webkit-tap-highlight-color: transparent; }
  ::selection { background-color: var(--ui-color-primary-100); }
}
```

Y un bloque de cursores que arregla algo que Tailwind v4 dejó de hacer: darle
`cursor: pointer` a lo clickeable. Va explícito para botones, roles de menú,
tabs, switches, combobox, links, `summary`, `label` y `select`, más `cursor: text`
para inputs y `not-allowed` para deshabilitados. Copialo entero, es gratis y se
nota.

---

## 5. Convenciones de código

- **Orden del `.vue`: `<template>` primero, después `<script setup>`, después
  `<style scoped>`.** Sin excepción. Se lee la pantalla antes que la lógica.
- **Front en JS.** Nada de `lang="ts"` en `app/**`. El tipado vive en el server.
- **Cero comentarios** en JS y Vue, salvo `TODO`. Lo que necesita explicación va
  a un doc, no al archivo. Si un bloque no se entiende sin comentario, el
  problema es el bloque.
- **Orden interno del script**: constantes en SCREAMING_SNAKE arriba de todo,
  después props y emits, composables, refs, computed, funciones, y al final
  watchers y lifecycle.
- **Idioma**: UI y nombres de dominio en español rioplatense (`abrir`, `guardar`,
  `alternar`, `mover`, `pedir`, `enviar`, `borrador`, `cuentas`), API de framework
  en inglés. Los nombres de variable en español no son folclore: el código y la
  pantalla dicen la misma palabra, así que buscás "Publicados" y encontrás la
  función.
- **Orden de clases de Tailwind**: sizing, layout, position, backgrounds,
  borders, typography, effects, interactivity, overflow, spacing. Los
  breakpoints de menor a mayor. Es una convención de lectura, no la fuerza nadie,
  pero si todos la respetan las clases largas se escanean.
- **Transiciones con propiedad explícita**, nunca `all`. Casi siempre
  `transition-colors duration-150`.

---

## 6. Nuxt UI primero

Antes de escribir un componente propio, buscá el de Nuxt UI. Los que se usan:

`UApp` `UButton` `UCard` `UModal` `UAlert` `UBadge` `UTabs` `UFormField` `UInput`
`UInputNumber` `UTextarea` `USelect` `USelectMenu` `USwitch` `UCheckbox`
`UDropdownMenu` `UNavigationMenu` `USlideover` `UAvatar` `UIcon` `UTooltip`
`UPopover` `UPagination` `ULink` `USkeleton`.

Los componentes propios son **de dominio**, no primitivas. Si estás por escribir
un `BaseButton`, frená.

### `<UApp>` es obligatorio

```vue
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

Sin él, `UTooltip` rompe el render con "TooltipProvider not found", y los toasts
y modales no tienen dónde montarse.

### Los overrides van en `app.config.ts`

```ts
export default defineAppConfig({
  appName: 'Postix',
  ui: {
    colors: { primary: 'blue', neutral: 'arena' },
    button: { defaultVariants: { color: 'neutral', variant: 'outline' } },
    input: { slots: { base: 'focus-visible:outline-none' } },
    textarea: { slots: { base: 'resize-none focus-visible:outline-none' } },
    card: { slots: { root: 'rounded-card' } },
    navigationMenu: {
      compoundVariants: [
        { variant: 'pill', active: true, highlight: false, class: { link: 'before:bg-primary-100 before:rounded-sm text-highlighted', linkLeadingIcon: 'text-primary' } },
        { variant: 'pill', active: false, disabled: false, class: { link: 'text-highlighted hover:text-highlighted before:rounded-sm hover:before:bg-primary-100/60', linkLeadingIcon: 'text-highlighted' } },
      ],
    },
  },
})
```

Tres cosas para copiar:

- **El default del botón es `neutral` + `outline`.** El botón primario sólido es
  la excepción y se pide explícito. Así no terminás con seis botones azules en
  una pantalla.
- **`focus-visible:outline-none` en todos los inputs**: Nuxt UI ya dibuja el
  anillo de foco con `ring`, el outline del browser encima se veía doble.
- **`resize-none` en textarea**: el resize manual rompe cualquier layout de alto
  fijo.

El nombre de la app sale de `appName` y lo leen el auth, el sidebar y el drawer.
No lo escribas a mano en un componente.

---

## 7. Catálogo de componentes propios

Nueve componentes, y cada uno enseña un patrón distinto. Vale la pena leerlos en
este orden.

### StatusBadge, el mapa de estado

```vue
<script setup>
const ESTADOS = {
  draft: { label: 'En borrador', icon: 'i-lucide-pencil-line', fg: 'text-estado-borrador', bg: 'bg-estado-borrador-bg' },
  published: { label: 'Publicado', icon: 'i-lucide-send', fg: 'text-estado-publicado', bg: 'bg-estado-publicado-bg' },
}

const props = defineProps({ status: { type: String, required: true } })

const estado = computed(() => ESTADOS[props.status] ?? { label: props.status, icon: 'i-lucide-circle', fg: 'text-estado-borrador', bg: 'bg-estado-borrador-bg' })
</script>
```

Un objeto con todo lo que define cada estado (texto, ícono, dos clases) y un
fallback que muestra el valor crudo en vez de romper. Es el mismo patrón que
`red()` en utils. Si mañana el backend manda un estado nuevo, la UI lo muestra
feo pero no se cae.

### Markdown, HTML de terceros con disciplina

```vue
<template>
  <div class="md" v-html="html" />
</template>

<script setup>
import { marked } from 'marked'

const props = defineProps({ source: { type: String, default: '' } })

const html = computed(() => {
  const raw = (props.source ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return marked.parse(raw, { breaks: true, gfm: true, async: false })
})
</script>
```

Escapa `<` y `>` **antes** de parsear. Es lo que hace que un `v-html` con
contenido que sube el usuario no sea un agujero. El estilo va en `<style scoped>`
con `:deep()` y usa las variables de Nuxt UI (`var(--ui-border)`,
`var(--ui-primary)`), así sigue al color elegido.

### CategoriasContenido, el CRUD reusable por endpoint

```vue
<script setup>
const props = defineProps({
  endpoint: { type: String, required: true },
  editable: { type: Boolean, default: false },
  compartidas: { type: Array, default: () => [] },
})

const { data: propias, refresh } = await useFetch(() => props.endpoint, { default: () => [] })

async function pedir(url, method, body, msg) {
  abierta.value = false
  try {
    await $fetch(url, { method, body })
    await refresh()
    ok(msg)
  } catch (err) {
    fail(err?.data?.statusMessage || 'No pude guardar')
  }
}
</script>
```

El componente no sabe de qué entidad son las categorías: recibe la URL base y
arma el CRUD con `POST endpoint`, `PATCH endpoint/:slug`, `DELETE endpoint/:slug`.
El mismo componente sirve para las de un perfil y las de una organización.

Cuando tengas dos pantallas con el mismo CRUD contra rutas distintas, este es el
patrón: **el endpoint como prop**, no un `tipo` con ifs adentro.

Ojo con `useFetch(() => props.endpoint, ...)`: la URL como función para que la
consulta se rehaga si la prop cambia.

### PerfilDetalle, un componente con modos

```js
const props = defineProps({
  id: { type: String, required: true },
  modo: { type: String, default: 'completo' },
})
```

```vue
<div :class="modo === 'completo' ? 'grid gap-6 lg:grid-cols-2' : 'contents'">
  <section v-if="modo !== 'voz'">…</section>
  <section v-if="modo !== 'links'">…</section>
</div>
```

El mismo componente se usa entero en su página y partido en dos pedazos dentro de
la grilla de otra pantalla. El truco es `class="contents"`: cuando está en modo
parcial, el wrapper desaparece del layout y las secciones se acomodan en la
grilla del padre.

### ContenidoModal, modal con `defineModel`

```js
const abierto = defineModel('open', { type: Boolean, default: false })
const emit = defineEmits(['guardar'])
```

Se usa como `<ContenidoModal v-model:open="abierto" @guardar="patch" />`.

Dos detalles que importan:

```js
watch(abierto, (valor) => {
  if (valor) Promise.all([refreshMe(), refreshCategorias(), refreshOrg()])
})
```

Los datos auxiliares se refrescan **al abrir**, no al montar: si alguien sumó una
categoría en otra pestaña, el select la tiene.

```js
emit('guardar', Object.fromEntries(
  Object.entries(form).map(([k, v]) => [k, v === undefined || v === '' ? null : v])
))
```

El formulario normaliza vacío a `null` antes de emitir, así el backend distingue
"lo borró" de "no lo mandó".

Los campos del formulario no están escritos uno por uno en el template: hay una
constante `GRUPOS` con la estructura y el template la recorre. Sumar un
responsable es agregar una línea a un array.

### MetricChart, gráfico atado al color del usuario

Es `.client.vue`: chart.js toca el DOM y no tiene nada que hacer en SSR. El
nombre del archivo alcanza, no hace falta `<ClientOnly>`.

```js
function leerPrincipal() {
  const muestra = document.createElement('span')
  muestra.style.color = 'var(--ui-primary)'
  document.body.appendChild(muestra)
  principal.value = getComputedStyle(muestra).color
  muestra.remove()
}

watch(() => appConfig.ui.colors.primary, () => nextTick(leerPrincipal))
```

Chart.js necesita un color concreto, no una variable CSS. Se lee del DOM con un
nodo temporal y se vuelve a leer cuando el usuario cambia el color. El helper de
alfa acepta las dos formas porque las paletas de Tailwind v4 vienen en `oklch`:

```js
const conAlfa = (color, alfa) =>
  color.startsWith('rgb(')
    ? color.replace('rgb(', 'rgba(').replace(')', `, ${alfa})`)
    : color.replace(/\)$/, ` / ${alfa})`)
```

La barra más alta va a alfa 1 y el resto a 0.4: el gráfico responde la pregunta
sin leer los números.

En el tooltip siempre va el **n** (`5 posts`). Un promedio sin la cantidad atrás
miente.

### Los demás

- **MetricsForm**: formulario generado desde un array `[clave, etiqueta]`, con
  `hayAlgo` para deshabilitar el submit si no cargaste ningún campo.
- **FeedPreview**: previsualización de cómo se ve el texto cortado, con la
  función pura viviendo en `utils/validator.js`.
- **PostValidator**: corre reglas puras sobre un objeto y ofrece "arreglar
  automáticamente" solo las que tienen fix. Las reglas y los fixes son un objeto
  en utils, el componente solo los muestra.
- **DemoToggle** y **ContextSwitcher**: cambian el contexto global y llaman a
  `reloadNuxtApp` o `refreshNuxtData` según haga falta rehacer todo o solo los
  datos.

---

## 8. Patrones de datos

Esta es la sección que más se copia.

### La sesión se pide una vez y se comparte por `key`

```js
const { data: me } = await useFetch('/api/auth/me', { key: 'me' })
```

La misma línea está en el layout, en media docena de páginas y en dos
componentes. Con el mismo `key`, Nuxt hace **una** request y todos leen la misma
caché. Para invalidarla desde cualquier lado:

```js
await refreshNuxtData('me')
```

Y para leerla sin volver a pedirla, como hace `useRol`:

```js
const { data: me } = useNuxtData('me')
```

### En SSR, `useAsyncData` con `useRequestFetch()`

```js
const pedir = useRequestFetch()
const { data, refresh } = await useAsyncData(
  'hoy-plan',
  () => Promise.all(meses.map((month) => pedir('/api/calendar', { query: { month } })))
          .then((r) => r.flatMap((c) => c.planned ?? [])),
  { default: () => [], watch: [meses] },
)
```

**`$fetch` pelado en el render del servidor no manda la cookie de sesión** y la
consulta vuelve vacía o con 401. `useRequestFetch()` reenvía los headers de la
request entrante. Usalo siempre que combines varias llamadas dentro de un
`useAsyncData`.

Para una sola URL alcanza `useFetch`, que ya lo hace solo.

### Query reactiva

```js
const { data } = await useFetch('/api/calendar', {
  query: { month: computed(() => `${cursor.value.getFullYear()}-${...}`) },
})
```

Un `computed` dentro de `query` hace que la consulta se rehaga sola cuando
cambia. No hace falta watch ni refresh manual.

### El helper `enviar`

En toda pantalla con varias mutaciones se repite este ayudante:

```js
async function enviar(url, method, body, msg) {
  try {
    const res = await $fetch(url, { method, body })
    await Promise.all([refresh(), refreshMe()])
    if (msg) ok(msg)
    return res
  } catch (err) {
    fail(err?.data?.statusMessage || 'No pude guardarlo')
  }
}
```

Mutar, refrescar, avisar, y un solo lugar donde se maneja el error. Todas las
acciones de la página quedan de una línea:

```js
const crearPerfil = () => enviar('/api/profiles', 'POST', { ...perfil }, 'Perfil creado')
const sacar = (m) => enviar(`/api/org/members/${m.id}`, 'DELETE', undefined, `${m.name} ya no está`)
```

El mensaje de error **siempre** intenta `err?.data?.statusMessage` primero: el
backend manda un texto accionable y la UI lo muestra tal cual. El fallback
genérico es el último recurso.

### Los avisos son toasts, nunca alertas en la página

```js
export function useFlash() {
  const toast = useToast()
  const ok = (text) => toast.add({ title: text, icon: 'i-lucide-check-circle-2', color: 'success' })
  const fail = (text) => toast.add({ title: text, icon: 'i-lucide-alert-circle', color: 'error' })
  return { ok, fail }
}
```

`UAlert` dentro de la página queda solo para estado persistente (un error de
formulario que tiene que seguir ahí, un aviso con datos que el usuario necesita
copiar). El feedback de una acción es toast.

### Composable por recurso

Cuando una entidad tiene varias acciones, se encapsula:

```js
export function usePosts(account) {
  const { ok, fail } = useFlash()
  const busy = ref(null)      // el id que está ocupado, no un boolean
  const error = ref(null)
  const { data: posts, refresh, status } = useFetch('/api/posts', {
    default: () => [],
    query: { account },
    key: () => `posts-${unref(account) ?? 'all'}`,
  })
  const loading = computed(() => status.value === 'pending')

  async function patch(id, body, msg) { /* … */ }
  async function publish(post, { dryRun = false } = {}) { /* … */ }

  return { posts, loading, busy, error, refresh, patch, publish }
}
```

`busy` guarda **el id** de la fila que está trabajando, no un boolean. Así el
spinner va en el botón que tocaste y el resto de la lista sigue usable. Es un
detalle chico que cambia la sensación de la tabla entera.

### Guardas de permiso

En el middleware global lo que aplica a toda la app:

```js
const ABIERTAS = ['/login', '/demo', '/registro']

export default defineNuxtRouteMiddleware(async (to) => {
  if (ABIERTAS.includes(to.path)) return

  const me = await $fetch('/api/auth/me', { headers: useRequestHeaders(['cookie']) })
    .catch(() => ({ authenticated: false }))

  if (!me.authenticated) return navigateTo('/login')
  if (!me.orgs.length && to.path !== '/onboarding') return navigateTo('/onboarding')

  const modulo = MODULOS.find((m) => to.path === m.to || to.path.startsWith(`${m.to}/`))
  if (modulo && !(me.modulos ?? []).includes(modulo.key)) {
    return abortNavigation(createError({ statusCode: 404, statusMessage: 'Esta organización no tiene ese módulo.' }))
  }
})
```

Notá `useRequestHeaders(['cookie'])`: mismo problema de siempre en SSR.

Y en la página, lo puntual, arriba de todo en el setup:

```js
if (!esAdmin.value) await navigateTo('/', { replace: true })
```

Esto es UX, no seguridad. El permiso de verdad lo hace el server. Un `if` en el
front solo evita que alguien vea una pantalla que le va a dar 403.

Para un recurso que no existe, error fatal y listo:

```js
if (error.value) throw createError({ statusCode: 404, statusMessage: 'No encontré ese contenido.', fatal: true })
```

---

## 9. Patrones de interacción

### Filtros con Set

```js
const ocultas = ref(new Set())

function alternar(value) {
  const siguiente = new Set(ocultas.value)
  siguiente.has(value) ? siguiente.delete(value) : siguiente.add(value)
  ocultas.value = siguiente
}
```

Se guarda lo **oculto**, no lo visible: el estado inicial es "se ve todo" con un
Set vacío. Y se reasigna un Set nuevo, porque mutar el de adentro no dispara la
reactividad.

En el markup, el filtro va con `aria-pressed` y se apaga con opacidad:

```vue
<button
  class="size-9 flex items-center justify-center border rounded-full transition-colors duration-150"
  :class="!ocultas.has(r.value) ? 'bg-primary-50 border-primary' : 'bg-default border-default opacity-50 hover:opacity-100'"
  :aria-pressed="!ocultas.has(r.value)"
  @click="alternar(r.value)"
>
```

### Navegación por mes o semana

```js
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const mes = computed(() => `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`)

function mover(n) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + n, 1)
}
```

Un `Date` como cursor y un `computed` que lo formatea. El label se capitaliza con
CSS (`first-letter:uppercase`), no con JS.

**Las fechas del backend son strings `YYYY-MM-DD` y se comparan como strings.**
`fecha < hoy`, `fecha.startsWith(mes)`, `.localeCompare()` para ordenar. Nunca se
convierten a `Date` para comparar. Cuando hay que mostrarlas, se parsean al
mediodía para esquivar el corrimiento de zona horaria:

```js
const fechaCorta = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
```

El `T12:00:00` es la parte importante. Con `new Date('2026-09-23')` te podés
comer un día entero de diferencia.

Y el ISO local se arma a mano, porque `toISOString()` pasa a UTC:

```js
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
```

### Tablas: grilla CSS, no `UTable`

Las tablas de esta app están hechas a mano con `grid`:

```vue
<div class="hidden md:grid grid-cols-[1.5rem_4.5rem_minmax(0,1fr)_8rem_5.5rem] items-center gap-4 border-y border-default text-xs font-semibold px-5 py-2">
  <span /><span>Fecha</span><span>Post</span><span>Perfil</span><span class="text-right">Vistas</span>
</div>

<div
  v-for="p in pagina"
  class="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] md:grid-cols-[1.5rem_4.5rem_minmax(0,1fr)_8rem_5.5rem] items-center gap-x-4 border-b border-default last:border-b-0 px-5 py-2.5"
>
  <UIcon … />
  <span class="hidden md:block num-tabular text-sm">{{ fechaCorta(p.scheduled_for) }}</span>
  <span class="text-sm font-semibold truncate">{{ p.hook }}</span>
  …
</div>
```

Por qué: en mobile la tabla cambia de columnas, no scrollea de costado. Las
celdas que no entran se ocultan con `hidden md:block` y el `grid-cols` chico se
declara en el mismo elemento. Con un componente de tabla eso es pelearse; con
grilla son dos clases.

Reglas de la tabla: `minmax(0,1fr)` en la columna elástica (sin eso `truncate` no
funciona), números a la derecha y con `.num-tabular`, y el encabezado repite
exactamente el mismo `grid-cols`.

### Paginación

```js
const POR_PAGINA = 15
const numeroPagina = ref(1)
const pagina = computed(() => filtrados.value.slice((numeroPagina.value - 1) * POR_PAGINA, numeroPagina.value * POR_PAGINA))

watch([perfil, ocultas, mes], () => (numeroPagina.value = 1))
```

El watch que vuelve a la página 1 al cambiar un filtro no es opcional: sin eso
filtrás y te quedás mirando una página vacía.

Abajo, `UPagination` y el texto de rango, y **siempre el total**: "1 a 15 de 62".
Una tabla que no dice cuántos datos hay atrás esconde información.

### Drag and drop

Se usan las dos técnicas, cada una para lo suyo.

**DnD nativo** para tableros y para mover tarjetas entre celdas, con un tipo MIME
propio que distingue qué se está arrastrando:

```js
function agarrarPlan(event, x) {
  event.dataTransfer.setData('application/x-plan', x.id)
  event.dataTransfer.effectAllowed = 'move'
}

function sobrePlan(event, destino) {
  if (!event.dataTransfer.types.includes('application/x-plan')) return
  event.preventDefault()
  destinoFecha.value = destino
}
```

Ese `if` sobre `types` es el que hace que una celda acepte un tipo de tarjeta y
rechace la otra, sin marcarse como destino válido.

**`useSortable`** cuando hace falta ordenar de verdad:

```js
const controls = useSortable(el, [], {
  group: 'calendario',
  animation: 150,
  sort: false,
  draggable: '[data-id]',
  filter: '[data-id]:not(.cursor-grab)',
  ghostClass: 'sortable-ghost',
  onAdd: (evt) => {
    const id = evt.item?.dataset?.id
    const destino = evt.to?.dataset?.fecha
    evt.from.insertBefore(evt.item, evt.from.children[evt.oldIndex] ?? null)
    if (id && destino) moverPost(id, destino)
  },
  onMove: (evt) => !lleno(evt.to?.dataset?.fecha),
})
```

Dos cosas clave. **El `insertBefore` deshace el movimiento que hizo Sortable en el
DOM** antes de llamar a la API: la fuente de verdad es el estado de Vue después
del refresh, y si dejás el nodo movido a mano te queda duplicado o fuera de lugar
cuando llega la respuesta. Y `onMove` devolviendo false es el que bloquea soltar
en un destino lleno, con la regla del negocio en una función.

Como se instancia una por celda, hay que limpiar:

```js
const sortables = new Map()

function registrar(el, fecha) {
  if (!el) { celdas.delete(fecha); return }
  if (celdas.get(fecha) === el) return
  celdas.set(fecha, el)
  sortables.get(fecha)?.stop?.()
  sortables.set(fecha, useSortable(el, [], { /* … */ }))
}

onBeforeUnmount(() => {
  for (const c of sortables.values()) c.stop?.()
  sortables.clear()
})
```

Se registra con `:ref="(el) => registrar(el, dia.date)"` y se guarda en un Map por
clave, con guarda de "ya es el mismo nodo" para no reinstanciar en cada render.

Las clases del ghost van en el CSS global:

```css
.sortable-ghost { opacity: 0.35; }
.sortable-drag { cursor: grabbing; }
```

### Guardado con debounce

Para inputs numéricos que se tocan varias veces seguidas:

```js
import { useDebounceFn } from '@vueuse/core'

const guardar = useDebounceFn(async () => { await $fetch('/api/…', { method: 'PUT', body }) }, 400)
```

El estado local cambia de inmediato y la request sale una sola vez.

### Modales

```vue
<UModal v-model:open="abierta" title="Nueva categoría">
  <template #body>
    <form class="flex flex-col gap-4" @submit.prevent="guardar">…</form>
  </template>
  <template #footer>
    <div class="w-full flex items-center gap-2">
      <UButton v-if="editando" color="error" variant="ghost" icon="i-lucide-trash-2" @click="borrar">Eliminar</UButton>
      <UButton color="neutral" variant="ghost" class="ml-auto" @click="abierta = false">Cancelar</UButton>
      <UButton color="primary" variant="solid" :disabled="!form.label.trim()" @click="guardar">Guardar</UButton>
    </div>
  </template>
</UModal>
```

**Los botones del footer van con `@click`, no con `type="submit" form="id"`.** El
atributo `form` no llega al `<button>` real que renderiza Nuxt UI y el guardado no
se dispara nunca. Se pierde media hora antes de darse cuenta.

El destructivo va a la izquierda separado del par cancelar/confirmar con
`ml-auto`, para que no se toque de más.

`confirm()` y `prompt()` nativos están prohibidos. Confirmación destructiva: un
`UModal` chico que dice qué se pierde.

### Formularios

- `UFormField` con `label`, siempre. Nada de placeholder como etiqueta.
- El input lleva `class="w-full"`. No lo hace solo.
- `autofocus` en el primer campo de un modal.
- El botón de confirmar deshabilitado mientras falte lo mínimo:
  `:disabled="!form.name.trim()"`.
- `:loading` en el botón mientras dura la request.
- Estado del formulario con `reactive({})` y `Object.assign(form, …)` para
  resetear.

### Subida y descarga de archivos

Input oculto con `sr-only` más zona de drop, las dos llamando a la misma función:

```vue
<input ref="archivo" type="file" accept=".md,text/markdown" class="sr-only" @change="subir($event.target.files?.[0])" />
```

```js
async function subir(file) {
  if (!file) return
  await patchPerfil({ voice_md: await file.text() })
  archivo.value.value = ''
}
```

El `archivo.value.value = ''` al final permite volver a subir el mismo archivo.

Descarga, sin dependencias:

```js
const url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown' }))
const a = document.createElement('a')
a.href = url
a.download = `voz-${slug}.md`
a.click()
URL.revokeObjectURL(url)
```

Para CSV, el BOM adelante o Excel rompe los acentos:

```js
const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
```

---

## 10. Layout y scroll

La regla de oro: **el scroll vive en el `main`, no en el documento**, y las
pantallas de trabajo entran enteras sin scrollear la página.

```vue
<div class="h-dvh bg-default lg:grid lg:grid-cols-[16rem_1fr] lg:overflow-hidden">
  <aside class="h-dvh min-h-0 hidden lg:flex flex-col gap-7 bg-primary-50 border-r border-primary-100 pt-6">…</aside>

  <div class="flex flex-col h-dvh min-w-0 lg:overflow-hidden">
    <header class="flex lg:hidden shrink-0 items-center gap-2 h-14 …">…</header>

    <main class="flex-1 min-h-0 flex flex-col overflow-y-auto [scrollbar-gutter:stable]">
      <div class="w-full max-w-[1440px] flex-1 min-h-0 flex flex-col mx-auto p-4 sm:p-6 lg:p-8">
        <slot />
      </div>
    </main>
  </div>
</div>
```

Puntos que no se negocian:

- **`h-dvh`, nunca `h-screen`.** En mobile `100vh` incluye la barra del navegador
  y te comés el último control de la pantalla.
- **La cadena `flex-1 min-h-0`** desde el `main` hasta la columna que scrollea.
  Si un solo eslabón se saltea el `min-h-0`, el hijo crece y el scroll se va al
  documento. Es el bug de layout más común y el más difícil de ver.
- **`scrollbar-gutter: stable`**: sin eso, filtrar una lista que deja de
  scrollear corre todo el contenido unos píxeles de costado.
- **Nada puede sumar alto arriba del contenedor que scrollea.** Por eso los
  controles globales van en el sidebar y no en un header sobre el contenido.

La página que quiere entrar en pantalla declara:

```vue
<div class="flex flex-col gap-6 lg:flex-1 lg:min-h-0">
```

y cada columna interna scrollea por dentro con `lg:min-h-0 lg:overflow-y-auto`.
El `lg:` es a propósito: en mobile todo scrollea normal, la pantalla completa es
una idea de escritorio.

### Sidebar

Fijo a `16rem` en `lg:`, con `USlideover` para mobile. El drawer se cierra solo al
navegar y el scroll vuelve arriba:

```js
watch(() => route.fullPath, () => {
  drawerOpen.value = false
  if (import.meta.client) nextTick(() => mainEl.value?.scrollTo({ top: 0, behavior: 'instant' }))
})
```

El menú se arma con `UNavigationMenu orientation="vertical"` y los items salen de
un computed que filtra por permisos y módulos, así el mismo array sirve para el
sidebar y el drawer.

Abajo del todo, el usuario en un `UDropdownMenu` con `#content-top` para meter el
selector de color en una grilla de nueve.

### Tabs por ruta

```vue
<UNavigationMenu :items="tabs" variant="link" color="neutral" highlight highlight-color="primary" class="border-b border-default" />
<NuxtPage :transition="{ name: 'tab', mode: 'out-in' }" />
```

Las tabs son rutas de verdad (`/seccion/uno`, `/seccion/dos`) con un `NuxtPage`
anidado. Cada hija tiene que tener **una sola raíz** o la transición rompe. La
transición se define en CSS global:

```css
.tab-enter-active, .tab-leave-active { transition: opacity 180ms ease-out, transform 180ms ease-out; }
.tab-enter-from { opacity: 0; transform: translateY(6px); }
.tab-leave-to { opacity: 0; }
```

El index de la sección es una página vacía con `definePageMeta({ redirect: '/seccion/uno' })`.

---

## 11. Vocabulario visual

Estas cinco formas se repiten en toda la app. Copiarlas es lo que hace que
pantallas escritas en días distintos parezcan la misma app.

**Tarjeta.** `bg-default border border-default rounded-card p-5`, y adentro un
`flex flex-col gap-3`.

**Encabezado de sección.** Va adentro de la tarjeta, en mayúsculas chicas, con el
contador al lado y la acción a la derecha:

```vue
<span class="flex items-center gap-2 text-xs font-semibold text-highlighted tracking-[0.06em] uppercase">
  Personas
  <span class="num-tabular">{{ items.length }}</span>
  <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" class="ml-auto -my-1" />
</span>
```

No hay títulos de página sueltos: el título vive dentro de la tarjeta. El `-my-1`
en el botón evita que el encabezado crezca.

**Fila de lista.** `flex items-center gap-3 border-b border-default last:border-b-0 py-2.5`.
Separador abajo menos en la última, sin borde exterior.

**Chip.** `rounded-full px-3 py-1.5 text-sm border`, `bg-primary-50 border-primary`
cuando está activo. El de "agregar" va punteado:
`border border-dashed border-primary-200 hover:border-primary text-primary`.

**Vacío.** Un párrafo y nada más: `<p class="text-sm text-highlighted py-6">Nada pendiente por ahora.</p>`.
Sin ilustración, sin caja, sin botón gigante.

Tamaños de ícono: `size-3` y `size-3.5` dentro de texto chico, `size-4` en
botones y filas, `size-5` cuando el ícono es el ancla visual de la fila.

---

## 12. Microcopy

- **Escrito para quien usa la app, no para quien la programó.** "Mis posts", no
  "Cola". "Personas lo vieron", no "impresiones". Nada de URN, payload, endpoint,
  scope, slug ni id en la pantalla.
- **Cero microcopy explicativo.** Sin subtítulos bajo los títulos, sin hints
  debajo del campo, sin "Paso 1 de 2". Si el campo necesita explicación, el label
  está mal.
- **Los errores dicen qué hacer.** "Ese día es de otro mes. Cambiá de mes para
  planificarlo ahí." es útil; "Error 422" no. El mensaje sale del backend y la UI
  lo muestra tal cual.
- **Prohibida la raya larga** en cualquier texto de la interfaz. Coma, punto o
  paréntesis.
- **Botones en imperativo y en primera persona del plural rioplatense**:
  "Guardar", "Sumar red", "Pedir cambios", "Subido".

---

## 13. Accesibilidad, lo que se hace siempre

No hay auditoría formal, pero estas cosas están en todo el código y cuestan cero:

- `aria-label` en **todo botón que es solo ícono**. Sin excepción.
- `aria-pressed` en los filtros que alternan.
- `aria-current` en la fila seleccionada de una lista.
- El input de archivo va `sr-only`, no `hidden`, así el teclado lo alcanza.
- Los elementos clickeables son `<button type="button">` de verdad, no un `div`
  con `@click`. Cuando hace falta un clickeable adentro de otro, se usa
  `role="button"` con `@click.stop`.
- `title` en textos truncados, para ver el completo al pasar el mouse.
- Movimiento: todo respeta `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto !important; }
  .auth-enter-from, .auth-leave-to, .tab-enter-from { transform: none; }
}
```

Y la animación con física del login se saltea directo:

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
```

---

## 14. Método de trabajo

Tres prácticas del repo que valen más que cualquier componente.

### Un modo demo que corre sin backend

Un middleware de servidor intercepta **todas** las rutas `/api/*` cuando hay una
cookie puesta y las responde contra una base en memoria. Ninguna request llega al
backend real: lo que no tiene equivalente devuelve 404.

Para qué sirve: el front se construye entero, con datos realistas y todos los
estados, antes de que exista una sola ruta de verdad. Y después ese archivo **es
la especificación del backend**: cada función de ahí es la regla de negocio que
la ruta real tiene que respetar.

Dos detalles que se pagaron: la cookie tiene que tener una forma de salir
(`/demo?salir=1`) o el usuario queda encerrado en la demo sin entender por qué su
login real falla, y el modo demo entero se saca antes de producción.

### Una página de variantes

`/variantes` es una página con `definePageMeta({ layout: false })` y un `UTabs`
que muestra cuatro maquetas de navegación distintas, con datos falsos, lado a
lado. Se discute mirando, no describiendo.

Cuesta una tarde y evita rehacer el layout tres veces. Cuando la decisión está
tomada, la página se borra o se deja como sandbox.

### Un gesto de marca, uno solo

El login tiene tarjetas que se arrastran con inercia, fricción y rebote contra
los bordes, escrito a mano con `pointerdown/move/up` y `requestAnimationFrame`.
Son 60 líneas en el layout de auth.

El resto de la app no tiene ni una animación decorativa. Ese contraste es
deliberado: un lugar donde la app se muestra, y adentro densidad y nada que
distraiga.

---

## 15. Errores que ya se pagaron

Cada uno costó tiempo. Están acá para que no los repitas.

| Síntoma | Causa | Qué hacer |
|---|---|---|
| La consulta vuelve vacía solo en SSR | `$fetch` no manda la cookie | `useFetch` o `useRequestFetch()` |
| El botón del modal no guarda | `form="id"` no llega al `<button>` de Nuxt UI | `@click` |
| `UTooltip` rompe el render | Falta `<UApp>` | Envolver la app |
| Todo el contenido se corre unos píxeles al filtrar | Aparece o desaparece la scrollbar | `[scrollbar-gutter:stable]` en el `main` |
| La página scrollea aunque pediste alto completo | Falta un `min-h-0` en la cadena flex | Revisar eslabón por eslabón |
| El último control queda tapado en mobile | `h-screen` | `h-dvh` |
| La fecha se corre un día | `new Date('2026-09-23')` parsea en UTC | `new Date('2026-09-23T12:00:00')` |
| El ISO de hoy sale con otro día | `toISOString()` pasa a UTC | Armarlo a mano con getFullYear y compañía |
| El filtro no reacciona | Mutaste el Set en lugar de reasignarlo | `ocultas.value = new Set(...)` |
| Filtrás y ves una lista vacía | La paginación quedó en una página que ya no existe | Watch que resetea a 1 |
| `truncate` no trunca | La columna de grilla no tiene `minmax(0,1fr)` | Agregarlo |
| El color del gráfico no cambia con el tema | Chart.js no entiende variables CSS | Leer el color computado del DOM |
| Dos escalas de breakpoints mezcladas | Falta `--breakpoint-*: initial` | Agregarlo antes de definir los propios |
| La tarjeta arrastrada queda duplicada | Sortable movió el nodo y Vue lo vuelve a pintar | `insertBefore` para deshacer antes de llamar a la API |
| El parpadeo del color al cargar | El color se aplica después del render | Plugin que lee la cookie |
| No podés volver a subir el mismo archivo | El input conserva el value | `input.value = ''` después de leerlo |
| Los acentos del CSV rotos en Excel | Falta el BOM | `﻿` adelante |

---

## 16. Checklist para el repo nuevo

```
[ ] pnpm init, Nuxt 4, Nuxt UI 4, Tailwind 4 como plugin de Vite
[ ] nuxt.config: pathPrefix false, ui.fonts false, ui.colorMode false, icon svg
[ ] main.css: neutra propia, colores de estado, breakpoints con initial,
    :root con los text tokens, .num-tabular, .label, cursores, reduced-motion
[ ] app.config: appName, colors, default del botón neutral+outline,
    focus-visible:outline-none en inputs
[ ] app.vue con UApp
[ ] useFlash, useAccent, plugins/accent.js
[ ] layout default con h-dvh, grid de sidebar, main con flex-1 min-h-0
    y scrollbar-gutter
[ ] middleware global de auth con useRequestHeaders
[ ] utils/ con las constantes de dominio y su buscador con fallback
[ ] un componente de estado tipo StatusBadge
[ ] modo demo si el backend no está listo
[ ] página de variantes antes de decidir la navegación
```

Lo que **no** hagas al empezar: primitivas propias (botón, input, card), dark
mode, un sistema de tipografía con seis tamaños, ni una librería de estado. Nada
de eso hizo falta acá.
