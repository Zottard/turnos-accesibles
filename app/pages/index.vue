<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold">Sacá un turno médico, paso a paso</h1>
    <p class="max-w-prose">
      Te ayudamos a pedir un turno en un hospital o centro de salud público.
      Te hacemos una pregunta por pantalla. Podés volver atrás cuando quieras.
    </p>
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <UButton to="/turnos/asistente" color="primary" variant="solid" icon="i-lucide-calendar-plus" label="Sacar un turno" block class="sm:w-auto" />
      <UButton to="/turnos/buscar" icon="i-lucide-search" label="Ver todos los turnos libres" block class="sm:w-auto" />
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Inicio' })
</script>
