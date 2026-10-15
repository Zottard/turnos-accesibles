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
