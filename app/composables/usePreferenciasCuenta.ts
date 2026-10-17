// Preferencias guardadas en la cuenta (tabla `preferencias` de Supabase).
//
// Cómo funciona:
// - Al ingresar (o al abrir la app con la sesión ya iniciada) se lee la fila una sola vez y se
//   copia a la cookie `ta_prefs`. La cookie sigue siendo lo que usa la página para pintarse.
// - Si la persona todavía no tiene fila, `estado` queda en 'sin-fila' y el middleware `auth`
//   la manda a /bienvenida a elegir sus preferencias.
// - Si la consulta falla, `estado` queda en 'error': no sabemos si tiene fila, así que no la
//   mandamos a ningún lado.
// - Los cambios del menú de accesibilidad se guardan solos en la cuenta (medio segundo después
//   del último cambio). En /bienvenida y /perfil/accesibilidad se guarda con un botón.

type EstadoCuenta = 'sin-cargar' | 'cargadas' | 'sin-fila' | 'error'

// Páginas con su propio botón "Guardar": ahí no guardamos solo.
const PAGINAS_CON_BOTON_GUARDAR = ['/bienvenida', '/perfil/accesibilidad']
const ESPERA_ANTES_DE_GUARDAR_MS = 600

export function usePreferenciasCuenta() {
  const supabase = useSupabaseClient()
  const usuario = useSupabaseUser()
  const { preferencias, aplicar } = useAccesibilidad()

  const estado = useState<EstadoCuenta>('cuenta_estado', () => 'sin-cargar')
  const aviso = useState<PreferenciasAviso>('cuenta_aviso', () => ({ ...AVISO_PREDETERMINADO }))
  // Lo último que leímos o guardamos, para no volver a guardar lo mismo.
  const ultimaGuardada = useState<string>('cuenta_ultima_guardada', () => '')

  function filaActual(): FilaPreferencias {
    return aFilaPreferencias(preferencias.value, aviso.value)
  }

  /** Lee la fila de la cuenta y la aplica. Si ya se leyó, no hace nada. */
  async function cargar() {
    const id = usuario.value?.sub
    if (!id || estado.value !== 'sin-cargar') {
      return
    }
    const { data, error } = await supabase.from('preferencias').select('*').eq('usuario_id', id).maybeSingle()
    if (error) {
      estado.value = 'error'
      return
    }
    if (!data) {
      estado.value = 'sin-fila'
      return
    }
    const leidas = desdeFilaPreferencias(data)
    aplicar(leidas.preferencias)
    aviso.value = leidas.aviso
    ultimaGuardada.value = JSON.stringify(filaActual())
    estado.value = 'cargadas'
  }

  /** Guarda en la cuenta lo que se ve ahora. Devuelve si se pudo. */
  async function guardarEnCuenta(): Promise<boolean> {
    const id = usuario.value?.sub
    if (!id) {
      return false
    }
    const fila = filaActual()
    const { error } = await supabase.from('preferencias').upsert({ usuario_id: id, ...fila })
    if (error) {
      return false
    }
    ultimaGuardada.value = JSON.stringify(fila)
    estado.value = 'cargadas'
    return true
  }

  /** Vuelve a lo último guardado en la cuenta (por ejemplo, si falló un guardado). */
  function volverALoGuardado() {
    if (!ultimaGuardada.value) {
      return
    }
    const guardadas = desdeFilaPreferencias(JSON.parse(ultimaGuardada.value))
    aplicar(guardadas.preferencias)
    aviso.value = guardadas.aviso
  }

  function hayCambiosSinGuardar(): boolean {
    return JSON.stringify(filaActual()) !== ultimaGuardada.value
  }

  /** Al salir de la cuenta: la próxima vez hay que volver a leer. */
  function olvidar() {
    estado.value = 'sin-cargar'
    aviso.value = { ...AVISO_PREDETERMINADO }
    ultimaGuardada.value = ''
  }

  /** Guarda solo los cambios del menú de accesibilidad. Se llama una vez, desde un plugin. */
  function guardarAlCambiar() {
    const router = useRouter()
    const { anunciar } = useAnuncio()
    let espera: ReturnType<typeof setTimeout> | undefined

    watch(
      preferencias,
      () => {
        clearTimeout(espera)
        espera = setTimeout(async () => {
          const enPaginaConBoton = PAGINAS_CON_BOTON_GUARDAR.includes(router.currentRoute.value.path)
          if (!usuario.value || estado.value !== 'cargadas' || enPaginaConBoton || !hayCambiosSinGuardar()) {
            return
          }
          const guardado = await guardarEnCuenta()
          if (!guardado) {
            anunciar('No pudimos guardar el cambio en tu cuenta. Por ahora queda solo en este navegador.', true)
          }
        }, ESPERA_ANTES_DE_GUARDAR_MS)
      },
      { deep: true },
    )
  }

  return {
    estado: readonly(estado),
    aviso,
    cargar,
    guardarEnCuenta,
    volverALoGuardado,
    hayCambiosSinGuardar,
    olvidar,
    guardarAlCambiar,
  }
}
