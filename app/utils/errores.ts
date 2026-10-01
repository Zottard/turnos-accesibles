export function mensajeDeError(error: { code?: string, message?: string } | null | undefined) {
  if (!error) return 'Algo no funcionó. Probá de nuevo en un momento.'
  if (error.code === 'P0001' && error.message) return error.message
  if (error.code === '23503') return 'No se puede borrar porque tiene agendas o turnos cargados.'
  if (error.code === '23505') return 'Ya hay uno cargado con esos datos.'
  if (error.code === '42501') return 'No tenés permiso para hacer esto.'
  return 'No pudimos guardar los cambios. Revisá tu conexión a internet y probá de nuevo.'
}
