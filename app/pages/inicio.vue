<!-- Inicio de la persona que ingresó: saludo y lo que puede hacer (o lo que llega pronto). -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi inicio' })

const { cargarPerfil } = usePerfil()
const { data: perfil } = await useAsyncData('perfil-inicio', async () => (await cargarPerfil()).datos)

const saludo = computed(() => (perfil.value?.nombre ? `Hola, ${perfil.value.nombre}` : 'Hola'))
</script>

<template>
  <div class="contenedor pagina">
    <h1>{{ saludo }}</h1>
    <p class="pagina__bajada">¿Qué querés hacer hoy?</p>

    <ul class="tarjetas">
      <li class="tarjeta">
        <h2><span aria-hidden="true">🔎</span> Buscar un turno</h2>
        <Aviso tipo="info" titulo="Próximamente">
          <p>Muy pronto vas a poder buscar turnos en los centros de salud cerca de tu casa.</p>
        </Aviso>
      </li>
      <li class="tarjeta">
        <h2><span aria-hidden="true">📅</span> Mis turnos</h2>
        <Aviso tipo="info" titulo="Próximamente">
          <p>Acá vas a ver tus turnos, y vas a poder cambiarlos o cancelarlos.</p>
        </Aviso>
      </li>
      <li class="tarjeta">
        <h2><span aria-hidden="true">👤</span> Mi perfil</h2>
        <p>Revisá tus datos y cómo querés ver la página.</p>
        <div class="acciones">
          <Boton to="/perfil" variante="secundario">Ver mis datos</Boton>
          <Boton to="/perfil/accesibilidad" variante="secundario">Mis preferencias</Boton>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: var(--espacio-4);
  padding: 0;
  list-style: none;
}

.tarjetas > li {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-3);
  max-width: none;
}
</style>
