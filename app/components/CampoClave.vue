<!--
  Campo de contraseña con un botón para mostrarla u ocultarla.
  Ver lo que se escribe ayuda mucho a quien tipea despacio o con errores.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    id: string
    etiqueta?: string
    autocomplete: 'current-password' | 'new-password'
    ayuda?: string
    error?: string
  }>(),
  {
    etiqueta: 'Contraseña',
    ayuda: undefined,
    error: undefined,
  },
)

const clave = defineModel<string>({ default: '' })
const visible = ref(false)
</script>

<template>
  <div class="campo-clave">
    <Campo
      :id="id"
      v-model="clave"
      :etiqueta="etiqueta"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :ayuda="ayuda"
      :error="error"
      requerido
    />
    <button
      type="button"
      class="boton boton--texto campo-clave__ver"
      :aria-controls="id"
      @click="visible = !visible"
    >
      <span aria-hidden="true">{{ visible ? '🙈' : '👁' }}</span>
      {{ visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña' }}
    </button>
  </div>
</template>

<style scoped>
.campo-clave__ver {
  margin-top: var(--espacio-1);
  padding-inline: 0;
}
</style>
