import { describe, expect, it } from 'vitest'
import {
  conMayuscula,
  esCancelacionTardia,
  estadoVisible,
  mensajeReserva,
  proximaReserva,
  resumenReserva,
  separarReservas,
  type Reserva,
} from '../app/utils/reservas'
import {
  borradorNuevo,
  filtrosDelBorrador,
  normalizarBorrador,
  pasoIncompleto,
  segundosDesde,
  validarPaso,
} from '../app/utils/asistente'
import { mensajeErrorDictado } from '../app/utils/voz'

// Miércoles 14 de octubre de 2026, 10:00 en Argentina.
const AHORA = new Date('2026-10-14T13:00:00Z')

function reserva(numero: number, inicio: string, estado: Reserva['estado'] = 'confirmada'): Reserva {
  return {
    id: `id-${numero}`,
    numero,
    estado,
    canceladaTarde: false,
    asistida: false,
    creadaPorNombre: null,
    origenNumero: null,
    nuevaNumero: null,
    turnoId: numero * 10,
    inicio,
    duracionMin: 20,
    requisitos: ['Llevá tu DNI.'],
    profesional: 'Dra. Ana Pérez',
    especialidad: { id: 3, nombre: 'Oftalmología', nombreSimple: 'Oculista' },
    centro: {
      id: 1,
      nombre: 'Hospital de Pacheco',
      tipo: 'hospital',
      direccion: 'Av. Hipólito Yrigoyen 1450',
      localidad: 'General Pacheco',
      telefono: null,
      horario: null,
      accesibilidad: null,
      lat: -34.46,
      lng: -58.64,
    },
  }
}

describe('estadoVisible', () => {
  it('confirmado si es en el futuro; cumplido si ya pasó', () => {
    expect(estadoVisible(reserva(1, '2026-10-20T12:30:00Z'), AHORA)).toBe('proximo')
    expect(estadoVisible(reserva(1, '2026-10-10T12:30:00Z'), AHORA)).toBe('cumplido')
    expect(estadoVisible(reserva(1, '2026-10-10T12:30:00Z', 'completada'), AHORA)).toBe('cumplido')
  })

  it('cancelado y cambiado de fecha, aunque sea en el futuro', () => {
    expect(estadoVisible(reserva(1, '2026-10-20T12:30:00Z', 'cancelada'), AHORA)).toBe('cancelado')
    expect(estadoVisible(reserva(1, '2026-10-20T12:30:00Z', 'reprogramada'), AHORA)).toBe('reprogramado')
  })
})

describe('separarReservas y proximaReserva', () => {
  const lista = [
    reserva(1, '2026-10-01T12:00:00Z'),
    reserva(2, '2026-10-30T12:00:00Z'),
    reserva(3, '2026-10-20T12:00:00Z'),
    reserva(4, '2026-10-25T12:00:00Z', 'cancelada'),
    reserva(5, '2026-10-05T12:00:00Z', 'reprogramada'),
  ]

  it('próximos del más cercano al más lejano; anteriores del más nuevo al más viejo', () => {
    const { proximos, anteriores } = separarReservas(lista, AHORA)
    expect(proximos.map((r) => r.numero)).toEqual([3, 2])
    expect(anteriores.map((r) => r.numero)).toEqual([4, 5, 1])
  })

  it('el próximo turno es el confirmado más cercano', () => {
    expect(proximaReserva(lista, AHORA)?.numero).toBe(3)
    expect(proximaReserva([], AHORA)).toBeNull()
  })
})

describe('esCancelacionTardia', () => {
  it('menos de 24 horas es tarde', () => {
    expect(esCancelacionTardia('2026-10-15T12:00:00Z', AHORA)).toBe(true)
    expect(esCancelacionTardia('2026-10-15T13:00:00Z', AHORA)).toBe(false)
  })
})

describe('mensajeReserva', () => {
  it('explica cada motivo en lenguaje simple', () => {
    expect(mensajeReserva('tomado')).toBe('Ese turno lo tomó otra persona recién.')
    expect(mensajeReserva('ya_paso')).toContain('ya se cumplió o venció')
    expect(mensajeReserva('fuera_de_plazo')).toContain('24 horas')
    expect(mensajeReserva('superpuesto')).toContain('Ya tenés otro turno')
  })

  it('lo que no conoce es un problema de conexión', () => {
    expect(mensajeReserva('cualquier cosa')).toContain('Revisá tu conexión')
  })
})

describe('resumenReserva', () => {
  it('arma el texto para leer en voz alta', () => {
    expect(resumenReserva(reserva(123, '2026-10-20T12:30:00Z'), AHORA)).toBe(
      'Turno número 123. Oculista (Oftalmología), con Dra. Ana Pérez. Martes 20 de octubre, a las 9:30. ' +
        'En Hospital de Pacheco, Av. Hipólito Yrigoyen 1450, General Pacheco. Qué llevar: Llevá tu DNI.',
    )
  })

  it('conMayuscula pone la primera letra en mayúscula', () => {
    expect(conMayuscula('mañana, jueves')).toBe('Mañana, jueves')
    expect(conMayuscula('')).toBe('')
  })
})

describe('validarPaso', () => {
  const vacio = borradorNuevo(0)

  it('el paso 1 pide la especialidad', () => {
    expect(validarPaso(1, vacio)).toContain('Elegí qué médico')
    expect(validarPaso(1, { ...vacio, especialidadId: 3 })).toBeUndefined()
  })

  it('el paso 2 (dónde) es opcional', () => {
    expect(validarPaso(2, vacio)).toBeUndefined()
  })

  it('el paso 3 pide un turno y el último pide todo', () => {
    expect(validarPaso(3, vacio)).toBe('Elegí uno de los turnos de la lista.')
    expect(validarPaso(4, { ...vacio, especialidadId: 3 })).toBe('Falta elegir el día y la hora del turno.')
    expect(validarPaso(4, { ...vacio, especialidadId: 3, turnoId: 99 })).toBeUndefined()
  })

  it('pasoIncompleto dice a qué paso volver', () => {
    expect(pasoIncompleto(vacio)).toBe(1)
    expect(pasoIncompleto({ ...vacio, especialidadId: 3 })).toBe(3)
    expect(pasoIncompleto({ ...vacio, especialidadId: 3, turnoId: 99 })).toBeNull()
  })
})

describe('normalizarBorrador', () => {
  const ahora = 1_000_000

  it('recupera un borrador guardado', () => {
    const guardado = { ...borradorNuevo(500), paso: 4, especialidadId: 3, turnoId: 99, franja: 'tarde', desde: '2026-10-20' }
    expect(normalizarBorrador(JSON.parse(JSON.stringify(guardado)), ahora)).toEqual(guardado)
  })

  it('descarta lo que no entiende', () => {
    const roto = normalizarBorrador({ paso: 9, especialidadId: '3', franja: 'noche', desde: 'ayer', lat: -34.4 }, ahora)
    expect(roto).toEqual(borradorNuevo(ahora))
    expect(normalizarBorrador(null, ahora)).toEqual(borradorNuevo(ahora))
    expect(normalizarBorrador('basura', ahora)).toEqual(borradorNuevo(ahora))
  })

  it('modo acompañante: el borrador es de una persona; si cambió, se descarta', () => {
    const paraRosa = { ...borradorNuevo(500, 'rosa'), paso: 4, especialidadId: 3, turnoId: 99 }
    expect(normalizarBorrador(paraRosa, ahora, 'rosa')).toEqual(paraRosa)
    expect(normalizarBorrador(paraRosa, ahora, null)).toEqual(borradorNuevo(ahora, null))
    expect(normalizarBorrador(paraRosa, ahora, 'otra')).toEqual(borradorNuevo(ahora, 'otra'))
    const propio = { ...borradorNuevo(500), paso: 2 }
    expect(normalizarBorrador(propio, ahora, 'rosa').paso).toBe(0)
  })

  it('arma los filtros de la búsqueda', () => {
    const filtros = filtrosDelBorrador({ ...borradorNuevo(0), especialidadId: 3, localidad: 'Tigre', franja: 'manana' })
    expect(filtros).toMatchObject({ especialidadId: 3, localidad: 'Tigre', franja: 'manana', centroId: null, hasta: '' })
  })

  it('cuenta los segundos desde que empezó', () => {
    expect(segundosDesde(1_000, 61_400)).toBe(60)
    expect(segundosDesde(5_000, 1_000)).toBe(0)
  })
})

describe('mensajeErrorDictado', () => {
  it('explica por qué no se pudo dictar', () => {
    expect(mensajeErrorDictado('not-allowed')).toContain('permiso')
    expect(mensajeErrorDictado('no-speech')).toContain('No escuchamos nada')
    expect(mensajeErrorDictado('otro')).toContain('escribilo en el cuadro')
  })
})
