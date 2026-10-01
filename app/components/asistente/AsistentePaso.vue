<template>
  <section class="flex flex-col gap-8" :aria-labelledby="tituloId">
    <div class="flex flex-col gap-3">
      <p class="text-lg font-bold">{{ progreso }}</p>
      <UProgress v-if="paso >= 1" :model-value="paso" :max="total" aria-hidden="true" />
    </div>

    <div class="flex flex-col gap-4">
      <h1 :id="tituloId" ref="tituloEl" tabindex="-1" class="text-2xl font-bold">{{ titulo }}</h1>
      <p v-if="descripcion" class="max-w-prose text-lg">{{ descripcion }}</p>
      <ReadAloudButton v-if="prefs.voiceEnabled" :text="lectura" />
    </div>

    <slot />

    <slot name="acciones" />
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  paso: number
  total: number
  titulo: string
  descripcion?: string
}>()

const tituloId = useId()
const tituloEl = useTemplateRef<HTMLHeadingElement>('tituloEl')

const { prefs } = useAccesibilidad()
const { t } = useLenguajeSimple()
const { announce } = useAnuncio()
const { speak } = useLecturaEnVozAlta()

const progreso = computed(() => (props.paso < 1 ? 'Antes de empezar' : t('progreso.paso', { actual: props.paso, total: props.total })))
const lectura = computed(() => [props.titulo, props.descripcion].filter(Boolean).join('. '))

function presentar() {
  tituloEl.value?.focus()
  announce(progreso.value)
  if (prefs.value.voiceEnabled) speak(lectura.value)
}

onMounted(presentar)
watch(() => props.paso, () => nextTick(presentar))
</script>
