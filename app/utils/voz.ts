// Lectura en voz alta con la Web Speech API del navegador.
// Solo funciona en el navegador: en el servidor estas funciones no hacen nada.
// (El dictado por voz llega en la v0.4.)

export function vozDisponible(): boolean {
  return import.meta.client && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

// Busca una voz en español de Argentina; si no hay, cualquier voz en español.
function elegirVoz(): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices()
  const idioma = (voz: SpeechSynthesisVoice) => voz.lang.toLowerCase().replace('_', '-')
  return voces.find((voz) => idioma(voz) === 'es-ar') ?? voces.find((voz) => idioma(voz).startsWith('es'))
}

/**
 * Lee el texto en voz alta. Si había otra lectura en curso, la corta.
 * `alTerminar` se llama cuando termina o cuando se interrumpe.
 */
export function hablar(texto: string, velocidad = 1, alTerminar?: () => void): void {
  if (!vozDisponible()) {
    return
  }
  window.speechSynthesis.cancel()

  const frase = new SpeechSynthesisUtterance(texto)
  frase.lang = 'es-AR'
  frase.rate = velocidad
  const voz = elegirVoz()
  if (voz) {
    frase.voice = voz
  }
  if (alTerminar) {
    frase.onend = alTerminar
    frase.onerror = alTerminar
  }
  window.speechSynthesis.speak(frase)
}

export function callar(): void {
  if (vozDisponible()) {
    window.speechSynthesis.cancel()
  }
}
