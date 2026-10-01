import type { Tables } from '~/types/database'
import type { AccessibilityPrefs } from '~/stores/accesibilidad'

type Fila = Tables<'preferencias_accesibilidad'>

const desdeFila = (f: Fila): AccessibilityPrefs => ({
  textScale: f.text_scale as AccessibilityPrefs['textScale'],
  contrast: f.contraste as AccessibilityPrefs['contrast'],
  voiceEnabled: f.voz_activa,
  voiceRate: f.voz_velocidad as AccessibilityPrefs['voiceRate'],
  reduceMotion: f.reduce_motion as AccessibilityPrefs['reduceMotion'],
  plainLanguage: f.lenguaje_simple,
  notificationChannel: f.canal_notificacion as AccessibilityPrefs['notificationChannel'],
  emailReminders: f.avisos_por_correo,
})

const aFila = (p: AccessibilityPrefs) => ({
  text_scale: p.textScale,
  contraste: p.contrast,
  voz_activa: p.voiceEnabled,
  voz_velocidad: p.voiceRate,
  reduce_motion: p.reduceMotion,
  lenguaje_simple: p.plainLanguage,
  canal_notificacion: p.notificationChannel,
  avisos_por_correo: p.emailReminders,
})

export function usePreferenciasCuenta() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const store = useAccesibilidadStore()
  const configuradas = useState<boolean | null>('prefs-configuradas', () => null)
  const cargadasDe = useState<string | null>('prefs-cargadas-de', () => null)

  async function cargar() {
    const id = user.value?.sub
    if (!id) {
      configuradas.value = null
      cargadasDe.value = null
      return null
    }
    if (cargadasDe.value === id) return configuradas.value
    const antes = store.prefs
    const { data, error } = await supabase.from('preferencias_accesibilidad').select('*').eq('profile_id', id).maybeSingle()
    // si no pudimos consultar, no sabemos: mejor no mandar a nadie a /bienvenida por un corte de red
    if (error) return null
    configuradas.value = !!data
    cargadasDe.value = id
    // si la persona cambió algo mientras llegaba la respuesta, gana lo que eligió
    if (data && store.prefs === antes) store.load(desdeFila(data))
    return configuradas.value
  }

  async function guardar() {
    const id = user.value?.sub
    if (!id) return false
    const { error } = await supabase
      .from('preferencias_accesibilidad')
      .upsert({ profile_id: id, ...aFila(store.prefs) }, { onConflict: 'profile_id' })
    if (!error) configuradas.value = true
    return !error
  }

  return { configuradas, cargar, guardar }
}
