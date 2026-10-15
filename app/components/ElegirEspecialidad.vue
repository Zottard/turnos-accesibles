<!--
  "¿Qué necesitás?": un cuadro para escribir como se habla ("me duele la rodilla") con
  sugerencias debajo, y la lista de todas las especialidades. Lo usan /buscar y el asistente.
  v-model:texto es lo escrito; v-model:especialidad-id, la especialidad elegida (o null).
  Si la persona cambia lo escrito, la especialidad elegida deja de valer.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string
    especialidades: Especialidad[]
    etiqueta?: string
    error?: string
  }>(),
  {
    etiqueta: 'Escribí qué te pasa o qué médico buscás',
    error: undefined,
  },
)

const texto = defineModel<string>('texto', { default: '' })
const especialidadId = defineModel<number | null>('especialidadId', { default: null })

const { anunciar } = useAnuncio()

const elegida = computed(() => props.especialidades.find((especialidad) => especialidad.id === especialidadId.value))

// Al elegir una (o cuando llega la lista), el cuadro muestra su nombre.
watch(
  elegida,
  (especialidad) => {
    if (especialidad) {
      texto.value = especialidad.nombreSimple
    }
  },
  { immediate: true },
)

// Si cambia lo escrito, la especialidad elegida deja de valer.
watch(texto, (nuevo) => {
  if (elegida.value && nuevo !== elegida.value.nombreSimple) {
    especialidadId.value = null
  }
})

const sugerencias = computed(() => (elegida.value ? [] : buscarEspecialidades(texto.value, props.especialidades, 4)))

function elegirSugerencia(especialidad: Especialidad) {
  especialidadId.value = especialidad.id
  anunciar(`Elegiste ${nombreCompleto(especialidad)}.`)
  // El foco vuelve al cuadro, que ahora muestra la especialidad elegida.
  document.getElementById(props.id)?.focus()
}

// En "Ver todas", el radio no acepta null: sin elegir es undefined.
const especialidadDeLaLista = computed({
  get: () => especialidadId.value ?? undefined,
  set: (valor: string | number | undefined) => {
    especialidadId.value = typeof valor === 'number' ? valor : null
  },
})
</script>

<template>
  <div class="pila">
    <Campo
      :id="id"
      v-model="texto"
      :etiqueta="etiqueta"
      ayuda='Por ejemplo: "oculista", "me duele la rodilla" o "corazón".'
      autocomplete="off"
      :error="error"
      requerido
    />

    <p class="sr-only" role="status">
      <template v-if="sugerencias.length > 0">
        {{ sugerencias.length === 1 ? 'Hay 1 opción' : `Hay ${sugerencias.length} opciones` }} debajo del cuadro.
      </template>
    </p>

    <div v-if="sugerencias.length > 0" class="sugerencias">
      <p :id="`${id}-sugerencias`" class="sugerencias__titulo">¿Es alguna de estas?</p>
      <ul :aria-labelledby="`${id}-sugerencias`">
        <li v-for="especialidad in sugerencias" :key="especialidad.id">
          <button type="button" class="sugerencia" @click="elegirSugerencia(especialidad)">
            <span class="sugerencia__nombre">{{ nombreCompleto(especialidad) }}</span>
            <span class="sugerencia__descripcion">{{ especialidad.descripcion }}</span>
          </button>
        </li>
      </ul>
    </div>

    <p v-if="elegida" class="elegida">
      <span aria-hidden="true">✓</span>
      Elegiste: <strong>{{ nombreCompleto(elegida) }}</strong>. {{ elegida.descripcion }}
    </p>

    <details class="todas">
      <summary>Ver todas las especialidades</summary>
      <fieldset class="todas__lista">
        <legend class="sr-only">Todas las especialidades</legend>
        <OpcionTarjeta
          v-for="especialidad in especialidades"
          :key="especialidad.id"
          v-model="especialidadDeLaLista"
          :nombre="`${id}-lista`"
          :valor="especialidad.id"
          :titulo="nombreCompleto(especialidad)"
          :descripcion="especialidad.descripcion"
        />
      </fieldset>
    </details>
  </div>
</template>

<style scoped>
.sugerencias__titulo {
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.sugerencias ul {
  display: grid;
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.elegida {
  padding: var(--espacio-2) var(--espacio-3);
  background: var(--fondo-exito);
  border: var(--grosor-borde) solid var(--exito);
  border-radius: var(--radio-chico);
}

.todas summary {
  display: inline-flex;
  align-items: center;
  min-height: var(--alto-tactil);
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--primario);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.todas__lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}
</style>
