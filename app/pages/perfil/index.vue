<template>
  <div class="max-w-2xl flex flex-col gap-10">
    <h1 class="text-2xl font-bold">Mi perfil</h1>

    <section aria-labelledby="titulo-datos" class="flex flex-col gap-6">
      <h2 id="titulo-datos" class="text-xl font-bold">Mis datos</h2>

      <VistaEstados :estado="listo ? 'contenido' : 'cargando'" texto-cargando="Estamos trayendo tus datos. Esperá un momento.">
        <dl class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-x-4">
            <dt class="font-bold">Documento:</dt>
            <dd>{{ perfil?.documento }}</dd>
          </div>
          <div v-if="perfil?.fecha_nacimiento" class="flex flex-wrap gap-x-4">
            <dt class="font-bold">Fecha de nacimiento:</dt>
            <dd>{{ nacimiento }}</dd>
          </div>
        </dl>

        <UForm method="post" :validate-on="['input']" :schema="SCHEMA_PERFIL" :state="form" class="flex flex-col gap-6" @submit="guardar" @error="alFallar">
          <UFormField label="Tu nombre" name="nombre">
            <UInput id="perfil-nombre" v-model="form.nombre" autocomplete="given-name" class="w-full" />
          </UFormField>
          <UFormField label="Tu apellido" name="apellido">
            <UInput id="perfil-apellido" v-model="form.apellido" autocomplete="family-name" class="w-full" />
          </UFormField>
          <UFormField label="Tu teléfono" name="telefono" description="No es obligatorio. Lo usamos solo si hay que avisarte algo urgente.">
            <UInput id="perfil-telefono" v-model="form.telefono" type="tel" autocomplete="tel" class="w-full" />
          </UFormField>
          <UFormField label="Tu localidad" name="localidad" description="La usamos para mostrarte los hospitales más cerca.">
            <USelectMenu id="perfil-localidad" v-model="form.localidad" :items="itemsLocalidades" value-key="value" placeholder="Elegí tu localidad" class="w-full" />
          </UFormField>

          <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso" description="Revisá tu conexión a internet y probá de nuevo." />

          <UButton type="submit" color="primary" variant="solid" icon="i-lucide-save" label="Guardar mis datos" block class="sm:w-auto sm:self-start" :loading="guardando" />
        </UForm>
      </VistaEstados>
    </section>

    <section aria-labelledby="titulo-mas" class="flex flex-col gap-4">
      <h2 id="titulo-mas" class="text-xl font-bold">Más opciones</h2>
      <UButton to="/perfil/accesibilidad" icon="i-lucide-accessibility" label="Cómo quiero usar la app" class="self-start" />
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mi perfil' })

const supabase = useSupabaseClient()
const { perfil, cargarPerfil } = useSesion()
const { localidades, localidadPorNombre } = useTurnos()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const form = reactive({
  nombre: '',
  apellido: '',
  telefono: '',
  localidad: undefined as number | undefined,
})
const guardando = ref(false)
const listo = ref(false)
const aviso = ref<string>()

const itemsLocalidades = computed(() => localidades.value.map((l) => ({ label: l.nombre, description: l.partido, value: l.id })))
const nacimiento = computed(() => (perfil.value?.fecha_nacimiento ? diaEnPalabras(`${perfil.value.fecha_nacimiento}T12:00:00-03:00`).replace(/^\w+ /, '') : ''))

async function guardar() {
  const loc = localidades.value.find((l) => l.id === form.localidad)
  if (!perfil.value || !loc) return
  guardando.value = true
  aviso.value = undefined
  const { error } = await supabase
    .from('profiles')
    .update({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim() || null,
      localidad: loc.nombre,
      lat: loc.lat,
      lng: loc.lng,
    })
    .eq('id', perfil.value.id)
  guardando.value = false
  if (error) {
    aviso.value = 'No pudimos guardar tus datos.'
    alert(`${aviso.value} Revisá tu conexión a internet y probá de nuevo.`)
    return
  }
  await cargarPerfil(true)
  announce('Listo. Guardamos tus datos.')
}

watch(localidades, () => {
  form.localidad ??= localidadPorNombre(perfil.value?.localidad)?.id
})

onMounted(async () => {
  const p = await cargarPerfil()
  if (p) {
    form.nombre = p.nombre
    form.apellido = p.apellido
    form.telefono = p.telefono ?? ''
    form.localidad = localidadPorNombre(p.localidad)?.id
  }
  listo.value = true
})
</script>
