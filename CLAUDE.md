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
- Validación con vee-validate + zod 4 vía Standard Schema, sin `@vee-validate/zod` (pide zod 3).
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

## Notas

- Sin `NUXT_PUBLIC_SUPABASE_URL` el SSR se cae. Copiar `.env.example` a `.env` (tiene placeholders).
- `@vite-pwa/nuxt` se excluye cuando corre Vitest (rompe el entorno de tests).
