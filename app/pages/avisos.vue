<!--
  Bandeja de avisos (RF-06): primero los sin leer. Cada aviso dice qué pasó en lenguaje simple y,
  si es de un turno, cuándo, dónde, qué llevar y cómo llegar. Se marcan como leídos de a uno o todos.
  El historial de cada aviso dice cuándo se envió, cuándo lo mostró la app y cuándo se leyó.
  ?aviso=<id> viene de "Ver aviso" en la banda: lo marca leído y lleva el foco ahí.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Avisos' })

const route = useRoute()
const { cargarBandeja, marcarLeidos, marcarEntregados, revisar } = useAvisos()
const { cargarPersonas, empezar } = useAyuda()
const { anunciar } = useAnuncio()

const { data: cargado, refresh } = await useAsyncData('avisos', () => cargarBandeja())
const avisos = computed(() => cargado.value?.datos ?? [])
const sinLeer = computed(() => avisos.value.filter((aviso) => aviso.leidaEn === null))
const resultado = ref('')

function textoDe(aviso: Notificacion) {
  return textoAviso(aviso)
}

async function marcar(lista: Notificacion[], mensaje: string) {
  const ok = await marcarLeidos(lista)
  resultado.value = ok ? mensaje : 'No pudimos marcarlo. Revisá tu conexión a internet y probá de nuevo.'
  anunciar(resultado.value, !ok)
}

async function marcarUno(aviso: Notificacion) {
  await marcar([aviso], 'Lo marcamos como leído.')
  // El foco no se pierde: va al título del aviso.
  await nextTick()
  document.getElementById(`aviso-${aviso.id}`)?.focus()
}

// "Ver los turnos de Rosa" (copia de un aviso de la persona que acompaño).
const errorAyuda = ref('')
async function verTurnosDe(aviso: Notificacion) {
  errorAyuda.value = ''
  const { datos } = await cargarPersonas()
  const persona = datos?.find((item) => item.id === aviso.solicitanteId)
  if (!persona) {
    errorAyuda.value = `${aviso.datos.para || 'Esa persona'} ya no comparte sus turnos con vos.`
    anunciar(errorAyuda.value, true)
    return
  }
  empezar(persona)
  await navigateTo(aviso.datos.numero ? `/mis-turnos/${aviso.datos.numero}` : '/mis-turnos')
}

onMounted(async () => {
  // La app ya los mostró: quedan entregados.
  await marcarEntregados(avisos.value)
  const pedido = avisos.value.find((aviso) => aviso.id === route.query.aviso)
  if (pedido) {
    await marcarLeidos([pedido])
    await nextTick()
    document.getElementById(`aviso-${pedido.id}`)?.focus()
    anunciar(`${textoDe(pedido).titulo}. ${textoDe(pedido).mensaje}`)
  }
  await revisar()
})
</script>

<template>
  <div class="contenedor pagina">
    <h1>Avisos</h1>
    <p class="pagina__bajada">
      Acá quedan todos los avisos de tus turnos. Los nuevos aparecen primero.
    </p>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton @click="refresh()">Probar de nuevo</Boton>
      </div>
    </template>

    <template v-else>
      <p v-if="avisos.length === 0">Todavía no tenés avisos. Cuando reserves un turno, te avisamos acá.</p>

      <div v-if="sinLeer.length > 1" class="acciones">
        <Boton variante="secundario" @click="marcar(sinLeer, 'Marcamos todos como leídos.')">
          Marcar todos como leídos
        </Boton>
      </div>
      <div id="resultado-avisos" role="status">
        <p v-if="resultado" class="texto-suave">{{ resultado }}</p>
      </div>
      <Aviso v-if="errorAyuda" tipo="atencion">
        <p>{{ errorAyuda }}</p>
      </Aviso>

      <ul v-if="avisos.length > 0" class="bandeja">
        <li
          v-for="aviso in avisos"
          :key="aviso.id"
          class="aviso-item"
          :class="{ 'aviso-item--nuevo': aviso.leidaEn === null }"
        >
          <p class="aviso-item__estado">
            <span aria-hidden="true">{{ aviso.leidaEn === null ? '●' : '✓' }}</span>
            {{ aviso.leidaEn === null ? 'Nuevo' : 'Leído' }}
            <template v-if="esCopiaDeAcompanante(aviso)"> · De {{ aviso.datos.para || 'la persona que acompañás' }}</template>
          </p>
          <h2 :id="`aviso-${aviso.id}`" tabindex="-1">{{ textoDe(aviso).titulo }}</h2>
          <p>{{ textoDe(aviso).mensaje }}</p>

          <!-- Datos del turno: cuándo, dónde, qué llevar y cómo llegar -->
          <dl v-if="esAvisoDeTurno(aviso.tipo) && aviso.datos.inicio" class="datos">
            <div>
              <dt>Cuándo</dt>
              <dd>{{ conMayuscula(turnoEnPalabras(aviso.datos.inicio)) }}</dd>
            </div>
            <div v-if="aviso.datos.centro">
              <dt>Dónde</dt>
              <dd>{{ aviso.datos.centro }}<br />{{ aviso.datos.direccion }}, {{ aviso.datos.localidad }}</dd>
            </div>
            <div v-if="aviso.tipo !== 'cancelacion' && aviso.datos.requisitos !== undefined">
              <dt>Qué tenés que llevar</dt>
              <dd>
                <ul class="llevar">
                  <li v-for="requisito in listaRequisitos(aviso.datos.requisitos ?? null)" :key="requisito">{{ requisito }}</li>
                </ul>
              </dd>
            </div>
          </dl>

          <div class="acciones">
            <a
              v-if="aviso.tipo !== 'cancelacion' && typeof aviso.datos.lat === 'number' && typeof aviso.datos.lng === 'number'"
              class="boton boton--secundario"
              :href="enlaceComoLlegar(aviso.datos.lat, aviso.datos.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">🗺️</span>
              Cómo llegar<span class="sr-only"> (se abre Google Maps en otra pestaña)</span>
            </a>
            <template v-if="esAvisoDeTurno(aviso.tipo) && aviso.datos.numero">
              <Boton v-if="!esCopiaDeAcompanante(aviso)" :to="`/mis-turnos/${aviso.datos.numero}`" variante="secundario">
                Ver el turno N.º {{ aviso.datos.numero }}
              </Boton>
              <Boton v-else variante="secundario" @click="verTurnosDe(aviso)">
                Ver los turnos de {{ aviso.datos.para || 'esta persona' }}
              </Boton>
            </template>
            <Boton v-if="aviso.tipo === 'disponibilidad' && aviso.datos.turno_id" :to="`/turnos/${aviso.datos.turno_id}`" variante="secundario">
              Ver el turno libre
            </Boton>
            <Boton v-if="aviso.tipo === 'acompanamiento' && aviso.datos.evento !== 'revocado'" to="/acompanantes" variante="secundario">
              Ver quiénes te ayudan
            </Boton>
            <Boton v-if="aviso.tipo === 'correo'" to="/perfil#titulo-correo" variante="secundario">Revisar mi correo</Boton>
            <Boton v-if="aviso.leidaEn === null" variante="texto" @click="marcarUno(aviso)">
              Marcar como leído<span class="sr-only">: {{ textoDe(aviso).titulo }}</span>
            </Boton>
          </div>

          <ul class="historial texto-suave" aria-label="Estado del aviso">
            <li v-for="linea in historialAviso(aviso)" :key="linea">{{ linea }}</li>
          </ul>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.bandeja {
  display: grid;
  /* minmax(0, 1fr): una palabra larga con texto al 200 % no ensancha la página. */
  grid-template-columns: minmax(0, 1fr);
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

.aviso-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--espacio-2);
  max-width: 48rem;
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-left: 8px solid var(--borde);
  border-radius: var(--radio-tarjeta);
}

.aviso-item--nuevo {
  border-left-color: var(--atencion);
  box-shadow: var(--sombra);
}

.aviso-item__estado {
  font-family: var(--fuente-titulos);
  font-weight: 700;
  color: var(--texto-suave);
}

.aviso-item--nuevo .aviso-item__estado {
  color: var(--texto);
}

.aviso-item h2 {
  font-size: 1.25rem;
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

.llevar {
  display: grid;
  gap: var(--espacio-1);
}

.historial {
  padding: 0;
  list-style: none;
}

#resultado-avisos:empty {
  display: none;
}
</style>
