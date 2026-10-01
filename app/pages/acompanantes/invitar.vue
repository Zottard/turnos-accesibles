<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <div v-if="token" class="flex flex-col gap-6">
      <h1 ref="tituloEl" tabindex="-1" class="text-2xl font-bold">Listo. Ya podés mandar la invitación.</h1>
      <p class="text-lg">Mandale este enlace a <strong>{{ form.email }}</strong>. Tiene que abrirlo e ingresar con ese correo. El enlace dura 7 días.</p>
      <UFormField label="Enlace de invitación" name="enlace">
        <UInput id="invitar-enlace" :model-value="enlace" readonly class="w-full" />
      </UFormField>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <UButton color="primary" variant="solid" icon="i-lucide-copy" label="Copiar el enlace" @click="copiar" />
        <UButton v-if="puedeCompartir" icon="i-lucide-share-2" label="Compartir" @click="compartir" />
        <UButton to="/acompanantes" icon="i-lucide-arrow-left" label="Volver a mis acompañantes" />
      </div>
    </div>

    <template v-else>
      <div class="flex flex-col gap-3">
        <h1 class="text-2xl font-bold">Invitar a alguien que te ayude</h1>
        <p class="text-lg">Elegí qué va a poder hacer. Siempre va a poder ver tus turnos.</p>
      </div>

      <UForm method="post" :validate-on="['input']" :schema="SCHEMA_INVITACION" :state="form" class="flex flex-col gap-6" @submit="enviar" @error="alFallar">
        <UFormField label="El correo de la persona" name="email" description="Por ejemplo: hija@gmail.com">
          <UInput id="invitar-email" v-model="form.email" type="email" autocomplete="off" class="w-full" />
        </UFormField>

        <fieldset class="min-w-0 flex flex-col gap-3">
          <legend class="text-lg font-bold mb-3">¿Qué va a poder hacer?</legend>
          <UCheckbox id="invitar-ver" :model-value="true" disabled label="Ver tus turnos" description="Siempre incluido." />
          <UCheckbox id="invitar-reservar" v-model="form.reservar" label="Sacar turnos por vos" />
          <UCheckbox id="invitar-cancelar" v-model="form.cancelar" label="Cancelar o cambiar tus turnos" />
        </fieldset>

        <p class="text-lg">Al invitarla, das tu permiso para que haga esto en tu nombre. Lo podés quitar cuando quieras.</p>

        <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />

        <AccionesPaso submit confirmar="Sí, crear la invitación" :cargando="enviando" @volver="navigateTo('/acompanantes')" />
      </UForm>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'
import type { Accion } from '~/composables/useAcompanamiento'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Invitar a alguien' })

const { invitar, enlaceInvitacion } = useAcompanamiento()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()
const tituloEl = useTemplateRef<HTMLHeadingElement>('tituloEl')

const form = reactive({ email: '', reservar: true, cancelar: false })
const enviando = ref(false)
const aviso = ref<Aviso>()
const token = ref<string>()
const puedeCompartir = useSupported(() => 'share' in navigator)

const enlace = computed(() => (token.value ? enlaceInvitacion(token.value) : ''))

async function enviar() {
  enviando.value = true
  aviso.value = undefined
  const alcance: Accion[] = ['ver', ...(form.reservar ? ['reservar' as const] : []), ...(form.cancelar ? ['cancelar' as const] : [])]
  const r = await invitar(form.email.trim(), alcance)
  enviando.value = false
  if (!r.ok) {
    aviso.value = r.aviso
    alert(`${r.aviso.titulo} ${r.aviso.ayuda}`)
    return
  }
  token.value = r.token
  announce('Listo. Ya podés mandar la invitación.')
  await nextTick()
  tituloEl.value?.focus()
}

async function copiar() {
  await navigator.clipboard.writeText(enlace.value).catch(() => undefined)
  announce('Copiamos el enlace. Mandáselo por WhatsApp o por correo.')
}

function compartir() {
  navigator.share({ title: 'Turnos Accesibles', text: 'Te invito a acompañarme con mis turnos médicos.', url: enlace.value }).catch(() => undefined)
}
</script>
