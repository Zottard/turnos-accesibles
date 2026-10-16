<!--
  Primer ingreso (RF-02): una preferencia por pantalla. Cada cambio se ve enseguida.
  Al final (o con "Saltar y usar lo recomendado") se guardan en la cuenta.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Bienvenida' })

const PASOS = [
  { clave: 'tamano', pregunta: '¿De qué tamaño querés la letra?' },
  { clave: 'contraste', pregunta: '¿Querés usar alto contraste?' },
  { clave: 'voz', pregunta: '¿Querés que te leamos en voz alta?' },
  { clave: 'lenguaje', pregunta: '¿Preferís frases cortas y simples?' },
  { clave: 'canal', pregunta: '¿Cómo querés que te avisemos?' },
  { clave: 'antelacion', pregunta: '¿Cuándo querés el recordatorio del turno?' },
] as const

const { restablecer } = useAccesibilidad()
const cuenta = usePreferenciasCuenta()
const { anunciar } = useAnuncio()

const indice = ref(0)
const titulo = ref<HTMLElement | null>(null)
const errorAlGuardar = ref(false)
const guardando = ref(false)

const paso = computed(() => PASOS[indice.value]!)
const esElUltimo = computed(() => indice.value === PASOS.length - 1)

async function irAPaso(nuevo: number) {
  indice.value = nuevo
  await nextTick()
  titulo.value?.focus()
  anunciar(`Paso ${nuevo + 1} de ${PASOS.length}. ${PASOS[nuevo]!.pregunta}`)
}

async function terminar() {
  if (guardando.value) {
    return
  }
  guardando.value = true
  errorAlGuardar.value = false
  const guardado = await cuenta.guardarEnCuenta()
  guardando.value = false
  if (!guardado) {
    errorAlGuardar.value = true
    return
  }
  anunciar('Guardamos tus preferencias.')
  await navigateTo('/inicio')
}

function siguiente() {
  if (esElUltimo.value) {
    terminar()
  } else {
    irAPaso(indice.value + 1)
  }
}

function saltar() {
  restablecer()
  cuenta.aviso.value = { ...AVISO_PREDETERMINADO }
  terminar()
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <p class="progreso">Paso {{ indice + 1 }} de {{ PASOS.length }} · Tus preferencias</p>
    <h1 ref="titulo" tabindex="-1">{{ paso.pregunta }}</h1>

    <Aviso v-if="errorAlGuardar" tipo="error">
      <p>No pudimos guardar tus preferencias en tu cuenta. Probá de nuevo en un rato.</p>
    </Aviso>

    <form class="tarjeta pila" novalidate @submit.prevent="siguiente">
      <template v-if="paso.clave === 'tamano'">
        <p>Tocá los botones hasta que leas cómodo. El cambio se ve enseguida en toda la página.</p>
        <fieldset>
          <legend class="sr-only">Tamaño del texto</legend>
          <PreferenciasTamano prefijo="bienvenida" />
        </fieldset>
        <p class="muestra">Así se ve: tu turno es el martes 14 a las 9:30, en el Hospital de Pacheco.</p>
      </template>

      <template v-else-if="paso.clave === 'contraste'">
        <p>Fondo negro con letras blancas y amarillas. Ayuda si ves poco o si hay mucha luz.</p>
        <PreferenciasSiNo id="bienvenida-contraste" clave="altoContraste" etiqueta="Alto contraste" />
      </template>

      <template v-else-if="paso.clave === 'voz'">
        <p>Leemos en voz alta los avisos y el nombre de cada pantalla.</p>
        <PreferenciasSiNo id="bienvenida-voz" clave="lecturaVoz" etiqueta="Lectura en voz alta" />
        <PreferenciasVelocidad prefijo="bienvenida" />
        <LeerEnVoz texto="Hola. Así suena la voz que lee la página." etiqueta="Probar la voz" />
      </template>

      <template v-else-if="paso.clave === 'lenguaje'">
        <p>Usamos palabras de todos los días. El texto técnico queda guardado para quien lo quiera ver.</p>
        <PreferenciasSiNo id="bienvenida-lenguaje" clave="lenguajeSimple" etiqueta="Lenguaje simple" />
      </template>

      <fieldset v-else-if="paso.clave === 'canal'">
        <legend class="sr-only">{{ paso.pregunta }}</legend>
        <p class="explicacion">Te vamos a avisar cuando reserves, cambies o canceles un turno.</p>
        <PreferenciasCanal prefijo="bienvenida" />
      </fieldset>

      <fieldset v-else>
        <legend class="sr-only">{{ paso.pregunta }}</legend>
        <PreferenciasAntelacion prefijo="bienvenida" />
      </fieldset>

      <div class="acciones">
        <Boton type="submit">
          {{ esElUltimo ? (guardando ? 'Guardando…' : 'Guardar y terminar') : 'Siguiente' }}
        </Boton>
        <Boton v-if="indice > 0" variante="secundario" @click="irAPaso(indice - 1)">Volver</Boton>
      </div>
    </form>

    <div class="saltar">
      <p class="texto-suave">
        ¿No querés elegir ahora? Usamos letra un poco más grande, sin animaciones y con lenguaje
        simple. Lo podés cambiar cuando quieras desde tu perfil.
      </p>
      <Boton variante="texto" @click="saltar">Saltar y usar lo recomendado</Boton>
    </div>
  </div>
</template>

<style scoped>
.muestra {
  padding: var(--espacio-3);
  background: var(--fondo-resaltado);
  border-radius: var(--radio-chico);
  font-size: 1.1rem;
}

.explicacion {
  margin-bottom: var(--espacio-3);
}
</style>
