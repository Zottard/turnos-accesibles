<template>
  <div class="sr-only">
    <div role="status" aria-live="polite" aria-atomic="true">{{ polite }}</div>
    <div role="alert" aria-live="assertive" aria-atomic="true">{{ assertive }}</div>
  </div>
</template>

<script setup lang="ts">
const { polite, assertive } = useAnuncio()
</script>
