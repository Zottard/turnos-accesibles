<!--
  Buscar turnos (RF-03). Una sola página con tres preguntas numeradas: qué, dónde y cuándo.
  No pide haber ingresado. Lo que se busca queda en la dirección (?esp=4&loc=Tigre...):
  así se puede recargar, volver atrás o compartir la búsqueda.
-->
<script setup lang="ts">
useSeoMeta({ title: 'Buscar un turno' })

const route = useRoute()
const { cargarCatalogo, buscarTurnos, pedirAviso } = useTurnos()
const { conSesion } = useSesion()
const { cargarPerfil } = usePerfil()
const { preferencias } = useAccesibilidad()
const { anunciar } = useAnuncio()
const { registrar } = useEventos()

// --- Catálogo: especialidades, localidades y centros ---
const { data: catalogo } = await useAsyncData('catalogo-turnos', () => cargarCatalogo())
const especialidades = computed(() => catalogo.value?.datos?.especialidades ?? [])
const localidades = computed(() => catalogo.value?.datos?.localidades ?? [])
const centros = computed(() => catalogo.value?.datos?.centros ?? [])

function especialidadPorId(id: number | null) {
  return especialidades.value.find((especialidad) => especialidad.id === id)
}

// --- Lo que se está buscando ahora: sale siempre de la dirección ---
const filtrosActuales = computed(() => filtrosDesdeQuery(route.query))

// Punto desde donde medir la distancia: la ubicación del navegador o el centro de la localidad.
function puntoDeReferencia(filtros: FiltrosBusqueda) {
  if (filtros.lat !== null && filtros.lng !== null) {
    return { lat: filtros.lat, lng: filtros.lng }
  }
  const localidad = localidades.value.find((item) => item.nombre === filtros.localidad)
  return localidad ? { lat: localidad.lat, lng: localidad.lng } : null
}

// Una sola llamada a la base por búsqueda. Sin especialidad elegida no hay nada que buscar.
const { data: resultado, refresh: buscarDeNuevo } = await useAsyncData('resultado-busqueda', async () => {
  const filtros = filtrosActuales.value
  if (filtros.especialidadId === null) {
    return null
  }
  return buscarTurnos(filtros, puntoDeReferencia(filtros))
})

const turnos = computed(() => resultado.value?.datos ?? [])
const especialidadBuscada = computed(() => especialidadPorId(filtrosActuales.value.especialidadId))

// Escribió algo que no es una especialidad: le mostramos las parecidas (o todas).
const textoSinEspecialidad = computed(() =>
  filtrosActuales.value.especialidadId === null ? filtrosActuales.value.texto : '',
)
const parecidas = computed(() => buscarEspecialidades(textoSinEspecialidad.value, especialidades.value))

// --- Formulario: una copia que la persona va cambiando hasta tocar "Buscar turnos" ---
type EstadoUbicacion = 'sin-pedir' | 'buscando' | 'lista' | 'no-se-pudo'

const formulario = reactive<FiltrosBusqueda>({ ...FILTROS_VACIOS })
const textoNecesidad = ref('')
const estadoUbicacion = ref<EstadoUbicacion>('sin-pedir')

function copiarAlFormulario(filtros: FiltrosBusqueda) {
  Object.assign(formulario, filtros)
  textoNecesidad.value = especialidadPorId(filtros.especialidadId)?.nombreSimple ?? filtros.texto
  estadoUbicacion.value = filtros.lat !== null ? 'lista' : 'sin-pedir'
}
copiarAlFormulario(filtrosActuales.value)

// true cuando la búsqueda la pidió la persona (y no es la carga de la página).
const pidioBuscar = ref(false)

// Cuando cambia la dirección (buscar, volver atrás, una sugerencia): el formulario muestra
// lo mismo y se busca de nuevo.
watch(filtrosActuales, async (filtros) => {
  copiarAlFormulario(filtros)
  await buscarDeNuevo()
  avisarResultado()
})

// Las sugerencias y la lista de especialidades están en components/ElegirEspecialidad.vue.
const elegida = computed(() => especialidadPorId(formulario.especialidadId))

// La franja "me da igual" es null en los filtros.
const franjaElegida = computed({
  get: () => formulario.franja ?? 'cualquiera',
  set: (valor: string | number | undefined) => {
    formulario.franja = valor === 'manana' || valor === 'tarde' ? valor : null
  },
})


// --- ¿Dónde? Ubicación del navegador o localidad ---
const mensajeUbicacion = ref('')
const localidadDelPerfil = ref('')

function usarMiUbicacion() {
  if (!('geolocation' in navigator)) {
    noSePudoUbicar('Tu navegador no puede darnos tu ubicación.')
    return
  }
  estadoUbicacion.value = 'buscando'
  anunciar('Buscando tu ubicación…')
  navigator.geolocation.getCurrentPosition(
    (posicion) => {
      // Dos decimales (alrededor de 1 km): alcanza para ordenar por cercanía.
      formulario.lat = Number(posicion.coords.latitude.toFixed(2))
      formulario.lng = Number(posicion.coords.longitude.toFixed(2))
      formulario.localidad = ''
      estadoUbicacion.value = 'lista'
      anunciar('Listo. Vamos a mostrarte primero los turnos más cerca de donde estás.')
    },
    (error) => {
      noSePudoUbicar(
        error.code === error.PERMISSION_DENIED
          ? 'No tenemos permiso para ver tu ubicación. No pasa nada.'
          : 'No pudimos saber dónde estás.',
      )
    },
    { timeout: 10000, maximumAge: 10 * 60 * 1000 },
  )
}

// Sin ubicación, se pide la localidad a mano (RF-03).
function noSePudoUbicar(motivo: string) {
  estadoUbicacion.value = 'no-se-pudo'
  mensajeUbicacion.value = `${motivo} Elegí tu localidad en la lista y te mostramos los turnos más cerca.`
  anunciar(mensajeUbicacion.value, true)
  document.getElementById('buscar-localidad')?.focus()
}

function dejarDeUsarUbicacion() {
  formulario.lat = null
  formulario.lng = null
  estadoUbicacion.value = 'sin-pedir'
  document.getElementById('buscar-localidad')?.focus()
}

// Elegir una localidad reemplaza a la ubicación del navegador.
watch(
  () => formulario.localidad,
  (localidad) => {
    if (localidad && formulario.lat !== null) {
      formulario.lat = null
      formulario.lng = null
      estadoUbicacion.value = 'sin-pedir'
    }
  },
)

// Con la sesión iniciada, proponemos la localidad del perfil (si no eligió otra cosa).
onMounted(async () => {
  if (!conSesion.value || formulario.localidad || formulario.lat !== null) {
    return
  }
  const { datos } = await cargarPerfil()
  const suya = localidades.value.find((item) => normalizar(item.nombre) === normalizar(datos?.localidad ?? ''))
  if (suya && !formulario.localidad && formulario.lat === null) {
    formulario.localidad = suya.nombre
    localidadDelPerfil.value = suya.nombre
  }
})

// --- Buscar ---
const errores = ref<{ que?: string; desde?: string; hasta?: string }>({})
const listaErrores = computed(() => {
  const lista: { id: string; mensaje: string }[] = []
  if (errores.value.que) lista.push({ id: 'buscar-que', mensaje: errores.value.que })
  if (errores.value.desde) lista.push({ id: 'buscar-desde', mensaje: errores.value.desde })
  if (errores.value.hasta) lista.push({ id: 'buscar-hasta', mensaje: errores.value.hasta })
  return lista
})

async function irABuscar(filtros: FiltrosBusqueda) {
  pidioBuscar.value = true
  const query = queryDesdeFiltros(filtros)
  if (JSON.stringify(query) === JSON.stringify(queryDesdeFiltros(filtrosActuales.value))) {
    // Misma búsqueda: la dirección no cambia, buscamos de nuevo igual.
    await buscarDeNuevo()
    avisarResultado()
  } else {
    // Cambia la dirección y el watch de filtrosActuales hace la búsqueda.
    await navigateTo({ path: '/buscar', query })
  }
}

async function buscar() {
  errores.value = {}
  if (!elegida.value) {
    if (textoNecesidad.value.trim() === '') {
      errores.value.que = 'Contanos qué necesitás: escribilo o elegilo de la lista.'
    } else {
      // Si lo que escribió apunta a una sola especialidad, la elegimos.
      const unica = elegirEspecialidad(textoNecesidad.value, especialidades.value)
      if (unica) {
        formulario.especialidadId = unica.id
      }
    }
  }
  const rango = validarRangoFechas(formulario.desde, formulario.hasta)
  if (rango) {
    errores.value[rango.campo] = rango.mensaje
  }
  const primero = listaErrores.value[0]
  if (primero) {
    document.getElementById(primero.id)?.focus()
    return
  }
  await irABuscar({ ...formulario, texto: textoNecesidad.value.trim() })
}

async function buscarCon(cambios: Partial<FiltrosBusqueda>) {
  await irABuscar({ ...filtrosActuales.value, ...cambios })
}

async function buscarEspecialidad(especialidad: Especialidad) {
  await buscarCon({ especialidadId: especialidad.id, texto: '' })
}

// Al terminar una búsqueda que pidió la persona: el foco va al título de los resultados,
// anunciamos cuántos hay y, si eligió la lectura en voz alta, leemos el resumen (una vez).
async function avisarResultado() {
  if (!pidioBuscar.value) {
    return
  }
  pidioBuscar.value = false
  await nextTick()
  document.getElementById('titulo-resultados')?.focus()
  if (!resultado.value) {
    anunciar(
      parecidas.value.length > 0
        ? `Con «${textoSinEspecialidad.value}» encontramos varias especialidades. Elegí la que buscás.`
        : `No encontramos «${textoSinEspecialidad.value}». Elegí una especialidad de la lista.`,
    )
  } else if (resultado.value.error) {
    anunciar(resultado.value.error, true)
  } else {
    // Métricas (v0.6): una búsqueda que pidió la persona, sin datos de quién es.
    const filtros = filtrosActuales.value
    registrar('busqueda', {
      especialidad_id: filtros.especialidadId ?? undefined,
      centro_id: filtros.centroId ?? undefined,
      localidad: filtros.localidad || undefined,
    })
    // anunciar() ya lee en voz alta si la preferencia está activada.
    anunciar(preferencias.value.lecturaVoz ? resumenParaLeer(turnos.value) : `${cantidadEnPalabras(turnos.value.length)}.`)
  }
}

// --- Textos de los resultados ---
const descripcionBusqueda = computed(() => {
  const filtros = filtrosActuales.value
  const partes: string[] = []
  if (especialidadBuscada.value) partes.push(`de ${nombreCompleto(especialidadBuscada.value)}`)
  const centro = centros.value.find((item) => item.id === filtros.centroId)
  if (centro) partes.push(`en ${centro.nombre}`)
  if (filtros.lat !== null) partes.push('cerca de tu ubicación')
  else if (filtros.localidad) partes.push(`cerca de ${filtros.localidad}`)
  if (filtros.desde) partes.push(`desde el ${diaDeCampoEnPalabras(filtros.desde)}`)
  if (filtros.hasta) partes.push(`hasta el ${diaDeCampoEnPalabras(filtros.hasta)}`)
  if (filtros.franja) partes.push(NOMBRES_FRANJA[filtros.franja])
  return `Turnos libres ${partes.join(', ')}.`
})

const resumenEnVoz = computed(() => resumenParaLeer(turnos.value))

// La ficha guarda la búsqueda para el enlace "Volver a los resultados".
function enlaceFicha(id: number) {
  return `/turnos/${id}?volver=${encodeURIComponent(route.fullPath)}`
}

const enlaceIngresar = computed(() => `/ingresar?volver=${encodeURIComponent(route.fullPath)}`)

// --- Sin resultados: "Avisame cuando haya turno" ---
const aviso = ref<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
const guardandoAviso = ref(false)
watch(filtrosActuales, () => {
  aviso.value = null
})

const textoAvisame = computed(() => {
  const nombre = especialidadBuscada.value?.nombreSimple ?? 'esta especialidad'
  const lugar = filtrosActuales.value.localidad ? ` cerca de ${filtrosActuales.value.localidad}` : ''
  return `Si aparece un turno de ${nombre}${lugar}, te avisamos.`
})

async function avisame() {
  const especialidad = especialidadBuscada.value
  if (!especialidad || guardandoAviso.value) {
    return
  }
  guardandoAviso.value = true
  const respuesta = await pedirAviso(especialidad.id, filtrosActuales.value.localidad || null)
  guardandoAviso.value = false
  aviso.value = respuesta.ok
    ? {
        tipo: 'exito',
        mensaje: `Te vamos a avisar cuando aparezca un turno de ${especialidad.nombreSimple}.`,
      }
    : { tipo: 'error', mensaje: respuesta.mensaje }
  anunciar(aviso.value.mensaje, !respuesta.ok)
}
</script>

<template>
  <div class="contenedor pagina">
    <h1>Buscar un turno</h1>
    <p class="pagina__bajada">
      Respondé tres preguntas. Solo la primera es obligatoria. No hace falta que tengas una cuenta.
    </p>
    <p>
      ¿Preferís que te guiemos de a una pregunta por pantalla?
      <NuxtLink to="/asistente">Pedí tu turno con el asistente</NuxtLink>.
    </p>

    <Aviso v-if="catalogo?.error" tipo="error">
      <p>{{ catalogo.error }}</p>
    </Aviso>

    <ResumenErrores :errores="listaErrores" />

    <form class="busqueda" novalidate @submit.prevent="buscar">
      <!-- 1. ¿Qué necesitás? -->
      <section class="tarjeta pila paso-busqueda" aria-labelledby="titulo-que">
        <h2 id="titulo-que" class="paso-busqueda__titulo">
          <span class="paso-busqueda__numero" aria-hidden="true">1</span>
          ¿Qué necesitás?
        </h2>
        <ElegirEspecialidad
          id="buscar-que"
          v-model:texto="textoNecesidad"
          v-model:especialidad-id="formulario.especialidadId"
          :especialidades="especialidades"
          :error="errores.que"
        />
      </section>

      <!-- 2. ¿Dónde? -->
      <section class="tarjeta pila paso-busqueda" aria-labelledby="titulo-donde">
        <h2 id="titulo-donde" class="paso-busqueda__titulo">
          <span class="paso-busqueda__numero" aria-hidden="true">2</span>
          ¿Dónde?
          <span class="paso-busqueda__opcional">(opcional)</span>
        </h2>
        <p>Te mostramos primero los turnos más cerca.</p>

        <Aviso v-if="estadoUbicacion === 'lista'" tipo="exito" titulo="Usamos tu ubicación">
          <p>Ordenamos los turnos por cercanía a donde estás ahora.</p>
          <button type="button" class="boton boton--texto enlace-boton" @click="dejarDeUsarUbicacion">
            Prefiero elegir una localidad
          </button>
        </Aviso>
        <div v-else>
          <Boton variante="secundario" @click="usarMiUbicacion">
            <span aria-hidden="true">📍</span>
            {{ estadoUbicacion === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación' }}
          </Boton>
        </div>
        <Aviso v-if="estadoUbicacion === 'no-se-pudo'" tipo="atencion" titulo="No sabemos dónde estás">
          <p>{{ mensajeUbicacion }}</p>
        </Aviso>

        <div v-if="estadoUbicacion !== 'lista'" class="campo-lista">
          <label for="buscar-localidad">
            {{ estadoUbicacion === 'no-se-pudo' ? 'Elegí tu localidad' : 'O elegí tu localidad' }}
          </label>
          <p v-if="localidadDelPerfil && formulario.localidad === localidadDelPerfil" id="buscar-localidad-ayuda" class="texto-suave">
            Es la localidad de tu perfil. Podés cambiarla.
          </p>
          <select
            id="buscar-localidad"
            v-model="formulario.localidad"
            :aria-describedby="localidadDelPerfil && formulario.localidad === localidadDelPerfil ? 'buscar-localidad-ayuda' : undefined"
          >
            <option value="">Cualquier lugar</option>
            <option v-for="localidad in localidades" :key="localidad.nombre" :value="localidad.nombre">
              {{ localidad.nombre }}
            </option>
          </select>
        </div>

        <div class="campo-lista">
          <label for="buscar-centro">
            Centro de salud <span class="texto-suave">(opcional)</span>
          </label>
          <select id="buscar-centro" v-model="formulario.centroId">
            <option :value="null">Cualquier centro</option>
            <option v-for="centro in centros" :key="centro.id" :value="centro.id">
              {{ centro.nombre }} — {{ centro.localidad }}
            </option>
          </select>
        </div>
      </section>

      <!-- 3. ¿Cuándo? -->
      <section class="tarjeta pila paso-busqueda" aria-labelledby="titulo-cuando">
        <h2 id="titulo-cuando" class="paso-busqueda__titulo">
          <span class="paso-busqueda__numero" aria-hidden="true">3</span>
          ¿Cuándo?
          <span class="paso-busqueda__opcional">(opcional)</span>
        </h2>
        <p>Si no elegís fechas, te mostramos los turnos más próximos.</p>
        <div class="fechas">
          <Campo id="buscar-desde" v-model="formulario.desde" etiqueta="Desde el día" type="date" :error="errores.desde" />
          <Campo id="buscar-hasta" v-model="formulario.hasta" etiqueta="Hasta el día" type="date" :error="errores.hasta" />
        </div>
        <fieldset>
          <legend>¿A qué hora te queda mejor?</legend>
          <div class="franjas">
            <OpcionTarjeta
              v-for="franja in OPCIONES_FRANJA"
              :key="franja.valor"
              v-model="franjaElegida"
              nombre="buscar-franja"
              :valor="franja.valor"
              :titulo="franja.titulo"
              :descripcion="franja.descripcion"
              :icono="franja.icono"
            />
          </div>
        </fieldset>
      </section>

      <div>
        <Boton type="submit">
          <span aria-hidden="true">🔎</span>
          Buscar turnos
        </Boton>
      </div>
    </form>

    <!-- Escribió algo que no conocemos: "¿Quisiste decir…?" -->
    <section v-if="textoSinEspecialidad" class="pila resultados" aria-labelledby="titulo-resultados">
      <template v-if="parecidas.length > 0">
        <h2 id="titulo-resultados" tabindex="-1">¿Quisiste decir alguna de estas?</h2>
        <p>Con «{{ textoSinEspecialidad }}» encontramos varias especialidades. Tocá la que buscás para ver sus turnos.</p>
        <ul class="parecidas">
          <li v-for="especialidad in parecidas" :key="especialidad.id">
            <button type="button" class="sugerencia" @click="buscarEspecialidad(especialidad)">
              <span class="sugerencia__nombre">{{ nombreCompleto(especialidad) }}</span>
              <span class="sugerencia__descripcion">{{ especialidad.descripcion }}</span>
            </button>
          </li>
        </ul>
      </template>
      <template v-else>
        <h2 id="titulo-resultados" tabindex="-1">No encontramos «{{ textoSinEspecialidad }}»</h2>
        <p>Probá con otras palabras, o elegí una de las especialidades que tenemos:</p>
        <ul class="parecidas">
          <li v-for="especialidad in especialidades" :key="especialidad.id">
            <button type="button" class="sugerencia" @click="buscarEspecialidad(especialidad)">
              <span class="sugerencia__nombre">{{ nombreCompleto(especialidad) }}</span>
            </button>
          </li>
        </ul>
      </template>
    </section>

    <!-- Resultados -->
    <section v-else-if="resultado" class="pila resultados" aria-labelledby="titulo-resultados">
      <template v-if="resultado.error">
        <h2 id="titulo-resultados" tabindex="-1">No pudimos buscar</h2>
        <Aviso tipo="error">
          <p>{{ resultado.error }}</p>
        </Aviso>
        <div>
          <Boton @click="buscarCon({})">Probar de nuevo</Boton>
        </div>
      </template>

      <template v-else>
        <h2 id="titulo-resultados" tabindex="-1">{{ cantidadEnPalabras(turnos.length) }}</h2>
        <p class="texto-suave">{{ descripcionBusqueda }}</p>

        <template v-if="turnos.length > 0">
          <LeerEnVoz :texto="resumenEnVoz" etiqueta="Escuchar los resultados" />
          <ol class="lista-turnos">
            <li v-for="turno in turnos" :key="turno.id" class="turno">
              <h3 :id="`turno-${turno.id}`" class="turno__cuando">{{ turnoEnPalabras(turno.inicio) }}</h3>
              <p class="turno__donde">
                <strong>{{ turno.centroNombre }}</strong>
                <span>{{ turno.centroLocalidad }}</span>
                <span v-if="turno.distanciaKm !== null" class="turno__distancia">
                  {{ distanciaEnPalabras(turno.distanciaKm) }}
                </span>
              </p>
              <p>
                {{ nombreCompleto({ nombre: turno.especialidadNombre, nombreSimple: turno.especialidadNombreSimple }) }}
                · {{ turno.profesional }}
              </p>
              <div>
                <Boton :to="enlaceFicha(turno.id)" variante="secundario" :aria-describedby="`turno-${turno.id}`">
                  Ver este turno
                </Boton>
              </div>
            </li>
          </ol>
          <p class="texto-suave">
            Datos de prueba: los centros, profesionales y turnos son inventados para mostrar cómo funciona.
          </p>
        </template>

        <!-- Sin resultados: alternativas (RF-03) -->
        <template v-else>
          <Aviso tipo="atencion" titulo="No hay turnos libres con lo que elegiste">
            <p>Probá con alguna de estas opciones:</p>
          </Aviso>
          <ul class="alternativas">
            <li v-if="filtrosActuales.desde || filtrosActuales.hasta">
              <Boton variante="secundario" @click="buscarCon({ desde: '', hasta: '' })">Buscar en todas las fechas</Boton>
            </li>
            <li v-if="filtrosActuales.franja">
              <Boton variante="secundario" @click="buscarCon({ franja: null })">Buscar a cualquier hora</Boton>
            </li>
            <li v-if="filtrosActuales.centroId !== null">
              <Boton variante="secundario" @click="buscarCon({ centroId: null })">Buscar en otros centros cerca</Boton>
            </li>
          </ul>

          <div class="tarjeta pila">
            <h3>Avisame cuando haya turno</h3>
            <p>{{ textoAvisame }}</p>
            <Aviso v-if="aviso" :tipo="aviso.tipo">
              <p>{{ aviso.mensaje }}</p>
            </Aviso>
            <div v-if="aviso?.tipo !== 'exito'">
              <Boton v-if="conSesion" @click="avisame">
                {{ guardandoAviso ? 'Guardando…' : 'Avisame cuando haya turno' }}
              </Boton>
              <template v-else>
                <p>Para avisarte necesitamos que ingreses con tu cuenta.</p>
                <Boton :to="enlaceIngresar">Ingresar para que te avisemos</Boton>
              </template>
            </div>
          </div>
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped>
.busqueda {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-4);
  max-width: 48rem;
}

.paso-busqueda__titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-3);
}

.paso-busqueda__numero {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--primario);
  color: var(--sobre-primario);
  font-weight: 800;
}

.paso-busqueda__opcional {
  font-family: var(--fuente-texto);
  font-size: 1rem;
  font-weight: 400;
  color: var(--texto-suave);
}

/* Especialidades parecidas: botones grandes (.sugerencia, en base.css). */
.parecidas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.campo-lista {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}

.enlace-boton {
  padding-inline: 0;
}

.fechas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  gap: var(--espacio-3);
}

.franjas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

/* --- Resultados --- */
.resultados {
  margin-top: var(--espacio-4);
}

.lista-turnos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

.turno {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  max-width: none;
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-left: 8px solid var(--exito);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
}

.turno__cuando::first-letter {
  text-transform: uppercase;
}

.turno__donde {
  display: flex;
  flex-direction: column;
}

.turno__distancia {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--exito);
}

.alternativas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

.alternativas:empty {
  display: none;
}

html[data-contraste='alto'] .paso-busqueda__numero {
  color: #000;
}
</style>
