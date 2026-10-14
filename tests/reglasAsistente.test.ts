import { describe, expect, it } from 'vitest'
import type { Especialidad } from '../shared/utils/especialidades'
import {
  armarPedido,
  explicarPedido,
  interpretarConReglas,
  validarRespuestaIA,
} from '../shared/utils/reglasAsistente'

// El catálogo de prueba (supabase/seed.sql), sin las descripciones.
const ESPECIALIDADES: Especialidad[] = [
  ['Clínica médica', 'Médico clínico', 'clinico clinica medico doctor generalista control chequeo fiebre gripe tos dolor cansancio analisis panza estomago diarrea'],
  ['Pediatría', 'Médico de chicos', 'pediatra chicos chico nene nena bebe hijo hija nieto nieta vacunas'],
  ['Oftalmología', 'Oculista', 'ojos ojo vista anteojos lentes oculista borroso cataratas lagrimeo'],
  ['Cardiología', 'Médico del corazón', 'corazon presion hipertension palpitaciones pecho arritmia cardiologo electrocardiograma colesterol'],
  ['Traumatología', 'Huesos y articulaciones', 'huesos hueso rodilla cadera espalda cintura columna hombro tobillo fractura esguince caida golpe articulaciones traumatologo'],
  ['Ginecología', 'Salud de la mujer', 'ginecologo ginecologa mujer papanicolaou pap embarazo menopausia mamas anticonceptivos'],
  ['Odontología', 'Dentista', 'dientes diente muela muelas encias dentista odontologo caries dentadura'],
  ['Dermatología', 'Médico de la piel', 'piel lunar lunares manchas granos alergia picazon unas pelo dermatologo sarpullido'],
  ['Otorrinolaringología', 'Oídos, nariz y garganta', 'oidos oido sordera nariz garganta mareos vertigo ronquidos sinusitis anginas otorrino'],
  ['Kinesiología', 'Rehabilitación', 'kinesiologo kine rehabilitacion ejercicios masajes contractura movilidad'],
  ['Nutrición', 'Nutricionista', 'nutricionista dieta comida alimentacion peso adelgazar diabetes azucar panza'],
  ['Salud mental', 'Psicólogo', 'psicologo psicologa psicologia angustia ansiedad tristeza depresion nervios estres insomnio terapia'],
].map(([nombre, nombreSimple, claves], indice) => ({
  id: indice + 1,
  nombre: nombre!,
  nombreSimple: nombreSimple!,
  descripcion: '',
  palabrasClave: claves!.split(' '),
}))

const CLINICA = 1
const PEDIATRIA = 2
const OCULISTA = 3
const CARDIOLOGIA = 4
const TRAUMATOLOGIA = 5
const DENTISTA = 7
const PSICOLOGO = 12

// "Ahora" fijo: miércoles 14 de octubre de 2026, 10:00 en Argentina.
const AHORA = new Date('2026-10-14T13:00:00Z')

const leer = (texto: string) => interpretarConReglas(texto, ESPECIALIDADES, AHORA)

describe('interpretarConReglas: la especialidad', () => {
  it.each([
    ['necesito un turno con el oculista cerca de casa', OCULISTA],
    ['me duele la rodilla', TRAUMATOLOGIA],
    ['algo para la presión a la tarde', CARDIOLOGIA],
    ['dentista mañana', DENTISTA],
    ['turno para mi nene', PEDIATRIA],
    ['Quiero ver al CARDIÓLOGO', CARDIOLOGIA],
    ['no veo bien de lejos, se me pone borroso', OCULISTA],
    ['tengo fiebre y tos hace dos días', CLINICA],
    ['me duele una muela', DENTISTA],
    ['ando con mucha ansiedad y no duermo', PSICOLOGO],
    ['necesito un control con el médico clínico el lunes', CLINICA],
    ['cardilogia', CARDIOLOGIA],
  ])('"%s"', (texto, esperada) => {
    expect(leer(texto).especialidadId).toBe(esperada)
  })

  it('no inventa una especialidad si no entiende', () => {
    expect(leer('hola, quería preguntar algo').especialidadId).toBeNull()
    expect(leer('xyzzz').especialidadId).toBeNull()
    expect(leer('').especialidadId).toBeNull()
  })

  it('"mañana" y "tarde" no se confunden con una especialidad', () => {
    expect(leer('mañana a la tarde').especialidadId).toBeNull()
  })
})

describe('interpretarConReglas: cerca, franja y día', () => {
  it('entiende "cerca de casa"', () => {
    expect(leer('necesito un turno con el oculista cerca de casa').cerca).toBe(true)
    expect(leer('un dentista cerquita').cerca).toBe(true)
    expect(leer('dentista').cerca).toBe(false)
  })

  it('entiende a la mañana y a la tarde', () => {
    expect(leer('algo para la presión a la tarde').franja).toBe('tarde')
    expect(leer('oculista a la mañana').franja).toBe('manana')
    expect(leer('oculista bien temprano').franja).toBe('manana')
    expect(leer('oculista').franja).toBeNull()
  })

  it('entiende hoy, mañana y pasado mañana (en hora argentina)', () => {
    expect(leer('dentista hoy').desde).toBe('2026-10-14')
    expect(leer('dentista mañana').desde).toBe('2026-10-15')
    expect(leer('dentista pasado mañana').desde).toBe('2026-10-16')
  })

  it('"mañana a la mañana" es el día y la franja', () => {
    expect(leer('dentista mañana a la mañana')).toMatchObject({ desde: '2026-10-15', franja: 'manana' })
  })

  it('entiende días de la semana y "la semana que viene"', () => {
    expect(leer('oculista el viernes').desde).toBe('2026-10-16')
    expect(leer('oculista este lunes').desde).toBe('2026-10-19')
    expect(leer('oculista el próximo jueves').desde).toBe('2026-10-15')
    expect(leer('oculista la semana que viene').desde).toBe('2026-10-19')
  })

  it('"lo antes posible" no pone fecha', () => {
    expect(leer('oculista lo antes posible')).toMatchObject({ especialidadId: OCULISTA, desde: null })
  })
})

describe('validarRespuestaIA', () => {
  const valida = { especialidadId: OCULISTA, cerca: true, franja: 'manana', desde: '2026-10-20' }

  it('acepta una respuesta correcta y traduce los "no sé"', () => {
    expect(validarRespuestaIA(valida, ESPECIALIDADES, AHORA)).toEqual({
      especialidadId: OCULISTA,
      cerca: true,
      franja: 'manana',
      desde: '2026-10-20',
    })
    expect(
      validarRespuestaIA({ especialidadId: 0, cerca: false, franja: 'cualquiera', desde: '' }, ESPECIALIDADES, AHORA),
    ).toEqual({ especialidadId: null, cerca: false, franja: null, desde: null })
  })

  it('rechaza especialidades que no existen', () => {
    expect(validarRespuestaIA({ ...valida, especialidadId: 99 }, ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA({ ...valida, especialidadId: '3' }, ESPECIALIDADES, AHORA)).toBeNull()
  })

  it('rechaza franjas y fechas raras', () => {
    expect(validarRespuestaIA({ ...valida, franja: 'noche' }, ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA({ ...valida, desde: '2026-10-01' }, ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA({ ...valida, desde: '2026-02-30' }, ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA({ ...valida, desde: '20/10/2026' }, ESPECIALIDADES, AHORA)).toBeNull()
  })

  it('rechaza lo que no es un objeto o le faltan datos', () => {
    expect(validarRespuestaIA(null, ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA('oculista', ESPECIALIDADES, AHORA)).toBeNull()
    expect(validarRespuestaIA({ especialidadId: OCULISTA }, ESPECIALIDADES, AHORA)).toBeNull()
  })
})

describe('explicarPedido', () => {
  it('dice lo que entendimos en una frase', () => {
    expect(explicarPedido(leer('necesito un turno con el oculista cerca de casa, a la mañana'), ESPECIALIDADES, AHORA)).toBe(
      'Entendimos que buscás un turno de Oculista (Oftalmología), cerca de tu casa, a la mañana.',
    )
    expect(explicarPedido(leer('dentista mañana'), ESPECIALIDADES, AHORA)).toBe(
      'Entendimos que buscás un turno de Dentista (Odontología), desde mañana, jueves 15 de octubre.',
    )
    expect(explicarPedido(leer('oculista el martes'), ESPECIALIDADES, AHORA)).toBe(
      'Entendimos que buscás un turno de Oculista (Oftalmología), desde el martes 20 de octubre.',
    )
  })

  it('si no sabe la especialidad, lo dice', () => {
    expect(explicarPedido(leer('hola'), ESPECIALIDADES, AHORA)).toBe('No entendimos qué médico necesitás.')
    expect(explicarPedido(leer('algo a la tarde'), ESPECIALIDADES, AHORA)).toBe(
      'No entendimos qué médico necesitás. Sí entendimos que lo querés a la tarde.',
    )
  })
})

describe('armarPedido', () => {
  it('agrega la fuente, si entendió y la explicación', () => {
    const pedido = armarPedido(leer('turno para mi nene'), 'reglas', ESPECIALIDADES, AHORA)
    expect(pedido).toMatchObject({ especialidadId: PEDIATRIA, fuente: 'reglas', entendido: true })
    expect(pedido.explicacion).toBe('Entendimos que buscás un turno de Médico de chicos (Pediatría).')
    expect(armarPedido(leer('hola'), 'reglas', ESPECIALIDADES, AHORA).entendido).toBe(false)
  })
})
