<template>
  <div class="max-w-3xl flex flex-col gap-10">
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Mis turnos</h1>
      <UButton to="/turnos/asistente" color="primary" variant="solid" icon="i-lucide-calendar-plus" label="Sacar un turno nuevo" class="self-start" />
    </div>

    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando tus turnos. Esperá un momento."
      texto-vacio="Todavía no reservaste ningún turno."
      error-titulo="No pudimos mostrar tus turnos."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar"
    >
      <div class="flex flex-col gap-10">
        <section v-for="grupo in grupos" :key="grupo.id" :aria-labelledby="grupo.id" class="flex flex-col gap-4">
          <h2 :id="grupo.id" class="text-xl font-bold">{{ grupo.titulo }} <span class="text-muted font-normal">({{ grupo.reservas.length }})</span></h2>
          <p v-if="!grupo.reservas.length" class="text-lg">{{ grupo.vacio }}</p>
          <ul v-else class="flex flex-col gap-4">
            <li v-for="r in grupo.reservas" :key="r.id">
              <article :aria-labelledby="`turno-${r.id}`" class="flex flex-col gap-3 border-2 border-default rounded-md p-4 sm:p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <h3 :id="`turno-${r.id}`" class="min-w-0 text-lg font-bold">{{ conMayuscula(fechaHoraEnPalabras(r.turno?.fecha_hora ?? '')) }}</h3>
                  <EstadoBadge :estado="estadoVisible(r)" />
                </div>
                <p>
                  {{ r.turno?.especialidad?.nombre_comun }}
                  <span class="text-muted">({{ r.turno?.especialidad?.nombre_tecnico }})</span>,
                  en {{ r.turno?.centro?.nombre }}.
                </p>
                <p class="text-muted">Número de turno: {{ r.numero_correlativo }}</p>
                <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <UButton :to="`/reservas/${r.id}`" size="lg" icon="i-lucide-eye" label="Ver el turno" :aria-describedby="`turno-${r.id}`" />
                  <template v-if="grupo.id === 'proximos'">
                    <UButton :to="`/reservas/${r.id}/reprogramar`" size="lg" icon="i-lucide-calendar-sync" label="Cambiar de fecha" :aria-describedby="`turno-${r.id}`" />
                    <UButton :to="`/reservas/${r.id}/cancelar`" size="lg" color="error" variant="outline" icon="i-lucide-calendar-x" label="Cancelar" :aria-describedby="`turno-${r.id}`" />
                  </template>
                </div>
              </article>
            </li>
          </ul>
        </section>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mis turnos' })

const user = useSupabaseUser()
const { misReservas } = useReserva()

const reservas = shallowRef<Awaited<ReturnType<typeof misReservas>>>([])
const estado = ref<EstadoVista>('cargando')

const yaPaso = (fecha?: string) => !!fecha && new Date(fecha) <= new Date()

const estadoVisible = (r: { estado: string, turno: { fecha_hora: string } | null }) =>
  r.estado === 'confirmada' && yaPaso(r.turno?.fecha_hora) ? 'completada' : r.estado

const grupos = computed(() => [
  {
    id: 'proximos',
    titulo: 'Próximos',
    vacio: 'No tenés turnos próximos.',
    reservas: reservas.value.filter((r) => r.estado === 'confirmada' && !yaPaso(r.turno?.fecha_hora)),
  },
  {
    id: 'anteriores',
    titulo: 'Anteriores y cancelados',
    vacio: 'Todavía no tenés turnos anteriores.',
    reservas: reservas.value.filter((r) => r.estado !== 'confirmada' || yaPaso(r.turno?.fecha_hora)).reverse(),
  },
])

async function cargar() {
  if (!user.value) return
  estado.value = 'cargando'
  try {
    reservas.value = await misReservas(user.value.sub)
    estado.value = reservas.value.length ? 'contenido' : 'vacio'
  } catch {
    estado.value = 'error'
  }
}

onMounted(cargar)
</script>
