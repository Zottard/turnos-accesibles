<!--
  Mis turnos (RF-05): los próximos y los anteriores (cumplidos, cancelados y cambiados de fecha).
  Cada turno lleva a su detalle, que es también el comprobante.
  ?cancelado=123 viene de cancelar un turno: lo confirma con un aviso.
  v0.5: en modo acompañante ("Estás ayudando a Rosa") son los turnos de Rosa, y "Pedir un turno"
  aparece solo si Rosa le dio ese permiso.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { cargarReservas } = useReservas()
const { ayudando, puedoHacer } = useAyuda()

const titulo = computed(() => (ayudando.value ? `Turnos de ${ayudando.value.nombre}` : 'Mis turnos'))
useSeoMeta({ title: titulo })

const { data: cargado, refresh } = await useAsyncData(`mis-turnos-${ayudando.value?.id ?? 'propios'}`, () => cargarReservas())

const grupos = computed(() => separarReservas(cargado.value?.datos ?? []))
const cancelado = computed(() => {
  const numero = Number(route.query.cancelado)
  return Number.isInteger(numero) && numero > 0 ? numero : null
})
</script>

<template>
  <div class="contenedor pagina">
    <h1>{{ titulo }}</h1>

    <Aviso v-if="cancelado" tipo="exito" titulo="Cancelaste el turno">
      <p>El turno N.º {{ cancelado }} quedó cancelado. El horario quedó libre para otra persona.</p>
    </Aviso>

    <template v-if="cargado?.sinPermiso">
      <Aviso tipo="atencion">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton to="/inicio">Volver a mi inicio</Boton>
      </div>
    </template>

    <template v-else-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton @click="refresh()">Probar de nuevo</Boton>
      </div>
    </template>

    <template v-else>
      <div v-if="puedoHacer('reservar')">
        <Boton to="/asistente">{{ ayudando ? `Pedir un turno para ${ayudando.nombre}` : 'Pedir un turno nuevo' }}</Boton>
      </div>

      <section class="pila" aria-labelledby="titulo-proximos">
        <h2 id="titulo-proximos">Próximos</h2>
        <p v-if="grupos.proximos.length === 0">
          {{ ayudando ? `${ayudando.nombre} no tiene turnos próximos.` : 'No tenés turnos próximos.' }}
        </p>
        <ul v-else class="lista-reservas">
          <li v-for="reserva in grupos.proximos" :key="reserva.id" class="reserva">
            <EstadoTurno :estado="estadoVisible(reserva)" />
            <h3 :id="`reserva-${reserva.numero}`">{{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}</h3>
            <p>
              <strong>{{ nombreCompleto(reserva.especialidad) }}</strong><br />
              {{ reserva.centro.nombre }}, {{ reserva.centro.localidad }}
            </p>
            <p v-if="reserva.asistida && reserva.creadaPorNombre" class="texto-suave">Lo sacó {{ reserva.creadaPorNombre }}.</p>
            <div>
              <Boton :to="`/mis-turnos/${reserva.numero}`" variante="secundario" :aria-describedby="`reserva-${reserva.numero}`">
                Ver el turno N.º {{ reserva.numero }}
              </Boton>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="grupos.anteriores.length > 0" class="pila" aria-labelledby="titulo-anteriores">
        <h2 id="titulo-anteriores">Anteriores</h2>
        <ul class="lista-reservas">
          <li v-for="reserva in grupos.anteriores" :key="reserva.id" class="reserva reserva--anterior">
            <EstadoTurno :estado="estadoVisible(reserva)" />
            <h3 :id="`reserva-${reserva.numero}`">{{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}</h3>
            <p>
              <strong>{{ nombreCompleto(reserva.especialidad) }}</strong><br />
              {{ reserva.centro.nombre }}, {{ reserva.centro.localidad }}
            </p>
            <p>
              <NuxtLink :to="`/mis-turnos/${reserva.numero}`" :aria-describedby="`reserva-${reserva.numero}`">
                Ver el turno N.º {{ reserva.numero }}
              </NuxtLink>
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.lista-reservas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

.reserva {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--espacio-2);
  max-width: none;
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-left: 8px solid var(--exito);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
}

.reserva--anterior {
  border-left-color: var(--borde);
  box-shadow: none;
}
</style>
