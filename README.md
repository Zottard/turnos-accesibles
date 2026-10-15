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

En la v0.1 no hace falta ningún archivo `.env`.

## Versiones

Seis versiones, una feature completa por versión. El detalle está en
[docs/plan-versiones.md](docs/plan-versiones.md).

| Versión | Feature | Estado |
|---|---|---|
| v0.1 | Base, marca y accesibilidad | Esta rama |
| v0.2 | Cuentas y preferencias | Pendiente |
| v0.3 | Búsqueda de turnos | Pendiente |
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

## Documentación

- [Arquitectura y reglas de código](docs/arquitectura.md)
- [Marca](docs/marca.md)
- [Plan de versiones](docs/plan-versiones.md)
