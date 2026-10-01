<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Hola{{ perfil?.nombre ? `, ${perfil.nombre}` : '' }}</h1>
    <p class="max-w-prose text-lg">¿Qué querés hacer?</p>

    <nav aria-label="Qué podés hacer" class="max-w-2xl">
      <ul class="flex flex-col gap-3">
        <li v-for="a in ACCIONES" :key="a.to">
          <UButton :to="a.to" :icon="a.icon" :label="a.label" :color="a.principal ? 'primary' : 'neutral'" :variant="a.principal ? 'solid' : 'outline'" block class="justify-start" />
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
const ACCIONES = [
  { to: '/turnos/buscar', label: 'Buscar un turno', icon: 'i-lucide-search', principal: true },
  { to: '/perfil', label: 'Mi perfil', icon: 'i-lucide-user' },
  { to: '/perfil/accesibilidad', label: 'Cómo quiero usar la app', icon: 'i-lucide-accessibility' },
]

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi inicio' })

const { perfil, cargarPerfil } = useSesion()

await cargarPerfil()
</script>
