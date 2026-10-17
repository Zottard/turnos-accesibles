<!--
  Cargar o cambiar un profesional (RF-08). /admin/profesionales/nuevo crea uno.
  Borrar: no se puede con turnos reservados (los mostramos) ni si tuvo reservas (quedan como registro).
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { cargarProfesionales, cargarEspecialidades, cargarCentros, guardarProfesional, borrarProfesional } = useAdmin()
const { anunciar } = useAnuncio()

const esNuevo = computed(() => route.params.id === 'nuevo')
const id = computed(() => (esNuevo.value ? null : Number(route.params.id)))

const { data: listas } = await useAsyncData(`admin-profesional-${route.params.id}`, async () => {
  const [profesionales, especialidades, centros] = await Promise.all([
    cargarProfesionales(),
    cargarEspecialidades(),
    cargarCentros(),
  ])
  return {
    profesionales: profesionales.datos,
    especialidades: especialidades.datos,
    centros: centros.datos,
    error: profesionales.error ?? especialidades.error ?? centros.error,
  }
})

const profesional = computed(() => listas.value?.profesionales?.find((item) => item.id === id.value) ?? null)
const noExiste = computed(() => !esNuevo.value && listas.value && !listas.value.error && !profesional.value)

const formulario = reactive<DatosProfesional>({
  nombre: profesional.value?.nombre ?? '',
  especialidadId: profesional.value?.especialidadId ?? null,
  centroId: profesional.value?.centroId ?? null,
})
const nombreGuardado = ref(profesional.value?.nombre ?? '')

useSeoMeta({ title: () => (esNuevo.value ? 'Agregar un profesional' : `Profesional: ${nombreGuardado.value}`) })

const errores = ref<ErrorCampo[]>([])
const errorDe = (campo: string) => errores.value.find((error) => error.id === `profesional-${campo}`)?.mensaje
const guardando = ref(false)
const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string; turnos?: TurnoReservado[] } | null>(
  route.query.guardado ? { tipo: 'exito', mensaje: 'Guardamos el profesional. Ahora podés cargar su agenda.' } : null,
)
const confirmandoBorrar = ref(false)

async function mostrarResultado() {
  await nextTick()
  document.getElementById('resultado-profesional')?.focus()
  if (resultado.value) anunciar(resultado.value.mensaje, resultado.value.tipo === 'error')
}

async function guardar() {
  if (guardando.value) return
  resultado.value = null
  errores.value = validarProfesional(formulario)
  if (errores.value.length > 0) {
    document.getElementById(errores.value[0]!.id)?.focus()
    return
  }
  guardando.value = true
  const respuesta = await guardarProfesional(id.value, formulario)
  guardando.value = false
  if (!respuesta.ok) {
    resultado.value = { tipo: 'error', mensaje: respuesta.mensaje }
    await mostrarResultado()
    return
  }
  if (esNuevo.value) {
    await navigateTo(`/admin/profesionales/${respuesta.id}?guardado=1`)
    return
  }
  nombreGuardado.value = formulario.nombre.trim()
  resultado.value = { tipo: 'exito', mensaje: 'Guardamos los cambios.' }
  await mostrarResultado()
}

async function borrar() {
  if (id.value === null || guardando.value) return
  guardando.value = true
  const respuesta = await borrarProfesional(id.value)
  guardando.value = false
  confirmandoBorrar.value = false
  if (respuesta.ok) {
    await navigateTo({ path: '/admin/profesionales', query: { borrado: nombreGuardado.value } })
    return
  }
  resultado.value = { tipo: 'error', mensaje: respuesta.mensaje, turnos: respuesta.turnos }
  await mostrarResultado()
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <p><NuxtLink to="/admin/profesionales">Volver a los profesionales</NuxtLink></p>
    <h1>{{ esNuevo ? 'Agregar un profesional' : nombreGuardado || 'Profesional' }}</h1>

    <Aviso v-if="listas?.error" tipo="error">
      <p>{{ listas.error }}</p>
    </Aviso>
    <Aviso v-else-if="noExiste" tipo="atencion" titulo="No encontramos este profesional">
      <p>Puede que lo hayan borrado.</p>
    </Aviso>

    <template v-else>
      <div id="resultado-profesional" tabindex="-1">
        <Aviso v-if="resultado" :tipo="resultado.tipo">
          <p>{{ resultado.mensaje }}</p>
          <TurnosReservados v-if="resultado.turnos" :turnos="resultado.turnos" />
        </Aviso>
      </div>

      <ResumenErrores :errores="errores" />

      <form class="formulario-admin tarjeta pila" novalidate @submit.prevent="guardar">
        <Campo
          id="profesional-nombre"
          v-model="formulario.nombre"
          etiqueta="Nombre"
          ayuda='Con el título. Por ejemplo: "Dra. Ana Pérez".'
          requerido
          :error="errorDe('nombre')"
        />
        <div class="campo-lista">
          <label for="profesional-especialidad">Especialidad</label>
          <p v-if="errorDe('especialidad')" id="profesional-especialidad-error" class="error-campo">
            <span aria-hidden="true">✕</span> {{ errorDe('especialidad') }}
          </p>
          <select
            id="profesional-especialidad"
            v-model="formulario.especialidadId"
            :aria-invalid="errorDe('especialidad') ? 'true' : undefined"
            :aria-describedby="errorDe('especialidad') ? 'profesional-especialidad-error' : undefined"
          >
            <option :value="null">Elegí la especialidad</option>
            <option v-for="especialidad in listas?.especialidades ?? []" :key="especialidad.id" :value="especialidad.id">
              {{ nombreCompleto(especialidad) }}{{ especialidad.activa ? '' : ' — dada de baja' }}
            </option>
          </select>
        </div>
        <div class="campo-lista">
          <label for="profesional-centro">Centro donde atiende</label>
          <p v-if="errorDe('centro')" id="profesional-centro-error" class="error-campo">
            <span aria-hidden="true">✕</span> {{ errorDe('centro') }}
          </p>
          <select
            id="profesional-centro"
            v-model="formulario.centroId"
            :aria-invalid="errorDe('centro') ? 'true' : undefined"
            :aria-describedby="errorDe('centro') ? 'profesional-centro-error' : undefined"
          >
            <option :value="null">Elegí el centro</option>
            <option v-for="centro in listas?.centros ?? []" :key="centro.id" :value="centro.id">
              {{ centro.nombre }} — {{ centro.localidad }}{{ centro.activo ? '' : ' (sin publicar)' }}
            </option>
          </select>
        </div>
        <p v-if="!esNuevo" class="texto-suave">
          Si tiene turnos en la agenda, no se le puede cambiar el centro ni la especialidad: primero hay que darlos de baja.
        </p>
        <div class="acciones">
          <Boton type="submit">{{ guardando ? 'Guardando…' : esNuevo ? 'Guardar el profesional' : 'Guardar los cambios' }}</Boton>
          <Boton v-if="!esNuevo" :to="`/admin/agendas?profesional=${id}`" variante="secundario">Cargar su agenda</Boton>
        </div>
      </form>

      <section v-if="!esNuevo" class="tarjeta pila baja" aria-labelledby="titulo-borrar">
        <h2 id="titulo-borrar">Borrar este profesional</h2>
        <p>Se borran también sus turnos libres. No se puede si tiene turnos reservados.</p>
        <div v-if="!confirmandoBorrar">
          <Boton variante="peligro" @click="confirmandoBorrar = true">Borrar</Boton>
        </div>
        <div v-else class="pila">
          <p><strong>¿Seguro que querés borrar a {{ nombreGuardado }}?</strong> No se puede deshacer.</p>
          <div class="acciones">
            <Boton variante="peligro" @click="borrar">Sí, borrar</Boton>
            <Boton variante="secundario" @click="confirmandoBorrar = false">No, dejarlo</Boton>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.formulario-admin {
  max-width: 44rem;
}

.baja {
  max-width: 44rem;
  border-top-color: var(--error);
}

.error-campo {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}
</style>
