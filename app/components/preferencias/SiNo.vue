<!--
  Una preferencia de sí/no (alto contraste, reducir movimiento, lectura en voz alta, lenguaje simple).
  Cambia al instante y anuncia 'activado' o 'desactivado'.
-->
<script setup lang="ts">
const props = defineProps<{
  id: string
  clave: 'altoContraste' | 'reducirMovimiento' | 'lecturaVoz' | 'lenguajeSimple'
  etiqueta: string
  ayuda?: string
}>()

const { preferencias, cambiar } = useAccesibilidad()
const { anunciar } = useAnuncio()
const { registrar } = useEventos()

function alCambiar(valor: boolean) {
  cambiar(props.clave, valor)
  // Métricas (v0.6): cuánta gente usa la voz y el alto contraste.
  if (props.clave === 'lecturaVoz') registrar('preferencia_voz', { valor: valor ? 'activado' : 'desactivado' })
  if (props.clave === 'altoContraste') registrar('preferencia_contraste', { valor: valor ? 'activado' : 'desactivado' })
  anunciar(`${props.etiqueta} ${valor ? 'activado' : 'desactivado'}`)
}
</script>

<template>
  <Interruptor
    :id="id"
    :etiqueta="etiqueta"
    :ayuda="ayuda"
    :model-value="preferencias[clave]"
    @update:model-value="alCambiar"
  />
</template>
