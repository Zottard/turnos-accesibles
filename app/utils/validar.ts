// Validaciones de los formularios de cuenta (registro, ingreso, perfil).
// Cada función devuelve el mensaje de error en lenguaje simple, o `undefined` si el dato está bien.
// Son funciones puras para poder probarlas con Vitest (tests/validar.test.ts).

export type ResultadoValidacion = string | undefined

/** Saca puntos y espacios del documento: "12.345.678" → "12345678". */
export function limpiarDni(dni: string): string {
  return dni.replace(/[.\s]/g, '')
}

/** Saca espacios, guiones, paréntesis y el "+" del teléfono: "(011) 4567-8901" → "01145678901". */
export function limpiarTelefono(telefono: string): string {
  return telefono.replace(/[\s\-()+]/g, '')
}

/** Para nombre, apellido y localidad: solo pide que no esté vacío. */
export function validarRequerido(valor: string, mensaje: string): ResultadoValidacion {
  return valor.trim() === '' ? mensaje : undefined
}

export function validarCorreo(correo: string): ResultadoValidacion {
  const limpio = correo.trim()
  if (limpio === '') {
    return 'Escribí tu correo electrónico.'
  }
  // Algo antes de la @, algo después y un punto en el dominio. Sin espacios.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
    return 'Revisá el correo. Tiene que ser parecido a nombre@ejemplo.com.'
  }
  return undefined
}

export function validarDni(dni: string): ResultadoValidacion {
  const limpio = limpiarDni(dni)
  if (limpio === '') {
    return 'Escribí tu número de documento.'
  }
  if (!/^\d{7,8}$/.test(limpio)) {
    return 'El documento tiene que tener 7 u 8 números, sin letras.'
  }
  return undefined
}

export function validarClave(clave: string): ResultadoValidacion {
  if (clave === '') {
    return 'Escribí una contraseña.'
  }
  if (clave.length < 8) {
    return 'La contraseña tiene que tener 8 letras o números como mínimo.'
  }
  if (!/\d/.test(clave)) {
    return 'Agregá al menos un número a la contraseña.'
  }
  return undefined
}

/**
 * La fecha llega como la da el campo de fecha del navegador: "AAAA-MM-DD".
 * `hoy` se puede pasar para probar la función con una fecha fija.
 */
export function validarFechaNacimiento(fecha: string, hoy = new Date()): ResultadoValidacion {
  if (fecha.trim() === '') {
    return 'Escribí tu fecha de nacimiento.'
  }
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim())
  if (!partes) {
    return 'Revisá la fecha. Escribí el día, el mes y el año.'
  }
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])

  // Si el día no existe (por ejemplo, 31 de abril), la fecha "se corre" y no coincide.
  const nacimiento = new Date(anio, mes - 1, dia)
  if (nacimiento.getFullYear() !== anio || nacimiento.getMonth() !== mes - 1 || nacimiento.getDate() !== dia) {
    return 'Revisá la fecha. Ese día no existe.'
  }

  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (nacimiento > inicioDeHoy) {
    return 'La fecha de nacimiento no puede ser después de hoy.'
  }
  if (calcularEdad(nacimiento, hoy) > 120) {
    return 'Revisá el año de nacimiento.'
  }
  return undefined
}

/** Años cumplidos a la fecha `hoy`. */
export function calcularEdad(nacimiento: Date, hoy = new Date()): number {
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const yaCumplio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate())
  if (!yaCumplio) {
    edad -= 1
  }
  return edad
}

export function validarTelefono(telefono: string): ResultadoValidacion {
  const limpio = limpiarTelefono(telefono)
  if (limpio === '') {
    return 'Escribí tu número de teléfono.'
  }
  if (!/^\d{8,15}$/.test(limpio)) {
    return 'El teléfono tiene que tener entre 8 y 15 números, con el código de área.'
  }
  return undefined
}

/**
 * Para el `?volver=` del ingreso: solo aceptamos rutas de este sitio ("/perfil").
 * Así nadie puede armar un enlace que, después de ingresar, te lleve a otra página.
 */
export function rutaSegura(ruta: unknown, siNo = '/inicio'): string {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\')) {
    return siNo
  }
  return ruta
}
