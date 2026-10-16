// POST /api/acompanantes/invitacion — manda por correo una invitación recién hecha (RF-07). Opcional.
// Recibe { token }. Responde { enviado: true | false }: false si el correo no está configurado o no
// salió; la app igual muestra el enlace para copiar o mandar por WhatsApp.
// Lee la invitación con la sesión de la persona (RLS): solo se puede mandar una invitación propia
// y pendiente. No usa la clave secreta.

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { esTokenValido, enlaceInvitacion } from '../../../shared/utils/acompanantes'
import { armarCorreoInvitacion, configuracionCorreo, enviarCorreo } from '../../utils/correo'
import { dentroDelLimite, type Contador } from '../../utils/limite'

const PEDIDOS_POR_MINUTO = 5
const contadores = new Map<string, Contador>()

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'desconocida'
  if (!dentroDelLimite(contadores, ip, PEDIDOS_POR_MINUTO)) {
    throw createError({ statusCode: 429, statusMessage: 'Hiciste muchos pedidos seguidos. Esperá un minuto.' })
  }

  const cuerpo = await readBody<{ token?: unknown }>(event).catch(() => null)
  if (!esTokenValido(cuerpo?.token)) {
    throw createError({ statusCode: 400, statusMessage: 'Falta la invitación.' })
  }
  const token = cuerpo.token

  const correo = configuracionCorreo(useRuntimeConfig(event))
  if (!correo) {
    return { enviado: false }
  }

  const usuario = await serverSupabaseUser(event)
  if (!usuario?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Para mandar la invitación, ingresá con tu cuenta.' })
  }

  const supabase = await serverSupabaseClient(event)
  const { data: fila } = await supabase
    .from('acompanamientos')
    .select('solicitante_id, nombre_invitado, correo_invitado, alcance, token, vence_en, estado')
    .eq('token', token)
    .maybeSingle()
  if (!fila || fila.solicitante_id !== usuario.sub || fila.estado !== 'pendiente') {
    return { enviado: false }
  }

  const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', usuario.sub).maybeSingle()
  const mensaje = armarCorreoInvitacion({
    nombreInvitado: fila.nombre_invitado,
    nombreQuienInvita: perfil?.nombre ?? '',
    alcance: fila.alcance,
    enlace: enlaceInvitacion(getRequestURL(event).origin, fila.token),
    venceEn: fila.vence_en,
  })
  const resultado = await enviarCorreo(correo, fila.correo_invitado, mensaje)
  return { enviado: resultado.ok }
})
