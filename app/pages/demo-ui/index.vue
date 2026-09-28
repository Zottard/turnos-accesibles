<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold">Componentes (solo desarrollo)</h1>

    <div class="grid gap-6 lg:grid-cols-2">
      <section v-for="combo in COMBOS" :key="combo.src" class="flex flex-col gap-2">
        <h2 class="text-lg font-bold">{{ combo.label }}</h2>
        <iframe :src="combo.src" :title="combo.label" class="w-full h-[48rem] border-2 border-default rounded-md" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const COMBOS = [
  { label: 'Claro, texto 100 %', src: '/demo-ui/muestra?tema=claro&escala=100' },
  { label: 'Claro, texto 200 %', src: '/demo-ui/muestra?tema=claro&escala=200' },
  { label: 'Alto contraste, texto 100 %', src: '/demo-ui/muestra?tema=alto-contraste&escala=100' },
  { label: 'Alto contraste, texto 200 %', src: '/demo-ui/muestra?tema=alto-contraste&escala=200' },
]

useHead({ title: 'Componentes' })
</script>
