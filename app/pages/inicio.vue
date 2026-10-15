<!-- Inicio de la persona que ingresó: saludo, su próximo turno y lo que puede hacer. -->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi inicio' })

const { cargarPerfil } = usePerfil()
const { cargarReservas } = useReservas()
const { data: perfil } = await useAsyncData('perfil-inicio', async () => (await cargarPerfil()).datos)
const { data: reservas } = await useAsyncData('reservas-inicio', () => cargarReservas())

const saludo = computed(() => (perfil.value?.nombre ? `Hola, ${perfil.value.nombre}` : 'Hola'))
const proxima = computed(() => proximaReserva(reservas.value?.datos ?? []))
</script>

<template>
  <div class="contenedor pagina">
    <h1>{{ saludo }}</h1>

    <section v-if="proxima" class="tarjeta pila proximo" aria-labelledby="titulo-proximo">
      <h2 id="titulo-proximo"><span aria-hidden="true">📅</span> Tu próximo turno</h2>
      <p class="proximo__fecha">{{ conMayuscula(turnoEnPalabras(proxima.inicio)) }}</p>
      <p>
        <strong>{{ nombreCompleto(proxima.especialidad) }}</strong><br />
        {{ proxima.centro.nombre }}, {{ proxima.centro.direccion }}, {{ proxima.centro.localidad }}
      </p>
      <div>
        <Boton :to="`/mis-turnos/${proxima.numero}`" variante="secundario">Ver el turno N.º {{ proxima.numero }}</Boton>
      </div>
    </section>

    <p class="pagina__bajada">¿Qué querés hacer hoy?</p>

    <ul class="tarjetas">
      <li class="tarjeta">
        <h2><span aria-hidden="true">🩺</span> Pedir un turno</h2>
        <p>Te hacemos unas preguntas cortas, de a una, y elegís el turno.</p>
        <div class="acciones">
          <Boton to="/asistente">Pedir un turno</Boton>
          <Boton to="/buscar" variante="secundario">Buscar turnos</Boton>
        </div>
      </li>
      <li class="tarjeta">
        <h2><span aria-hidden="true">📋</span> Mis turnos</h2>
        <p>Mirá tus turnos. Podés cambiarles la fecha o cancelarlos.</p>
        <div>
          <Boton to="/mis-turnos" variante="secundario">Ver mis turnos</Boton>
        </div>
      </li>
      <li class="tarjeta">
        <h2><span aria-hidden="true">🤝</span> Personas que te ayudan</h2>
        <p>Dejá que alguien de confianza vea tus turnos o te saque turnos. Vos decidís qué puede hacer.</p>
        <div>
          <Boton to="/acompanantes" variante="secundario">Ver o invitar</Boton>
        </div>
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

.proximo {
  border-top-color: var(--exito);
}

.proximo__fecha {
  font-family: var(--fuente-titulos);
  font-size: 1.3rem;
  font-weight: 700;
}
</style>
