<!--
  Cancelar un turno (RF-05). Antes de cancelar explicamos las consecuencias en lenguaje simple y
  pedimos confirmación. Si falta menos de un día, la base responde 'fuera_de_plazo': avisamos y
  pedimos que confirme otra vez (queda registrado que se canceló tarde).
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { cargarReserva, cancelarReserva } = useReservas()
const { anunciar } = useAnuncio()

const numero = Number(route.params.numero)
const { data: cargado, refresh } = await useAsyncData(`reserva-cancelar-${route.params.numero}`, async () => {
  if (!Number.isInteger(numero) || numero <= 0) {
    return { datos: null, error: null }
  }
  return cargarReserva(numero)
})

const reserva = computed(() => cargado.value?.datos ?? null)
const estado = computed(() => (reserva.value ? estadoVisible(reserva.value) : null))

const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos traer el turno'
  if (!reserva.value) return 'No encontramos este turno'
  if (estado.value !== 'proximo') return 'Este turno no se puede cancelar'
  return '¿Querés cancelar este turno?'
})
useSeoMeta({ title: titulo })

const cancelando = ref(false)
// true cuando la base avisó que falta menos de un día: hay que confirmar otra vez.
const avisoTarde = ref(false)
const horasQueFaltan = ref<number | null>(null)
const errorCancelar = ref('')

async function cancelar() {
  if (!reserva.value || cancelando.value) return
  cancelando.value = true
  errorCancelar.value = ''
  anunciar('Cancelando el turno…')
  const respuesta = await cancelarReserva(reserva.value.id, avisoTarde.value)
  cancelando.value = false

  if (respuesta.ok) {
    await navigateTo({ path: '/mis-turnos', query: { cancelado: String(respuesta.numero) } })
    return
  }
  if (respuesta.motivo === 'fuera_de_plazo') {
    avisoTarde.value = true
    horasQueFaltan.value = respuesta.horas ?? null
  } else {
    errorCancelar.value = respuesta.mensaje
  }
  await nextTick()
  document.getElementById('resultado-cancelar')?.focus()
  anunciar(avisoTarde.value && !errorCancelar.value ? `${mensajeReserva('fuera_de_plazo')} ¿La cancelás igual?` : respuesta.mensaje, true)
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1>{{ titulo }}</h1>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="refresh()">Probar de nuevo</Boton>
        <Boton to="/mis-turnos" variante="secundario">Volver a mis turnos</Boton>
      </div>
    </template>

    <template v-else-if="!reserva">
      <div>
        <Boton to="/mis-turnos">Volver a mis turnos</Boton>
      </div>
    </template>

    <!-- Ya pasó, ya estaba cancelado o se cambió de fecha -->
    <template v-else-if="estado !== 'proximo'">
      <Aviso tipo="atencion">
        <p>{{ mensajeReserva(estado === 'cumplido' ? 'ya_paso' : 'no_vigente') }}</p>
      </Aviso>
      <div>
        <Boton :to="`/mis-turnos/${reserva.numero}`">Volver al turno</Boton>
      </div>
    </template>

    <template v-else>
      <div class="tarjeta pila">
        <p class="fecha">{{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}</p>
        <p>
          <strong>{{ nombreCompleto(reserva.especialidad) }}</strong><br />
          {{ reserva.centro.nombre }}, {{ reserva.centro.localidad }}
        </p>
        <p class="texto-suave">Turno N.º {{ reserva.numero }}</p>
      </div>

      <Aviso tipo="atencion" titulo="Antes de cancelar">
        <p>El turno se libera para otra persona. No se puede deshacer.</p>
        <p>Si querés otro día, podés <NuxtLink :to="`/mis-turnos/${reserva.numero}/cambiar`">cambiar la fecha</NuxtLink> en vez de cancelar.</p>
      </Aviso>

      <div id="resultado-cancelar" tabindex="-1">
        <Aviso v-if="errorCancelar" tipo="error">
          <p>{{ errorCancelar }}</p>
        </Aviso>
        <Aviso v-else-if="avisoTarde" tipo="atencion" titulo="Falta menos de un día">
          <p>
            {{ mensajeReserva('fuera_de_plazo') }}
            <template v-if="horasQueFaltan !== null">Faltan unas {{ horasQueFaltan }} horas.</template>
          </p>
          <p>Si igual no podés ir, cancelalo: así el turno le sirve a otra persona. Queda anotado que avisaste tarde.</p>
        </Aviso>
      </div>

      <div class="acciones">
        <Boton variante="peligro" @click="cancelar">
          {{ cancelando ? 'Cancelando…' : avisoTarde ? 'Sí, cancelar igual' : 'Sí, cancelar el turno' }}
        </Boton>
        <Boton :to="`/mis-turnos/${reserva.numero}`" variante="secundario">No, volver</Boton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fecha {
  font-family: var(--fuente-titulos);
  font-size: 1.2rem;
  font-weight: 700;
}

#resultado-cancelar:empty {
  display: none;
}
</style>
