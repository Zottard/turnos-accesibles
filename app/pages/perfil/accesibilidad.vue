<template>
  <div class="max-w-2xl flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Cómo querés usar la app</h1>
      <p class="text-lg">Cada cambio se guarda solo en tu cuenta. Lo vas a ver igual en cualquier teléfono o computadora donde ingreses.</p>
    </div>

    <PreferenciaControl v-for="c in CLAVES" :key="c" :clave="c" />

    <UButton icon="i-lucide-rotate-ccw" label="Volver a como viene la app" class="self-start" @click="reset" />
  </div>
</template>

<script setup lang="ts">
import type { ClavePreferencia } from '~/components/preferencias/PreferenciaControl.vue'

const CLAVES: ClavePreferencia[] = ['textScale', 'contrast', 'voz', 'plainLanguage', 'reduceMotion', 'avisos']

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mis preferencias' })

const { prefs, reset } = useAccesibilidad()
const { announce } = useAnuncio()

const avisarGuardado = useDebounceFn(() => announce('Guardamos el cambio.'), 800)

watch(prefs, avisarGuardado)
</script>
