<!--
  Botón "Accesibilidad" del encabezado. Abre un panel (no es una ventana modal) con las
  preferencias. Escape o "Cerrar" lo cierran y devuelven el foco al botón.
-->
<script setup lang="ts">
const abierto = ref(false)
const boton = ref<HTMLButtonElement | null>(null)
const route = useRoute()

function cerrar() {
  abierto.value = false
  boton.value?.focus()
}

function alTocarTecla(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && abierto.value) {
    cerrar()
  }
}

// Si la persona navega a otra pantalla, el panel se cierra solo.
watch(
  () => route.fullPath,
  () => {
    abierto.value = false
  },
)
</script>

<template>
  <div class="menu" @keydown="alTocarTecla">
    <button
      ref="boton"
      type="button"
      class="boton boton--secundario menu__boton"
      :aria-expanded="abierto ? 'true' : 'false'"
      aria-controls="panel-accesibilidad"
      @click="abierto = !abierto"
    >
      <svg class="menu__icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="4" r="2" fill="currentColor" />
        <path
          d="M4 8.5l8 1.5 8-1.5M12 10v5m0 0l-3.5 6.5M12 15l3.5 6.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Accesibilidad
    </button>

    <section
      v-show="abierto"
      id="panel-accesibilidad"
      class="menu__panel"
      aria-labelledby="panel-accesibilidad-titulo"
    >
      <div class="menu__cabecera">
        <h2 id="panel-accesibilidad-titulo" class="menu__titulo">Accesibilidad</h2>
        <button type="button" class="boton boton--texto" @click="cerrar">
          Cerrar <span aria-hidden="true">✕</span>
        </button>
      </div>
      <p class="texto-suave menu__ayuda">Los cambios se ven enseguida y quedan guardados en este navegador.</p>
      <PreferenciasFormulario prefijo="menu" />
      <p class="menu__mas">
        <NuxtLink to="/accesibilidad">Más sobre la accesibilidad de este sitio</NuxtLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
.menu__boton {
  padding-inline: 1rem;
}

.menu__icono {
  width: 1.4em;
  height: 1.4em;
}

.menu__panel {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  /* Sin scroll propio: si es largo, se desplaza la página entera (más fácil en el celular). */
  width: min(30rem, 100%);
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  color: var(--texto);
  border: var(--grosor-borde) solid var(--primario);
  border-radius: var(--radio-tarjeta);
  box-shadow: 0 12px 40px rgb(30 22 51 / 0.2);
}

html[data-contraste='alto'] .menu__panel {
  box-shadow: none;
}

.menu__cabecera {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio-2);
}

.menu__ayuda {
  margin-block: var(--espacio-2) var(--espacio-3);
}

.menu__mas {
  margin-top: var(--espacio-3);
}
</style>
