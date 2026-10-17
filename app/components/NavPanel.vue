<!--
  Navegación del panel administrativo (v0.6). Va arriba de cada página de /admin.
  La sección actual se marca con aria-current (subrayado grueso, no solo color).
-->
<script setup lang="ts">
const route = useRoute()

const SECCIONES = [
  { ruta: '/admin', nombre: 'Panel' },
  { ruta: '/admin/centros', nombre: 'Centros' },
  { ruta: '/admin/especialidades', nombre: 'Especialidades' },
  { ruta: '/admin/profesionales', nombre: 'Profesionales' },
  { ruta: '/admin/agendas', nombre: 'Agendas' },
  { ruta: '/admin/auditoria', nombre: 'Auditoría' },
  { ruta: '/admin/metricas', nombre: 'Métricas' },
]

// /admin/centros/3 también es "Centros".
function esActual(ruta: string) {
  return ruta === '/admin' ? route.path === '/admin' : route.path.startsWith(ruta)
}
</script>

<template>
  <nav class="nav-panel no-imprimir" aria-label="Secciones del panel">
    <ul>
      <li v-for="seccion in SECCIONES" :key="seccion.ruta">
        <NuxtLink :to="seccion.ruta" :aria-current="esActual(seccion.ruta) ? 'page' : undefined">
          {{ seccion.nombre }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.nav-panel ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.nav-panel a {
  display: inline-flex;
  align-items: center;
  min-height: var(--alto-tactil);
  padding-inline: 1rem;
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto);
  text-decoration: none;
}

.nav-panel a:hover {
  border-color: var(--primario);
  color: var(--primario);
}

.nav-panel a[aria-current='page'] {
  border-color: var(--primario);
  color: var(--primario);
  text-decoration: underline;
  text-decoration-thickness: 3px;
  text-underline-offset: 6px;
}
</style>
