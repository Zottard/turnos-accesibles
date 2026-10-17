// Fechas y horas en palabras, siempre en la hora de Argentina (aunque la compu esté en otra zona).
// Sin librerías: usamos Intl.DateTimeFormat, que ya trae el navegador (y Node).
// `ahora` se puede pasar para probar las funciones con una fecha fija (tests/fechas.test.ts).

export const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires'

export type Franja = 'manana' | 'tarde'

export const NOMBRES_FRANJA: Record<Franja, string> = {
  manana: 'a la mañana',
  tarde: 'a la tarde',
}

// Las partes de una fecha en Argentina: "martes", "14", "octubre", 2026, 9, "30".
function partes(fecha: Date) {
  const lista = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_ARGENTINA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => lista.find((parte) => parte.type === tipo)?.value ?? ''
  return {
    diaSemana: valor('weekday'),
    dia: Number(valor('day')),
    mes: valor('month'),
    anio: Number(valor('year')),
    hora: Number(valor('hour')),
    minutos: valor('minute'),
  }
}

/** El día en formato "AAAA-MM-DD", en hora argentina. Es el formato de los campos de fecha. */
export function fechaClave(fecha: Date): string {
  // 'en-CA' escribe las fechas como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_ARGENTINA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
}

/** Suma días a una fecha "AAAA-MM-DD": sumarDias('2026-10-30', 3) → '2026-11-02'. */
export function sumarDias(clave: string, dias: number): string {
  // Mediodía: así ningún cambio de zona horaria nos mueve de día.
  const fecha = new Date(`${clave}T12:00:00-03:00`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fechaClave(fecha)
}

/** "martes 14 de octubre". Si es hoy o mañana, lo dice: "hoy, martes 14 de octubre". */
export function diaEnPalabras(inicio: string | Date, ahora = new Date()): string {
  const fecha = new Date(inicio)
  const { diaSemana, dia, mes, anio } = partes(fecha)
  let texto = `${diaSemana} ${dia} de ${mes}`
  if (anio !== partes(ahora).anio) {
    texto += ` de ${anio}`
  }
  const clave = fechaClave(fecha)
  const hoy = fechaClave(ahora)
  if (clave === hoy) {
    return `hoy, ${texto}`
  }
  if (clave === sumarDias(hoy, 1)) {
    return `mañana, ${texto}`
  }
  return texto
}

/** true si es un día que existe, escrito "AAAA-MM-DD" (como lo dan los campos de fecha). */
export function esFechaValida(clave: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
    return false
  }
  const fecha = new Date(`${clave}T12:00:00-03:00`)
  // Si el día no existe (30 de febrero), la fecha no se entiende o "se corre" y no coincide.
  return !Number.isNaN(fecha.getTime()) && fechaClave(fecha) === clave
}

/** Día de la semana de una fecha "AAAA-MM-DD": 0 = domingo, 1 = lunes... 6 = sábado. */
export function diaDeLaSemana(clave: string): number {
  return new Date(`${clave}T12:00:00-03:00`).getUTCDay()
}

/** El próximo día de la semana pedido, desde `hoy` inclusive: proximoDia('2026-10-14', 5) → viernes 16. */
export function proximoDia(hoy: string, dia: number): string {
  const faltan = (dia - diaDeLaSemana(hoy) + 7) % 7
  return sumarDias(hoy, faltan)
}

/** "La semana que viene": el lunes siguiente (si hoy es lunes, el de la otra semana). */
export function lunesQueViene(hoy: string): string {
  // Días que pasaron desde el lunes de esta semana: lunes 0, martes 1... domingo 6.
  const desdeElLunes = (diaDeLaSemana(hoy) + 6) % 7
  return sumarDias(hoy, 7 - desdeElLunes)
}

/** Horas enteras que faltan hasta `inicio` (negativas si ya pasó). */
export function horasHasta(inicio: string | Date, ahora = new Date()): number {
  return Math.floor((new Date(inicio).getTime() - ahora.getTime()) / (60 * 60 * 1000))
}

/** Un día "AAAA-MM-DD" de un campo de fecha, en palabras: "martes 20 de octubre". */
export function diaDeCampoEnPalabras(clave: string, ahora = new Date()): string {
  return diaEnPalabras(new Date(`${clave}T12:00:00-03:00`), ahora)
}

/** "9:30" o "13:00". */
export function horaEnPalabras(inicio: string | Date): string {
  const { hora, minutos } = partes(new Date(inicio))
  return `${hora}:${minutos}`
}

/** "martes 14 de octubre, a las 9:30". */
export function turnoEnPalabras(inicio: string | Date, ahora = new Date()): string {
  const hora = horaEnPalabras(inicio)
  const articulo = hora.startsWith('1:') ? 'a la' : 'a las'
  return `${diaEnPalabras(inicio, ahora)}, ${articulo} ${hora}`
}

/**
 * Un momento exacto, siempre con el año: "miércoles 14 de octubre de 2026, a las 15:42".
 * Para constancias (el consentimiento) y registros, que se leen mucho después.
 */
export function momentoEnPalabras(fecha: string | Date): string {
  const { diaSemana, dia, mes, anio } = partes(new Date(fecha))
  const hora = horaEnPalabras(fecha)
  return `${diaSemana} ${dia} de ${mes} de ${anio}, ${hora.startsWith('1:') ? 'a la' : 'a las'} ${hora}`
}

/** A la mañana (antes de las 13) o a la tarde. Es el mismo corte que usa la búsqueda en la base. */
export function franjaDe(inicio: string | Date): Franja {
  return partes(new Date(inicio)).hora < 13 ? 'manana' : 'tarde'
}

/**
 * Revisa el rango de fechas de la búsqueda (las dos son opcionales).
 * Devuelve qué campo está mal y por qué, o undefined si está todo bien.
 */
export function validarRangoFechas(
  desde: string,
  hasta: string,
  ahora = new Date(),
): { campo: 'desde' | 'hasta'; mensaje: string } | undefined {
  const hoy = fechaClave(ahora)
  if (desde && desde < hoy) {
    return { campo: 'desde', mensaje: 'Esa fecha ya pasó. Elegí desde hoy en adelante.' }
  }
  if (hasta && hasta < hoy) {
    return { campo: 'hasta', mensaje: 'Esa fecha ya pasó. Elegí desde hoy en adelante.' }
  }
  if (desde && hasta && hasta < desde) {
    return { campo: 'hasta', mensaje: 'Esta fecha tiene que ser el mismo día o después de la primera.' }
  }
  return undefined
}
