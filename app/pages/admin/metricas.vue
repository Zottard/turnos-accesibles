<template>
  <div class="flex flex-col gap-8">
    <AdminNav class="print:hidden" />
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Métricas</h1>
      <p class="text-lg">Datos anónimos de uso de la app. No incluyen datos de salud ni quién reservó.</p>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end print:hidden">
      <UFormField label="Desde" name="desde">
        <UInput id="metricas-desde" v-model="desde" type="date" :max="hasta" class="w-full" />
      </UFormField>
      <UFormField label="Hasta" name="hasta">
        <UInput id="metricas-hasta" v-model="hasta" type="date" :min="desde" class="w-full" />
      </UFormField>
      <UButton icon="i-lucide-file-spreadsheet" label="Descargar en Excel (CSV)" :disabled="!datos" @click="exportarCsv" />
      <UButton icon="i-lucide-printer" label="Imprimir o guardar como PDF" :disabled="!datos" @click="imprimir" />
    </div>
    <p class="hidden print:block">Período: del {{ diaEnPalabras(`${desde}T12:00:00-03:00`) }} al {{ diaEnPalabras(`${hasta}T12:00:00-03:00`) }}.</p>

    <VistaEstados :estado="estado" error-titulo="No pudimos calcular las métricas." @reintentar="cargar">
      <div v-if="datos" class="flex flex-col gap-10">
        <section aria-labelledby="titulo-resumen" class="flex flex-col gap-4">
          <h2 id="titulo-resumen" class="text-xl font-bold">Resumen del período</h2>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <li v-for="t in tiles" :key="t.etiqueta" class="flex flex-col gap-1 border-2 border-default rounded-md p-4">
              <span class="text-2xl font-bold">{{ t.valor }}</span>
              <span>{{ t.etiqueta }}</span>
              <span v-if="t.detalle" class="text-muted">{{ t.detalle }}</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="titulo-especialidad" class="flex flex-col gap-4">
          <h2 id="titulo-especialidad" class="text-xl font-bold">Turnos reservados por médico</h2>
          <p v-if="!datos.por_especialidad.length" class="text-lg">No hubo reservas en este período.</p>
          <template v-else>
            <div class="flex flex-col gap-2" aria-hidden="true">
              <div v-for="f in datos.por_especialidad" :key="f.especialidad" class="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[14rem_1fr]">
                <span class="truncate text-base" :title="f.especialidad">{{ f.especialidad }}</span>
                <div class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <div
                      class="h-6 rounded-e bg-primary"
                      :style="{ width: `${Math.max(2, (f.reservas / maximo) * 100)}%` }"
                      :title="`${f.especialidad}: ${f.reservas} ${f.reservas === 1 ? 'turno' : 'turnos'}`"
                    />
                  </div>
                  <span class="w-12 shrink-0 text-base font-bold [overflow-wrap:normal]">{{ f.reservas }}</span>
                </div>
              </div>
            </div>

            <table class="w-full max-w-xl border-collapse text-left">
              <caption class="sr-only">Turnos reservados por médico en el período</caption>
              <thead>
                <tr class="border-b-2 border-default">
                  <th scope="col" class="py-2 pe-4">Médico</th>
                  <th scope="col" class="py-2 text-right">Turnos reservados</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in datos.por_especialidad" :key="f.especialidad" class="border-b border-default">
                  <th scope="row" class="py-2 pe-4 font-normal">{{ f.especialidad }}</th>
                  <td class="py-2 text-right tabular-nums">{{ f.reservas }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </section>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

interface Metricas {
  busquedas: number
  asistentes_iniciados: number
  segundos_promedio: number | null
  reservas: {
    total: number
    confirmadas: number
    canceladas: number
    reprogramadas: number
    completadas: number
    ausentes: number
    asistidas: number
    autonomas: number
  }
  por_especialidad: { especialidad: string, reservas: number }[]
}

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Métricas' })

const supabase = useSupabaseClient()
const { announce, alert } = useAnuncio()

const hasta = ref(fechaLocalIso())
const desde = ref(fechaLocalIso(new Date(Date.now() - 29 * 86_400_000)))
const datos = ref<Metricas | null>(null)
const estado = ref<EstadoVista>('cargando')

const porcentaje = (parte: number, total: number) => (total ? `${Math.round((parte / total) * 100)} %` : '0 %')
const minutos = (s: number | null) => (s === null ? 'Sin datos' : s < 60 ? `${s} segundos` : `${Math.round(s / 60)} minutos`)
const maximo = computed(() => Math.max(1, ...(datos.value?.por_especialidad.map((f) => f.reservas) ?? [1])))

const tiles = computed(() => {
  const d = datos.value
  if (!d) return []
  const r = d.reservas
  return [
    { etiqueta: 'Búsquedas de turnos', valor: d.busquedas.toLocaleString('es-AR') },
    { etiqueta: 'Turnos reservados', valor: r.total.toLocaleString('es-AR'), detalle: `${r.confirmadas} siguen confirmados` },
    { etiqueta: 'Turnos cancelados', valor: r.canceladas.toLocaleString('es-AR'), detalle: `${porcentaje(r.canceladas, r.total)} de los reservados` },
    { etiqueta: 'Turnos cumplidos', valor: r.completadas.toLocaleString('es-AR'), detalle: `${r.reprogramadas} cambiados de fecha` },
    { etiqueta: 'Tiempo promedio para reservar', valor: minutos(d.segundos_promedio), detalle: 'Con el asistente, desde que empieza.' },
    { etiqueta: 'Reservados por la persona', valor: porcentaje(r.autonomas, r.total), detalle: `${r.autonomas} turnos` },
    { etiqueta: 'Reservados por un acompañante', valor: porcentaje(r.asistidas, r.total), detalle: `${r.asistidas} turnos` },
    { etiqueta: 'Veces que se abrió el asistente', valor: d.asistentes_iniciados.toLocaleString('es-AR') },
  ]
})

let pedido = 0

async function cargar() {
  if (!desde.value || !hasta.value || hasta.value < desde.value) return
  estado.value = 'cargando'
  const actual = ++pedido
  const { data, error } = await supabase.rpc('metricas', { p_desde: desde.value, p_hasta: hasta.value })
  if (actual !== pedido) return
  if (error || !data) {
    estado.value = 'error'
    return
  }
  datos.value = data as unknown as Metricas
  estado.value = 'contenido'
}

function exportarCsv() {
  try {
    const filas: (string | number)[][] = [
      ['Indicador', 'Valor'],
      ...tiles.value.map((t) => [t.etiqueta, t.valor]),
      [],
      ['Médico', 'Turnos reservados'],
      ...(datos.value?.por_especialidad ?? []).map((f) => [f.especialidad, f.reservas]),
    ]
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    descargarArchivo(`﻿${csv}`, `metricas-${desde.value}-a-${hasta.value}.csv`, 'text/csv;charset=utf-8')
    announce('Descargamos el archivo con las métricas.')
  } catch {
    alert('No pudimos generar el archivo. Las métricas siguen en pantalla: probá de nuevo.')
  }
}

function imprimir() {
  try {
    window.print()
  } catch {
    alert('No pudimos abrir la impresión. Las métricas siguen en pantalla: probá de nuevo.')
  }
}

watch([desde, hasta], cargar)
onMounted(cargar)
</script>
