<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
    <UInput
      v-model="clave"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      class="w-full"
    />
    <UButton
      :label="visible ? 'Ocultar' : 'Mostrar'"
      :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
      size="lg"
      class="shrink-0"
      :aria-label="visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'"
      @click="visible = !visible"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ autocomplete: 'current-password' | 'new-password' }>()

const clave = defineModel<string>({ default: '' })

const visible = ref(false)
</script>
