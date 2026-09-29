export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    ...(process.env.VITEST ? [] : ['@vite-pwa/nuxt']),
    '@nuxt/test-utils/module',
  ],

  css: ['~/assets/css/main.css'],

  typescript: { strict: true },

  runtimeConfig: {
    public: { demo: false },
  },

  components: [{ path: '~/components', pathPrefix: false }],

  ui: { fonts: false, colorMode: false },

  icon: { mode: 'svg', clientBundle: { scan: true } },

  app: {
    head: {
      htmlAttrs: { lang: 'es-AR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Sacá un turno médico en el sistema público, paso a paso y en lenguaje claro.' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap' },
      ],
    },
  },

  supabase: {
    redirect: false,
    types: '~/types/database.ts',
    redirectOptions: { login: '/ingresar', callback: '/confirmar-correo' },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Turnos Accesibles',
      short_name: 'Turnos',
      description: 'Sacá un turno médico en el sistema público, paso a paso y en lenguaje claro.',
      lang: 'es-AR',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#000000',
    },
    devOptions: { enabled: false },
  },

  $production: {
    hooks: {
      'pages:extend'(pages) {
        if (process.env.DEMO_UI || process.env.NUXT_PUBLIC_DEMO === 'true') return
        for (let i = pages.length - 1; i >= 0; i--) {
          if (pages[i]?.path.startsWith('/demo-ui')) pages.splice(i, 1)
        }
      },
    },
  },
})
