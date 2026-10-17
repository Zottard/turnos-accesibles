<!--
  Constancia de un permiso (RF-07): quién autorizó a quién, qué puede hacer y cuándo se autorizó,
  se aceptó y se quitó. Se puede imprimir o guardar como PDF.
  Si el permiso está vigente: "Quitar el permiso" (o "Cancelar la invitación" si no la aceptó),
  con una confirmación. Es inmediato: desde ese momento no puede ver ni hacer nada.
  Si la invitación está pendiente, se puede volver a mandar el enlace.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { cargarUno, revocar } = useAcompanantes()
const { cargarPerfil } = usePerfil()
const { anunciar } = useAnuncio()

const id = String(route.params.id)
const { data: cargado, refresh } = await useAsyncData(`acompanante-${id}`, () => cargarUno(id))
const { data: perfil } = await useAsyncData('perfil-constancia', async () => (await cargarPerfil()).datos)

const fila = computed(() => cargado.value?.datos ?? null)
const miNombre = computed(() => [perfil.value?.nombre, perfil.value?.apellido].filter(Boolean).join(' ') || 'Vos')

const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos traer la constancia'
  if (!fila.value) return 'No encontramos este permiso'
  return `Permiso para ${fila.value.nombreInvitado}`
})
useSeoMeta({ title: titulo })

const confirmando = ref(false)
const quitando = ref(false)
const errorQuitar = ref('')
const tituloRef = ref<HTMLElement | null>(null)

async function pedirConfirmacion() {
  confirmando.value = true
  await nextTick()
  document.getElementById('confirmar-quitar')?.focus()
}

async function noQuitar() {
  confirmando.value = false
  await nextTick()
  document.getElementById('boton-quitar')?.focus()
}

async function quitar() {
  if (!fila.value || quitando.value) return
  quitando.value = true
  errorQuitar.value = ''
  const respuesta = await revocar(fila.value.id)
  quitando.value = false
  if (respuesta.ok) {
    await navigateTo({ path: '/acompanantes', query: { revocado: fila.value.id } })
    return
  }
  errorQuitar.value = respuesta.mensaje
  anunciar(respuesta.mensaje, true)
}

function imprimir() {
  window.print()
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <p class="no-imprimir">
      <NuxtLink to="/acompanantes"><span aria-hidden="true">←</span> Volver a Personas que te ayudan</NuxtLink>
    </p>
    <h1 ref="tituloRef" tabindex="-1">{{ titulo }}</h1>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton @click="refresh()">Probar de nuevo</Boton>
      </div>
    </template>

    <template v-else-if="!fila">
      <p class="pagina__bajada">Solo podés ver los permisos que diste vos.</p>
    </template>

    <template v-else>
      <EstadoAcompanamiento :estado="fila.estado" />

      <section class="tarjeta pila" aria-labelledby="titulo-constancia">
        <h2 id="titulo-constancia">Constancia</h2>
        <p class="constancia__frase">
          {{ miNombre }} autorizó a {{ fila.nombreInvitado }} a {{ alcanceEnPalabras(fila.alcance, 'ajeno') }}.
        </p>
        <dl class="datos">
          <div>
            <dt>Quién autoriza</dt>
            <dd>{{ miNombre }}</dd>
          </div>
          <div>
            <dt>A quién</dt>
            <dd>{{ fila.nombreInvitado }} ({{ fila.correoInvitado }})</dd>
          </div>
          <div>
            <dt>Qué puede hacer</dt>
            <dd>
              <ul>
                <li v-for="accion in fila.alcance" :key="accion">{{ TEXTOS_ALCANCE[accion].titulo }}</li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>Autorizado el</dt>
            <dd>{{ momentoEnPalabras(fila.consentidoEn) }}</dd>
          </div>
          <div v-if="fila.aceptadoEn">
            <dt>Aceptado el</dt>
            <dd>{{ momentoEnPalabras(fila.aceptadoEn) }}</dd>
          </div>
          <div v-else-if="fila.estado === 'pendiente' || fila.estado === 'vencido'">
            <dt>La invitación vence (o venció) el</dt>
            <dd>{{ momentoEnPalabras(fila.venceEn) }}</dd>
          </div>
          <div v-if="fila.revocadoEn">
            <dt>{{ fila.aceptadoEn ? 'Permiso quitado el' : 'Invitación cancelada el' }}</dt>
            <dd>{{ momentoEnPalabras(fila.revocadoEn) }}</dd>
          </div>
        </dl>
        <p class="texto-suave">
          {{ fila.nombreInvitado }} solo ve tus turnos: nunca tu documento, tu teléfono, tu fecha de nacimiento
          ni datos de tu salud.
        </p>
      </section>

      <div class="acciones no-imprimir">
        <Boton variante="secundario" @click="imprimir">
          <span aria-hidden="true">🖨️</span>
          Imprimir o guardar como PDF
        </Boton>
      </div>

      <section v-if="fila.estado === 'pendiente'" class="tarjeta pila no-imprimir" aria-labelledby="titulo-enlace">
        <h2 id="titulo-enlace">Todavía no aceptó</h2>
        <p>Si no le llegó, mandale el enlace de nuevo.</p>
        <CompartirInvitacion :token="fila.token" :nombre-quien-invita="perfil?.nombre ?? ''" />
      </section>

      <section v-if="esVigente(fila.estado)" class="pila no-imprimir" aria-labelledby="titulo-quitar">
        <h2 id="titulo-quitar">{{ fila.estado === 'activo' ? '¿Ya no querés que te ayude?' : '¿Ya no querés mandarle la invitación?' }}</h2>
        <div v-if="!confirmando">
          <Boton id="boton-quitar" variante="peligro" @click="pedirConfirmacion">
            {{ fila.estado === 'activo' ? 'Quitar el permiso' : 'Cancelar la invitación' }}
          </Boton>
        </div>
        <div v-else id="confirmar-quitar" class="pila" tabindex="-1">
          <Aviso tipo="atencion" :titulo="fila.estado === 'activo' ? `¿Le quitás el permiso a ${fila.nombreInvitado}?` : '¿Cancelás la invitación?'">
            <p v-if="fila.estado === 'activo'">
              Desde ese momento no va a poder ver tus turnos ni hacer nada con ellos. Le vamos a avisar.
              Si después cambiás de idea, la podés invitar de nuevo.
            </p>
            <p v-else>El enlace que le mandaste deja de servir.</p>
          </Aviso>
          <Aviso v-if="errorQuitar" tipo="error">
            <p>{{ errorQuitar }}</p>
          </Aviso>
          <div class="acciones">
            <Boton variante="peligro" @click="quitar">
              {{ quitando ? 'Guardando…' : fila.estado === 'activo' ? 'Sí, quitar el permiso' : 'Sí, cancelar la invitación' }}
            </Boton>
            <Boton variante="secundario" @click="noQuitar">No, volver</Boton>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.constancia__frase {
  font-family: var(--fuente-titulos);
  font-size: 1.15rem;
  font-weight: 600;
}

.datos {
  display: grid;
  gap: var(--espacio-2);
  margin: 0;
}

.datos dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.datos dd {
  margin: 0;
}
</style>
