// Correos (v0.5): copia de los avisos (comprobante, cancelación, cambio, recordatorio) y la
// invitación a un acompañante. Se mandan con Resend usando `fetch` directo (sin librería nueva).
// Las claves solo existen en el servidor. Si no están, no se manda nada: los avisos siguen en la app.
// armarCorreoAviso, armarCorreoInvitacion, escaparHtml y esCorreoRechazado son puras: las prueba
// tests/correo.test.ts.

import { alcanceEnPalabras } from '../../shared/utils/acompanantes'
import { textoAviso, type AvisoParaTexto } from '../../shared/utils/avisos'
import { momentoEnPalabras, turnoEnPalabras } from '../../shared/utils/fechas'
import { enlaceComoLlegar, listaRequisitos } from '../../app/utils/turnos'

export type Correo = { asunto: string; html: string; texto: string }

export type ResultadoEnvio = { ok: true } | { ok: false; rechazado: boolean; error: string }

// Colores de marca (docs/marca.md). En el correo van escritos: no hay CSS de la app.
const VIOLETA = '#5B2BD9'
const TINTA = '#1E1633'
const TINTA_SUAVE = '#4A4160'
const CREMA = '#FFF9F0'
const SOL = '#FFC233'

/** Los nombres y direcciones los escriben personas: nunca van al HTML sin escapar. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type Contenido = {
  titulo: string
  parrafos: string[]
  detalles?: { etiqueta: string; valor: string | string[] }[]
  enlaces: { texto: string; url: string }[]
}

// Una sola columna, texto grande y botones grandes: se lee bien en el celular.
function plantillaHtml(contenido: Contenido): string {
  const p = (texto: string) =>
    `<p style="margin:0 0 16px;font-size:20px;line-height:1.6;color:${TINTA};">${escaparHtml(texto)}</p>`
  const detalles = (contenido.detalles ?? [])
    .map(({ etiqueta, valor }) => {
      const contenidoValor = Array.isArray(valor)
        ? `<ul style="margin:4px 0 0;padding-left:24px;">${valor.map((item) => `<li style="margin-bottom:4px;">${escaparHtml(item)}</li>`).join('')}</ul>`
        : `<div>${escaparHtml(valor)}</div>`
      return (
        `<div style="margin:0 0 12px;font-size:20px;line-height:1.5;color:${TINTA};">` +
        `<div style="font-weight:bold;color:${TINTA_SUAVE};">${escaparHtml(etiqueta)}</div>${contenidoValor}</div>`
      )
    })
    .join('')
  const enlaces = contenido.enlaces
    .map(
      ({ texto, url }) =>
        `<p style="margin:0 0 12px;"><a href="${escaparHtml(url)}" style="display:inline-block;padding:14px 24px;` +
        `background:${VIOLETA};color:#ffffff;border-radius:999px;font-size:20px;font-weight:bold;text-decoration:none;">` +
        `${escaparHtml(texto)}</a></p>`,
    )
    .join('')
  return (
    '<!doctype html><html lang="es-AR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
    `<body style="margin:0;padding:0;background:${CREMA};font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="max-width:600px;margin:0 auto;padding:24px 16px;">` +
    `<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:${VIOLETA};">Turnos Accesibles</p>` +
    `<div style="background:#ffffff;border-top:8px solid ${VIOLETA};border-radius:14px;padding:24px;">` +
    `<h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:${TINTA};">${escaparHtml(contenido.titulo)}</h1>` +
    contenido.parrafos.map(p).join('') +
    detalles +
    enlaces +
    '</div>' +
    `<p style="margin:16px 0 0;padding-top:12px;border-top:4px solid ${SOL};font-size:16px;line-height:1.5;color:${TINTA_SUAVE};">` +
    'Te escribimos desde Turnos Accesibles (Karma Tech), un prototipo académico que no reemplaza a los sistemas oficiales de turnos. ' +
    'Los avisos también están en la app, en "Avisos".</p>' +
    '</div></body></html>'
  )
}

// La versión en texto (para lectores de correo sin HTML).
function plantillaTexto(contenido: Contenido): string {
  const lineas = [contenido.titulo, '', ...contenido.parrafos, '']
  for (const { etiqueta, valor } of contenido.detalles ?? []) {
    lineas.push(`${etiqueta}:`)
    lineas.push(...(Array.isArray(valor) ? valor.map((item) => `- ${item}`) : [valor]), '')
  }
  for (const { texto, url } of contenido.enlaces) lineas.push(`${texto}: ${url}`)
  lineas.push('', 'Turnos Accesibles (Karma Tech). Prototipo académico: no reemplaza a los sistemas oficiales de turnos.')
  return lineas.join('\n')
}

/** El correo de un aviso: el mismo título y mensaje que en la app, más los datos del turno. */
export function armarCorreoAviso(aviso: AvisoParaTexto, sitio: string, ahora = new Date()): Correo {
  const { titulo, mensaje } = textoAviso(aviso, ahora)
  const { datos } = aviso
  const detalles: Contenido['detalles'] = []
  const enlaces: Contenido['enlaces'] = []
  if (datos.inicio) detalles.push({ etiqueta: 'Cuándo', valor: turnoEnPalabras(datos.inicio, ahora) })
  if (datos.centro) {
    detalles.push({ etiqueta: 'Dónde', valor: [datos.centro, datos.direccion, datos.localidad].filter(Boolean).join(', ') })
  }
  if (datos.telefono) detalles.push({ etiqueta: 'Teléfono del centro', valor: datos.telefono })
  // Qué llevar: solo si el turno sigue en pie.
  if (aviso.tipo !== 'cancelacion' && datos.requisitos !== undefined && datos.inicio) {
    detalles.push({ etiqueta: 'Qué tenés que llevar', valor: listaRequisitos(datos.requisitos ?? null) })
  }
  if (aviso.tipo !== 'cancelacion' && typeof datos.lat === 'number' && typeof datos.lng === 'number') {
    enlaces.push({ texto: 'Cómo llegar (Google Maps)', url: enlaceComoLlegar(datos.lat, datos.lng) })
  }
  enlaces.push({ texto: 'Ver mis avisos', url: `${sitio.replace(/\/+$/, '')}/avisos` })
  const contenido = { titulo, parrafos: [mensaje], detalles, enlaces }
  return { asunto: `${titulo} · Turnos Accesibles`, html: plantillaHtml(contenido), texto: plantillaTexto(contenido) }
}

/** El correo de la invitación a un acompañante. */
export function armarCorreoInvitacion(datos: {
  nombreInvitado: string
  nombreQuienInvita: string
  alcance: string[]
  enlace: string
  venceEn: string
}): Correo {
  const quien = datos.nombreQuienInvita.trim() || 'Una persona'
  const contenido: Contenido = {
    titulo: `${quien} te invita a ser su acompañante`,
    parrafos: [
      `Hola, ${datos.nombreInvitado.trim() || 'qué tal'}.`,
      `${quien} quiere que le des una mano con sus turnos de salud en Turnos Accesibles.`,
      `Si aceptás, vas a poder ${alcanceEnPalabras(datos.alcance, 'ajeno')}. Nada más: no vas a ver otros datos.`,
      `La invitación vence el ${momentoEnPalabras(datos.venceEn)}. Para aceptarla tenés que ingresar con este mismo correo (o crear una cuenta con él).`,
    ],
    enlaces: [{ texto: 'Ver la invitación', url: datos.enlace }],
  }
  return {
    asunto: `${quien} te invita a ser su acompañante · Turnos Accesibles`,
    html: plantillaHtml(contenido),
    texto: plantillaTexto(contenido),
  }
}

/**
 * ¿El proveedor dijo que la dirección no sirve? (Resend responde 422 cuando el `to` no es válido.)
 * En ese caso no tiene sentido reintentar: se marca error y se le pide a la persona que la revise.
 */
export function esCorreoRechazado(estado: number, cuerpo: unknown): boolean {
  if (estado !== 422) return false
  const mensaje = typeof cuerpo === 'object' && cuerpo !== null ? String((cuerpo as { message?: unknown }).message ?? '') : ''
  return /\bto\b|address|recipient|destinatario/i.test(mensaje)
}

/** Manda un correo con Resend. Nunca lanza: devuelve si salió y, si no, por qué. */
export async function enviarCorreo(
  config: { clave: string; remitente: string; base: string },
  para: string,
  correo: Correo,
): Promise<ResultadoEnvio> {
  try {
    const respuesta = await fetch(`${config.base.replace(/\/+$/, '')}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.clave}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: config.remitente, to: [para], subject: correo.asunto, html: correo.html, text: correo.texto }),
      signal: AbortSignal.timeout(8000),
    })
    if (respuesta.ok) return { ok: true }
    const cuerpo = await respuesta.json().catch(() => null)
    return {
      ok: false,
      rechazado: esCorreoRechazado(respuesta.status, cuerpo),
      error: `El proveedor respondió ${respuesta.status}.`,
    }
  } catch (error) {
    const corto = error instanceof Error && error.name === 'TimeoutError'
    return { ok: false, rechazado: false, error: corto ? 'El proveedor no respondió a tiempo.' : 'No se pudo conectar con el proveedor.' }
  }
}

/** Las claves del correo (runtimeConfig). null si falta alguna: entonces no se manda nada. */
export function configuracionCorreo(config: {
  resendApiKey?: string
  resendBaseUrl?: string
  correoRemitente?: string
}): { clave: string; remitente: string; base: string } | null {
  if (!config.resendApiKey || !config.correoRemitente) return null
  return { clave: config.resendApiKey, remitente: config.correoRemitente, base: config.resendBaseUrl || 'https://api.resend.com' }
}
