import { describe, expect, it } from 'vitest'

const ahora = new Date('2026-10-13T15:00:00-03:00')

describe('horaEnPalabras', () => {
  it('dice la hora como la diría una persona', () => {
    expect(horaEnPalabras('2026-10-14T10:00:00-03:00')).toBe('a las 10 de la mañana')
    expect(horaEnPalabras('2026-10-14T08:20:00-03:00')).toBe('a las 8 y 20 de la mañana')
    expect(horaEnPalabras('2026-10-14T09:30:00-03:00')).toBe('a las 9 y media de la mañana')
    expect(horaEnPalabras('2026-10-14T11:15:00-03:00')).toBe('a las 11 y cuarto de la mañana')
    expect(horaEnPalabras('2026-10-14T12:00:00-03:00')).toBe('a las 12 del mediodía')
    expect(horaEnPalabras('2026-10-14T13:40:00-03:00')).toBe('a la 1 y 40 de la tarde')
    expect(horaEnPalabras('2026-10-14T15:00:00-03:00')).toBe('a las 3 de la tarde')
  })

  it('usa siempre la hora de Argentina, venga como venga la fecha', () => {
    expect(horaEnPalabras('2026-10-14T13:00:00Z')).toBe('a las 10 de la mañana')
  })
})

describe('diaEnPalabras', () => {
  it('escribe el día sin números sueltos', () => {
    expect(diaEnPalabras('2026-10-16T10:00:00-03:00', ahora)).toBe('viernes 16 de octubre')
  })

  it('avisa si es hoy o mañana', () => {
    expect(diaEnPalabras('2026-10-13T18:00:00-03:00', ahora)).toBe('hoy, martes 13 de octubre')
    expect(diaEnPalabras('2026-10-14T08:00:00-03:00', ahora)).toBe('mañana, miércoles 14 de octubre')
  })

  it('agrega el año solo si no es el actual', () => {
    expect(diaEnPalabras('2027-01-05T08:00:00-03:00', ahora)).toBe('martes 5 de enero de 2027')
  })
})

describe('fechaHoraEnPalabras', () => {
  it('junta día y hora', () => {
    expect(conMayuscula(fechaHoraEnPalabras('2026-10-16T10:00:00-03:00', ahora))).toBe('Viernes 16 de octubre, a las 10 de la mañana')
  })
})

describe('distanciaEnPalabras', () => {
  it('redondea y usa coma decimal', () => {
    expect(distanciaEnPalabras(0.4)).toBe('A menos de 1 km')
    expect(distanciaEnPalabras(2.34)).toBe('A 2,3 km')
    expect(distanciaEnPalabras(5.02)).toBe('A 5 km')
    expect(distanciaEnPalabras(null)).toBeUndefined()
  })
})
