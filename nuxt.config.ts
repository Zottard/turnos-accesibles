// Configuración de Nuxt para Turnos Accesibles.
export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: { enabled: false },

  modules: ['@nuxtjs/supabase', '@vite-pwa/nuxt'],

  // Cuentas con Supabase. La URL y la clave pública salen de SUPABASE_URL y SUPABASE_KEY (.env).
  supabase: {
    // Las redirecciones las hacemos nosotros con middleware/auth.ts y middleware/invitado.ts.
    redirect: false,
    // Tipos de las tablas, generados desde la base (ver el comentario del archivo).
    types: '~/types/database.types.ts',
  },

  // Solo del servidor (nunca llegan al navegador). Se completan al arrancar con variables de
  // entorno: NUXT_ANTHROPIC_API_KEY (opcional: sin clave, el asistente usa reglas) y
  // NUXT_ANTHROPIC_BASE_URL (solo para probar con un servidor falso).
  // v0.5, correo (opcional: sin estas claves los avisos quedan solo en la app):
  // NUXT_CRON_SECRET (protege /api/avisos/enviar), NUXT_SUPABASE_SECRET_KEY (clave secreta de
  // Supabase, para leer los avisos pendientes de todas las personas), NUXT_RESEND_API_KEY,
  // NUXT_CORREO_REMITENTE ("Turnos Accesibles <avisos@tu-dominio>") y NUXT_RESEND_BASE_URL (solo
  // para probar con un servidor falso).
  runtimeConfig: {
    anthropicApiKey: '',
    anthropicBaseUrl: 'https://api.anthropic.com',
    cronSecret: '',
    resendApiKey: '',
    resendBaseUrl: 'https://api.resend.com',
    correoRemitente: '',
    supabase: { secretKey: '' },
  },

  // v0.6 — App instalable (PWA). El service worker:
  // - guarda de antemano solo los archivos de la app (JS, CSS, íconos) y la página sin conexión;
  // - NUNCA guarda las páginas (HTML): pueden tener datos personales y tienen que estar al día.
  //   Cada página se pide siempre a internet; si no hay conexión, se muestra /offline/index.html.
  // Los íconos PNG se generan con `node scripts/iconos.mjs` desde public/icono.svg.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Turnos Accesibles',
      short_name: 'Turnos',
      description: 'Sacá turnos de salud pública paso a paso, con texto grande, alto contraste y lectura en voz alta.',
      lang: 'es-AR',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#5B2BD9',
      background_color: '#FFF9F0',
      icons: [
        { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/icono.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    workbox: {
      // Sin "página de reemplazo" para las navegaciones: no queremos servir HTML guardado.
      navigateFallback: null,
      globPatterns: ['**/*.{js,css,svg,png,woff2}', 'offline/index.html'],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Páginas: siempre de internet (nada se guarda). Sin conexión, la página sin conexión.
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkOnly',
          options: { precacheFallback: { fallbackURL: '/offline/index.html' } },
        },
      ],
    },
    client: {
      // Guardamos el aviso del navegador para mostrar nuestro botón "Instalar la app".
      installPrompt: 'ta_ocultar_instalar',
    },
  },

  // En Linux (Vercel) rolldown reescribe los imports relativos a shared/ con un "../" de más y
  // Nitro no los encuentra. Dejándolos absolutos funciona igual que en Windows.
  vite: {
    $server: { build: { rolldownOptions: { makeAbsoluteExternalsRelative: false } } },
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'es-AR' },
      titleTemplate: '%s · Turnos Accesibles',
      meta: [
        {
          name: 'description',
          content:
            'Turnos Accesibles te ayuda a sacar turnos de salud pública paso a paso, con texto grande, alto contraste y lectura en voz alta.',
        },
        { name: 'theme-color', content: '#5B2BD9' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icono.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Lexend:wght@600;700;800&display=swap',
        },
      ],
    },
  },
})
