<!--
  Una preferencia de sí/no (alto contraste, reducir movimiento, lectura en voz alta, lenguaje simple).
  Cambia al instante y anuncia "activado" o "desactivado".
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

function alCambiar(valor: boolean) {
  cambiar(props.clave, valor)
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
