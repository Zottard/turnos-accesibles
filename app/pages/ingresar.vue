<script setup lang="ts">
definePageMeta({ middleware: 'invitado' })
useSeoMeta({ title: 'Ingresar' })

const route = useRoute()
const { ingresar, reenviarConfirmacion } = useSesion()
const { anunciar } = useAnuncio()

const correo = ref(typeof route.query.correo === 'string' ? route.query.correo : '')
const clave = ref('')
const errores = ref<{ correo?: string; clave?: string }>({})
const resultado = ref<{ mensaje: string; ofrecerRecuperar?: boolean; ofrecerReenvio?: boolean } | null>(null)
const reenviado = ref(false)
const enviando = ref(false)

const listaErrores = computed(() => {
  const lista: { id: string; mensaje: string }[] = []
  if (errores.value.correo) lista.push({ id: 'ingreso-correo', mensaje: errores.value.correo })
  if (errores.value.clave) lista.push({ id: 'ingreso-clave', mensaje: errores.value.clave })
  return lista
})

async function enviar() {
  if (enviando.value) {
    return
  }
  resultado.value = null
  reenviado.value = false
  errores.value = {
    correo: validarCorreo(correo.value),
    clave: clave.value === '' ? 'Escribí tu contraseña.' : undefined,
  }
  const primero = listaErrores.value[0]
  if (primero) {
    document.getElementById(primero.id)?.focus()
    return
  }

  enviando.value = true
  anunciar('Revisando tus datos…')
  const respuesta = await ingresar(correo.value, clave.value)
  enviando.value = false

  if (respuesta.ok) {
    anunciar('Ingresaste a tu cuenta.')
    await navigateTo(rutaSegura(route.query.volver))
    return
  }
  resultado.value = respuesta
  clave.value = ''
}

async function reenviar() {
  const respuesta = await reenviarConfirmacion(correo.value)
  if (respuesta.ok) {
    reenviado.value = true
    anunciar('Te mandamos el correo de nuevo.')
  } else {
    resultado.value = respuesta
  }
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1>Ingresar</h1>
    <p class="pagina__bajada">Escribí el correo y la contraseña de tu cuenta.</p>

    <ResumenErrores :errores="listaErrores" />

    <Aviso v-if="resultado" tipo="error">
      <p>{{ resultado.mensaje }}</p>
      <p v-if="resultado.ofrecerRecuperar">
        <NuxtLink :to="{ path: '/recuperar', query: { correo } }">Crear una contraseña nueva</NuxtLink>
      </p>
      <p v-if="resultado.ofrecerReenvio && !reenviado">
        <button type="button" class="boton boton--texto enlace-boton" @click="reenviar">
          Mandarme el correo de nuevo
        </button>
      </p>
    </Aviso>
    <Aviso v-if="reenviado" tipo="exito">
      <p>Te mandamos el correo de nuevo. Buscalo también en "Correo no deseado".</p>
    </Aviso>

    <form class="tarjeta pila" novalidate @submit.prevent="enviar">
      <Campo
        id="ingreso-correo"
        v-model="correo"
        etiqueta="Correo electrónico"
        type="email"
        autocomplete="email"
        inputmode="email"
        :error="errores.correo"
        requerido
      />
      <CampoClave
        id="ingreso-clave"
        v-model="clave"
        autocomplete="current-password"
        :error="errores.clave"
      />
      <Boton type="submit" bloque>{{ enviando ? 'Ingresando…' : 'Ingresar' }}</Boton>
    </form>

    <ul class="enlaces">
      <li><NuxtLink :to="{ path: '/recuperar', query: { correo } }">Me olvidé la contraseña</NuxtLink></li>
      <li>¿No tenés cuenta? <NuxtLink to="/registrarme">Creá una cuenta</NuxtLink></li>
    </ul>
  </div>
</template>

<style scoped>
.enlaces {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.enlace-boton {
  padding-inline: 0;
}
</style>
