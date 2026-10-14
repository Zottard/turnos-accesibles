<!--
  Botón de la app. Con `to` es un enlace (navega); sin `to` es un <button> (hace una acción).
  Nunca se deshabilita por datos faltantes: se deja apretar y se explica qué falta.
  Los estilos están en assets/css/base.css (clase .boton).
-->
<script setup lang="ts">
type Variante = 'primario' | 'secundario' | 'peligro' | 'texto'

const props = withDefaults(
  defineProps<{
    to?: string
    type?: 'button' | 'submit' | 'reset'
    variante?: Variante
    bloque?: boolean
  }>(),
  {
    to: undefined,
    type: 'button',
    variante: 'primario',
    bloque: false,
  },
)

const clases = computed(() => ['boton', `boton--${props.variante}`, { 'boton--bloque': props.bloque }])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="clases">
    <slot />
  </NuxtLink>
  <button v-else :type="type" :class="clases">
    <slot />
  </button>
</template>
