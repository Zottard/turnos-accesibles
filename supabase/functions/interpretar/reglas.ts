// Intérprete por reglas del paso 0 del asistente. Sin IA paga: reconoce palabras clave.
// Si no entiende, devuelve confianza 0 y el asistente sigue por menús.

export interface Interpretacion {
  especialidad?: string
  cercaDeCasa?: boolean
  franja?: 'manana' | 'tarde'
  desde?: string
  confianza: number
}

const ESPECIALIDADES: [string, RegExp][] = [
  ['oftalmologia', /\b(oculista|ojos?|vista|anteojos?|lentes|oftalm\w*|ver mal|veo mal)\b/],
  ['odontologia', /\b(dentista|dientes?|muelas?|encias?|odonto\w*)\b/],
  ['cardiologia', /\b(corazon|presion|cardio\w*|palpitaciones)\b/],
  ['dermatologia', /\b(piel|manchas?|lunar(es)?|granos?|alergia en la piel|dermato\w*)\b/],
  ['traumatologia', /\b(huesos?|fractura|rodilla|espalda|cadera|columna|tobillo|hombro|traumato\w*)\b/],
  ['ginecologia', /\b(ginec\w*|papanicolau|pap|mamografia|control de la mujer)\b/],
  ['pediatria', /\b(pediatra|pediatria|chicos?|nenes?|nenas?|hij[oa]s?|bebes?|ninos?|ninas?|nieto|nieta)\b/],
  ['otorrinolaringologia', /\b(oidos?|nariz|garganta|otorrino\w*|escucho mal|oigo mal)\b/],
  ['salud-mental', /\b(psicolog\w*|psiquiatr\w*|ansiedad|depresion|angustia|salud mental)\b/],
  ['nefrologia', /\b(rinon(es)?|nefro\w*)\b/],
  ['endocrinologia', /\b(diabetes|tiroides|azucar|endocrino\w*|hormonas)\b/],
  ['neumonologia', /\b(pulmon(es)?|respirar|respiro|tos|asma|neumo\w*)\b/],
  ['laboratorio', /\b(analisis|sacar sangre|extraccion|laboratorio)\b/],
  ['imagenes', /\b(radiografia|ecografia|placa|tomografia|resonancia|estudios?)\b/],
  ['medicina-general', /\b(medico de (familia|cabecera)|clinico|medico clinico|chequeo|control general|medico general)\b/],
]

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

function hoyEnArgentina(ahora: Date) {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
  return new Date(`${iso}T12:00:00Z`)
}

const sumarDias = (fecha: Date, dias: number) => {
  const copia = new Date(fecha)
  copia.setUTCDate(copia.getUTCDate() + dias)
  return copia.toISOString().slice(0, 10)
}

export function interpretar(texto: string, ahora: Date = new Date()): Interpretacion {
  const t = normalizar(texto)
  const resultado: Interpretacion = { confianza: 0 }
  if (!t) return resultado

  const encontradas = ESPECIALIDADES.filter(([, regla]) => regla.test(t)).map(([slug]) => slug)
  if (encontradas.length) {
    resultado.especialidad = encontradas[0]
    resultado.confianza = encontradas.length === 1 ? 0.9 : 0.6
  }

  if (/\b(cerca|cerquita|mi casa|mi barrio|aca nomas)\b/.test(t)) resultado.cercaDeCasa = true

  if (/\b(a|por|de) la manana\b|\btemprano\b/.test(t)) resultado.franja = 'manana'
  else if (/\b(a|por|de) la tarde\b/.test(t)) resultado.franja = 'tarde'

  const hoy = hoyEnArgentina(ahora)
  const sinFranja = t.replace(/\b(a|por|de) la manana\b/g, ' ')
  if (/\bpasado manana\b/.test(sinFranja)) resultado.desde = sumarDias(hoy, 2)
  else if (/\bhoy\b/.test(sinFranja)) resultado.desde = sumarDias(hoy, 0)
  else if (/\bmanana\b/.test(sinFranja)) resultado.desde = sumarDias(hoy, 1)
  else if (/\b(la semana que viene|la proxima semana)\b/.test(sinFranja)) resultado.desde = sumarDias(hoy, 7 - hoy.getUTCDay() + 1)
  else {
    const dia = DIAS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(sinFranja))
    if (dia >= 0) resultado.desde = sumarDias(hoy, (dia - hoy.getUTCDay() + 7) % 7)
  }

  return resultado
}
