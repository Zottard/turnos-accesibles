<template>
  <div class="min-h-dvh flex flex-col">
    <SkipLink />
    <BarraDemo v-if="demo" class="print:hidden" />

    <header class="border-b-2 border-default print:hidden">
      <div class="w-full max-w-5xl flex flex-wrap items-center gap-4 mx-auto px-4 py-3">
        <NuxtLink to="/" class="text-xl font-bold no-underline">{{ appName }}</NuxtLink>
        <div class="flex flex-wrap items-center gap-3 ml-auto">
          <AccessibilityMenu />
          <nav aria-label="Tu cuenta" class="flex flex-wrap gap-3">
            <template v-if="user">
              <UButton to="/inicio" label="Mi inicio" icon="i-lucide-house" size="lg" />
              <UButton to="/notificaciones" icon="i-lucide-bell" size="lg" :aria-label="noLeidas ? `Avisos, ${noLeidas} sin leer` : 'Avisos'">
                Avisos
                <UBadge v-if="noLeidas" color="primary" variant="solid" :label="String(noLeidas)" size="md" aria-hidden="true" />
              </UButton>
              <UButton label="Salir" icon="i-lucide-log-out" size="lg" @click="cerrarSesion" />
            </template>
            <UButton v-else to="/ingresar" label="Ingresar" icon="i-lucide-log-in" size="lg" />
          </nav>
        </div>
      </div>
    </header>

    <div v-if="user && asistiendo" class="border-b-2 border-primary bg-primary/10 print:hidden">
      <div class="w-full max-w-5xl flex flex-wrap items-center gap-x-4 gap-y-2 mx-auto px-4 py-3">
        <p class="flex items-center gap-2 text-lg font-bold">
          <UIcon name="i-lucide-hand-heart" class="size-6 shrink-0" aria-hidden="true" />
          Estás ayudando a {{ asistiendo.nombre }}
        </p>
        <div class="flex flex-wrap gap-3 sm:ml-auto">
          <UButton :to="`/asistiendo/${asistiendo.id}`" size="lg" icon="i-lucide-list" :label="`Turnos de ${asistiendo.nombre}`" />
          <UButton size="lg" icon="i-lucide-log-out" label="Volver a mi cuenta" @click="dejarDeAyudar" />
        </div>
      </div>
    </div>

    <div v-if="avisoNuevo" class="w-full max-w-5xl mx-auto px-4 pt-4 print:hidden">
      <UAlert
        color="info"
        icon="i-lucide-bell-ring"
        :title="`Aviso nuevo: ${avisoNuevo.titulo}`"
        :description="avisoNuevo.cuerpo"
        :actions="[
          { label: 'Ver mis avisos', icon: 'i-lucide-bell', size: 'lg', to: '/notificaciones', onClick: () => { avisoNuevo = null } },
          { label: 'Cerrar el aviso', icon: 'i-lucide-x', size: 'lg', onClick: () => { avisoNuevo = null } },
        ]"
      />
    </div>

    <main id="contenido" tabindex="-1" class="w-full max-w-5xl flex-1 mx-auto px-4 py-8">
      <slot />
    </main>

    <footer class="border-t-2 border-default print:hidden">
      <nav aria-label="Información" class="w-full max-w-5xl mx-auto px-4 py-6">
        <ul class="flex flex-wrap gap-x-6 gap-y-2">
          <li v-for="link in FOOTER_LINKS" :key="link.to">
            <NuxtLink :to="link.to" class="inline-flex items-center min-h-12 underline">{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </nav>
    </footer>

    <LiveRegion />
  </div>
</template>

<script setup lang="ts">
const FOOTER_LINKS = [
  { to: '/ayuda', label: 'Ayuda' },
  { to: '/accesibilidad', label: 'Accesibilidad' },
  { to: '/terminos', label: 'Términos de uso' },
]

const { appName } = useAppConfig()
const { demo } = useRuntimeConfig().public
const { user, salir } = useSesion()
const { noLeidas } = useNotificaciones()
const { asistiendo } = useAcompanamiento()

async function dejarDeAyudar() {
  const nombre = asistiendo.value?.nombre
  asistiendo.value = null
  await navigateTo('/inicio')
  announce(`Dejaste de ayudar a ${nombre}. Estás en tu cuenta.`)
}
const avisoNuevo = useState<{ titulo: string, cuerpo: string } | null>('aviso-nuevo', () => null)
const { announce } = useAnuncio()

async function cerrarSesion() {
  asistiendo.value = null
  await salir()
  await navigateTo('/')
  announce('Saliste de tu cuenta.')
}
</script>
