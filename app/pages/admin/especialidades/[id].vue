<!--
  Cargar o cambiar una especialidad (RF-08). /admin/especialidades/nueva crea una.
  Dar de baja la saca de la búsqueda; con turnos reservados, la base no lo deja y mostramos esos turnos.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { cargarEspecialidad, guardarEspecialidad } = useAdmin()
const { anunciar } = useAnuncio()

const esNueva = computed(() => route.params.id === 'nueva')
const id = computed(() => (esNueva.value ? null : Number(route.params.id)))

const { data: especialidad } = await useAsyncData(`admin-especialidad-${route.params.id}`, async () =>
  id.value === null ? null : cargarEspecialidad(id.value),
)

const formulario = reactive<DatosEspecialidad>({ ...ESPECIALIDAD_VACIA })
const activaAntes = ref(false)
const nombreGuardado = ref('')

function copiarAlFormulario(datos: EspecialidadAdmin | null | undefined) {
  if (!datos) return
  Object.assign(formulario, {
    nombre: datos.nombre,
    nombreSimple: datos.nombreSimple,
    descripcion: datos.descripcion,
    palabrasClave: datos.palabrasClave.join(', '),
    activa: datos.activa,
  })
  activaAntes.value = datos.activa
  nombreGuardado.value = nombreCompleto(datos)
}
copiarAlFormulario(especialidad.value?.datos)

useSeoMeta({ title: () => (esNueva.value ? 'Agregar una especialidad' : `Especialidad: ${nombreGuardado.value}`) })

const noExiste = computed(
  () => !esNueva.value && especialidad.value && !especialidad.value.error && !especialidad.value.datos,
)

const errores = ref<ErrorCampo[]>([])
const errorDe = (campo: string) => errores.value.find((error) => error.id === `especialidad-${campo}`)?.mensaje
const guardando = ref(false)
const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string; turnos?: TurnoReservado[] } | null>(
  route.query.guardado ? { tipo: 'exito', mensaje: 'Guardamos la especialidad.' } : null,
)
const confirmandoBaja = ref(false)
const palabrasVistaPrevia = computed(() => palabrasClaveDesdeTexto(formulario.palabrasClave))

async function mostrarResultado() {
  await nextTick()
  document.getElementById('resultado-especialidad')?.focus()
  if (resultado.value) anunciar(resultado.value.mensaje, resultado.value.tipo === 'error')
}

async function guardar() {
  if (guardando.value) return
  resultado.value = null
  errores.value = validarEspecialidad(formulario)
  if (errores.value.length > 0) {
    document.getElementById(errores.value[0]!.id)?.focus()
    return
  }
  guardando.value = true
  const respuesta = await guardarEspecialidad(id.value, formulario)
  guardando.value = false
  confirmandoBaja.value = false
  if (!respuesta.ok) {
    if (respuesta.turnos) formulario.activa = activaAntes.value
    resultado.value = { tipo: 'error', mensaje: respuesta.mensaje, turnos: respuesta.turnos }
    await mostrarResultado()
    return
  }
  if (esNueva.value) {
    await navigateTo(`/admin/especialidades/${respuesta.id}?guardado=1`)
    return
  }
  const leida = await cargarEspecialidad(respuesta.id!)
  copiarAlFormulario(leida.datos)
  resultado.value = {
    tipo: 'exito',
    mensaje: activaAntes.value
      ? 'Guardamos los cambios. Ya se ven en la búsqueda.'
      : 'Guardamos los cambios. La especialidad está dada de baja: no aparece en la búsqueda.',
  }
  await mostrarResultado()
}

async function darDeBaja() {
  formulario.activa = false
  await guardar()
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <p><NuxtLink to="/admin/especialidades">Volver a las especialidades</NuxtLink></p>
    <h1>{{ esNueva ? 'Agregar una especialidad' : nombreGuardado || 'Especialidad' }}</h1>

    <Aviso v-if="especialidad?.error" tipo="error">
      <p>{{ especialidad.error }}</p>
    </Aviso>
    <Aviso v-else-if="noExiste" tipo="atencion" titulo="No encontramos esta especialidad">
      <p>Puede que la dirección esté mal escrita.</p>
    </Aviso>

    <template v-else>
      <div id="resultado-especialidad" tabindex="-1">
        <Aviso v-if="resultado" :tipo="resultado.tipo">
          <p>{{ resultado.mensaje }}</p>
          <TurnosReservados v-if="resultado.turnos" :turnos="resultado.turnos" />
        </Aviso>
      </div>

      <ResumenErrores :errores="errores" />

      <form class="formulario-admin" novalidate @submit.prevent="guardar">
        <section class="tarjeta pila" aria-labelledby="titulo-nombres">
          <h2 id="titulo-nombres">Nombres</h2>
          <Campo
            id="especialidad-nombre"
            v-model="formulario.nombre"
            etiqueta="Nombre técnico"
            ayuda='Como figura en el sistema de salud. Por ejemplo: "Oftalmología".'
            requerido
            :error="errorDe('nombre')"
          />
          <Campo
            id="especialidad-simple"
            v-model="formulario.nombreSimple"
            etiqueta="Nombre simple"
            ayuda='Como lo dice la gente. Por ejemplo: "Oculista".'
            requerido
            :error="errorDe('simple')"
          />
          <Campo
            id="especialidad-descripcion"
            v-model="formulario.descripcion"
            etiqueta="Qué atiende, en una frase"
            ayuda='Por ejemplo: "Revisa la vista y los ojos."'
            requerido
            :error="errorDe('descripcion')"
          />
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-palabras">
          <h2 id="titulo-palabras">Palabras clave</h2>
          <div class="campo-lista">
            <label for="especialidad-palabras">Cómo la busca la gente <span class="campo-opcional">(opcional)</span></label>
            <p id="especialidad-palabras-ayuda" class="texto-suave">Separadas por comas. Por ejemplo: ojos, vista, anteojos.</p>
            <textarea
              id="especialidad-palabras"
              v-model="formulario.palabrasClave"
              rows="3"
              aria-describedby="especialidad-palabras-ayuda"
            />
          </div>
          <p v-if="palabrasVistaPrevia.length > 0" class="texto-suave">
            Se guardan así: {{ palabrasVistaPrevia.join(', ') }}.
          </p>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-estado">
          <h2 id="titulo-estado">Estado</h2>
          <Interruptor
            id="especialidad-activa"
            v-model="formulario.activa"
            etiqueta="Activa en la búsqueda"
            ayuda="Si la apagás, deja de aparecer. No se puede si tiene turnos reservados."
          />
        </section>

        <div class="acciones">
          <Boton type="submit">{{ guardando ? 'Guardando…' : esNueva ? 'Guardar la especialidad' : 'Guardar los cambios' }}</Boton>
          <Boton to="/admin/especialidades" variante="secundario">Cancelar</Boton>
        </div>
      </form>

      <section v-if="!esNueva && activaAntes" class="tarjeta pila baja" aria-labelledby="titulo-baja">
        <h2 id="titulo-baja">Dar de baja esta especialidad</h2>
        <p>Deja de aparecer en la búsqueda. La podés volver a activar cuando quieras.</p>
        <div v-if="!confirmandoBaja">
          <Boton variante="peligro" @click="confirmandoBaja = true">Dar de baja</Boton>
        </div>
        <div v-else class="pila">
          <p><strong>¿Seguro que la das de baja?</strong></p>
          <div class="acciones">
            <Boton variante="peligro" @click="darDeBaja">Sí, dar de baja</Boton>
            <Boton variante="secundario" @click="confirmandoBaja = false">No, dejarla activa</Boton>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.baja {
  max-width: 44rem;
  border-top-color: var(--error);
}

.campo-opcional {
  font-family: var(--fuente-texto);
  font-weight: 400;
  color: var(--texto-suave);
}
</style>
