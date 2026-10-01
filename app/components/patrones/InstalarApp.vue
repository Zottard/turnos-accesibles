<template>
  <ClientOnly>
    <p v-if="instalada" class="text-lg">Ya tenés la app instalada en este dispositivo.</p>
    <UButton v-else-if="disponible" icon="i-lucide-download" label="Instalar la app en este dispositivo" class="self-start" @click="alTocar" />
  </ClientOnly>
</template>

<script setup lang="ts">
const { disponible, instalada, instalar } = useInstalar()
const { announce } = useAnuncio()

async function alTocar() {
  if (await instalar()) announce('Listo. La app quedó instalada. La vas a encontrar con tus otras aplicaciones.')
}
</script>
