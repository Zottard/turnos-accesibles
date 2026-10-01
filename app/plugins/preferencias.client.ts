export default defineNuxtPlugin({
  name: 'preferencias',
  dependsOn: ['pinia', 'accesibilidad'],
  setup() {
    const store = useAccesibilidadStore()
    const user = useSupabaseUser()
    const { configuradas, cargar, guardar } = usePreferenciasCuenta()
    const guardarLuego = useDebounceFn(guardar, 600)

    watch(() => store.prefs, () => {
      if (user.value && configuradas.value) guardarLuego()
    })

    watch(() => user.value?.sub, () => cargar(), { immediate: true })
  },
})
