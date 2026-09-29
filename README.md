# Turnos Accesibles

Trabajo Final de Metodología de Sistemas I, UTN FRGP, Grupo 28.
PWA que funciona como capa de accesibilidad sobre los sistemas públicos de turnos de salud.

## Arrancar

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Usuarios de prueba

Todos con la contraseña `demo1234`. Se crean con `supabase/seed.sql`, ya confirmados.

| Correo | Rol |
|---|---|
| solicitante@demo.ar | Solicitante (Rosa Gómez) |
| acompanante@demo.ar | Acompañante (Lucía Gómez) |
| admin@demo.ar | Administración |

Con `NUXT_PUBLIC_DEMO=true` aparece arriba una barra para entrar como cada uno con un click,
y `/demo` muestra todas las pantallas del trabajo con su estado.

## Verificar

```bash
pnpm check:contrast
pnpm typecheck
pnpm test:unit
pnpm test:e2e
```

Contexto completo del proyecto: [docs/CONTEXTO.md](docs/CONTEXTO.md).
