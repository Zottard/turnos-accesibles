<template>
  <div class="max-w-xl flex flex-col gap-8">
    <h1 class="text-2xl font-bold">Crear una contraseña nueva</h1>

    <div v-if="enviado" class="flex flex-col gap-6">
      <p class="text-lg">
        Si <strong>{{ form.email }}</strong> tiene una cuenta, te mandamos un correo con un enlace.
        Abrilo y tocá el botón para crear tu contraseña nueva.
      </p>
      <p class="text-lg">¿No te llegó? Fijate en la carpeta de correo no deseado o spam.</p>
      <UButton to="/ingresar" label="Volver a ingresar" icon="i-lucide-arrow-left" class="self-start" />
    </div>

    <UForm v-else method="post" :validate-on="['input']" :schema="SCHEMA_CORREO" :state="form" class="flex flex-col gap-6" @submit="enviar" @error="alFallar">
      <p class="text-lg">Escribí el correo de tu cuenta. Te vamos a mandar un enlace para que elijas una contraseña nueva.</p>
      <UFormField label="Tu correo" name="email">
        <UInput id="recuperar-email" v-model="form.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UAlert v-if="aviso" color="error" icon="i-lucide-circle-x" :title="aviso.titulo" :description="aviso.ayuda" />
      <AccionesPaso submit confirmar="Mandarme el enlace" :cargando="enviando" @volver="navigateTo('/ingresar')" />
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type { Aviso } from '~/composables/useSesion'

useHead({ title: 'Crear una contraseña nueva' })

const { pedirNuevaClave } = useSesion()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()

const form = reactive({ email: '' })
const enviando = ref(false)
const enviado = ref(false)
const aviso = ref<Aviso>()

async function enviar() {
  enviando.value = true
  aviso.value = undefined
  const resultado = await pedirNuevaClave(form.email.trim())
  enviando.value = false
  if (resultado.ok) {
    enviado.value = true
    announce('Listo. Si el correo tiene una cuenta, te mandamos un enlace.')
  } else {
    aviso.value = resultado.aviso
    alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
  }
}
</script>
