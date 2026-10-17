<!--
  Interruptor de sí/no. Es un checkbox con role="switch": el lector de pantalla
  dice "activado" o "desactivado". El texto "Sí"/"No" evita depender del color.
-->
<script setup lang="ts">
defineProps<{
  id: string
  etiqueta: string
  ayuda?: string
}>()

const activado = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="interruptor">
    <div class="interruptor__fila">
      <input
        :id="id"
        v-model="activado"
        class="interruptor__control"
        type="checkbox"
        role="switch"
        :aria-describedby="ayuda ? `${id}-ayuda` : undefined"
      />
      <label :for="id" class="interruptor__etiqueta">
        <span class="interruptor__pista" aria-hidden="true">
          <span class="interruptor__estado">{{ activado ? 'Sí' : 'No' }}</span>
        </span>
        <span class="interruptor__texto">{{ etiqueta }}</span>
      </label>
    </div>
    <p v-if="ayuda" :id="`${id}-ayuda`" class="interruptor__ayuda">{{ ayuda }}</p>
  </div>
</template>

<style scoped>
.interruptor__fila {
  position: relative;
}

/* El checkbox real es invisible y cubre toda la fila: se toca en cualquier parte y recibe el foco. */
.interruptor__control {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.interruptor__etiqueta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-3);
  min-height: var(--alto-tactil);
}

/* Si no entra al lado del interruptor, el texto baja a la línea siguiente. */
.interruptor__texto {
  flex: 1 1 8rem;
  overflow-wrap: break-word;
}

.interruptor__pista {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 4.2rem;
  height: 2.2rem;
  padding: 0.15rem;
  border: var(--grosor-borde) solid var(--borde-campo);
  border-radius: var(--radio-boton);
  background: var(--superficie);
  transition: background-color var(--transicion);
}

.interruptor__estado {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--texto-suave);
  color: var(--superficie);
  font-family: var(--fuente-titulos);
  font-size: 0.7rem;
  font-weight: 700;
  transition: transform var(--transicion);
}

.interruptor__control:checked + .interruptor__etiqueta .interruptor__pista {
  background: var(--primario);
  border-color: var(--primario);
}

.interruptor__control:checked + .interruptor__etiqueta .interruptor__estado {
  transform: translateX(1.8rem);
  background: var(--sobre-primario);
  color: var(--primario);
}

.interruptor__control:focus-visible {
  outline: none;
  box-shadow: none;
}

.interruptor__control:focus-visible + .interruptor__etiqueta .interruptor__pista {
  outline: 4px solid var(--foco);
  outline-offset: 2px;
  box-shadow:
    0 0 0 2px var(--foco-borde),
    0 0 0 8px var(--foco-borde);
}

.interruptor__ayuda {
  margin-top: var(--espacio-1);
  color: var(--texto-suave);
}
</style>
