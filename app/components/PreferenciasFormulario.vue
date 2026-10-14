<!--
  Controles de accesibilidad. Se usan en el menú del encabezado y en la página /accesibilidad.
  Cada cambio se aplica al instante y se anuncia. `prefijo` evita ids repetidos
  cuando el formulario aparece dos veces en la misma página.
-->
<script setup lang="ts">
const props = defineProps<{
  prefijo: string
}>()

const { preferencias, cambiar, restablecer } = useAccesibilidad()
const { anunciar } = useAnuncio()

const VELOCIDADES = [
  { valor: 0.7, titulo: 'Lenta', icono: '🐢' },
  { valor: 0.9, titulo: 'Normal', icono: '🙂' },
  { valor: 1.2, titulo: 'Rápida', icono: '🐇' },
]

const id = (nombre: string) => `${props.prefijo}-${nombre}`

const posicionTamano = computed(() => TAMANOS_TEXTO.indexOf(preferencias.value.tamanoTexto))

function cambiarTamano(paso: 1 | -1) {
  const nuevo = TAMANOS_TEXTO[posicionTamano.value + paso]
  if (nuevo === undefined) {
    anunciar(paso > 0 ? 'El texto ya está en el tamaño más grande.' : 'El texto ya está en el tamaño más chico.')
    return
  }
  cambiar('tamanoTexto', nuevo)
  anunciar(`Texto en ${nuevo} %`)
}

function cambiarInterruptor(
  clave: 'altoContraste' | 'reducirMovimiento' | 'lecturaVoz' | 'lenguajeSimple',
  nombre: string,
  valor: boolean,
) {
  cambiar(clave, valor)
  anunciar(`${nombre} ${valor ? 'activado' : 'desactivado'}`)
}

function cambiarVelocidad(valor: string | number | undefined) {
  const elegida = VELOCIDADES.find((velocidad) => velocidad.valor === valor)
  if (!elegida) {
    return
  }
  cambiar('velocidadVoz', elegida.valor)
  anunciar(`Velocidad de la voz: ${elegida.titulo.toLowerCase()}`)
}

function probarVoz() {
  hablar('Hola. Así suena la voz que lee la página.', preferencias.value.velocidadVoz)
}

function volverARecomendado() {
  restablecer()
  anunciar('Volvimos a la configuración recomendada.')
}
</script>

<template>
  <div class="preferencias">
    <fieldset class="preferencias__grupo">
      <legend>Tamaño del texto</legend>
      <div class="tamano">
        <button
          type="button"
          class="boton boton--secundario tamano__boton"
          :aria-describedby="id('tamano-actual')"
          @click="cambiarTamano(-1)"
        >
          <span aria-hidden="true">A−</span> Más chico
        </button>
        <p :id="id('tamano-actual')" class="tamano__actual">
          <span class="sr-only">Tamaño actual: </span>{{ preferencias.tamanoTexto }} %
        </p>
        <button
          type="button"
          class="boton boton--secundario tamano__boton"
          :aria-describedby="id('tamano-actual')"
          @click="cambiarTamano(1)"
        >
          <span aria-hidden="true">A+</span> Más grande
        </button>
      </div>
    </fieldset>

    <div class="preferencias__grupo">
      <Interruptor
        :id="id('contraste')"
        etiqueta="Alto contraste"
        ayuda="Fondo negro y letras blancas y amarillas."
        :model-value="preferencias.altoContraste"
        @update:model-value="(valor) => cambiarInterruptor('altoContraste', 'Alto contraste', valor)"
      />
    </div>

    <div class="preferencias__grupo">
      <Interruptor
        :id="id('movimiento')"
        etiqueta="Reducir movimiento"
        ayuda="Sacamos las animaciones de la pantalla."
        :model-value="preferencias.reducirMovimiento"
        @update:model-value="(valor) => cambiarInterruptor('reducirMovimiento', 'Reducir movimiento', valor)"
      />
    </div>

    <div class="preferencias__grupo">
      <Interruptor
        :id="id('lenguaje')"
        etiqueta="Lenguaje simple"
        ayuda="Frases cortas. El texto técnico queda guardado para quien lo quiera ver."
        :model-value="preferencias.lenguajeSimple"
        @update:model-value="(valor) => cambiarInterruptor('lenguajeSimple', 'Lenguaje simple', valor)"
      />
    </div>

    <div class="preferencias__grupo">
      <Interruptor
        :id="id('voz')"
        etiqueta="Lectura en voz alta"
        ayuda="Leemos en voz alta los avisos y el nombre de cada pantalla."
        :model-value="preferencias.lecturaVoz"
        @update:model-value="(valor) => cambiarInterruptor('lecturaVoz', 'Lectura en voz alta', valor)"
      />

      <fieldset class="velocidad">
        <legend>Velocidad de la voz</legend>
        <div class="velocidad__opciones">
          <OpcionTarjeta
            v-for="velocidad in VELOCIDADES"
            :key="velocidad.valor"
            :nombre="id('velocidad')"
            :valor="velocidad.valor"
            :titulo="velocidad.titulo"
            :icono="velocidad.icono"
            :model-value="preferencias.velocidadVoz"
            @update:model-value="cambiarVelocidad"
          />
        </div>
      </fieldset>
      <button type="button" class="boton boton--texto" @click="probarVoz">
        <span aria-hidden="true">🔊</span> Probar la voz
      </button>
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

.tamano {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
}

.tamano__boton {
  padding-inline: 1rem;
}

.tamano__actual {
  min-width: 4.5ch;
  font-family: var(--fuente-titulos);
  font-size: 1.25rem;
  font-weight: 700;
  text-align: center;
}

.velocidad {
  margin-top: var(--espacio-3);
}

.velocidad__opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: var(--espacio-2);
}

.velocidad + .boton {
  margin-top: var(--espacio-2);
}
</style>
