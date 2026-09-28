const RATES = { lenta: 0.8, normal: 1, rapida: 1.3 } as const

export function useLecturaEnVozAlta() {
  const { prefs } = useAccesibilidad()
  const isSupported = useSupported(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const speaking = useState('lectura-hablando', () => false)

  function stop() {
    if (!isSupported.value) return
    window.speechSynthesis.cancel()
    speaking.value = false
  }

  function speak(text: string) {
    if (!isSupported.value || !text.trim()) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-AR'
    utterance.rate = RATES[prefs.value.voiceRate]
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'))
    if (voice) utterance.voice = voice

    utterance.onstart = () => { speaking.value = true }
    utterance.onend = () => { speaking.value = false }
    utterance.onerror = () => { speaking.value = false }

    window.speechSynthesis.speak(utterance)
  }

  tryOnScopeDispose(stop)

  return { isSupported, speaking, speak, stop }
}
