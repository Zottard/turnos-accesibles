<!--
  Cargar o cambiar un centro de salud (RF-08). /admin/centros/nuevo crea uno.
  - Sin teléfono, horario o accesibilidad se guarda, pero no se publica (lo hace también la base).
  - Sin coordenadas, usamos las de la localidad.
  - "Dar de baja" lo saca de la búsqueda. Si tiene turnos reservados, la base no lo deja y
    mostramos esos turnos: primero hay que reasignarlos o cancelarlos.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { cargarCentro, guardarCentro } = useAdmin()
const { cargarCatalogo } = useTurnos()
const { anunciar } = useAnuncio()

const esNuevo = computed(() => route.params.id === 'nuevo')
const id = computed(() => (esNuevo.value ? null : Number(route.params.id)))

const { data: catalogo } = await useAsyncData('catalogo-turnos', () => cargarCatalogo())
const localidades = computed(() => catalogo.value?.datos?.localidades ?? [])
const { data: centro } = await useAsyncData(`admin-centro-${route.params.id}`, async () =>
  id.value === null ? null : cargarCentro(id.value),
)

useSeoMeta({ title: () => (esNuevo.value ? 'Agregar un centro' : `Centro: ${centro.value?.datos?.nombre ?? ''}`) })

const formulario = reactive<DatosCentro>({ ...CENTRO_VACIO })
const publicadoAntes = ref(false)
const nombreGuardado = ref('')

function copiarAlFormulario(datos: CentroAdmin | null | undefined) {
  if (!datos) return
  Object.assign(formulario, {
    nombre: datos.nombre,
    tipo: datos.tipo,
    direccion: datos.direccion,
    localidad: datos.localidad,
    telefono: datos.telefono ?? '',
    horario: datos.horario ?? '',
    lat: String(datos.lat).replace('.', ','),
    lng: String(datos.lng).replace('.', ','),
    accesibilidad: datos.accesibilidad ?? '',
    activo: datos.activo,
  })
  publicadoAntes.value = datos.activo
  nombreGuardado.value = datos.nombre
}
copiarAlFormulario(centro.value?.datos)

const noExiste = computed(() => !esNuevo.value && centro.value && !centro.value.error && !centro.value.datos)
const faltantes = computed(() => faltantesParaPublicar(formulario))

// --- Coordenadas de la localidad ---
const coordenadasLocalidad = computed(() => {
  const localidad = localidades.value.find((item) => item.nombre === formulario.localidad)
  return localidad ? { lat: localidad.lat, lng: localidad.lng } : null
})

function usarCoordenadasLocalidad() {
  if (!coordenadasLocalidad.value) {
    anunciar('Primero elegí la localidad.', true)
    document.getElementById('centro-localidad')?.focus()
    return
  }
  formulario.lat = String(coordenadasLocalidad.value.lat).replace('.', ',')
  formulario.lng = String(coordenadasLocalidad.value.lng).replace('.', ',')
  anunciar(`Usamos las coordenadas de ${formulario.localidad}.`)
}

// --- Guardar ---
const errores = ref<ErrorCampo[]>([])
const errorDe = (campo: string) => errores.value.find((error) => error.id === `centro-${campo}`)?.mensaje
const guardando = ref(false)
const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string; turnos?: TurnoReservado[] } | null>(
  route.query.guardado ? { tipo: 'exito', mensaje: 'Guardamos el centro.' } : null,
)
const confirmandoBaja = ref(false)

async function mostrarResultado() {
  await nextTick()
  document.getElementById('resultado-centro')?.focus()
  if (resultado.value) anunciar(resultado.value.mensaje, resultado.value.tipo === 'error')
}

async function guardar() {
  if (guardando.value) return
  resultado.value = null
  errores.value = validarCentro(formulario)
  if (errores.value.length > 0) {
    document.getElementById(errores.value[0]!.id)?.focus()
    return
  }
  guardando.value = true
  const respuesta = await guardarCentro(id.value, formulario, coordenadasLocalidad.value)
  guardando.value = false
  confirmandoBaja.value = false

  if (!respuesta.ok) {
    // La baja no se hizo: el interruptor vuelve a mostrar lo que está guardado.
    if (respuesta.turnos) formulario.activo = publicadoAntes.value
    resultado.value = { tipo: 'error', mensaje: respuesta.mensaje, turnos: respuesta.turnos }
    await mostrarResultado()
    return
  }
  if (esNuevo.value) {
    await navigateTo(`/admin/centros/${respuesta.id}?guardado=1`)
    return
  }
  // Volvemos a leer: la base pudo dejarlo sin publicar.
  const leido = await cargarCentro(respuesta.id!)
  copiarAlFormulario(leido.datos)
  resultado.value = {
    tipo: 'exito',
    mensaje: publicadoAntes.value
      ? 'Guardamos los cambios. Ya se ven en la búsqueda.'
      : 'Guardamos los cambios. El centro no está publicado: no aparece en la búsqueda.',
  }
  await mostrarResultado()
}

async function darDeBaja() {
  formulario.activo = false
  await guardar()
}

const mensajePublicacion = computed(() =>
  faltantes.value.length > 0
    ? `Así no se publica: falta ${listaEnPalabras(faltantes.value)}. Lo guardamos sin publicar hasta que lo completes.`
    : '',
)
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <p class="no-imprimir"><NuxtLink to="/admin/centros">Volver a los centros</NuxtLink></p>
    <h1>{{ esNuevo ? 'Agregar un centro' : nombreGuardado || 'Centro de salud' }}</h1>

    <Aviso v-if="centro?.error || catalogo?.error" tipo="error">
      <p>{{ centro?.error ?? catalogo?.error }}</p>
    </Aviso>
    <Aviso v-else-if="noExiste" tipo="atencion" titulo="No encontramos este centro">
      <p>Puede que la dirección esté mal escrita.</p>
    </Aviso>

    <template v-else>
      <div id="resultado-centro" tabindex="-1">
        <Aviso v-if="resultado" :tipo="resultado.tipo">
          <p>{{ resultado.mensaje }}</p>
          <TurnosReservados v-if="resultado.turnos" :turnos="resultado.turnos" />
        </Aviso>
      </div>

      <p v-if="!esNuevo">
        <span v-if="publicadoAntes" class="insignia insignia--si"><span aria-hidden="true">✓</span> Publicado</span>
        <span v-else class="insignia insignia--no"><span aria-hidden="true">!</span> Sin publicar</span>
      </p>

      <ResumenErrores :errores="errores" />

      <form class="formulario-admin" novalidate @submit.prevent="guardar">
        <section class="tarjeta pila" aria-labelledby="titulo-datos">
          <h2 id="titulo-datos">Datos del centro</h2>
          <Campo id="centro-nombre" v-model="formulario.nombre" etiqueta="Nombre" requerido :error="errorDe('nombre')" />
          <div class="campo-lista">
            <label for="centro-tipo">Tipo de centro</label>
            <p v-if="errorDe('tipo')" id="centro-tipo-error" class="error-campo">
              <span aria-hidden="true">✕</span> {{ errorDe('tipo') }}
            </p>
            <select
              id="centro-tipo"
              v-model="formulario.tipo"
              :aria-invalid="errorDe('tipo') ? 'true' : undefined"
              :aria-describedby="errorDe('tipo') ? 'centro-tipo-error' : undefined"
            >
              <option value="">Elegí el tipo</option>
              <option v-for="tipo in TIPOS_CENTRO" :key="tipo" :value="tipo">{{ NOMBRES_TIPO_CENTRO[tipo] }}</option>
            </select>
          </div>
          <Campo
            id="centro-direccion"
            v-model="formulario.direccion"
            etiqueta="Dirección"
            requerido
            :error="errorDe('direccion')"
          />
          <div class="campo-lista">
            <label for="centro-localidad">Localidad</label>
            <p v-if="errorDe('localidad')" id="centro-localidad-error" class="error-campo">
              <span aria-hidden="true">✕</span> {{ errorDe('localidad') }}
            </p>
            <select
              id="centro-localidad"
              v-model="formulario.localidad"
              :aria-invalid="errorDe('localidad') ? 'true' : undefined"
              :aria-describedby="errorDe('localidad') ? 'centro-localidad-error' : undefined"
            >
              <option value="">Elegí la localidad</option>
              <option v-for="localidad in localidades" :key="localidad.nombre" :value="localidad.nombre">
                {{ localidad.nombre }}
              </option>
            </select>
          </div>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-publicar">
          <h2 id="titulo-publicar">Para publicarlo en la búsqueda</h2>
          <p class="texto-suave">Podés guardar sin estos datos, pero el centro no aparece en la búsqueda hasta tener los tres.</p>
          <Campo
            id="centro-telefono"
            v-model="formulario.telefono"
            etiqueta="Teléfono"
            type="tel"
            ayuda="Por ejemplo: 011 4740-1100."
          />
          <Campo
            id="centro-horario"
            v-model="formulario.horario"
            etiqueta="Horario de atención"
            ayuda="Por ejemplo: Lunes a viernes de 8 a 17."
          />
          <div class="campo-lista">
            <label for="centro-accesibilidad">
              Cómo es el edificio (accesibilidad) <span class="campo-opcional">(opcional)</span>
            </label>
            <p id="centro-accesibilidad-ayuda" class="texto-suave">
              En frases cortas. Por ejemplo: "Rampa en la entrada. Ascensor. Baño adaptado."
            </p>
            <textarea
              id="centro-accesibilidad"
              v-model="formulario.accesibilidad"
              rows="3"
              aria-describedby="centro-accesibilidad-ayuda"
            />
          </div>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-ubicacion">
          <h2 id="titulo-ubicacion">Ubicación en el mapa</h2>
          <p class="texto-suave">
            Sirve para ordenar los turnos por cercanía y para "Cómo llegar". Si no las completás, usamos las de la
            localidad.
          </p>
          <div class="fila-campos">
            <Campo id="centro-lat" v-model="formulario.lat" etiqueta="Latitud" inputmode="decimal" :error="errorDe('lat')" />
            <Campo id="centro-lng" v-model="formulario.lng" etiqueta="Longitud" inputmode="decimal" :error="errorDe('lng')" />
          </div>
          <div>
            <Boton variante="secundario" @click="usarCoordenadasLocalidad">
              <span aria-hidden="true">📍</span> Usar las coordenadas de la localidad
            </Boton>
          </div>
        </section>

        <section class="tarjeta pila" aria-labelledby="titulo-estado">
          <h2 id="titulo-estado">Publicación</h2>
          <Interruptor
            id="centro-activo"
            v-model="formulario.activo"
            etiqueta="Publicado en la búsqueda"
            ayuda="Si lo apagás, el centro deja de aparecer. No se puede si tiene turnos reservados."
          />
          <Aviso v-if="formulario.activo && mensajePublicacion" tipo="atencion" titulo="Le faltan datos">
            <p>{{ mensajePublicacion }}</p>
          </Aviso>
        </section>

        <div class="acciones">
          <Boton type="submit">{{ guardando ? 'Guardando…' : esNuevo ? 'Guardar el centro' : 'Guardar los cambios' }}</Boton>
          <Boton to="/admin/centros" variante="secundario">Cancelar</Boton>
        </div>
      </form>

      <!-- Dar de baja (solo si está publicado) -->
      <section v-if="!esNuevo && publicadoAntes" class="tarjeta pila baja" aria-labelledby="titulo-baja">
        <h2 id="titulo-baja">Dar de baja este centro</h2>
        <p>Deja de aparecer en la búsqueda. Sus datos quedan guardados y lo podés volver a publicar cuando quieras.</p>
        <div v-if="!confirmandoBaja">
          <Boton variante="peligro" @click="confirmandoBaja = true">Dar de baja</Boton>
        </div>
        <div v-else class="pila">
          <p><strong>¿Seguro que lo das de baja?</strong></p>
          <div class="acciones">
            <Boton variante="peligro" @click="darDeBaja">Sí, dar de baja</Boton>
            <Boton variante="secundario" @click="confirmandoBaja = false">No, dejarlo publicado</Boton>
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
</style>
