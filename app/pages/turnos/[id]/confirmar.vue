<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando el turno. Esperá un momento."
      error-titulo="No pudimos mostrar este turno."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="refresh()"
    >
      <div v-if="turno" class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <h1 class="text-2xl font-bold">Confirmá que está todo bien</h1>
          <p class="text-lg">Leé el turno. Si está bien, reservalo.</p>
          <p v-if="asistiendo?.alcance.includes('reservar')" class="text-lg font-bold">Este turno es para {{ asistiendo.nombre }}.</p>
          <ReadAloudButton v-if="prefs.voiceEnabled" :text="lectura" />
        </div>
        <ConfirmarReserva
          :turno="turno"
          :solicitante="asistiendo?.alcance.includes('reservar') ? asistiendo.id : undefined"
          @reservada="(reserva) => navigateTo(`/reservas/${reserva}?nuevo=1`)"
          @volver="volver"
          @elegir="(otro) => navigateTo(`/turnos/${otro}/confirmar`)"
        />
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Confirmar el turno' })

const route = useRoute()
const router = useRouter()
const { obtenerTurno } = useTurnos()
const { prefs } = useAccesibilidad()
const { asistiendo } = useAcompanamiento()

const id = computed(() => String(route.params.id))
const { data: turno, status, refresh } = await useAsyncData(() => `confirmar-${id.value}`, () => obtenerTurno(id.value))

if (status.value === 'success' && !turno.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos este turno.', fatal: true })
}

const estado = computed<EstadoVista>(() => (status.value === 'pending' ? 'cargando' : status.value === 'error' ? 'error' : 'contenido'))
const lectura = computed(() => (turno.value
  ? `Turno de ${turno.value.especialidad?.nombre_comun}, el ${fechaHoraEnPalabras(turno.value.fecha_hora)}, en ${turno.value.centro?.nombre}.`
  : ''))

function volver() {
  if (window.history.state?.back) router.back()
  else navigateTo(`/turnos/${id.value}`)
}
</script>
