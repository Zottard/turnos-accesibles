<template>
  <div :aria-busy="estado === 'cargando'">
    <div v-if="estado === 'cargando'" class="flex items-center gap-4 py-8">
      <UIcon name="i-lucide-loader-circle" class="size-8 shrink-0 animate-spin" aria-hidden="true" />
      <p class="text-lg">{{ textos.cargando }}</p>
    </div>

    <div v-else-if="estado === 'vacio'" class="flex flex-col gap-4 py-6">
      <p class="text-lg">{{ textos.vacio }}</p>
      <slot name="vacio" />
    </div>

    <UAlert
      v-else-if="estado === 'error'"
      color="error"
      icon="i-lucide-circle-x"
      :title="textos.errorTitulo"
      :description="textos.errorAyuda"
      :actions="[{ label: t('accion.reintentar'), icon: 'i-lucide-rotate-ccw', size: 'lg', onClick: () => emit('reintentar') }]"
    />

    <UAlert
      v-else-if="estado === 'sin-permiso'"
      color="warning"
      icon="i-lucide-lock"
      :title="t('estado.sin-permiso.titulo')"
      :description="t('estado.sin-permiso.ayuda')"
      :actions="[{ label: t('accion.ir-inicio'), icon: 'i-lucide-house', size: 'lg', to: '/' }]"
    />

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
export type EstadoVista = 'cargando' | 'vacio' | 'error' | 'sin-permiso' | 'contenido'

const props = defineProps<{
  estado: EstadoVista
  textoCargando?: string
  textoVacio?: string
  errorTitulo?: string
  errorAyuda?: string
}>()

const emit = defineEmits<{ reintentar: [] }>()

const { t } = useLenguajeSimple()
const { announce, alert } = useAnuncio()

const textos = computed(() => ({
  cargando: props.textoCargando ?? t('estado.cargando'),
  vacio: props.textoVacio ?? t('estado.vacio'),
  errorTitulo: props.errorTitulo ?? t('estado.error.titulo'),
  errorAyuda: props.errorAyuda ?? t('estado.error.ayuda'),
}))

watch(() => props.estado, (estado) => {
  if (estado === 'cargando') announce(textos.value.cargando)
  if (estado === 'vacio') announce(textos.value.vacio)
  if (estado === 'error') alert(`${textos.value.errorTitulo} ${textos.value.errorAyuda}`)
  if (estado === 'sin-permiso') alert(`${t('estado.sin-permiso.titulo')} ${t('estado.sin-permiso.ayuda')}`)
})
</script>
