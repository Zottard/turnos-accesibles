<!--
  Resumen de errores arriba de un formulario. Cada error es un enlace que lleva al campo.
  Así quien usa lector de pantalla escucha todo lo que falta de una vez.
-->
<script setup lang="ts">
defineProps<{
  errores: { id: string; mensaje: string }[]
}>()
</script>

<template>
  <Aviso v-if="errores.length > 0" tipo="error" titulo="Revisá estos datos">
    <ul class="resumen">
      <li v-for="error in errores" :key="error.id">
        <a :href="`#${error.id}`">{{ error.mensaje }}</a>
      </li>
    </ul>
  </Aviso>
</template>

<style scoped>
.resumen {
  margin-top: var(--espacio-1);
}
</style>
