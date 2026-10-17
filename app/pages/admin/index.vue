<!--
  Panel de administración (v0.6, RF-08 y RF-09): números rápidos y una tarjeta por sección.
  Solo para el rol admin (middleware/admin.ts; la base igual lo controla).
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Panel de administración' })

const { cargarResumen } = useAdmin()
const { data: resumen } = await useAsyncData('admin-resumen', () => cargarResumen())

const SECCIONES = [
  {
    ruta: '/admin/centros',
    icono: '🏥',
    titulo: 'Centros de salud',
    texto: 'Cargá un centro nuevo, corregí sus datos o dalo de baja.',
  },
  {
    ruta: '/admin/especialidades',
    icono: '🩺',
    titulo: 'Especialidades',
    texto: 'El nombre técnico, el nombre simple y las palabras con que la gente las busca.',
  },
  { ruta: '/admin/profesionales', icono: '👩‍⚕️', titulo: 'Profesionales', texto: 'Quién atiende cada especialidad y en qué centro.' },
  {
    ruta: '/admin/agendas',
    icono: '📅',
    titulo: 'Agendas',
    texto: 'Cargá los turnos de un profesional o dá de baja los turnos libres.',
  },
  { ruta: '/admin/auditoria', icono: '📝', titulo: 'Auditoría', texto: 'Quién cambió qué y cuándo.' },
  {
    ruta: '/admin/metricas',
    icono: '📊',
    titulo: 'Métricas y reportes',
    texto: 'Turnos buscados, reservados y cumplidos. Descargá la planilla o el PDF.',
  },
]
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Panel de administración</h1>
    <p class="pagina__bajada">Lo que cambies acá se ve enseguida en la búsqueda de turnos.</p>

    <Aviso v-if="resumen?.error" tipo="error">
      <p>{{ resumen.error }}</p>
    </Aviso>

    <section v-if="resumen?.datos" aria-labelledby="titulo-numeros">
      <h2 id="titulo-numeros" class="sr-only">Números de hoy</h2>
      <dl class="numeros">
        <div class="tarjeta numero">
          <dt>Centros publicados</dt>
          <dd>{{ resumen.datos.centrosPublicados }} <span class="numero__de">de {{ resumen.datos.centros }}</span></dd>
        </div>
        <div class="tarjeta numero">
          <dt>Especialidades activas</dt>
          <dd>{{ resumen.datos.especialidades }}</dd>
        </div>
        <div class="tarjeta numero">
          <dt>Profesionales</dt>
          <dd>{{ resumen.datos.profesionales }}</dd>
        </div>
        <div class="tarjeta numero">
          <dt>Turnos libres en los próximos 30 días</dt>
          <dd>{{ resumen.datos.turnosLibres }}</dd>
        </div>
      </dl>
    </section>

    <ul class="lista-tarjetas">
      <li v-for="seccion in SECCIONES" :key="seccion.ruta" class="tarjeta">
        <h2><span aria-hidden="true">{{ seccion.icono }}</span> {{ seccion.titulo }}</h2>
        <p>{{ seccion.texto }}</p>
        <div>
          <Boton :to="seccion.ruta" variante="secundario">Ir a {{ seccion.titulo.toLowerCase() }}</Boton>
        </div>
      </li>
    </ul>

    <p class="texto-suave">Datos de prueba: los centros, profesionales y turnos son inventados.</p>
  </div>
</template>

<style scoped>
.numeros {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--espacio-3);
}

.numero {
  border-top-color: var(--exito);
}

.numero dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.numero dd {
  margin: 0;
  font-family: var(--fuente-titulos);
  font-size: 2rem;
  font-weight: 800;
}

.numero__de {
  font-size: 1rem;
  font-weight: 600;
  color: var(--texto-suave);
}
</style>
