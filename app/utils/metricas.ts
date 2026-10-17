// Métricas (v0.6, RF-09): cuentas y textos del tablero /admin/metricas y la planilla CSV.
// Los números los calcula la base (función metricas); acá solo se presentan.
// Son funciones puras: las prueba tests/metricas.test.ts.

// Import explícito (y no el automático de Nuxt) para que Vitest lo encuentre.
import { esFechaValida, sumarDias } from '../../shared/utils/fechas'
import { diasEntre } from './admin'

export const AGRUPACIONES = [
  { valor: 'dia', titulo: 'Por día' },
  { valor: 'centro', titulo: 'Por centro de salud' },
  { valor: 'especialidad', titulo: 'Por especialidad' },
  { valor: 'localidad', titulo: 'Por localidad' },
] as const

export type Agrupar = (typeof AGRUPACIONES)[number]['valor']

/** Una fila del tablero, tal como la devuelve la función metricas de la base. */
export type FilaMetricas = {
  clave: string
  buscados: number
  reservados: number
  cancelados: number
  reprogramados: number
  completados: number
  segundos_promedio: number | null
  autonomas: number
  asistidas: number
}

export type ResumenMetricas = Omit<FilaMetricas, 'clave'> & { uso: Record<string, number> }

export type ReporteMetricas = { hayDatos: boolean; resumen: ResumenMetricas; filas: FilaMetricas[] }

/** Las columnas de la tabla (y de la planilla), en orden. */
export const COLUMNAS_METRICAS = [
  { clave: 'buscados', titulo: 'Buscados' },
  { clave: 'reservados', titulo: 'Reservados' },
  { clave: 'cancelados', titulo: 'Cancelados' },
  { clave: 'reprogramados', titulo: 'Cambiados de fecha' },
  { clave: 'completados', titulo: 'Cumplidos' },
] as const

/** Para el uso de las funciones de accesibilidad y del modo acompañante. */
export const NOMBRES_USO: Record<string, string> = {
  asistente_inicio: 'Empezaron el asistente',
  asistente_ia: 'Pedidos en lenguaje natural entendidos',
  preferencia_voz: 'Activaron la lectura en voz alta',
  preferencia_contraste: 'Activaron el alto contraste',
  preferencia_tamano: 'Cambiaron el tamaño del texto',
  acompanante_ayudar: 'Acompañantes que ayudaron a alguien',
  acompanante_invitar: 'Invitaciones a acompañantes',
}

/** Porcentaje entero de `parte` sobre `total`. Sin total, 0 (nunca divide por cero). */
export function porcentaje(parte: number, total: number): number {
  if (!Number.isFinite(parte) || !Number.isFinite(total) || total <= 0) return 0
  return Math.round((parte * 100) / total)
}

/** Promedio de los números de la lista (los null no cuentan). null si no hay ninguno. */
export function promedio(valores: (number | null)[]): number | null {
  const numeros = valores.filter((valor): valor is number => typeof valor === 'number' && Number.isFinite(valor))
  if (numeros.length === 0) return null
  return numeros.reduce((suma, valor) => suma + valor, 0) / numeros.length
}

/** 265 → "4 minutos y 25 segundos". null → "Sin datos". */
export function segundosEnPalabras(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos) || segundos < 0) return 'Sin datos'
  const total = Math.round(segundos)
  const minutos = Math.floor(total / 60)
  const resto = total % 60
  const textoSegundos = resto === 1 ? '1 segundo' : `${resto} segundos`
  if (minutos === 0) return textoSegundos
  const textoMinutos = minutos === 1 ? '1 minuto' : `${minutos} minutos`
  return resto === 0 ? textoMinutos : `${textoMinutos} y ${textoSegundos}`
}

/** "2026-10-14" → "14/10". Lo demás queda igual. */
export function diaCorto(clave: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(clave) ? `${clave.slice(8, 10)}/${clave.slice(5, 7)}` : clave
}

/** El nombre de cada fila: el día corto, o qué quiere decir "Sin dato" en cada agrupación. */
export function etiquetaFila(clave: string, agrupar: Agrupar): string {
  if (agrupar === 'dia') return diaCorto(clave)
  if (clave !== 'Sin dato') return clave
  if (agrupar === 'centro') return 'Búsquedas sin centro elegido'
  if (agrupar === 'localidad') return 'Búsquedas sin localidad'
  return 'Sin especialidad'
}

function filaVacia(clave: string): FilaMetricas {
  return {
    clave,
    buscados: 0,
    reservados: 0,
    cancelados: 0,
    reprogramados: 0,
    completados: 0,
    segundos_promedio: null,
    autonomas: 0,
    asistidas: 0,
  }
}

/** Por día: agrega los días del período sin movimiento (en cero), para que el gráfico no salte días. */
export function completarDias(filas: FilaMetricas[], desde: string, hasta: string): FilaMetricas[] {
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde || diasEntre(desde, hasta) > 366) return filas
  const porDia = new Map(filas.map((fila) => [fila.clave, fila]))
  const lista: FilaMetricas[] = []
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    lista.push(porDia.get(dia) ?? filaVacia(dia))
  }
  return lista
}

/** Últimos `dias` días hasta hoy inclusive: rangoUltimosDias(7, '2026-10-14') → 08/10 a 14/10. */
export function rangoUltimosDias(dias: number, hoy: string): { desde: string; hasta: string } {
  return { desde: sumarDias(hoy, -(dias - 1)), hasta: hoy }
}

/** Revisa el período elegido a mano. Devuelve qué campo está mal y por qué. */
export function validarPeriodo(
  desde: string,
  hasta: string,
  hoy: string,
): { campo: 'desde' | 'hasta'; mensaje: string } | undefined {
  if (!esFechaValida(desde)) return { campo: 'desde', mensaje: 'Elegí desde qué día.' }
  if (!esFechaValida(hasta)) return { campo: 'hasta', mensaje: 'Elegí hasta qué día.' }
  if (hasta < desde) return { campo: 'hasta', mensaje: 'Tiene que ser el mismo día o después del primero.' }
  if (hasta > hoy) return { campo: 'hasta', mensaje: 'Elegí hasta hoy: los días que vienen todavía no tienen datos.' }
  if (diasEntre(desde, hasta) > 366) return { campo: 'desde', mensaje: 'Elegí como mucho un año.' }
  return undefined
}

/** Una celda de la planilla: entre comillas si tiene ; " o saltos de línea (las comillas se duplican). */
export function celdaCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/**
 * Planilla CSV para Excel en español: UTF-8 con BOM (si no, las tildes salen mal), separador ";"
 * (la coma es el separador decimal) y renglones con \r\n.
 */
export function armarCsv(encabezados: string[], filas: (string | number | null)[][]): string {
  const renglones = [encabezados, ...filas].map((fila) => fila.map(celdaCsv).join(';'))
  return `﻿${renglones.join('\r\n')}\r\n`
}

/** La planilla del reporte: una fila por grupo y al final el total del período. */
export function csvDeMetricas(reporte: ReporteMetricas, agrupar: Agrupar): string {
  const titulo = AGRUPACIONES.find((opcion) => opcion.valor === agrupar)?.titulo.replace('Por ', '') ?? 'Grupo'
  const encabezados = [
    titulo.charAt(0).toUpperCase() + titulo.slice(1),
    ...COLUMNAS_METRICAS.map((columna) => columna.titulo),
    'Tiempo promedio de reserva (segundos)',
    'Reservas autónomas',
    'Reservas asistidas',
    '% autónomas',
  ]
  const fila = (nombre: string, datos: Omit<FilaMetricas, 'clave'>) => [
    nombre,
    ...COLUMNAS_METRICAS.map((columna) => datos[columna.clave]),
    datos.segundos_promedio,
    datos.autonomas,
    datos.asistidas,
    porcentaje(datos.autonomas, datos.autonomas + datos.asistidas),
  ]
  return armarCsv(encabezados, [
    ...reporte.filas.map((datos) => fila(agrupar === 'dia' ? datos.clave : etiquetaFila(datos.clave, agrupar), datos)),
    fila('Total del período', reporte.resumen),
  ])
}

/** "metricas-2026-09-15-al-2026-10-14.csv". */
export function nombreArchivoReporte(desde: string, hasta: string, extension: string): string {
  return `metricas-${desde}-al-${hasta}.${extension}`
}

/** El ancho de cada barra del gráfico (0 a 100), respecto del valor más grande. */
export function anchoBarra(valor: number, maximo: number): number {
  return maximo > 0 ? Math.round((Math.max(0, valor) * 100) / maximo) : 0
}

/** Lee lo que devuelve la base y lo deja con tipos (los números pueden venir como texto). */
export function leerReporte(datos: unknown): ReporteMetricas | null {
  if (typeof datos !== 'object' || datos === null) return null
  const crudo = datos as { hay_datos?: unknown; resumen?: Record<string, unknown>; filas?: unknown }
  if (!crudo.resumen || !Array.isArray(crudo.filas)) return null
  const numero = (valor: unknown) => (Number.isFinite(Number(valor)) ? Number(valor) : 0)
  const segundos = (valor: unknown) => (valor === null || valor === undefined ? null : numero(valor))
  const leerFila = (fila: Record<string, unknown>): Omit<FilaMetricas, 'clave'> => ({
    buscados: numero(fila.buscados),
    reservados: numero(fila.reservados),
    cancelados: numero(fila.cancelados),
    reprogramados: numero(fila.reprogramados),
    completados: numero(fila.completados),
    segundos_promedio: segundos(fila.segundos_promedio),
    autonomas: numero(fila.autonomas),
    asistidas: numero(fila.asistidas),
  })
  const uso: Record<string, number> = {}
  const usoCrudo = crudo.resumen.uso
  if (typeof usoCrudo === 'object' && usoCrudo !== null) {
    for (const [clave, valor] of Object.entries(usoCrudo)) uso[clave] = numero(valor)
  }
  return {
    hayDatos: crudo.hay_datos === true,
    resumen: { ...leerFila(crudo.resumen), uso },
    filas: (crudo.filas as Record<string, unknown>[]).map((fila) => ({ clave: String(fila.clave ?? ''), ...leerFila(fila) })),
  }
}
