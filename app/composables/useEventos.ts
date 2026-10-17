// Eventos de uso para las métricas (v0.6, RF-09): búsquedas, asistente, accesibilidad y modo
// acompañante. Son anónimos: solo el tipo y, si hace falta, especialidad_id, centro_id, localidad
// o valor. Nunca ids de personas ni texto que escribió la persona (la base además lo controla).
// registrar() no espera ni avisa nada: si falla, la persona sigue como si nada.

export type TipoEvento =
  | 'busqueda'
  | 'asistente_inicio'
  | 'asistente_ia'
  | 'preferencia_voz'
  | 'preferencia_contraste'
  | 'preferencia_tamano'
  | 'acompanante_ayudar'
  | 'acompanante_invitar'

export type DatosEvento = {
  especialidad_id?: number
  centro_id?: number
  localidad?: string
  valor?: string
}

export function useEventos() {
  const supabase = useSupabaseClient()

  function registrar(tipo: TipoEvento, datos: DatosEvento = {}) {
    if (import.meta.server) return
    // Sin los vacíos: la base solo acepta estas claves.
    const limpios = Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor !== undefined && valor !== ''))
    supabase
      .from('eventos_uso')
      .insert({ tipo, datos: limpios })
      .then(
        () => {},
        () => {},
      )
  }

  return { registrar }
}
