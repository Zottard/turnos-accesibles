<!--
  Llega desde el enlace del correo de recuperación. Supabase arma una sesión con ese enlace;
  si no hay sesión, el enlace venció, ya se usó o se abrió en otro navegador.
-->
<script setup lang="ts">
useSeoMeta({ title: 'Elegí tu contraseña nueva' })

const route = useRoute()
const { sesionDesdeEnlace, cambiarClave } = useSesion()
const { anunciar } = useAnuncio()

const estado = ref<'revisando' | 'formulario' | 'vencido' | 'listo'>('revisando')
const clave = ref('')
const error = ref<string | undefined>()
const resultado = ref<string | null>(null)
const enviando = ref(false)

onMounted(async () => {
  const conSesion = await sesionDesdeEnlace(route.query.token_hash, 'recovery')
  estado.value = conSesion ? 'formulario' : 'vencido'
  anunciar(conSesion ? 'Escribí tu contraseña nueva.' : 'El enlace ya no sirve. Pedí uno nuevo.')
})

async function guardar() {
  if (enviando.value) {
    return
  }
  resultado.value = null
  error.value = validarClave(clave.value)
  if (error.value) {
    document.getElementById('nueva-clave')?.focus()
    anunciar(error.value)
    return
  }
  enviando.value = true
  const respuesta = await cambiarClave(clave.value)
  enviando.value = false
  if (!respuesta.ok) {
    resultado.value = respuesta.mensaje
    return
  }
  clave.value = ''
  estado.value = 'listo'
  anunciar('Listo. Cambiamos tu contraseña.')
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <template v-if="estado === 'vencido'">
      <h1>El enlace ya no sirve</h1>
      <p class="pagina__bajada">
        Puede que haya vencido, que ya lo hayas usado o que lo hayas abierto en otro navegador.
        No pasa nada: pedí uno nuevo y abrilo en este mismo dispositivo.
      </p>
      <div class="acciones">
        <Boton to="/recuperar">Pedir un enlace nuevo</Boton>
      </div>
    </template>

    <template v-else-if="estado === 'listo'">
      <h1>Listo, cambiamos tu contraseña</h1>
      <Aviso tipo="exito">
        <p>La próxima vez que ingreses, usá la contraseña nueva.</p>
      </Aviso>
      <div class="acciones">
        <Boton to="/inicio">Ir a mi inicio</Boton>
      </div>
    </template>

    <template v-else>
      <h1>Elegí tu contraseña nueva</h1>
      <p v-if="estado === 'revisando'" class="pagina__bajada">Estamos revisando el enlace…</p>
      <template v-else>
        <Aviso v-if="resultado" tipo="error">
          <p>{{ resultado }}</p>
        </Aviso>
        <form class="tarjeta pila" novalidate @submit.prevent="guardar">
          <CampoClave
            id="nueva-clave"
            v-model="clave"
            etiqueta="Contraseña nueva"
            autocomplete="new-password"
            ayuda="Como mínimo 8 letras o números, con al menos un número."
            :error="error"
          />
          <Boton type="submit" bloque>{{ enviando ? 'Guardando…' : 'Guardar la contraseña' }}</Boton>
        </form>
      </template>
    </template>
  </div>
</template>
