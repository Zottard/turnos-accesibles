<template>
  <div class="flex flex-col gap-4">
    <OpcionesTarjeta
      v-if="clave === 'textScale'"
      v-model="textScale"
      :legend="legend ?? 'Tamaño de la letra'"
      :legend-oculta="legendOculta"
      :opciones="OPCIONES_TEXTO"
    />

    <OpcionesTarjeta
      v-else-if="clave === 'contrast'"
      v-model="contraste"
      :legend="legend ?? 'Colores de la pantalla'"
      :legend-oculta="legendOculta"
      :opciones="OPCIONES_CONTRASTE"
    />

    <template v-else-if="clave === 'voz'">
      <OpcionesTarjeta v-model="voz" :legend="legend ?? 'Leer las pantallas en voz alta'" :legend-oculta="legendOculta" :opciones="OPCIONES_SI_NO" />
      <template v-if="prefs.voiceEnabled">
        <OpcionesTarjeta v-model="velocidad" legend="¿A qué velocidad?" :opciones="OPCIONES_VELOCIDAD" />
        <UButton v-if="soportaVoz" icon="i-lucide-volume-2" label="Probar cómo suena" class="self-start" @click="probarVoz" />
        <p v-else-if="montado" class="text-lg">{{ t('voz.sin-soporte') }}</p>
      </template>
    </template>

    <OpcionesTarjeta
      v-else-if="clave === 'plainLanguage'"
      v-model="lenguaje"
      :legend="legend ?? 'Cómo te explicamos las cosas'"
      :legend-oculta="legendOculta"
      :opciones="OPCIONES_LENGUAJE"
    />

    <OpcionesTarjeta
      v-else-if="clave === 'reduceMotion'"
      v-model="movimiento"
      :legend="legend ?? 'Movimiento en la pantalla'"
      :legend-oculta="legendOculta"
      :opciones="OPCIONES_MOVIMIENTO"
    />

    <template v-else-if="clave === 'avisos'">
      <OpcionesTarjeta v-model="canal" :legend="legend ?? 'Cómo te avisamos dentro de la app'" :legend-oculta="legendOculta" :opciones="OPCIONES_CANAL" />
      <UCheckbox id="pref-correo" v-model="correo" label="También avisarme por correo" description="Te mandamos un mail el día anterior a cada turno." />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Contrast, NotificationChannel, ReduceMotion, TextScale, VoiceRate } from '~/stores/accesibilidad'

export type ClavePreferencia = 'textScale' | 'contrast' | 'voz' | 'plainLanguage' | 'reduceMotion' | 'avisos'

const OPCIONES_TEXTO = [
  { value: '100', label: 'Normal' },
  { value: '125', label: 'Grande', description: 'Es como viene la app.' },
  { value: '150', label: 'Muy grande' },
  { value: '200', label: 'Enorme', description: 'La letra ocupa el doble.' },
]
const OPCIONES_CONTRASTE = [
  { value: 'alto', label: 'Fondo negro con letras blancas', description: 'Alto contraste. Es como viene la app.', icon: 'i-lucide-moon' },
  { value: 'normal', label: 'Fondo blanco con letras negras', icon: 'i-lucide-sun' },
]
const OPCIONES_SI_NO = [
  { value: 'si', label: 'Sí, leeme las pantallas', icon: 'i-lucide-volume-2' },
  { value: 'no', label: 'No, prefiero leer yo', icon: 'i-lucide-volume-x' },
]
const OPCIONES_VELOCIDAD = [
  { value: 'lenta', label: 'Despacio' },
  { value: 'normal', label: 'Normal' },
  { value: 'rapida', label: 'Rápido' },
]
const OPCIONES_LENGUAJE = [
  { value: 'si', label: 'Con palabras simples', description: 'Por ejemplo: "Sí, continuar".' },
  { value: 'no', label: 'Con los términos de siempre', description: 'Por ejemplo: "Continuar".' },
]
const OPCIONES_MOVIMIENTO = [
  { value: 'siempre', label: 'Sin animaciones', description: 'Nada se mueve solo. Es como viene la app.' },
  { value: 'auto', label: 'Como esté configurado mi dispositivo' },
]
const OPCIONES_CANAL = [
  { value: 'ambos', label: 'Con un aviso en la pantalla y un sonido', icon: 'i-lucide-bell-ring' },
  { value: 'visual', label: 'Solo con un aviso en la pantalla', icon: 'i-lucide-bell' },
  { value: 'sonoro', label: 'Solo con un sonido', icon: 'i-lucide-volume-2' },
]

defineProps<{ clave: ClavePreferencia, legend?: string, legendOculta?: boolean }>()

const { prefs, set } = useAccesibilidad()
const { t } = useLenguajeSimple()
const { isSupported: soportaVoz, speak } = useLecturaEnVozAlta()
const montado = useMounted()

const textScale = computed({ get: () => prefs.value.textScale, set: (v) => v && set('textScale', v as TextScale) })
const contraste = computed({ get: () => prefs.value.contrast, set: (v) => v && set('contrast', v as Contrast) })
const voz = computed({ get: () => (prefs.value.voiceEnabled ? 'si' : 'no'), set: (v) => set('voiceEnabled', v === 'si') })
const velocidad = computed({ get: () => prefs.value.voiceRate, set: (v) => v && set('voiceRate', v as VoiceRate) })
const lenguaje = computed({ get: () => (prefs.value.plainLanguage ? 'si' : 'no'), set: (v) => set('plainLanguage', v === 'si') })
const movimiento = computed({ get: () => prefs.value.reduceMotion, set: (v) => v && set('reduceMotion', v as ReduceMotion) })
const canal = computed({ get: () => prefs.value.notificationChannel, set: (v) => v && set('notificationChannel', v as NotificationChannel) })
const correo = computed({ get: () => prefs.value.emailReminders, set: (v: boolean | 'indeterminate') => set('emailReminders', v === true) })

const probarVoz = () => speak('Hola. Así te vamos a leer las pantallas. Si querés, podés cambiar la velocidad.')
</script>
