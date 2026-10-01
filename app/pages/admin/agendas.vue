<template>
  <div class="flex flex-col gap-8">
    <AdminNav />
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Generar agendas</h1>
      <p class="text-lg">Elegí el lugar, el profesional y los días. Se crean los turnos libres. Si se superpone con otra agenda del mismo profesional, no se crea nada y te decimos qué días chocan.</p>
    </div>

    <UForm ref="formEl" method="post" :validate-on="['input']" :validate="validar" :state="form" class="max-w-2xl flex flex-col gap-6" @submit="generar" @error="alFallar">
      <UFormField label="Centro" name="centro">
        <USelectMenu id="agenda-centro" v-model="form.centro" :items="itemsCentros" value-key="value" placeholder="Elegí el centro" class="w-full" />
      </UFormField>
      <UFormField label="Especialidad" name="especialidad">
        <USelectMenu id="agenda-especialidad" v-model="form.especialidad" :items="itemsEspecialidades" value-key="value" placeholder="Elegí la especialidad" class="w-full" />
      </UFormField>
      <UFormField label="Profesional" name="profesional" :description="form.especialidad ? undefined : 'Primero elegí la especialidad.'">
        <USelectMenu id="agenda-profesional" v-model="form.profesional" :items="itemsProfesionales" value-key="value" placeholder="Elegí el profesional" class="w-full" />
      </UFormField>
      <div class="flex flex-col gap-6 sm:flex-row">
        <UFormField label="Desde" name="desde">
          <UInput id="agenda-desde" v-model="form.desde" type="date" :min="hoy" class="w-full" />
        </UFormField>
        <UFormField label="Hasta" name="hasta" description="Hasta 4 meses.">
          <UInput id="agenda-hasta" v-model="form.hasta" type="date" :min="form.desde || hoy" class="w-full" />
        </UFormField>
      </div>
      <UFormField name="dias">
        <fieldset class="min-w-0 flex flex-col gap-3">
          <legend class="text-lg font-bold mb-3">Días de la semana</legend>
          <UCheckbox v-for="d in DIAS" :id="`agenda-dia-${d.value}`" :key="d.value" v-model="form.dias[d.value]" :label="d.label" />
        </fieldset>
      </UFormField>
      <div class="flex flex-col gap-6 sm:flex-row">
        <UFormField label="Empieza a atender" name="inicio">
          <UInput id="agenda-inicio" v-model="form.inicio" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Termina de atender" name="fin">
          <UInput id="agenda-fin" v-model="form.fin" type="time" class="w-full" />
        </UFormField>
        <UFormField label="Minutos por turno" name="duracion">
          <UInputNumber id="agenda-duracion" v-model="form.duracion" :min="5" :max="120" :step="5" class="w-full" />
        </UFormField>
      </div>

      <UAlert v-if="resultado" :color="resultado.ok ? 'success' : 'error'" :icon="resultado.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" :title="resultado.titulo" :description="resultado.ayuda" />

      <UButton type="submit" color="primary" variant="solid" icon="i-lucide-calendar-plus" label="Generar la agenda" block class="sm:w-auto sm:self-start" :loading="generando" />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Agendas' })

const supabase = useSupabaseClient()
const { especialidades } = useTurnos()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const hoy = fechaLocalIso()
const centros = ref<{ id: string, nombre: string, localidad: string }[]>([])
const profesionales = ref<{ id: string, nombre: string, apellido: string, especialidad_id: number }[]>([])
const generando = ref(false)
const resultado = ref<{ ok: boolean, titulo: string, ayuda: string }>()

const form = reactive({
  centro: undefined as string | undefined,
  especialidad: undefined as number | undefined,
  profesional: undefined as string | undefined,
  desde: hoy,
  hasta: '',
  dias: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false } as Record<number, boolean>,
  inicio: '08:00',
  fin: '12:00',
  duracion: 20,
})

const itemsCentros = computed(() => centros.value.map((c) => ({ label: c.nombre, description: c.localidad, value: c.id })))
const itemsEspecialidades = computed(() => especialidades.value.map((e) => ({ label: e.nombre_comun, description: e.nombre_tecnico, value: e.id })))
const itemsProfesionales = computed(() => profesionales.value
  .filter((p) => p.especialidad_id === form.especialidad)
  .map((p) => ({ label: `${p.apellido}, ${p.nombre}`, value: p.id })))

function validar(f: typeof form): FormError[] {
  const errores: FormError[] = []
  if (!f.centro) errores.push({ name: 'centro', message: 'Elegí el centro.' })
  if (!f.especialidad) errores.push({ name: 'especialidad', message: 'Elegí la especialidad.' })
  if (!f.profesional) errores.push({ name: 'profesional', message: 'Elegí el profesional.' })
  if (!f.desde) errores.push({ name: 'desde', message: 'Elegí desde qué día.' })
  if (!f.hasta || f.hasta < f.desde) errores.push({ name: 'hasta', message: 'Elegí hasta qué día. Tiene que ser después del primero.' })
  if (!Object.values(f.dias).some(Boolean)) errores.push({ name: 'dias', message: 'Elegí al menos un día de la semana.' })
  if (!f.inicio || !f.fin || f.fin <= f.inicio) errores.push({ name: 'fin', message: 'La hora en que termina tiene que ser después de la de inicio.' })
  return errores
}

async function generar() {
  generando.value = true
  resultado.value = undefined
  const { data, error } = await supabase.rpc('generar_agenda', {
    p_centro: form.centro!,
    p_especialidad: form.especialidad!,
    p_profesional: form.profesional!,
    p_desde: form.desde,
    p_hasta: form.hasta,
    p_dias: DIAS.filter((d) => form.dias[d.value]).map((d) => d.value),
    p_hora_inicio: form.inicio,
    p_hora_fin: form.fin,
    p_duracion: form.duracion,
  })
  generando.value = false
  const r = data as { ok: boolean, agendas?: number, turnos?: number, motivo?: string, fechas?: string[] } | null
  if (error || !r) {
    resultado.value = { ok: false, titulo: 'No pudimos generar la agenda.', ayuda: mensajeDeError(error) }
  } else if (r.ok) {
    resultado.value = { ok: true, titulo: `Listo. Creamos ${r.agendas} días de agenda con ${r.turnos} turnos.`, ayuda: 'Ya se pueden reservar.' }
  } else if (r.motivo === 'superpuesta') {
    const dias = (r.fechas ?? []).slice(0, 5).map((f) => diaEnPalabras(`${f}T12:00:00-03:00`)).join('; ')
    resultado.value = { ok: false, titulo: 'Se superpone con otra agenda de este profesional.', ayuda: `Chocan estos días: ${dias}${(r.fechas?.length ?? 0) > 5 ? ' y otros' : ''}. Cambiá el horario o los días.` }
  } else if (r.motivo === 'rango') {
    resultado.value = { ok: false, titulo: 'El período es muy largo.', ayuda: 'Elegí hasta 4 meses.' }
  } else {
    resultado.value = { ok: false, titulo: 'Revisá el horario.', ayuda: 'La hora de fin tiene que ser después de la de inicio y cada turno de al menos 5 minutos.' }
  }
  if (resultado.value.ok) announce(resultado.value.titulo)
  else alert(`${resultado.value.titulo} ${resultado.value.ayuda}`)
}

watch(() => form.especialidad, () => { form.profesional = undefined })

onMounted(async () => {
  const [c, p] = await Promise.all([
    supabase.from('centros').select('id, nombre, localidad').eq('activo', true).order('nombre'),
    supabase.from('profesionales').select('id, nombre, apellido, especialidad_id').order('apellido'),
  ])
  centros.value = c.data ?? []
  profesionales.value = p.data ?? []
})
</script>
