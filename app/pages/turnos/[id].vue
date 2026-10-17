<!--
  Ficha de un turno (RF-03): cuándo, quién atiende, dónde queda, cómo es el edificio,
  qué llevar y cómo llegar. "Reservar este turno" abre el asistente directo en "Revisá y confirmá".
  ?volver= trae la búsqueda de la que venía, para volver a los mismos resultados.
-->
<script setup lang="ts">
const route = useRoute()
const { cargarTurno } = useTurnos()

const id = Number(route.params.id)
const volver = computed(() => rutaSegura(route.query.volver, '/buscar'))

const { data: cargado, refresh } = await useAsyncData(`turno-${route.params.id}`, async () => {
  if (!Number.isInteger(id) || id <= 0) {
    return { datos: null, error: null }
  }
  return cargarTurno(id)
})

const turno = computed(() => cargado.value?.datos ?? null)

const titulo = computed(() => {
  if (cargado.value?.error) return 'No pudimos traer el turno'
  if (!turno.value) return 'No encontramos este turno'
  if (!turno.value.disponible) return 'Este turno ya no está libre'
  return `Turno de ${turno.value.especialidad.nombreSimple}`
})
useSeoMeta({ title: titulo })

// "011 4740-1100" → "01147401100" para el enlace tel:
function enlaceTelefono(telefono: string) {
  return `tel:${telefono.replace(/[^\d+]/g, '')}`
}
</script>

<template>
  <div class="contenedor pagina">
    <!-- No se pudo traer -->
    <template v-if="cargado?.error">
      <h1>{{ titulo }}</h1>
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div class="acciones">
        <Boton @click="refresh()">Probar de nuevo</Boton>
        <Boton :to="volver" variante="secundario">Volver a la búsqueda</Boton>
      </div>
    </template>

    <!-- No existe, ya pasó o ya lo tomó otra persona -->
    <template v-else-if="!turno || !turno.disponible">
      <h1>{{ titulo }}</h1>
      <p v-if="!turno" class="pagina__bajada">
        Puede que el turno ya haya pasado o que la dirección esté mal escrita.
      </p>
      <p v-else class="pagina__bajada">
        Ese turno ya lo tomó otra persona. Volvé a la búsqueda para ver otros turnos libres.
      </p>
      <div>
        <Boton :to="volver">Volver a la búsqueda</Boton>
      </div>
    </template>

    <template v-else>
      <p>
        <NuxtLink :to="volver"><span aria-hidden="true">←</span> Volver a los resultados</NuxtLink>
      </p>
      <h1>{{ titulo }}</h1>

      <Aviso tipo="info" titulo="Datos de prueba">
        <p>Este centro, el profesional y el turno son inventados para mostrar cómo funciona la página.</p>
      </Aviso>

      <div id="ficha-turno" class="ficha">
        <section class="tarjeta pila ficha__cuando" aria-labelledby="titulo-cuando">
          <h2 id="titulo-cuando">Cuándo</h2>
          <p class="ficha__fecha">{{ turnoEnPalabras(turno.inicio) }}</p>
          <p>Dura unos {{ turno.duracionMin }} minutos.</p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-quien">
          <h2 id="titulo-quien">Quién te atiende</h2>
          <p>
            <strong>{{ nombreCompleto(turno.especialidad) }}</strong>
          </p>
          <p>{{ turno.especialidad.descripcion }}</p>
          <p>Profesional: {{ turno.profesional }}</p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-donde">
          <h2 id="titulo-donde">Dónde</h2>
          <p>
            <strong>{{ turno.centro.nombre }}</strong>
            <span class="texto-suave"> · {{ NOMBRES_TIPO_CENTRO[turno.centro.tipo] ?? 'Centro de salud' }}</span>
          </p>
          <dl class="datos">
            <div>
              <dt>Dirección</dt>
              <dd>{{ turno.centro.direccion }}, {{ turno.centro.localidad }}</dd>
            </div>
            <div v-if="turno.centro.telefono">
              <dt>Teléfono</dt>
              <dd>
                <a :href="enlaceTelefono(turno.centro.telefono)">{{ turno.centro.telefono }}</a>
              </dd>
            </div>
            <div v-if="turno.centro.horario">
              <dt>Horario de atención</dt>
              <dd>{{ turno.centro.horario }}</dd>
            </div>
          </dl>
          <p>
            <a
              class="boton boton--secundario"
              :href="enlaceComoLlegar(turno.centro.lat, turno.centro.lng)"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">🗺️</span>
              Cómo llegar (se abre Google Maps en otra pestaña)
            </a>
          </p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-edificio">
          <h2 id="titulo-edificio">Cómo es el edificio</h2>
          <p>{{ turno.centro.accesibilidad || 'No tenemos datos de accesibilidad de este centro. Llamá antes para preguntar.' }}</p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-llevar">
          <h2 id="titulo-llevar">Qué tenés que llevar</h2>
          <p class="texto-suave">Podés ir marcando lo que ya tenés listo.</p>
          <ul class="llevar">
            <li v-for="(requisito, indice) in turno.requisitos" :key="requisito">
              <label class="llevar__item">
                <input type="checkbox" :name="`llevar-${indice}`" />
                <span>{{ requisito }}</span>
              </label>
            </li>
          </ul>
        </section>
      </div>

      <LeerEnVoz objetivo-id="ficha-turno" etiqueta="Escuchar los datos del turno" />

      <div class="pila">
        <p>Antes de reservar, te mostramos todo junto para que lo revises.</p>
        <div>
          <Boton :to="`/asistente?turno=${turno.id}`">Reservar este turno</Boton>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ficha {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: var(--espacio-4);
}

.ficha__cuando {
  border-top-color: var(--exito);
}

.ficha__fecha {
  font-family: var(--fuente-titulos);
  font-size: 1.3rem;
  font-weight: 700;
}

.ficha__fecha::first-letter {
  text-transform: uppercase;
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
  gap: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.llevar__item {
  display: flex;
  align-items: flex-start;
  gap: var(--espacio-3);
  min-height: var(--alto-tactil);
  padding: var(--espacio-2) 0;
  font-family: var(--fuente-texto);
  font-weight: 400;
  cursor: pointer;
}

.llevar__item input {
  margin-top: 0.15rem;
}
</style>
