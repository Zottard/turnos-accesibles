// Configuración de Nuxt para Turnos Accesibles.
export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: { enabled: false },

  modules: ['@nuxtjs/supabase'],

  // Cuentas con Supabase. La URL y la clave pública salen de SUPABASE_URL y SUPABASE_KEY (.env).
  supabase: {
    // Las redirecciones las hacemos nosotros con middleware/auth.ts y middleware/invitado.ts.
    redirect: false,
    // Tipos de las tablas, generados desde la base (ver el comentario del archivo).
    types: '~/types/database.types.ts',
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
