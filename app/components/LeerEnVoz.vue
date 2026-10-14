<!--
  Botón "Escuchar": lee en voz alta un texto, o el texto de un elemento de la página (por id).
  Usa la velocidad que eligió la persona. Mientras lee, el botón pasa a "Detener".
  Si el navegador no puede leer, muestra un mensaje con la alternativa (texto más grande).
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    texto?: string
    objetivoId?: string
    etiqueta?: string
  }>(),
  {
    texto: undefined,
    objetivoId: undefined,
    etiqueta: 'Escuchar',
  },
)

const { preferencias } = useAccesibilidad()

// Arranca en true para que el HTML del servidor y el del navegador coincidan;
// al montar revisamos si el navegador realmente puede leer.
const disponible = ref(true)
const leyendo = ref(false)

onMounted(() => {
  disponible.value = vozDisponible()
})

onBeforeUnmount(() => {
  if (leyendo.value) {
    callar()
  }
})

function textoALeer(): string {
  if (props.texto) {
    return props.texto
  }
  if (props.objetivoId) {
    return document.getElementById(props.objetivoId)?.innerText ?? ''
  }
  return ''
}

function alternar() {
  if (leyendo.value) {
    callar()
    leyendo.value = false
    return
  }
  const texto = textoALeer()
  if (!texto) {
    return
  }
  leyendo.value = true
  hablar(texto, preferencias.value.velocidadVoz, () => {
    leyendo.value = false
  })
}
</script>

<template>
  <div class="leer">
    <button v-if="disponible" type="button" class="boton boton--secundario" @click="alternar">
      <span aria-hidden="true">{{ leyendo ? '■' : '🔊' }}</span>
      {{ leyendo ? 'Detener' : etiqueta }}
    </button>
    <p v-else class="leer__sin-voz">
      Tu navegador no puede leer en voz alta. Podés agrandar el texto desde Accesibilidad.
    </p>
  </div>
</template>

<style scoped>
.leer__sin-voz {
  color: var(--texto-suave);
}
</style>
