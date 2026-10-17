<!--
  Alguien sin rol de administrador quiso entrar al panel (RF-09): se lo explicamos sin culparlo y
  dejamos registrado el intento en la auditoría (una sola vez, desde el navegador).
  Responde 403 (sin permiso) también cuando la arma el servidor.
-->
<script setup lang="ts">
useSeoMeta({ title: 'Solo para administradores' })

const route = useRoute()
const { conSesion } = useSesion()
const { registrarAccesoDenegado } = useAdmin()

const evento = useRequestEvent()
if (evento) setResponseStatus(evento, 403)

// La página del panel que quiso abrir (solo rutas del panel).
const ruta = computed(() => {
  const pedida = typeof route.query.ruta === 'string' ? route.query.ruta : ''
  return pedida.startsWith('/admin') ? pedida.slice(0, 120) : '/admin'
})

onMounted(() => {
  if (conSesion.value) registrarAccesoDenegado(ruta.value)
})
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1>Esta parte es solo para administradores</h1>
    <p class="pagina__bajada">
      Tu cuenta no tiene permiso para entrar al panel de administración. No hiciste nada mal.
    </p>
    <Aviso tipo="info" titulo="Qué pasó">
      <p>
        El panel sirve para cargar centros de salud, especialidades y turnos. Lo usa solo el equipo que
        administra Turnos Accesibles. Por seguridad, dejamos anotado que alguien quiso entrar.
      </p>
    </Aviso>
    <div class="acciones">
      <Boton v-if="conSesion" to="/inicio">Volver a mi inicio</Boton>
      <template v-else>
        <Boton :to="`/ingresar?volver=${encodeURIComponent(ruta)}`">Ingresar con otra cuenta</Boton>
        <Boton to="/" variante="secundario">Ir al inicio</Boton>
      </template>
    </div>
  </div>
</template>
