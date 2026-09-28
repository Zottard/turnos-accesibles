<template>
  <div class="min-h-dvh flex flex-col">
    <SkipLink />

    <header class="border-b-2 border-default">
      <div class="w-full max-w-5xl flex flex-wrap items-center gap-4 mx-auto px-4 py-3">
        <NuxtLink to="/" class="text-xl font-bold no-underline">{{ appName }}</NuxtLink>
        <AccessibilityMenu class="ml-auto" />
      </div>
    </header>

    <main id="contenido" tabindex="-1" class="w-full max-w-5xl flex-1 mx-auto px-4 py-8">
      <slot />
    </main>

    <footer class="border-t-2 border-default">
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
</script>
