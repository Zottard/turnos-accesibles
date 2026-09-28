export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) return navigateTo({ path: '/ingresar', query: { volver: to.fullPath } })
})
