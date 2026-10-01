<template>
  <div class="max-w-3xl flex flex-col gap-10">
    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando los turnos. Esperá un momento."
      error-titulo="No pudimos mostrar los turnos."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar"
    >
      <div v-if="!persona" class="flex flex-col gap-6">
        <h1 class="text-2xl font-bold">No podés ayudar a esta persona</h1>
        <p class="text-lg">Para ayudar a alguien, esa persona te tiene que invitar desde "Mis acompañantes".</p>
        <UButton to="/acompanantes" icon="i-lucide-users" label="Ver a quiénes ayudo" class="self-start" />
      </div>

      <div v-else class="flex flex-col gap-10">
        <div class="flex flex-col gap-4">
          <h1 class="text-2xl font-bold">Turnos de {{ persona.nombre }}</h1>
          <div>
            <p class="text-lg font-bold">Podés:</p>
            <ul class="list-disc ps-6 text-lg">
              <li v-for="p in permisos" :key="p">{{ p }}</li>
            </ul>
          </div>
          <UButton
            v-if="puede('reservar')"
            to="/turnos/asistente"
            color="primary"
            variant="solid"
            icon="i-lucide-calendar-plus"
            :label="`Sacar un turno para ${persona.nombre}`"
            class="self-start"
          />
          <p v-else class="text-lg">No tenés permiso para sacar turnos por {{ persona.nombre }}. Pedile que te lo dé desde "Mis acompañantes".</p>
        </div>

        <section aria-labelledby="titulo-proximos" class="flex flex-col gap-4">
          <h2 id="titulo-proximos" class="text-xl font-bold">Próximos turnos</h2>
          <p v-if="!proximos.length" class="text-lg">{{ persona.nombre }} no tiene turnos próximos.</p>
          <ul v-else class="flex flex-col gap-4">
            <li v-for="r in proximos" :key="r.id">
              <article :aria-labelledby="`turno-${r.id}`" class="flex flex-col gap-3 border-2 border-default rounded-md p-4 sm:p-5">
                <h3 :id="`turno-${r.id}`" class="text-lg font-bold">{{ conMayuscula(fechaHoraEnPalabras(r.turno?.fecha_hora ?? '')) }}</h3>
                <p>{{ r.turno?.especialidad?.nombre_comun }}, en {{ r.turno?.centro?.nombre }}.</p>
                <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <UButton :to="`/reservas/${r.id}`" size="lg" icon="i-lucide-eye" label="Ver el turno" :aria-describedby="`turno-${r.id}`" />
                  <UButton v-if="puede('cancelar')" :to="`/reservas/${r.id}/cancelar`" size="lg" color="error" variant="outline" icon="i-lucide-calendar-x" label="Cancelar" :aria-describedby="`turno-${r.id}`" />
                </div>
              </article>
            </li>
          </ul>
          <p v-if="proximos.length && !puede('cancelar')" class="text-lg">No tenés permiso para cancelar ni cambiar estos turnos. Si hace falta, avisale a {{ persona.nombre }}.</p>
        </section>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Accion, Asistiendo } from '~/composables/useAcompanamiento'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Ayudar con turnos' })

const route = useRoute()
const { asistiendo, aQuienesAyudo } = useAcompanamiento()
const { misReservas } = useReserva()

const persona = ref<Asistiendo | null>(null)
const reservas = shallowRef<Awaited<ReturnType<typeof misReservas>>>([])
const estado = ref<EstadoVista>('cargando')

const puede = (accion: Accion) => !!persona.value?.alcance.includes(accion)
const permisos = computed(() => ALCANCES.filter((a) => puede(a.value)).map((a) => a.paraOtro.replace('esa persona', persona.value?.nombre ?? '')))
const proximos = computed(() => reservas.value.filter((r) => r.estado === 'confirmada' && new Date(r.turno?.fecha_hora ?? 0) > new Date()))

async function cargar() {
  estado.value = 'cargando'
  try {
    const personas = await aQuienesAyudo()
    persona.value = personas.find((p) => p.id === route.params.solicitanteId) ?? null
    asistiendo.value = persona.value
    if (persona.value) reservas.value = await misReservas(persona.value.id)
    estado.value = 'contenido'
  } catch {
    estado.value = 'error'
  }
}

onMounted(cargar)
</script>
