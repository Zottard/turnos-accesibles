<!--
  Inicio de la persona que ingresó: saludo, su próximo turno y lo que puede hacer.
  v0.5: si acompaña a alguien, "Personas que acompañás": elegir a quién ayudar (modo acompañante).
  Lo de esta página es siempre de la persona que ingresó, aunque esté ayudando a otra.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi inicio' })

const { cargarPerfil } = usePerfil()
const { cargarReservas } = useReservas()
const { ayudando, cargarPersonas, empezar, dejar } = useAyuda()
const { registrar } = useEventos()
const { data: perfil } = await useAsyncData('perfil-inicio', async () => (await cargarPerfil()).datos)
const { data: reservas } = await useAsyncData('reservas-inicio', () => cargarReservas(undefined, { propias: true }))
const { data: personas } = await useAsyncData('personas-que-acompano', () => cargarPersonas())

const saludo = computed(() => (perfil.value?.nombre ? `Hola, ${perfil.value.nombre}` : 'Hola'))
const proxima = computed(() => proximaReserva(reservas.value?.datos ?? []))

async function ayudarA(persona: PersonaAcompanada) {
  empezar(persona)
  registrar('acompanante_ayudar')
  await navigateTo('/mis-turnos')
}

// Mi turno: si estaba ayudando a alguien, vuelvo a mis turnos.
async function verMiTurno(numero: number) {
  dejar()
  await navigateTo(`/mis-turnos/${numero}`)
}
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
        <Boton v-if="!ayudando" :to="`/mis-turnos/${proxima.numero}`" variante="secundario">
          Ver el turno N.º {{ proxima.numero }}
        </Boton>
        <Boton v-else variante="secundario" @click="verMiTurno(proxima.numero)">Ver el turno N.º {{ proxima.numero }}</Boton>
      </div>
    </section>

    <!-- Modo acompañante: las personas que me dieron permiso -->
    <section v-if="personas?.datos?.length" class="pila" aria-labelledby="titulo-acompano">
      <h2 id="titulo-acompano"><span aria-hidden="true">🤝</span> Personas que acompañás</h2>
      <ul class="tarjetas">
        <li v-for="persona in personas.datos" :key="persona.id" class="tarjeta acompano">
          <h3 :id="`acompano-${persona.id}`">{{ persona.nombre }} {{ persona.apellido }}</h3>
          <p>Podés {{ alcanceEnPalabras(persona.alcance, 'ajeno') }}.</p>
          <p v-if="ayudando?.id === persona.id" class="texto-suave">Ahora estás en modo ayuda con esta persona.</p>
          <div>
            <Boton :aria-describedby="`acompano-${persona.id}`" @click="ayudarA(persona)">Ayudar a {{ persona.nombre }}</Boton>
          </div>
        </li>
      </ul>
    </section>

    <!-- v0.6: el admin entra al panel desde acá. -->
    <section v-if="perfil?.rol === 'admin'" class="tarjeta pila panel" aria-labelledby="titulo-panel">
      <h2 id="titulo-panel"><span aria-hidden="true">🛠️</span> Panel de administración</h2>
      <p>Centros, especialidades, agendas, auditoría y métricas.</p>
      <div>
        <Boton to="/admin">Ir al panel</Boton>
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

    <InstalarApp />
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

.acompano,
.proximo,
.panel {
  border-top-color: var(--exito);
}

.proximo__fecha {
  font-family: var(--fuente-titulos);
  font-size: 1.3rem;
  font-weight: 700;
}
</style>
