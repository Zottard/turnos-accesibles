<!--
  Invitación a ser acompañante (RF-07). Es pública: la abre quien recibió el enlace, con o sin cuenta.
  Muestra en palabras simples quién invita y qué va a poder hacer. Para aceptar hay que ingresar con
  el correo invitado (si no, se explica). Para decir que no alcanza con el enlace.
  La base solo deja ver el nombre de quien invita y el alcance: nada de sus datos ni de sus turnos.
-->
<script setup lang="ts">
const route = useRoute()
const { verInvitacion, aceptar, rechazar } = useAcompanantes()
const { conSesion, usuario, salir } = useSesion()
const { empezar, cargarPersonas } = useAyuda()
const { anunciar } = useAnuncio()

const token = String(route.params.token)
const { data: cargado, refresh } = await useAsyncData(`invitacion-${token}`, () => verInvitacion(token))
const invitacion = computed(() => cargado.value?.datos ?? null)
const nombre = computed(() => invitacion.value?.nombre || 'Una persona')

// Lo que pasó al responder: aceptada, rechazada o un problema.
const resultado = ref<{
  tipo: 'aceptada' | 'rechazada' | 'error'
  mensaje: string
  motivo?: string
  solicitanteId?: string
} | null>(null)
const enviando = ref(false)
const tituloRef = ref<HTMLElement | null>(null)

const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos abrir la invitación'
  if (!invitacion.value) return 'No encontramos esta invitación'
  if (resultado.value?.tipo === 'aceptada') return `Ahora acompañás a ${nombre.value}`
  if (resultado.value?.tipo === 'rechazada') return 'Listo, no aceptaste la invitación'
  switch (invitacion.value.estado) {
    case 'pendiente':
      return `${nombre.value} te invita a ser su acompañante`
    case 'vencido':
      return 'Esta invitación venció'
    case 'activo':
      return 'Esta invitación ya se aceptó'
    default:
      return 'Esta invitación ya no está vigente'
  }
})
useSeoMeta({ title: titulo })

const volver = computed(() => `/invitacion/${token}`)
const miCorreo = computed(() => (typeof usuario.value?.email === 'string' ? usuario.value.email : ''))

async function mostrarResultado(nuevo: NonNullable<typeof resultado.value>) {
  resultado.value = nuevo
  await nextTick()
  tituloRef.value?.focus()
  anunciar(`${titulo.value}. ${nuevo.mensaje}`, nuevo.tipo === 'error')
}

async function siAcepto() {
  if (enviando.value) return
  enviando.value = true
  const respuesta = await aceptar(token, nombre.value)
  enviando.value = false
  if (!respuesta.ok) {
    await mostrarResultado({ tipo: 'error', mensaje: respuesta.mensaje, motivo: respuesta.motivo })
    return
  }
  await mostrarResultado({
    tipo: 'aceptada',
    solicitanteId: respuesta.solicitanteId,
    mensaje: `Ya podés ${alcanceEnPalabras(invitacion.value?.alcance ?? ['ver'], 'ajeno')}.`,
  })
}

async function noAcepto() {
  if (enviando.value) return
  enviando.value = true
  const respuesta = await rechazar(token, nombre.value)
  enviando.value = false
  if (!respuesta.ok) {
    await mostrarResultado({ tipo: 'error', mensaje: respuesta.mensaje, motivo: respuesta.motivo })
    return
  }
  await mostrarResultado({ tipo: 'rechazada', mensaje: `Le avisamos a ${nombre.value}. No pasa nada.` })
}

// Después de aceptar: entrar directo a ayudar a esa persona.
async function verSusTurnos() {
  const { datos } = await cargarPersonas()
  const persona = datos?.find((item) => item.id === resultado.value?.solicitanteId)
  if (persona) empezar(persona)
  await navigateTo(persona ? '/mis-turnos' : '/inicio')
}

async function salirParaCambiarDeCuenta() {
  await salir()
  await navigateTo({ path: '/ingresar', query: { volver: volver.value } })
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1 ref="tituloRef" tabindex="-1">{{ titulo }}</h1>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton @click="refresh()">Probar de nuevo</Boton>
      </div>
    </template>

    <template v-else-if="!invitacion">
      <p class="pagina__bajada">{{ mensajeAcompanamiento('no_existe') }}</p>
      <div>
        <Boton to="/">Ir al inicio</Boton>
      </div>
    </template>

    <!-- Ya respondió -->
    <template v-else-if="resultado?.tipo === 'aceptada'">
      <Aviso tipo="exito" titulo="¡Listo!">
        <p>{{ resultado.mensaje }} {{ nombre }} te puede quitar el permiso cuando quiera.</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="verSusTurnos">Ver los turnos de {{ nombre }}</Boton>
        <Boton to="/inicio" variante="secundario">Ir a mi inicio</Boton>
      </div>
    </template>

    <template v-else-if="resultado?.tipo === 'rechazada'">
      <p class="pagina__bajada">{{ resultado.mensaje }}</p>
      <div>
        <Boton to="/">Ir al inicio</Boton>
      </div>
    </template>

    <template v-else-if="invitacion.estado !== 'pendiente'">
      <p class="pagina__bajada">
        {{ mensajeAcompanamiento(invitacion.estado === 'vencido' ? 'vencida' : 'no_vigente', nombre) }}
      </p>
      <div>
        <Boton :to="conSesion ? '/inicio' : '/'">Ir al inicio</Boton>
      </div>
    </template>

    <!-- Pendiente: lo que va a poder hacer y cómo responder -->
    <template v-else>
      <section class="tarjeta pila" aria-labelledby="titulo-que">
        <p v-if="invitacion.nombreInvitado">Hola, {{ invitacion.nombreInvitado }}.</p>
        <p>{{ nombre }} quiere que le des una mano con sus turnos de salud.</p>
        <h2 id="titulo-que">Si aceptás, vas a poder:</h2>
        <ul class="puede">
          <li v-for="accion in invitacion.alcance" :key="accion">
            <span aria-hidden="true">✓</span> {{ conMayuscula(TEXTOS_ALCANCE[accion].ajeno) }}
          </li>
        </ul>
        <p class="texto-suave">
          Nada más: no vas a ver su documento, su teléfono ni datos de su salud. {{ nombre }} te puede quitar el
          permiso cuando quiera.
        </p>
        <p class="texto-suave">La invitación vence el {{ momentoEnPalabras(invitacion.venceEn) }}.</p>
      </section>

      <Aviso v-if="resultado?.tipo === 'error'" :tipo="resultado.motivo === 'otro_correo' ? 'atencion' : 'error'">
        <p>{{ resultado.mensaje }}</p>
        <p v-if="resultado.motivo === 'otro_correo' && miCorreo">Ahora ingresaste como {{ miCorreo }}.</p>
        <div v-if="resultado.motivo === 'otro_correo'" class="acciones aviso-acciones">
          <Boton variante="secundario" @click="salirParaCambiarDeCuenta">Salir e ingresar con otro correo</Boton>
        </div>
      </Aviso>

      <template v-if="conSesion">
        <div class="acciones">
          <Boton @click="siAcepto">{{ enviando ? 'Guardando…' : 'Sí, acepto' }}</Boton>
          <Boton variante="secundario" @click="noAcepto">No, gracias</Boton>
        </div>
      </template>
      <template v-else>
        <Aviso tipo="info" titulo="Para aceptar, ingresá con tu cuenta">
          <p>Usá el correo al que te llegó la invitación.</p>
          <p>Si no tenés cuenta, creala con ese mismo correo. Cuando la actives, volvé a abrir este enlace.</p>
        </Aviso>
        <div class="acciones">
          <Boton :to="`/ingresar?volver=${encodeURIComponent(volver)}`">Ingresar</Boton>
          <Boton to="/registrarme" variante="secundario">Crear una cuenta</Boton>
        </div>
        <p>
          <button type="button" class="boton boton--texto enlace-boton" @click="noAcepto">No quiero aceptar la invitación</button>
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.puede {
  display: grid;
  gap: var(--espacio-2);
  padding: 0;
  list-style: none;
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.aviso-acciones {
  margin-block: var(--espacio-3) var(--espacio-2);
}

.enlace-boton {
  padding-inline: 0;
}
</style>
