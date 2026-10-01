import { StorageSerializers } from '@vueuse/core'
import type { Aviso } from '~/composables/useSesion'

export type Accion = 'ver' | 'reservar' | 'cancelar'

export const ALCANCES: { value: Accion, paraVos: string, paraOtro: string }[] = [
  { value: 'ver', paraVos: 'Ver tus turnos', paraOtro: 'Ver sus turnos' },
  { value: 'reservar', paraVos: 'Sacar turnos por vos', paraOtro: 'Sacar turnos por esa persona' },
  { value: 'cancelar', paraVos: 'Cancelar o cambiar tus turnos', paraOtro: 'Cancelar o cambiar sus turnos' },
]

export interface Asistiendo {
  id: string
  nombre: string
  alcance: Accion[]
}

export interface Invitacion {
  nombre: string
  email_invitado: string
  alcance: Accion[]
  estado: 'pendiente' | 'activo' | 'revocado' | 'vencido'
}

const MOTIVOS: Record<string, Aviso> = {
  sin_sesion: { titulo: 'Tenés que ingresar a tu cuenta.', ayuda: 'Ingresá y volvé a abrir el enlace.' },
  a_vos_mismo: { titulo: 'No te podés invitar a vos.', ayuda: 'Escribí el correo de la persona que te va a ayudar.' },
  ya_existe: { titulo: 'Ya invitaste a esa persona.', ayuda: 'Si querés cambiar lo que puede hacer, quitala y volvé a invitarla.' },
  no_existe: { titulo: 'No encontramos esta invitación.', ayuda: 'Revisá que el enlace esté completo o pedí uno nuevo.' },
  usada: { titulo: 'Esta invitación ya no se puede usar.', ayuda: 'Puede que ya la hayan aceptado o que la hayan quitado. Pedí una nueva.' },
  vencida: { titulo: 'Esta invitación venció.', ayuda: 'Las invitaciones duran 7 días. Pedí una nueva.' },
}

export function avisoAcompanamiento(motivo: string | undefined, email?: string): Aviso {
  if (motivo === 'otro_correo') {
    return {
      titulo: 'Esta invitación es para otro correo.',
      ayuda: `Ingresá con la cuenta de ${email ?? 'la persona invitada'}. Si no tiene cuenta, creala con ese correo.`,
    }
  }
  return MOTIVOS[motivo ?? ''] ?? { titulo: 'Algo no funcionó.', ayuda: 'Revisá tu conexión a internet y probá de nuevo.' }
}

export function useAcompanamiento() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const asistiendo = useSessionStorage<Asistiendo | null>('ta_asistiendo', null, {
    initOnMounted: true,
    serializer: StorageSerializers.object,
  })

  async function nombres(ids: string[]) {
    if (!ids.length) return new Map<string, string>()
    const { data } = await supabase.from('profiles').select('id, nombre, apellido').in('id', ids)
    return new Map((data ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]))
  }

  async function misAcompanantes() {
    const { data, error } = await supabase
      .from('acompanamientos')
      .select('id, acompanante_id, email_invitado, alcance, estado, token_invitacion, vence_en')
      .eq('solicitante_id', user.value?.sub ?? '')
      .in('estado', ['pendiente', 'activo'])
      .order('invitado_en')
    if (error) throw error
    const conNombre = await nombres((data ?? []).flatMap((a) => (a.acompanante_id ? [a.acompanante_id] : [])))
    return (data ?? []).map((a) => ({
      ...a,
      alcance: a.alcance as Accion[],
      nombre: a.acompanante_id ? conNombre.get(a.acompanante_id) : undefined,
      vencida: a.estado === 'pendiente' && new Date(a.vence_en) < new Date(),
    }))
  }

  async function aQuienesAyudo(): Promise<Asistiendo[]> {
    const { data, error } = await supabase
      .from('acompanamientos')
      .select('solicitante_id, alcance')
      .eq('acompanante_id', user.value?.sub ?? '')
      .eq('estado', 'activo')
    if (error) throw error
    const conNombre = await nombres((data ?? []).map((a) => a.solicitante_id))
    return (data ?? []).map((a) => ({ id: a.solicitante_id, nombre: conNombre.get(a.solicitante_id) ?? '', alcance: a.alcance as Accion[] }))
  }

  async function invitar(email: string, alcance: Accion[]) {
    const { data, error } = await supabase.rpc('invitar_acompanante', { p_email: email, p_alcance: alcance })
    if (error || !data) return { ok: false as const, aviso: avisoAcompanamiento(undefined) }
    const r = data as { ok: boolean, token?: string, motivo?: string }
    return r.ok ? { ok: true as const, token: r.token! } : { ok: false as const, aviso: avisoAcompanamiento(r.motivo) }
  }

  async function verInvitacion(token: string) {
    const { data } = await supabase.rpc('ver_invitacion', { p_token: token })
    return (data as Invitacion | null) ?? null
  }

  async function aceptar(token: string) {
    const { data, error } = await supabase.rpc('aceptar_invitacion', { p_token: token, p_user_agent: navigator.userAgent })
    if (error || !data) return { ok: false as const, aviso: avisoAcompanamiento(undefined) }
    const r = data as { ok: boolean, motivo?: string, email?: string, solicitante_id?: string }
    return r.ok ? { ok: true as const, solicitante: r.solicitante_id! } : { ok: false as const, aviso: avisoAcompanamiento(r.motivo, r.email) }
  }

  async function revocar(id: string) {
    const { data, error } = await supabase.rpc('revocar_acompanamiento', { p_id: id })
    return !error && (data as { ok: boolean } | null)?.ok === true
  }

  const enlaceInvitacion = (token: string) => `${window.location.origin}/invitacion/${token}`

  return { asistiendo, misAcompanantes, aQuienesAyudo, invitar, verInvitacion, aceptar, revocar, enlaceInvitacion }
}
