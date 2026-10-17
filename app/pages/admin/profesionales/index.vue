<!--
  Profesionales (RF-08): quién atiende cada especialidad y en qué centro.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Profesionales' })

const route = useRoute()
const { cargarProfesionales } = useAdmin()
const { data: profesionales } = await useAsyncData('admin-profesionales', () => cargarProfesionales())

const borrado = typeof route.query.borrado === 'string' ? route.query.borrado : ''

const busqueda = ref('')
const visibles = computed(() => {
  const texto = normalizar(busqueda.value)
  const lista = profesionales.value?.datos ?? []
  return texto
    ? lista.filter((profesional) =>
        normalizar(
          `${profesional.nombre} ${profesional.especialidad?.nombreSimple ?? ''} ${profesional.especialidad?.nombre ?? ''} ${profesional.centro?.nombre ?? ''}`,
        ).includes(texto),
      )
    : lista
})
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Profesionales</h1>
    <p class="pagina__bajada">Cada profesional atiende una especialidad en un centro. Sus turnos se cargan en Agendas.</p>

    <div>
      <Boton to="/admin/profesionales/nuevo"><span aria-hidden="true">＋</span> Agregar un profesional</Boton>
    </div>

    <Aviso v-if="borrado" tipo="exito">
      <p>Borramos a {{ borrado }} y su agenda libre.</p>
    </Aviso>
    <Aviso v-if="profesionales?.error" tipo="error">
      <p>{{ profesionales.error }}</p>
    </Aviso>

    <div class="buscador">
      <Campo id="buscar-profesional" v-model="busqueda" etiqueta="Buscar por nombre, especialidad o centro" type="search" />
    </div>
    <p aria-live="polite" class="texto-suave">
      {{ visibles.length === 1 ? 'Mostramos 1 profesional.' : `Mostramos ${visibles.length} profesionales.` }}
    </p>

    <ul class="lista-tarjetas">
      <li v-for="profesional in visibles" :key="profesional.id" class="tarjeta">
        <h2 :id="`profesional-${profesional.id}`" class="titulo-tarjeta">{{ profesional.nombre }}</h2>
        <p>
          <template v-if="profesional.especialidad">{{ nombreCompleto(profesional.especialidad) }}</template><br />
          {{ profesional.centro?.nombre }}<template v-if="profesional.centro"> ({{ profesional.centro.localidad }})</template>
        </p>
        <div class="acciones">
          <Boton
            :to="`/admin/profesionales/${profesional.id}`"
            variante="secundario"
            :aria-describedby="`profesional-${profesional.id}`"
          >
            Ver o cambiar
          </Boton>
          <Boton
            :to="`/admin/agendas?profesional=${profesional.id}`"
            variante="texto"
            :aria-describedby="`profesional-${profesional.id}`"
          >
            Su agenda
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
