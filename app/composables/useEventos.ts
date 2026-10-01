export type TipoEvento = 'busqueda' | 'asistente_inicio' | 'reserva_asistente'

// Métricas anónimas (RF 9): si falla, no se entera nadie.
export function useEventos() {
  const supabase = useSupabaseClient()

  function registrar(tipo: TipoEvento, payload: Record<string, string | number> = {}) {
    supabase.from('eventos_uso').insert({ tipo_evento: tipo, payload }).then(() => undefined, () => undefined)
  }

  return { registrar }
}
