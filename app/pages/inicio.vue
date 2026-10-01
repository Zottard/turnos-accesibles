<template>
  <div class="flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Hola{{ perfil?.nombre ? `, ${perfil.nombre}` : '' }}</h1>
    <p class="max-w-prose text-lg">¿Qué querés hacer?</p>

    <nav aria-label="Qué podés hacer" class="max-w-2xl">
      <ul class="flex flex-col gap-3">
        <li v-for="p in ayudo" :key="p.id">
          <UButton :to="`/asistiendo/${p.id}`" icon="i-lucide-hand-heart" :label="`Ayudar a ${p.nombre}`" block class="justify-start" />
        </li>
        <li v-for="a in ACCIONES" :key="a.to">
          <UButton :to="a.to" :icon="a.icon" :label="a.label" :color="a.principal ? 'primary' : 'neutral'" :variant="a.principal ? 'solid' : 'outline'" block class="justify-start" />
        </li>
      </ul>
    </nav>

    <InstalarApp />
  </div>
</template>

<script setup lang="ts">
const ACCIONES = [
  { to: '/turnos/asistente', label: 'Sacar un turno', icon: 'i-lucide-calendar-plus', principal: true },
  { to: '/mis-turnos', label: 'Mis turnos', icon: 'i-lucide-list' },
  { to: '/turnos/buscar', label: 'Ver todos los turnos libres', icon: 'i-lucide-search' },
  { to: '/notificaciones', label: 'Mis avisos', icon: 'i-lucide-bell' },
  { to: '/acompanantes', label: 'Mis acompañantes', icon: 'i-lucide-users' },
  { to: '/perfil', label: 'Mi perfil', icon: 'i-lucide-user' },
  { to: '/perfil/accesibilidad', label: 'Cómo quiero usar la app', icon: 'i-lucide-accessibility' },
]

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi inicio' })

const { perfil, cargarPerfil } = useSesion()
const { aQuienesAyudo } = useAcompanamiento()

const ayudo = ref<Awaited<ReturnType<typeof aQuienesAyudo>>>([])

await cargarPerfil()

onMounted(async () => {
  ayudo.value = await aQuienesAyudo().catch(() => [])
})
</script>
