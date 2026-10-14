<!-- Velocidad de la lectura en voz alta: lenta, normal o rápida. -->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { preferencias, cambiar } = useAccesibilidad()
const { anunciar } = useAnuncio()

const VELOCIDADES = [
  { valor: 0.7, titulo: 'Lenta', icono: '🐢' },
  { valor: 0.9, titulo: 'Normal', icono: '🙂' },
  { valor: 1.2, titulo: 'Rápida', icono: '🐇' },
]

function cambiarVelocidad(valor: string | number | undefined) {
  const elegida = VELOCIDADES.find((velocidad) => velocidad.valor === valor)
  if (!elegida) {
    return
  }
  cambiar('velocidadVoz', elegida.valor)
  anunciar(`Velocidad de la voz: ${elegida.titulo.toLowerCase()}`)
}
</script>

<template>
  <fieldset>
    <legend>Velocidad de la voz</legend>
    <div class="velocidad__opciones">
      <OpcionTarjeta
        v-for="velocidad in VELOCIDADES"
        :key="velocidad.valor"
        :nombre="`${props.prefijo}-velocidad`"
        :valor="velocidad.valor"
        :titulo="velocidad.titulo"
        :icono="velocidad.icono"
        :model-value="preferencias.velocidadVoz"
        @update:model-value="cambiarVelocidad"
      />
    </div>
  </fieldset>
</template>

<style scoped>
legend {
  margin-bottom: var(--espacio-2);
}

.velocidad__opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: var(--espacio-2);
}
</style>
