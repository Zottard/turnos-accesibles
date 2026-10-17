// Modo acompañante (v0.5): "Estás ayudando a Rosa".
//
// Quien acompaña a otra persona elige a quién ayudar en /inicio. Desde ahí, "Mis turnos", el detalle
// de cada turno y el asistente operan con los turnos de esa persona (p_para en useReservas).
// Se guarda en una cookie de sesión (`ta_ayudando`, sin vencimiento: se borra al cerrar el
// navegador y al salir de la cuenta). Cookie y no sessionStorage para que el servidor pinte la
// misma página que el navegador (si no, "Mis turnos" mostraría primero los propios).
// La cookie solo guarda id, nombre y alcance: lo que se puede hacer lo decide siempre la base.

export type PersonaAcompanada = {
  id: string
  nombre: string
  apellido: string
  alcance: AccionAlcance[]
}

function normalizarAyuda(valor: unknown): PersonaAcompanada | null {
  if (typeof valor !== 'object' || valor === null) return null
  const datos = valor as Record<string, unknown>
  if (typeof datos.id !== 'string' || typeof datos.nombre !== 'string') return null
  return {
    id: datos.id,
    nombre: datos.nombre,
    apellido: typeof datos.apellido === 'string' ? datos.apellido : '',
    alcance: normalizarAlcance(datos.alcance),
  }
}

export function useAyuda() {
  const supabase = useSupabaseClient()
  const cookie = useCookie<unknown>('ta_ayudando', { sameSite: 'lax', path: '/' })
  const ayudando = useState<PersonaAcompanada | null>('ayudando', () => normalizarAyuda(cookie.value))

  function guardar(persona: PersonaAcompanada | null) {
    ayudando.value = persona
    cookie.value = persona
  }

  /** Las personas que acompaño (con su alcance). Solo nombre y apellido: nada más de su perfil. */
  async function cargarPersonas(): Promise<{ datos: PersonaAcompanada[] | null; error: string | null }> {
    const { data, error } = await supabase.rpc('personas_que_acompano')
    if (error) {
      return { datos: null, error: 'No pudimos traer las personas que acompañás. Probá de nuevo en un rato.' }
    }
    return {
      datos: data.map((fila) => ({
        id: fila.solicitante_id,
        nombre: fila.nombre,
        apellido: fila.apellido,
        alcance: normalizarAlcance(fila.alcance),
      })),
      error: null,
    }
  }

  function empezar(persona: PersonaAcompanada) {
    guardar(persona)
  }

  function dejar() {
    guardar(null)
  }

  /** La base dijo que ya no comparte sus turnos: salimos del modo ayuda. */
  function olvidarSiNoComparte() {
    guardar(null)
  }

  /**
   * Revisa contra la base que siga compartiendo sus turnos y actualiza el alcance (lo pudo
   * cambiar). Devuelve false si dejó de compartirlos (y sale del modo ayuda).
   */
  async function verificar(): Promise<boolean> {
    if (!ayudando.value) return true
    const { datos } = await cargarPersonas()
    if (!datos) return true // sin conexión: no sacamos a nadie del modo ayuda por las dudas
    const actual = datos.find((persona) => persona.id === ayudando.value?.id)
    guardar(actual ?? null)
    return actual !== undefined
  }

  /** ¿Puedo hacer esto? Sin modo ayuda, todo (son mis turnos). */
  function puedoHacer(accion: AccionAlcance): boolean {
    return ayudando.value === null || puede(ayudando.value.alcance, accion)
  }

  return { ayudando: readonly(ayudando), cargarPersonas, empezar, dejar, olvidarSiNoComparte, verificar, puedoHacer }
}
