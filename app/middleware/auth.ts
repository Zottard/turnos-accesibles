// Páginas que piden haber ingresado: `definePageMeta({ middleware: 'auth' })`.
// - Sin sesión: va a /ingresar y, al terminar, vuelve a esta página (?volver=).
// - Con sesión pero sin preferencias guardadas (primer ingreso): va a /bienvenida.
export default defineNuxtRouteMiddleware(async (destino) => {
  const usuario = useSupabaseUser()
  if (!usuario.value) {
    return navigateTo({ path: '/ingresar', query: { volver: destino.fullPath } })
  }

  const cuenta = usePreferenciasCuenta()
  await cuenta.cargar()
  // Si la consulta falló (estado 'error') no sabemos si tiene preferencias: no la mandamos a ningún lado.
  if (cuenta.estado.value === 'sin-fila' && destino.path !== '/bienvenida') {
    return navigateTo('/bienvenida')
  }
})
