<template>
  <div>
    <UButton
      v-if="isSupported"
      :icon="speaking ? 'i-lucide-square' : 'i-lucide-volume-2'"
      :label="speaking ? t('voz.parar') : t('voz.escuchar')"
      size="lg"
      @click="toggle"
    />
    <p v-else-if="mounted" class="text-muted">{{ t('voz.sin-soporte') }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ text: string }>()

const { t } = useLenguajeSimple()
const { isSupported, speaking, speak, stop } = useLecturaEnVozAlta()
const mounted = useMounted()

function toggle() {
  if (speaking.value) stop()
  else speak(props.text)
}
</script>
