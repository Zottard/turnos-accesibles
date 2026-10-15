<!--
  Un turno reservado y su comprobante (RF-04 y RF-05): número, especialidad, centro, día y hora
  en palabras, dirección, qué llevar y cómo llegar. Se puede imprimir o guardar como PDF (la hoja
  de impresión está en base.css). Si es un turno próximo: cambiar de fecha o cancelar.
  ?nuevo=1 viene del asistente (recién reservado). ?cambiado=122 viene de "Cambiar de fecha".
  La copia del comprobante por correo llega con la v0.5 (avisos).
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { cargarReserva } = useReservas()
const { preferencias } = useAccesibilidad()
const { anunciar } = useAnuncio()

const numero = Number(route.params.numero)

const { data: cargado, refresh } = await useAsyncData(`reserva-${route.params.numero}`, async () => {
  if (!Number.isInteger(numero) || numero <= 0) {
    return { datos: null, error: null }
  }
  return cargarReserva(numero)
})

const reserva = computed(() => cargado.value?.datos ?? null)
const estado = computed(() => (reserva.value ? estadoVisible(reserva.value) : null))
const nuevo = computed(() => route.query.nuevo === '1')
const cambiadoDesde = computed(() => {
  const anterior = Number(route.query.cambiado)
  return Number.isInteger(anterior) && anterior > 0 ? anterior : null
})

const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos traer el turno'
  if (!reserva.value) return 'No encontramos este turno'
  return `Turno N.º ${reserva.value.numero}`
})
useSeoMeta({ title: titulo })

const resumen = computed(() => (reserva.value ? resumenReserva(reserva.value) : ''))

// "011 4740-1100" → "01147401100" para el enlace tel:
function enlaceTelefono(telefono: string) {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`
}

function imprimir() {
  window.print()
}

// Con la lectura en voz alta activada, leemos el resumen al entrar. Esperamos un momento para no
// pisar el anuncio del título de la página (plugins/foco-al-navegar.client.ts).
onMounted(() => {
  if (preferencias.value.lecturaVoz && resumen.value) {
    setTimeout(() => anunciar(resumen.value), 800)
  }
})
</script>

<template>
  <div class="contenedor pagina">
    <template v-if="cargado?.error">
      <h1>{{ titulo }}</h1>
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="refresh()">Probar de nuevo</Boton>
        <Boton to="/mis-turnos" variante="secundario">Volver a mis turnos</Boton>
      </div>
    </template>

    <template v-else-if="!reserva || !estado">
      <h1>{{ titulo }}</h1>
      <p class="pagina__bajada">Revisá el número. Solo podés ver los turnos de tu cuenta.</p>
      <div>
        <Boton to="/mis-turnos">Volver a mis turnos</Boton>
      </div>
    </template>

    <template v-else>
      <p class="no-imprimir">
        <NuxtLink to="/mis-turnos"><span aria-hidden="true">←</span> Volver a mis turnos</NuxtLink>
      </p>
      <h1>{{ titulo }}</h1>

      <Aviso v-if="nuevo && estado === 'proximo'" tipo="exito" titulo="¡Listo! Reservaste tu turno">
        <p>Guardá este número: <strong>{{ reserva.numero }}</strong>. Lo vas a ver también en "Mis turnos".</p>
      </Aviso>
      <Aviso v-if="cambiadoDesde && estado === 'proximo'" tipo="exito" titulo="¡Listo! Cambiaste la fecha">
        <p>Este turno reemplaza al N.º {{ cambiadoDesde }}. El horario anterior quedó libre para otra persona.</p>
      </Aviso>

      <div class="estado-fila">
        <EstadoTurno :estado="estado" />
        <span v-if="estado === 'cumplido'" class="texto-suave">Este turno ya pasó.</span>
      </div>
      <Aviso v-if="estado === 'reprogramado' && reserva.nuevaNumero" tipo="info" titulo="Cambiaste este turno de fecha">
        <p>
          Lo reemplazaste por el
          <NuxtLink :to="`/mis-turnos/${reserva.nuevaNumero}`">turno N.º {{ reserva.nuevaNumero }}</NuxtLink>.
        </p>
      </Aviso>
      <Aviso v-if="estado === 'cancelado'" tipo="info" titulo="Cancelaste este turno">
        <p v-if="reserva.canceladaTarde">Lo cancelaste con menos de 24 horas de aviso.</p>
        <p v-else>El horario quedó libre para otra persona.</p>
      </Aviso>
      <p v-if="reserva.origenNumero && !cambiadoDesde" class="texto-suave">
        Este turno reemplaza al N.º {{ reserva.origenNumero }}.
      </p>

      <div id="comprobante" class="comprobante">
        <section class="tarjeta pila comprobante__cuando" aria-labelledby="titulo-cuando">
          <h2 id="titulo-cuando">Cuándo</h2>
          <p class="comprobante__fecha">{{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}</p>
          <p>Dura unos {{ reserva.duracionMin }} minutos. Llegá 15 minutos antes.</p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-que">
          <h2 id="titulo-que">Qué</h2>
          <p><strong>{{ nombreCompleto(reserva.especialidad) }}</strong></p>
          <p>Te atiende {{ reserva.profesional }}.</p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-donde">
          <h2 id="titulo-donde">Dónde</h2>
          <p>
            <strong>{{ reserva.centro.nombre }}</strong>
            <span class="texto-suave"> · {{ NOMBRES_TIPO_CENTRO[reserva.centro.tipo] ?? 'Centro de salud' }}</span>
          </p>
          <dl class="datos">
            <div>
              <dt>Dirección</dt>
              <dd>{{ reserva.centro.direccion }}, {{ reserva.centro.localidad }}</dd>
            </div>
            <div v-if="reserva.centro.telefono">
              <dt>Teléfono</dt>
              <dd>
                <a :href="enlaceTelefono(reserva.centro.telefono)">{{ reserva.centro.telefono }}</a>
              </dd>
            </div>
            <div v-if="reserva.centro.horario">
              <dt>Horario de atención</dt>
              <dd>{{ reserva.centro.horario }}</dd>
            </div>
            <div v-if="reserva.centro.accesibilidad">
              <dt>Cómo es el edificio</dt>
              <dd>{{ reserva.centro.accesibilidad }}</dd>
            </div>
          </dl>
          <p class="no-imprimir">
            <a
              class="boton boton--secundario"
              :href="enlaceComoLlegar(reserva.centro.lat, reserva.centro.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">🗺️</span>
              Cómo llegar (se abre Google Maps en otra pestaña)
            </a>
          </p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-llevar">
          <h2 id="titulo-llevar">Qué tenés que llevar</h2>
          <ul class="llevar">
            <li v-for="requisito in reserva.requisitos" :key="requisito">{{ requisito }}</li>
          </ul>
        </section>
      </div>

      <p class="texto-suave">
        Datos de prueba: el centro, el profesional y el turno son inventados. Turnos Accesibles no
        reemplaza a los sistemas oficiales de turnos.
      </p>

      <div class="acciones no-imprimir">
        <Boton variante="secundario" @click="imprimir">
          <span aria-hidden="true">🖨️</span>
          Imprimir o guardar como PDF
        </Boton>
        <LeerEnVoz :texto="resumen" etiqueta="Escuchar el turno" />
      </div>
      <!-- v0.5: acá se agrega el envío de la copia del comprobante por correo (avisos). -->
      <p class="texto-suave no-imprimir">La copia del comprobante por correo llega con la próxima versión.</p>

      <section v-if="estado === 'proximo'" class="pila no-imprimir" aria-labelledby="titulo-cambios">
        <h2 id="titulo-cambios">¿Necesitás cambiarlo?</h2>
        <div class="acciones">
          <Boton :to="`/mis-turnos/${reserva.numero}/cambiar`" variante="secundario">Cambiar de fecha</Boton>
          <Boton :to="`/mis-turnos/${reserva.numero}/cancelar`" variante="peligro">Cancelar el turno</Boton>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.estado-fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-3);
}

.comprobante {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: var(--espacio-4);
}

.comprobante__cuando {
  border-top-color: var(--exito);
}

.comprobante__fecha {
  font-family: var(--fuente-titulos);
  font-size: 1.3rem;
  font-weight: 700;
}

.datos {
  display: grid;
  gap: var(--espacio-2);
  margin: 0;
}

.datos dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.datos dd {
  margin: 0;
}

.llevar {
  display: grid;
  gap: var(--espacio-2);
}

@media print {
  .comprobante {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
}
</style>
