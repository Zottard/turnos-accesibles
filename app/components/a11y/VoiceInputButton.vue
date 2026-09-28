<template>
  <UButton
    v-if="isSupported"
    :icon="isListening ? 'i-lucide-mic-off' : 'i-lucide-mic'"
    :label="isListening ? t('dictado.parar') : t('dictado.hablar')"
    :color="isListening ? 'primary' : 'neutral'"
    :variant="isListening ? 'solid' : 'outline'"
    @click="toggle"
  />
</template>

<script setup lang="ts">
const texto = defineModel<string>({ default: '' })

const { t } = useLenguajeSimple()
const { announce, alert } = useAnuncio()
const { isSupported, isListening, isFinal, result, error, start, stop } = useEntradaPorVoz()

function toggle() {
  if (isListening.value) stop()
  else start()
}

watch(isListening, (listening) => {
  if (listening) announce(t('dictado.escuchando'))
})

watch(result, (value) => {
  if (isFinal.value && value) texto.value = value
})

watch(error, (value) => {
  if (value) alert(t('dictado.error'))
})
</script>
