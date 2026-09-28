<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Hola{{ perfil?.nombre ? `, ${perfil.nombre}` : '' }}</h1>
    <p class="max-w-prose text-lg">Pronto vas a poder sacar un turno desde acá, paso a paso.</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi inicio' })

const { perfil, cargarPerfil } = useSesion()

await cargarPerfil()
</script>
