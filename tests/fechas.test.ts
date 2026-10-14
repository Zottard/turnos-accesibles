import { describe, expect, it } from 'vitest'
import {
  diaDeCampoEnPalabras,
  diaEnPalabras,
  fechaClave,
  franjaDe,
  horaEnPalabras,
  sumarDias,
  turnoEnPalabras,
  validarRangoFechas,
} from '../app/utils/fechas'

// "Ahora" fijo: miércoles 14 de octubre de 2026, 10:00 en Argentina (13:00 UTC).
const AHORA = new Date('2026-10-14T13:00:00Z')

describe('fechaClave', () => {
  it('da el día en Argentina, aunque en UTC ya sea el día siguiente', () => {
    // 23:30 del 14 en Argentina son las 2:30 del 15 en UTC.
    expect(fechaClave(new Date('2026-10-15T02:30:00Z'))).toBe('2026-10-14')
  })
})

describe('sumarDias', () => {
  it('pasa de mes y de año', () => {
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('diaEnPalabras', () => {
  it('escribe el día de la semana, el número y el mes', () => {
    expect(diaEnPalabras('2026-10-20T12:00:00Z', AHORA)).toBe('martes 20 de octubre')
  })

  it('avisa si es hoy o mañana', () => {
    expect(diaEnPalabras('2026-10-14T18:00:00Z', AHORA)).toBe('hoy, miércoles 14 de octubre')
    expect(diaEnPalabras('2026-10-15T11:00:00Z', AHORA)).toBe('mañana, jueves 15 de octubre')
  })

  it('agrega el año si no es el de hoy', () => {
    expect(diaEnPalabras('2027-01-04T12:00:00Z', AHORA)).toBe('lunes 4 de enero de 2027')
  })

  it('lee una fecha de un campo de fecha', () => {
    expect(diaDeCampoEnPalabras('2026-10-20', AHORA)).toBe('martes 20 de octubre')
  })
})

describe('horaEnPalabras y turnoEnPalabras', () => {
  it('usa la hora de Argentina (UTC-3), sin cero adelante', () => {
    expect(horaEnPalabras('2026-10-20T12:30:00Z')).toBe('9:30')
    expect(horaEnPalabras('2026-10-20T16:00:00Z')).toBe('13:00')
  })

  it('arma la frase completa', () => {
    expect(turnoEnPalabras('2026-10-20T12:30:00Z', AHORA)).toBe('martes 20 de octubre, a las 9:30')
    expect(turnoEnPalabras('2026-10-15T11:00:00Z', AHORA)).toBe('mañana, jueves 15 de octubre, a las 8:00')
  })

  it('dice "a la 1" y no "a las 1"', () => {
    expect(turnoEnPalabras('2026-10-20T04:20:00Z', AHORA)).toBe('martes 20 de octubre, a la 1:20')
  })
})

describe('franjaDe', () => {
  it('antes de las 13 es a la mañana; desde las 13, a la tarde', () => {
    expect(franjaDe('2026-10-20T15:40:00Z')).toBe('manana') // 12:40
    expect(franjaDe('2026-10-20T16:00:00Z')).toBe('tarde') // 13:00
  })
})

describe('validarRangoFechas', () => {
  it('acepta fechas vacías o en orden', () => {
    expect(validarRangoFechas('', '', AHORA)).toBeUndefined()
    expect(validarRangoFechas('2026-10-14', '2026-10-20', AHORA)).toBeUndefined()
    expect(validarRangoFechas('2026-10-20', '2026-10-20', AHORA)).toBeUndefined()
  })

  it('no acepta días que ya pasaron', () => {
    expect(validarRangoFechas('2026-10-13', '', AHORA)?.campo).toBe('desde')
    expect(validarRangoFechas('', '2026-10-01', AHORA)?.campo).toBe('hasta')
  })

  it('pide que "hasta" no sea antes que "desde"', () => {
    expect(validarRangoFechas('2026-10-20', '2026-10-18', AHORA)).toEqual({
      campo: 'hasta',
      mensaje: 'Esta fecha tiene que ser el mismo día o después de la primera.',
    })
  })
})
