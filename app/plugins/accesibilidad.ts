import type { AccessibilityPrefs } from '~/stores/accesibilidad'

export default defineNuxtPlugin({
  name: 'accesibilidad',
  dependsOn: ['pinia'],
  setup() {
    const store = useAccesibilidadStore()
    const cookie = useCookie<Partial<AccessibilityPrefs> | null>(PREFS_COOKIE, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      path: '/',
    })

    // En el cliente el estado ya llega del servidor: volver a leer la cookie lo pisaría
    if (import.meta.server) store.load(cookie.value ?? {})
    else cookie.value = { ...store.prefs }

    watch(() => store.prefs, (prefs) => { cookie.value = prefs })

    const { htmlAttrs } = useAccesibilidad()
    useHead({
      htmlAttrs: {
        'data-theme': () => htmlAttrs.value['data-theme'],
        'data-text-scale': () => htmlAttrs.value['data-text-scale'],
        'data-reduce-motion': () => htmlAttrs.value['data-reduce-motion'],
      },
    })
  },
})
