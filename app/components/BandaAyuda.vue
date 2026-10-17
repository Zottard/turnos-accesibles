<!--
  "Estás ayudando a Rosa" (modo acompañante, v0.5). Queda fija debajo del encabezado mientras dure
  el modo, en todas las páginas, para que nunca haya dudas de con qué turnos se está operando.
  Al abrir la app revisa contra la base que Rosa siga compartiendo sus turnos (y el alcance).
-->
<script setup lang="ts">
const { conSesion } = useSesion()
const { ayudando, dejar, verificar } = useAyuda()
const { anunciar } = useAnuncio()

const visible = computed(() => conSesion.value && ayudando.value !== null)

onMounted(() => {
  if (visible.value) verificar()
})

async function dejarDeAyudar() {
  const nombre = ayudando.value?.nombre ?? ''
  dejar()
  anunciar(`Dejaste de ayudar a ${nombre}. Ahora ves tus turnos.`)
  await navigateTo('/inicio')
}
</script>

<template>
  <div v-if="visible && ayudando" class="banda-ayuda no-imprimir">
    <div class="contenedor banda-ayuda__interior">
      <span class="banda-ayuda__icono" aria-hidden="true">🤝</span>
      <p class="banda-ayuda__texto">
        <strong>Estás ayudando a {{ ayudando.nombre }}.</strong>
        Podés {{ alcanceEnPalabras(ayudando.alcance, 'ajeno') }}.
      </p>
      <div class="banda-ayuda__acciones">
        <NuxtLink to="/mis-turnos" class="boton boton--secundario">Ver sus turnos</NuxtLink>
        <button type="button" class="boton boton--texto" @click="dejarDeAyudar">Dejar de ayudar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banda-ayuda {
  background: var(--fondo-info);
  border-bottom: var(--grosor-borde) solid var(--primario);
}

.banda-ayuda__interior {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
  padding-block: var(--espacio-3);
}

.banda-ayuda__icono {
  font-size: 1.5rem;
  line-height: 1;
}

.banda-ayuda__texto {
  flex: 1 1 16rem;
}

.banda-ayuda__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-2);
}
</style>
