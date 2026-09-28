export default defineNuxtRouteMiddleware(async (to) => {
  const { cargarPerfil } = useSesion()
  const perfil = await cargarPerfil()
  const roles = to.meta.roles ?? ['admin']
  if (!perfil || !roles.includes(perfil.rol)) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'No podés ver esta página.' }))
  }
})
