<template>
  <div class="flex flex-col gap-8">
    <AdminNav />
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Hospitales y centros de salud</h1>
      <UButton color="primary" variant="solid" icon="i-lucide-plus" label="Agregar un centro" class="self-start" @click="abrir()" />
    </div>

    <VistaEstados :estado="estado" texto-vacio="Todavía no hay centros cargados." @reintentar="cargar">
      <ul class="flex flex-col gap-4">
        <li v-for="c in centros" :key="c.id">
          <article :aria-labelledby="`centro-${c.id}`" class="flex flex-col gap-3 border-2 border-default rounded-md p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h2 :id="`centro-${c.id}`" class="min-w-0 text-lg font-bold">{{ c.nombre }}</h2>
              <UBadge :color="c.activo ? 'success' : 'neutral'" :icon="c.activo ? 'i-lucide-circle-check' : 'i-lucide-circle-pause'" :label="c.activo ? 'Activo' : 'Dado de baja'" />
            </div>
            <p>{{ c.direccion }}, {{ c.localidad }} ({{ c.partido }}). {{ c.tipo === 'caps' ? 'Centro de salud' : 'Hospital' }} {{ c.dependencia.toLowerCase() }}.</p>
            <p class="text-muted">{{ c.modo_turnos === 'derivacion' ? 'Turnos: por el canal del hospital (derivación).' : 'Turnos: en esta app.' }}</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <UButton size="lg" icon="i-lucide-pencil" label="Editar" :aria-describedby="`centro-${c.id}`" @click="abrir(c)" />
              <UButton
                size="lg"
                :color="c.activo ? 'error' : 'neutral'"
                variant="outline"
                :icon="c.activo ? 'i-lucide-circle-pause' : 'i-lucide-circle-play'"
                :label="c.activo ? 'Dar de baja' : 'Volver a activar'"
                :aria-describedby="`centro-${c.id}`"
                @click="cambiarActivo(c)"
              />
            </div>
          </article>
        </li>
      </ul>
    </VistaEstados>

    <UModal v-model:open="abierto" :title="form.id ? 'Editar el centro' : 'Agregar un centro'">
      <template #body>
        <UForm ref="formEl" method="post" :validate-on="['input']" :schema="SCHEMA_CENTRO" :state="form" class="flex flex-col gap-6" @submit="guardar" @error="alFallar">
          <UFormField label="Nombre" name="nombre">
            <UInput id="centro-nombre" v-model="form.nombre" class="w-full" autofocus />
          </UFormField>
          <UFormField name="tipo">
            <OpcionesTarjeta v-model="form.tipo" legend="Tipo" :opciones="[{ value: 'hospital', label: 'Hospital' }, { value: 'caps', label: 'Centro de salud (CAPS)' }]" />
          </UFormField>
          <UFormField label="Depende de" name="dependencia">
            <USelect id="centro-dependencia" v-model="form.dependencia" :items="['Municipal', 'Provincial', 'Nacional']" class="w-full" />
          </UFormField>
          <UFormField label="Dirección" name="direccion" description="Calle y número.">
            <UInput id="centro-direccion" v-model="form.direccion" class="w-full" />
          </UFormField>
          <UFormField label="Localidad" name="localidad">
            <USelectMenu id="centro-localidad" v-model="form.localidad" :items="itemsLocalidades" value-key="value" placeholder="Elegí la localidad" class="w-full" />
          </UFormField>
          <UFormField label="Teléfono" name="telefono">
            <UInput id="centro-telefono" v-model="form.telefono" type="tel" class="w-full" />
          </UFormField>
          <UFormField label="Horario de atención" name="horario" description="Por ejemplo: lunes a viernes de 8 a 16.">
            <UInput id="centro-horario" v-model="form.horario" class="w-full" />
          </UFormField>
          <UFormField label="Cómo llegar" name="comoLlegar" description="Colectivos, trenes o referencias.">
            <UTextarea id="centro-como-llegar" v-model="form.comoLlegar" :rows="2" class="w-full" />
          </UFormField>
          <fieldset class="min-w-0 flex flex-col gap-3">
            <legend class="text-lg font-bold mb-3">Cómo es el edificio</legend>
            <UCheckbox id="centro-rampa" v-model="form.rampa" label="Tiene rampa en la entrada" />
            <UCheckbox id="centro-ascensor" v-model="form.ascensor" label="Tiene ascensor" />
            <UCheckbox id="centro-bano" v-model="form.bano" label="Tiene baño adaptado" />
            <UCheckbox id="centro-estacionamiento" v-model="form.estacionamiento" label="Tiene estacionamiento para personas con discapacidad" />
          </fieldset>
          <UFormField name="modo">
            <OpcionesTarjeta v-model="form.modo" legend="¿Cómo se piden los turnos?" :opciones="OPCIONES_MODO" />
          </UFormField>
          <template v-if="form.modo === 'derivacion'">
            <UFormField label="Página de turnos del hospital" name="webTurnos">
              <UInput id="centro-web" v-model="form.webTurnos" type="url" class="w-full" />
            </UFormField>
            <UFormField label="Teléfono para turnos" name="telefonoTurnos">
              <UInput id="centro-telefono-turnos" v-model="form.telefonoTurnos" type="tel" class="w-full" />
            </UFormField>
            <UFormField label="Cómo pedir el turno" name="instrucciones" description="En lenguaje simple. Por ejemplo: llamá de 8 a 12 y pedí turno con oculista.">
              <UTextarea id="centro-instrucciones" v-model="form.instrucciones" :rows="3" class="w-full" />
            </UFormField>
          </template>
          <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso" />
        </UForm>
      </template>
      <template #footer>
        <div class="w-full flex flex-col gap-3 sm:flex-row sm:justify-end">
          <UButton icon="i-lucide-x" label="Cancelar" @click="abierto = false" />
          <UButton color="primary" variant="solid" icon="i-lucide-save" label="Guardar" :loading="guardando" @click="formEl?.submit()" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Tables } from '~/types/database'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

type Centro = Tables<'centros'>

const OPCIONES_MODO = [
  { value: 'app', label: 'En esta app', description: 'Las agendas se cargan acá.' },
  { value: 'derivacion', label: 'Por el canal del hospital', description: 'La app explica cómo pedirlo: página web, teléfono o ventanilla.' },
]
const FORM_VACIO = {
  id: '',
  nombre: '',
  tipo: 'hospital',
  dependencia: 'Municipal',
  direccion: '',
  localidad: undefined as number | undefined,
  telefono: '',
  horario: '',
  comoLlegar: '',
  rampa: false,
  ascensor: false,
  bano: false,
  estacionamiento: false,
  modo: 'app',
  webTurnos: '',
  telefonoTurnos: '',
  instrucciones: '',
}

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Centros' })

const supabase = useSupabaseClient()
const { localidades, localidadPorNombre } = useTurnos()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const centros = shallowRef<Centro[]>([])
const estado = ref<EstadoVista>('cargando')
const abierto = ref(false)
const guardando = ref(false)
const aviso = ref<string>()
const form = reactive({ ...FORM_VACIO })
const formEl = useTemplateRef<{ submit: () => Promise<void> }>('formEl')

const itemsLocalidades = computed(() => localidades.value.map((l) => ({ label: l.nombre, description: l.partido, value: l.id })))

async function cargar() {
  estado.value = 'cargando'
  const { data, error } = await supabase.from('centros').select('*').order('nombre')
  if (error) {
    estado.value = 'error'
    return
  }
  centros.value = data
  estado.value = data.length ? 'contenido' : 'vacio'
}

function abrir(c?: Centro) {
  aviso.value = undefined
  const acc = (c?.accesibilidad_edilicia ?? {}) as Record<string, boolean>
  Object.assign(form, FORM_VACIO, c
    ? {
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        dependencia: c.dependencia,
        direccion: c.direccion,
        localidad: localidadPorNombre(c.localidad)?.id,
        telefono: c.telefono ?? '',
        horario: c.horario_atencion ?? '',
        comoLlegar: c.como_llegar ?? '',
        rampa: !!acc.rampa,
        ascensor: !!acc.ascensor,
        bano: !!acc.bano_adaptado,
        estacionamiento: !!acc.estacionamiento,
        modo: c.modo_turnos,
        webTurnos: c.web_turnos ?? '',
        telefonoTurnos: c.telefono_turnos ?? '',
        instrucciones: c.instrucciones_turno ?? '',
      }
    : {})
  abierto.value = true
}

async function guardar() {
  const loc = localidades.value.find((l) => l.id === form.localidad)
  if (!loc) return
  guardando.value = true
  aviso.value = undefined
  const fila = {
    nombre: form.nombre.trim(),
    tipo: form.tipo as Centro['tipo'],
    dependencia: form.dependencia,
    direccion: form.direccion.trim(),
    localidad: loc.nombre,
    partido: loc.partido,
    lat: loc.lat,
    lng: loc.lng,
    telefono: form.telefono.trim() || null,
    horario_atencion: form.horario.trim() || null,
    como_llegar: form.comoLlegar.trim() || null,
    accesibilidad_edilicia: { rampa: form.rampa, ascensor: form.ascensor, bano_adaptado: form.bano, estacionamiento: form.estacionamiento },
    modo_turnos: form.modo as Centro['modo_turnos'],
    web_turnos: form.modo === 'derivacion' ? form.webTurnos.trim() || null : null,
    telefono_turnos: form.modo === 'derivacion' ? form.telefonoTurnos.trim() || null : null,
    instrucciones_turno: form.modo === 'derivacion' ? form.instrucciones.trim() || null : null,
  }
  const { error } = form.id
    ? await supabase.from('centros').update(fila).eq('id', form.id)
    : await supabase.from('centros').insert({ ...fila, fuente: 'Carga manual' })
  guardando.value = false
  if (error) {
    aviso.value = mensajeDeError(error)
    alert(aviso.value)
    return
  }
  abierto.value = false
  announce(form.id ? 'Guardamos los cambios del centro.' : 'Agregamos el centro.')
  await cargar()
}

async function cambiarActivo(c: Centro) {
  const { error } = await supabase.from('centros').update({ activo: !c.activo }).eq('id', c.id)
  if (error) {
    alert(mensajeDeError(error))
    return
  }
  announce(c.activo ? `${c.nombre} quedó dado de baja.` : `${c.nombre} volvió a estar activo.`)
  await cargar()
}

onMounted(cargar)
</script>
