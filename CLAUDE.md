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
