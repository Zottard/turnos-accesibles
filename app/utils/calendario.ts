const fechaIcs = (fecha: Date) => fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escapar = (texto: string) => texto.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export interface EventoCalendario {
  uid: string
  titulo: string
  inicio: string
  duracionMin: number
  lugar: string
  descripcion: string
}

export function generarIcs(e: EventoCalendario) {
  const inicio = new Date(e.inicio)
  const fin = new Date(inicio.getTime() + e.duracionMin * 60_000)
  const aviso = new Date(inicio.getTime() - 24 * 3_600_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Turnos Accesibles//ES',
    'BEGIN:VEVENT',
    `UID:${e.uid}@turnos-accesibles`,
    `DTSTAMP:${fechaIcs(new Date())}`,
    `DTSTART:${fechaIcs(inicio)}`,
    `DTEND:${fechaIcs(fin)}`,
    `SUMMARY:${escapar(e.titulo)}`,
    `LOCATION:${escapar(e.lugar)}`,
    `DESCRIPTION:${escapar(e.descripcion)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(e.titulo)}`,
    `TRIGGER;VALUE=DATE-TIME:${fechaIcs(aviso)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function descargarArchivo(contenido: string, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
