<template>
  <UApp :locale="es">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { es } from '@nuxt/ui/locale'

const { appName } = useAppConfig()

useHead({
  titleTemplate: (title) => (title ? `${title} · ${appName}` : appName),
})
</script>
