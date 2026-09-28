<template>
  <div class="max-w-xl flex flex-col gap-8">
    <VistaEstados :estado="estado === 'cargando' ? 'cargando' : 'contenido'" texto-cargando="Estamos revisando tu enlace. Esperá un momento.">
      <div v-if="estado === 'sin-enlace'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Este enlace ya no sirve</h1>
        <p class="text-lg">Puede que haya vencido, que ya lo hayas usado o que lo hayas abierto en otro teléfono o computadora. Pedí uno nuevo desde este mismo dispositivo.</p>
        <UButton to="/recuperar-clave" color="primary" variant="solid" label="Pedir un enlace nuevo" icon="i-lucide-mail" class="self-start" />
      </div>

      <div v-else-if="estado === 'listo'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Listo. Cambiamos tu contraseña.</h1>
        <p class="text-lg">La próxima vez que ingreses, usá la contraseña nueva.</p>
        <UButton to="/inicio" color="primary" variant="solid" label="Ir a mi inicio" icon="i-lucide-house" class="self-start" />
      </div>

      <div v-else class="flex flex-col gap-8">
        <h1 class="text-2xl font-bold">Elegí tu contraseña nueva</h1>
        <UForm method="post" :validate-on="['input']" :schema="SCHEMA_CLAVE_NUEVA" :state="form" class="flex flex-col gap-6" @submit="enviar" @error="alFallar">
          <p class="text-lg">Tiene que tener al menos 8 letras o números. Anotala en un lugar seguro.</p>
          <UFormField label="Tu contraseña nueva" name="clave">
            <CampoClave v-model="form.clave" autocomplete="new-password" />
          </UFormField>
          <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />
          <AccionesPaso submit sin-volver confirmar="Guardar la contraseña nueva" :cargando="enviando" />
        </UForm>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'

type Estado = 'cargando' | 'formulario' | 'sin-enlace' | 'listo'

useHead({ title: 'Elegí tu contraseña nueva' })

const supabase = useSupabaseClient()
const { cambiarClave } = useSesion()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const estado = ref<Estado>('cargando')
const form = reactive({ clave: '' })
const enviando = ref(false)
const aviso = ref<Aviso>()

async function enviar() {
  enviando.value = true
  aviso.value = undefined
  const resultado = await cambiarClave(form.clave)
  enviando.value = false
  if (resultado.ok) {
    estado.value = 'listo'
    announce('Listo. Cambiamos tu contraseña.')
  } else {
    aviso.value = resultado.aviso
    alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
  }
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  estado.value = data.session ? 'formulario' : 'sin-enlace'
})
</script>
