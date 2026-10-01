const CADA = 60_000

function sonar() {
  const Contexto = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Contexto) return
  const ctx = new Contexto()
  for (const [i, frecuencia] of [660, 880].entries()) {
    const osc = ctx.createOscillator()
    const volumen = ctx.createGain()
    osc.frequency.value = frecuencia
    volumen.gain.value = 0.15
    osc.connect(volumen).connect(ctx.destination)
    osc.start(ctx.currentTime + i * 0.25)
    osc.stop(ctx.currentTime + i * 0.25 + 0.2)
  }
}

export default defineNuxtPlugin({
  name: 'avisos',
  dependsOn: ['preferencias'],
  setup(nuxtApp) {
    const user = useSupabaseUser()
    const avisoNuevo = useState<{ titulo: string, cuerpo: string } | null>('aviso-nuevo', () => null)
    const { prefs } = useAccesibilidad()
    const { announce } = useAnuncio()
    const { noLeidas, contar, listar } = useNotificaciones()
    let anterior: number | null = null

    async function revisar() {
      if (!user.value) {
        anterior = null
        noLeidas.value = 0
        return
      }
      const actual = await contar()
      if (anterior !== null && actual > anterior) {
        const [ultima] = await listar()
        if (ultima) {
          const canal = prefs.value.notificationChannel
          if (canal !== 'sonoro') avisoNuevo.value = { titulo: ultima.titulo, cuerpo: ultima.cuerpo }
          if (canal !== 'visual') sonar()
          announce(`Tenés un aviso nuevo: ${ultima.titulo}.`)
        }
      }
      anterior = actual
    }

    watch(() => user.value?.sub, () => {
      anterior = null
      revisar()
    }, { immediate: true })
    nuxtApp.hook('page:finish', revisar)
    useIntervalFn(revisar, CADA)
  },
})
