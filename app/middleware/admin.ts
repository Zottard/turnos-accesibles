// Páginas del panel (/admin): `definePageMeta({ middleware: 'admin' })`.
// - Sin sesión: va a /ingresar y, al terminar, vuelve a esta página (?volver=).
// - Con sesión pero sin rol admin: va a /admin/sin-permiso, que lo explica y deja registrado el
//   intento (RF-09). La base igual rechaza todo lo del panel a quien no es admin.
// No manda a /bienvenida: el panel no depende de las preferencias de la cuenta.
export default defineNuxtRouteMiddleware(async (destino) => {
  if (!useSupabaseUser().value) {
    return navigateTo({ path: '/ingresar', query: { volver: destino.fullPath } })
  }
  const admin = await useAdmin().esAdmin()
  if (admin === null) {
    return abortNavigation(
      createError({ statusCode: 503, statusMessage: 'No pudimos revisar tu cuenta. Probá de nuevo en un rato.' }),
    )
  }
  if (!admin) {
    return navigateTo({ path: '/admin/sin-permiso', query: { ruta: destino.path } })
  }
})
