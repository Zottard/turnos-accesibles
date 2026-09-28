export function useEntradaPorVoz() {
  const { isSupported, isListening, isFinal, result, error, start, stop } = useSpeechRecognition({
    lang: 'es-AR',
    interimResults: true,
    continuous: false,
  })

  return { isSupported, isListening, isFinal, result, error, start, stop }
}
