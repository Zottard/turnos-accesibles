// POST /api/interpretar — entiende un pedido escrito como se habla (RF-04).
// Recibe { texto } y devuelve un PedidoInterpretado (shared/utils/reglasAsistente.ts):
// especialidad, cerca, franja, desde y una frase con lo que entendimos.
//
// 1. Siempre calcula primero el resultado con reglas simples.
// 2. Si hay clave de Anthropic, le pregunta a Claude (máximo 4 segundos). Si la respuesta es
//    válida, usa esa; si no, se queda con las reglas. Sin clave, solo reglas.
// Nunca guardamos ni registramos el texto de la persona: puede tener datos de salud.

import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Especialidad } from '../../shared/utils/especialidades'
import { armarPedido, interpretarConReglas, validarRespuestaIA } from '../../shared/utils/reglasAsistente'
import { preguntarAClaude } from '../utils/claude'
import { dentroDelLimite, type Contador } from '../utils/limite'

const LARGO_MAXIMO = 300
const PEDIDOS_POR_MINUTO = 10

// Contadores del límite por IP (en memoria).
const contadores = new Map<string, Contador>()

// Las especialidades cambian poco: las guardamos 5 minutos en memoria.
const CINCO_MINUTOS_MS = 5 * 60 * 1000
let catalogo: { especialidades: Especialidad[]; hasta: number } | null = null

async function cargarEspecialidades(event: H3Event): Promise<Especialidad[]> {
  if (catalogo && catalogo.hasta > Date.now()) {
    return catalogo.especialidades
  }
  // Con la clave pública alcanza: cualquiera puede leer las especialidades activas (RLS).
  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('especialidades')
    .select('id, nombre, nombre_simple, descripcion, palabras_clave')
    .order('nombre_simple')
  if (error || !data) {
    // Si falla, seguimos con lo que teníamos (aunque esté vencido) o con nada.
    return catalogo?.especialidades ?? []
  }
  const especialidades = data.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    nombreSimple: fila.nombre_simple,
    descripcion: fila.descripcion,
    palabrasClave: fila.palabras_clave,
  }))
  catalogo = { especialidades, hasta: Date.now() + CINCO_MINUTOS_MS }
  return especialidades
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'desconocida'
  if (!dentroDelLimite(contadores, ip, PEDIDOS_POR_MINUTO)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Hiciste muchos pedidos seguidos. Esperá un minuto, o seguí paso a paso.',
    })
  }

  const cuerpo = await readBody<{ texto?: unknown }>(event).catch(() => null)
  const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : ''
  if (texto === '') {
    throw createError({ statusCode: 400, statusMessage: 'Contanos qué necesitás.' })
  }
  if (texto.length > LARGO_MAXIMO) {
    throw createError({ statusCode: 400, statusMessage: `Escribilo más corto: hasta ${LARGO_MAXIMO} letras.` })
  }

  const especialidades = await cargarEspecialidades(event)
  const ahora = new Date()
  const porReglas = interpretarConReglas(texto, especialidades, ahora)

  // La clave sale de NUXT_ANTHROPIC_API_KEY (ver nuxt.config.ts). Solo existe en el servidor.
  const { anthropicApiKey, anthropicBaseUrl } = useRuntimeConfig(event)
  if (!anthropicApiKey || especialidades.length === 0) {
    return armarPedido(porReglas, 'reglas', especialidades, ahora)
  }

  const { respuesta, motivo } = await preguntarAClaude(texto, especialidades, anthropicApiKey, anthropicBaseUrl)
  const porIA = validarRespuestaIA(respuesta, especialidades, ahora)
  if (!porIA) {
    console.warn(`interpretar: usamos las reglas porque la IA ${motivo || 'respondió algo que no sirve'}.`)
    return armarPedido(porReglas, 'reglas', especialidades, ahora)
  }
  return armarPedido(porIA, 'ia', especialidades, ahora)
})
