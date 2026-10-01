<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold">Sacá un turno médico, paso a paso</h1>
    <p class="max-w-prose">
      Te ayudamos a pedir un turno en un hospital o centro de salud público.
      Te hacemos una pregunta por pantalla. Podés volver atrás cuando quieras.
    </p>
    <UButton to="/turnos/buscar" color="primary" variant="solid" icon="i-lucide-search" label="Buscar un turno" block class="sm:w-auto sm:self-start" />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Inicio' })
</script>
