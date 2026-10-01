<template>
  <nav aria-label="Secciones de administración" class="border-b-2 border-default pb-4">
    <ul class="flex flex-wrap gap-2">
      <li v-for="s in SECCIONES" :key="s.to">
        <UButton
          :to="s.to"
          :icon="s.icon"
          :label="s.label"
          size="lg"
          :color="route.path === s.to ? 'primary' : 'neutral'"
          :variant="route.path === s.to ? 'solid' : 'outline'"
        />
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const SECCIONES = [
  { to: '/admin', label: 'Panel', icon: 'i-lucide-layout-dashboard' },
  { to: '/admin/centros', label: 'Centros', icon: 'i-lucide-hospital' },
  { to: '/admin/especialidades', label: 'Especialidades', icon: 'i-lucide-stethoscope' },
  { to: '/admin/profesionales', label: 'Profesionales', icon: 'i-lucide-user-round' },
  { to: '/admin/agendas', label: 'Agendas', icon: 'i-lucide-calendar-cog' },
  { to: '/admin/metricas', label: 'Métricas', icon: 'i-lucide-chart-column' },
]

const route = useRoute()
</script>
