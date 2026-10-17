<!--
  Invitar a alguien (RF-07): una pregunta por pantalla.
    1. ¿Cómo se llama?   2. ¿Cuál es su correo?   3. ¿Qué puede hacer?
    4. Confirmá el permiso: "Autorizo a Lucía a ..." con una casilla (consentimiento explícito).
  Al confirmar, la base guarda la constancia (fecha, hora y alcance) y devuelve el enlace de la
  invitación, que vence a los 7 días. La pantalla final lo deja copiar o mandar por WhatsApp; si el
  correo está configurado, además se lo mandamos.
  "Volver" no pierde nada. No hay borrador guardado: son pocos datos y los tiene que confirmar.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { invitar, mandarPorCorreo } = useAcompanantes()
const { cargarPerfil } = usePerfil()
const { anunciar } = useAnuncio()
const { registrar } = useEventos()

const PREGUNTAS = ['¿Cómo se llama la persona?', '¿Cuál es su correo?', '¿Qué puede hacer?', 'Confirmá el permiso'] as const
const paso = ref(0)
const listo = ref<{ token: string; venceEn: string; porCorreo: boolean } | null>(null)
const titulo = computed(() => (listo.value ? `Listo: invitaste a ${datos.nombre.trim()}` : PREGUNTAS[paso.value]!))
useSeoMeta({ title: () => (listo.value ? 'Invitación lista' : `Paso ${paso.value + 1} de 4: ${PREGUNTAS[paso.value]}`) })

const datos = reactive({ nombre: '', correo: '', alcance: [] as string[], consiento: false })
const error = ref<string | undefined>()
const enviando = ref(false)
const tituloRef = ref<HTMLElement | null>(null)

// El nombre de quien invita, para el mensaje de WhatsApp ("Rosa te invita...").
const { data: perfil } = await useAsyncData('perfil-invitar', async () => (await cargarPerfil()).datos)
const miNombre = computed(() => perfil.value?.nombre ?? '')

const nombre = computed(() => datos.nombre.trim() || 'la persona')
const alcance = computed(() => normalizarAlcance(datos.alcance))
const frasePermiso = computed(() => `Autorizo a ${nombre.value} a ${alcanceEnPalabras(alcance.value, 'propio')}.`)

async function irAPaso(nuevo: number) {
  paso.value = nuevo
  error.value = undefined
  await nextTick()
  tituloRef.value?.focus()
  anunciar(`Paso ${nuevo + 1} de 4. ${PREGUNTAS[nuevo]}${nuevo === 3 ? ` ${frasePermiso.value}` : ''}`)
}

function validar(): string | undefined {
  if (paso.value === 0) return validarRequerido(datos.nombre, 'Escribí el nombre de la persona.')
  if (paso.value === 1) {
    return datos.correo.trim() === '' ? 'Escribí el correo de la persona.' : validarCorreo(datos.correo)
  }
  if (paso.value === 3 && !datos.consiento) return mensajeAcompanamiento('sin_consentimiento')
  return undefined
}

const ID_CAMPO = ['invitar-nombre', 'invitar-correo', '', 'invitar-consiento']

async function siguiente() {
  error.value = validar()
  if (error.value) {
    document.getElementById(ID_CAMPO[paso.value] ?? '')?.focus()
    anunciar(error.value, true)
    return
  }
  if (paso.value < 3) {
    await irAPaso(paso.value + 1)
    return
  }
  await confirmar()
}

async function confirmar() {
  if (enviando.value) return
  enviando.value = true
  anunciar('Guardando el permiso…')
  const respuesta = await invitar({
    nombre: datos.nombre,
    correo: datos.correo,
    alcance: alcance.value,
    consiento: datos.consiento,
  })
  if (!respuesta.ok) {
    enviando.value = false
    // Si el problema es el correo, volvemos a esa pregunta.
    if (respuesta.motivo === 'es_tu_correo' || respuesta.motivo === 'ya_invitado') {
      await irAPaso(1)
    }
    error.value = respuesta.mensaje
    anunciar(respuesta.mensaje, true)
    return
  }
  registrar('acompanante_invitar')
  const porCorreo = await mandarPorCorreo(respuesta.token)
  enviando.value = false
  listo.value = { token: respuesta.token, venceEn: respuesta.venceEn, porCorreo }
  await nextTick()
  tituloRef.value?.focus()
  anunciar(`${titulo.value}. Ahora mandale el enlace de la invitación.`)
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <p v-if="!listo">
      <NuxtLink to="/acompanantes"><span aria-hidden="true">←</span> Volver a Personas que te ayudan</NuxtLink>
    </p>
    <p v-if="!listo" class="progreso">Paso {{ paso + 1 }} de 4</p>
    <h1 ref="tituloRef" tabindex="-1">{{ titulo }}</h1>

    <!-- Resultado: el enlace para mandar -->
    <template v-if="listo">
      <Aviso tipo="exito" titulo="Guardamos el permiso">
        <p>Autorizaste a {{ nombre }} a {{ alcanceEnPalabras(alcance, 'tuyo') }}.</p>
        <p>Va a poder hacerlo recién cuando acepte la invitación.</p>
      </Aviso>
      <section class="tarjeta pila" aria-labelledby="titulo-mandar">
        <h2 id="titulo-mandar">Mandale la invitación</h2>
        <p v-if="listo.porCorreo">Ya le mandamos un correo a {{ datos.correo.trim().toLowerCase() }}. También podés mandarle el enlace vos.</p>
        <p v-else>Copiá el enlace y mandáselo, o compartilo por WhatsApp.</p>
        <p class="texto-suave">
          Tiene que aceptarla con el correo {{ datos.correo.trim().toLowerCase() }}. La invitación vence el
          {{ momentoEnPalabras(listo.venceEn) }}.
        </p>
        <CompartirInvitacion :token="listo.token" :nombre-quien-invita="miNombre" />
      </section>
      <div class="acciones">
        <Boton to="/acompanantes">Ver Personas que te ayudan</Boton>
      </div>
    </template>

    <form v-else class="tarjeta pila" novalidate @submit.prevent="siguiente">
      <!-- 1. Nombre -->
      <Campo
        v-if="paso === 0"
        id="invitar-nombre"
        v-model="datos.nombre"
        etiqueta="Nombre"
        autocomplete="off"
        ayuda="Por ejemplo: Lucía. Es para que sepas a quién invitaste."
        :error="error"
        requerido
      />

      <!-- 2. Correo -->
      <Campo
        v-else-if="paso === 1"
        id="invitar-correo"
        v-model="datos.correo"
        etiqueta="Correo electrónico"
        type="email"
        autocomplete="off"
        inputmode="email"
        :ayuda="`Con este correo ${nombre} va a ingresar a Turnos Accesibles para aceptar.`"
        :error="error"
        requerido
      />

      <!-- 3. Qué puede hacer -->
      <fieldset v-else-if="paso === 2">
        <legend>Elegí qué puede hacer {{ nombre }}</legend>
        <div class="opciones">
          <p class="siempre">
            <span aria-hidden="true">✓</span>
            <span>
              <strong>Ver mis turnos</strong><br />
              <span class="texto-suave">Siempre. Solo los turnos: nunca tus datos personales ni de tu salud.</span>
            </span>
          </p>
          <OpcionCasilla
            v-model="datos.alcance"
            nombre="invitar-alcance"
            valor="reservar"
            :titulo="TEXTOS_ALCANCE.reservar.titulo"
            descripcion="Puede pedirte turnos nuevos."
            icono="🩺"
          />
          <OpcionCasilla
            v-model="datos.alcance"
            nombre="invitar-alcance"
            valor="cancelar"
            :titulo="TEXTOS_ALCANCE.cancelar.titulo"
            descripcion="Puede cancelar tus turnos o cambiarles la fecha."
            icono="↻"
          />
        </div>
      </fieldset>

      <!-- 4. Consentimiento explícito -->
      <template v-else>
        <dl class="resumen">
          <div>
            <dt>A quién</dt>
            <dd>{{ datos.nombre.trim() }} ({{ datos.correo.trim().toLowerCase() }})</dd>
          </div>
          <div>
            <dt>Qué va a poder hacer</dt>
            <dd>
              <ul>
                <li v-for="accion in alcance" :key="accion">{{ TEXTOS_ALCANCE[accion].titulo }}</li>
              </ul>
            </dd>
          </div>
        </dl>
        <p v-if="error" id="invitar-consiento-error" class="error-campo"><span aria-hidden="true">✕</span> {{ error }}</p>
        <label class="consentimiento">
          <input
            id="invitar-consiento"
            v-model="datos.consiento"
            type="checkbox"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'invitar-consiento-error' : undefined"
          />
          <span>{{ frasePermiso }} Puedo quitarle el permiso cuando quiera.</span>
        </label>
        <p class="texto-suave">Guardamos esta autorización con la fecha y la hora. La podés ver cuando quieras.</p>
      </template>

      <div class="acciones">
        <Boton type="submit">{{ paso === 3 ? (enviando ? 'Guardando…' : 'Confirmar') : 'Siguiente' }}</Boton>
        <Boton v-if="paso > 0" variante="secundario" @click="irAPaso(paso - 1)">Volver</Boton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.opciones {
  display: grid;
  gap: var(--espacio-2);
  margin-top: var(--espacio-2);
}

.siempre {
  display: flex;
  gap: var(--espacio-3);
  max-width: none;
  padding: var(--espacio-3);
  background: var(--fondo-exito);
  border: var(--grosor-borde) solid var(--exito);
  border-radius: var(--radio-tarjeta);
}

.resumen {
  display: grid;
  gap: var(--espacio-2);
  margin: 0;
}

.resumen dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.resumen dd {
  margin: 0;
}

.consentimiento {
  display: flex;
  align-items: flex-start;
  gap: var(--espacio-3);
  padding: var(--espacio-3);
  background: var(--fondo-info);
  border: 3px solid var(--primario);
  border-radius: var(--radio-tarjeta);
  cursor: pointer;
}

.consentimiento input {
  margin-top: 0.2rem;
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}
</style>
