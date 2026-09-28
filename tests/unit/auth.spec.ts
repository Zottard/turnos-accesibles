import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { axe } from './axe'
import CampoClave from '~/components/auth/CampoClave.vue'

const primerError = (resultado: { success: boolean, error?: { issues: { message: string }[] } }) =>
  resultado.success ? undefined : resultado.error?.issues[0]?.message

describe('rutaSegura', () => {
  it('acepta rutas internas', () => {
    expect(rutaSegura('/admin')).toBe('/admin')
  })

  it('rechaza otros sitios y valores raros', () => {
    expect(rutaSegura('//ejemplo.com')).toBe('/inicio')
    expect(rutaSegura('https://ejemplo.com')).toBe('/inicio')
    expect(rutaSegura(['/admin'])).toBe('/inicio')
    expect(rutaSegura(undefined)).toBe('/inicio')
  })
})

describe('validaciones del registro', () => {
  it('el documento acepta puntos y espacios, pero no letras', () => {
    expect(SCHEMA_DOCUMENTO.safeParse({ documento: '12.345.678' }).success).toBe(true)
    expect(SCHEMA_DOCUMENTO.safeParse({ documento: '1234567' }).success).toBe(true)
    expect(primerError(SCHEMA_DOCUMENTO.safeParse({ documento: '12a45678' }))).toBe('El documento tiene 7 u 8 números. Escribilo sin letras.')
  })

  it('la fecha de nacimiento tiene que existir', () => {
    expect(SCHEMA_NACIMIENTO.safeParse({ dia: '14', mes: '3', anio: '1950' }).success).toBe(true)
    expect(primerError(SCHEMA_NACIMIENTO.safeParse({ dia: '31', mes: '2', anio: '1950' }))).toBe('Esa fecha no existe. Revisá el día y el mes.')
    expect(primerError(SCHEMA_NACIMIENTO.safeParse({ dia: '1', mes: '1', anio: '1850' }))).toBe('Revisá el año en que naciste.')
    expect(primerError(SCHEMA_NACIMIENTO.safeParse({ dia: '1', mes: '1', anio: '50' }))).toBe('Escribí el año con 4 números, por ejemplo: 1955.')
  })

  it('arma la fecha en formato ISO', () => {
    expect(fechaIso('4', '3', '1950')).toBe('1950-03-04')
  })

  it('la contraseña nueva pide al menos 8 caracteres', () => {
    expect(primerError(SCHEMA_CLAVE_NUEVA.safeParse({ clave: 'corta' }))).toBe('La contraseña tiene que tener al menos 8 letras o números.')
  })

  it('el correo explica cómo tiene que ser', () => {
    expect(primerError(SCHEMA_CORREO.safeParse({ email: 'nombre' }))).toContain('Tiene que tener una @')
  })

  it('hay que aceptar los términos', () => {
    expect(SCHEMA_TERMINOS.safeParse({ terminos: false }).success).toBe(false)
    expect(SCHEMA_TERMINOS.safeParse({ terminos: true }).success).toBe(true)
  })
})

describe('CampoClave', () => {
  it('muestra y oculta la contraseña', async () => {
    const wrapper = await mountSuspended(CampoClave, { props: { autocomplete: 'current-password' } })
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('password')
    await wrapper.get('button').trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(wrapper.get('button').text()).toBe('Ocultar')
  })

  it('no tiene violaciones de axe', async () => {
    const wrapper = await mountSuspended(CampoClave, {
      props: { autocomplete: 'current-password' },
      attrs: { 'aria-label': 'Contraseña' },
    })
    const resultado = await axe(wrapper.element, { rules: { label: { enabled: false } } })
    expect(resultado).toHaveNoViolations()
  })
})
