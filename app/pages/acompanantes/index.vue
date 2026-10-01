<template>
  <div class="max-w-3xl flex flex-col gap-10">
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Mis acompañantes</h1>
      <p class="text-lg">Un acompañante es alguien de confianza que te ayuda con tus turnos desde su teléfono o computadora. Vos elegís qué puede hacer y se lo podés quitar cuando quieras.</p>
      <UButton to="/acompanantes/invitar" color="primary" variant="solid" icon="i-lucide-user-plus" label="Invitar a alguien" class="self-start" />
    </div>

    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando tus acompañantes. Esperá un momento."
      error-titulo="No pudimos mostrar tus acompañantes."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar()"
    >
      <div class="flex flex-col gap-10">
        <section aria-labelledby="titulo-me-ayudan" class="flex flex-col gap-4">
          <h2 id="titulo-me-ayudan" class="text-xl font-bold">Quiénes te ayudan</h2>
          <p v-if="!acompanantes.length" class="text-lg">Todavía no invitaste a nadie.</p>
          <ul v-else class="flex flex-col gap-4">
            <li v-for="a in acompanantes" :key="a.id">
              <article :aria-labelledby="`acomp-${a.id}`" class="flex flex-col gap-3 border-2 border-default rounded-md p-4 sm:p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <h3 :id="`acomp-${a.id}`" class="min-w-0 text-lg font-bold">{{ a.nombre ?? a.email_invitado }}</h3>
                  <UBadge
                    :color="a.estado === 'activo' ? 'success' : 'warning'"
                    :icon="a.estado === 'activo' ? 'i-lucide-user-check' : 'i-lucide-hourglass'"
                    :label="a.estado === 'activo' ? 'Te acompaña' : a.vencida ? 'La invitación venció' : 'Todavía no aceptó'"
                  />
                </div>
                <p v-if="a.nombre" class="text-muted">{{ a.email_invitado }}</p>
                <div>
                  <p class="font-bold">Puede:</p>
                  <ul class="list-disc ps-6">
                    <li v-for="permiso in textosAlcance(a.alcance)" :key="permiso">{{ permiso }}</li>
                  </ul>
                </div>
                <div v-if="quitando === a.id" class="flex flex-col gap-3 border-t-2 border-default pt-3">
                  <p class="text-lg">¿Seguro? {{ a.nombre ?? a.email_invitado }} ya no va a poder ayudarte con tus turnos.</p>
                  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <UButton color="error" variant="solid" icon="i-lucide-user-x" label="Sí, quitar" @click="quitar(a.id, a.nombre ?? a.email_invitado)" />
                    <UButton icon="i-lucide-arrow-left" label="No, dejarlo" @click="quitando = undefined" />
                  </div>
                </div>
                <div v-else class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <UButton v-if="a.estado === 'pendiente' && !a.vencida" size="lg" icon="i-lucide-copy" label="Copiar el enlace de invitación" :aria-describedby="`acomp-${a.id}`" @click="copiar(a.token_invitacion)" />
                  <UButton size="lg" color="error" variant="outline" icon="i-lucide-user-x" :label="a.estado === 'activo' ? 'Quitar' : 'Cancelar la invitación'" :aria-describedby="`acomp-${a.id}`" @click="quitando = a.id" />
                </div>
              </article>
            </li>
          </ul>
        </section>

        <section v-if="ayudo.length" aria-labelledby="titulo-ayudo" class="flex flex-col gap-4">
          <h2 id="titulo-ayudo" class="text-xl font-bold">A quiénes ayudás vos</h2>
          <ul class="flex flex-col gap-3">
            <li v-for="p in ayudo" :key="p.id">
              <UButton :to="`/asistiendo/${p.id}`" block class="justify-start" icon="i-lucide-hand-heart" :label="`Ayudar a ${p.nombre}`" />
            </li>
          </ul>
        </section>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Accion, Asistiendo } from '~/composables/useAcompanamiento'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mis acompañantes' })

const { misAcompanantes, aQuienesAyudo, revocar, enlaceInvitacion } = useAcompanamiento()
const { announce, alert } = useAnuncio()

const acompanantes = ref<Awaited<ReturnType<typeof misAcompanantes>>>([])
const ayudo = ref<Asistiendo[]>([])
const estado = ref<EstadoVista>('cargando')
const quitando = ref<string>()

const textosAlcance = (alcance: Accion[]) => ALCANCES.filter((a) => alcance.includes(a.value)).map((a) => a.paraVos)

async function cargar(silencioso = false) {
  if (!silencioso) estado.value = 'cargando'
  try {
    ;[acompanantes.value, ayudo.value] = await Promise.all([misAcompanantes(), aQuienesAyudo()])
    estado.value = 'contenido'
  } catch {
    estado.value = 'error'
  }
}

async function copiar(token: string) {
  await navigator.clipboard.writeText(enlaceInvitacion(token)).catch(() => undefined)
  announce('Copiamos el enlace. Mandáselo por WhatsApp o por correo.')
}

async function quitar(id: string, nombre: string) {
  if (await revocar(id)) {
    quitando.value = undefined
    await cargar(true)
    announce(`Listo. ${nombre} ya no te acompaña.`)
  } else {
    alert('No pudimos quitar el permiso. Revisá tu conexión a internet y probá de nuevo.')
  }
}

onMounted(() => cargar())
</script>
