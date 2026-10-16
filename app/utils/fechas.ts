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
