import { describe, expect, it } from 'vitest'
import {
  buscarEspecialidades,
  distanciaEdicion,
  elegirEspecialidad,
  nombreCompleto,
  normalizar,
  type Especialidad,
} from '../shared/utils/especialidades'

// Una parte del catálogo de prueba (supabase/seed.sql).
const LISTA: Especialidad[] = [
  {
    id: 1,
    nombre: 'Clínica médica',
    nombreSimple: 'Médico clínico',
    descripcion: '',
    palabrasClave: ['clinico', 'medico', 'doctor', 'fiebre', 'dolor'],
  },
  { id: 3, nombre: 'Oftalmología', nombreSimple: 'Oculista', descripcion: '', palabrasClave: ['ojos', 'vista', 'anteojos'] },
  {
    id: 4,
    nombre: 'Cardiología',
    nombreSimple: 'Médico del corazón',
    descripcion: '',
    palabrasClave: ['corazon', 'presion', 'pecho'],
  },
  {
    id: 5,
    nombre: 'Traumatología',
    nombreSimple: 'Huesos y articulaciones',
    descripcion: '',
    palabrasClave: ['huesos', 'rodilla', 'espalda', 'caida'],
  },
  { id: 7, nombre: 'Odontología', nombreSimple: 'Dentista', descripcion: '', palabrasClave: ['dientes', 'muela'] },
]

const ids = (lista: Especialidad[]) => lista.map((especialidad) => especialidad.id)

describe('normalizar', () => {
  it('pasa a minúsculas y saca tildes, signos y espacios de más', () => {
    expect(normalizar('  Oftalmología!! ')).toBe('oftalmologia')
    expect(normalizar('Me DUELE   la rodilla.')).toBe('me duele la rodilla')
    expect(normalizar('Uñas')).toBe('unas')
  })
})

describe('distanciaEdicion', () => {
  it('cuenta las letras que hay que cambiar', () => {
    expect(distanciaEdicion('cardiologia', 'cardiologia')).toBe(0)
    expect(distanciaEdicion('cardilogia', 'cardiologia')).toBe(1)
    expect(distanciaEdicion('ocualista', 'oculista')).toBe(1)
    expect(distanciaEdicion('', 'ojo')).toBe(3)
  })
})

describe('buscarEspecialidades', () => {
  it('encuentra por nombre técnico o simple, con o sin tildes', () => {
    expect(ids(buscarEspecialidades('cardiología', LISTA))).toEqual([4])
    expect(ids(buscarEspecialidades('CARDIOLOGIA', LISTA))).toEqual([4])
    expect(ids(buscarEspecialidades('oculista', LISTA))).toEqual([3])
  })

  it('sugiere mientras se escribe', () => {
    expect(ids(buscarEspecialidades('ocu', LISTA))).toEqual([3])
    expect(ids(buscarEspecialidades('dent', LISTA))).toEqual([7])
  })

  it('entiende palabras de todos los días', () => {
    expect(ids(buscarEspecialidades('corazón', LISTA))).toEqual([4])
    expect(ids(buscarEspecialidades('rodilla', LISTA))).toEqual([5])
    expect(ids(buscarEspecialidades('me duele la rodilla', LISTA))).toEqual([5])
    expect(ids(buscarEspecialidades('necesito un turno con el oculista', LISTA))).toEqual([3])
  })

  it('perdona errores de tipeo', () => {
    expect(ids(buscarEspecialidades('cardilogia', LISTA))).toEqual([4])
  })

  it('pone primero lo que coincide mejor', () => {
    // "medico" es el nombre de dos especialidades; "Médico clínico" además lo tiene como palabra clave.
    expect(ids(buscarEspecialidades('médico', LISTA))).toEqual([1, 4])
  })

  it('no devuelve nada con texto sin sentido o muy corto', () => {
    expect(buscarEspecialidades('xyzzz', LISTA)).toEqual([])
    expect(buscarEspecialidades('a', LISTA)).toEqual([])
    expect(buscarEspecialidades('   ', LISTA)).toEqual([])
  })
})

describe('elegirEspecialidad', () => {
  it('elige si escribió el nombre o si hay una sola que coincide', () => {
    expect(elegirEspecialidad('Cardiología', LISTA)?.id).toBe(4)
    expect(elegirEspecialidad('dentista', LISTA)?.id).toBe(7)
    expect(elegirEspecialidad('rodilla', LISTA)?.id).toBe(5)
  })

  it('no elige si hay dudas o no hay nada', () => {
    expect(elegirEspecialidad('médico', LISTA)).toBeNull()
    expect(elegirEspecialidad('xyzzz', LISTA)).toBeNull()
  })
})

describe('nombreCompleto', () => {
  it('muestra el nombre simple y entre paréntesis el técnico', () => {
    expect(nombreCompleto(LISTA[1]!)).toBe('Oculista (Oftalmología)')
  })

  it('si son casi iguales, muestra uno solo', () => {
    expect(nombreCompleto({ nombre: 'Nutrición', nombreSimple: 'Nutricionista' })).toBe('Nutricionista')
  })
})
