import { describe, expect, it } from 'vitest'
import {
  alcanceEnPalabras,
  enlaceInvitacion,
  enlaceWhatsApp,
  estadoVinculo,
  esVigente,
  normalizarAlcance,
  puede,
  textoInvitacion,
} from '../shared/utils/acompanantes'
import { momentoEnPalabras } from '../shared/utils/fechas'

const AHORA = new Date('2026-10-14T13:00:00Z')

describe('alcance', () => {
  it('siempre incluye ver, en orden fijo y sin cosas raras', () => {
    expect(normalizarAlcance(['cancelar'])).toEqual(['ver', 'cancelar'])
    expect(normalizarAlcance(['reservar', 'ver', 'borrar'])).toEqual(['ver', 'reservar'])
    expect(normalizarAlcance(null)).toEqual(['ver'])
  })

  it('puede: ver siempre; lo demás si está', () => {
    expect(puede([], 'ver')).toBe(true)
    expect(puede(['ver', 'reservar'], 'reservar')).toBe(true)
    expect(puede(['ver', 'reservar'], 'cancelar')).toBe(false)
  })

  it('en palabras, desde cada persona', () => {
    expect(alcanceEnPalabras(['ver'], 'propio')).toBe('ver mis turnos')
    expect(alcanceEnPalabras(['ver', 'reservar'], 'propio')).toBe('ver mis turnos y sacar turnos por mí')
    expect(alcanceEnPalabras(['ver', 'reservar', 'cancelar'], 'ajeno')).toBe(
      'ver sus turnos, sacarle turnos y cancelar o cambiar de fecha sus turnos',
    )
    expect(alcanceEnPalabras(['reservar'], 'tuyo')).toBe('ver tus turnos y sacarte turnos')
  })
})

describe('estadoVinculo', () => {
  it('una invitación pendiente cuya fecha pasó se ve vencida', () => {
    expect(estadoVinculo({ estado: 'pendiente', venceEn: '2026-10-20T00:00:00Z' }, AHORA)).toBe('pendiente')
    expect(estadoVinculo({ estado: 'pendiente', venceEn: '2026-10-14T12:00:00Z' }, AHORA)).toBe('vencido')
    expect(estadoVinculo({ estado: 'activo', venceEn: '2026-10-01T00:00:00Z' }, AHORA)).toBe('activo')
    expect(estadoVinculo({ estado: 'otra-cosa', venceEn: '2026-10-20T00:00:00Z' }, AHORA)).toBe('vencido')
  })

  it('solo se puede quitar el permiso de lo vigente', () => {
    expect(esVigente('pendiente')).toBe(true)
    expect(esVigente('activo')).toBe(true)
    expect(esVigente('revocado')).toBe(false)
  })
})

describe('invitación', () => {
  const token = '6f1c2a34-0000-4000-8000-000000000001'

  it('enlace a la invitación, sin barras de más', () => {
    expect(enlaceInvitacion('https://turnos.example/', token)).toBe(`https://turnos.example/invitacion/${token}`)
  })

  it('texto para compartir y enlace de WhatsApp', () => {
    const enlace = enlaceInvitacion('https://turnos.example', token)
    const texto = textoInvitacion('Rosa', enlace)
    expect(texto).toBe(
      'Rosa te invita a ser su acompañante en Turnos Accesibles, para ayudar con sus turnos de salud. ' +
        `Abrí este enlace para aceptar (vence en 7 días): ${enlace}`,
    )
    expect(enlaceWhatsApp(texto)).toBe(`https://wa.me/?text=${encodeURIComponent(texto)}`)
    expect(enlaceWhatsApp('a b&c')).toBe('https://wa.me/?text=a%20b%26c')
  })

  it('sin nombre, no queda un hueco', () => {
    expect(textoInvitacion('  ', 'x').startsWith('Una persona te invita')).toBe(true)
  })
})

describe('momentoEnPalabras', () => {
  it('fecha y hora exactas, con el año (para la constancia)', () => {
    expect(momentoEnPalabras('2026-10-14T18:42:00Z')).toBe('miércoles 14 de octubre de 2026, a las 15:42')
    expect(momentoEnPalabras('2026-10-14T04:05:00Z')).toBe('miércoles 14 de octubre de 2026, a la 1:05')
  })
})
