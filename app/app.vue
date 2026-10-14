<script setup lang="ts">
// Aplica las preferencias de accesibilidad (texto, contraste, movimiento) a <html>.
const { aplicarAlDocumento } = useAccesibilidad()
aplicarAlDocumento()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
