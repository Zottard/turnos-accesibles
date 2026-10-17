// Avisos nuevos (v0.5): con la sesión iniciada, revisa si hay avisos al cambiar de página y cada
// minuto (una consulta liviana: solo los sin leer). Si llegó algo nuevo, la banda lo muestra
// (components/BandaAvisos.vue) y, según el canal que eligió la persona, suena un tono suave y se
// lee el título en voz alta. Nada se repite: el sonido es solo para los que la app no había mostrado.

const CADA_MINUTO_MS = 60 * 1000
// Esperamos un poco para no pisar el anuncio del título de la página (foco-al-navegar).
const ESPERA_ANTES_DE_LEER_MS = 1500

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const usuario = useSupabaseUser()
  const avisos = useAvisos()
  const cuenta = usePreferenciasCuenta()
  const { preferencias } = useAccesibilidad()
  const ayuda = useAyuda()
  let revisando = false

  async function revisar() {
    if (revisando) return
    if (!usuario.value) {
      avisos.olvidar()
      return
    }
    revisando = true
    try {
      const nuevos = await avisos.revisar()
      if (nuevos.length === 0) return
      const como = comoAvisar(cuenta.aviso.value.canalAviso, preferencias.value.lecturaVoz)
      if (como.tono) tocarTonoAviso()
      if (como.voz) {
        const primero = nuevos[0]!
        const texto =
          nuevos.length === 1
            ? `Aviso nuevo. ${tituloConPunto(textoAviso(primero).titulo)}`
            : `Tenés ${nuevos.length} avisos nuevos.`
        setTimeout(() => hablar(texto, preferencias.value.velocidadVoz), ESPERA_ANTES_DE_LEER_MS)
      }
      // Si cambió un permiso (por ejemplo, le quitaron el acceso), revisamos el modo ayuda.
      if (nuevos.some((aviso) => aviso.tipo === 'acompanamiento')) {
        await ayuda.verificar()
      }
    } finally {
      revisando = false
    }
  }

  nuxtApp.hook('app:mounted', () => {
    revisar()
    setInterval(revisar, CADA_MINUTO_MS)
  })
  router.afterEach(() => {
    revisar()
  })
  watch(
    () => usuario.value?.sub,
    () => {
      revisar()
    },
  )
})
