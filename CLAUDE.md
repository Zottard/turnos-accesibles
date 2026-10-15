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
