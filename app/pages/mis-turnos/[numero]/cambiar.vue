<!--
  Cambiar un turno de fecha (RF-05). Dos pantallas:
    1. Elegí la nueva fecha: turnos libres de la misma especialidad, cerca del mismo centro.
    2. ¿Cambiamos tu turno?: el de antes y el nuevo, y la confirmación.
  La base (reprogramar_reserva) primero toma el turno nuevo: si ya no está libre, el de antes
  queda igual y lo decimos.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { cargarReserva, reprogramarReserva } = useReservas()
const { buscarTurnos } = useTurnos()
const { anunciar } = useAnuncio()
// Modo acompañante: solo con el permiso 'cancelar' (cancelar o cambiar de fecha). Si no lo tiene, se
// explica acá y no se muestra el botón; la base igual lo rechazaría (sin_permiso).
const { ayudando, puedoHacer } = useAyuda()
const sinPermiso = computed(() => ayudando.value !== null && !puedoHacer('cancelar'))
const volverA = computed(() => (ayudando.value ? `Volver a los turnos de ${ayudando.value.nombre}` : 'Volver a mis turnos'))

const numero = Number(route.params.numero)
const { data: cargado, refresh } = await useAsyncData(`reserva-cambiar-${route.params.numero}-${ayudando.value?.id ?? 'propia'}`, async () => {
  if (!Number.isInteger(numero) || numero <= 0) {
    return { datos: null, error: null }
  }
  return cargarReserva(numero)
})

const reserva = computed(() => cargado.value?.datos ?? null)
const estado = computed(() => (reserva.value ? estadoVisible(reserva.value) : null))

const pantalla = ref<'elegir' | 'confirmar'>('elegir')
const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos traer el turno'
  if (!reserva.value) return 'No encontramos este turno'
  if (sinPermiso.value) return 'No podés cambiar este turno'
  if (estado.value !== 'proximo') return 'Este turno no se puede cambiar'
  return pantalla.value === 'elegir' ? 'Elegí la nueva fecha' : '¿Cambiamos tu turno?'
})
useSeoMeta({ title: titulo })

const tituloRef = ref<HTMLElement | null>(null)

// --- Opciones: misma especialidad, ordenadas por cercanía al centro de ahora ---
const franja = ref<string | number | undefined>('cualquiera')
const opciones = ref<TurnoEncontrado[]>([])
const buscando = ref(false)
const errorBusqueda = ref('')
const elegido = ref<number | null>(null)
const errorElegir = ref<string | undefined>()
const mensajeTomado = ref('')

async function buscarOpciones() {
  if (!reserva.value) return
  buscando.value = true
  errorBusqueda.value = ''
  const filtros: FiltrosBusqueda = {
    ...FILTROS_VACIOS,
    especialidadId: reserva.value.especialidad.id,
    franja: franja.value === 'manana' || franja.value === 'tarde' ? franja.value : null,
  }
  const { datos, error } = await buscarTurnos(filtros, { lat: reserva.value.centro.lat, lng: reserva.value.centro.lng })
  buscando.value = false
  opciones.value = (datos ?? []).filter((turno) => turno.id !== reserva.value?.turnoId)
  errorBusqueda.value = error ?? ''
  if (elegido.value !== null && !opciones.value.some((turno) => turno.id === elegido.value)) {
    elegido.value = null
  }
}

onMounted(() => {
  if (estado.value === 'proximo') buscarOpciones()
})

watch(franja, async () => {
  await buscarOpciones()
  anunciar(errorBusqueda.value || `${cantidadEnPalabras(opciones.value.length)}.`)
})

const turnoNuevo = computed(() => opciones.value.find((turno) => turno.id === elegido.value) ?? null)

async function irAPantalla(nueva: 'elegir' | 'confirmar') {
  pantalla.value = nueva
  await nextTick()
  tituloRef.value?.focus()
  anunciar(titulo.value)
}

function seguir() {
  if (elegido.value === null) {
    errorElegir.value = 'Elegí uno de los turnos de la lista.'
    document.querySelector<HTMLElement>('[name="cambiar-turno"]')?.focus()
    anunciar(errorElegir.value)
    return
  }
  errorElegir.value = undefined
  mensajeTomado.value = ''
  irAPantalla('confirmar')
}

const cambiando = ref(false)
const errorCambiar = ref('')

async function cambiar() {
  if (!reserva.value || elegido.value === null || cambiando.value) return
  cambiando.value = true
  errorCambiar.value = ''
  anunciar('Cambiando tu turno…')
  const respuesta = await reprogramarReserva(reserva.value.id, elegido.value)
  cambiando.value = false

  if (respuesta.ok) {
    await navigateTo({ path: `/mis-turnos/${respuesta.numero}`, query: { cambiado: String(reserva.value.numero) } })
    return
  }
  if (respuesta.motivo === 'tomado') {
    // El turno nuevo se ocupó: el de antes sigue igual. Volvemos a la lista actualizada.
    mensajeTomado.value = `${respuesta.mensaje} Tu turno de antes sigue igual. Elegí otro.`
    elegido.value = null
    await buscarOpciones()
    pantalla.value = 'elegir'
    await nextTick()
    document.getElementById('resultado-cambiar')?.focus()
    anunciar(mensajeTomado.value, true)
    return
  }
  errorCambiar.value = respuesta.mensaje
  anunciar(respuesta.mensaje, true)
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1 ref="tituloRef" tabindex="-1">{{ titulo }}</h1>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="refresh()">Probar de nuevo</Boton>
        <Boton to="/mis-turnos" variante="secundario">{{ volverA }}</Boton>
      </div>
    </template>

    <template v-else-if="!reserva">
      <div>
        <Boton to="/mis-turnos">{{ volverA }}</Boton>
      </div>
    </template>

    <!-- Acompañante sin permiso para cancelar o cambiar -->
    <template v-else-if="sinPermiso && ayudando">
      <Aviso tipo="atencion">
        <p>{{ mensajeReserva('sin_permiso', { nombre: ayudando.nombre, accion: 'cancelar' }) }}</p>
      </Aviso>
      <div>
        <Boton :to="`/mis-turnos/${reserva.numero}`">Volver al turno</Boton>
      </div>
    </template>

    <template v-else-if="estado !== 'proximo'">
      <Aviso tipo="atencion">
        <p>{{ mensajeReserva(estado === 'cumplido' ? 'ya_paso' : 'no_vigente') }}</p>
      </Aviso>
      <div>
        <Boton :to="`/mis-turnos/${reserva.numero}`">Volver al turno</Boton>
      </div>
    </template>

    <!-- 1. Elegir -->
    <template v-else-if="pantalla === 'elegir'">
      <div class="tarjeta pila">
        <p class="texto-suave">Tu turno ahora (N.º {{ reserva.numero }})</p>
        <p class="fecha">{{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}</p>
        <p>
          <strong>{{ nombreCompleto(reserva.especialidad) }}</strong><br />
          {{ reserva.centro.nombre }}, {{ reserva.centro.localidad }}
        </p>
      </div>

      <div id="resultado-cambiar" tabindex="-1">
        <Aviso v-if="mensajeTomado" tipo="atencion" titulo="No pudimos cambiarlo">
          <p>{{ mensajeTomado }}</p>
        </Aviso>
      </div>

      <form class="tarjeta pila" novalidate @submit.prevent="seguir">
        <fieldset>
          <legend>¿A qué hora te queda mejor?</legend>
          <div class="franjas">
            <OpcionTarjeta
              v-for="opcion in OPCIONES_FRANJA"
              :key="opcion.valor"
              v-model="franja"
              nombre="cambiar-franja"
              :valor="opcion.valor"
              :titulo="opcion.titulo"
              :descripcion="opcion.descripcion"
              :icono="opcion.icono"
            />
          </div>
        </fieldset>

        <p v-if="buscando">Buscando turnos…</p>
        <Aviso v-else-if="errorBusqueda" tipo="error">
          <p>{{ errorBusqueda }}</p>
          <Boton variante="secundario" @click="buscarOpciones">Probar de nuevo</Boton>
        </Aviso>
        <template v-else-if="opciones.length > 0">
          <p v-if="errorElegir" class="error-campo"><span aria-hidden="true">✕</span> {{ errorElegir }}</p>
          <OpcionesTurno
            v-model="elegido"
            :turnos="opciones"
            nombre="cambiar-turno"
            :leyenda="`Turnos libres de ${reserva.especialidad.nombreSimple}, cerca de ${reserva.centro.nombre}`"
          />
        </template>
        <Aviso v-else tipo="atencion" titulo="No hay otros turnos libres">
          <p>Probá con otro horario o volvé más adelante. Tu turno de ahora sigue igual.</p>
        </Aviso>

        <div class="acciones">
          <Boton type="submit">Seguir</Boton>
          <Boton :to="`/mis-turnos/${reserva.numero}`" variante="secundario">Volver al turno</Boton>
        </div>
      </form>
    </template>

    <!-- 2. Confirmar -->
    <template v-else>
      <dl class="tarjeta cambio">
        <div>
          <dt>Tu turno de antes (se libera)</dt>
          <dd>
            {{ conMayuscula(turnoEnPalabras(reserva.inicio)) }}<br />
            {{ reserva.centro.nombre }}, {{ reserva.centro.localidad }}
          </dd>
        </div>
        <div v-if="turnoNuevo">
          <dt>Tu turno nuevo</dt>
          <dd>
            <strong>{{ conMayuscula(turnoEnPalabras(turnoNuevo.inicio)) }}</strong><br />
            {{ turnoNuevo.centroNombre }}, {{ turnoNuevo.centroDireccion }}, {{ turnoNuevo.centroLocalidad }}<br />
            Te atiende {{ turnoNuevo.profesional }}.
          </dd>
        </div>
      </dl>
      <Aviso tipo="atencion" titulo="Antes de cambiar">
        <p>Tu turno de antes queda libre para otra persona. No se puede deshacer.</p>
      </Aviso>
      <Aviso v-if="errorCambiar" tipo="error">
        <p>{{ errorCambiar }}</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="cambiar">{{ cambiando ? 'Cambiando…' : 'Sí, cambiar el turno' }}</Boton>
        <Boton variante="secundario" @click="irAPantalla('elegir')">Elegir otro</Boton>
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

.franjas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}

.cambio {
  display: grid;
  gap: var(--espacio-3);
  margin: 0;
}

.cambio dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.cambio dd {
  margin: 0;
}

#resultado-cambiar:empty {
  display: none;
}
</style>
