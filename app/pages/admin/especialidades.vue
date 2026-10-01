<template>
  <div class="flex flex-col gap-8">
    <AdminNav />
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Especialidades</h1>
      <p class="text-lg">El nombre común es el que ve la gente primero. El técnico va abajo, más chico.</p>
      <UButton color="primary" variant="solid" icon="i-lucide-plus" label="Agregar una especialidad" class="self-start" @click="abrir()" />
    </div>

    <VistaEstados :estado="estado" texto-vacio="Todavía no hay especialidades cargadas." @reintentar="cargar">
      <ul class="grid gap-4 md:grid-cols-2">
        <li v-for="e in especialidades" :key="e.id">
          <article :aria-labelledby="`esp-${e.id}`" class="h-full flex flex-col gap-3 border-2 border-default rounded-md p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h2 :id="`esp-${e.id}`" class="flex min-w-0 items-center gap-3 text-lg font-bold">
                <UIcon :name="e.icono" class="size-7 shrink-0" aria-hidden="true" />
                {{ e.nombre_comun }}
              </h2>
              <UBadge :color="e.activo ? 'success' : 'neutral'" :icon="e.activo ? 'i-lucide-circle-check' : 'i-lucide-circle-pause'" :label="e.activo ? 'Activa' : 'Dada de baja'" />
            </div>
            <p class="text-muted">{{ e.nombre_tecnico }}</p>
            <p>{{ e.descripcion_simple }}</p>
            <div class="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <UButton size="lg" icon="i-lucide-pencil" label="Editar" :aria-describedby="`esp-${e.id}`" @click="abrir(e)" />
              <UButton
                size="lg"
                :color="e.activo ? 'error' : 'neutral'"
                variant="outline"
                :label="e.activo ? 'Dar de baja' : 'Volver a activar'"
                :aria-describedby="`esp-${e.id}`"
                @click="cambiarActivo(e)"
              />
            </div>
          </article>
        </li>
      </ul>
    </VistaEstados>

    <UModal v-model:open="abierto" :title="form.id ? 'Editar la especialidad' : 'Agregar una especialidad'">
      <template #body>
        <UForm ref="formEl" method="post" :validate-on="['input']" :schema="SCHEMA_ESPECIALIDAD" :state="form" class="flex flex-col gap-6" @submit="guardar" @error="alFallar">
          <UFormField label="Nombre común" name="nombreComun" description="Como lo dice la gente. Por ejemplo: Oculista.">
            <UInput id="esp-comun" v-model="form.nombreComun" class="w-full" autofocus />
          </UFormField>
          <UFormField label="Nombre técnico" name="nombreTecnico" description="Por ejemplo: Oftalmología.">
            <UInput id="esp-tecnico" v-model="form.nombreTecnico" class="w-full" />
          </UFormField>
          <UFormField label="Para qué sirve" name="descripcion" description="Una oración simple. Por ejemplo: Para la vista: anteojos, visión borrosa.">
            <UTextarea id="esp-descripcion" v-model="form.descripcion" :rows="2" class="w-full" />
          </UFormField>
          <UFormField label="Ícono" name="icono">
            <USelect id="esp-icono" v-model="form.icono" :items="ICONOS" class="w-full" />
          </UFormField>
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

type Especialidad = Tables<'especialidades'>

const ICONOS = [
  { label: 'Ojo', value: 'i-lucide-eye', icon: 'i-lucide-eye' },
  { label: 'Estetoscopio', value: 'i-lucide-stethoscope', icon: 'i-lucide-stethoscope' },
  { label: 'Corazón', value: 'i-lucide-heart-pulse', icon: 'i-lucide-heart-pulse' },
  { label: 'Sonrisa', value: 'i-lucide-smile', icon: 'i-lucide-smile' },
  { label: 'Mano', value: 'i-lucide-hand', icon: 'i-lucide-hand' },
  { label: 'Hueso', value: 'i-lucide-bone', icon: 'i-lucide-bone' },
  { label: 'Mujer', value: 'i-lucide-venus', icon: 'i-lucide-venus' },
  { label: 'Bebé', value: 'i-lucide-baby', icon: 'i-lucide-baby' },
  { label: 'Oído', value: 'i-lucide-ear', icon: 'i-lucide-ear' },
  { label: 'Cerebro', value: 'i-lucide-brain', icon: 'i-lucide-brain' },
  { label: 'Gotas', value: 'i-lucide-droplets', icon: 'i-lucide-droplets' },
  { label: 'Jeringa', value: 'i-lucide-syringe', icon: 'i-lucide-syringe' },
  { label: 'Aire', value: 'i-lucide-wind', icon: 'i-lucide-wind' },
  { label: 'Tubo de ensayo', value: 'i-lucide-test-tube', icon: 'i-lucide-test-tube' },
  { label: 'Escáner', value: 'i-lucide-scan-line', icon: 'i-lucide-scan-line' },
]
const FORM_VACIO = { id: 0, nombreComun: '', nombreTecnico: '', descripcion: '', icono: 'i-lucide-stethoscope' }

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Especialidades' })

const supabase = useSupabaseClient()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const especialidades = shallowRef<Especialidad[]>([])
const estado = ref<EstadoVista>('cargando')
const abierto = ref(false)
const guardando = ref(false)
const aviso = ref<string>()
const form = reactive({ ...FORM_VACIO })
const formEl = useTemplateRef<{ submit: () => Promise<void> }>('formEl')

const slug = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function cargar() {
  estado.value = 'cargando'
  const { data, error } = await supabase.from('especialidades').select('*').order('nombre_comun')
  if (error) {
    estado.value = 'error'
    return
  }
  especialidades.value = data
  estado.value = data.length ? 'contenido' : 'vacio'
}

function abrir(e?: Especialidad) {
  aviso.value = undefined
  Object.assign(form, FORM_VACIO, e ? { id: e.id, nombreComun: e.nombre_comun, nombreTecnico: e.nombre_tecnico, descripcion: e.descripcion_simple, icono: e.icono } : {})
  abierto.value = true
}

async function guardar() {
  guardando.value = true
  aviso.value = undefined
  const fila = { nombre_comun: form.nombreComun.trim(), nombre_tecnico: form.nombreTecnico.trim(), descripcion_simple: form.descripcion.trim(), icono: form.icono }
  const { error } = form.id
    ? await supabase.from('especialidades').update(fila).eq('id', form.id)
    : await supabase.from('especialidades').insert({ ...fila, slug: slug(fila.nombre_tecnico) })
  guardando.value = false
  if (error) {
    aviso.value = mensajeDeError(error)
    alert(aviso.value)
    return
  }
  abierto.value = false
  announce(form.id ? 'Guardamos los cambios.' : 'Agregamos la especialidad.')
  await cargar()
}

async function cambiarActivo(e: Especialidad) {
  const { error } = await supabase.from('especialidades').update({ activo: !e.activo }).eq('id', e.id)
  if (error) {
    alert(mensajeDeError(error))
    return
  }
  announce(e.activo ? `${e.nombre_comun} quedó dada de baja.` : `${e.nombre_comun} volvió a estar activa.`)
  await cargar()
}

onMounted(cargar)
</script>
