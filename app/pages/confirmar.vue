<!--
  Llega desde el enlace del correo de activación. Si Supabase pudo armar la sesión, la cuenta
  está activa y seguimos. Si no (por ejemplo, se abrió en otro navegador), la cuenta igual
  puede estar activa: le pedimos que ingrese.
-->
<script setup lang="ts">
useSeoMeta({ title: 'Activar la cuenta' })

const route = useRoute()
const { sesionDesdeEnlace } = useSesion()
const { anunciar } = useAnuncio()

const estado = ref<'revisando' | 'activa' | 'sin-sesion'>('revisando')
const vencido = computed(() => route.query.error_code === 'otp_expired' || route.hash.includes('otp_expired'))

onMounted(async () => {
  const conSesion = await sesionDesdeEnlace(route.query.token_hash, 'email')
  estado.value = conSesion ? 'activa' : 'sin-sesion'
  anunciar(conSesion ? 'Tu cuenta está activa.' : 'Ingresá con tu correo y tu contraseña.')
})
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <template v-if="estado === 'activa'">
      <h1>¡Tu cuenta está activa!</h1>
      <Aviso tipo="exito">
        <p>Ya podés usar Turnos Accesibles. Primero vamos a elegir cómo querés ver la página.</p>
      </Aviso>
      <div class="acciones">
        <Boton to="/inicio">Seguir</Boton>
      </div>
    </template>

    <template v-else-if="estado === 'sin-sesion'">
      <h1>Ingresá a tu cuenta</h1>
      <Aviso v-if="vencido" tipo="atencion">
        <p>
          El enlace venció o ya se usó. Probá ingresar: si tu cuenta todavía no está activa, te
          ofrecemos mandarte el correo de nuevo.
        </p>
      </Aviso>
      <p v-else class="pagina__bajada">
        Si ya tocaste el enlace del correo, tu cuenta está activa. Ingresá con tu correo y tu
        contraseña.
      </p>
      <div class="acciones">
        <Boton to="/ingresar">Ingresar</Boton>
      </div>
    </template>

    <template v-else>
      <h1>Activar la cuenta</h1>
      <p class="pagina__bajada">Estamos revisando el enlace…</p>
    </template>
  </div>
</template>
