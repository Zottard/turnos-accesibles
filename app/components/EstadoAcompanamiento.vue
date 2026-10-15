<!-- Estado de un acompañamiento con ícono y palabra ("✓ Activo"): nunca solo el color. -->
<script setup lang="ts">
const props = defineProps<{ estado: EstadoVinculo }>()

const datos = computed(() => ESTADOS_VINCULO[props.estado])
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2);
  max-width: 100%;
  overflow-wrap: normal;
  hyphens: none;
  padding: 0.1rem 0.8rem;
  background: var(--superficie);
  color: var(--texto);
  border: var(--grosor-borde) solid var(--color-estado);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 700;
}

.estado--activo {
  --color-estado: var(--exito);
  background: var(--fondo-exito);
}

.estado--pendiente {
  --color-estado: var(--primario);
  background: var(--fondo-info);
}

.estado--revocado,
.estado--rechazado {
  --color-estado: var(--error);
  background: var(--fondo-error);
}
</style>
