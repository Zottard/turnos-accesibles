// /api/avisos/enviar — manda por correo los avisos pendientes (RF-06). Opcional.
//
// La llama el cron de Vercel una vez por día (vercel.json). Vercel la llama con GET y el
// encabezado "Authorization: Bearer <CRON_SECRET>" (por eso CRON_SECRET y NUXT_CRON_SECRET llevan
// el mismo valor); también acepta POST (para correrla a mano).
// - Sin las claves (NUXT_CRON_SECRET, NUXT_SUPABASE_SECRET_KEY, NUXT_RESEND_API_KEY y
//   NUXT_CORREO_REMITENTE) responde 503 y no cambia nada. Los avisos siguen en la app: el
//   recordatorio en la app no depende de este envío.
// - Lee los avisos que ya tienen que salir y tienen el correo pendiente (avisos_por_correo, solo
//   con la clave secreta) y los manda con Resend.
// - Si sale: 'enviado'. Si el proveedor rechaza la dirección: 'error' (sin reintentos) y un aviso en
//   la app pidiendo que revise su correo. Otros problemas: se reintenta en la próxima corrida, hasta
//   3 intentos; después, 'error'. En todos los casos el aviso sigue en la app (el canal alternativo).

import { serverSupabaseServiceRole } from '#supabase/server'
import { leerDatosAviso, esTipoAviso } from '../../../shared/utils/avisos'
import { armarCorreoAviso, configuracionCorreo, enviarCorreo } from '../../utils/correo'

const INTENTOS_MAXIMOS = 3
const POR_CORRIDA = 50

// Compara la clave recorriéndola entera: no da pistas por el tiempo que tarda.
function claveCorrecta(recibida: string, esperada: string): boolean {
  if (recibida.length !== esperada.length) return false
  let diferencia = 0
  for (let i = 0; i < esperada.length; i++) {
    diferencia |= recibida.charCodeAt(i) ^ esperada.charCodeAt(i)
  }
  return diferencia === 0
}

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Usá GET o POST.' })
  }

  const config = useRuntimeConfig(event)
  const correo = configuracionCorreo(config)
  // En Vercel, CRON_SECRET (la que manda el cron) tiene que tener el mismo valor que NUXT_CRON_SECRET.
  const secreto = config.cronSecret
  if (!secreto || !config.supabase?.secretKey || !correo) {
    throw createError({
      statusCode: 503,
      statusMessage:
        'El envío por correo no está configurado (faltan NUXT_CRON_SECRET, NUXT_SUPABASE_SECRET_KEY, ' +
        'NUXT_RESEND_API_KEY o NUXT_CORREO_REMITENTE). No se cambió nada: los avisos siguen en la app.',
    })
  }

  const autorizacion = getHeader(event, 'authorization') ?? ''
  if (!claveCorrecta(autorizacion, `Bearer ${secreto}`)) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado.' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { data: pendientes, error } = await supabase.rpc('avisos_por_correo', { p_limite: POR_CORRIDA })
  if (error) {
    throw createError({ statusCode: 502, statusMessage: 'No pudimos leer los avisos pendientes.' })
  }

  // De quién es cada turno (para las copias de los acompañantes: "Rosa tiene un turno").
  const ids = pendientes.map((aviso: { id: string }) => aviso.id)
  const { data: filas } = ids.length
    ? await supabase.from('notificaciones').select('id, solicitante_id').in('id', ids)
    : { data: [] as { id: string; solicitante_id: string | null }[] }
  const solicitanteDe = new Map((filas ?? []).map((fila) => [fila.id, fila.solicitante_id]))

  const sitio = getRequestURL(event).origin
  const ahora = new Date()
  const resumen = { revisados: pendientes.length, enviados: 0, rechazados: 0, reintentar: 0, conError: 0 }

  for (const aviso of pendientes) {
    const datos = leerDatosAviso(aviso.datos)
    const intentos = aviso.intentos + 1

    // Un recordatorio de un turno que ya pasó (por ejemplo, el cron no corrió) no se manda.
    if (!esTipoAviso(aviso.tipo) || (aviso.tipo === 'recordatorio' && datos.inicio && new Date(datos.inicio) <= ahora)) {
      await supabase
        .from('notificaciones')
        .update({ correo_estado: 'error', correo_error: 'No se mandó: el turno ya pasó.' })
        .eq('id', aviso.id)
      resumen.conError++
      continue
    }

    const mensaje = armarCorreoAviso(
      { tipo: aviso.tipo, datos, usuarioId: aviso.usuario_id, solicitanteId: solicitanteDe.get(aviso.id) ?? null },
      sitio,
      ahora,
    )
    const resultado = await enviarCorreo(correo, aviso.correo, mensaje)

    if (resultado.ok) {
      await supabase
        .from('notificaciones')
        .update({ correo_estado: 'enviado', correo_error: null, intentos })
        .eq('id', aviso.id)
      resumen.enviados++
      continue
    }

    if (resultado.rechazado) {
      await supabase
        .from('notificaciones')
        .update({ correo_estado: 'error', correo_error: `La dirección fue rechazada. ${resultado.error}`, intentos })
        .eq('id', aviso.id)
      // Le pedimos en la app que revise su correo (una sola vez mientras no lo lea).
      const { count } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', aviso.usuario_id)
        .eq('tipo', 'correo')
        .is('leida_en', null)
      if (!count) {
        await supabase
          .from('notificaciones')
          .insert({ usuario_id: aviso.usuario_id, tipo: 'correo', datos: { correo: aviso.correo } })
      }
      resumen.rechazados++
      continue
    }

    const ultimo = intentos >= INTENTOS_MAXIMOS
    await supabase
      .from('notificaciones')
      .update({ correo_estado: ultimo ? 'error' : 'pendiente', correo_error: resultado.error, intentos })
      .eq('id', aviso.id)
    if (ultimo) resumen.conError++
    else resumen.reintentar++
  }

  return resumen
})
