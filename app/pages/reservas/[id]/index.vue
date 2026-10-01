<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando tu turno. Esperá un momento."
      error-titulo="No pudimos mostrar tu turno."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="refresh()"
    >
      <div v-if="reserva?.turno" class="flex flex-col gap-8">
        <div class="flex flex-col gap-4">
          <h1 ref="tituloEl" tabindex="-1" class="text-2xl font-bold">{{ titulo }}</h1>
          <EstadoBadge :estado="reserva.estado" class="self-start" />
          <p class="text-lg">
            Número de turno:
            <strong class="text-2xl">{{ reserva.numero_correlativo }}</strong>
          </p>
          <ReadAloudButton v-if="prefs.voiceEnabled" :text="lectura" />
        </div>

        <ResumenReserva :turno="reserva.turno" />

        <UAlert
          v-if="reserva.estado === 'confirmada'"
          color="info"
          icon="i-lucide-bell"
          title="Te vamos a recordar el turno el día anterior."
          description="Este turno es de prueba: el hospital es real, pero el turno no está cargado en el sistema del hospital."
        />

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <UButton v-if="reserva.estado === 'confirmada'" color="primary" variant="solid" icon="i-lucide-calendar-plus" label="Agregar a mi calendario" @click="agregarAlCalendario" />
          <UButton
            v-if="reserva.turno.centro"
            :to="enlaceComoLlegar(reserva.turno.centro.lat, reserva.turno.centro.lng)"
            target="_blank"
            icon="i-lucide-map"
            label="Cómo llegar (se abre el mapa)"
          />
          <UButton to="/mis-turnos" icon="i-lucide-list" label="Ver mis turnos" />
        </div>

        <div v-if="sePuedeCambiar" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <UButton :to="`/reservas/${reserva.id}/reprogramar`" icon="i-lucide-calendar-sync" label="Cambiar de fecha" />
          <UButton :to="`/reservas/${reserva.id}/cancelar`" color="error" variant="outline" icon="i-lucide-calendar-x" label="Cancelar este turno" />
        </div>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { obtenerReserva } = useReserva()
const { prefs } = useAccesibilidad()
const { speak } = useLecturaEnVozAlta()
const tituloEl = useTemplateRef<HTMLHeadingElement>('tituloEl')

const id = computed(() => String(route.params.id))
const esCambio = computed(() => route.query.cambiado === '1')
const esNueva = computed(() => route.query.nuevo === '1' || esCambio.value)

const { data: reserva, status, refresh } = await useAsyncData(() => `reserva-${id.value}`, () => obtenerReserva(id.value))

if (status.value === 'success' && !reserva.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos este turno.', fatal: true })
}

const titulo = computed(() => {
  if (esCambio.value && reserva.value?.turno) return `Listo. Cambiamos tu turno al ${diaEnPalabras(reserva.value.turno.fecha_hora).replace(/^(hoy|mañana), /, '')}.`
  return route.query.nuevo === '1' ? '¡Listo! Reservaste tu turno' : 'Tu turno'
})

useHead({ title: () => (esNueva.value ? 'Turno reservado' : 'Tu turno') })

const estado = computed<EstadoVista>(() => (status.value === 'pending' ? 'cargando' : status.value === 'error' ? 'error' : 'contenido'))

const sePuedeCambiar = computed(() => reserva.value?.estado === 'confirmada' && !!reserva.value.turno && new Date(reserva.value.turno.fecha_hora) > new Date())

const lectura = computed(() => {
  const t = reserva.value?.turno
  if (!t) return ''
  return `${esNueva.value ? titulo.value : ''} Número de turno ${reserva.value?.numero_correlativo}. Turno de ${t.especialidad?.nombre_comun}, el ${fechaHoraEnPalabras(t.fecha_hora)}, en ${t.centro?.nombre}, ${t.centro?.direccion}. Te vamos a recordar el turno el día anterior.`
})

function agregarAlCalendario() {
  const t = reserva.value?.turno
  if (!t || !reserva.value) return
  const ics = generarIcs({
    uid: reserva.value.id,
    titulo: `Turno de ${t.especialidad?.nombre_comun}`,
    inicio: t.fecha_hora,
    duracionMin: 20,
    lugar: `${t.centro?.nombre}, ${t.centro?.direccion}, ${t.centro?.localidad}`,
    descripcion: `Turno número ${reserva.value.numero_correlativo} con ${t.profesional?.nombre} ${t.profesional?.apellido}. Llevá tu DNI.`,
  })
  descargarArchivo(ics, `turno-${reserva.value.numero_correlativo}.ics`, 'text/calendar')
}

onMounted(() => {
  if (!esNueva.value) return
  tituloEl.value?.focus()
  if (prefs.value.voiceEnabled) speak(lectura.value)
})
</script>
