<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <VistaEstados
      :estado="estadoVista"
      texto-cargando="Estamos buscando tu turno. Esperá un momento."
      error-titulo="No pudimos mostrar tu turno."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar"
    >
      <div v-if="reserva?.turno && !sePuede" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">No se puede cambiar este turno</h1>
        <UAlert color="warning" icon="i-lucide-triangle-alert" :title="aviso?.titulo" :description="aviso?.ayuda" />
        <UButton to="/mis-turnos" icon="i-lucide-list" label="Ver mis turnos" class="self-start" />
      </div>

      <AsistentePaso
        v-else-if="reserva?.turno"
        :paso="paso"
        :total="2"
        :titulo="paso === 1 ? 'Elegí el turno nuevo' : 'Confirmá el cambio'"
        :descripcion="paso === 1 ? 'Cuando confirmes el cambio, liberamos tu turno anterior.' : 'Revisá cómo queda. Si está bien, cambialo.'"
      >
        <template v-if="paso === 1">
          <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />
          <OpcionesTarjeta v-model="donde" legend="¿Dónde?" :opciones="opcionesDonde" />
          <VistaEstados
            :estado="estadoTurnos"
            texto-cargando="Estamos buscando turnos. Esperá un momento."
            texto-vacio="No encontramos otros turnos libres de este médico."
            @reintentar="buscarTurnos(0)"
          >
            <template #vacio>
              <UButton v-if="donde === 'mismo'" size="lg" icon="i-lucide-map-pin" label="Buscar en otros lugares" @click="donde = 'cualquiera'" />
            </template>
            <div class="flex flex-col gap-4">
              <UFormField name="turno" :error="error">
                <OpcionesTarjeta v-model="turnoNuevo" legend="Turnos libres" :opciones="opcionesTurnos" />
              </UFormField>
              <UButton v-if="total > POR_PAGINA" icon="i-lucide-refresh-cw" label="Mostrar otros turnos" class="self-start" @click="buscarTurnos(siguienteOffset)" />
            </div>
          </VistaEstados>
        </template>

        <template v-else>
          <section aria-labelledby="titulo-antes" class="flex flex-col gap-3">
            <h2 id="titulo-antes" class="text-xl font-bold">Tu turno de ahora</h2>
            <p class="text-lg line-through decoration-2">{{ conMayuscula(fechaHoraEnPalabras(reserva.turno.fecha_hora)) }}, en {{ reserva.turno.centro?.nombre }}.</p>
          </section>
          <section v-if="elegido" aria-labelledby="titulo-despues" class="flex flex-col gap-3">
            <h2 id="titulo-despues" class="text-xl font-bold">Tu turno nuevo</h2>
            <p class="text-lg font-bold">{{ conMayuscula(fechaHoraEnPalabras(elegido.fecha_hora)) }}, en {{ elegido.centro_nombre }}, {{ elegido.centro_direccion }}.</p>
          </section>
          <UAlert v-if="aviso" :color="resultado?.motivo === 'superpuesto' ? 'warning' : 'error'" icon="i-lucide-triangle-alert" :title="aviso.titulo" :description="aviso.ayuda" />
        </template>

        <template #acciones>
          <AccionesPaso
            v-if="paso === 1"
            @confirmar="elegir"
            @volver="navigateTo(`/reservas/${reserva.id}`)"
          />
          <AccionesPaso
            v-else
            :confirmar="resultado?.motivo === 'superpuesto' ? 'Sí, cambiar igual' : 'Sí, cambiar el turno'"
            :cargando="enviando"
            @confirmar="confirmar(resultado?.motivo === 'superpuesto')"
            @volver="paso = 1"
          />
        </template>
      </AsistentePaso>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'
import type { ReservaDetalle, ResultadoReserva } from '~/composables/useReserva'
import type { ResultadoTurno } from '~/composables/useTurnos'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Cambiar de fecha' })

const route = useRoute()
const { obtenerReserva, reprogramar } = useReserva()
const { buscar } = useTurnos()
const { alert } = useAnuncio()

const reserva = shallowRef<ReservaDetalle | null>(null)
const estadoVista = ref<EstadoVista>('cargando')
const paso = ref(1)
const donde = ref<'mismo' | 'cualquiera'>('mismo')
const turnos = ref<ResultadoTurno[]>([])
const total = ref(0)
const offset = ref(0)
const estadoTurnos = ref<EstadoVista>('cargando')
const turnoNuevo = ref<string>()
const error = ref<string>()
const enviando = ref(false)
const resultado = ref<ResultadoReserva>()
const aviso = ref<Aviso>()

const yaPaso = computed(() => !!reserva.value?.turno && new Date(reserva.value.turno.fecha_hora) <= new Date())
const sePuede = computed(() => reserva.value?.estado === 'confirmada' && !yaPaso.value)
const elegido = computed(() => turnos.value.find((t) => t.id === turnoNuevo.value))
const siguienteOffset = computed(() => (offset.value + POR_PAGINA >= total.value ? 0 : offset.value + POR_PAGINA))

const opcionesDonde = computed(() => [
  { value: 'mismo', label: 'En el mismo lugar', description: reserva.value?.turno?.centro?.nombre },
  { value: 'cualquiera', label: 'En cualquier lugar', description: 'Te mostramos el primer turno libre de cada lugar.' },
])

const opcionesTurnos = computed(() => turnos.value.map((t) => ({
  value: t.id,
  label: conMayuscula(fechaHoraEnPalabras(t.fecha_hora)),
  description: `${t.centro_nombre}. ${t.centro_direccion}, ${t.centro_localidad}`,
})))

async function cargar() {
  estadoVista.value = 'cargando'
  try {
    reserva.value = await obtenerReserva(String(route.params.id))
    if (!reserva.value) return showError({ statusCode: 404, statusMessage: 'No encontramos este turno.' })
    if (!sePuede.value) aviso.value = avisoReserva({ ok: false, motivo: yaPaso.value ? 'vencido' : 'no_confirmada' })
    estadoVista.value = 'contenido'
    if (sePuede.value) await buscarTurnos(0)
  } catch {
    estadoVista.value = 'error'
  }
}

async function buscarTurnos(desde: number) {
  const t = reserva.value?.turno
  if (!t?.especialidad) return
  estadoTurnos.value = 'cargando'
  try {
    const r = await buscar({
      especialidad: t.especialidad.id,
      centro: donde.value === 'mismo' ? t.centro?.id : undefined,
      orden: 'fecha',
    }, desde)
    turnos.value = r.turnos
    total.value = r.total
    offset.value = desde
    estadoTurnos.value = r.turnos.length ? 'contenido' : 'vacio'
  } catch {
    estadoTurnos.value = 'error'
  }
}

function elegir() {
  error.value = undefined
  if (!turnoNuevo.value) {
    error.value = 'Elegí uno de los turnos.'
    alert(error.value)
    return
  }
  resultado.value = undefined
  aviso.value = undefined
  paso.value = 2
}

async function confirmar(igual: boolean) {
  if (!reserva.value || !turnoNuevo.value) return
  enviando.value = true
  const r = await reprogramar(reserva.value.id, turnoNuevo.value, igual)
  enviando.value = false
  resultado.value = r
  if (r.ok && r.reservaId) return navigateTo(`/reservas/${r.reservaId}?cambiado=1`)
  aviso.value = avisoReserva(r, 'cambiar')
  alert(`${aviso.value.titulo} ${aviso.value.ayuda}`)
  if (r.motivo === 'tomado') {
    turnoNuevo.value = undefined
    paso.value = 1
    await buscarTurnos(0)
  }
}

watch(donde, () => {
  turnoNuevo.value = undefined
  buscarTurnos(0)
})

onMounted(cargar)
</script>
