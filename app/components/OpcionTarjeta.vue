<!--
  Opción grande para elegir una cosa de varias. Es un radio de verdad dentro de un <label>:
  se puede tocar toda la tarjeta y se maneja con las flechas del teclado.
  Va dentro de un <fieldset> con su <legend>.
-->
<script setup lang="ts">
defineProps<{
  nombre: string
  valor: string | number
  titulo: string
  descripcion?: string
  icono?: string
}>()

const elegido = defineModel<string | number>()
</script>

<template>
  <label class="opcion">
    <input v-model="elegido" class="opcion__radio" type="radio" :name="nombre" :value="valor" />
    <span v-if="icono" class="opcion__icono" aria-hidden="true">{{ icono }}</span>
    <span class="opcion__texto">
      <span class="opcion__titulo">{{ titulo }}</span>
      <span v-if="descripcion" class="opcion__descripcion">{{ descripcion }}</span>
    </span>
  </label>
</template>

<style scoped>
.opcion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-3);
  min-height: var(--alto-tactil);
  padding: var(--espacio-3);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde-campo);
  border-radius: var(--radio-tarjeta);
  cursor: pointer;
}

.opcion:hover {
  border-color: var(--primario);
}

.opcion:has(.opcion__radio:checked) {
  background: var(--fondo-info);
  border-color: var(--primario);
  border-width: 3px;
}

/* El foco del radio se muestra en toda la tarjeta. */
.opcion:has(.opcion__radio:focus-visible) {
  outline: 4px solid var(--foco);
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--foco-borde),
    0 0 0 8px var(--foco-borde);
}

.opcion__radio:focus-visible {
  outline: none;
  box-shadow: none;
}

.opcion__icono {
  font-size: 1.5rem;
  line-height: 1;
}

.opcion__texto {
  display: flex;
  flex: 1 1 5rem;
  flex-direction: column;
  overflow-wrap: break-word;
}

.opcion__titulo {
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.opcion__descripcion {
  font-weight: 400;
  color: var(--texto-suave);
}
</style>
