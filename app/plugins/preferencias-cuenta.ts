// Al abrir la app con la sesión iniciada, trae las preferencias de la cuenta (una sola vez).
// En el navegador, además, guarda en la cuenta los cambios del menú de accesibilidad.
export default defineNuxtPlugin(async () => {
  const cuenta = usePreferenciasCuenta()

  if (useSupabaseUser().value) {
    await cuenta.cargar()
  }

  if (import.meta.client) {
    cuenta.guardarAlCambiar()
  }
})
