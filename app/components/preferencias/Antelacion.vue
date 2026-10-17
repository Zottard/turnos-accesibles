<!-- Con cuánto tiempo antes del turno querés el recordatorio. Se guarda en la cuenta. -->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { aviso } = usePreferenciasCuenta()
const { anunciar } = useAnuncio()

const OPCIONES: { valor: AntelacionHoras; titulo: string; descripcion: string }[] = [
  { valor: 2, titulo: '2 horas antes', descripcion: 'El mismo día del turno.' },
  { valor: 24, titulo: '1 día antes', descripcion: 'Lo recomendado.' },
  { valor: 48, titulo: '2 días antes', descripcion: 'Para organizarte con tiempo.' },
]

function elegir(valor: string | number | undefined) {
  const elegida = OPCIONES.find((opcion) => opcion.valor === valor)
  if (!elegida) {
    return
  }
  aviso.value = { ...aviso.value, antelacionHoras: elegida.valor }
  anunciar(`Recordatorio ${elegida.titulo}`)
}
</script>

<template>
  <div class="opciones">
    <OpcionTarjeta
      v-for="opcion in OPCIONES"
      :key="opcion.valor"
      :nombre="`${props.prefijo}-antelacion`"
      :valor="opcion.valor"
      :titulo="opcion.titulo"
      :descripcion="opcion.descripcion"
      :model-value="aviso.antelacionHoras"
      @update:model-value="elegir"
    />
  </div>
</template>

<style scoped>
.opciones {
  display: grid;
  gap: var(--espacio-2);
}
</style>
