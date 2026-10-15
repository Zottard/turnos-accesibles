import { describe, expect, it } from 'vitest'
import {
  CENTRO_VACIO,
  ESPECIALIDAD_VACIA,
  faltantesParaPublicar,
  leerBajaFrenada,
  leerNumero,
  listaEnPalabras,
  mensajeAdmin,
  minutosDelDia,
  palabrasClaveDesdeTexto,
  textoAuditoria,
  validarAgenda,
  validarCentro,
  validarEspecialidad,
  validarProfesional,
  vistaPreviaAgenda,
  type DatosAgenda,
} from '../app/utils/admin'

// 14 de octubre de 2026, 10:00 en Argentina (miércoles).
const AHORA = new Date('2026-10-14T13:00:00Z')
const HOY = '2026-10-14'

const CENTRO_COMPLETO = {
  ...CENTRO_VACIO,
  nombre: 'Centro de prueba',
  tipo: 'centro_de_salud',
  direccion: 'Calle 123',
  localidad: 'Tigre',
  telefono: '011 4444-5555',
  horario: 'Lunes a viernes de 8 a 16',
  accesibilidad: 'Rampa en la entrada.',
}

describe('validarCentro y faltantesParaPublicar', () => {
  it('un centro completo no tiene errores ni faltantes', () => {
    expect(validarCentro(CENTRO_COMPLETO)).toEqual([])
    expect(faltantesParaPublicar(CENTRO_COMPLETO)).toEqual([])
  })

  it('pide nombre, tipo, dirección y localidad, con el id de cada campo', () => {
    const errores = validarCentro({ ...CENTRO_VACIO, nombre: '   ' })
    expect(errores.map((error) => error.id)).toEqual(['centro-nombre', 'centro-tipo', 'centro-direccion', 'centro-localidad'])
  })

  it('las coordenadas son opcionales, pero si se escriben tienen que ser números válidos', () => {
    expect(validarCentro({ ...CENTRO_COMPLETO, lat: '-34,46', lng: '-58.64' })).toEqual([])
    expect(validarCentro({ ...CENTRO_COMPLETO, lat: '-34,46' }).map((e) => e.id)).toEqual(['centro-lng'])
    expect(validarCentro({ ...CENTRO_COMPLETO, lat: '120', lng: 'abc' }).map((e) => e.id)).toEqual(['centro-lat', 'centro-lng'])
    expect(leerNumero(' -34,4606 ')).toBe(-34.4606)
    expect(leerNumero('1e5')).toBeNull()
  })

  it('sin teléfono, horario o accesibilidad se guarda pero no se publica', () => {
    const faltan = faltantesParaPublicar({ telefono: '', horario: ' ', accesibilidad: 'Rampa.' })
    expect(faltan).toEqual(['el teléfono', 'el horario de atención'])
    expect(listaEnPalabras(faltan)).toBe('el teléfono y el horario de atención')
    expect(listaEnPalabras(['a', 'b', 'c'])).toBe('a, b y c')
    expect(listaEnPalabras(['a'])).toBe('a')
  })
})

describe('especialidades y profesionales', () => {
  it('validarEspecialidad pide los tres textos', () => {
    expect(validarEspecialidad({ ...ESPECIALIDAD_VACIA }).map((e) => e.id)).toEqual([
      'especialidad-nombre',
      'especialidad-simple',
      'especialidad-descripcion',
    ])
    expect(
      validarEspecialidad({ ...ESPECIALIDAD_VACIA, nombre: 'Oftalmología', nombreSimple: 'Oculista', descripcion: 'Ojos.' }),
    ).toEqual([])
  })

  it('palabrasClaveDesdeTexto separa por comas, en minúscula, sin tildes y sin repetir', () => {
    expect(palabrasClaveDesdeTexto('Ojos, vista ,  ANTEOJOS, ojos,, Visión')).toEqual(['ojos', 'vista', 'anteojos', 'vision'])
    expect(palabrasClaveDesdeTexto('   ')).toEqual([])
  })

  it('validarProfesional pide nombre, especialidad y centro', () => {
    expect(validarProfesional({ nombre: '', especialidadId: null, centroId: null }).length).toBe(3)
    expect(validarProfesional({ nombre: 'Dra. Ana Pérez', especialidadId: 1, centroId: 2 })).toEqual([])
  })
})

const AGENDA: DatosAgenda = {
  profesionalId: 5,
  desde: '2026-10-19', // lunes
  hasta: '2026-10-25', // domingo
  dias: ['1', '3', '5'],
  horaDesde: '08:00',
  horaHasta: '10:00',
  duracion: '30',
  requisitos: '',
}

describe('agendas', () => {
  it('minutosDelDia lee horas HH:MM', () => {
    expect(minutosDelDia('08:30')).toBe(510)
    expect(minutosDelDia('8:05')).toBe(485)
    expect(minutosDelDia('24:00')).toBeNull()
    expect(minutosDelDia('ocho')).toBeNull()
  })

  it('una agenda correcta no tiene errores', () => {
    expect(validarAgenda(AGENDA, HOY)).toEqual([])
  })

  it('explica cada problema', () => {
    const ids = (datos: Partial<DatosAgenda>) => validarAgenda({ ...AGENDA, ...datos }, HOY).map((e) => e.id)
    expect(ids({ profesionalId: null })).toEqual(['agenda-profesional'])
    expect(ids({ desde: '2026-10-01' })).toEqual(['agenda-desde'])
    expect(ids({ hasta: '2026-10-18' })).toEqual(['agenda-hasta'])
    expect(ids({ hasta: '2027-02-01' })).toEqual(['agenda-hasta'])
    expect(ids({ dias: [] })).toEqual(['agenda-dias'])
    expect(ids({ horaHasta: '08:00' })).toEqual(['agenda-hora-hasta'])
    expect(ids({ duracion: '0' })).toEqual(['agenda-duracion'])
    expect(ids({ duracion: '12.5' })).toEqual(['agenda-duracion'])
  })

  it('vistaPreviaAgenda arma los mismos turnos que generar_agenda', () => {
    const turnos = vistaPreviaAgenda(AGENDA, AHORA)
    // Lunes, miércoles y viernes; 4 turnos de 30 minutos entre las 8 y las 10.
    expect(turnos.length).toBe(12)
    expect(turnos[0]).toEqual({ dia: '2026-10-19', hora: '08:00' })
    expect(turnos[3]).toEqual({ dia: '2026-10-19', hora: '09:30' })
    expect(turnos.map((turno) => turno.dia)).not.toContain('2026-10-20')
  })

  it('el último turno tiene que terminar antes de la hora de fin', () => {
    expect(vistaPreviaAgenda({ ...AGENDA, dias: ['1'], hasta: '2026-10-19', duracion: '45' }, AHORA).map((t) => t.hora)).toEqual([
      '08:00',
      '08:45',
    ])
  })

  it('el domingo es el 7 y los turnos de hoy que ya pasaron no cuentan', () => {
    expect(vistaPreviaAgenda({ ...AGENDA, dias: ['7'] }, AHORA)).toEqual([
      { dia: '2026-10-25', hora: '08:00' },
      { dia: '2026-10-25', hora: '08:30' },
      { dia: '2026-10-25', hora: '09:00' },
      { dia: '2026-10-25', hora: '09:30' },
    ])
    // Hoy (miércoles) a las 10 de Argentina: de 8 a 12 quedan 10:30, 11:00 y 11:30.
    const hoy = vistaPreviaAgenda({ ...AGENDA, desde: HOY, hasta: HOY, dias: ['3'], horaHasta: '12:00' }, AHORA)
    expect(hoy.map((t) => t.hora)).toEqual(['10:30', '11:00', '11:30'])
  })

  it('con datos que no sirven, no arma nada', () => {
    expect(vistaPreviaAgenda({ ...AGENDA, horaDesde: '' }, AHORA)).toEqual([])
    expect(vistaPreviaAgenda({ ...AGENDA, hasta: '2026-10-01' }, AHORA)).toEqual([])
  })
})

describe('respuestas de la base', () => {
  it('leerBajaFrenada lee el mensaje y la lista de turnos reservados', () => {
    const frenada = leerBajaFrenada({
      message: 'No podés dar de baja este centro: tiene 1 turno reservado. Primero reasignalos o cancelalos.',
      details: '{"cantidad": 1, "turnos": [{"numero": 7, "inicio": "2026-10-17T12:15:00+00:00", "profesional": "Dr. X", "especialidad": "Oculista", "centro": "C"}]}',
      hint: 'reservas_vigentes',
    })
    expect(frenada?.cantidad).toBe(1)
    expect(frenada?.turnos[0]?.numero).toBe(7)
    expect(frenada?.mensaje).toMatch(/^No podés dar de baja este centro/)
    expect(leerBajaFrenada({ message: 'otro', hint: null })).toBeNull()
    expect(leerBajaFrenada({ message: 'sin lista', details: 'no es json', hint: 'reservas_vigentes' })?.turnos).toEqual([])
  })

  it('mensajeAdmin explica cada motivo', () => {
    expect(mensajeAdmin('superpuesto', 3)).toMatch(/3 turnos se superponen/)
    expect(mensajeAdmin('superpuesto', 1)).toMatch(/1 turno se superpone/)
    expect(mensajeAdmin('reservados', 2)).toMatch(/2 turnos reservados/)
    expect(mensajeAdmin('cualquier_cosa')).toMatch(/conexión/)
  })
})

describe('textoAuditoria', () => {
  const base = { registroId: '3', usuario: 'Admin Karma', creadoEn: '2026-10-14T21:03:00Z' }

  it('cambios del catálogo, con los campos en palabras', () => {
    expect(
      textoAuditoria({ ...base, tabla: 'centros', accion: 'modificacion', detalle: { nombre: 'Hospital X', campos: ['telefono', 'lat', 'lng'] } }),
    ).toBe('Admin Karma modificó el centro «Hospital X» (el teléfono y la ubicación) el 14/10 a las 18:03.')
    expect(textoAuditoria({ ...base, tabla: 'especialidades', accion: 'baja', detalle: { nombre: 'Pediatría' } })).toBe(
      'Admin Karma dio de baja la especialidad «Pediatría» el 14/10 a las 18:03.',
    )
    expect(textoAuditoria({ ...base, tabla: 'profesionales', accion: 'alta', detalle: { nombre: 'Dra. Paz' } })).toBe(
      'Admin Karma dio de alta al profesional «Dra. Paz» el 14/10 a las 18:03.',
    )
  })

  it('agendas enteras', () => {
    expect(
      textoAuditoria({
        ...base,
        tabla: 'turnos',
        accion: 'alta',
        detalle: { nombre: 'Dr. Ríos', agenda: true, cantidad: 20, desde: '2026-10-19', hasta: '2026-10-23' },
      }),
    ).toBe('Admin Karma cargó 20 turnos en la agenda de Dr. Ríos (del 19/10 al 23/10) el 14/10 a las 18:03.')
    expect(
      textoAuditoria({
        ...base,
        tabla: 'turnos',
        accion: 'baja',
        detalle: { nombre: 'Dr. Ríos', agenda: true, cantidad: 1, desde: '2026-10-19', hasta: '2026-10-19' },
      }),
    ).toBe('Admin Karma dio de baja 1 turno libre de la agenda de Dr. Ríos (del 19/10 al 19/10) el 14/10 a las 18:03.')
  })

  it('reservas e intentos sin permiso', () => {
    expect(
      textoAuditoria({ ...base, usuario: 'Rosa Benítez', tabla: 'reservas', accion: 'baja', detalle: { numero: 12, asistida: false } }),
    ).toBe('Rosa Benítez canceló la reserva N.º 12 el 14/10 a las 18:03.')
    expect(
      textoAuditoria({ ...base, usuario: 'Lucía Benítez', tabla: 'reservas', accion: 'modificacion', detalle: { numero: 9, asistida: true } }),
    ).toBe('Lucía Benítez (como acompañante) cambió de fecha la reserva N.º 9 el 14/10 a las 18:03.')
    expect(
      textoAuditoria({ ...base, usuario: null, tabla: 'panel', accion: 'acceso_denegado', detalle: { ruta: '/admin/metricas' } }),
    ).toBe('Alguien intentó entrar a /admin/metricas sin permiso de administrador el 14/10 a las 18:03.')
  })
})
