<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <VistaEstados :estado="estado" texto-cargando="Estamos buscando la invitación. Esperá un momento." @reintentar="cargar">
      <div v-if="aceptada" class="flex flex-col gap-6">
        <h1 ref="tituloEl" tabindex="-1" class="text-2xl font-bold">Listo. Ya acompañás a {{ invitacion?.nombre }}.</h1>
        <p class="text-lg">Desde ahora podés ayudarle con sus turnos.</p>
        <UButton :to="`/asistiendo/${aceptada}`" color="primary" variant="solid" icon="i-lucide-hand-heart" :label="`Empezar a ayudar a ${invitacion?.nombre}`" class="self-start" />
      </div>

      <div v-else-if="!invitacion" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">No encontramos esta invitación</h1>
        <p class="text-lg">Revisá que el enlace esté completo o pedí uno nuevo.</p>
      </div>

      <div v-else-if="invitacion.estado !== 'pendiente'" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">Esta invitación ya no se puede usar</h1>
        <p class="text-lg">{{ invitacion.estado === 'vencido' ? 'Venció: las invitaciones duran 7 días.' : 'Ya la aceptaron o la quitaron.' }} Pedile a {{ invitacion.nombre }} una nueva.</p>
      </div>

      <div v-else class="flex flex-col gap-8">
        <div class="flex flex-col gap-4">
          <h1 class="text-2xl font-bold">{{ invitacion.nombre }} te invita a acompañarle con sus turnos</h1>
          <div>
            <p class="text-lg font-bold">Vas a poder:</p>
            <ul class="list-disc ps-6 text-lg">
              <li v-for="permiso in permisos" :key="permiso">{{ permiso }}</li>
            </ul>
          </div>
        </div>

        <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />

        <div v-if="!user" class="flex flex-col gap-4">
          <p class="text-lg">Para aceptar, ingresá con <strong>{{ invitacion.email_invitado }}</strong>. Si no tenés cuenta, creala con ese correo.</p>
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UButton :to="{ path: '/ingresar', query: { volver: route.fullPath } }" color="primary" variant="solid" icon="i-lucide-log-in" label="Ingresar" />
            <UButton to="/registrarme" icon="i-lucide-user-plus" label="Crear una cuenta" />
          </div>
        </div>
        <AccionesPaso v-else confirmar="Sí, quiero acompañar" volver="No, gracias" :cargando="enviando" @confirmar="confirmar" @volver="navigateTo('/')" />
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'
import type { Invitacion } from '~/composables/useAcompanamiento'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

useHead({ title: 'Invitación para acompañar' })

const route = useRoute()
const user = useSupabaseUser()
const { verInvitacion, aceptar } = useAcompanamiento()
const { announce, alert } = useAnuncio()
const tituloEl = useTemplateRef<HTMLHeadingElement>('tituloEl')

const invitacion = ref<Invitacion | null>(null)
const estado = ref<EstadoVista>('cargando')
const enviando = ref(false)
const aviso = ref<Aviso>()
const aceptada = ref<string>()

const permisos = computed(() => ALCANCES.filter((a) => invitacion.value?.alcance.includes(a.value)).map((a) => a.paraOtro))

async function cargar() {
  estado.value = 'cargando'
  try {
    invitacion.value = await verInvitacion(String(route.params.token))
    estado.value = 'contenido'
  } catch {
    estado.value = 'error'
  }
}

async function confirmar() {
  enviando.value = true
  aviso.value = undefined
  const r = await aceptar(String(route.params.token))
  enviando.value = false
  if (!r.ok) {
    aviso.value = r.aviso
    alert(`${r.aviso.titulo} ${r.aviso.ayuda}`)
    return
  }
  aceptada.value = r.solicitante
  announce(`Listo. Ya acompañás a ${invitacion.value?.nombre}.`)
  await nextTick()
  tituloEl.value?.focus()
}

onMounted(cargar)
</script>
