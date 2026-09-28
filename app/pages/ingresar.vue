<template>
  <div class="max-w-xl flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Ingresá a tu cuenta</h1>

    <UForm method="post" :validate-on="['input']" :schema="SCHEMA_INGRESO" :state="form" class="flex flex-col gap-6" @submit="enviar" @error="alFallar">
      <UFormField label="Tu correo" name="email">
        <UInput v-model="form.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UFormField label="Tu contraseña" name="clave">
        <CampoClave v-model="form.clave" autocomplete="current-password" />
      </UFormField>

      <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />

      <div v-if="motivo === 'sin-confirmar'" class="flex flex-col gap-3">
        <UButton label="Mandarme el correo de nuevo" icon="i-lucide-mail" class="self-start" :loading="reenviando" @click="reenviar" />
        <p v-if="reenviado" class="text-lg">Listo. Te mandamos el correo de nuevo a {{ form.email }}.</p>
      </div>

      <UButton type="submit" color="primary" variant="solid" label="Ingresar" icon="i-lucide-log-in" block class="sm:w-auto sm:self-start" :loading="enviando" />
    </UForm>

    <nav aria-label="Otras opciones" class="flex flex-col gap-2">
      <NuxtLink to="/recuperar-clave" class="inline-flex items-center min-h-12 text-lg underline">Me olvidé la contraseña</NuxtLink>
      <NuxtLink to="/registrarme" class="inline-flex items-center min-h-12 text-lg underline">Todavía no tengo cuenta. Quiero crear una.</NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'

definePageMeta({ middleware: 'invitado' })
useHead({ title: 'Ingresar' })

const route = useRoute()
const { ingresar, reenviarConfirmacion } = useSesion()
const { alFallar } = useFormulario()
const { alert, announce } = useAnuncio()

const form = reactive({ email: '', clave: '' })
const enviando = ref(false)
const aviso = ref<Aviso>()
const motivo = ref<string>()
const reenviando = ref(false)
const reenviado = ref(false)

async function enviar() {
  enviando.value = true
  aviso.value = undefined
  reenviado.value = false
  const resultado = await ingresar(form.email.trim(), form.clave)
  enviando.value = false

  if (resultado.ok) {
    announce('Ingresaste a tu cuenta.')
    return navigateTo(rutaSegura(route.query.volver))
  }

  aviso.value = resultado.aviso
  motivo.value = resultado.motivo
  alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
}

async function reenviar() {
  reenviando.value = true
  const resultado = await reenviarConfirmacion(form.email.trim())
  reenviando.value = false
  if (resultado.ok) {
    reenviado.value = true
    announce(`Listo. Te mandamos el correo de nuevo a ${form.email}.`)
  } else {
    aviso.value = resultado.aviso
    alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
  }
}
</script>
