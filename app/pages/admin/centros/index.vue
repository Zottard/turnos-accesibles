<!--
  Centros de salud (RF-08): todos, también los que no están publicados. Se buscan por nombre.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Centros de salud' })

const { cargarCentros } = useAdmin()
const { data: centros } = await useAsyncData('admin-centros', () => cargarCentros())

const busqueda = ref('')
const visibles = computed(() => {
  const texto = normalizar(busqueda.value)
  const lista = centros.value?.datos ?? []
  return texto ? lista.filter((centro) => normalizar(`${centro.nombre} ${centro.localidad}`).includes(texto)) : lista
})

function faltan(centro: CentroAdmin) {
  return faltantesParaPublicar({
    telefono: centro.telefono ?? '',
    horario: centro.horario ?? '',
    accesibilidad: centro.accesibilidad ?? '',
  })
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Centros de salud</h1>
    <p class="pagina__bajada">Un centro publicado aparece en la búsqueda. Si le faltan datos, no se publica.</p>

    <div>
      <Boton to="/admin/centros/nuevo"><span aria-hidden="true">＋</span> Agregar un centro</Boton>
    </div>

    <Aviso v-if="centros?.error" tipo="error">
      <p>{{ centros.error }}</p>
    </Aviso>

    <div class="buscador">
      <Campo id="buscar-centro" v-model="busqueda" etiqueta="Buscar por nombre o localidad" type="search" />
    </div>
    <p aria-live="polite" class="texto-suave">
      {{ visibles.length === 1 ? 'Mostramos 1 centro.' : `Mostramos ${visibles.length} centros.` }}
    </p>

    <ul class="lista-tarjetas">
      <li v-for="centro in visibles" :key="centro.id" class="tarjeta">
        <h2 :id="`centro-${centro.id}`" class="titulo-tarjeta">{{ centro.nombre }}</h2>
        <span v-if="centro.activo" class="insignia insignia--si"><span aria-hidden="true">✓</span> Publicado</span>
        <span v-else class="insignia insignia--no"><span aria-hidden="true">!</span> Sin publicar</span>
        <p>
          {{ NOMBRES_TIPO_CENTRO[centro.tipo] ?? centro.tipo }} · {{ centro.localidad }}<br />
          {{ centro.direccion }}
        </p>
        <p v-if="faltan(centro).length > 0" class="texto-suave">Falta {{ listaEnPalabras(faltan(centro)) }}.</p>
        <div>
          <Boton :to="`/admin/centros/${centro.id}`" variante="secundario" :aria-describedby="`centro-${centro.id}`">
            Ver o cambiar
          </Boton>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.buscador {
  max-width: 30rem;
}

.titulo-tarjeta {
  font-size: 1.2rem;
}
</style>
