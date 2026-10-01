<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <AsistentePaso :paso="estado.paso" :total="TOTAL" :titulo="actual.titulo" :descripcion="descripcion">
      <template v-if="estado.paso === 0">
        <div v-if="!entendido" class="flex flex-col gap-4">
          <UFormField label="Contanos qué necesitás" name="texto" :error="error">
            <UTextarea id="asistente-texto" v-model="estado.texto" :rows="3" class="w-full" />
          </UFormField>
          <VoiceInputButton v-if="!iaCaida" v-model="estado.texto" class="self-start" />
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UButton color="primary" variant="solid" icon="i-lucide-search" label="Buscar con lo que escribí" :loading="interpretando" @click="entender" />
            <UButton icon="i-lucide-list" label="Prefiero elegir de una lista" @click="irA(1)" />
          </div>
        </div>

        <div v-else class="flex flex-col gap-6">
          <p class="text-lg font-bold">Entendí esto:</p>
          <dl class="flex flex-col">
            <div v-for="d in resumenEntendido" :key="d.etiqueta" class="flex flex-wrap gap-x-6 gap-y-1 border-b-2 border-default py-3">
              <dt class="min-w-40 font-bold">{{ d.etiqueta }}</dt>
              <dd>{{ d.valor }}</dd>
            </div>
          </dl>
          <p class="text-lg">¿Está bien?</p>
          <AccionesPaso confirmar="Sí, buscar turnos" volver="No, prefiero elegir yo" @confirmar="irA(4)" @volver="irA(1)" />
        </div>
      </template>
      <template v-else-if="estado.paso === 1">
        <UFormField name="especialidad" :error="error">
          <OpcionesTarjeta v-model="especialidadElegida" :legend="actual.titulo" legend-oculta :opciones="opcionesEspecialidades" />
        </UFormField>
      </template>
      <template v-else-if="estado.paso === 2">
        <UFormField name="donde" :error="error">
          <OpcionesTarjeta v-model="estado.donde" :legend="actual.titulo" legend-oculta :opciones="opcionesDonde" />
        </UFormField>
        <UFormField v-if="estado.donde === 'casa' && !perfil?.lat" label="Tu localidad" name="localidad" :error="errorDetalle">
          <USelectMenu id="asistente-localidad" v-model="estado.localidad" :items="itemsLocalidades" value-key="value" placeholder="Elegí tu localidad" class="w-full" />
        </UFormField>
        <UFormField v-if="estado.donde === 'lista'" label="El hospital o centro de salud" name="centro" :error="errorDetalle">
          <USelectMenu id="asistente-centro" v-model="estado.centro" :items="itemsCentros" value-key="value" placeholder="Elegí el lugar" class="w-full" />
        </UFormField>
      </template>
      <template v-else-if="estado.paso === 3">
        <OpcionesTarjeta v-model="estado.cuando" :legend="actual.titulo" legend-oculta :opciones="OPCIONES_CUANDO" />
        <UFormField v-if="estado.cuando === 'fecha'" label="Desde qué día" name="desde" :error="errorDetalle">
          <UInput id="asistente-desde" v-model="estado.desde" type="date" :min="hoy" class="w-full sm:w-72" />
        </UFormField>
        <OpcionesTarjeta v-model="estado.franja" legend="¿A qué hora te queda mejor?" :opciones="OPCIONES_FRANJA" />
      </template>
      <template v-else-if="estado.paso === 4">
        <VistaEstados
          :estado="estadoResultados"
          texto-cargando="Estamos buscando turnos. Esperá un momento."
          texto-vacio="No encontramos turnos libres con lo que elegiste."
          error-titulo="No pudimos buscar los turnos."
          error-ayuda="Revisá tu conexión a internet y probá de nuevo."
          @reintentar="buscarTurnos(0)"
        >
          <template #vacio>
            <div class="flex flex-wrap gap-3">
              <UButton size="lg" icon="i-lucide-calendar" label="Cambiar el día" @click="irA(3)" />
              <UButton size="lg" icon="i-lucide-map-pin" label="Cambiar el lugar" @click="irA(2)" />
            </div>
          </template>
          <div class="flex flex-col gap-4">
            <UFormField name="turno" :error="error">
              <OpcionesTarjeta v-model="estado.turnoId" :legend="actual.titulo" legend-oculta :opciones="opcionesTurnos" />
            </UFormField>
            <p>{{ textoCantidad }}</p>
            <UButton v-if="total > POR_PAGINA" icon="i-lucide-refresh-cw" label="Mostrar otros turnos" class="self-start" @click="buscarTurnos(siguienteOffset)" />
          </div>
        </VistaEstados>
      </template>
      <template v-else-if="estado.paso === 5">
        <div v-if="!user" class="flex flex-col gap-4">
          <UAlert color="info" icon="i-lucide-log-in" title="Para reservar tenés que ingresar a tu cuenta." description="No vas a perder lo que elegiste: cuando vuelvas, seguimos desde acá." />
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UButton :to="{ path: '/ingresar', query: { volver: '/turnos/asistente' } }" color="primary" variant="solid" icon="i-lucide-log-in" label="Ingresar" />
            <UButton to="/registrarme" icon="i-lucide-user-plus" label="Crear una cuenta" />
            <UButton icon="i-lucide-arrow-left" label="Volver atrás" @click="irA(4)" />
          </div>
        </div>
        <VistaEstados v-else :estado="estadoTurno" texto-cargando="Estamos preparando el turno." @reintentar="cargarTurno">
          <ConfirmarReserva
            v-if="turnoElegido"
            :turno="turnoElegido"
            :solicitante="paraQuien?.id"
            @reservada="terminar"
            @volver="irA(4)"
            @elegir="(otro) => { estado.turnoId = otro; cargarTurno() }"
          />
        </VistaEstados>
      </template>

      <template v-if="estado.paso >= 1 && estado.paso <= 4" #acciones>
        <AccionesPaso @confirmar="avanzar" @volver="retroceder" />
      </template>
    </AsistentePaso>
  </div>
</template>

<script setup lang="ts">
import type { Interpretacion } from '~~/supabase/functions/interpretar/reglas'
import type { ResultadoTurno, TurnoDetalle } from '~/composables/useTurnos'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const TOTAL = 6
const PASOS = [
  { titulo: '¿Qué necesitás?', descripcion: 'Contalo con tus palabras, escribiendo o con tu voz. Por ejemplo: "necesito un oculista cerca de casa". Si preferís, elegí de una lista.' },
  { titulo: '¿Qué médico necesitás?', descripcion: 'Elegí una opción. Abajo de cada una está el nombre que usan los médicos.' },
  { titulo: '¿Dónde te queda cómodo?', descripcion: 'Elegí una opción.' },
  { titulo: '¿Cuándo podés ir?', descripcion: 'Elegí el día y la hora que te quedan mejor.' },
  { titulo: 'Estos son los turnos que encontré', descripcion: 'Elegí uno. Después lo revisás antes de reservarlo.' },
  { titulo: 'Confirmá que está todo bien', descripcion: 'Leé el turno. Si está bien, reservalo.' },
]
const OPCIONES_CUANDO = [
  { value: 'pronto', label: 'Lo antes posible', icon: 'i-lucide-zap' },
  { value: 'fecha', label: 'A partir de un día que elijo', icon: 'i-lucide-calendar' },
]
const OPCIONES_FRANJA = [
  { value: 'cualquiera', label: 'A cualquier hora' },
  { value: 'manana', label: 'A la mañana' },
  { value: 'tarde', label: 'A la tarde' },
]
const BORRADOR_VACIO = {
  paso: 0,
  texto: '',
  especialidad: 0,
  donde: '',
  localidad: 0,
  centro: '',
  cuando: 'pronto',
  desde: '',
  franja: 'cualquiera',
  turnoId: '',
  para: '',
  inicio: 0,
}

useHead({ title: 'Sacar un turno' })

const user = useSupabaseUser()
const { perfil: miPerfil, cargarPerfil } = useSesion()
const { asistiendo } = useAcompanamiento()
const supabase = useSupabaseClient()
const { especialidades, localidades, buscar, obtenerTurno, centrosConEspecialidad } = useTurnos()
const { announce, alert } = useAnuncio()
const { registrar } = useEventos()

const borrador = useSessionStorage('ta_asistente', { ...BORRADOR_VACIO }, { initOnMounted: true, mergeDefaults: true })
const estado = reactive({ ...BORRADOR_VACIO })
const hoy = fechaLocalIso()

const error = ref<string>()
const errorDetalle = ref<string>()
const interpretando = ref(false)
const iaCaida = ref(false)
const entendido = ref<Interpretacion>()
const centros = ref<{ id: string, nombre: string, localidad: string }[]>([])
const turnos = ref<ResultadoTurno[]>([])
const total = ref(0)
const offset = ref(0)
const estadoResultados = ref<EstadoVista>('cargando')
const turnoElegido = shallowRef<TurnoDetalle | null>(null)
const estadoTurno = ref<EstadoVista>('cargando')

const actual = computed(() => PASOS[estado.paso] ?? PASOS[0]!)

const paraQuien = computed(() => (asistiendo.value?.alcance.includes('reservar') ? asistiendo.value : null))
const perfilOtro = ref<{ lat: number | null, lng: number | null, localidad: string | null } | null>(null)
const perfil = computed(() => (paraQuien.value ? perfilOtro.value : miPerfil.value))
const descripcion = computed(() => (paraQuien.value && estado.paso < 5
  ? `Estás sacando un turno para ${paraQuien.value.nombre}. ${actual.value.descripcion}`
  : actual.value.descripcion))

const especialidadElegida = computed({
  get: () => (estado.especialidad ? String(estado.especialidad) : undefined),
  set: (v) => { estado.especialidad = Number(v) },
})

const opcionesEspecialidades = computed(() => especialidades.value.map((e) => ({
  value: String(e.id),
  label: e.nombre_comun,
  description: e.nombre_comun === e.nombre_tecnico ? e.descripcion_simple : `${e.nombre_tecnico}. ${e.descripcion_simple}`,
  icon: e.icono,
})))

const opcionesDonde = computed(() => [
  {
    value: 'casa',
    label: 'Cerca de mi casa',
    description: perfil.value?.lat ? `Cerca de ${perfil.value.localidad}.` : 'Te vamos a preguntar tu localidad.',
    icon: 'i-lucide-house',
  },
  { value: 'lista', label: 'Elegir el hospital de una lista', icon: 'i-lucide-list' },
  { value: 'antes', label: 'Donde haya turno antes', description: 'No importa la distancia.', icon: 'i-lucide-zap' },
])

const itemsLocalidades = computed(() => localidades.value.map((l) => ({ label: l.nombre, description: l.partido, value: l.id })))
const itemsCentros = computed(() => centros.value.map((c) => ({ label: c.nombre, description: c.localidad, value: c.id })))

const opcionesTurnos = computed(() => turnos.value.map((t) => ({
  value: t.id,
  label: conMayuscula(fechaHoraEnPalabras(t.fecha_hora)),
  description: [`${t.centro_nombre}. ${t.centro_direccion}, ${t.centro_localidad}`, distanciaEnPalabras(t.distancia_km)].filter(Boolean).join('. '),
})))

const textoCantidad = computed(() => `Estás viendo ${turnos.value.length} de ${total.value} ${total.value === 1 ? 'lugar' : 'lugares'} con turnos libres.`)
const siguienteOffset = computed(() => (offset.value + POR_PAGINA >= total.value ? 0 : offset.value + POR_PAGINA))

const nombreEspecialidad = (id: number) => especialidades.value.find((e) => e.id === id)?.nombre_comun ?? ''

const resumenEntendido = computed(() => {
  const e = entendido.value
  if (!e) return []
  const filas = [{ etiqueta: 'Médico', valor: nombreEspecialidad(estado.especialidad) }]
  filas.push({ etiqueta: 'Dónde', valor: e.cercaDeCasa ? 'Cerca de tu casa' : 'Donde haya turno antes' })
  const cuando = e.desde ? `Desde el ${diaEnPalabras(`${e.desde}T12:00:00-03:00`)}` : 'Lo antes posible'
  const franja = e.franja === 'manana' ? ', a la mañana' : e.franja === 'tarde' ? ', a la tarde' : ''
  filas.push({ etiqueta: 'Cuándo', valor: `${cuando}${franja}` })
  return filas
})

function irA(paso: number) {
  error.value = undefined
  errorDetalle.value = undefined
  entendido.value = paso === 0 ? entendido.value : undefined
  estado.paso = paso
}

function fallar(mensaje: string, detalle = false) {
  if (detalle) errorDetalle.value = mensaje
  else error.value = mensaje
  alert(mensaje)
}

async function entender() {
  if (!estado.texto.trim()) return fallar('Escribí qué necesitás, o elegí de una lista.')
  interpretando.value = true
  let resultado: Interpretacion | null = null
  const respuesta = await fetch('/api/asistente/interpretar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto: estado.texto }),
    signal: AbortSignal.timeout(6000),
  }).catch(() => null)
  if (respuesta?.ok) resultado = await respuesta.json() as Interpretacion
  else iaCaida.value = true
  interpretando.value = false

  const especialidad = especialidades.value.find((e) => e.slug === resultado?.especialidad)
  if (!resultado || !especialidad || resultado.confianza < 0.5) {
    announce('Vamos paso a paso entonces.')
    irA(1)
    return
  }

  estado.especialidad = especialidad.id
  estado.donde = resultado.cercaDeCasa ? 'casa' : 'antes'
  estado.cuando = resultado.desde ? 'fecha' : 'pronto'
  estado.desde = resultado.desde ?? ''
  estado.franja = resultado.franja ?? 'cualquiera'
  entendido.value = resultado
  if (estado.donde === 'casa' && !perfil.value?.lat) {
    announce('Entendí lo que necesitás. Ahora decinos tu localidad.')
    irA(2)
    return
  }
  announce('Entendí lo que necesitás. Revisalo antes de seguir.')
}

function avanzar() {
  error.value = undefined
  errorDetalle.value = undefined
  if (estado.paso === 1 && !estado.especialidad) return fallar('Elegí qué médico necesitás.')
  if (estado.paso === 2) {
    if (!estado.donde) return fallar('Elegí dónde te queda cómodo.')
    if (estado.donde === 'casa' && !perfil.value?.lat && !estado.localidad) return fallar('Elegí tu localidad.', true)
    if (estado.donde === 'lista' && !estado.centro) return fallar('Elegí el hospital o centro de salud.', true)
  }
  if (estado.paso === 3 && estado.cuando === 'fecha' && !estado.desde) return fallar('Elegí desde qué día.', true)
  if (estado.paso === 4 && !estado.turnoId) return fallar('Elegí uno de los turnos.')
  estado.paso++
}

function retroceder() {
  irA(estado.paso === 4 && entendido.value ? 0 : Math.max(0, estado.paso - 1))
}

async function buscarTurnos(desde: number) {
  estadoResultados.value = 'cargando'
  const loc = localidades.value.find((l) => l.id === estado.localidad)
  const coordenadas = estado.donde === 'casa'
    ? (perfil.value?.lat && perfil.value.lng ? { lat: perfil.value.lat, lng: perfil.value.lng } : loc ? { lat: loc.lat, lng: loc.lng } : undefined)
    : undefined
  try {
    registrar('busqueda', { especialidad: especialidades.value.find((e) => e.id === estado.especialidad)?.slug ?? '', origen: 'asistente' })
    const r = await buscar({
      especialidad: estado.especialidad,
      centro: estado.donde === 'lista' ? estado.centro : undefined,
      desde: estado.cuando === 'fecha' ? estado.desde : undefined,
      franja: estado.franja === 'manana' || estado.franja === 'tarde' ? estado.franja : undefined,
      lat: coordenadas?.lat,
      lng: coordenadas?.lng,
      orden: coordenadas ? 'cercania' : 'fecha',
    }, desde)
    turnos.value = r.turnos
    total.value = r.total
    offset.value = desde
    if (!r.turnos.some((t) => t.id === estado.turnoId)) estado.turnoId = ''
    estadoResultados.value = r.turnos.length ? 'contenido' : 'vacio'
    if (r.turnos.length) announce(`Encontramos turnos en ${r.total} ${r.total === 1 ? 'lugar' : 'lugares'}.`)
  } catch {
    estadoResultados.value = 'error'
  }
}

async function cargarTurno() {
  if (!estado.turnoId) return irA(4)
  estadoTurno.value = 'cargando'
  try {
    turnoElegido.value = await obtenerTurno(estado.turnoId)
    estadoTurno.value = turnoElegido.value ? 'contenido' : 'error'
  } catch {
    estadoTurno.value = 'error'
  }
}

function terminar(reservaId: string) {
  if (estado.inicio) registrar('reserva_asistente', { segundos: Math.round((Date.now() - estado.inicio) / 1000) })
  borrador.value = { ...BORRADOR_VACIO }
  Object.assign(estado, BORRADOR_VACIO)
  navigateTo(`/reservas/${reservaId}?nuevo=1`)
}

watch(() => estado.paso, async (paso) => {
  if (paso === 2 && estado.especialidad) centros.value = await centrosConEspecialidad(estado.especialidad)
  if (paso === 4) await buscarTurnos(0)
  if (paso === 5 && user.value) await cargarTurno()
})

watch(() => estado.especialidad, (nueva, anterior) => {
  if (anterior && nueva !== anterior) estado.centro = ''
})

watch(borrador, (guardado) => {
  // un borrador de otra persona (o de la propia cuenta) no se mezcla con el actual
  if ((guardado.para ?? '') !== (paraQuien.value?.id ?? '')) {
    Object.assign(estado, BORRADOR_VACIO, { para: paraQuien.value?.id ?? '' })
    return
  }
  Object.assign(estado, guardado)
  if (estado.paso === 2 && estado.especialidad) centrosConEspecialidad(estado.especialidad).then((c) => { centros.value = c })
  if (estado.paso === 4) buscarTurnos(0)
  if (estado.paso === 5 && user.value) cargarTurno()
}, { once: true })

watch(estado, (valor) => { borrador.value = { ...valor } }, { deep: true })

onMounted(async () => {
  await nextTick()
  if (!estado.inicio) {
    estado.inicio = Date.now()
    registrar('asistente_inicio')
  }
  await cargarPerfil()
  estado.para = paraQuien.value?.id ?? ''
  if (paraQuien.value) {
    const { data } = await supabase.from('profiles').select('lat, lng, localidad').eq('id', paraQuien.value.id).maybeSingle()
    perfilOtro.value = data
  }
})
</script>
