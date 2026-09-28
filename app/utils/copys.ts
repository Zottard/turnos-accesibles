export const COPYS = {
  'accion.continuar': { simple: 'Sí, continuar', tecnico: 'Continuar' },
  'accion.volver': { simple: 'Volver atrás', tecnico: 'Volver' },
  'accion.reintentar': { simple: 'Probar de nuevo', tecnico: 'Reintentar' },
  'accion.ir-inicio': { simple: 'Ir al inicio', tecnico: 'Volver al inicio' },
  'progreso.paso': { simple: 'Paso {actual} de {total}', tecnico: 'Paso {actual} de {total}' },
  'estado.cargando': { simple: 'Estamos buscando. Esperá un momento.', tecnico: 'Cargando…' },
  'estado.vacio': { simple: 'No encontramos nada por ahora.', tecnico: 'Sin resultados.' },
  'estado.error.titulo': { simple: 'Algo no funcionó.', tecnico: 'No se pudo completar la operación.' },
  'estado.error.ayuda': { simple: 'Probá de nuevo en un momento.', tecnico: 'Intente nuevamente más tarde.' },
  'estado.sin-permiso.titulo': { simple: 'No podés ver esta página.', tecnico: 'No tiene permisos para acceder.' },
  'estado.sin-permiso.ayuda': { simple: 'Volvé al inicio para seguir.', tecnico: 'Regrese a la página principal.' },
  'voz.escuchar': { simple: 'Escuchar', tecnico: 'Leer en voz alta' },
  'voz.parar': { simple: 'Parar', tecnico: 'Detener lectura' },
  'voz.sin-soporte': {
    simple: 'Tu navegador no puede leer en voz alta. Podés agrandar la letra en "Cómo se ve".',
    tecnico: 'Su navegador no admite síntesis de voz. Puede ampliar el texto desde las preferencias de visualización.',
  },
  'dictado.hablar': { simple: 'Decilo con tu voz', tecnico: 'Dictar' },
  'dictado.parar': { simple: 'Terminé de hablar', tecnico: 'Detener dictado' },
  'dictado.escuchando': { simple: 'Te escucho. Hablá ahora.', tecnico: 'Escuchando…' },
  'dictado.error': {
    simple: 'No te pudimos escuchar. Escribilo con el teclado.',
    tecnico: 'No se pudo reconocer la voz. Ingrese el texto manualmente.',
  },
} as const

export type CopyKey = keyof typeof COPYS
