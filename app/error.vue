<!-- Pantalla de error (página que no existe o falla del servidor), en lenguaje simple. -->
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

// Esta pantalla no pasa por app.vue: aplicamos acá también las preferencias.
const { aplicarAlDocumento } = useAccesibilidad()
aplicarAlDocumento()

const noExiste = computed(() => props.error.statusCode === 404)

const titulo = computed(() => (noExiste.value ? 'No encontramos esta página' : 'Algo salió mal'))

useSeoMeta({ title: titulo })

function irAlInicio() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <div class="contenedor pagina">
      <h1>{{ titulo }}</h1>
      <p v-if="noExiste" class="pagina__bajada">
        Puede que la dirección esté mal escrita o que esta parte todavía no exista.
      </p>
      <p v-else class="pagina__bajada">
        No es tu culpa. Tuvimos un problema de nuestro lado. Probá de nuevo en un rato.
      </p>
      <div>
        <Boton @click="irAlInicio">Volver al inicio</Boton>
      </div>
    </div>
  </NuxtLayout>
</template>
