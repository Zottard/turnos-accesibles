<template>
  <div class="flex flex-col gap-8">
    <AdminNav />
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Profesionales</h1>
      <UButton color="primary" variant="solid" icon="i-lucide-plus" label="Agregar un profesional" class="self-start" @click="abrir()" />
    </div>

    <VistaEstados :estado="estado" texto-vacio="Todavía no hay profesionales cargados." @reintentar="cargar">
      <div class="flex flex-col gap-4">
        <UFormField label="Buscar por nombre o especialidad" name="filtro">
          <UInput id="prof-filtro" v-model="filtro" icon="i-lucide-search" class="w-full sm:w-96" />
        </UFormField>
        <p>{{ filtrados.length }} de {{ profesionales.length }} profesionales.</p>
        <ul class="flex flex-col gap-3">
          <li v-for="p in filtrados.slice(0, mostrar)" :key="p.id" class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-default py-3">
            <div :id="`prof-${p.id}`" class="min-w-0 flex-1">
              <p class="text-lg font-bold">{{ p.apellido }}, {{ p.nombre }}</p>
              <p class="text-muted">{{ nombreEspecialidad(p.especialidad_id) }} · Matrícula {{ p.matricula }}</p>
            </div>
            <template v-if="borrando === p.id">
              <span>¿Seguro? Se borra para siempre.</span>
              <UButton size="lg" color="error" variant="solid" icon="i-lucide-trash-2" label="Sí, borrar" :aria-describedby="`prof-${p.id}`" @click="borrar(p)" />
              <UButton size="lg" label="No" :aria-describedby="`prof-${p.id}`" @click="borrando = undefined" />
            </template>
            <template v-else>
              <UButton size="lg" icon="i-lucide-pencil" label="Editar" :aria-describedby="`prof-${p.id}`" @click="abrir(p)" />
              <UButton size="lg" color="error" variant="outline" icon="i-lucide-trash-2" label="Borrar" :aria-describedby="`prof-${p.id}`" @click="borrando = p.id" />
            </template>
          </li>
        </ul>
        <UButton v-if="filtrados.length > mostrar" icon="i-lucide-chevrons-down" label="Mostrar más" class="self-start" @click="mostrar += 20" />
      </div>
    </VistaEstados>

    <UModal v-model:open="abierto" :title="form.id ? 'Editar el profesional' : 'Agregar un profesional'">
      <template #body>
        <UForm ref="formEl" method="post" :validate-on="['input']" :schema="SCHEMA_PROFESIONAL" :state="form" class="flex flex-col gap-6" @submit="guardar" @error="alFallar">
          <UFormField label="Nombre" name="nombre">
            <UInput id="prof-nombre" v-model="form.nombre" class="w-full" autofocus />
          </UFormField>
          <UFormField label="Apellido" name="apellido">
            <UInput id="prof-apellido" v-model="form.apellido" class="w-full" />
          </UFormField>
          <UFormField label="Matrícula" name="matricula">
            <UInput id="prof-matricula" v-model="form.matricula" class="w-full" />
          </UFormField>
          <UFormField label="Especialidad" name="especialidad">
            <USelectMenu id="prof-especialidad" v-model="form.especialidad" :items="itemsEspecialidades" value-key="value" placeholder="Elegí la especialidad" class="w-full" />
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

type Profesional = Tables<'profesionales'>

const FORM_VACIO = { id: '', nombre: '', apellido: '', matricula: '', especialidad: undefined as number | undefined }

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Profesionales' })

const supabase = useSupabaseClient()
const { especialidades } = useTurnos()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const profesionales = shallowRef<Profesional[]>([])
const estado = ref<EstadoVista>('cargando')
const abierto = ref(false)
const guardando = ref(false)
const aviso = ref<string>()
const filtro = ref('')
const mostrar = ref(20)
const borrando = ref<string>()
const form = reactive({ ...FORM_VACIO })
const formEl = useTemplateRef<{ submit: () => Promise<void> }>('formEl')

const itemsEspecialidades = computed(() => especialidades.value.map((e) => ({ label: e.nombre_comun, description: e.nombre_tecnico, value: e.id })))
const nombreEspecialidad = (id: number) => especialidades.value.find((e) => e.id === id)?.nombre_tecnico ?? ''
const filtrados = computed(() => {
  const f = filtro.value.trim().toLowerCase()
  return f
    ? profesionales.value.filter((p) => `${p.nombre} ${p.apellido} ${nombreEspecialidad(p.especialidad_id)}`.toLowerCase().includes(f))
    : profesionales.value
})

async function cargar() {
  estado.value = 'cargando'
  const { data, error } = await supabase.from('profesionales').select('*').order('apellido')
  if (error) {
    estado.value = 'error'
    return
  }
  profesionales.value = data
  estado.value = data.length ? 'contenido' : 'vacio'
}

function abrir(p?: Profesional) {
  aviso.value = undefined
  Object.assign(form, FORM_VACIO, p ? { id: p.id, nombre: p.nombre, apellido: p.apellido, matricula: p.matricula, especialidad: p.especialidad_id } : {})
  abierto.value = true
}

async function guardar() {
  if (!form.especialidad) return
  guardando.value = true
  aviso.value = undefined
  const fila = { nombre: form.nombre.trim(), apellido: form.apellido.trim(), matricula: form.matricula.trim(), especialidad_id: form.especialidad }
  const { error } = form.id
    ? await supabase.from('profesionales').update(fila).eq('id', form.id)
    : await supabase.from('profesionales').insert(fila)
  guardando.value = false
  if (error) {
    aviso.value = mensajeDeError(error)
    alert(aviso.value)
    return
  }
  abierto.value = false
  announce(form.id ? 'Guardamos los cambios.' : 'Agregamos el profesional.')
  await cargar()
}

async function borrar(p: Profesional) {
  borrando.value = undefined
  const { error } = await supabase.from('profesionales').delete().eq('id', p.id)
  if (error) {
    alert(mensajeDeError(error))
    return
  }
  announce(`Borramos a ${p.nombre} ${p.apellido}.`)
  await cargar()
}

watch(filtro, () => { mostrar.value = 20 })

onMounted(cargar)
</script>
