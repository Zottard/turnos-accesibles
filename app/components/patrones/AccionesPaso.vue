<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <UButton
      color="primary"
      variant="solid"
      block
      class="sm:w-auto"
      :label="confirmar ?? t('accion.continuar')"
      :loading="cargando"
      :type="submit ? 'submit' : 'button'"
      @click="!submit && emit('confirmar')"
    />
    <UButton
      v-if="!sinVolver"
      block
      class="sm:w-auto"
      icon="i-lucide-arrow-left"
      :label="volver ?? t('accion.volver')"
      @click="emit('volver')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  confirmar?: string
  volver?: string
  cargando?: boolean
  sinVolver?: boolean
  submit?: boolean
}>()

const emit = defineEmits<{ confirmar: [], volver: [] }>()

const { t } = useLenguajeSimple()
</script>
