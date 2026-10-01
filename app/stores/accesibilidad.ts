export type TextScale = '100' | '125' | '150' | '200'
export type Contrast = 'normal' | 'alto'
export type VoiceRate = 'lenta' | 'normal' | 'rapida'
export type ReduceMotion = 'auto' | 'siempre'
export type NotificationChannel = 'visual' | 'sonoro' | 'ambos'

export interface AccessibilityPrefs {
  textScale: TextScale
  contrast: Contrast
  voiceEnabled: boolean
  voiceRate: VoiceRate
  reduceMotion: ReduceMotion
  plainLanguage: boolean
  notificationChannel: NotificationChannel
  emailReminders: boolean
}

export const DEFAULT_PREFS: AccessibilityPrefs = {
  textScale: '125',
  contrast: 'alto',
  voiceEnabled: false,
  voiceRate: 'normal',
  reduceMotion: 'siempre',
  plainLanguage: true,
  notificationChannel: 'ambos',
  emailReminders: true,
}

export const useAccesibilidadStore = defineStore('accesibilidad', () => {
  const prefs = ref<AccessibilityPrefs>({ ...DEFAULT_PREFS })

  function set<K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) {
    prefs.value = { ...prefs.value, [key]: value }
  }

  function load(partial: Partial<AccessibilityPrefs>) {
    prefs.value = { ...DEFAULT_PREFS, ...partial }
  }

  function reset() {
    prefs.value = { ...DEFAULT_PREFS }
  }

  return { prefs, set, load, reset }
})
