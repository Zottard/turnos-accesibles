<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <VistaEstados
      :estado="estadoVista"
      texto-cargando="Estamos buscando tu turno. Esperá un momento."
      error-titulo="No pudimos mostrar tu turno."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar"
    >
      <div v-if="cancelado" class="flex flex-col gap-6">
        <h1 ref="tituloEl" tabindex="-1" class="text-2xl font-bold">Listo. Cancelamos tu turno.</h1>
        <p class="text-lg">El lugar quedó libre para otra persona.</p>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <UButton to="/mis-turnos" color="primary" variant="solid" icon="i-lucide-list" label="Ver mis turnos" />
          <UButton to="/turnos/asistente" icon="i-lucide-calendar-plus" label="Sacar otro turno" />
        </div>
      </div>

      <div v-else-if="reserva?.turno" class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <h1 class="text-2xl font-bold">¿Querés cancelar este turno?</h1>
          <p class="text-lg">Si lo cancelás, el lugar queda libre para otra persona.</p>
        </div>

        <ResumenReserva :turno="reserva.turno" />

        <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />

        <template v-if="sePuede">
          <OpcionesTarjeta v-model="motivo" legend="¿Por qué lo cancelás? No es obligatorio." :opciones="MOTIVOS" />
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UButton color="error" variant="solid" icon="i-lucide-calendar-x" label="Sí, cancelar el turno" block class="sm:w-auto" :loading="enviando" @click="confirmar" />
            <UButton :to="`/reservas/${reserva.id}`" icon="i-lucide-arrow-left" label="No, volver" block class="sm:w-auto" />
          </div>
        </template>
        <UButton v-else to="/mis-turnos" icon="i-lucide-list" label="Ver mis turnos" class="self-start" />
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'
import type { ReservaDetalle } from '~/composables/useReserva'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const MOTIVOS = [
  { value: 'No puedo ir ese día', label: 'No puedo ir ese día' },
  { value: 'Ya me atendieron', label: 'Ya me atendieron en otro lugar' },
  { value: 'Me equivoqué de turno', label: 'Me equivoqué de turno' },
  { value: 'Otro motivo', label: 'Otro motivo' },
]

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cancelar un turno' })

const route = useRoute()
const { obtenerReserva, cancelar } = useReserva()
const { announce, alert } = useAnuncio()
const tituloEl = useTemplateRef<HTMLHeadingElement>('tituloEl')

const reserva = shallowRef<ReservaDetalle | null>(null)
const estadoVista = ref<EstadoVista>('cargando')
const motivo = ref<string>()
const enviando = ref(false)
const cancelado = ref(false)
const aviso = ref<Aviso>()

const yaPaso = computed(() => !!reserva.value?.turno && new Date(reserva.value.turno.fecha_hora) <= new Date())
const sePuede = computed(() => reserva.value?.estado === 'confirmada' && !yaPaso.value)

async function cargar() {
  estadoVista.value = 'cargando'
  try {
    reserva.value = await obtenerReserva(String(route.params.id))
    if (!reserva.value) return showError({ statusCode: 404, statusMessage: 'No encontramos este turno.' })
    if (yaPaso.value) aviso.value = avisoReserva({ ok: false, motivo: 'vencido' })
    else if (reserva.value.estado !== 'confirmada') aviso.value = avisoReserva({ ok: false, motivo: 'no_confirmada' })
    estadoVista.value = 'contenido'
  } catch {
    estadoVista.value = 'error'
  }
}

async function confirmar() {
  if (!reserva.value) return
  enviando.value = true
  const r = await cancelar(reserva.value.id, motivo.value)
  enviando.value = false
  if (r.ok) {
    cancelado.value = true
    announce('Listo. Cancelamos tu turno. El lugar quedó libre para otra persona.')
    await nextTick()
    tituloEl.value?.focus()
    return
  }
  aviso.value = avisoReserva(r, 'cancelar')
  alert(`${aviso.value.titulo} ${aviso.value.ayuda}`)
}

onMounted(cargar)
</script>
