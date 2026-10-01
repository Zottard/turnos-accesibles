<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Hola{{ perfil?.nombre ? `, ${perfil.nombre}` : '' }}</h1>
    <p class="max-w-prose text-lg">¿Qué querés hacer?</p>
    <UButton to="/turnos/buscar" color="primary" variant="solid" icon="i-lucide-search" label="Buscar un turno" block class="sm:w-auto sm:self-start" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi inicio' })

const { perfil, cargarPerfil } = useSesion()

await cargarPerfil()
</script>
