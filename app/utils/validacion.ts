import { z } from 'zod'

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const correo = z.string().trim()
  .min(1, 'Escribí tu correo.')
  .email('Revisá el correo. Tiene que tener una @ y un punto, por ejemplo: nombre@gmail.com')

const clave = z.string().min(1, 'Escribí tu contraseña.')

const claveNueva = z.string().min(8, 'La contraseña tiene que tener al menos 8 letras o números.')

export const SCHEMA_INGRESO = z.object({ email: correo, clave })

export const SCHEMA_CORREO = z.object({ email: correo })

export const SCHEMA_CLAVE_NUEVA = z.object({ clave: claveNueva })

export const SCHEMA_NOMBRE = z.object({
  nombre: z.string().trim().min(1, 'Escribí tu nombre.'),
  apellido: z.string().trim().min(1, 'Escribí tu apellido.'),
})

export const limpiarDocumento = (valor: string) => valor.replace(/[.\s-]/g, '')

export const SCHEMA_DOCUMENTO = z.object({
  documento: z.string()
    .min(1, 'Escribí tu número de documento.')
    .refine((v) => /^\d{7,8}$/.test(limpiarDocumento(v)), 'El documento tiene 7 u 8 números. Escribilo sin letras.'),
})

export const fechaIso = (dia: string, mes: string, anio: string) =>
  `${anio.padStart(4, '0')}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`

function fechaValida(dia: string, mes: string, anio: string) {
  const d = Number(dia), m = Number(mes), a = Number(anio)
  if (!d || !m || !a) return false
  const fecha = new Date(a, m - 1, d)
  return fecha.getFullYear() === a && fecha.getMonth() === m - 1 && fecha.getDate() === d
}

export const SCHEMA_NACIMIENTO = z.object({
  dia: z.string().min(1, 'Escribí el día.'),
  mes: z.string().min(1, 'Elegí el mes.'),
  anio: z.string().regex(/^\d{4}$/, 'Escribí el año con 4 números, por ejemplo: 1955.'),
}).superRefine(({ dia, mes, anio }, ctx) => {
  if (!dia || !mes || !/^\d{4}$/.test(anio)) return
  if (!fechaValida(dia, mes, anio)) {
    ctx.addIssue({ code: 'custom', path: ['dia'], message: 'Esa fecha no existe. Revisá el día y el mes.' })
    return
  }
  const anioActual = new Date().getFullYear()
  if (Number(anio) > anioActual || Number(anio) < anioActual - 120) {
    ctx.addIssue({ code: 'custom', path: ['anio'], message: 'Revisá el año en que naciste.' })
  }
})

export const SCHEMA_LOCALIDAD = z.object({
  localidad: z.number({ error: 'Elegí tu localidad de la lista.' }).min(1, 'Elegí tu localidad de la lista.'),
})

export const SCHEMA_REGISTRO_CORREO = z.object({ email: correo })

export const SCHEMA_TERMINOS = z.object({
  terminos: z.literal(true, { error: 'Para crear la cuenta tenés que aceptar los términos de uso.' }),
})

export const SCHEMA_PERFIL = SCHEMA_NOMBRE.extend({
  telefono: z.string().trim()
    .refine((v) => v === '' || /^[\d\s()+-]{8,20}$/.test(v), 'Escribí el teléfono con números. Por ejemplo: 11 4567 8901.'),
  localidad: z.number({ error: 'Elegí tu localidad.' }),
})

export const SCHEMA_INVITACION = z.object({ email: correo })

export const SCHEMA_CENTRO = z.object({
  nombre: z.string().trim().min(3, 'Escribí el nombre del centro.'),
  direccion: z.string().trim().min(3, 'Escribí la dirección.'),
  localidad: z.number({ error: 'Elegí la localidad.' }),
})

export const SCHEMA_ESPECIALIDAD = z.object({
  nombreComun: z.string().trim().min(2, 'Escribí cómo lo dice la gente. Por ejemplo: Oculista.'),
  nombreTecnico: z.string().trim().min(2, 'Escribí el nombre técnico. Por ejemplo: Oftalmología.'),
  descripcion: z.string().trim().min(5, 'Escribí para qué sirve, en una oración simple.'),
})

export const SCHEMA_PROFESIONAL = z.object({
  nombre: z.string().trim().min(1, 'Escribí el nombre.'),
  apellido: z.string().trim().min(1, 'Escribí el apellido.'),
  matricula: z.string().trim().min(3, 'Escribí la matrícula.'),
  especialidad: z.number({ error: 'Elegí la especialidad.' }),
})

export const SCHEMA_CONSULTA = z.object({
  mensaje: z.string().trim()
    .min(10, 'Contanos qué pasó en una o dos oraciones.')
    .max(2000, 'El mensaje es muy largo. Escribí lo más importante, hasta 2000 letras.'),
  correo: z.union([z.literal(''), correo]),
})
