// Mensajes para lectores de pantalla (regiones aria-live del layout).
// Si la persona activó la lectura en voz alta, además se leen con la voz del navegador.

type Anuncio = {
  texto: string
  urgente: boolean
}

export function useAnuncio() {
  const anuncio = useState<Anuncio>('anuncio', () => ({ texto: '', urgente: false }))
  const { preferencias } = useAccesibilidad()

  function anunciar(texto: string, urgente = false) {
    // Primero vaciamos la región: así se vuelve a leer aunque el mensaje sea el mismo.
    anuncio.value = { texto: '', urgente }
    nextTick(() => {
      anuncio.value = { texto, urgente }
    })

    if (preferencias.value.lecturaVoz) {
      hablar(texto, preferencias.value.velocidadVoz)
    }
  }

  return { anuncio: readonly(anuncio), anunciar }
}
