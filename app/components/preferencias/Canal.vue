<!-- Cómo querés que te avisemos: en la pantalla, con sonido o las dos cosas. Se guarda en la cuenta. -->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { aviso } = usePreferenciasCuenta()
const { anunciar } = useAnuncio()

const CANALES: { valor: CanalAviso; titulo: string; descripcion: string; icono: string }[] = [
  { valor: 'visual', titulo: 'En la pantalla', descripcion: 'Un aviso escrito, bien visible.', icono: '👀' },
  { valor: 'sonoro', titulo: 'Con sonido', descripcion: 'Un sonido y la lectura del aviso.', icono: '🔔' },
  { valor: 'ambos', titulo: 'Las dos cosas', descripcion: 'Aviso escrito y sonido.', icono: '✨' },
]

function elegir(valor: string | number | undefined) {
  const elegido = CANALES.find((canal) => canal.valor === valor)
  if (!elegido) {
    return
  }
  aviso.value = { ...aviso.value, canalAviso: elegido.valor }
  anunciar(`Avisos: ${elegido.titulo.toLowerCase()}`)
}
</script>

<template>
  <div class="opciones">
    <OpcionTarjeta
      v-for="canal in CANALES"
      :key="canal.valor"
      :nombre="`${props.prefijo}-canal`"
      :valor="canal.valor"
      :titulo="canal.titulo"
      :descripcion="canal.descripcion"
      :icono="canal.icono"
      :model-value="aviso.canalAviso"
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
