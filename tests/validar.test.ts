import { describe, expect, it } from 'vitest'
import {
  calcularEdad,
  limpiarDni,
  limpiarTelefono,
  rutaSegura,
  validarClave,
  validarCorreo,
  validarDni,
  validarFechaNacimiento,
  validarRequerido,
  validarTelefono,
} from '../app/utils/validar'

// Fecha fija para que los tests den siempre lo mismo: 14 de octubre de 2026.
const HOY = new Date(2026, 9, 14)

describe('validarCorreo', () => {
  it('acepta correos comunes, con espacios alrededor', () => {
    expect(validarCorreo('rosa@demo.ar')).toBeUndefined()
    expect(validarCorreo('  lucia.benitez+turnos@gmail.com ')).toBeUndefined()
  })

  it('pide el correo si está vacío', () => {
    expect(validarCorreo('   ')).toBe('Escribí tu correo electrónico.')
  })

  it('rechaza correos sin @, sin dominio o con espacios', () => {
    expect(validarCorreo('rosa')).toMatch(/Revisá el correo/)
    expect(validarCorreo('rosa@demo')).toMatch(/Revisá el correo/)
    expect(validarCorreo('rosa @demo.ar')).toMatch(/Revisá el correo/)
  })
})

describe('validarDni', () => {
  it('acepta 7 u 8 números, con o sin puntos', () => {
    expect(validarDni('5123456')).toBeUndefined()
    expect(validarDni('27.123.456')).toBeUndefined()
    expect(validarDni(' 27 123 456 ')).toBeUndefined()
  })

  it('pide el documento si está vacío', () => {
    expect(validarDni('')).toBe('Escribí tu número de documento.')
    expect(validarDni('..')).toBe('Escribí tu número de documento.')
  })

  it('rechaza letras y largos incorrectos', () => {
    expect(validarDni('123456')).toMatch(/7 u 8 números/)
    expect(validarDni('123456789')).toMatch(/7 u 8 números/)
    expect(validarDni('27A23456')).toMatch(/7 u 8 números/)
  })

  it('limpiarDni saca puntos y espacios', () => {
    expect(limpiarDni('27.123.456')).toBe('27123456')
  })
})

describe('validarClave', () => {
  it('acepta 8 caracteres con al menos un número', () => {
    expect(validarClave('Demo1234!')).toBeUndefined()
    expect(validarClave('abcdefg1')).toBeUndefined()
  })

  it('explica qué falta', () => {
    expect(validarClave('')).toBe('Escribí una contraseña.')
    expect(validarClave('abc1')).toMatch(/8 letras o números como mínimo/)
    expect(validarClave('sinnumeros')).toBe('Agregá al menos un número a la contraseña.')
  })
})

describe('validarFechaNacimiento', () => {
  it('acepta fechas reales en el pasado', () => {
    expect(validarFechaNacimiento('1948-03-12', HOY)).toBeUndefined()
    expect(validarFechaNacimiento('2000-02-29', HOY)).toBeUndefined()
    expect(validarFechaNacimiento('2026-10-14', HOY)).toBeUndefined()
  })

  it('pide la fecha si está vacía', () => {
    expect(validarFechaNacimiento('', HOY)).toBe('Escribí tu fecha de nacimiento.')
  })

  it('rechaza días que no existen y formatos raros', () => {
    expect(validarFechaNacimiento('2001-02-29', HOY)).toBe('Revisá la fecha. Ese día no existe.')
    expect(validarFechaNacimiento('1980-04-31', HOY)).toBe('Revisá la fecha. Ese día no existe.')
    expect(validarFechaNacimiento('12/03/1948', HOY)).toMatch(/Escribí el día, el mes y el año/)
  })

  it('rechaza fechas futuras y edades de más de 120 años', () => {
    expect(validarFechaNacimiento('2026-10-15', HOY)).toMatch(/después de hoy/)
    expect(validarFechaNacimiento('1900-01-01', HOY)).toBe('Revisá el año de nacimiento.')
    expect(validarFechaNacimiento('1906-10-14', HOY)).toBeUndefined()
  })

  it('calcularEdad cuenta solo los cumpleaños que ya pasaron', () => {
    expect(calcularEdad(new Date(1948, 2, 12), HOY)).toBe(78)
    expect(calcularEdad(new Date(1948, 9, 15), HOY)).toBe(77)
    expect(calcularEdad(new Date(1948, 9, 14), HOY)).toBe(78)
  })
})

describe('validarTelefono', () => {
  it('acepta entre 8 y 15 números, con espacios, guiones o paréntesis', () => {
    expect(validarTelefono('1145678901')).toBeUndefined()
    expect(validarTelefono('(011) 4567-8901')).toBeUndefined()
    expect(validarTelefono('+54 9 11 4567 8901')).toBeUndefined()
  })

  it('explica qué falta', () => {
    expect(validarTelefono('')).toBe('Escribí tu número de teléfono.')
    expect(validarTelefono('1234567')).toMatch(/entre 8 y 15 números/)
    expect(validarTelefono('11-4567-89AB')).toMatch(/entre 8 y 15 números/)
  })

  it('limpiarTelefono deja solo los números', () => {
    expect(limpiarTelefono('(011) 4567-8901')).toBe('01145678901')
  })
})

describe('validarRequerido', () => {
  it('devuelve el mensaje solo si está vacío', () => {
    expect(validarRequerido('Rosa', 'Escribí tu nombre.')).toBeUndefined()
    expect(validarRequerido('   ', 'Escribí tu nombre.')).toBe('Escribí tu nombre.')
  })
})

describe('rutaSegura', () => {
  it('acepta rutas de este sitio', () => {
    expect(rutaSegura('/perfil')).toBe('/perfil')
    expect(rutaSegura('/perfil/accesibilidad?x=1')).toBe('/perfil/accesibilidad?x=1')
  })

  it('rechaza otros sitios y valores raros', () => {
    expect(rutaSegura('https://malo.com')).toBe('/inicio')
    expect(rutaSegura('//malo.com')).toBe('/inicio')
    expect(rutaSegura('/\\malo.com')).toBe('/inicio')
    expect(rutaSegura('perfil')).toBe('/inicio')
    expect(rutaSegura(undefined)).toBe('/inicio')
    expect(rutaSegura(['/perfil'])).toBe('/inicio')
  })

  it('usa la ruta de reemplazo que se le pase', () => {
    expect(rutaSegura(null, '/')).toBe('/')
  })
})
