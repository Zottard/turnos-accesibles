<!--
  Perfil: ver y editar los datos personales. El tipo de cuenta no se cambia desde acá.
  v0.5: también se puede cambiar el correo (Supabase pide confirmarlo con un enlace).
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mi perfil' })

const { cargarPerfil, guardarPerfil } = usePerfil()
const { usuario, cambiarCorreo } = useSesion()
const { anunciar } = useAnuncio()

const { data: cargado } = await useAsyncData('perfil', () => cargarPerfil())

const NOMBRES_ROL = { solicitante: 'Solicitante', acompanante: 'Acompañante', admin: 'Administración' }

const datos = reactive<DatosPerfil>({
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: '',
  telefono: '',
  localidad: '',
})

// Copia los datos traídos de la base al formulario.
watch(
  () => cargado.value?.datos,
  (perfil) => {
    if (perfil) {
      const { rol: _rol, ...editables } = perfil
      Object.assign(datos, editables)
    }
  },
  { immediate: true },
)

type ClaveCampo = keyof DatosPerfil

const CAMPOS: {
  clave: ClaveCampo
  etiqueta: string
  type?: 'text' | 'tel' | 'date'
  autocomplete: string
  inputmode?: 'numeric' | 'tel'
  validar: (valor: string) => string | undefined
}[] = [
  { clave: 'nombre', etiqueta: 'Nombre', autocomplete: 'given-name', validar: (v) => validarRequerido(v, 'Escribí tu nombre.') },
  { clave: 'apellido', etiqueta: 'Apellido', autocomplete: 'family-name', validar: (v) => validarRequerido(v, 'Escribí tu apellido.') },
  { clave: 'dni', etiqueta: 'Número de DNI', autocomplete: 'off', inputmode: 'numeric', validar: validarDni },
  { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', type: 'date', autocomplete: 'bday', validar: (v) => validarFechaNacimiento(v) },
  { clave: 'telefono', etiqueta: 'Teléfono', type: 'tel', autocomplete: 'tel', inputmode: 'tel', validar: validarTelefono },
  { clave: 'localidad', etiqueta: 'Localidad', autocomplete: 'address-level2', validar: (v) => validarRequerido(v, 'Escribí tu localidad.') },
]

const errores = ref<Partial<Record<ClaveCampo, string>>>({})
const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
const guardando = ref(false)

const listaErrores = computed(() =>
  CAMPOS.filter((campo) => errores.value[campo.clave]).map((campo) => ({
    id: `perfil-${campo.clave}`,
    mensaje: errores.value[campo.clave]!,
  })),
)

// --- Cambiar el correo (v0.5) ---
const correoNuevo = ref('')
const errorCorreo = ref<string | undefined>()
const resultadoCorreo = ref<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
const cambiandoCorreo = ref(false)

async function cambiarMiCorreo() {
  if (cambiandoCorreo.value) return
  resultadoCorreo.value = null
  errorCorreo.value = validarCorreo(correoNuevo.value)
  if (!errorCorreo.value && correoNuevo.value.trim().toLowerCase() === usuario.value?.email) {
    errorCorreo.value = 'Ese ya es tu correo.'
  }
  if (errorCorreo.value) {
    document.getElementById('perfil-correo-nuevo')?.focus()
    return
  }
  cambiandoCorreo.value = true
  const respuesta = await cambiarCorreo(correoNuevo.value)
  cambiandoCorreo.value = false
  resultadoCorreo.value = respuesta.ok
    ? {
        tipo: 'exito',
        mensaje:
          'Te mandamos un correo a la dirección nueva (y puede que también a la de antes). Tocá el enlace para confirmar el cambio. Hasta entonces, seguís usando la de antes.',
      }
    : { tipo: 'error', mensaje: respuesta.mensaje }
  anunciar(resultadoCorreo.value.mensaje, !respuesta.ok)
}

async function guardar() {
  if (guardando.value) {
    return
  }
  resultado.value = null
  errores.value = {}
  for (const campo of CAMPOS) {
    const error = campo.validar(datos[campo.clave])
    if (error) {
      errores.value[campo.clave] = error
    }
  }
  const primero = listaErrores.value[0]
  if (primero) {
    document.getElementById(primero.id)?.focus()
    return
  }

  guardando.value = true
  const respuesta = await guardarPerfil(datos)
  guardando.value = false
  resultado.value = respuesta.ok
    ? { tipo: 'exito', mensaje: 'Guardamos tus datos.' }
    : { tipo: 'error', mensaje: respuesta.mensaje }
  anunciar(resultado.value.mensaje, !respuesta.ok)
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <h1>Mi perfil</h1>

    <Aviso v-if="cargado?.error" tipo="error">
      <p>{{ cargado.error }}</p>
    </Aviso>

    <template v-else-if="cargado?.datos">
      <dl class="tarjeta cuenta">
        <div>
          <dt>Correo electrónico</dt>
          <dd>{{ usuario?.email }}</dd>
        </div>
        <div>
          <dt>Tipo de cuenta</dt>
          <dd>{{ NOMBRES_ROL[cargado.datos.rol] }}</dd>
        </div>
      </dl>

      <!-- v0.5: si un correo de aviso rebotó, acá se puede cambiar la dirección. -->
      <section class="pila" aria-labelledby="titulo-correo">
        <h2 id="titulo-correo" tabindex="-1">Tu correo</h2>
        <p>Lo usás para ingresar y te mandamos ahí los avisos. Si está mal escrito o ya no lo usás, cambialo.</p>
        <Aviso v-if="resultadoCorreo" :tipo="resultadoCorreo.tipo">
          <p>{{ resultadoCorreo.mensaje }}</p>
        </Aviso>
        <form class="tarjeta pila" novalidate @submit.prevent="cambiarMiCorreo">
          <Campo
            id="perfil-correo-nuevo"
            v-model="correoNuevo"
            etiqueta="Correo nuevo"
            type="email"
            autocomplete="email"
            inputmode="email"
            :error="errorCorreo"
            requerido
          />
          <Boton type="submit" variante="secundario">{{ cambiandoCorreo ? 'Guardando…' : 'Cambiar mi correo' }}</Boton>
        </form>
      </section>

      <section class="pila" aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Tus datos</h2>
        <ResumenErrores :errores="listaErrores" />
        <Aviso v-if="resultado" :tipo="resultado.tipo">
          <p>{{ resultado.mensaje }}</p>
        </Aviso>

        <form class="tarjeta pila" novalidate @submit.prevent="guardar">
          <Campo
            v-for="campo in CAMPOS"
            :id="`perfil-${campo.clave}`"
            :key="campo.clave"
            v-model="datos[campo.clave]"
            :etiqueta="campo.etiqueta"
            :type="campo.type"
            :autocomplete="campo.autocomplete"
            :inputmode="campo.inputmode"
            :error="errores[campo.clave]"
            requerido
          />
          <Boton type="submit">{{ guardando ? 'Guardando…' : 'Guardar los cambios' }}</Boton>
        </form>
      </section>

      <section class="pila" aria-labelledby="titulo-accesibilidad">
        <h2 id="titulo-accesibilidad">Cómo ves la página</h2>
        <p>Tamaño de letra, contraste, voz y avisos.</p>
        <div>
          <Boton to="/perfil/accesibilidad" variante="secundario">Cambiar mis preferencias</Boton>
        </div>
      </section>

      <section class="pila" aria-labelledby="titulo-acompanantes">
        <h2 id="titulo-acompanantes">Personas que te ayudan</h2>
        <p>Quién puede ver tus turnos o sacarte turnos, y la constancia de cada permiso.</p>
        <div>
          <Boton to="/acompanantes" variante="secundario">Ver o invitar</Boton>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.cuenta {
  display: grid;
  gap: var(--espacio-3);
  margin: 0;
}

.cuenta dt {
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto-suave);
}

.cuenta dd {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
