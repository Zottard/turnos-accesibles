interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// El navegador avisa una sola vez, al cargar: el plugin lo guarda acá para usarlo después.
const pedido = shallowRef<EventoInstalar | null>(null)
const instalada = ref(false)

export function escucharInstalacion() {
  instalada.value = matchMedia('(display-mode: standalone)').matches
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido.value = e as EventoInstalar
  })
  addEventListener('appinstalled', () => {
    pedido.value = null
    instalada.value = true
  })
}

export function useInstalar() {
  const disponible = computed(() => !!pedido.value)

  async function instalar() {
    const e = pedido.value
    if (!e) return false
    await e.prompt()
    const { outcome } = await e.userChoice
    pedido.value = null
    return outcome === 'accepted'
  }

  return { disponible, instalada: readonly(instalada), instalar }
}
