<!--
  Asistente para pedir un turno (RF-04): una pregunta por pantalla.
    1. Contanos qué necesitás (opcional: se escribe o se dice, y el servidor lo interpreta)
    2. ¿Qué médico necesitás?   3. ¿Dónde te queda cómodo?   4. ¿Qué día y hora?
    5. Revisá y confirmá
  No hace falta una cuenta para empezar; sí para confirmar. Lo elegido se guarda como borrador
  en sessionStorage (ta_asistente): si la persona se va, recarga o ingresa, sigue donde estaba.
  Nada se reserva (ni se bloquea el cupo) hasta tocar "Confirmar turno".
  /asistente?turno=123 (desde la ficha de un turno) empieza directo en "Revisá y confirmá".
  v0.5: en modo acompañante el turno es para la persona que se ayuda (p_para). El borrador guarda
  para quién es: si cambió la persona, se empieza de cero. Sin el permiso 'reservar' no se
  muestra "Confirmar turno" (y la base lo rechazaría).
-->
<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { cargarCatalogo, buscarTurnos, cargarTurno } = useTurnos()
const { reservarTurno } = useReservas()
const { conSesion } = useSesion()
const { cargarPerfil } = usePerfil()
const { anunciar } = useAnuncio()
const { ayudando, puedoHacer } = useAyuda()
const { registrar } = useEventos()
// Para quién es el turno: la persona que se ayuda, o null (para uno mismo).
const paraId = ayudando.value?.id ?? null

// --- Catálogo: especialidades, localidades y centros ---
const { data: catalogo } = await useAsyncData('catalogo-turnos', () => cargarCatalogo())
const especialidades = computed(() => catalogo.value?.datos?.especialidades ?? [])
const localidades = computed(() => catalogo.value?.datos?.localidades ?? [])
const centros = computed(() => catalogo.value?.datos?.centros ?? [])

// --- El borrador y el paso actual ---
const borrador = reactive<BorradorAsistente>(borradorNuevo(Date.now(), paraId))
const TOTAL_PASOS = PASOS_ASISTENTE.length
const pregunta = computed(() => PASOS_ASISTENTE[borrador.paso]!)
useSeoMeta({ title: () => `Paso ${borrador.paso + 1} de ${TOTAL_PASOS}: ${pregunta.value}` })

const titulo = ref<HTMLElement | null>(null)
const error = ref<string | undefined>()
const avisoInicio = ref('')

const especialidadElegida = computed(() => especialidades.value.find((item) => item.id === borrador.especialidadId))

// true cuando ya leímos el borrador guardado: recién ahí empezamos a guardar los cambios.
const cargado = ref(false)

function guardarBorrador() {
  try {
    sessionStorage.setItem(CLAVE_BORRADOR_ASISTENTE, JSON.stringify(borrador))
  } catch {
    // Sin sessionStorage (modo privado muy estricto) el asistente funciona igual, sin borrador.
  }
}

function borrarBorrador() {
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR_ASISTENTE)
  } catch {
    // Nada que borrar.
  }
}

watch(
  borrador,
  () => {
    if (cargado.value) {
      guardarBorrador()
    }
  },
  { deep: true },
)

// Desde la ficha: el turno ya está elegido, vamos directo a revisar y confirmar.
async function empezarConTurno(turnoId: number) {
  const { datos } = await cargarTurno(turnoId)
  await router.replace({ query: {} })
  if (!datos) {
    avisoInicio.value = 'No encontramos ese turno. Puede que ya haya pasado. Elegí uno con estas preguntas.'
    return
  }
  Object.assign(borrador, borradorNuevo(Date.now(), paraId), {
    paso: ULTIMO_PASO,
    especialidadId: datos.especialidad.id,
    localidad: datos.centro.localidad,
    turnoId,
  })
}

onMounted(async () => {
  const turnoPedido = Number(route.query.turno)
  if (Number.isInteger(turnoPedido) && turnoPedido > 0) {
    await empezarConTurno(turnoPedido)
  } else {
    try {
      Object.assign(borrador, normalizarBorrador(JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR_ASISTENTE) ?? 'null'), Date.now(), paraId))
    } catch {
      // Si el borrador está roto, empezamos de cero.
    }
  }
  cargado.value = true
  guardarBorrador()
  // Métricas (v0.6): alguien empezó el asistente desde el principio.
  if (borrador.paso === 0) registrar('asistente_inicio')
  await alEntrarAlPaso()
  if (borrador.paso > 0) {
    await nextTick()
    titulo.value?.focus()
    anunciar(`Seguimos donde estabas. ${textoDelPaso.value}`)
  }
})

// "Paso 2 de 5. ¿Qué médico necesitás? Elegiste Oculista (Oftalmología)."
function conPunto(texto: string) {
  return /[.?!]$/.test(texto) ? texto : `${texto}.`
}

const resumenElegido = computed(() => {
  if (!ficha.value) return ''
  return (
    `Vas a pedir un turno${ayudando.value ? ` para ${ayudando.value.nombre}` : ''} de ${nombreCompleto(ficha.value.especialidad)}, con ${ficha.value.profesional}. ` +
    `${conMayuscula(turnoEnPalabras(ficha.value.inicio))}. ` +
    `En ${ficha.value.centro.nombre}, ${ficha.value.centro.direccion}, ${ficha.value.centro.localidad}.`
  )
})

const textoDelPaso = computed(() => {
  const partes = [`Paso ${borrador.paso + 1} de ${TOTAL_PASOS}.`, conPunto(pregunta.value)]
  if (borrador.paso === 0) {
    partes.push('Escribilo o decilo con tu voz. Por ejemplo: necesito un turno con el oculista cerca de casa.')
  } else if (borrador.paso === ULTIMO_PASO && ficha.value) {
    partes.push(resumenElegido.value, 'Todavía no reservaste nada.')
  } else if (especialidadElegida.value) {
    partes.push(`Elegiste ${nombreCompleto(especialidadElegida.value)}.`)
  }
  return partes.join(' ')
})

// Lo que hace falta al llegar a cada paso.
async function alEntrarAlPaso() {
  if (borrador.paso === 2) await proponerLocalidadDelPerfil()
  if (borrador.paso === 3) {
    await buscarOpciones()
    registrar('busqueda', {
      especialidad_id: borrador.especialidadId ?? undefined,
      centro_id: borrador.centroId ?? undefined,
      localidad: borrador.localidad || undefined,
    })
  }
  if (borrador.paso === ULTIMO_PASO) await cargarFicha()
}

// Cambiar de paso: el foco va al título (la pregunta) y se anuncia. Con la lectura en voz alta
// activada, anunciar() además lo lee.
async function irAPaso(nuevo: number) {
  borrador.paso = nuevo
  error.value = undefined
  await alEntrarAlPaso()
  await nextTick()
  titulo.value?.focus()
  anunciar(textoDelPaso.value)
}

function volver() {
  if (borrador.paso > 0) {
    irAPaso(borrador.paso - 1)
  }
}

function siguiente() {
  // Paso 1: si escribió algo que apunta a una sola especialidad, la elegimos.
  if (borrador.paso === 1 && borrador.especialidadId === null && textoEspecialidad.value.trim()) {
    const unica = elegirEspecialidad(textoEspecialidad.value, especialidades.value)
    if (unica) borrador.especialidadId = unica.id
  }
  error.value = validarPaso(borrador.paso, borrador)
  if (error.value) {
    const campo =
      borrador.paso === 1
        ? document.getElementById('asistente-especialidad')
        : document.querySelector<HTMLElement>('[name="asistente-turno"]') ?? document.getElementById('titulo-opciones')
    campo?.focus()
    anunciar(error.value)
    return
  }
  irAPaso(borrador.paso + 1)
}

// ===== Paso 1 (índice 0): contanos qué necesitás =====
const textoPedido = ref('')
const errorPedido = ref<string | undefined>()
const interpretando = ref(false)
const pedido = ref<PedidoInterpretado | null>(null)
// Si el servidor no pudo leer el pedido, seguimos por menús (la IA nunca corta el trámite).
const pedidoFallo = ref('')

const textoResultadoPedido = computed(() => {
  if (pedidoFallo.value) return `${pedidoFallo.value} Vamos paso a paso.`
  if (pedido.value?.entendido) return `${pedido.value.explicacion} ¿Es así?`
  if (pedido.value) return `${pedido.value.explicacion} Vamos paso a paso.`
  return ''
})

async function interpretar() {
  if (interpretando.value) return
  errorPedido.value = undefined
  pedido.value = null
  pedidoFallo.value = ''
  if (textoPedido.value.trim() === '') {
    errorPedido.value = 'Escribí o decí qué necesitás. Si preferís, elegí vos paso a paso.'
    document.getElementById('asistente-pedido')?.focus()
    anunciar(errorPedido.value)
    return
  }
  interpretando.value = true
  anunciar('Leyendo tu pedido…')
  try {
    pedido.value = await $fetch<PedidoInterpretado>('/api/interpretar', {
      method: 'POST',
      body: { texto: textoPedido.value.trim().slice(0, 300) },
    })
  } catch (falla) {
    const estado = (falla as { statusCode?: number }).statusCode
    pedidoFallo.value = estado === 429 ? 'Hiciste muchos pedidos seguidos.' : 'No pudimos leer tu pedido.'
  }
  interpretando.value = false
  // Métricas (v0.6): un pedido en lenguaje natural que entendimos (nunca el texto).
  if (pedido.value?.entendido) registrar('asistente_ia', { especialidad_id: pedido.value.especialidadId ?? undefined })
  await nextTick()
  document.getElementById('resultado-pedido')?.focus()
  anunciar(textoResultadoPedido.value)
}

// Pasa al borrador lo que entendimos. Sin la especialidad si la persona dijo "No, elegir yo".
function aplicarPedido(conEspecialidad: boolean) {
  const entendido = pedido.value
  if (!entendido) return
  if (conEspecialidad && entendido.especialidadId !== null) borrador.especialidadId = entendido.especialidadId
  if (entendido.franja) borrador.franja = entendido.franja
  if (entendido.desde) borrador.desde = entendido.desde
  borrador.cerca = entendido.cerca
}

function siEsAsi() {
  aplicarPedido(true)
  irAPaso(1)
}

function seguirPasoAPaso() {
  aplicarPedido(false)
  irAPaso(1)
}

// ===== Paso 2: qué médico =====
const textoEspecialidad = ref('')

// ===== Paso 3: dónde =====
type EstadoUbicacion = 'sin-pedir' | 'buscando' | 'no-se-pudo'
const estadoUbicacion = ref<EstadoUbicacion>('sin-pedir')
const mensajeUbicacion = ref('')
const localidadDelPerfil = ref('')

// Con la sesión iniciada, proponemos la localidad del perfil (si no eligió otra cosa).
// Ayudando a otra persona no: no vemos su perfil (y la del acompañante no sirve).
async function proponerLocalidadDelPerfil() {
  if (!conSesion.value || ayudando.value || borrador.localidad || borrador.lat !== null) return
  const { datos } = await cargarPerfil()
  const suya = localidades.value.find((item) => normalizar(item.nombre) === normalizar(datos?.localidad ?? ''))
  if (suya && !borrador.localidad && borrador.lat === null) {
    borrador.localidad = suya.nombre
    localidadDelPerfil.value = suya.nombre
  }
}

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
      borrador.lat = Number(posicion.coords.latitude.toFixed(2))
      borrador.lng = Number(posicion.coords.longitude.toFixed(2))
      borrador.localidad = ''
      estadoUbicacion.value = 'sin-pedir'
      anunciar('Listo. Vamos a mostrarte primero los turnos más cerca de donde estás.')
    },
    (falla) => {
      noSePudoUbicar(
        falla.code === falla.PERMISSION_DENIED
          ? 'No tenemos permiso para ver tu ubicación. No pasa nada.'
          : 'No pudimos saber dónde estás.',
      )
    },
    { timeout: 10000, maximumAge: 10 * 60 * 1000 },
  )
}

function noSePudoUbicar(motivo: string) {
  estadoUbicacion.value = 'no-se-pudo'
  mensajeUbicacion.value = `${motivo} Elegí tu localidad en la lista.`
  anunciar(mensajeUbicacion.value, true)
  document.getElementById('asistente-localidad')?.focus()
}

function dejarDeUsarUbicacion() {
  borrador.lat = null
  borrador.lng = null
  nextTick(() => document.getElementById('asistente-localidad')?.focus())
}

// Elegir una localidad reemplaza a la ubicación del navegador.
watch(
  () => borrador.localidad,
  (localidad) => {
    if (localidad && borrador.lat !== null) {
      borrador.lat = null
      borrador.lng = null
    }
  },
)

// Punto desde donde medir la distancia: la ubicación o el centro de la localidad.
function puntoDeReferencia() {
  if (borrador.lat !== null && borrador.lng !== null) {
    return { lat: borrador.lat, lng: borrador.lng }
  }
  const localidad = localidades.value.find((item) => item.nombre === borrador.localidad)
  return localidad ? { lat: localidad.lat, lng: localidad.lng } : null
}

// ===== Paso 4: qué día y hora =====
const opciones = ref<TurnoEncontrado[]>([])
const buscando = ref(false)
const errorBusqueda = ref('')
const errorDesde = ref<string | undefined>()

const franjaElegida = computed({
  get: () => borrador.franja ?? 'cualquiera',
  set: (valor: string | number | undefined) => {
    borrador.franja = valor === 'manana' || valor === 'tarde' ? valor : null
  },
})

async function buscarOpciones() {
  if (borrador.especialidadId === null) return
  errorDesde.value = validarRangoFechas(borrador.desde, '')?.mensaje
  if (errorDesde.value) return
  buscando.value = true
  errorBusqueda.value = ''
  const { datos, error: falla } = await buscarTurnos(filtrosDelBorrador(borrador), puntoDeReferencia())
  buscando.value = false
  opciones.value = datos ?? []
  errorBusqueda.value = falla ?? ''
  // Si el turno elegido ya no está entre las opciones (cambió la franja o el día), se deselecciona.
  if (borrador.turnoId !== null && !opciones.value.some((turno) => turno.id === borrador.turnoId)) {
    borrador.turnoId = null
  }
}

// Cambiar la hora o el día vuelve a buscar y anuncia cuántos hay.
watch(
  () => [borrador.franja, borrador.desde],
  async () => {
    if (!cargado.value || borrador.paso !== 3) return
    await buscarOpciones()
    anunciar(errorDesde.value || errorBusqueda.value || `${cantidadEnPalabras(opciones.value.length)}.`)
  },
)

async function buscarCon(cambios: Partial<BorradorAsistente>) {
  Object.assign(borrador, cambios)
  await buscarOpciones()
  await nextTick()
  document.getElementById('titulo-opciones')?.focus()
  anunciar(`${cantidadEnPalabras(opciones.value.length)}.`)
}

const descripcionOpciones = computed(() => {
  const partes: string[] = []
  if (especialidadElegida.value) partes.push(`de ${nombreCompleto(especialidadElegida.value)}`)
  const centro = centros.value.find((item) => item.id === borrador.centroId)
  if (centro) partes.push(`en ${centro.nombre}`)
  if (borrador.lat !== null) partes.push('cerca de tu ubicación')
  else if (borrador.localidad) partes.push(`cerca de ${borrador.localidad}`)
  if (borrador.desde) partes.push(`desde el ${diaDeCampoEnPalabras(borrador.desde)}`)
  if (borrador.franja) partes.push(NOMBRES_FRANJA[borrador.franja])
  return `Turnos libres ${partes.join(', ')}.`
})

// ===== Paso 5: revisá y confirmá =====
const ficha = ref<FichaTurno | null>(null)
const cargandoFicha = ref(false)
const confirmando = ref(false)
const resultado = ref<{ motivo: string; mensaje: string; conflicto?: Conflicto } | null>(null)
// "Lo tomó otra persona": turnos parecidos para elegir sin perder lo demás.
const alternativas = ref<TurnoEncontrado[]>([])
const alternativaElegida = ref<number | null>(null)
const errorAlternativa = ref<string | undefined>()

const MOTIVOS_SIN_TURNO = ['tomado', 'vencido', 'no_existe']
const sinTurno = computed(() => MOTIVOS_SIN_TURNO.includes(resultado.value?.motivo ?? ''))

async function cargarFicha() {
  resultado.value = null
  alternativas.value = []
  if (borrador.turnoId === null) return
  cargandoFicha.value = true
  const { datos } = await cargarTurno(borrador.turnoId)
  cargandoFicha.value = false
  ficha.value = datos
  // Mientras la persona no estaba, el turno pudo haberse ocupado o pasado.
  if (!datos) await mostrarAlternativas('no_existe')
  else if (!datos.disponible) await mostrarAlternativas('tomado')
}

async function mostrarAlternativas(motivo: string) {
  resultado.value = { motivo, mensaje: mensajeReserva(motivo) }
  errorAlternativa.value = undefined
  alternativaElegida.value = null
  // Los más cercanos de la misma especialidad, en cualquier día y horario.
  const filtros = { ...filtrosDelBorrador(borrador), centroId: null, desde: '', franja: null }
  const { datos } = await buscarTurnos(filtros, puntoDeReferencia())
  alternativas.value = (datos ?? []).filter((turno) => turno.id !== borrador.turnoId)
}

async function elegirAlternativa() {
  if (alternativaElegida.value === null) {
    errorAlternativa.value = 'Elegí uno de los turnos de la lista.'
    document.querySelector<HTMLElement>('[name="asistente-alternativa"]')?.focus()
    anunciar(errorAlternativa.value)
    return
  }
  borrador.turnoId = alternativaElegida.value
  await cargarFicha()
  await nextTick()
  titulo.value?.focus()
  anunciar(`Elegiste otro turno. Revisalo y confirmá. ${resumenElegido.value}`)
}

async function irAIngresar() {
  guardarBorrador()
  await navigateTo({ path: '/ingresar', query: { volver: '/asistente' } })
}

async function confirmar(confirmarSuperposicion: boolean) {
  if (confirmando.value) return
  // Por las dudas (un borrador viejo), revisamos que no falte nada.
  const falta = pasoIncompleto(borrador)
  if (falta !== null) {
    await irAPaso(falta)
    error.value = validarPaso(falta, borrador)
    return
  }
  if (!conSesion.value) {
    await irAIngresar()
    return
  }

  confirmando.value = true
  resultado.value = null
  anunciar('Confirmando tu turno…')
  // La base vuelve a revisar que el turno siga libre y que no se superponga con otro tuyo.
  const respuesta = await reservarTurno(borrador.turnoId!, {
    confirmarSuperposicion,
    segundos: segundosDesde(borrador.inicio),
  })
  confirmando.value = false

  if (respuesta.ok) {
    cargado.value = false
    borrarBorrador()
    await navigateTo({ path: `/mis-turnos/${respuesta.numero}`, query: { nuevo: '1' } })
    return
  }
  if (respuesta.motivo === 'sin_sesion') {
    await irAIngresar()
    return
  }
  if (MOTIVOS_SIN_TURNO.includes(respuesta.motivo)) {
    await mostrarAlternativas(respuesta.motivo)
  } else {
    resultado.value = { motivo: respuesta.motivo, mensaje: respuesta.mensaje, conflicto: respuesta.conflicto }
  }
  await nextTick()
  document.getElementById('resultado-confirmar')?.focus()
  anunciar(
    sinTurno.value ? `${resultado.value!.mensaje} Te mostramos otros turnos cerca.` : resultado.value!.mensaje,
    true,
  )
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <p class="progreso">Paso {{ borrador.paso + 1 }} de {{ TOTAL_PASOS }}</p>
    <h1 ref="titulo" tabindex="-1">{{ pregunta }}</h1>

    <Aviso v-if="catalogo?.error" tipo="error">
      <p>{{ catalogo.error }}</p>
    </Aviso>
    <Aviso v-if="avisoInicio" tipo="atencion">
      <p>{{ avisoInicio }}</p>
    </Aviso>

    <LeerEnVoz :texto="textoDelPaso" etiqueta="Escuchar esta pantalla" />

    <!-- 1. Contanos qué necesitás (se puede saltar) -->
    <template v-if="borrador.paso === 0">
      <form class="tarjeta pila" novalidate @submit.prevent="interpretar">
        <div class="campo-texto">
          <label for="asistente-pedido">Escribí lo que necesitás, como se lo dirías a alguien</label>
          <p id="asistente-pedido-ayuda" class="texto-suave">
            Por ejemplo: "necesito un turno con el oculista cerca de casa". También podés decirlo con tu voz.
          </p>
          <p v-if="errorPedido" id="asistente-pedido-error" class="error-campo">
            <span aria-hidden="true">✕</span> {{ errorPedido }}
          </p>
          <textarea
            id="asistente-pedido"
            v-model="textoPedido"
            rows="3"
            maxlength="300"
            :aria-invalid="errorPedido ? 'true' : undefined"
            :aria-describedby="errorPedido ? 'asistente-pedido-error asistente-pedido-ayuda' : 'asistente-pedido-ayuda'"
          />
        </div>
        <DictarBoton @texto="(dicho) => (textoPedido = dicho)" />
        <div>
          <Boton type="submit">{{ interpretando ? 'Leyendo tu pedido…' : 'Seguir' }}</Boton>
        </div>

        <div id="resultado-pedido" tabindex="-1">
          <Aviso v-if="pedidoFallo" tipo="atencion" titulo="Vamos paso a paso">
            <p>{{ pedidoFallo }} No pasa nada: te hacemos unas preguntas cortas.</p>
            <div class="acciones aviso-acciones">
              <Boton @click="seguirPasoAPaso">Seguir paso a paso</Boton>
            </div>
          </Aviso>
          <Aviso v-else-if="pedido?.entendido" tipo="info" titulo="¿Es así?">
            <p>{{ pedido.explicacion }}</p>
            <div class="acciones aviso-acciones">
              <Boton @click="siEsAsi">Sí, seguir</Boton>
              <Boton variante="secundario" @click="irAPaso(1)">No, elegir yo</Boton>
            </div>
          </Aviso>
          <Aviso v-else-if="pedido" tipo="atencion" titulo="Vamos paso a paso">
            <p>{{ pedido.explicacion }} Te hacemos unas preguntas cortas.</p>
            <div class="acciones aviso-acciones">
              <Boton @click="seguirPasoAPaso">Seguir paso a paso</Boton>
            </div>
          </Aviso>
        </div>
      </form>
      <p>
        <Boton variante="texto" class="enlace-boton" @click="irAPaso(1)">Prefiero elegir yo, sin escribir</Boton>
      </p>
    </template>

    <!-- 2. ¿Qué médico necesitás? -->
    <form v-else-if="borrador.paso === 1" class="tarjeta pila" novalidate @submit.prevent="siguiente">
      <ElegirEspecialidad
        id="asistente-especialidad"
        v-model:texto="textoEspecialidad"
        v-model:especialidad-id="borrador.especialidadId"
        :especialidades="especialidades"
        :error="error"
      />
      <div class="acciones">
        <Boton type="submit">Siguiente</Boton>
        <Boton variante="secundario" @click="volver">Volver</Boton>
      </div>
    </form>

    <!-- 3. ¿Dónde te queda cómodo? -->
    <form v-else-if="borrador.paso === 2" class="tarjeta pila" novalidate @submit.prevent="siguiente">
      <p>Te mostramos primero los turnos más cerca. Si no elegís nada, buscamos en todos lados.</p>
      <Aviso v-if="borrador.cerca" tipo="info" titulo="Cerca de tu casa">
        <p>Nos dijiste que lo querés cerca de tu casa. Revisá tu localidad o usá tu ubicación.</p>
      </Aviso>

      <Aviso v-if="borrador.lat !== null" tipo="exito" titulo="Usamos tu ubicación">
        <p>Ordenamos los turnos por cercanía a donde estás ahora.</p>
        <button type="button" class="boton boton--texto enlace-boton" @click="dejarDeUsarUbicacion">
          Prefiero elegir una localidad
        </button>
      </Aviso>
      <template v-else>
        <div>
          <Boton variante="secundario" @click="usarMiUbicacion">
            <span aria-hidden="true">📍</span>
            {{ estadoUbicacion === 'buscando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación' }}
          </Boton>
        </div>
        <Aviso v-if="estadoUbicacion === 'no-se-pudo'" tipo="atencion" titulo="No sabemos dónde estás">
          <p>{{ mensajeUbicacion }}</p>
        </Aviso>
        <div class="campo-lista">
          <label for="asistente-localidad">O elegí tu localidad</label>
          <p
            v-if="localidadDelPerfil && borrador.localidad === localidadDelPerfil"
            id="asistente-localidad-ayuda"
            class="texto-suave"
          >
            Es la localidad de tu perfil. Podés cambiarla.
          </p>
          <select
            id="asistente-localidad"
            v-model="borrador.localidad"
            :aria-describedby="localidadDelPerfil && borrador.localidad === localidadDelPerfil ? 'asistente-localidad-ayuda' : undefined"
          >
            <option value="">Cualquier lugar</option>
            <option v-for="localidad in localidades" :key="localidad.nombre" :value="localidad.nombre">
              {{ localidad.nombre }}
            </option>
          </select>
        </div>
      </template>

      <div class="campo-lista">
        <label for="asistente-centro">Centro de salud <span class="texto-suave">(opcional)</span></label>
        <select id="asistente-centro" v-model="borrador.centroId">
          <option :value="null">Cualquier centro</option>
          <option v-for="centro in centros" :key="centro.id" :value="centro.id">
            {{ centro.nombre }} — {{ centro.localidad }}
          </option>
        </select>
      </div>

      <div class="acciones">
        <Boton type="submit">Siguiente</Boton>
        <Boton variante="secundario" @click="volver">Volver</Boton>
      </div>
    </form>

    <!-- 4. ¿Qué día y hora? -->
    <form v-else-if="borrador.paso === 3" class="tarjeta pila" novalidate @submit.prevent="siguiente">
      <fieldset>
        <legend>¿A qué hora te queda mejor?</legend>
        <div class="franjas">
          <OpcionTarjeta
            v-for="franja in OPCIONES_FRANJA"
            :key="franja.valor"
            v-model="franjaElegida"
            nombre="asistente-franja"
            :valor="franja.valor"
            :titulo="franja.titulo"
            :descripcion="franja.descripcion"
            :icono="franja.icono"
          />
        </div>
      </fieldset>
      <Campo
        id="asistente-desde"
        v-model="borrador.desde"
        type="date"
        etiqueta="Desde el día"
        ayuda="Si no elegís un día, te mostramos los turnos más próximos."
        :error="errorDesde"
      />

      <section class="pila" aria-labelledby="titulo-opciones">
        <h2 id="titulo-opciones" tabindex="-1">
          {{ buscando ? 'Buscando turnos…' : cantidadEnPalabras(opciones.length) }}
        </h2>
        <p class="texto-suave">{{ descripcionOpciones }}</p>

        <Aviso v-if="errorBusqueda" tipo="error">
          <p>{{ errorBusqueda }}</p>
          <Boton variante="secundario" @click="buscarCon({})">Probar de nuevo</Boton>
        </Aviso>

        <p v-if="error" class="error-campo"><span aria-hidden="true">✕</span> {{ error }}</p>

        <template v-if="opciones.length > 0">
          <OpcionesTurno
            v-model="borrador.turnoId"
            :turnos="opciones"
            nombre="asistente-turno"
            leyenda="Elegí el turno que te queda mejor"
          />
          <p class="texto-suave">Datos de prueba: los centros, profesionales y turnos son inventados.</p>
        </template>

        <!-- Sin turnos: otras opciones (como en /buscar) -->
        <template v-else-if="!buscando && !errorBusqueda && !errorDesde">
          <Aviso tipo="atencion" titulo="No hay turnos libres con lo que elegiste">
            <p>Probá con alguna de estas opciones:</p>
          </Aviso>
          <ul class="alternativas">
            <li v-if="borrador.desde">
              <Boton variante="secundario" @click="buscarCon({ desde: '' })">Buscar en todas las fechas</Boton>
            </li>
            <li v-if="borrador.franja">
              <Boton variante="secundario" @click="buscarCon({ franja: null })">Buscar a cualquier hora</Boton>
            </li>
            <li v-if="borrador.centroId !== null">
              <Boton variante="secundario" @click="buscarCon({ centroId: null })">Buscar en otros centros</Boton>
            </li>
            <li>
              <Boton variante="secundario" @click="irAPaso(1)">Elegir otra especialidad</Boton>
            </li>
          </ul>
        </template>
      </section>

      <div class="acciones">
        <Boton type="submit">Siguiente</Boton>
        <Boton variante="secundario" @click="volver">Volver</Boton>
      </div>
    </form>

    <!-- 5. Revisá y confirmá -->
    <div v-else class="pila">
      <Aviso tipo="info" titulo="Todavía no reservaste nada">
        <p>El turno queda reservado recién cuando tocás "Confirmar turno".</p>
        <p v-if="ayudando">El turno es para <strong>{{ ayudando.nombre }}</strong>.</p>
      </Aviso>

      <p v-if="cargandoFicha">Cargando el turno…</p>

      <dl v-if="ficha && !sinTurno" class="tarjeta resumen">
        <div class="resumen__fila">
          <dt>Qué</dt>
          <dd>
            <strong>{{ nombreCompleto(ficha.especialidad) }}</strong><br />
            Te atiende {{ ficha.profesional }}.
          </dd>
          <dd>
            <button type="button" class="boton boton--texto" @click="irAPaso(1)">
              Cambiar<span class="sr-only"> el médico</span>
            </button>
          </dd>
        </div>
        <div class="resumen__fila">
          <dt>Cuándo</dt>
          <dd>
            <strong>{{ conMayuscula(turnoEnPalabras(ficha.inicio)) }}</strong><br />
            Dura unos {{ ficha.duracionMin }} minutos.
          </dd>
          <dd>
            <button type="button" class="boton boton--texto" @click="irAPaso(3)">
              Cambiar<span class="sr-only"> el día y la hora</span>
            </button>
          </dd>
        </div>
        <div class="resumen__fila">
          <dt>Dónde</dt>
          <dd>
            <strong>{{ ficha.centro.nombre }}</strong><br />
            {{ ficha.centro.direccion }}, {{ ficha.centro.localidad }}
          </dd>
          <dd>
            <button type="button" class="boton boton--texto" @click="irAPaso(2)">
              Cambiar<span class="sr-only"> el lugar</span>
            </button>
          </dd>
        </div>
        <div class="resumen__fila">
          <dt>Qué tenés que llevar</dt>
          <dd>
            <ul class="requisitos">
              <li v-for="requisito in ficha.requisitos" :key="requisito">{{ requisito }}</li>
            </ul>
          </dd>
        </div>
      </dl>

      <div id="resultado-confirmar" class="pila" tabindex="-1">
        <!-- Lo tomó otra persona (o ya pasó): otros turnos, sin perder lo demás -->
        <template v-if="sinTurno && resultado">
          <Aviso tipo="atencion" :titulo="resultado.mensaje">
            <p>Te mostramos otros turnos de {{ especialidadElegida?.nombreSimple ?? 'la misma especialidad' }} cerca. Lo demás que elegiste queda igual.</p>
          </Aviso>
          <template v-if="alternativas.length > 0">
            <p v-if="errorAlternativa" class="error-campo"><span aria-hidden="true">✕</span> {{ errorAlternativa }}</p>
            <OpcionesTurno
              v-model="alternativaElegida"
              :turnos="alternativas"
              :cuantos="3"
              nombre="asistente-alternativa"
              leyenda="Otros turnos libres"
            />
            <div class="acciones">
              <Boton @click="elegirAlternativa">Elegir este turno</Boton>
              <Boton variante="secundario" @click="irAPaso(3)">Buscar otro día</Boton>
            </div>
          </template>
          <template v-else>
            <p>No encontramos otros turnos libres cerca.</p>
            <div>
              <Boton @click="irAPaso(3)">Buscar otro día</Boton>
            </div>
          </template>
        </template>

        <!-- Ya tiene otro turno ese día o muy cerca -->
        <Aviso
          v-else-if="resultado?.motivo === 'superpuesto'"
          tipo="atencion"
          :titulo="ayudando ? `${ayudando.nombre} ya tiene un turno cerca de ese horario` : 'Ya tenés un turno cerca de ese horario'"
        >
          <p v-if="resultado.conflicto">
            {{ ayudando ? 'Tiene' : 'Tenés' }} el turno N.º {{ resultado.conflicto.numero }} de {{ resultado.conflicto.especialidad }},
            {{ turnoEnPalabras(resultado.conflicto.inicio) }}, en {{ resultado.conflicto.centro }}.
          </p>
          <p>¿Querés reservar este también?</p>
          <div class="acciones aviso-acciones">
            <Boton @click="confirmar(true)">Sí, reservar igual</Boton>
            <Boton variante="secundario" @click="irAPaso(3)">Elegir otro día</Boton>
          </div>
          <p v-if="resultado.conflicto">
            <NuxtLink :to="`/mis-turnos/${resultado.conflicto.numero}`">Ver el turno que ya tenés</NuxtLink>
          </p>
        </Aviso>

        <Aviso v-else-if="resultado" tipo="error">
          <p>{{ resultado.mensaje }}</p>
        </Aviso>
      </div>

      <!-- Acompañante sin permiso para sacar turnos: se explica y no se ofrece confirmar -->
      <Aviso v-if="ayudando && !puedoHacer('reservar')" tipo="atencion">
        <p>{{ mensajeReserva('sin_permiso', { nombre: ayudando.nombre, accion: 'reservar' }) }}</p>
      </Aviso>
      <template v-else-if="!sinTurno && resultado?.motivo !== 'superpuesto'">
        <Aviso v-if="!conSesion" tipo="info" titulo="Para confirmar, ingresá a tu cuenta">
          <p>Lo que elegiste queda guardado. Después de ingresar, volvés a esta pantalla.</p>
        </Aviso>
        <div class="acciones">
          <Boton @click="confirmar(false)">
            {{ confirmando ? 'Confirmando…' : conSesion ? 'Confirmar turno' : 'Ingresar para confirmar' }}
          </Boton>
          <Boton variante="secundario" @click="volver">Volver</Boton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.campo-texto,
.campo-lista {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}

textarea {
  resize: vertical;
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}

.enlace-boton {
  padding-inline: 0;
}

/* Botones dentro de un aviso: un poco de aire arriba. */
.aviso-acciones {
  margin-block: var(--espacio-3) var(--espacio-2);
}

.franjas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

.alternativas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

#resultado-pedido:empty,
#resultado-confirmar:empty {
  display: none;
}

/* Resumen "Revisá y confirmá", como "Revisá tus datos" del registro. */
.resumen {
  margin: 0;
}

.resumen__fila {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--espacio-3);
  padding-block: var(--espacio-2);
  border-top: var(--grosor-borde) solid var(--borde);
}

.resumen__fila:first-child {
  border-top: 0;
}

.resumen dt {
  flex: 1 1 100%;
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.resumen dd {
  margin: 0;
}

.resumen dd:first-of-type {
  flex: 1 1 12rem;
  overflow-wrap: anywhere;
}

.requisitos {
  padding-left: 1.2em;
}
</style>
