<!--
  Especialidades (RF-08): todas, también las que no están activas.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Especialidades' })

const { cargarEspecialidades } = useAdmin()
const { data: especialidades } = await useAsyncData('admin-especialidades', () => cargarEspecialidades())

const busqueda = ref('')
const visibles = computed(() => {
  const texto = normalizar(busqueda.value)
  const lista = especialidades.value?.datos ?? []
  return texto
    ? lista.filter((especialidad) =>
        normalizar(`${especialidad.nombre} ${especialidad.nombreSimple} ${especialidad.palabrasClave.join(' ')}`).includes(texto),
      )
    : lista
})
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Especialidades</h1>
    <p class="pagina__bajada">
      Las palabras clave son las que usa la gente para buscar ("ojos", "vista"). Mientras más, mejor.
    </p>

    <div>
      <Boton to="/admin/especialidades/nueva"><span aria-hidden="true">＋</span> Agregar una especialidad</Boton>
    </div>

    <Aviso v-if="especialidades?.error" tipo="error">
      <p>{{ especialidades.error }}</p>
    </Aviso>

    <div class="buscador">
      <Campo id="buscar-especialidad" v-model="busqueda" etiqueta="Buscar por nombre o palabra clave" type="search" />
    </div>
    <p aria-live="polite" class="texto-suave">
      {{ visibles.length === 1 ? 'Mostramos 1 especialidad.' : `Mostramos ${visibles.length} especialidades.` }}
    </p>

    <ul class="lista-tarjetas">
      <li v-for="especialidad in visibles" :key="especialidad.id" class="tarjeta">
        <h2 :id="`especialidad-${especialidad.id}`" class="titulo-tarjeta">{{ nombreCompleto(especialidad) }}</h2>
        <span v-if="especialidad.activa" class="insignia insignia--si"><span aria-hidden="true">✓</span> Activa</span>
        <span v-else class="insignia insignia--no"><span aria-hidden="true">!</span> Dada de baja</span>
        <p>{{ especialidad.descripcion }}</p>
        <p class="texto-suave">
          {{ especialidad.palabrasClave.length > 0 ? `Palabras clave: ${especialidad.palabrasClave.join(', ')}.` : 'Sin palabras clave.' }}
        </p>
        <div>
          <Boton
            :to="`/admin/especialidades/${especialidad.id}`"
            variante="secundario"
            :aria-describedby="`especialidad-${especialidad.id}`"
          >
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
