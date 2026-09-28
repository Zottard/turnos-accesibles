<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <AsistentePaso :paso="estado.paso + 1" :total="PASOS.length" :titulo="actual.titulo" :descripcion="actual.descripcion">
      <UForm
        :key="estado.paso"
        method="post"
        :validate-on="['input']"
        :schema="actual.schema"
        :state="estado"
        class="flex flex-col gap-8"
        @submit="avanzar"
        @error="alFallar"
      >
        <div v-if="estado.paso === 0" class="flex flex-col gap-6">
          <UFormField label="Tu nombre" name="nombre">
            <UInput v-model="estado.nombre" autocomplete="given-name" class="w-full" />
          </UFormField>
          <UFormField label="Tu apellido" name="apellido">
            <UInput v-model="estado.apellido" autocomplete="family-name" class="w-full" />
          </UFormField>
        </div>

        <UFormField v-else-if="estado.paso === 1" label="Número de documento" name="documento" description="Por ejemplo: 12345678">
          <UInput v-model="estado.documento" inputmode="numeric" autocomplete="off" class="w-full" />
        </UFormField>

        <fieldset v-else-if="estado.paso === 2" class="min-w-0 flex flex-col gap-6">
          <legend class="sr-only">Fecha de nacimiento</legend>
          <UFormField label="Día" name="dia" description="Por ejemplo: 14">
            <UInput v-model="estado.dia" inputmode="numeric" autocomplete="bday-day" maxlength="2" class="w-full sm:w-32" />
          </UFormField>
          <UFormField label="Mes" name="mes">
            <USelect v-model="estado.mes" :items="ITEMS_MESES" placeholder="Elegí el mes" class="w-full sm:w-72" />
          </UFormField>
          <UFormField label="Año" name="anio" description="Por ejemplo: 1955">
            <UInput v-model="estado.anio" inputmode="numeric" autocomplete="bday-year" maxlength="4" class="w-full sm:w-40" />
          </UFormField>
        </fieldset>

        <UFormField v-else-if="estado.paso === 3" label="Tu localidad" name="localidad" description="Por ejemplo: General Pacheco">
          <UInput v-model="estado.localidad" autocomplete="address-level2" class="w-full" />
        </UFormField>

        <UFormField v-else-if="estado.paso === 4" label="Tu correo" name="email" description="Por ejemplo: nombre@gmail.com">
          <UInput v-model="estado.email" type="email" autocomplete="email" class="w-full" />
        </UFormField>

        <UFormField v-else-if="estado.paso === 5" label="Tu contraseña nueva" name="clave">
          <CampoClave v-model="estado.clave" autocomplete="new-password" />
        </UFormField>

        <div v-else class="flex flex-col gap-6">
          <dl class="flex flex-col">
            <div v-for="dato in resumen" :key="dato.paso" class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b-2 border-default py-4">
              <div class="min-w-0 flex-1">
                <dt class="text-base text-muted">{{ dato.etiqueta }}</dt>
                <dd class="text-lg font-bold">{{ dato.valor }}</dd>
              </div>
              <UButton size="lg" icon="i-lucide-pencil" label="Cambiar" :aria-label="`Cambiar ${dato.etiqueta.toLowerCase()}`" @click="editar(dato.paso)" />
            </div>
          </dl>

          <UFormField name="terminos">
            <UCheckbox v-model="estado.terminos" label="Leí y acepto los términos de uso" />
          </UFormField>
          <p class="text-lg">
            <NuxtLink to="/terminos" target="_blank" class="underline">Leer los términos de uso (se abre en otra pestaña)</NuxtLink>
          </p>

          <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />
        </div>

        <AccionesPaso
          submit
          :confirmar="estado.paso === ULTIMO ? 'Sí, crear mi cuenta' : undefined"
          :cargando="enviando"
          :sin-volver="estado.paso === 0"
          @volver="volver"
        />
      </UForm>
    </AsistentePaso>

    <p v-if="estado.paso === 0" class="text-lg">
      <NuxtLink to="/ingresar" class="inline-flex items-center min-h-12 underline">Ya tengo cuenta. Quiero ingresar.</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'

const PASOS = [
  { titulo: '¿Cómo te llamás?', descripcion: 'Escribí tu nombre y tu apellido como figuran en tu documento.', schema: SCHEMA_NOMBRE },
  { titulo: '¿Cuál es tu número de documento?', descripcion: 'Lo usamos para pedir los turnos a tu nombre. Escribí solo los números.', schema: SCHEMA_DOCUMENTO },
  { titulo: '¿Cuándo naciste?', descripcion: 'Escribí el día, elegí el mes y escribí el año.', schema: SCHEMA_NACIMIENTO },
  { titulo: '¿En qué localidad vivís?', descripcion: 'Así te mostramos los hospitales que te quedan cerca.', schema: SCHEMA_LOCALIDAD },
  { titulo: '¿Cuál es tu correo electrónico?', descripcion: 'Te vamos a mandar un mensaje para confirmar que es tuyo.', schema: SCHEMA_REGISTRO_CORREO },
  { titulo: 'Elegí una contraseña', descripcion: 'Tiene que tener al menos 8 letras o números. Anotala en un lugar seguro.', schema: SCHEMA_CLAVE_NUEVA },
  { titulo: 'Revisá tus datos', descripcion: 'Si algo está mal, tocá "Cambiar". Si está todo bien, creá tu cuenta.', schema: SCHEMA_TERMINOS },
]
const ULTIMO = PASOS.length - 1
const PASO_CLAVE = 5
const ITEMS_MESES = MESES.map((label, i) => ({ label, value: String(i + 1) }))

definePageMeta({ middleware: 'invitado' })
useHead({ title: 'Crear una cuenta' })

const { borrador, descartar } = useRegistro()
const { registrar } = useSesion()
const { alFallar } = useFormulario()
const { alert } = useAnuncio()
const correoRegistrado = useState('correo-registrado', () => '')

const estado = reactive({ ...borrador.value, clave: '', terminos: false })
const enviando = ref(false)
const aviso = ref<Aviso>()

const actual = computed(() => PASOS[estado.paso] ?? PASOS[0]!)

const resumen = computed(() => [
  { paso: 0, etiqueta: 'Nombre', valor: `${estado.nombre} ${estado.apellido}` },
  { paso: 1, etiqueta: 'Documento', valor: limpiarDocumento(estado.documento) },
  { paso: 2, etiqueta: 'Fecha de nacimiento', valor: `${Number(estado.dia)} de ${MESES[Number(estado.mes) - 1]} de ${estado.anio}` },
  { paso: 3, etiqueta: 'Localidad', valor: estado.localidad },
  { paso: 4, etiqueta: 'Correo', valor: estado.email },
  { paso: 5, etiqueta: 'Contraseña', valor: 'La que elegiste' },
])

function editar(paso: number) {
  estado.editandoDesdeResumen = true
  estado.paso = paso
}

function volver() {
  if (estado.editandoDesdeResumen) {
    estado.editandoDesdeResumen = false
    estado.paso = ULTIMO
    return
  }
  estado.paso = Math.max(0, estado.paso - 1)
}

async function avanzar() {
  if (estado.paso < ULTIMO) {
    estado.paso = estado.editandoDesdeResumen ? ULTIMO : estado.paso + 1
    estado.editandoDesdeResumen = false
    return
  }

  enviando.value = true
  aviso.value = undefined
  const resultado = await registrar({
    nombre: estado.nombre.trim(),
    apellido: estado.apellido.trim(),
    documento: limpiarDocumento(estado.documento),
    fechaNacimiento: fechaIso(estado.dia, estado.mes, estado.anio),
    localidad: estado.localidad.trim(),
    email: estado.email.trim(),
    clave: estado.clave,
  })
  enviando.value = false

  if (resultado.ok) {
    correoRegistrado.value = estado.email.trim()
    descartar()
    return navigateTo('/confirmar-correo')
  }
  aviso.value = resultado.aviso
  alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
}

watch(borrador, (guardado) => {
  const { clave, terminos } = estado
  Object.assign(estado, guardado, { clave, terminos })
  if (estado.paso > PASO_CLAVE && !estado.clave) estado.paso = PASO_CLAVE
}, { once: true })

watch(estado, ({ clave: _clave, terminos: _terminos, ...resto }) => {
  borrador.value = resto
}, { deep: true })
</script>
