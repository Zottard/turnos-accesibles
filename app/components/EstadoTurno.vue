<!--
  Etiqueta con el estado de un turno: ícono + palabra ("✓ Confirmado", "✕ Cancelado").
  Nunca dependemos solo del color.
-->
<script setup lang="ts">
const props = defineProps<{ estado: EstadoVisible }>()

const datos = computed(() => ESTADOS_TURNO[props.estado])
</script>

<template>
  <span class="estado" :class="`estado--${estado}`">
    <span aria-hidden="true">{{ datos.icono }}</span>
    {{ datos.texto }}
  </span>
</template>

<style scoped>
.estado {
  --color-estado: var(--texto-suave);
  display: inline-flex;
  align-items: center;
  gap: var(--espacio-2);
  padding: 0.1rem 0.8rem;
  background: var(--superficie);
  color: var(--texto);
  border: var(--grosor-borde) solid var(--color-estado);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 700;
}

.estado--proximo {
  --color-estado: var(--exito);
  background: var(--fondo-exito);
}

.estado--cancelado {
  --color-estado: var(--error);
  background: var(--fondo-error);
}

.estado--reprogramado {
  --color-estado: var(--primario);
  background: var(--fondo-info);
}
</style>
