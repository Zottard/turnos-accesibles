<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Panel de administración</h1>
    <p class="text-lg">Estamos armando esta sección.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Administración' })
</script>
