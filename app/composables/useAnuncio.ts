export function useAnuncio() {
  const polite = useState('anuncio-polite', () => '')
  const assertive = useState('anuncio-assertive', () => '')

  async function push(target: Ref<string>, text: string) {
    target.value = ''
    await nextTick()
    target.value = text
  }

  return {
    polite,
    assertive,
    announce: (text: string) => push(polite, text),
    alert: (text: string) => push(assertive, text),
  }
}
