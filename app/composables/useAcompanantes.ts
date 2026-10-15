// Acompañantes (v0.5, RF-07): invitar, ver la constancia, quitar el permiso y responder una invitación.
// Todo lo que cambia algo pasa por funciones de la base (RPC): la app nunca escribe `acompanamientos`.
// Los mensajes salen de mensajeAcompanamiento() (shared/utils/acompanantes.ts).

// Una fila de `acompanamientos`, vista por quien invitó. Nunca se borran: son la constancia.
export type Acompanamiento = {
  id: string
  nombreInvitado: string
  correoInvitado: string
  alcance: AccionAlcance[]
  token: string
  venceEn: string
  estado: EstadoVinculo
  consentidoEn: string
  aceptadoEn: string | null
  revocadoEn: string | null
  creadoEn: string
}

export type Invitacion = {
  nombre: string // quien invita
  nombreInvitado: string
  alcance: AccionAlcance[]
  estado: EstadoVinculo
  venceEn: string
}

export type Fallo = { ok: false; motivo: string; mensaje: string }
export type Respuesta<T = object> = ({ ok: true } & T) | Fallo

const ERROR_CONEXION = 'No pudimos traer los datos. Revisá tu conexión a internet y probá de nuevo.'

type FilaAcompanamiento = {
  id: string
  nombre_invitado: string
  correo_invitado: string
  alcance: string[]
  token: string
  vence_en: string
  estado: string
  consentido_en: string
  aceptado_en: string | null
  revocado_en: string | null
  creado_en: string
}

function desdeFila(fila: FilaAcompanamiento): Acompanamiento {
  return {
    id: fila.id,
    nombreInvitado: fila.nombre_invitado,
    correoInvitado: fila.correo_invitado,
    alcance: normalizarAlcance(fila.alcance),
    token: fila.token,
    venceEn: fila.vence_en,
    estado: estadoVinculo({ estado: fila.estado, venceEn: fila.vence_en }),
    consentidoEn: fila.consentido_en,
    aceptadoEn: fila.aceptado_en,
    revocadoEn: fila.revocado_en,
    creadoEn: fila.creado_en,
  }
}

// Lo que devuelven las RPC (jsonb).
type RespuestaBase = Record<string, unknown> & { ok?: boolean; motivo?: string }

function leer(data: unknown, error: unknown, nombre?: string): { ok: true; datos: RespuestaBase } | Fallo {
  const respuesta = (data ?? {}) as RespuestaBase
  if (error || typeof respuesta.ok !== 'boolean') {
    return { ok: false, motivo: 'conexion', mensaje: mensajeAcompanamiento('conexion') }
  }
  if (!respuesta.ok) {
    const motivo = respuesta.motivo ?? 'conexion'
    return { ok: false, motivo, mensaje: mensajeAcompanamiento(motivo, nombre) }
  }
  return { ok: true, datos: respuesta }
}

export function useAcompanantes() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()

  /** Las personas que invité (vigentes y anteriores), de la más nueva a la más vieja. */
  async function cargarMios(): Promise<{ datos: Acompanamiento[] | null; error: string | null }> {
    const id = usuario.value?.sub
    if (!id) return { datos: null, error: ERROR_CONEXION }
    const { data, error } = await supabase
      .from('acompanamientos')
      .select('*')
      .eq('solicitante_id', id)
      .order('creado_en', { ascending: false })
    if (error) return { datos: null, error: ERROR_CONEXION }
    return { datos: data.map(desdeFila), error: null }
  }

  /** Una sola (la constancia). datos = null y error = null: no existe o no es tuya. */
  async function cargarUno(idAcompanamiento: string): Promise<{ datos: Acompanamiento | null; error: string | null }> {
    const id = usuario.value?.sub
    if (!id || !esTokenValido(idAcompanamiento)) return { datos: null, error: null }
    const { data, error } = await supabase
      .from('acompanamientos')
      .select('*')
      .eq('id', idAcompanamiento)
      .eq('solicitante_id', id)
      .maybeSingle()
    if (error) return { datos: null, error: ERROR_CONEXION }
    return { datos: data ? desdeFila(data) : null, error: null }
  }

  /** Invita. consiento = la casilla "Autorizo a ..." (la base no acepta sin ella). */
  async function invitar(datos: {
    nombre: string
    correo: string
    alcance: AccionAlcance[]
    consiento: boolean
  }): Promise<Respuesta<{ id: string; token: string; venceEn: string }>> {
    const { data, error } = await supabase.rpc('invitar_acompanante', {
      p_nombre: datos.nombre.trim(),
      p_correo: datos.correo.trim().toLowerCase(),
      p_alcance: datos.alcance,
      p_consiento: datos.consiento,
    })
    const respuesta = leer(data, error)
    if (!respuesta.ok) return respuesta
    const { id, token, vence_en: venceEn } = respuesta.datos
    return { ok: true, id: String(id), token: String(token), venceEn: String(venceEn) }
  }

  /** Le saca el permiso (o cancela una invitación pendiente). Es inmediato. */
  async function revocar(idAcompanamiento: string): Promise<Respuesta> {
    const { data, error } = await supabase.rpc('revocar_acompanamiento', { p_id: idAcompanamiento })
    const respuesta = leer(data, error)
    return respuesta.ok ? { ok: true } : respuesta
  }

  /** Lo que muestra /invitacion/[token]. Funciona sin cuenta. */
  async function verInvitacion(token: string): Promise<{ datos: Invitacion | null; error: string | null }> {
    if (!esTokenValido(token)) return { datos: null, error: null }
    const { data, error } = await supabase.rpc('ver_invitacion', { p_token: token })
    const respuesta = (data ?? {}) as RespuestaBase
    if (error || typeof respuesta.ok !== 'boolean') return { datos: null, error: ERROR_CONEXION }
    if (!respuesta.ok) return { datos: null, error: null }
    return {
      datos: {
        nombre: String(respuesta.nombre ?? ''),
        nombreInvitado: String(respuesta.nombre_invitado ?? ''),
        alcance: normalizarAlcance(respuesta.alcance),
        estado: estadoVinculo({ estado: String(respuesta.estado), venceEn: String(respuesta.vence_en) }),
        venceEn: String(respuesta.vence_en),
      },
      error: null,
    }
  }

  async function aceptar(token: string, nombre: string): Promise<Respuesta<{ solicitanteId: string }>> {
    const { data, error } = await supabase.rpc('aceptar_invitacion', { p_token: token })
    const respuesta = leer(data, error, nombre)
    if (!respuesta.ok) return respuesta
    return { ok: true, solicitanteId: String(respuesta.datos.solicitante_id) }
  }

  async function rechazar(token: string, nombre: string): Promise<Respuesta> {
    const { data, error } = await supabase.rpc('rechazar_invitacion', { p_token: token })
    const respuesta = leer(data, error, nombre)
    return respuesta.ok ? { ok: true } : respuesta
  }

  /**
   * Pide al servidor que mande la invitación por correo (si el correo está configurado).
   * Devuelve true si salió. Si no, no pasa nada: el enlace se puede copiar o mandar por WhatsApp.
   */
  async function mandarPorCorreo(token: string): Promise<boolean> {
    try {
      const respuesta = await $fetch<{ enviado: boolean }>('/api/acompanantes/invitacion', {
        method: 'POST',
        body: { token },
      })
      return respuesta.enviado
    } catch {
      return false
    }
  }

  return { cargarMios, cargarUno, invitar, revocar, verInvitacion, aceptar, rechazar, mandarPorCorreo }
}
