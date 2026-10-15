<!--
  Lista de turnos para elegir uno (radios grandes con OpcionTarjeta): el día en palabras, el
  centro, la distancia y quién atiende. Muestra pocos al principio; "Ver más opciones" agrega más.
  La usan el asistente (paso "¿Qué día y hora?" y "lo tomó otra persona") y "Cambiar de fecha".
  v-model: el id del turno elegido.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    turnos: TurnoEncontrado[]
    nombre: string
    leyenda: string
    cuantos?: number
  }>(),
  {
    cuantos: 5,
  },
)

const elegido = defineModel<number | null>({ default: null })

const { anunciar } = useAnuncio()

const visibles = ref(props.cuantos)
// Si cambia la lista (otra búsqueda), volvemos a mostrar pocos.
watch(
  () => props.turnos,
  () => {
    visibles.value = props.cuantos
  },
)

const mostrados = computed(() => props.turnos.slice(0, visibles.value))
const quedan = computed(() => props.turnos.length - mostrados.value.length)

function verMas() {
  const antes = mostrados.value.length
  visibles.value += props.cuantos
  const agregados = mostrados.value.length - antes
  anunciar(agregados === 1 ? 'Agregamos 1 opción más.' : `Agregamos ${agregados} opciones más.`)
}

// El radio no acepta null: sin elegir es undefined.
const elegidoEnLista = computed({
  get: () => elegido.value ?? undefined,
  set: (valor: string | number | undefined) => {
    elegido.value = typeof valor === 'number' ? valor : null
  },
})

function descripcion(turno: TurnoEncontrado): string {
  const lugar = [turno.centroNombre, turno.centroLocalidad, distanciaEnPalabras(turno.distanciaKm)].filter(Boolean).join(', ')
  return `${lugar}. Te atiende ${turno.profesional}.`
}
</script>

<template>
  <div class="pila">
    <fieldset>
      <legend>{{ leyenda }}</legend>
      <div class="opciones-turno">
        <OpcionTarjeta
          v-for="turno in mostrados"
          :key="turno.id"
          v-model="elegidoEnLista"
          :nombre="nombre"
          :valor="turno.id"
          :titulo="conMayuscula(turnoEnPalabras(turno.inicio))"
          :descripcion="descripcion(turno)"
          icono="📅"
        />
      </div>
    </fieldset>
    <div v-if="quedan > 0">
      <Boton variante="secundario" @click="verMas">Ver más opciones</Boton>
    </div>
  </div>
</template>

<style scoped>
.opciones-turno {
  display: grid;
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}
</style>
