import { describe, expect, it } from 'vitest'
import { armarCorreoAviso, armarCorreoInvitacion, configuracionCorreo, escaparHtml, esCorreoRechazado } from '../server/utils/correo'

const AHORA = new Date('2026-10-14T13:00:00Z')

const RECORDATORIO = {
  tipo: 'recordatorio' as const,
  usuarioId: 'rosa',
  solicitanteId: 'rosa',
  datos: {
    numero: 12,
    inicio: '2026-10-19T11:00:00Z',
    especialidad: 'Clínica médica',
    especialidad_simple: 'Médico clínico',
    centro: 'Centro <Las Tunas>',
    direccion: 'Calle Los Ceibos 830',
    localidad: 'General Pacheco',
    requisitos: 'Llevá tu DNI.\nTraé la lista de remedios.',
    lat: -34.4475,
    lng: -58.6298,
  },
}

describe('escaparHtml', () => {
  it('escapa lo que podría romper el HTML', () => {
    expect(escaparHtml(`<b>"Rosa" & 'Lucía'</b>`)).toBe('&lt;b&gt;&quot;Rosa&quot; &amp; &#39;Lucía&#39;&lt;/b&gt;')
  })
})

describe('armarCorreoAviso', () => {
  it('mismo título que en la app, con los datos del turno, qué llevar y cómo llegar', () => {
    const correo = armarCorreoAviso(RECORDATORIO, 'https://turnos.example/', AHORA)
    expect(correo.asunto).toBe('Recordatorio: tenés un turno · Turnos Accesibles')
    expect(correo.texto).toContain('Cuándo:\nlunes 19 de octubre, a las 8:00')
    expect(correo.texto).toContain('- Traé la lista de remedios.')
    expect(correo.texto).toContain('Cómo llegar (Google Maps): https://www.google.com/maps/dir/?api=1&destination=-34.4475,-58.6298')
    expect(correo.texto).toContain('Ver mis avisos: https://turnos.example/avisos')
    expect(correo.html).toContain('Centro &lt;Las Tunas&gt;')
    expect(correo.html).not.toContain('<Las Tunas>')
    expect(correo.html).toContain('lang="es-AR"')
  })

  it('una cancelación no pide llevar nada ni ofrece cómo llegar', () => {
    const correo = armarCorreoAviso({ ...RECORDATORIO, tipo: 'cancelacion' }, 'https://turnos.example', AHORA)
    expect(correo.texto).not.toContain('Qué tenés que llevar')
    expect(correo.texto).not.toContain('Cómo llegar')
  })
})

describe('armarCorreoInvitacion', () => {
  it('dice quién invita, qué va a poder hacer y hasta cuándo', () => {
    const correo = armarCorreoInvitacion({
      nombreInvitado: 'Lucía',
      nombreQuienInvita: 'Rosa',
      alcance: ['ver', 'reservar'],
      enlace: 'https://turnos.example/invitacion/abc',
      venceEn: '2026-10-21T13:00:00Z',
    })
    expect(correo.asunto).toBe('Rosa te invita a ser su acompañante · Turnos Accesibles')
    expect(correo.texto).toContain('vas a poder ver sus turnos y sacarle turnos')
    expect(correo.texto).toContain('vence el miércoles 21 de octubre de 2026, a las 10:00')
    expect(correo.texto).toContain('Ver la invitación: https://turnos.example/invitacion/abc')
  })
})

describe('esCorreoRechazado', () => {
  it('422 por el destinatario = dirección rechazada (no se reintenta)', () => {
    expect(esCorreoRechazado(422, { name: 'validation_error', message: 'Invalid `to` field.' })).toBe(true)
    expect(esCorreoRechazado(422, { name: 'validation_error', message: 'Invalid `from` field.' })).toBe(false)
    expect(esCorreoRechazado(500, { message: 'Invalid `to` field.' })).toBe(false)
    expect(esCorreoRechazado(422, null)).toBe(false)
  })
})

describe('configuracionCorreo', () => {
  it('sin clave o sin remitente no hay correo', () => {
    expect(configuracionCorreo({ resendApiKey: '', correoRemitente: 'a@b.c' })).toBeNull()
    expect(configuracionCorreo({ resendApiKey: 'k', correoRemitente: '' })).toBeNull()
    expect(configuracionCorreo({ resendApiKey: 'k', correoRemitente: 'a@b.c', resendBaseUrl: '' })).toEqual({
      clave: 'k',
      remitente: 'a@b.c',
      base: 'https://api.resend.com',
    })
  })
})
