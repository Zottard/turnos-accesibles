<script setup lang="ts">
// Aplica las preferencias de accesibilidad (texto, contraste, movimiento) a <html>.
const { aplicarAlDocumento } = useAccesibilidad()
aplicarAlDocumento()
</script>

<template>
  <!-- v0.6: el enlace al manifiesto de la app instalable (PWA). -->
  <NuxtPwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
