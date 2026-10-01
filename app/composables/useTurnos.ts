import type { Database, Tables } from '~/types/database'

export type Especialidad = Tables<'especialidades'>
export type Localidad = Tables<'localidades'>
export type ResultadoTurno = Database['public']['Functions']['buscar_turnos']['Returns'][number]
export type Franja = 'manana' | 'tarde'
export type Orden = 'fecha' | 'cercania'

export interface FiltrosBusqueda {
  especialidad: number
  centro?: string
  desde?: string
  franja?: Franja
  lat?: number
  lng?: number
  orden: Orden
}

export const POR_PAGINA = 5

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function useTurnos() {
  const supabase = useSupabaseClient()

  const { data: especialidades } = useAsyncData('especialidades', async () => {
    const { data } = await supabase.from('especialidades').select('*').order('nombre_comun')
    return data ?? []
  }, { default: () => [] as Especialidad[] })

  const { data: localidades } = useAsyncData('localidades', async () => {
    const { data } = await supabase.from('localidades').select('*').order('nombre')
    return data ?? []
  }, { default: () => [] as Localidad[] })

  const localidadPorNombre = (nombre: string | null | undefined) =>
    nombre ? localidades.value.find((l) => normalizar(l.nombre) === normalizar(nombre)) : undefined

  async function buscar(filtros: FiltrosBusqueda, offset = 0) {
    const { data, error } = await supabase.rpc('buscar_turnos', {
      p_especialidad: filtros.especialidad,
      p_centro: filtros.centro,
      p_desde: filtros.desde,
      p_franja: filtros.franja,
      p_lat: filtros.lat,
      p_lng: filtros.lng,
      p_orden: filtros.orden,
      p_limite: POR_PAGINA,
      p_offset: offset,
    })
    if (error) throw error
    return { turnos: data ?? [], total: data?.[0]?.total ?? 0 }
  }

  async function obtenerTurno(id: string) {
    const { data, error } = await supabase
      .from('turnos_disponibles')
      .select('id, fecha_hora, estado, centro:centros(*), especialidad:especialidades(*), profesional:profesionales(nombre, apellido)')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return null

    const { data: oferta } = await supabase
      .from('centro_especialidad')
      .select('requisitos')
      .eq('centro_id', data.centro?.id ?? '')
      .eq('especialidad_id', data.especialidad?.id ?? 0)
      .maybeSingle()

    return { ...data, requisitos: oferta?.requisitos ?? null }
  }

  async function centrosConEspecialidad(especialidad: number) {
    const { data } = await supabase
      .from('centro_especialidad')
      .select('centro:centros(id, nombre, localidad)')
      .eq('especialidad_id', especialidad)
    return (data ?? []).flatMap((f) => (f.centro ? [f.centro] : [])).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }

  return { especialidades, localidades, localidadPorNombre, buscar, obtenerTurno, centrosConEspecialidad }
}

export type TurnoDetalle = NonNullable<Awaited<ReturnType<ReturnType<typeof useTurnos>['obtenerTurno']>>>
