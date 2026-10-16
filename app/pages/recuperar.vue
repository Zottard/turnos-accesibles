<!-- Pedir un enlace para crear una contraseña nueva. Siempre responde lo mismo, exista o no la cuenta. -->
<script setup lang="ts">
useSeoMeta({ title: 'Crear una contraseña nueva' })

const route = useRoute()
const { pedirRecuperacion } = useSesion()
const { anunciar } = useAnuncio()

const correo = ref(typeof route.query.correo === 'string' ? route.query.correo : '')
const error = ref<string | undefined>()
const enviado = ref(false)
const enviando = ref(false)

async function enviar() {
  if (enviando.value) {
    return
  }
  error.value = validarCorreo(correo.value)
  if (error.value) {
    document.getElementById('recuperar-correo')?.focus()
    anunciar(error.value)
    return
  }
  enviando.value = true
  await pedirRecuperacion(correo.value)
  enviando.value = false
  enviado.value = true
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1>Crear una contraseña nueva</h1>

    <template v-if="!enviado">
      <p class="pagina__bajada">
        Escribí el correo de tu cuenta. Te mandamos un enlace para que elijas una contraseña nueva.
      </p>
      <form class="tarjeta pila" novalidate @submit.prevent="enviar">
        <Campo
          id="recuperar-correo"
          v-model="correo"
          etiqueta="Correo electrónico"
          type="email"
          autocomplete="email"
          inputmode="email"
          :error="error"
          requerido
        />
        <Boton type="submit" bloque>{{ enviando ? 'Mandando…' : 'Mandarme el enlace' }}</Boton>
      </form>
    </template>

    <template v-else>
      <Aviso tipo="exito" titulo="Revisá tu correo">
        <p>
          Si hay una cuenta con <strong>{{ correo }}</strong>, te mandamos un enlace para crear una
          contraseña nueva.
        </p>
        <p>
          El enlace sirve una sola vez y vence en una hora. Abrilo en este mismo dispositivo. Si no lo
          ves, buscalo en "Correo no deseado".
        </p>
      </Aviso>
      <div class="acciones">
        <Boton to="/ingresar" variante="secundario">Volver a ingresar</Boton>
      </div>
    </template>
  </div>
</template>
