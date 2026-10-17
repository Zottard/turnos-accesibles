<!--
  Agendas (RF-08): cargar los turnos de un profesional y dar de baja los turnos libres.
  - Antes de confirmar se ve cuántos turnos se van a crear (vistaPreviaAgenda, mismo cálculo que la base).
  - generar_agenda rechaza todo si algún turno se superpone con otro del profesional y dice cuáles.
  - dar_de_baja_agenda no da de baja nada si en esas fechas hay turnos reservados.
  /admin/agendas?profesional=3 abre con ese profesional elegido.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Agendas' })

const route = useRoute()
const { cargarProfesionales, cargarAgenda, generarAgenda, darDeBajaAgenda } = useAdmin()
const { anunciar } = useAnuncio()

const { data: profesionales } = await useAsyncData('admin-agendas-profesionales', () => cargarProfesionales())
const lista = computed(() => profesionales.value?.datos ?? [])

const hoy = fechaClave(new Date())
const pedido = Number(route.query.profesional)
const profesionalId = ref<number | null>(lista.value.some((item) => item.id === pedido) ? pedido : null)
const profesional = computed(() => lista.value.find((item) => item.id === profesionalId.value) ?? null)

function nombreProfesional(item: ProfesionalAdmin) {
  const especialidad = item.especialidad ? nombreCompleto(item.especialidad) : ''
  return `${item.nombre} — ${especialidad} — ${item.centro?.nombre ?? ''}`
}

// --- Resumen de la agenda que ya tiene ---
const agenda = ref<{ inicio: string; estado: string }[] | null>(null)
async function leerAgenda() {
  agenda.value = null
  if (profesionalId.value === null) return
  agenda.value = (await cargarAgenda(profesionalId.value)).datos
}
watch(profesionalId, leerAgenda)
onMounted(leerAgenda)

const resumenAgenda = computed(() => {
  if (!agenda.value) return null
  const vigentes = agenda.value.filter((turno) => turno.estado !== 'baja')
  return {
    libres: vigentes.filter((turno) => turno.estado === 'disponible').length,
    tomados: vigentes.filter((turno) => turno.estado === 'reservado').length,
    primero: vigentes[0]?.inicio ?? null,
    ultimo: vigentes[vigentes.length - 1]?.inicio ?? null,
  }
})

// --- Cargar turnos ---
const formulario = reactive<DatosAgenda>({
  profesionalId: null,
  desde: sumarDias(hoy, 1),
  hasta: sumarDias(hoy, 14),
  dias: ['1', '2', '3', '4', '5'],
  horaDesde: '08:00',
  horaHasta: '12:00',
  duracion: '20',
  requisitos: '',
})
watchEffect(() => {
  formulario.profesionalId = profesionalId.value
})

const errores = ref<ErrorCampo[]>([])
const errorDe = (campo: string) => errores.value.find((error) => error.id === `agenda-${campo}`)?.mensaje
const previa = computed(() => vistaPreviaAgenda(formulario))
const textoPrevia = computed(() => {
  if (validarAgenda(formulario, hoy).some((error) => error.id !== 'agenda-profesional')) return ''
  const cantidad = previa.value.length
  if (cantidad === 0) return 'Con estos días y horarios no se arma ningún turno.'
  if (cantidad > MAXIMO_TURNOS_AGENDA) return `Son más de ${MAXIMO_TURNOS_AGENDA} turnos: cargá menos días.`
  const primero = previa.value[0]!
  const ultimo = previa.value[cantidad - 1]!
  return (
    `Se van a crear ${cantidad === 1 ? '1 turno' : `${cantidad} turnos`}: ` +
    `del ${diaDeCampoEnPalabras(primero.dia)} al ${diaDeCampoEnPalabras(ultimo.dia)}, ` +
    `de ${Number(formulario.horaDesde.slice(0, 2))}:${formulario.horaDesde.slice(3)} a ` +
    `${Number(formulario.horaHasta.slice(0, 2))}:${formulario.horaHasta.slice(3)}, cada ${Number(formulario.duracion)} minutos.`
  )
})

const cargando = ref(false)
const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string; conflictos?: ConflictoAgenda[] } | null>(null)
const especialidadCargada = ref<number | null>(null)

async function mostrar(id: string, mensaje: string, urgente: boolean) {
  await nextTick()
  document.getElementById(id)?.focus()
  anunciar(mensaje, urgente)
}

async function cargar() {
  if (cargando.value) return
  resultado.value = null
  errores.value = validarAgenda(formulario, hoy)
  if (errores.value.length > 0) {
    document.getElementById(errores.value[0]!.id)?.focus()
    return
  }
  cargando.value = true
  const respuesta = await generarAgenda(formulario)
  cargando.value = false
  if (respuesta.ok) {
    const cantidad = respuesta.cantidad ?? 0
    especialidadCargada.value = profesional.value?.especialidadId ?? null
    resultado.value = {
      tipo: 'exito',
      mensaje: `Listo: cargamos ${cantidad === 1 ? '1 turno' : `${cantidad} turnos`} para ${profesional.value?.nombre}. Ya aparecen en la búsqueda.`,
    }
    await leerAgenda()
  } else {
    resultado.value = { tipo: 'error', mensaje: respuesta.mensaje, conflictos: respuesta.conflictos }
  }
  await mostrar('resultado-agenda', resultado.value.mensaje, !respuesta.ok)
}

// --- Dar de baja turnos libres ---
const baja = reactive({ desde: sumarDias(hoy, 1), hasta: sumarDias(hoy, 14) })
const erroresBaja = ref<ErrorCampo[]>([])
const errorBajaDe = (campo: string) => erroresBaja.value.find((error) => error.id === `baja-${campo}`)?.mensaje
const confirmandoBaja = ref(false)
const resultadoBaja = ref<{ tipo: 'exito' | 'error'; mensaje: string; turnos?: TurnoReservado[] } | null>(null)

function pedirConfirmacionBaja() {
  resultadoBaja.value = null
  erroresBaja.value = []
  if (profesionalId.value === null) erroresBaja.value.push({ id: 'agenda-profesional', mensaje: 'Elegí el profesional.' })
  const rango = validarRangoFechas(baja.desde, baja.hasta)
  if (!esFechaValida(baja.desde)) erroresBaja.value.push({ id: 'baja-desde', mensaje: 'Elegí desde qué día.' })
  else if (!esFechaValida(baja.hasta)) erroresBaja.value.push({ id: 'baja-hasta', mensaje: 'Elegí hasta qué día.' })
  else if (rango) erroresBaja.value.push({ id: `baja-${rango.campo}`, mensaje: rango.mensaje })
  if (erroresBaja.value.length > 0) {
    document.getElementById(erroresBaja.value[0]!.id)?.focus()
    return
  }
  confirmandoBaja.value = true
}

async function darDeBaja() {
  if (cargando.value || profesionalId.value === null) return
  cargando.value = true
  const respuesta = await darDeBajaAgenda(profesionalId.value, baja.desde, baja.hasta)
  cargando.value = false
  confirmandoBaja.value = false
  if (respuesta.ok) {
    const cantidad = respuesta.cantidad ?? 0
    resultadoBaja.value = {
      tipo: 'exito',
      mensaje:
        cantidad === 0
          ? 'No había turnos libres en esas fechas.'
          : `Listo: dimos de baja ${cantidad === 1 ? '1 turno libre' : `${cantidad} turnos libres`}. Ya no aparecen en la búsqueda.`,
    }
    await leerAgenda()
  } else {
    resultadoBaja.value = { tipo: 'error', mensaje: respuesta.mensaje, turnos: respuesta.turnos }
  }
  await mostrar('resultado-baja', resultadoBaja.value.mensaje, !respuesta.ok)
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Agendas</h1>
    <p class="pagina__bajada">Cargá los turnos de un profesional. Aparecen enseguida en la búsqueda.</p>

    <Aviso v-if="profesionales?.error" tipo="error">
      <p>{{ profesionales.error }}</p>
    </Aviso>

    <section class="tarjeta pila formulario-admin" aria-labelledby="titulo-profesional">
      <h2 id="titulo-profesional">¿De quién es la agenda?</h2>
      <div class="campo-lista">
        <label for="agenda-profesional">Profesional</label>
        <p v-if="errorDe('profesional') || errorBajaDe('profesional')" id="agenda-profesional-error" class="error-campo">
          <span aria-hidden="true">✕</span> Elegí el profesional.
        </p>
        <select
          id="agenda-profesional"
          v-model="profesionalId"
          :aria-invalid="errorDe('profesional') ? 'true' : undefined"
          :aria-describedby="errorDe('profesional') ? 'agenda-profesional-error' : undefined"
        >
          <option :value="null">Elegí el profesional</option>
          <option v-for="item in lista" :key="item.id" :value="item.id">{{ nombreProfesional(item) }}</option>
        </select>
      </div>
      <p v-if="profesionalId === null" class="texto-suave">
        ¿No está en la lista? <NuxtLink to="/admin/profesionales/nuevo">Agregá el profesional</NuxtLink>.
      </p>
      <div v-else-if="resumenAgenda" aria-live="polite">
        <p v-if="resumenAgenda.primero">
          Desde hoy tiene {{ resumenAgenda.libres }} turnos libres y {{ resumenAgenda.tomados }} tomados,
          del {{ diaEnPalabras(resumenAgenda.primero) }} al {{ diaEnPalabras(resumenAgenda.ultimo!) }}.
        </p>
        <p v-else>Todavía no tiene turnos cargados desde hoy.</p>
      </div>
    </section>

    <!-- Cargar turnos -->
    <section class="pila" aria-labelledby="titulo-cargar">
      <h2 id="titulo-cargar">Cargar turnos</h2>

      <div id="resultado-agenda" tabindex="-1">
        <Aviso v-if="resultado" :tipo="resultado.tipo">
          <p>{{ resultado.mensaje }}</p>
          <template v-if="resultado.conflictos?.length">
            <p>Estos son los turnos que chocan:</p>
            <ul>
              <li v-for="conflicto in resultado.conflictos" :key="conflicto.inicio">
                {{ conMayuscula(turnoEnPalabras(conflicto.inicio)) }}: choca con el turno de las
                {{ horaEnPalabras(conflicto.existente) }}.
              </li>
            </ul>
            <p>Cambiá el horario o las fechas, o dá de baja esos turnos primero.</p>
          </template>
          <div v-if="resultado.tipo === 'exito' && especialidadCargada" class="aviso-acciones">
            <Boton :to="`/buscar?esp=${especialidadCargada}`" variante="secundario">Verlos en la búsqueda</Boton>
          </div>
        </Aviso>
      </div>

      <ResumenErrores :errores="errores" />

      <form class="formulario-admin" novalidate @submit.prevent="cargar">
        <div class="tarjeta pila">
          <h3>Fechas</h3>
          <div class="fila-campos">
            <Campo id="agenda-desde" v-model="formulario.desde" etiqueta="Desde el día" type="date" requerido :error="errorDe('desde')" />
            <Campo id="agenda-hasta" v-model="formulario.hasta" etiqueta="Hasta el día" type="date" requerido :error="errorDe('hasta')" />
          </div>
          <fieldset>
            <legend id="agenda-dias" tabindex="-1">Qué días de la semana atiende</legend>
            <p v-if="errorDe('dias')" class="error-campo"><span aria-hidden="true">✕</span> {{ errorDe('dias') }}</p>
            <div class="dias">
              <OpcionCasilla
                v-for="dia in DIAS_SEMANA"
                :key="dia.valor"
                v-model="formulario.dias"
                nombre="agenda-dia"
                :valor="String(dia.valor)"
                :titulo="dia.nombre"
              />
            </div>
          </fieldset>
        </div>

        <div class="tarjeta pila">
          <h3>Horario</h3>
          <div class="fila-campos">
            <Campo id="agenda-hora-desde" v-model="formulario.horaDesde" etiqueta="Empieza a las" type="time" requerido :error="errorDe('hora-desde')" />
            <Campo id="agenda-hora-hasta" v-model="formulario.horaHasta" etiqueta="Termina a las" type="time" requerido :error="errorDe('hora-hasta')" />
            <Campo
              id="agenda-duracion"
              v-model="formulario.duracion"
              etiqueta="Cada turno dura (minutos)"
              type="number"
              inputmode="numeric"
              requerido
              :error="errorDe('duracion')"
            />
          </div>
          <div class="campo-lista">
            <label for="agenda-requisitos">Qué tiene que llevar la persona <span class="campo-opcional">(opcional)</span></label>
            <p id="agenda-requisitos-ayuda" class="texto-suave">
              Una cosa por renglón. Si lo dejás vacío: "Llevá tu DNI" y la credencial de la obra social.
            </p>
            <textarea id="agenda-requisitos" v-model="formulario.requisitos" rows="3" aria-describedby="agenda-requisitos-ayuda" />
          </div>
        </div>

        <Aviso v-if="textoPrevia" tipo="info" titulo="Antes de confirmar">
          <p aria-live="polite">{{ textoPrevia }}</p>
        </Aviso>

        <div>
          <Boton type="submit">{{ cargando ? 'Cargando…' : 'Cargar los turnos' }}</Boton>
        </div>
      </form>
    </section>

    <!-- Dar de baja -->
    <section class="pila" aria-labelledby="titulo-baja">
      <h2 id="titulo-baja">Dar de baja turnos libres</h2>
      <p>Saca de la búsqueda los turnos libres del profesional en esas fechas. Los reservados no se tocan.</p>

      <div id="resultado-baja" tabindex="-1">
        <Aviso v-if="resultadoBaja" :tipo="resultadoBaja.tipo">
          <p>{{ resultadoBaja.mensaje }}</p>
          <TurnosReservados v-if="resultadoBaja.turnos" :turnos="resultadoBaja.turnos" />
        </Aviso>
      </div>

      <ResumenErrores :errores="erroresBaja" />

      <form class="formulario-admin tarjeta pila baja" novalidate @submit.prevent="pedirConfirmacionBaja">
        <div class="fila-campos">
          <Campo id="baja-desde" v-model="baja.desde" etiqueta="Desde el día" type="date" requerido :error="errorBajaDe('desde')" />
          <Campo id="baja-hasta" v-model="baja.hasta" etiqueta="Hasta el día" type="date" requerido :error="errorBajaDe('hasta')" />
        </div>
        <div v-if="!confirmandoBaja">
          <Boton type="submit" variante="peligro">Dar de baja los turnos libres</Boton>
        </div>
        <div v-else class="pila">
          <p>
            <strong>¿Das de baja los turnos libres de {{ profesional?.nombre }}</strong>
            del {{ diaDeCampoEnPalabras(baja.desde) }} al {{ diaDeCampoEnPalabras(baja.hasta) }}?
          </p>
          <div class="acciones">
            <Boton variante="peligro" @click="darDeBaja">{{ cargando ? 'Dando de baja…' : 'Sí, dar de baja' }}</Boton>
            <Boton variante="secundario" @click="confirmandoBaja = false">No</Boton>
          </div>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.dias {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 9rem), 1fr));
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}

.campo-opcional {
  font-family: var(--fuente-texto);
  font-weight: 400;
  color: var(--texto-suave);
}

.aviso-acciones {
  margin-top: var(--espacio-3);
}

.baja {
  border-top-color: var(--error);
}
</style>
