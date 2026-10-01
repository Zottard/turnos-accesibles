const ZONA = 'America/Argentina/Buenos_Aires'

const FORMATO = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

function partes(fecha: Date | string) {
  const valores = Object.fromEntries(FORMATO.formatToParts(new Date(fecha)).map((p) => [p.type, p.value]))
  return {
    diaSemana: valores.weekday ?? '',
    dia: Number(valores.day),
    mes: valores.month ?? '',
    anio: Number(valores.year),
    hora: Number(valores.hour),
    minuto: Number(valores.minute),
  }
}

const FORMATO_ISO = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })

export const fechaLocalIso = (fecha: Date | string = new Date()) => FORMATO_ISO.format(new Date(fecha))

export function diaEnPalabras(fecha: Date | string, ahora: Date = new Date()) {
  const { diaSemana, dia, mes, anio } = partes(fecha)
  const base = `${diaSemana} ${dia} de ${mes}${anio !== partes(ahora).anio ? ` de ${anio}` : ''}`
  const diferencia = Math.round((Date.parse(fechaLocalIso(fecha)) - Date.parse(fechaLocalIso(ahora))) / 86_400_000)
  if (diferencia === 0) return `hoy, ${base}`
  if (diferencia === 1) return `mañana, ${base}`
  return base
}

export function horaEnPalabras(fecha: Date | string) {
  const { hora, minuto } = partes(fecha)
  const hora12 = hora === 0 || hora === 12 ? 12 : hora % 12
  const articulo = hora12 === 1 ? 'a la' : 'a las'
  const minutos = minuto === 0 ? '' : minuto === 15 ? ' y cuarto' : minuto === 30 ? ' y media' : ` y ${minuto}`
  const momento = hora === 12
    ? 'del mediodía'
    : hora >= 6 && hora < 12
      ? 'de la mañana'
      : hora > 12 && hora < 20
        ? 'de la tarde'
        : hora >= 20
          ? 'de la noche'
          : 'de la madrugada'
  return `${articulo} ${hora12}${minutos} ${momento}`
}

export const fechaHoraEnPalabras = (fecha: Date | string, ahora: Date = new Date()) =>
  `${diaEnPalabras(fecha, ahora)}, ${horaEnPalabras(fecha)}`

export const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)
