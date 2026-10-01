<template>
  <div class="max-w-3xl flex flex-col gap-8">
    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando el turno. Esperá un momento."
      error-titulo="No pudimos mostrar este turno."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="refresh()"
    >
      <template v-if="turno">
        <div class="flex flex-col gap-4">
          <p class="text-lg">
            Turno de <strong>{{ turno.especialidad?.nombre_comun }}</strong>
            <span class="text-muted">({{ turno.especialidad?.nombre_tecnico }})</span>
          </p>
          <h1 class="text-2xl font-bold">{{ cuando }}</h1>
          <EstadoBadge :estado="turno.estado" class="self-start" />
        </div>

        <UAlert
          v-if="turno.estado !== 'disponible'"
          color="warning"
          icon="i-lucide-circle-alert"
          title="Este turno ya no está libre."
          description="Lo tomó otra persona. Mirá otros horarios en este mismo lugar."
          :actions="[{ label: 'Ver otros horarios', icon: 'i-lucide-calendar-days', size: 'lg', to: enlaceOtrosHorarios }]"
        />

        <UAlert
          color="info"
          icon="i-lucide-info"
          title="Este es un turno de prueba."
          description="El hospital y su dirección son reales. El turno y el nombre del profesional son de ejemplo: si lo reservás, el hospital no se entera."
        />

        <UButton
          v-if="turno.estado === 'disponible'"
          :to="`/turnos/${turno.id}/confirmar`"
          color="primary"
          variant="solid"
          icon="i-lucide-calendar-check"
          label="Reservar este turno"
          block
          class="sm:w-auto sm:self-start"
        />

        <section aria-labelledby="titulo-quien" class="flex flex-col gap-3">
          <h2 id="titulo-quien" class="text-xl font-bold">Con quién</h2>
          <p class="text-lg">{{ turno.profesional?.nombre }} {{ turno.profesional?.apellido }}</p>
          <p>{{ turno.especialidad?.descripcion_simple }}</p>
        </section>

        <section aria-labelledby="titulo-donde" class="flex flex-col gap-3">
          <h2 id="titulo-donde" class="text-xl font-bold">Dónde</h2>
          <p class="text-lg font-bold">{{ turno.centro?.nombre }}</p>
          <p class="text-lg">{{ turno.centro?.direccion }}, {{ turno.centro?.localidad }}, partido de {{ turno.centro?.partido }}</p>
          <p v-if="turno.centro?.telefono">Teléfono: <a :href="`tel:${turno.centro.telefono}`" class="underline">{{ turno.centro.telefono }}</a></p>
          <p v-if="turno.centro?.horario_atencion">Atiende: {{ turno.centro.horario_atencion }}</p>
          <p v-if="turno.centro?.como_llegar">{{ turno.centro.como_llegar }}</p>
          <UButton
            v-if="turno.centro"
            :to="enlaceComoLlegar(turno.centro.lat, turno.centro.lng)"
            target="_blank"
            icon="i-lucide-map"
            label="Cómo llegar (se abre el mapa en otra pestaña)"
            class="self-start"
          />
        </section>

        <section aria-labelledby="titulo-acceso" class="flex flex-col gap-3">
          <h2 id="titulo-acceso" class="text-xl font-bold">Cómo es el edificio</h2>
          <ul v-if="accesibilidad.length" class="flex flex-col gap-2">
            <li v-for="a in accesibilidad" :key="a.texto" class="flex items-center gap-3">
              <UIcon :name="a.icono" class="size-6 shrink-0" aria-hidden="true" />
              {{ a.texto }}
            </li>
          </ul>
          <p v-else>Todavía no tenemos datos sobre rampas, ascensores o baños adaptados en este lugar.</p>
        </section>

        <section v-if="turno.requisitos" aria-labelledby="titulo-llevar" class="flex flex-col gap-3">
          <h2 id="titulo-llevar" class="text-xl font-bold">Qué tenés que llevar</h2>
          <p class="text-lg">{{ turno.requisitos }}</p>
        </section>

        <section v-if="turno.centro?.modo_turnos === 'derivacion'" aria-labelledby="titulo-oficial" class="flex flex-col gap-3">
          <h2 id="titulo-oficial" class="text-xl font-bold">Cómo pedir el turno en este lugar</h2>
          <p v-if="turno.centro.instrucciones_turno" class="text-lg">{{ turno.centro.instrucciones_turno }}</p>
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <UButton v-if="turno.centro.web_turnos" :to="turno.centro.web_turnos" target="_blank" icon="i-lucide-external-link" label="Ir a la página de turnos del hospital (otra pestaña)" />
            <UButton v-if="turno.centro.telefono_turnos" :to="`tel:${turno.centro.telefono_turnos}`" icon="i-lucide-phone" :label="`Llamar al ${turno.centro.telefono_turnos}`" />
          </div>
        </section>

        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <UButton icon="i-lucide-arrow-left" label="Volver a la búsqueda" @click="volver" />
          <UButton :to="enlaceOtrosHorarios" icon="i-lucide-calendar-days" label="Ver otros horarios en este lugar" />
        </div>
      </template>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const ACCESIBILIDAD: Record<string, { texto: string, icono: string }> = {
  rampa: { texto: 'Tiene rampa en la entrada', icono: 'i-lucide-accessibility' },
  ascensor: { texto: 'Tiene ascensor', icono: 'i-lucide-arrow-up-down' },
  bano_adaptado: { texto: 'Tiene baño adaptado', icono: 'i-lucide-bath' },
  estacionamiento: { texto: 'Tiene estacionamiento para personas con discapacidad', icono: 'i-lucide-square-parking' },
}

const route = useRoute()
const router = useRouter()
const { obtenerTurno } = useTurnos()

const id = computed(() => String(route.params.id))

const { data: turno, status, refresh } = await useAsyncData(`turno-${id.value}`, () => obtenerTurno(id.value))

if (status.value === 'success' && !turno.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos este turno.', fatal: true })
}

const estado = computed<EstadoVista>(() => {
  if (status.value === 'pending') return 'cargando'
  if (status.value === 'error') return 'error'
  return 'contenido'
})

const cuando = computed(() => (turno.value ? conMayuscula(fechaHoraEnPalabras(turno.value.fecha_hora)) : ''))

const accesibilidad = computed(() => {
  const datos = turno.value?.centro?.accesibilidad_edilicia as Record<string, boolean> | null | undefined
  return Object.entries(datos ?? {}).filter(([, tiene]) => tiene).map(([clave]) => ACCESIBILIDAD[clave]).filter((a) => a !== undefined)
})

const enlaceOtrosHorarios = computed(() => ({
  path: '/turnos/buscar',
  query: { especialidad: turno.value?.especialidad?.slug, desde_donde: 'cualquiera', centro: turno.value?.centro?.id },
}))

function volver() {
  if (window.history.state?.back?.startsWith('/turnos/buscar')) router.back()
  else navigateTo('/turnos/buscar')
}

useHead({ title: () => (turno.value ? `Turno de ${turno.value.especialidad?.nombre_comun}` : 'Turno') })
</script>
