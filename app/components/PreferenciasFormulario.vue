<!--
  Controles de accesibilidad. Se usan en el menú del encabezado, en /accesibilidad y en
  /perfil/accesibilidad. Cada control vive en components/preferencias/ (también los usa
  el primer ingreso, /bienvenida). Cada cambio se aplica al instante y se anuncia.
  `prefijo` evita ids repetidos cuando el formulario aparece dos veces en la misma página.
-->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { restablecer } = useAccesibilidad()
const { anunciar } = useAnuncio()

const id = (nombre: string) => `${props.prefijo}-${nombre}`

function volverARecomendado() {
  restablecer()
  anunciar('Volvimos a la configuración recomendada.')
}
</script>

<template>
  <div class="preferencias">
    <fieldset class="preferencias__grupo">
      <legend>Tamaño del texto</legend>
      <PreferenciasTamano :prefijo="prefijo" />
    </fieldset>

    <div class="preferencias__grupo">
      <PreferenciasSiNo
        :id="id('contraste')"
        clave="altoContraste"
        etiqueta="Alto contraste"
        ayuda="Fondo negro y letras blancas y amarillas."
      />
    </div>

    <div class="preferencias__grupo">
      <PreferenciasSiNo
        :id="id('movimiento')"
        clave="reducirMovimiento"
        etiqueta="Reducir movimiento"
        ayuda="Sacamos las animaciones de la pantalla."
      />
    </div>

    <div class="preferencias__grupo">
      <PreferenciasSiNo
        :id="id('lenguaje')"
        clave="lenguajeSimple"
        etiqueta="Lenguaje simple"
        ayuda="Frases cortas. El texto técnico queda guardado para quien lo quiera ver."
      />
    </div>

    <div class="preferencias__grupo">
      <PreferenciasSiNo
        :id="id('voz')"
        clave="lecturaVoz"
        etiqueta="Lectura en voz alta"
        ayuda="Leemos en voz alta los avisos y el nombre de cada pantalla."
      />
      <PreferenciasVelocidad class="velocidad" :prefijo="prefijo" />
      <LeerEnVoz class="probar" texto="Hola. Así suena la voz que lee la página." etiqueta="Probar la voz" />
    </div>

    <div class="preferencias__grupo">
      <button type="button" class="boton boton--secundario" @click="volverARecomendado">
        Volver a lo recomendado
      </button>
    </div>
  </div>
</template>

<style scoped>
.preferencias {
  display: flex;
  flex-direction: column;
}

.preferencias__grupo {
  padding-block: var(--espacio-3);
  border-top: var(--grosor-borde) solid var(--borde);
}

.preferencias__grupo:first-child {
  border-top: 0;
  padding-top: 0;
}

legend {
  margin-bottom: var(--espacio-2);
}

.velocidad {
  margin-top: var(--espacio-3);
}

.probar {
  margin-top: var(--espacio-3);
}
</style>
