import { describe, expect, it } from 'vitest'
import {
  cantidadEnPalabras,
  distanciaEnPalabras,
  enlaceComoLlegar,
  FILTROS_VACIOS,
  filtrosDesdeQuery,
  listaRequisitos,
  queryDesdeFiltros,
  resumenParaLeer,
  type TurnoEncontrado,
} from '../app/utils/turnos'

const AHORA = new Date('2026-10-14T13:00:00Z')

const TURNO: TurnoEncontrado = {
  id: 10,
  inicio: '2026-10-15T11:00:00Z',
  centroId: 1,
  centroNombre: 'Hospital Municipal de Pacheco (demo)',
  centroDireccion: 'Av. Hipólito Yrigoyen 2150',
  centroLocalidad: 'General Pacheco',
  especialidadNombre: 'Cardiología',
  especialidadNombreSimple: 'Médico del corazón',
  profesional: 'Dra. Silvia Romero',
  distanciaKm: 2.34,
  requisitos: 'Llevá tu DNI.\nTraé tus estudios.',
}

describe('filtros en la dirección', () => {
  it('ida y vuelta: lo que se guarda en la dirección se vuelve a leer igual', () => {
    const filtros = {
      ...FILTROS_VACIOS,
      especialidadId: 4,
      localidad: 'General Pacheco',
      centroId: 2,
      desde: '2026-10-20',
      hasta: '2026-10-30',
      franja: 'manana' as const,
    }
    const query = queryDesdeFiltros(filtros)
    expect(query).toEqual({
      esp: '4',
      loc: 'General Pacheco',
      centro: '2',
      desde: '2026-10-20',
      hasta: '2026-10-30',
      franja: 'manana',
    })
    expect(filtrosDesdeQuery(query)).toEqual(filtros)
  })

  it('redondea la ubicación a 2 decimales y no guarda la localidad si hay ubicación', () => {
    const query = queryDesdeFiltros({ ...FILTROS_VACIOS, especialidadId: 1, lat: -34.46061, lng: -58.64408, localidad: 'Tigre' })
    expect(query).toEqual({ esp: '1', lat: '-34.46', lng: '-58.64' })
  })

  it('guarda el texto solo si no eligió especialidad', () => {
    expect(queryDesdeFiltros({ ...FILTROS_VACIOS, texto: 'xyz' })).toEqual({ q: 'xyz' })
    expect(queryDesdeFiltros({ ...FILTROS_VACIOS, texto: 'xyz', especialidadId: 3 })).toEqual({ esp: '3' })
  })

  it('ignora lo que no entiende', () => {
    expect(filtrosDesdeQuery({ esp: 'abc', desde: '20/10/2026', franja: 'noche', lat: '-34', centro: ['1'] })).toEqual(
      FILTROS_VACIOS,
    )
  })
})

describe('distanciaEnPalabras', () => {
  it('escribe la distancia con coma decimal', () => {
    expect(distanciaEnPalabras(2.34)).toBe('a 2,3 km')
    expect(distanciaEnPalabras(0.4)).toBe('a menos de 1 km')
    expect(distanciaEnPalabras(12.6)).toBe('a 13 km')
    expect(distanciaEnPalabras(null)).toBe('')
  })
})

describe('cantidadEnPalabras', () => {
  it('usa singular y plural', () => {
    expect(cantidadEnPalabras(0)).toBe('No encontramos turnos')
    expect(cantidadEnPalabras(1)).toBe('Encontramos 1 turno')
    expect(cantidadEnPalabras(12)).toBe('Encontramos 12 turnos')
  })
})

describe('resumenParaLeer', () => {
  it('lee la cantidad y los primeros turnos', () => {
    const segundo = { ...TURNO, id: 11, inicio: '2026-10-20T16:00:00Z', distanciaKm: null }
    expect(resumenParaLeer([TURNO, segundo], AHORA)).toBe(
      'Encontramos 2 turnos de Médico del corazón. ' +
        'El primero: mañana, jueves 15 de octubre, a las 8:00, en Hospital Municipal de Pacheco (demo), ' +
        'General Pacheco, a 2,3 km, con Dra. Silvia Romero. ' +
        'El segundo: martes 20 de octubre, a las 13:00, en Hospital Municipal de Pacheco (demo), ' +
        'General Pacheco, con Dra. Silvia Romero.',
    )
  })

  it('sin turnos', () => {
    expect(resumenParaLeer([], AHORA)).toBe('No encontramos turnos.')
  })
})

describe('listaRequisitos', () => {
  it('separa un requisito por renglón', () => {
    expect(listaRequisitos('Llevá tu DNI.\n Traé tus estudios. \n\n')).toEqual(['Llevá tu DNI.', 'Traé tus estudios.'])
  })

  it('si no hay requisitos, pide el DNI', () => {
    expect(listaRequisitos(null)).toEqual(['Llevá tu DNI.'])
  })
})

describe('enlaceComoLlegar', () => {
  it('arma el enlace de Google Maps con el destino', () => {
    expect(enlaceComoLlegar(-34.4588, -58.6461)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.4588,-58.6461',
    )
  })
})
