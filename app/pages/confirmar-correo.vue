<template>
  <div class="max-w-xl flex flex-col gap-6">
    <VistaEstados :estado="estado === 'cargando' ? 'cargando' : 'contenido'" texto-cargando="Estamos revisando tu enlace. Esperá un momento.">
      <div v-if="estado === 'enviado'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Te mandamos un correo</h1>
        <p class="text-lg">
          <template v-if="correo">Lo mandamos a <strong>{{ correo }}</strong>.</template>
          Abrilo y tocá el botón para confirmar tu correo.
        </p>
        <p class="text-lg">¿No te llegó? Fijate en la carpeta de correo no deseado o spam.</p>
        <UButton v-if="correo" label="Mandarme el correo de nuevo" icon="i-lucide-mail" class="self-start" :loading="reenviando" @click="reenviar" />
        <p v-if="reenviado" class="text-lg">Listo. Te lo mandamos de nuevo.</p>
        <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />
      </div>

      <div v-else-if="estado === 'listo'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Listo. Confirmaste tu correo.</h1>
        <p class="text-lg">Ya podés usar tu cuenta.</p>
        <UButton to="/inicio" color="primary" variant="solid" label="Empezar" icon="i-lucide-arrow-right" trailing class="self-start" />
      </div>

      <div v-else-if="estado === 'confirmado'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Tu correo quedó confirmado</h1>
        <p class="text-lg">Ahora ingresá con tu correo y tu contraseña.</p>
        <UButton to="/ingresar" color="primary" variant="solid" label="Ingresar" icon="i-lucide-log-in" class="self-start" />
      </div>

      <div v-else-if="estado === 'vencido'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Este enlace ya no sirve</h1>
        <p class="text-lg">Puede que haya vencido o que ya lo hayas usado. Ingresá con tu correo y tu contraseña. Si hace falta, te mandamos un enlace nuevo.</p>
        <UButton to="/ingresar" color="primary" variant="solid" label="Ingresar" icon="i-lucide-log-in" class="self-start" />
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'

type Estado = 'cargando' | 'enviado' | 'listo' | 'confirmado' | 'vencido'

useHead({ title: 'Confirmá tu correo' })

const route = useRoute()
const supabase = useSupabaseClient()
const { reenviarConfirmacion, cargarPerfil } = useSesion()
const { announce, alert } = useAnuncio()
const correo = useState('correo-registrado', () => '')

const estado = ref<Estado>('cargando')
const reenviando = ref(false)
const reenviado = ref(false)
const aviso = ref<Aviso>()

async function reenviar() {
  reenviando.value = true
  aviso.value = undefined
  const resultado = await reenviarConfirmacion(correo.value)
  reenviando.value = false
  if (resultado.ok) {
    reenviado.value = true
    announce('Listo. Te lo mandamos de nuevo.')
  } else {
    aviso.value = resultado.aviso
    alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
  }
}

onMounted(async () => {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  if (route.query.error || hash.get('error')) {
    estado.value = 'vencido'
    return
  }
  if (!route.query.code) {
    estado.value = 'enviado'
    return
  }
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    await cargarPerfil(true)
    estado.value = 'listo'
  } else {
    estado.value = 'confirmado'
  }
})
</script>
