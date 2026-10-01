import type { Aviso } from '~/composables/useSesion'

export type MotivoReserva = 'sin_sesion' | 'sin_permiso' | 'no_existe' | 'vencido' | 'tomado' | 'superpuesto' | 'error'

export interface ResultadoReserva {
  ok: boolean
  reservaId?: string
  numero?: number
  motivo?: MotivoReserva
  otro?: { fecha_hora: string, centro: string, especialidad: string }
}

export function avisoReserva(r: ResultadoReserva): Aviso {
  switch (r.motivo) {
    case 'tomado':
      return { titulo: 'Ese turno lo tomó otra persona.', ayuda: 'No perdiste nada de lo que elegiste. Te mostramos otros turnos parecidos.' }
    case 'superpuesto':
      return {
        titulo: 'Ya tenés otro turno cerca de ese horario.',
        ayuda: r.otro
          ? `Tenés ${r.otro.especialidad} el ${fechaHoraEnPalabras(r.otro.fecha_hora)}, en ${r.otro.centro}. ¿Querés reservar igual?`
          : '¿Querés reservar igual?',
      }
    case 'vencido':
      return { titulo: 'Ese turno ya pasó.', ayuda: 'Elegí otro turno.' }
    case 'no_existe':
      return { titulo: 'No encontramos ese turno.', ayuda: 'Puede que lo hayan sacado de la agenda. Elegí otro.' }
    case 'sin_sesion':
      return { titulo: 'Para reservar tenés que ingresar a tu cuenta.', ayuda: 'No vas a perder lo que elegiste.' }
    case 'sin_permiso':
      return { titulo: 'No podés reservar turnos para esta persona.', ayuda: 'Pedile que te dé permiso para reservar desde "Mis acompañantes".' }
    default:
      return { titulo: 'No pudimos reservar el turno.', ayuda: 'Revisá tu conexión a internet y probá de nuevo.' }
  }
}

export function useReserva() {
  const supabase = useSupabaseClient()

  async function reservar(turnoId: string, opciones: { confirmarSuperposicion?: boolean, solicitante?: string } = {}): Promise<ResultadoReserva> {
    const { data, error } = await supabase.rpc('reservar_turno', {
      p_turno: turnoId,
      p_confirmar_superposicion: opciones.confirmarSuperposicion ?? false,
      p_solicitante: opciones.solicitante,
    })
    if (error || !data) return { ok: false, motivo: 'error' }
    const r = data as { ok: boolean, reserva_id?: string, numero?: number, motivo?: MotivoReserva, otro?: ResultadoReserva['otro'] }
    return { ok: r.ok, reservaId: r.reserva_id, numero: r.numero, motivo: r.motivo, otro: r.otro }
  }

  async function obtenerReserva(id: string) {
    const { data, error } = await supabase
      .from('reservas')
      .select(`id, numero_correlativo, estado, creada_en, solicitante_id, reservada_por_id, reserva_origen_id, motivo_cancelacion,
        turno:turnos_disponibles(id, fecha_hora, estado, centro:centros(*), especialidad:especialidades(*), profesional:profesionales(nombre, apellido))`)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { reservar, obtenerReserva }
}

export type ReservaDetalle = NonNullable<Awaited<ReturnType<ReturnType<typeof useReserva>['obtenerReserva']>>>
