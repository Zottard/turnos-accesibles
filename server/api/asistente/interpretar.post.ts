import { z } from 'zod'

const CUERPO = z.object({ texto: z.string().trim().min(1).max(500) })
const POR_MINUTO = 20
const pedidos = new Map<string, { cuenta: number, desde: number }>()

function excedido(ip: string) {
  const ahora = Date.now()
  const registro = pedidos.get(ip)
  if (!registro || ahora - registro.desde > 60_000) {
    pedidos.set(ip, { cuenta: 1, desde: ahora })
    return false
  }
  registro.cuenta++
  return registro.cuenta > POR_MINUTO
}

export default defineEventHandler(async (event) => {
  if (excedido(getRequestIP(event, { xForwardedFor: true }) ?? 'sin-ip')) {
    throw createError({ statusCode: 429, statusMessage: 'Hubo muchos pedidos seguidos. Esperá un minuto.' })
  }

  const { texto } = await readValidatedBody(event, CUERPO.parse)
  const config = useRuntimeConfig(event)

  const respuesta = await fetch(`${config.public.supabase.url}/functions/v1/interpretar`, {
    method: 'POST',
    body: JSON.stringify({ texto }),
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.supabaseAnonJwt}` },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null)

  if (!respuesta?.ok) throw createError({ statusCode: 503, statusMessage: 'El asistente no está disponible ahora.' })
  return await respuesta.json()
})
