<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Buscar un turno</h1>
      <p class="max-w-prose text-lg">Elegí qué médico necesitás, desde dónde vas a ir y cuándo podés. Te mostramos los turnos libres.</p>
    </div>

    <UForm method="post" :validate="validar" :validate-on="['input']" :state="form" class="flex flex-col gap-8" @submit="enviar" @error="alFallar">
      <UFormField label="¿Qué médico necesitás?" name="especialidad" description="Podés escribir para buscar. Por ejemplo: oculista.">
        <USelectMenu
          v-model="form.especialidad"
          :items="itemsEspecialidades"
          value-key="value"
          placeholder="Elegí un médico"
          :search-input="{ placeholder: 'Escribí para buscar' }"
          class="w-full"
        />
      </UFormField>

      <div class="flex flex-col gap-4">
        <UFormField name="desdeDonde">
          <URadioGroup v-model="form.desdeDonde" legend="¿Desde dónde vas a ir?" :items="OPCIONES_DESDE" />
        </UFormField>
        <UFormField v-if="form.desdeDonde === 'localidad'" label="Tu localidad" name="localidad">
          <USelectMenu v-model="form.localidad" :items="itemsLocalidades" value-key="value" placeholder="Elegí tu localidad" class="w-full" />
        </UFormField>
        <UAlert v-if="avisoUbicacion" color="warning" icon="i-lucide-map-pin-off" :title="avisoUbicacion" />
      </div>

      <div class="flex flex-col gap-4">
        <UFormField name="cuando">
          <URadioGroup v-model="form.cuando" legend="¿Cuándo podés ir?" :items="OPCIONES_CUANDO" />
        </UFormField>
        <UFormField v-if="form.cuando === 'fecha'" label="Desde qué día" name="desde">
          <UInput v-model="form.desde" type="date" :min="hoy" class="w-full sm:w-72" />
        </UFormField>
      </div>

      <UFormField name="franja">
        <URadioGroup v-model="form.franja" legend="¿A qué hora?" :items="OPCIONES_FRANJA" />
      </UFormField>

      <UButton type="submit" color="primary" variant="solid" icon="i-lucide-search" label="Buscar turnos" block class="sm:w-auto sm:self-start" :loading="ubicando" />
    </UForm>

    <section v-if="buscado" aria-labelledby="titulo-resultados" class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2 id="titulo-resultados" tabindex="-1" class="text-xl font-bold">{{ tituloResultados }}</h2>

        <div v-if="centroElegido" class="flex flex-wrap items-center gap-3">
          <p>Estás viendo los horarios de <strong>{{ centroElegido }}</strong>.</p>
          <UButton size="lg" icon="i-lucide-list" label="Ver todos los lugares" @click="quitarCentro" />
        </div>

        <div v-if="filtros?.lat !== undefined && estado === 'contenido'" class="flex flex-wrap items-center gap-2">
          <span :id="idOrden">Mostrar primero:</span>
          <div role="group" :aria-labelledby="idOrden" class="flex flex-wrap gap-2">
            <UButton
              v-for="o in OPCIONES_ORDEN"
              :key="o.value"
              size="lg"
              :label="o.label"
              :icon="o.icon"
              :aria-pressed="filtros.orden === o.value"
              :color="filtros.orden === o.value ? 'primary' : 'neutral'"
              :variant="filtros.orden === o.value ? 'solid' : 'outline'"
              @click="cambiarOrden(o.value)"
            />
          </div>
        </div>
      </div>

      <VistaEstados
        :estado="estado"
        texto-cargando="Estamos buscando turnos. Esperá un momento."
        :texto-vacio="textoVacio"
        error-titulo="No pudimos buscar los turnos."
        error-ayuda="Revisá tu conexión a internet y probá de nuevo."
        @reintentar="cargar()"
      >
        <template #vacio>
          <div class="flex flex-wrap gap-3">
            <UButton v-if="filtros?.desde" size="lg" label="Buscar desde hoy" @click="ampliar({ cuando: 'pronto' })" />
            <UButton v-if="filtros?.franja" size="lg" label="Buscar a cualquier hora" @click="ampliar({ franja: 'cualquiera' })" />
            <UButton v-if="filtros?.centro" size="lg" label="Buscar en otros lugares" @click="quitarCentro" />
          </div>
        </template>

        <ul class="flex flex-col gap-4">
          <li v-for="t in turnos" :key="t.id">
            <TurnoCard :ref="(c) => registrarTarjeta(t.id, c)" :turno="t" :con-otros-horarios="!filtros?.centro" @otros-horarios="verCentro" />
          </li>
        </ul>

        <div class="flex flex-col gap-3 mt-6">
          <p>{{ textoCantidad }}</p>
          <UButton v-if="turnos.length < total" icon="i-lucide-chevrons-down" label="Mostrar más" class="self-start" :loading="cargandoMas" @click="cargarMas" />
        </div>
      </VistaEstados>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { FormError } from '@nuxt/ui'
import type { FiltrosBusqueda, Franja, Orden, ResultadoTurno } from '~/composables/useTurnos'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

type DesdeDonde = 'localidad' | 'actual' | 'cualquiera'
type Cuando = 'pronto' | 'fecha'

const OPCIONES_DESDE: { label: string, description?: string, value: DesdeDonde }[] = [
  { label: 'Desde mi localidad', description: 'Elegís tu localidad de una lista.', value: 'localidad' },
  { label: 'Desde donde estoy ahora', description: 'Te preguntamos si podemos usar tu ubicación.', value: 'actual' },
  { label: 'No me importa la distancia', value: 'cualquiera' },
]
const OPCIONES_CUANDO: { label: string, value: Cuando }[] = [
  { label: 'Lo antes posible', value: 'pronto' },
  { label: 'Desde un día que elijo', value: 'fecha' },
]
const OPCIONES_FRANJA: { label: string, value: Franja | 'cualquiera' }[] = [
  { label: 'A cualquier hora', value: 'cualquiera' },
  { label: 'A la mañana', value: 'manana' },
  { label: 'A la tarde', value: 'tarde' },
]
const OPCIONES_ORDEN: { label: string, icon: string, value: Orden }[] = [
  { label: 'Los más cerca', icon: 'i-lucide-map-pin', value: 'cercania' },
  { label: 'Los más pronto', icon: 'i-lucide-clock', value: 'fecha' },
]

useHead({ title: 'Buscar un turno' })

const route = useRoute()
const router = useRouter()
const { especialidades, localidades, localidadPorNombre, buscar } = useTurnos()
const { perfil, cargarPerfil } = useSesion()
const { alFallar } = useFormulario()
const { announce } = useAnuncio()
const ubicacionActual = useState<{ lat: number, lng: number } | null>('ubicacion-actual', () => null)

const idOrden = useId()
const hoy = fechaLocalIso()

const form = reactive({
  especialidad: undefined as number | undefined,
  desdeDonde: 'localidad' as DesdeDonde,
  localidad: undefined as number | undefined,
  cuando: 'pronto' as Cuando,
  desde: '',
  franja: 'cualquiera' as Franja | 'cualquiera',
})

const filtros = ref<FiltrosBusqueda>()
const turnos = ref<ResultadoTurno[]>([])
const total = ref(0)
const estado = ref<EstadoVista>('cargando')
const buscado = ref(false)
const cargandoMas = ref(false)
const ubicando = ref(false)
const avisoUbicacion = ref<string>()
const tarjetas = new Map<string, ComponentPublicInstance | null>()

const itemsEspecialidades = computed(() => especialidades.value.map((e) => ({
  label: e.nombre_comun,
  description: e.nombre_tecnico,
  icon: e.icono,
  value: e.id,
})))

const itemsLocalidades = computed(() => localidades.value.map((l) => ({
  label: l.nombre,
  description: l.partido,
  value: l.id,
})))

const especialidadElegida = computed(() => especialidades.value.find((e) => e.id === filtros.value?.especialidad))
const centroElegido = computed(() => (filtros.value?.centro ? turnos.value[0]?.centro_nombre : undefined))

const tituloResultados = computed(() => {
  const medico = especialidadElegida.value?.nombre_comun.toLowerCase() ?? 'ese médico'
  return filtros.value?.centro ? `Horarios libres de ${medico}` : `Turnos libres de ${medico}`
})

const unidad = computed(() => filtros.value?.centro
  ? (total.value === 1 ? 'horario' : 'horarios')
  : (total.value === 1 ? 'lugar' : 'lugares'))

const textoCantidad = computed(() => `Estás viendo ${turnos.value.length} de ${total.value} ${unidad.value}.`)

const textoVacio = computed(() => 'No encontramos turnos libres con lo que elegiste. Probá cambiar el día, la hora o el lugar.')

function validar(estadoForm: typeof form): FormError[] {
  const errores: FormError[] = []
  if (!estadoForm.especialidad) errores.push({ name: 'especialidad', message: 'Elegí qué médico necesitás.' })
  if (estadoForm.desdeDonde === 'localidad' && !estadoForm.localidad) errores.push({ name: 'localidad', message: 'Elegí tu localidad.' })
  if (estadoForm.cuando === 'fecha' && !estadoForm.desde) errores.push({ name: 'desde', message: 'Elegí desde qué día.' })
  return errores
}

function pedirUbicacion() {
  return new Promise<{ lat: number, lng: number } | null>((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  })
}

async function enviar() {
  avisoUbicacion.value = undefined
  if (form.desdeDonde === 'actual') {
    ubicando.value = true
    ubicacionActual.value = await pedirUbicacion()
    ubicando.value = false
    if (!ubicacionActual.value) {
      form.desdeDonde = 'localidad'
      avisoUbicacion.value = 'No pudimos saber dónde estás. Elegí tu localidad de la lista y volvé a buscar.'
      announce(avisoUbicacion.value)
      return
    }
  }

  const slug = especialidades.value.find((e) => e.id === form.especialidad)?.slug
  await router.push({
    query: {
      especialidad: slug,
      desde_donde: form.desdeDonde,
      localidad: form.desdeDonde === 'localidad' ? form.localidad : undefined,
      desde: form.cuando === 'fecha' ? form.desde : undefined,
      franja: form.franja === 'cualquiera' ? undefined : form.franja,
    },
  })
}

function filtrosDesdeRuta(): FiltrosBusqueda | undefined {
  const q = route.query
  const especialidad = especialidades.value.find((e) => e.slug === q.especialidad)
  if (!especialidad) return undefined

  let lat: number | undefined
  let lng: number | undefined
  if (q.desde_donde === 'actual' && ubicacionActual.value) {
    ({ lat, lng } = ubicacionActual.value)
  } else if (q.desde_donde === 'localidad') {
    const loc = localidades.value.find((l) => l.id === Number(q.localidad))
    lat = loc?.lat
    lng = loc?.lng
  }

  const orden: Orden = q.orden === 'fecha' || lat === undefined ? 'fecha' : 'cercania'
  return {
    especialidad: especialidad.id,
    centro: typeof q.centro === 'string' ? q.centro : undefined,
    desde: typeof q.desde === 'string' ? q.desde : undefined,
    franja: q.franja === 'manana' || q.franja === 'tarde' ? q.franja : undefined,
    lat,
    lng,
    orden,
  }
}

function sincronizarFormulario() {
  const q = route.query
  form.especialidad = especialidades.value.find((e) => e.slug === q.especialidad)?.id ?? form.especialidad
  if (q.desde_donde === 'localidad' || q.desde_donde === 'actual' || q.desde_donde === 'cualquiera') form.desdeDonde = q.desde_donde
  if (q.localidad) form.localidad = Number(q.localidad)
  form.cuando = q.desde ? 'fecha' : 'pronto'
  form.desde = typeof q.desde === 'string' ? q.desde : ''
  form.franja = q.franja === 'manana' || q.franja === 'tarde' ? q.franja : 'cualquiera'
}

async function cargar() {
  const nuevos = filtrosDesdeRuta()
  buscado.value = !!nuevos
  if (!nuevos) return
  filtros.value = nuevos
  estado.value = 'cargando'
  try {
    const resultado = await buscar(nuevos)
    turnos.value = resultado.turnos
    total.value = resultado.total
    estado.value = resultado.turnos.length ? 'contenido' : 'vacio'
    if (resultado.turnos.length) announce(`Encontramos ${total.value} ${unidad.value} con turnos libres.`)
    await nextTick()
    document.getElementById('titulo-resultados')?.focus()
  } catch {
    estado.value = 'error'
  }
}

async function cargarMas() {
  if (!filtros.value) return
  cargandoMas.value = true
  try {
    const { turnos: mas } = await buscar(filtros.value, turnos.value.length)
    turnos.value = [...turnos.value, ...mas]
    await nextTick()
    const primero = mas[0] && tarjetas.get(mas[0].id)?.$el as HTMLElement | undefined
    primero?.querySelector<HTMLElement>('h3')?.focus()
    announce(textoCantidad.value)
  } finally {
    cargandoMas.value = false
  }
}

function registrarTarjeta(id: string, componente: Element | ComponentPublicInstance | null) {
  tarjetas.set(id, componente as ComponentPublicInstance | null)
}

const actualizarRuta = (cambios: Record<string, string | undefined>) =>
  router.push({ query: { ...route.query, ...cambios } })

const cambiarOrden = (orden: Orden) => actualizarRuta({ orden })
const verCentro = (centro: string) => actualizarRuta({ centro })
const quitarCentro = () => actualizarRuta({ centro: undefined })

function ampliar(cambios: { cuando?: Cuando, franja?: 'cualquiera' }) {
  actualizarRuta({
    desde: cambios.cuando === 'pronto' ? undefined : route.query.desde as string | undefined,
    franja: cambios.franja === 'cualquiera' ? undefined : route.query.franja as string | undefined,
  })
}

onMounted(async () => {
  await cargarPerfil()
  const localidadPerfil = localidadPorNombre(perfil.value?.localidad)
  if (localidadPerfil && !route.query.localidad) form.localidad = localidadPerfil.id
  sincronizarFormulario()
  await cargar()
})

watch(() => route.query, () => {
  sincronizarFormulario()
  cargar()
})
</script>
