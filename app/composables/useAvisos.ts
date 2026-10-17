// Avisos en la app (v0.5, RF-06): los sin leer (encabezado y banda), la bandeja y los estados.
//
// - La base crea los avisos (triggers de 0501_avisos_acompanantes.sql). La app solo los lee y marca
//   "entregado" (la app lo mostró) y "leído" (la persona lo abrió o lo marcó).
// - plugins/avisos.client.ts llama a revisar() al cambiar de página y cada minuto.
// - "Cerrar" la banda no lo marca como leído: solo la esconde en esta pestaña (sessionStorage).

const CLAVE_CERRADOS = 'ta_avisos_cerrados'
const COLUMNAS = 'id, tipo, datos, usuario_id, solicitante_id, reserva_id, enviar_desde, entregada_en, leida_en'

type FilaAviso = {
  id: string
  tipo: string
  datos: unknown
  usuario_id: string
  solicitante_id: string | null
  reserva_id: string | null
  enviar_desde: string
  entregada_en: string | null
  leida_en: string | null
}

function desdeFila(fila: FilaAviso): Notificacion | null {
  if (!esTipoAviso(fila.tipo)) return null
  return {
    id: fila.id,
    tipo: fila.tipo,
    datos: leerDatosAviso(fila.datos),
    usuarioId: fila.usuario_id,
    solicitanteId: fila.solicitante_id,
    reservaId: fila.reserva_id,
    enviarDesde: fila.enviar_desde,
    entregadaEn: fila.entregada_en,
    leidaEn: fila.leida_en,
  }
}

function leerCerrados(): string[] {
  try {
    const guardados: unknown = JSON.parse(sessionStorage.getItem(CLAVE_CERRADOS) ?? '[]')
    return Array.isArray(guardados) ? guardados.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function useAvisos() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  const sinLeer = useState<Notificacion[]>('avisos_sin_leer', () => [])
  const cerrados = useState<string[]>('avisos_cerrados', () => (import.meta.client ? leerCerrados() : []))

  /** Marca como entregados (la app los mostró) los que todavía no lo estaban. */
  async function marcarEntregados(avisos: Notificacion[]) {
    const ids = avisosSinEntregar(avisos).map((aviso) => aviso.id)
    if (ids.length === 0) return
    const ahora = new Date().toISOString()
    await supabase.from('notificaciones').update({ entregada_en: ahora }).in('id', ids).is('entregada_en', null)
    for (const aviso of avisos) {
      if (ids.includes(aviso.id)) aviso.entregadaEn = ahora
    }
  }

  /**
   * Trae los avisos sin leer (consulta liviana) y marca entregados los nuevos.
   * Devuelve los que la app no había mostrado nunca: con esos suena el aviso.
   */
  async function revisar(): Promise<Notificacion[]> {
    if (!usuario.value) {
      sinLeer.value = []
      return []
    }
    const { data, error } = await supabase
      .from('notificaciones')
      .select(COLUMNAS)
      .is('leida_en', null)
      .order('enviar_desde', { ascending: false })
      .limit(50)
    if (error || !data) return [] // sin conexión: dejamos lo que había
    const lista = data.map(desdeFila).filter((aviso): aviso is Notificacion => aviso !== null)
    const nuevos = avisosSinEntregar(lista).map((aviso) => ({ ...aviso }))
    await marcarEntregados(lista)
    sinLeer.value = lista
    return nuevos
  }

  /** La bandeja: los últimos 100 avisos, sin leer primero. */
  async function cargarBandeja(): Promise<{ datos: Notificacion[] | null; error: string | null }> {
    const { data, error } = await supabase
      .from('notificaciones')
      .select(COLUMNAS)
      .order('enviar_desde', { ascending: false })
      .limit(100)
    if (error || !data) {
      return { datos: null, error: 'No pudimos traer tus avisos. Revisá tu conexión a internet y probá de nuevo.' }
    }
    const lista = data.map(desdeFila).filter((aviso): aviso is Notificacion => aviso !== null)
    return { datos: ordenarBandeja(lista), error: null }
  }

  /** Marca leídos (y entregados, si hacía falta). Devuelve si se pudo. */
  async function marcarLeidos(avisos: Notificacion[]): Promise<boolean> {
    const pendientes = avisos.filter((aviso) => aviso.leidaEn === null)
    if (pendientes.length === 0) return true
    await marcarEntregados(pendientes)
    const ahora = new Date().toISOString()
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida_en: ahora })
      .in('id', pendientes.map((aviso) => aviso.id))
    if (error) return false
    for (const aviso of pendientes) aviso.leidaEn = ahora
    const leidos = pendientes.map((aviso) => aviso.id)
    sinLeer.value = sinLeer.value.filter((aviso) => !leidos.includes(aviso.id))
    return true
  }

  /** Esconde la banda (hasta que llegue otro aviso). No los marca como leídos. */
  function cerrarBanda(ids: string[]) {
    cerrados.value = [...new Set([...cerrados.value, ...ids])]
    try {
      sessionStorage.setItem(CLAVE_CERRADOS, JSON.stringify(cerrados.value))
    } catch {
      // Sin sessionStorage la banda se cierra igual, hasta recargar.
    }
  }

  /** Al salir de la cuenta. */
  function olvidar() {
    sinLeer.value = []
    cerrados.value = []
    try {
      sessionStorage.removeItem(CLAVE_CERRADOS)
    } catch {
      // Nada que borrar.
    }
  }

  return {
    sinLeer: computed(() => sinLeer.value),
    cerrados: computed(() => cerrados.value),
    revisar,
    cargarBandeja,
    marcarLeidos,
    marcarEntregados,
    cerrarBanda,
    olvidar,
  }
}
