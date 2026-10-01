export type EstadoPantalla = 'lista' | 'borrador' | 'pendiente'

export interface Pantalla {
  nombre: string
  ruta?: string
  descripcion: string
  fase: number
  estado: EstadoPantalla
  rol?: 'solicitante' | 'acompanante' | 'admin'
}

export interface GrupoAlcance {
  titulo: string
  requerimiento?: string
  pantallas: Pantalla[]
}

export const ALCANCE: GrupoAlcance[] = [
  {
    titulo: 'Base accesible',
    pantallas: [
      { nombre: 'Portada', ruta: '/', descripcion: 'Qué es la app y botones grandes para empezar.', fase: 0, estado: 'borrador' },
      { nombre: 'Menú "Cómo se ve"', descripcion: 'Tamaño de letra, alto contraste, sin animaciones y lenguaje simple, en todas las pantallas.', fase: 0, estado: 'lista' },
      { nombre: 'Muestra de componentes', ruta: '/demo-ui', descripcion: 'Todos los componentes en tema claro, alto contraste y letra al 200 %.', fase: 1, estado: 'lista' },
    ],
  },
  {
    titulo: 'Cuenta',
    requerimiento: 'RF 1',
    pantallas: [
      { nombre: 'Ingresar', ruta: '/ingresar', descripcion: 'Con aviso de intentos y bloqueo de 15 minutos al quinto error.', fase: 2, estado: 'lista' },
      { nombre: 'Crear una cuenta', ruta: '/registrarme', descripcion: 'Un dato por pantalla, con resumen final y borrador que no se pierde.', fase: 2, estado: 'lista' },
      { nombre: 'Confirmar el correo', ruta: '/confirmar-correo', descripcion: 'Aviso después de registrarse y reenvío del mail.', fase: 2, estado: 'lista' },
      { nombre: 'Olvidé la contraseña', ruta: '/recuperar-clave', descripcion: 'Pide un enlace sin revelar si el correo tiene cuenta.', fase: 2, estado: 'lista' },
      { nombre: 'Contraseña nueva', ruta: '/restablecer-clave', descripcion: 'Se abre desde el enlace del mail.', fase: 2, estado: 'lista' },
    ],
  },
  {
    titulo: 'Preferencias de accesibilidad',
    requerimiento: 'RF 2',
    pantallas: [
      { nombre: 'Bienvenida', ruta: '/bienvenida', descripcion: 'La primera vez, te pregunta cómo querés ver y escuchar la app.', fase: 3, estado: 'lista' },
      { nombre: 'Mis preferencias', ruta: '/perfil/accesibilidad', descripcion: 'Cambiar las preferencias cuando quieras. Se guardan en tu cuenta.', fase: 3, estado: 'lista' },
      { nombre: 'Mis datos', ruta: '/perfil', descripcion: 'Nombre, documento, teléfono y localidad.', fase: 3, estado: 'lista' },
    ],
  },
  {
    titulo: 'Buscar turnos',
    requerimiento: 'RF 3',
    pantallas: [
      { nombre: 'Mi inicio', ruta: '/inicio', descripcion: 'Tu próximo turno en grande y el botón "Sacar un turno".', fase: 6, estado: 'lista', rol: 'solicitante' },
      { nombre: 'Buscar por menús', ruta: '/turnos/buscar', descripcion: 'Elegir médico, lugar y fecha sin escribir. Centros reales, turnos de prueba.', fase: 4, estado: 'lista' },
      { nombre: 'Detalle de un turno', ruta: '/turnos/:id', descripcion: 'Día y hora en palabras, hospital, dirección y cómo llegar. Se abre desde la búsqueda.', fase: 4, estado: 'lista' },
    ],
  },
  {
    titulo: 'Reservar con el asistente',
    requerimiento: 'RF 4',
    pantallas: [
      { nombre: 'Asistente paso a paso', ruta: '/turnos/asistente', descripcion: 'Contame qué necesitás (texto o voz) y te guiamos de a una pregunta. Sin IA paga: reglas, y si no entiende, menús.', fase: 5, estado: 'lista' },
      { nombre: 'Confirmar la reserva', ruta: '/turnos/:id/confirmar', descripcion: 'Resumen en oraciones cortas y "Sí, reservar este turno".', fase: 5, estado: 'lista' },
      { nombre: 'Comprobante', ruta: '/reservas/:id', descripcion: 'Número de turno, agregar al calendario y cómo llegar.', fase: 5, estado: 'lista' },
    ],
  },
  {
    titulo: 'Mis turnos',
    requerimiento: 'RF 5',
    pantallas: [
      { nombre: 'Mis turnos', ruta: '/mis-turnos', descripcion: 'Próximos y pasados, con su estado en texto e ícono.', fase: 6, estado: 'lista' },
      { nombre: 'Cancelar un turno', ruta: '/reservas/:id/cancelar', descripcion: 'Con confirmación. Libera el lugar para otra persona.', fase: 6, estado: 'lista' },
      { nombre: 'Cambiar de fecha', ruta: '/reservas/:id/reprogramar', descripcion: 'Busca un turno nuevo y libera el anterior.', fase: 6, estado: 'lista' },
    ],
  },
  {
    titulo: 'Recordatorios',
    requerimiento: 'RF 6',
    pantallas: [
      { nombre: 'Mis avisos', ruta: '/notificaciones', descripcion: 'Recordatorio el día anterior, visual y sonoro.', fase: 7, estado: 'lista' },
    ],
  },
  {
    titulo: 'Modo acompañante',
    requerimiento: 'RF 7',
    pantallas: [
      { nombre: 'Mis acompañantes', ruta: '/acompanantes', descripcion: 'Ver, invitar y quitar a quien te ayuda.', fase: 8, estado: 'pendiente' },
      { nombre: 'Invitar a alguien', ruta: '/acompanantes/invitar', descripcion: 'Elegís qué puede hacer: ver, reservar o cancelar.', fase: 8, estado: 'pendiente' },
      { nombre: 'Aceptar una invitación', ruta: '/invitacion/:token', descripcion: 'El acompañante acepta desde el enlace que le llegó.', fase: 8, estado: 'pendiente' },
      { nombre: 'Ayudar a otra persona', ruta: '/asistiendo/:id', descripcion: 'Con un aviso fijo: "Estás ayudando a Rosa".', fase: 8, estado: 'pendiente', rol: 'acompanante' },
    ],
  },
  {
    titulo: 'Administración',
    requerimiento: 'RF 8 y RF 9',
    pantallas: [
      { nombre: 'Panel', ruta: '/admin', descripcion: 'Entrada al panel. Solo para administración.', fase: 9, estado: 'borrador', rol: 'admin' },
      { nombre: 'Hospitales y centros', ruta: '/admin/centros', descripcion: 'Alta, baja y cambios, con accesibilidad edilicia.', fase: 9, estado: 'pendiente', rol: 'admin' },
      { nombre: 'Especialidades', ruta: '/admin/especialidades', descripcion: 'Nombre común y nombre técnico de cada una.', fase: 9, estado: 'pendiente', rol: 'admin' },
      { nombre: 'Profesionales', ruta: '/admin/profesionales', descripcion: 'Médicos y su especialidad.', fase: 9, estado: 'pendiente', rol: 'admin' },
      { nombre: 'Agendas', ruta: '/admin/agendas', descripcion: 'Genera los turnos sin superposiciones.', fase: 9, estado: 'pendiente', rol: 'admin' },
      { nombre: 'Métricas', ruta: '/admin/metricas', descripcion: 'Turnos buscados, reservados y cancelados, con tabla y exportación.', fase: 10, estado: 'pendiente', rol: 'admin' },
    ],
  },
  {
    titulo: 'Información',
    pantallas: [
      { nombre: 'Ayuda', ruta: '/ayuda', descripcion: 'Guía en lenguaje simple, con video corto.', fase: 11, estado: 'borrador' },
      { nombre: 'Declaración de accesibilidad', ruta: '/accesibilidad', descripcion: 'Lo que pide la Ley 26.653: nivel alcanzado y contacto.', fase: 11, estado: 'borrador' },
      { nombre: 'Términos de uso', ruta: '/terminos', descripcion: 'Incluye que no es el sistema oficial de turnos.', fase: 11, estado: 'borrador' },
    ],
  },
]

export const USUARIOS_DEMO = [
  { email: 'solicitante@demo.ar', etiqueta: 'Rosa (solicitante)', destino: '/inicio' },
  { email: 'acompanante@demo.ar', etiqueta: 'Lucía (acompañante)', destino: '/inicio' },
  { email: 'admin@demo.ar', etiqueta: 'Administración', destino: '/admin' },
]

export const CLAVE_DEMO = 'demo1234'
