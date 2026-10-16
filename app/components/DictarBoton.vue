<!--
  Botón "Decilo con tu voz": escucha una frase y la manda con el evento `texto`.
  Mientras escucha, el botón pasa a "Escuchando… tocá para terminar".
  Un aria-live cuenta qué está pasando. Si el navegador no puede dictar, lo explica: el cuadro de
  texto sigue estando para escribir.
-->
<script setup lang="ts">
const emit = defineEmits<{ texto: [texto: string] }>()

// Arranca en true para que el HTML del servidor y el del navegador coincidan;
// al montar revisamos si el navegador realmente puede dictar.
const disponible = ref(true)
const escuchando = ref(false)
const estado = ref('')
let terminar: (() => void) | null = null

onMounted(() => {
  disponible.value = dictadoDisponible()
})

onBeforeUnmount(() => {
  terminar?.()
})

function alternar() {
  if (escuchando.value) {
    terminar?.()
    return
  }
  escuchando.value = true
  estado.value = 'Te escuchamos. Hablá ahora.'
  terminar = dictar({
    alResultado: (texto) => {
      estado.value = `Escuchamos: «${texto}». Lo pusimos en el cuadro.`
      emit('texto', texto)
    },
    alError: (mensaje) => {
      estado.value = mensaje
    },
    alTerminar: () => {
      escuchando.value = false
      terminar = null
    },
  })
}
</script>

<template>
  <div class="dictar">
    <template v-if="disponible">
      <button type="button" class="boton boton--secundario" :class="{ 'dictar--escuchando': escuchando }" @click="alternar">
        <span aria-hidden="true">{{ escuchando ? '■' : '🎤' }}</span>
        {{ escuchando ? 'Escuchando… tocá para terminar' : 'Decilo con tu voz' }}
      </button>
    </template>
    <p v-else class="texto-suave">
      Tu navegador no puede escuchar tu voz. Escribilo en el cuadro: es igual de fácil.
    </p>
    <p class="dictar__estado" aria-live="polite">{{ estado }}</p>
  </div>
</template>

<style scoped>
.dictar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--espacio-2);
}

.dictar--escuchando {
  background: var(--fondo-atencion);
  border-color: var(--atencion);
  color: var(--texto);
}

.dictar__estado:empty {
  display: none;
}
</style>
