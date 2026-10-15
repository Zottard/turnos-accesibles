import { describe, expect, it } from 'vitest'
import { esCopiaDeAcompanante, leerDatosAviso, textoAviso, type AvisoParaTexto, type DatosAviso } from '../shared/utils/avisos'
import {
  avisosParaBanda,
  avisosSinEntregar,
  comoAvisar,
  historialAviso,
  momentoRecordatorio,
  ordenarBandeja,
  textoContador,
  type Notificacion,
} from '../app/utils/avisos'
import { mensajeReserva } from '../app/utils/reservas'

// Miércoles 14 de octubre de 2026, 10:00 en Argentina.
const AHORA = new Date('2026-10-14T13:00:00Z')
const ROSA = 'rosa-id'
const LUCIA = 'lucia-id'

const TURNO: DatosAviso = {
  numero: 12,
  inicio: '2026-10-19T11:00:00Z', // lunes 19, 8:00
  especialidad: 'Clínica médica',
  especialidad_simple: 'Médico clínico',
  profesional: 'Dr. Ramón Ortiz',
  centro: 'Centro de Salud Barrio Las Tunas',
  direccion: 'Calle Los Ceibos 830',
  localidad: 'General Pacheco',
  requisitos: 'Llevá tu DNI.',
  lat: -34.4475,
  lng: -58.6298,
  para: 'Rosa',
}

function aviso(tipo: AvisoParaTexto['tipo'], datos: DatosAviso, usuarioId = ROSA, solicitanteId: string | null = ROSA): AvisoParaTexto {
  return { tipo, datos, usuarioId, solicitanteId }
}

describe('textoAviso', () => {
  it('reserva propia: comprobante con número, especialidad, día, hora y lugar', () => {
    const { titulo, mensaje } = textoAviso(aviso('reserva', TURNO), AHORA)
    expect(titulo).toBe('Reservaste un turno')
    expect(mensaje).toBe(
      'Turno N.º 12: Médico clínico (Clínica médica), lunes 19 de octubre, a las 8:00, en Centro de Salud Barrio Las Tunas, Calle Los Ceibos 830, General Pacheco.',
    )
  })

  it('reserva que sacó la acompañante: a Rosa se lo dice con el nombre', () => {
    const { titulo } = textoAviso(aviso('reserva', { ...TURNO, por: 'Lucía', por_id: LUCIA }), AHORA)
    expect(titulo).toBe('Lucía te sacó un turno')
  })

  it('copia para la acompañante: habla de Rosa y dice quién lo sacó', () => {
    const datos = { ...TURNO, por: 'Lucía', por_id: LUCIA }
    expect(textoAviso(aviso('reserva', datos, LUCIA, ROSA), AHORA)).toEqual({
      titulo: 'Rosa tiene un turno nuevo',
      mensaje: expect.stringMatching(/Turno N\.º 12: .* Lo sacaste vos\.$/),
    })
    const otra = textoAviso(aviso('reserva', datos, 'otra-acompanante', ROSA), AHORA)
    expect(otra.mensaje.endsWith('Lo sacó Lucía.')).toBe(true)
  })

  it('cancelación: dice que el horario quedó libre', () => {
    expect(textoAviso(aviso('cancelacion', TURNO), AHORA)).toEqual({
      titulo: 'Se canceló tu turno',
      mensaje: expect.stringContaining('El horario quedó libre para otra persona.'),
    })
    expect(textoAviso(aviso('cancelacion', TURNO, LUCIA, ROSA), AHORA).titulo).toBe('Se canceló un turno de Rosa')
  })

  it('cambio de fecha: el turno nuevo y el de antes', () => {
    const { titulo, mensaje } = textoAviso(aviso('reprogramacion', { ...TURNO, antes: '2026-10-16T12:00:00Z' }), AHORA)
    expect(titulo).toBe('Tu turno cambió de fecha')
    expect(mensaje).toContain('lunes 19 de octubre, a las 8:00')
    expect(mensaje).toContain('Antes era viernes 16 de octubre, a las 9:00.')
    expect(textoAviso(aviso('reprogramacion', TURNO, LUCIA, ROSA), AHORA).titulo).toBe('Un turno de Rosa cambió de fecha')
  })

  it('recordatorio: dice "mañana" si es mañana, y que conviene llegar antes', () => {
    const manana = { ...TURNO, inicio: '2026-10-15T12:30:00Z' }
    const { titulo, mensaje } = textoAviso(aviso('recordatorio', manana), AHORA)
    expect(titulo).toBe('Recordatorio: tenés un turno')
    expect(mensaje).toContain('mañana, jueves 15 de octubre, a las 9:30')
    expect(mensaje).toContain('Conviene llegar 15 minutos antes.')
    expect(textoAviso(aviso('recordatorio', manana, LUCIA, ROSA), AHORA).titulo).toBe('Recordatorio: Rosa tiene un turno')
  })

  it('acompañamiento: aceptó (con lo que puede hacer), no aceptó y dejó de compartir', () => {
    const aceptado = textoAviso(aviso('acompanamiento', { evento: 'aceptado', nombre: 'Lucía', alcance: ['ver', 'reservar'] }, ROSA, null))
    expect(aceptado).toEqual({
      titulo: 'Lucía aceptó acompañarte',
      mensaje: 'Desde ahora puede ver tus turnos y sacarte turnos. Podés quitarle el permiso cuando quieras.',
    })
    expect(textoAviso(aviso('acompanamiento', { evento: 'rechazado', nombre: 'Lucía' }, ROSA, null)).titulo).toBe(
      'Lucía no aceptó la invitación',
    )
    const revocado = textoAviso(aviso('acompanamiento', { evento: 'revocado', nombre: 'Rosa' }, LUCIA, null))
    expect(revocado.titulo).toBe('Rosa dejó de compartir sus turnos con vos')
    expect(revocado.mensaje).toContain('Ya no vas a ver sus turnos')
  })

  it('disponibilidad y correo rechazado', () => {
    expect(textoAviso(aviso('disponibilidad', { ...TURNO, numero: undefined }), AHORA).titulo).toBe('Hay un turno de Médico clínico')
    const correo = textoAviso(aviso('correo', { correo: 'rosa@demo.ar' }, ROSA, null))
    expect(correo.titulo).toBe('Revisá tu correo electrónico')
    expect(correo.mensaje).toContain('No pudimos mandarte un correo a rosa@demo.ar.')
    expect(correo.mensaje).toContain('Los avisos te siguen llegando acá.')
  })

  it('nunca usa palabras que asusten', () => {
    for (const tipo of ['reserva', 'cancelacion', 'reprogramacion', 'recordatorio', 'disponibilidad', 'correo'] as const) {
      const { titulo, mensaje } = textoAviso(aviso(tipo, TURNO), AHORA)
      expect(`${titulo} ${mensaje}`).not.toMatch(/urgente|error|inválid|¡/i)
    }
  })
})

describe('leerDatosAviso y esCopiaDeAcompanante', () => {
  it('lo que no es un objeto queda sin datos', () => {
    expect(leerDatosAviso(null)).toEqual({})
    expect(leerDatosAviso([1])).toEqual({})
    expect(leerDatosAviso({ numero: 3 })).toEqual({ numero: 3 })
  })

  it('copia = el turno es de otra persona', () => {
    expect(esCopiaDeAcompanante({ usuarioId: LUCIA, solicitanteId: ROSA })).toBe(true)
    expect(esCopiaDeAcompanante({ usuarioId: ROSA, solicitanteId: ROSA })).toBe(false)
    expect(esCopiaDeAcompanante({ usuarioId: ROSA, solicitanteId: null })).toBe(false)
  })
})

describe('momentoRecordatorio', () => {
  it('resta la antelación al turno', () => {
    expect(momentoRecordatorio('2026-10-19T11:00:00Z', 24, AHORA)?.toISOString()).toBe('2026-10-18T11:00:00.000Z')
    expect(momentoRecordatorio('2026-10-19T11:00:00Z', 48, AHORA)?.toISOString()).toBe('2026-10-17T11:00:00.000Z')
  })

  it('si ese momento ya pasó, no hay recordatorio (ya está el aviso de la reserva)', () => {
    expect(momentoRecordatorio('2026-10-14T16:00:00Z', 24, AHORA)).toBeNull()
    expect(momentoRecordatorio('2026-10-14T16:00:00Z', 2, AHORA)?.toISOString()).toBe('2026-10-14T14:00:00.000Z')
  })
})

describe('comoAvisar', () => {
  it('visual: sin sonido; sonoro: sonido y lectura; ambos: lectura si la activó', () => {
    expect(comoAvisar('visual', true)).toEqual({ tono: false, voz: false })
    expect(comoAvisar('sonoro', false)).toEqual({ tono: true, voz: true })
    expect(comoAvisar('ambos', false)).toEqual({ tono: true, voz: false })
    expect(comoAvisar('ambos', true)).toEqual({ tono: true, voz: true })
  })
})

function notificacion(id: string, enviarDesde: string, cambios: Partial<Notificacion> = {}): Notificacion {
  return {
    id,
    tipo: 'reserva',
    datos: {},
    usuarioId: ROSA,
    solicitanteId: ROSA,
    reservaId: null,
    enviarDesde,
    entregadaEn: null,
    leidaEn: null,
    ...cambios,
  }
}

describe('banda y bandeja', () => {
  const viejo = notificacion('a', '2026-10-13T10:00:00Z', { entregadaEn: '2026-10-13T10:01:00Z' })
  const nuevo = notificacion('b', '2026-10-14T10:00:00Z')
  const leido = notificacion('c', '2026-10-14T11:00:00Z', { entregadaEn: '2026-10-14T11:00:00Z', leidaEn: '2026-10-14T11:05:00Z' })

  it('la banda muestra los sin leer y sin cerrar, del más nuevo al más viejo', () => {
    expect(avisosParaBanda([viejo, nuevo, leido], []).map((a) => a.id)).toEqual(['b', 'a'])
    expect(avisosParaBanda([viejo, nuevo, leido], ['b']).map((a) => a.id)).toEqual(['a'])
  })

  it('suena solo con los que nunca se mostraron', () => {
    expect(avisosSinEntregar([viejo, nuevo, leido]).map((a) => a.id)).toEqual(['b'])
  })

  it('la bandeja pone primero los sin leer', () => {
    expect(ordenarBandeja([leido, viejo, nuevo]).map((a) => a.id)).toEqual(['b', 'a', 'c'])
  })

  it('el contador se dice en palabras', () => {
    expect(textoContador(0)).toBe('Avisos, ninguno sin leer')
    expect(textoContador(1)).toBe('Avisos, 1 sin leer')
    expect(textoContador(3)).toBe('Avisos, 3 sin leer')
  })

  it('el historial dice enviado, visto y leído', () => {
    expect(historialAviso(leido)).toEqual([
      'Enviado el miércoles 14 de octubre de 2026, a las 8:00.',
      'Lo viste en la app el miércoles 14 de octubre de 2026, a las 8:00.',
      'Lo leíste el miércoles 14 de octubre de 2026, a las 8:05.',
    ])
    expect(historialAviso(nuevo)).toHaveLength(1)
  })
})

describe('mensajeReserva en modo acompañante', () => {
  it('sin permiso: dice el nombre y qué no puede', () => {
    expect(mensajeReserva('sin_permiso', { nombre: 'Rosa', accion: 'cancelar' })).toBe(
      'Rosa no te dio permiso para cancelar ni cambiar de fecha sus turnos. Pedile que lo cambie desde su cuenta.',
    )
    expect(mensajeReserva('sin_vinculo', { nombre: 'Rosa', accion: 'reservar' })).toBe('Rosa ya no comparte sus turnos con vos.')
    expect(mensajeReserva('superpuesto', { nombre: 'Rosa', accion: 'reservar' })).toContain('Rosa ya tiene otro turno')
  })

  it('sin contexto: los mensajes de siempre', () => {
    expect(mensajeReserva('tomado', { nombre: 'Rosa', accion: 'reservar' })).toBe('Ese turno lo tomó otra persona recién.')
    expect(mensajeReserva('sin_permiso')).toContain('No tenés permiso')
  })
})
