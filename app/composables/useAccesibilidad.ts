export const PREFS_COOKIE = 'ta_prefs'

export function useAccesibilidad() {
  const store = useAccesibilidadStore()
  const { prefs } = storeToRefs(store)

  const htmlAttrs = computed(() => ({
    'data-theme': prefs.value.contrast === 'alto' ? 'alto-contraste' : 'claro',
    'data-text-scale': prefs.value.textScale,
    'data-reduce-motion': prefs.value.reduceMotion === 'siempre' ? 'true' : 'false',
  }))

  return { prefs, htmlAttrs, set: store.set, reset: store.reset }
}
