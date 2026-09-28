<template>
  <UApp :locale="es">
    <NuxtLayout>
      <div class="max-w-xl flex flex-col gap-6">
        <h1 class="text-2xl font-bold">{{ texto.titulo }}</h1>
        <p class="text-lg">{{ texto.ayuda }}</p>
        <UButton color="primary" variant="solid" icon="i-lucide-house" label="Ir al inicio" class="self-start" @click="clearError({ redirect: '/' })" />
      </div>
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import { es } from '@nuxt/ui/locale'

const props = defineProps<{ error: NuxtError }>()

const TEXTOS: Record<number, { titulo: string, ayuda: string }> = {
  403: { titulo: 'No podés ver esta página.', ayuda: 'Esta parte es solo para otras personas. Volvé al inicio para seguir.' },
  404: { titulo: 'No encontramos esta página.', ayuda: 'Puede que la dirección esté mal escrita. Volvé al inicio para seguir.' },
}

const texto = computed(() => TEXTOS[props.error.statusCode ?? 500] ?? {
  titulo: 'Algo no funcionó.',
  ayuda: 'Probá de nuevo en un momento. Si sigue pasando, volvé al inicio.',
})

useHead({ title: () => texto.value.titulo })
</script>
