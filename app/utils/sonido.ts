// Sonido de aviso (v0.5): dos notas suaves y cortas, hechas con la Web Audio API del navegador
// (sin archivos de audio). Volumen bajo, sin repetirse: avisa sin sobresaltar.
// Si el navegador no puede (o todavía no hubo un toque en la página), no suena y queda la banda escrita.

let contexto: AudioContext | null = null

export function tocarTonoAviso(): void {
  if (!import.meta.client) return
  try {
    const Clase = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Clase) return
    contexto ??= new Clase()
    if (contexto.state === 'suspended') {
      contexto.resume().catch(() => {})
    }
    const inicio = contexto.currentTime + 0.05
    // Do y mi (una tercera mayor): suena amable, no como una alarma.
    for (const [indice, frecuencia] of [523.25, 659.25].entries()) {
      const nota = contexto.createOscillator()
      const volumen = contexto.createGain()
      const desde = inicio + indice * 0.35
      nota.type = 'sine'
      nota.frequency.value = frecuencia
      // Entra y sale despacio (sin "clic").
      volumen.gain.setValueAtTime(0, desde)
      volumen.gain.linearRampToValueAtTime(0.08, desde + 0.06)
      volumen.gain.linearRampToValueAtTime(0, desde + 0.4)
      nota.connect(volumen).connect(contexto.destination)
      nota.start(desde)
      nota.stop(desde + 0.45)
    }
  } catch {
    // Sin sonido: el aviso escrito sigue en pantalla.
  }
}
