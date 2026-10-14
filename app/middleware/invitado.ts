// Páginas para quien todavía no ingresó (/ingresar, /registrarme).
// Si ya tiene la sesión iniciada, la llevamos a su inicio.
export default defineNuxtRouteMiddleware(() => {
  if (useSupabaseUser().value) {
    return navigateTo('/inicio')
  }
})
