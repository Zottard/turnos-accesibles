import { describe, expect, it } from 'vitest'
import { interpretar } from '../../supabase/functions/interpretar/reglas'

const martes = new Date('2026-10-13T15:00:00-03:00')

describe('interpretar', () => {
  it('entiende el ejemplo del CONTEXTO', () => {
    expect(interpretar('necesito un turno con el oculista cerca de casa', martes)).toEqual({
      especialidad: 'oftalmologia',
      cercaDeCasa: true,
      confianza: 0.9,
    })
  })

  it('reconoce palabras comunes, con o sin tildes', () => {
    expect(interpretar('me duele la muela', martes).especialidad).toBe('odontologia')
    expect(interpretar('para mi nieto', martes).especialidad).toBe('pediatria')
    expect(interpretar('tengo la presión alta', martes).especialidad).toBe('cardiologia')
    expect(interpretar('me tengo que sacar sangre', martes).especialidad).toBe('laboratorio')
    expect(interpretar('me duele el riñón', martes).especialidad).toBe('nefrologia')
  })

  it('entiende la franja del día sin confundirla con mañana como día', () => {
    const soloFranja = interpretar('oculista a la mañana', martes)
    expect(soloFranja.franja).toBe('manana')
    expect(soloFranja.desde).toBeUndefined()
    expect(interpretar('dentista mañana a la tarde', martes)).toMatchObject({ franja: 'tarde', desde: '2026-10-14' })
    expect(interpretar('pasado mañana', martes).desde).toBe('2026-10-15')
  })

  it('entiende días de la semana', () => {
    expect(interpretar('cardiólogo el jueves', martes).desde).toBe('2026-10-15')
    expect(interpretar('el lunes', martes).desde).toBe('2026-10-19')
    expect(interpretar('la semana que viene', martes).desde).toBe('2026-10-19')
  })

  it('baja la confianza si hay más de un médico posible', () => {
    expect(interpretar('me duele la rodilla y la muela', martes).confianza).toBe(0.6)
  })

  it('si no entiende nada, confianza cero', () => {
    expect(interpretar('hola qué tal', martes)).toEqual({ confianza: 0 })
    expect(interpretar('', martes)).toEqual({ confianza: 0 })
  })
})
