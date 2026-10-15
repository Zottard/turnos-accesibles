<!--
  Banda de avisos nuevos (v0.5), debajo del encabezado. No es un cartel que se va solo: queda
  hasta que la persona la cierra o abre el aviso. No titila ni se mueve.
  role="status": el lector de pantalla la anuncia sin interrumpir ni mover el foco.
  No se muestra en /avisos (ahí ya está la bandeja).
-->
<script setup lang="ts">
const route = useRoute()
const { conSesion } = useSesion()
const { sinLeer, cerrados, cerrarBanda } = useAvisos()

const enBanda = computed(() => (conSesion.value && route.path !== '/avisos' ? avisosParaBanda(sinLeer.value, cerrados.value) : []))
const primero = computed(() => enBanda.value[0] ?? null)
const titulo = computed(() => (primero.value ? textoAviso(primero.value).titulo : ''))
const destino = computed(() =>
  enBanda.value.length === 1 && primero.value ? { path: '/avisos', query: { aviso: primero.value.id } } : '/avisos',
)

function cerrar() {
  cerrarBanda(enBanda.value.map((aviso) => aviso.id))
  // El botón desaparece: el foco va al contenido para no perderse.
  document.getElementById('contenido')?.focus()
}
</script>

<template>
  <div class="banda no-imprimir" role="status">
    <div v-if="primero" class="contenedor banda__interior">
      <span class="banda__icono" aria-hidden="true">🔔</span>
      <p class="banda__texto">
        <strong>{{ enBanda.length === 1 ? 'Tenés un aviso nuevo:' : `Tenés ${enBanda.length} avisos nuevos.` }}</strong>
        {{ enBanda.length === 1 ? titulo : `El último: ${titulo}` }}
      </p>
      <div class="banda__acciones">
        <NuxtLink :to="destino" class="boton boton--primario">
          {{ enBanda.length === 1 ? 'Ver aviso' : 'Ver avisos' }}
        </NuxtLink>
        <button type="button" class="boton boton--texto" @click="cerrar">
          Cerrar<span class="sr-only"> la banda de avisos</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banda:empty,
.banda:not(:has(.banda__interior)) {
  display: none;
}

.banda {
  background: var(--fondo-resaltado);
  border-bottom: var(--grosor-borde) solid var(--atencion);
}

.banda__interior {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
  padding-block: var(--espacio-3);
}

.banda__icono {
  font-size: 1.5rem;
  line-height: 1;
}

.banda__texto {
  flex: 1 1 16rem;
}

.banda__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-2);
}
</style>
