<!--
  Registro con un dato por pantalla (RF-01). Al final, "Revisá tus datos" y se crea la cuenta.
  Lo cargado se guarda en sessionStorage (menos la contraseña): si se recarga la página, no se pierde.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'invitado' })
useSeoMeta({ title: 'Crear una cuenta' })

type ClaveDato = keyof DatosRegistro

type Paso = {
  clave: ClaveDato
  pregunta: string
  etiqueta: string
  ayuda?: string
  type?: 'text' | 'email' | 'tel' | 'date'
  autocomplete?: string
  inputmode?: 'text' | 'numeric' | 'tel' | 'email'
  validar: (valor: string) => string | undefined
}

const PASOS: Paso[] = [
  {
    clave: 'nombre',
    pregunta: '¿Cuál es tu nombre?',
    etiqueta: 'Nombre',
    autocomplete: 'given-name',
    validar: (valor) => validarRequerido(valor, 'Escribí tu nombre.'),
  },
  {
    clave: 'apellido',
    pregunta: '¿Cuál es tu apellido?',
    etiqueta: 'Apellido',
    autocomplete: 'family-name',
    validar: (valor) => validarRequerido(valor, 'Escribí tu apellido.'),
  },
  {
    clave: 'dni',
    pregunta: '¿Cuál es tu número de documento?',
    etiqueta: 'Número de DNI',
    ayuda: 'Solo los números. Si lo escribís con puntos, también está bien.',
    inputmode: 'numeric',
    autocomplete: 'off',
    validar: validarDni,
  },
  {
    clave: 'fechaNacimiento',
    pregunta: '¿Cuándo naciste?',
    etiqueta: 'Fecha de nacimiento',
    ayuda: 'Día, mes y año.',
    type: 'date',
    autocomplete: 'bday',
    validar: (valor) => validarFechaNacimiento(valor),
  },
  {
    clave: 'correo',
    pregunta: '¿Cuál es tu correo electrónico?',
    etiqueta: 'Correo electrónico',
    ayuda: 'Te vamos a mandar un correo para activar la cuenta.',
    type: 'email',
    autocomplete: 'email',
    inputmode: 'email',
    validar: validarCorreo,
  },
  {
    clave: 'telefono',
    pregunta: '¿Cuál es tu número de teléfono?',
    etiqueta: 'Teléfono',
    ayuda: 'Con el código de área. Por ejemplo: 11 4567 8901.',
    type: 'tel',
    autocomplete: 'tel',
    inputmode: 'tel',
    validar: validarTelefono,
  },
  {
    clave: 'localidad',
    pregunta: '¿En qué localidad vivís?',
    etiqueta: 'Localidad',
    ayuda: 'Así te mostramos los centros de salud más cerca. Por ejemplo: General Pacheco.',
    autocomplete: 'address-level2',
    validar: (valor) => validarRequerido(valor, 'Escribí tu localidad.'),
  },
  {
    clave: 'rol',
    pregunta: '¿Para qué vas a usar Turnos Accesibles?',
    etiqueta: 'Uso de la cuenta',
    validar: (valor) => (valor ? undefined : 'Elegí una de las dos opciones.'),
  },
  {
    clave: 'clave',
    pregunta: 'Elegí una contraseña',
    etiqueta: 'Contraseña',
    ayuda: 'Como mínimo 8 letras o números, con al menos un número.',
    validar: validarClave,
  },
]

const ROLES: { valor: Rol; titulo: string; descripcion: string }[] = [
  { valor: 'solicitante', titulo: 'Solicitante', descripcion: 'Quiero sacar turnos para mí.' },
  { valor: 'acompanante', titulo: 'Acompañante', descripcion: 'Quiero ayudar a alguien de confianza.' },
]

const CLAVE_BORRADOR = 'ta_registro_borrador'

const { registrarse } = useSesion()
const { anunciar } = useAnuncio()

const datos = reactive<Record<ClaveDato, string>>({
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: '',
  correo: '',
  telefono: '',
  localidad: '',
  rol: '',
  clave: '',
})

const pantalla = ref<'paso' | 'revisar' | 'enviado'>('paso')
const indice = ref(0)
const error = ref<string | undefined>()
const desdeRevisar = ref(false)
const resultado = ref<{ mensaje: string; ofrecerRecuperar?: boolean } | null>(null)
const enviando = ref(false)
const titulo = ref<HTMLElement | null>(null)

const paso = computed(() => PASOS[indice.value]!)
const idCampo = computed(() => `registro-${paso.value.clave}`)

function textoDelDato(clave: ClaveDato): string {
  if (clave === 'clave') return '••••••••'
  if (clave === 'rol') return ROLES.find((rol) => rol.valor === datos.rol)?.titulo ?? ''
  if (clave === 'fechaNacimiento' && datos.fechaNacimiento) {
    return new Date(`${datos.fechaNacimiento}T12:00:00`).toLocaleDateString('es-AR', { dateStyle: 'long' })
  }
  return datos[clave]
}

async function enfocarTitulo(mensaje: string) {
  await nextTick()
  titulo.value?.focus()
  anunciar(mensaje)
}

function irAPaso(nuevo: number) {
  pantalla.value = 'paso'
  indice.value = nuevo
  error.value = undefined
  enfocarTitulo(`Paso ${nuevo + 1} de ${PASOS.length}. ${PASOS[nuevo]!.pregunta}`)
}

function irARevisar() {
  pantalla.value = 'revisar'
  desdeRevisar.value = false
  error.value = undefined
  enfocarTitulo('Revisá tus datos antes de crear la cuenta.')
}

function siguiente() {
  error.value = paso.value.validar(datos[paso.value.clave])
  if (error.value) {
    // El campo del paso; en el paso del rol, la primera opción.
    const campo = document.getElementById(idCampo.value) ?? document.querySelector<HTMLElement>('[name="registro-rol"]')
    campo?.focus()
    anunciar(error.value)
    return
  }
  if (desdeRevisar.value || indice.value === PASOS.length - 1) {
    irARevisar()
  } else {
    irAPaso(indice.value + 1)
  }
}

function volver() {
  if (pantalla.value === 'revisar') {
    irAPaso(PASOS.length - 1)
  } else if (indice.value > 0) {
    irAPaso(indice.value - 1)
  }
}

function cambiarDato(i: number) {
  desdeRevisar.value = true
  irAPaso(i)
}

async function crearCuenta() {
  if (enviando.value) {
    return
  }
  // Por las dudas (por ejemplo, un borrador viejo), revisamos todo otra vez.
  const conError = PASOS.findIndex((p) => p.validar(datos[p.clave]))
  if (conError >= 0) {
    desdeRevisar.value = true
    irAPaso(conError)
    error.value = PASOS[conError]!.validar(datos[PASOS[conError]!.clave])
    return
  }

  enviando.value = true
  resultado.value = null
  anunciar('Creando tu cuenta…')
  const respuesta = await registrarse({ ...datos, rol: datos.rol as Rol })
  enviando.value = false

  if (!respuesta.ok) {
    resultado.value = respuesta
    return
  }
  datos.clave = ''
  sessionStorage.removeItem(CLAVE_BORRADOR)
  pantalla.value = 'enviado'
  enfocarTitulo('Te mandamos un correo para activar tu cuenta.')
}

// --- Borrador en sessionStorage (nunca la contraseña) ---
onMounted(() => {
  try {
    const guardado = JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR) ?? 'null')
    if (guardado && typeof guardado === 'object') {
      for (const p of PASOS) {
        if (p.clave !== 'clave' && typeof guardado.datos?.[p.clave] === 'string') {
          datos[p.clave] = guardado.datos[p.clave]
        }
      }
      const guardadoIndice = Number(guardado.indice)
      if (Number.isInteger(guardadoIndice) && guardadoIndice >= 0 && guardadoIndice < PASOS.length) {
        indice.value = guardadoIndice
      }
    }
  } catch {
    // Si el borrador está roto, empezamos de cero.
  }
})

watch([datos, indice], () => {
  if (pantalla.value === 'enviado') {
    return
  }
  const { clave: _clave, ...sinClave } = datos
  sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: sinClave, indice: indice.value }))
})
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <!-- Un paso -->
    <template v-if="pantalla === 'paso'">
      <p class="progreso">Paso {{ indice + 1 }} de {{ PASOS.length }}</p>
      <h1 ref="titulo" tabindex="-1">{{ paso.pregunta }}</h1>

      <form class="tarjeta pila" novalidate @submit.prevent="siguiente">
        <fieldset v-if="paso.clave === 'rol'" :aria-describedby="error ? `${idCampo}-error` : undefined">
          <legend class="sr-only">{{ paso.pregunta }}</legend>
          <p v-if="error" :id="`${idCampo}-error`" class="error-campo">
            <span aria-hidden="true">✕</span> {{ error }}
          </p>
          <div class="opciones">
            <OpcionTarjeta
              v-for="rol in ROLES"
              :key="rol.valor"
              v-model="datos.rol"
              nombre="registro-rol"
              :valor="rol.valor"
              :titulo="rol.titulo"
              :descripcion="rol.descripcion"
            />
          </div>
        </fieldset>

        <CampoClave
          v-else-if="paso.clave === 'clave'"
          :id="idCampo"
          v-model="datos.clave"
          autocomplete="new-password"
          :ayuda="paso.ayuda"
          :error="error"
        />

        <Campo
          v-else
          :id="idCampo"
          :key="paso.clave"
          v-model="datos[paso.clave]"
          :etiqueta="paso.etiqueta"
          :type="paso.type"
          :autocomplete="paso.autocomplete"
          :inputmode="paso.inputmode"
          :ayuda="paso.ayuda"
          :error="error"
          requerido
        />

        <div class="acciones">
          <Boton type="submit">{{ desdeRevisar ? 'Listo' : 'Siguiente' }}</Boton>
          <Boton v-if="indice > 0 && !desdeRevisar" variante="secundario" @click="volver">Volver</Boton>
        </div>
      </form>

      <p v-if="indice === 0">¿Ya tenés cuenta? <NuxtLink to="/ingresar">Ingresá</NuxtLink></p>
    </template>

    <!-- Revisar -->
    <template v-else-if="pantalla === 'revisar'">
      <p class="progreso">Último paso</p>
      <h1 ref="titulo" tabindex="-1">Revisá tus datos</h1>
      <p class="pagina__bajada">Si algo está mal, tocá "Cambiar".</p>

      <Aviso v-if="resultado" tipo="error">
        <p>{{ resultado.mensaje }}</p>
        <p v-if="resultado.ofrecerRecuperar">
          <NuxtLink :to="{ path: '/ingresar', query: { correo: datos.correo } }">Ingresar</NuxtLink>
          ·
          <NuxtLink :to="{ path: '/recuperar', query: { correo: datos.correo } }">Crear una contraseña nueva</NuxtLink>
        </p>
      </Aviso>

      <dl class="tarjeta resumen">
        <div v-for="(p, i) in PASOS" :key="p.clave" class="resumen__fila">
          <dt>{{ p.etiqueta }}</dt>
          <dd>{{ textoDelDato(p.clave) }}</dd>
          <dd>
            <button type="button" class="boton boton--texto" @click="cambiarDato(i)">
              Cambiar<span class="sr-only"> {{ p.etiqueta.toLowerCase() }}</span>
            </button>
          </dd>
        </div>
      </dl>

      <div class="acciones">
        <Boton @click="crearCuenta">{{ enviando ? 'Creando la cuenta…' : 'Crear mi cuenta' }}</Boton>
        <Boton variante="secundario" @click="volver">Volver</Boton>
      </div>
    </template>

    <!-- Enviado -->
    <template v-else>
      <h1 ref="titulo" tabindex="-1">Te mandamos un correo</h1>
      <Aviso tipo="exito" titulo="Falta un paso">
        <p>
          Abrí el correo que te mandamos a <strong>{{ datos.correo }}</strong> y tocá el enlace para
          activar tu cuenta.
        </p>
        <p>Si no lo ves, buscalo en "Correo no deseado". Puede tardar unos minutos.</p>
      </Aviso>
      <div class="acciones">
        <Boton to="/ingresar">Ir a ingresar</Boton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.opciones {
  display: grid;
  gap: var(--espacio-2);
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  margin-bottom: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}

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
</style>
