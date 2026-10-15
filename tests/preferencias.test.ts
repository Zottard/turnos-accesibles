import { describe, expect, it } from 'vitest'
import { normalizarPreferencias, PREFERENCIAS_PREDETERMINADAS } from '../app/utils/preferencias'

describe('normalizarPreferencias', () => {
  it('devuelve las preferencias recomendadas si no hay nada guardado', () => {
    expect(normalizarPreferencias(undefined)).toEqual(PREFERENCIAS_PREDETERMINADAS)
    expect(normalizarPreferencias(null)).toEqual(PREFERENCIAS_PREDETERMINADAS)
  })

  it('devuelve las recomendadas si llega basura', () => {
    expect(normalizarPreferencias('hola')).toEqual(PREFERENCIAS_PREDETERMINADAS)
    expect(normalizarPreferencias(42)).toEqual(PREFERENCIAS_PREDETERMINADAS)
    expect(normalizarPreferencias([1, 2, 3])).toEqual(PREFERENCIAS_PREDETERMINADAS)
  })

  it('el perfil recomendado tiene texto ampliado y sin animaciones', () => {
    expect(PREFERENCIAS_PREDETERMINADAS.tamanoTexto).toBe(125)
    expect(PREFERENCIAS_PREDETERMINADAS.reducirMovimiento).toBe(true)
    expect(PREFERENCIAS_PREDETERMINADAS.lenguajeSimple).toBe(true)
  })

  it('no devuelve el mismo objeto de las recomendadas (se puede modificar sin romperlas)', () => {
    expect(normalizarPreferencias(undefined)).not.toBe(PREFERENCIAS_PREDETERMINADAS)
  })

  it('conserva los valores válidos', () => {
    const validas = {
      tamanoTexto: 200,
      altoContraste: true,
      reducirMovimiento: false,
      lecturaVoz: true,
      velocidadVoz: 1.2,
      lenguajeSimple: false,
    }
    expect(normalizarPreferencias(validas)).toEqual(validas)
  })

  it('lleva el tamaño de texto al permitido más cercano', () => {
    expect(normalizarPreferencias({ tamanoTexto: 160 }).tamanoTexto).toBe(150)
    expect(normalizarPreferencias({ tamanoTexto: 999 }).tamanoTexto).toBe(200)
    expect(normalizarPreferencias({ tamanoTexto: 10 }).tamanoTexto).toBe(100)
    expect(normalizarPreferencias({ tamanoTexto: '150' }).tamanoTexto).toBe(125)
    expect(normalizarPreferencias({ tamanoTexto: Number.NaN }).tamanoTexto).toBe(125)
  })

  it('limita la velocidad de la voz entre 0,7 y 1,3', () => {
    expect(normalizarPreferencias({ velocidadVoz: 5 }).velocidadVoz).toBe(1.3)
    expect(normalizarPreferencias({ velocidadVoz: 0.1 }).velocidadVoz).toBe(0.7)
    expect(normalizarPreferencias({ velocidadVoz: 1.04 }).velocidadVoz).toBe(1)
    expect(normalizarPreferencias({ velocidadVoz: 'rápido' }).velocidadVoz).toBe(0.9)
    expect(normalizarPreferencias({ velocidadVoz: Number.POSITIVE_INFINITY }).velocidadVoz).toBe(0.9)
  })

  it('reemplaza los sí/no que no son booleanos', () => {
    const resultado = normalizarPreferencias({ altoContraste: 'true', reducirMovimiento: 0, lecturaVoz: null })
    expect(resultado.altoContraste).toBe(false)
    expect(resultado.reducirMovimiento).toBe(true)
    expect(resultado.lecturaVoz).toBe(false)
  })

  it('completa lo que falta e ignora claves desconocidas', () => {
    const resultado = normalizarPreferencias({ altoContraste: true, colorFavorito: 'rojo' })
    expect(resultado).toEqual({ ...PREFERENCIAS_PREDETERMINADAS, altoContraste: true })
  })
})
