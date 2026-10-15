<!--
  "Instalar la app" (v0.6, PWA). Solo aparece cuando sirve:
  - si el navegador ofrece instalarla (evento beforeinstallprompt, lo guarda @vite-pwa/nuxt): un botón;
  - en iPhone o iPad (Safari no tiene ese botón): cómo agregarla a la pantalla de inicio;
  - si ya está instalada, o en otro caso, no muestra nada.
  Se decide en el navegador (después de montar), así el servidor y el navegador pintan lo mismo.
-->
<script setup lang="ts">
const { $pwa } = useNuxtApp()
const { anunciar } = useAnuncio()

const montado = ref(false)
const esIos = ref(false)
onMounted(() => {
  esIos.value = /iPhone|iPad|iPod/.test(navigator.userAgent)
  montado.value = true
})

const instalada = computed(() => $pwa?.isPWAInstalled ?? false)
const puedeInstalar = computed(() => montado.value && !instalada.value && ($pwa?.showInstallPrompt ?? false))
const mostrarIos = computed(() => montado.value && !instalada.value && esIos.value && !puedeInstalar.value)

async function instalar() {
  const respuesta = await $pwa?.install()
  anunciar(
    respuesta?.outcome === 'accepted'
      ? 'Listo: instalamos Turnos Accesibles. La vas a encontrar con los otros íconos.'
      : 'No la instalamos. Podés hacerlo cuando quieras desde acá.',
  )
}
</script>

<template>
  <section v-if="puedeInstalar || mostrarIos" class="tarjeta pila instalar" aria-labelledby="titulo-instalar">
    <h2 id="titulo-instalar"><span aria-hidden="true">📲</span> Tené la app a mano</h2>
    <template v-if="puedeInstalar">
      <p>Instalá Turnos Accesibles en tu celular o computadora. Se abre con un toque, como cualquier otra app.</p>
      <div>
        <Boton @click="instalar">Instalar la app</Boton>
      </div>
    </template>
    <template v-else>
      <p>Para tenerla en tu iPhone o iPad, como cualquier otra app:</p>
      <ol>
        <li>Tocá el botón <strong>Compartir</strong> (el cuadrado con una flecha para arriba).</li>
        <li>Elegí <strong>Agregar a inicio</strong>.</li>
        <li>Tocá <strong>Agregar</strong>.</li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.instalar {
  max-width: 44rem;
  border-top-color: var(--exito);
}
</style>
