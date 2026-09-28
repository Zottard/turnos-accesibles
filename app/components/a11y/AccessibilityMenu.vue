<template>
  <UPopover>
    <UButton icon="i-lucide-accessibility" color="neutral" variant="outline" label="Cómo se ve" />

    <template #content>
      <div class="w-[min(24rem,calc(100vw-2rem))] flex flex-col gap-6 p-5">
        <h2 class="text-lg font-bold">Cómo se ve la página</h2>

        <URadioGroup
          v-model="textScale"
          legend="Tamaño de la letra"
          :items="TEXT_SCALES"
          :ui="{ legend: 'text-base font-bold mb-2' }"
        />

        <USwitch v-model="highContrast" label="Alto contraste (fondo negro)" size="xl" />
        <USwitch v-model="reduceMotion" label="Sin animaciones" size="xl" />
        <USwitch v-model="plainLanguage" label="Lenguaje simple" size="xl" />

        <UButton color="neutral" variant="ghost" label="Volver a como estaba al principio" @click="reset" />
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { TextScale } from '~/stores/accesibilidad'

const TEXT_SCALES: { label: string, value: TextScale }[] = [
  { label: 'Normal', value: '100' },
  { label: 'Grande', value: '125' },
  { label: 'Muy grande', value: '150' },
  { label: 'Enorme', value: '200' },
]

const { prefs, set, reset } = useAccesibilidad()

const textScale = computed({
  get: () => prefs.value.textScale,
  set: (value: TextScale) => set('textScale', value),
})

const highContrast = computed({
  get: () => prefs.value.contrast === 'alto',
  set: (value: boolean) => set('contrast', value ? 'alto' : 'normal'),
})

const reduceMotion = computed({
  get: () => prefs.value.reduceMotion === 'siempre',
  set: (value: boolean) => set('reduceMotion', value ? 'siempre' : 'auto'),
})

const plainLanguage = computed({
  get: () => prefs.value.plainLanguage,
  set: (value: boolean) => set('plainLanguage', value),
})
</script>
