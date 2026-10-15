// Modo acompañante (v0.5): el alcance de un acompañamiento, su estado y el enlace de invitación.
// Funciones puras: las usan la app y el servidor (correo de invitación). Las prueba
// tests/acompanantes.test.ts.

// Lo que puede hacer un acompañante. 'ver' está siempre; 'cancelar' también incluye cambiar de fecha.
export const ACCIONES_ALCANCE = ['ver', 'reservar', 'cancelar'] as const
export type AccionAlcance = (typeof ACCIONES_ALCANCE)[number]

// Cómo se dice cada acción: desde quien invita ("mis turnos"), hablando de esa persona ("sus turnos")
// y hablándole a ella ("tus turnos").
export const TEXTOS_ALCANCE: Record<AccionAlcance, { titulo: string; propio: string; ajeno: string; tuyo: string }> = {
  ver: { titulo: 'Ver mis turnos', propio: 'ver mis turnos', ajeno: 'ver sus turnos', tuyo: 'ver tus turnos' },
  reservar: { titulo: 'Sacar turnos por mí', propio: 'sacar turnos por mí', ajeno: 'sacarle turnos', tuyo: 'sacarte turnos' },
  cancelar: {
    titulo: 'Cancelar o cambiar mis turnos',
    propio: 'cancelar o cambiar de fecha mis turnos',
    ajeno: 'cancelar o cambiar de fecha sus turnos',
    tuyo: 'cancelar o cambiar de fecha tus turnos',
  },
}

/** Lo que venga (de la base o de un formulario) → alcance válido, con 'ver' y en orden fijo. */
export function normalizarAlcance(valor: unknown): AccionAlcance[] {
  const lista = Array.isArray(valor) ? valor : []
  return ACCIONES_ALCANCE.filter((accion) => accion === 'ver' || lista.includes(accion))
}

/** ¿El alcance incluye esa acción? */
export function puede(alcance: readonly string[], accion: AccionAlcance): boolean {
  return accion === 'ver' || alcance.includes(accion)
}

/**
 * "ver mis turnos y sacar turnos por mí" (persona = 'propio'), "ver sus turnos y sacarle turnos"
 * ('ajeno') o "ver tus turnos y sacarte turnos" ('tuyo').
 */
export function alcanceEnPalabras(alcance: readonly string[], persona: 'propio' | 'ajeno' | 'tuyo'): string {
  const frases = normalizarAlcance(alcance).map((accion) => TEXTOS_ALCANCE[accion][persona])
  if (frases.length <= 1) return frases[0] ?? ''
  return `${frases.slice(0, -1).join(', ')} y ${frases[frases.length - 1]}`
}

// Estado que ve la persona. Una invitación pendiente cuya fecha pasó se muestra "vencida" aunque la
// base todavía no la haya marcado (se marca al aceptarla o al invitar de nuevo).
export type EstadoVinculo = 'pendiente' | 'activo' | 'revocado' | 'vencido' | 'rechazado'

export const ESTADOS_VINCULO: Record<EstadoVinculo, { icono: string; texto: string }> = {
  pendiente: { icono: '…', texto: 'Esperando que acepte' },
  activo: { icono: '✓', texto: 'Activo' },
  revocado: { icono: '✕', texto: 'Le quitaste el permiso' },
  vencido: { icono: '●', texto: 'La invitación venció' },
  rechazado: { icono: '✕', texto: 'No aceptó' },
}

export function estadoVinculo(fila: { estado: string; venceEn: string }, ahora = new Date()): EstadoVinculo {
  const estado = (Object.keys(ESTADOS_VINCULO) as EstadoVinculo[]).find((clave) => clave === fila.estado) ?? 'vencido'
  if (estado === 'pendiente' && new Date(fila.venceEn) <= ahora) return 'vencido'
  return estado
}

/** Vigente = todavía se puede quitar el permiso (o cancelar la invitación). */
export function esVigente(estado: EstadoVinculo): boolean {
  return estado === 'pendiente' || estado === 'activo'
}

/** El enlace que abre la invitación: https://sitio/invitacion/<token>. */
export function enlaceInvitacion(origen: string, token: string): string {
  return `${origen.replace(/\/+$/, '')}/invitacion/${encodeURIComponent(token)}`
}

/** El mensaje para mandar por WhatsApp (o copiar): corto, claro y con el enlace al final. */
export function textoInvitacion(nombreQuienInvita: string, enlace: string): string {
  const quien = nombreQuienInvita.trim() || 'Una persona'
  return (
    `${quien} te invita a ser su acompañante en Turnos Accesibles, para ayudar con sus turnos de salud. ` +
    `Abrí este enlace para aceptar (vence en 7 días): ${enlace}`
  )
}

/** Enlace de WhatsApp que abre el mensaje listo para mandar (la persona elige a quién). */
export function enlaceWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`
}
