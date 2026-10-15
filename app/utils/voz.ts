// Lectura en voz alta y dictado con la Web Speech API del navegador.
// Solo funciona en el navegador: en el servidor estas funciones no hacen nada.

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

// --- Dictado: la persona habla y el navegador lo pasa a texto ---
// TypeScript no trae los tipos del reconocimiento de voz: describimos solo lo que usamos.
type Reconocedor = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((evento: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

// Chrome y Safari lo llaman webkitSpeechRecognition; otros, SpeechRecognition. Firefox no lo tiene.
function claseDeDictado(): (new () => Reconocedor) | undefined {
  const ventana = window as unknown as {
    SpeechRecognition?: new () => Reconocedor
    webkitSpeechRecognition?: new () => Reconocedor
  }
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition
}

export function dictadoDisponible(): boolean {
  return import.meta.client && claseDeDictado() !== undefined
}

/** Qué decirle a la persona si el dictado falla (códigos de error de la Web Speech API). */
export function mensajeErrorDictado(codigo: string): string {
  switch (codigo) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No tenemos permiso para usar el micrófono. Podés escribirlo en el cuadro.'
    case 'no-speech':
      return 'No escuchamos nada. Probá de nuevo, más cerca del micrófono.'
    case 'audio-capture':
      return 'No encontramos un micrófono. Podés escribirlo en el cuadro.'
    case 'network':
      return 'El dictado necesita internet. Podés escribirlo en el cuadro.'
    default:
      return 'No pudimos escucharte. Probá de nuevo o escribilo en el cuadro.'
  }
}

/**
 * Escucha una frase en español de Argentina. Llama a `alResultado` con el texto, o a `alError`
 * con un mensaje simple. `alTerminar` se llama siempre al final.
 * Devuelve una función para dejar de escuchar (cuando la persona toca "terminar").
 */
export function dictar(opciones: {
  alResultado: (texto: string) => void
  alError: (mensaje: string) => void
  alTerminar?: () => void
}): () => void {
  const Clase = claseDeDictado()
  if (!import.meta.client || !Clase) {
    opciones.alError('Tu navegador no puede escuchar tu voz. Podés escribirlo en el cuadro.')
    opciones.alTerminar?.()
    return () => {}
  }
  const reconocedor = new Clase()
  reconocedor.lang = 'es-AR'
  reconocedor.continuous = false // una sola frase
  reconocedor.interimResults = false // solo el resultado final
  reconocedor.maxAlternatives = 1
  reconocedor.onresult = (evento) => {
    const texto = evento.results[0]?.[0]?.transcript.trim() ?? ''
    if (texto) {
      opciones.alResultado(texto)
    } else {
      opciones.alError(mensajeErrorDictado('no-speech'))
    }
  }
  reconocedor.onerror = (evento) => {
    // "aborted": la persona lo cortó. No es un error para mostrar.
    if (evento.error !== 'aborted') {
      opciones.alError(mensajeErrorDictado(evento.error))
    }
  }
  reconocedor.onend = () => opciones.alTerminar?.()
  callar() // si estaba leyendo en voz alta, no queremos que el micrófono escuche la lectura
  reconocedor.start()
  return () => reconocedor.stop()
}
