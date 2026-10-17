<!--
  Control del tamaño del texto: "Más chico" / "Más grande". El cambio se ve y se anuncia al instante.
  Lo usan PreferenciasFormulario y el primer ingreso (/bienvenida).
-->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { preferencias, cambiar } = useAccesibilidad()
const { anunciar } = useAnuncio()
const { registrar } = useEventos()

const idActual = computed(() => `${props.prefijo}-tamano-actual`)
const posicion = computed(() => TAMANOS_TEXTO.indexOf(preferencias.value.tamanoTexto))

function cambiarTamano(paso: 1 | -1) {
  const nuevo = TAMANOS_TEXTO[posicion.value + paso]
  if (nuevo === undefined) {
    anunciar(paso > 0 ? 'El texto ya está en el tamaño más grande.' : 'El texto ya está en el tamaño más chico.')
    return
  }
  cambiar('tamanoTexto', nuevo)
  registrar('preferencia_tamano', { valor: String(nuevo) })
  anunciar(`Texto en ${nuevo} %`)
}
</script>

<template>
  <div class="tamano">
    <button type="button" class="boton boton--secundario tamano__boton" :aria-describedby="idActual" @click="cambiarTamano(-1)">
      <span aria-hidden="true">A−</span> Más chico
    </button>
    <p :id="idActual" class="tamano__actual">
      <span class="sr-only">Tamaño actual: </span>{{ preferencias.tamanoTexto }} %
    </p>
    <button type="button" class="boton boton--secundario tamano__boton" :aria-describedby="idActual" @click="cambiarTamano(1)">
      <span aria-hidden="true">A+</span> Más grande
    </button>
  </div>
</template>

<style scoped>
.tamano {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
}

.tamano__boton {
  padding-inline: 1rem;
}

.tamano__actual {
  min-width: 4.5ch;
  font-family: var(--fuente-titulos);
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
}
</style>
