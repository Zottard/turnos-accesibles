<!--
  Opción grande para marcar o desmarcar (una casilla de verdad dentro de un <label>), como
  OpcionTarjeta pero se pueden elegir varias. Va dentro de un <fieldset> con su <legend>.
-->
<script setup lang="ts">
defineProps<{
  nombre: string
  valor: string
  titulo: string
  descripcion?: string
  icono?: string
}>()

const elegidos = defineModel<string[]>({ default: () => [] })
</script>

<template>
  <label class="opcion">
    <input v-model="elegidos" class="opcion__casilla" type="checkbox" :name="nombre" :value="valor" />
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

.opcion:has(.opcion__casilla:checked) {
  background: var(--fondo-info);
  border-color: var(--primario);
  border-width: 3px;
}

.opcion:has(.opcion__casilla:focus-visible) {
  outline: 4px solid var(--foco);
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--foco-borde),
    0 0 0 8px var(--foco-borde);
}

.opcion__casilla:focus-visible {
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
