export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo({ path: '/ingresar', query: { volver: to.fullPath } })

  const { configuradas, cargar } = usePreferenciasCuenta()
  await cargar()
  if (configuradas.value === false && to.path !== '/bienvenida') {
    return navigateTo({ path: '/bienvenida', query: { volver: to.fullPath } })
  }
})
