import { describe, expect, it } from 'vitest'
import {
  anchoBarra,
  armarCsv,
  celdaCsv,
  completarDias,
  csvDeMetricas,
  etiquetaFila,
  leerReporte,
  nombreArchivoReporte,
  porcentaje,
  promedio,
  rangoUltimosDias,
  segundosEnPalabras,
  validarPeriodo,
  type FilaMetricas,
} from '../app/utils/metricas'

const FILA: FilaMetricas = {
  clave: '2026-10-13',
  buscados: 10,
  reservados: 4,
  cancelados: 1,
  reprogramados: 0,
  completados: 3,
  segundos_promedio: 125,
  autonomas: 3,
  asistidas: 1,
}

describe('cuentas', () => {
  it('porcentaje nunca divide por cero', () => {
    expect(porcentaje(3, 4)).toBe(75)
    expect(porcentaje(1, 3)).toBe(33)
    expect(porcentaje(0, 0)).toBe(0)
    expect(porcentaje(5, 0)).toBe(0)
    expect(porcentaje(Number.NaN, 4)).toBe(0)
  })

  it('promedio ignora los vacíos y sin datos da null', () => {
    expect(promedio([60, null, 120])).toBe(90)
    expect(promedio([])).toBeNull()
    expect(promedio([null, null])).toBeNull()
  })

  it('segundosEnPalabras', () => {
    expect(segundosEnPalabras(265)).toBe('4 minutos y 25 segundos')
    expect(segundosEnPalabras(60)).toBe('1 minuto')
    expect(segundosEnPalabras(61)).toBe('1 minuto y 1 segundo')
    expect(segundosEnPalabras(45)).toBe('45 segundos')
    expect(segundosEnPalabras(null)).toBe('Sin datos')
  })

  it('anchoBarra respecto del más grande', () => {
    expect(anchoBarra(5, 10)).toBe(50)
    expect(anchoBarra(0, 0)).toBe(0)
    expect(anchoBarra(-1, 10)).toBe(0)
  })
})

describe('período y filas', () => {
  it('rangoUltimosDias incluye hoy', () => {
    expect(rangoUltimosDias(7, '2026-10-14')).toEqual({ desde: '2026-10-08', hasta: '2026-10-14' })
    expect(rangoUltimosDias(30, '2026-10-14')).toEqual({ desde: '2026-09-15', hasta: '2026-10-14' })
  })

  it('validarPeriodo', () => {
    expect(validarPeriodo('2026-10-01', '2026-10-14', '2026-10-14')).toBeUndefined()
    expect(validarPeriodo('', '2026-10-14', '2026-10-14')?.campo).toBe('desde')
    expect(validarPeriodo('2026-10-10', '2026-10-01', '2026-10-14')?.campo).toBe('hasta')
    expect(validarPeriodo('2026-10-10', '2026-10-20', '2026-10-14')?.mensaje).toMatch(/hasta hoy/)
    expect(validarPeriodo('2024-01-01', '2026-10-14', '2026-10-14')?.mensaje).toMatch(/un año/)
  })

  it('completarDias agrega los días sin movimiento', () => {
    const filas = completarDias([FILA], '2026-10-12', '2026-10-14')
    expect(filas.map((fila) => fila.clave)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14'])
    expect(filas[0]?.buscados).toBe(0)
    expect(filas[1]).toBe(FILA)
  })

  it('etiquetaFila', () => {
    expect(etiquetaFila('2026-10-13', 'dia')).toBe('13/10')
    expect(etiquetaFila('Sin dato', 'centro')).toBe('Búsquedas sin centro elegido')
    expect(etiquetaFila('Tigre', 'localidad')).toBe('Tigre')
  })

  it('leerReporte pasa los números a número', () => {
    const reporte = leerReporte({
      hay_datos: true,
      resumen: { ...FILA, buscados: '10', segundos_promedio: null, uso: { preferencia_voz: '3' } },
      filas: [FILA],
    })
    expect(reporte?.resumen.buscados).toBe(10)
    expect(reporte?.resumen.segundos_promedio).toBeNull()
    expect(reporte?.resumen.uso.preferencia_voz).toBe(3)
    expect(leerReporte(null)).toBeNull()
  })
})

describe('planilla CSV', () => {
  it('celdaCsv escapa comillas, punto y coma y saltos de línea', () => {
    expect(celdaCsv('Tigre')).toBe('Tigre')
    expect(celdaCsv('Hospital "Central"')).toBe('"Hospital ""Central"""')
    expect(celdaCsv('a;b')).toBe('"a;b"')
    expect(celdaCsv('dos\nrenglones')).toBe('"dos\nrenglones"')
    expect(celdaCsv(null)).toBe('')
    expect(celdaCsv(0)).toBe('0')
  })

  it('armarCsv empieza con BOM, separa con ; y termina cada renglón con \\r\\n', () => {
    const csv = armarCsv(['Centro', 'Reservados'], [['Hospital; Tigre', 4]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toBe('﻿Centro;Reservados\r\n"Hospital; Tigre";4\r\n')
  })

  it('csvDeMetricas: una fila por grupo y el total, con el porcentaje de autónomas', () => {
    const csv = csvDeMetricas({ hayDatos: true, resumen: { ...FILA, uso: {} }, filas: [FILA] }, 'dia')
    const renglones = csv.slice(1).trim().split('\r\n')
    expect(renglones[0]).toMatch(/^Día;Buscados;Reservados;Cancelados;Cambiados de fecha;Cumplidos;/)
    expect(renglones[1]).toBe('2026-10-13;10;4;1;0;3;125;3;1;75')
    expect(renglones[2]).toMatch(/^Total del período;/)
  })

  it('nombreArchivoReporte', () => {
    expect(nombreArchivoReporte('2026-09-15', '2026-10-14', 'csv')).toBe('metricas-2026-09-15-al-2026-10-14.csv')
  })
})
