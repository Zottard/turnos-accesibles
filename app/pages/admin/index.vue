<template>
  <div class="flex flex-col gap-8">
    <AdminNav />
    <h1 class="text-2xl font-bold">Panel de administración</h1>

    <VistaEstados :estado="estado" @reintentar="cargar">
      <div class="flex flex-col gap-10">
        <section aria-labelledby="titulo-resumen" class="flex flex-col gap-4">
          <h2 id="titulo-resumen" class="text-xl font-bold">Resumen</h2>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <li v-for="d in datos" :key="d.etiqueta" class="flex flex-col gap-1 border-2 border-default rounded-md p-4">
              <span class="text-2xl font-bold">{{ d.valor.toLocaleString('es-AR') }}</span>
              <span>{{ d.etiqueta }}</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="titulo-cambios" class="flex flex-col gap-4">
          <h2 id="titulo-cambios" class="text-xl font-bold">Últimos cambios</h2>
          <p v-if="!cambios.length" class="text-lg">Todavía no hay cambios registrados.</p>
          <ul v-else class="flex flex-col">
            <li v-for="c in cambios" :key="c.id" class="flex flex-wrap gap-x-4 gap-y-1 border-b-2 border-default py-3">
              <span class="font-bold">{{ ACCIONES[c.accion] ?? c.accion }} {{ ENTIDADES[c.entidad] ?? c.entidad }}</span>
              <span class="text-muted">{{ fechaHoraEnPalabras(c.creado_en) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const ACCIONES: Record<string, string> = { insert: 'Se agregó', update: 'Se cambió', delete: 'Se borró' }
const ENTIDADES: Record<string, string> = {
  centros: 'un centro',
  especialidades: 'una especialidad',
  profesionales: 'un profesional',
  agendas: 'una agenda',
  reservas: 'una reserva',
}

definePageMeta({ middleware: ['auth', 'rol'], roles: ['admin'] })
useHead({ title: 'Administración' })

const supabase = useSupabaseClient()

const estado = ref<EstadoVista>('cargando')
const datos = ref<{ etiqueta: string, valor: number }[]>([])
const cambios = ref<{ id: number, accion: string, entidad: string, creado_en: string }[]>([])

async function contar(tabla: 'centros' | 'especialidades' | 'profesionales' | 'reservas') {
  const { count, error } = await supabase.from(tabla).select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

async function cargar() {
  estado.value = 'cargando'
  try {
    const [centros, especialidades, profesionales, reservas, auditoria] = await Promise.all([
      contar('centros'),
      contar('especialidades'),
      contar('profesionales'),
      contar('reservas'),
      supabase.from('auditoria').select('id, accion, entidad, creado_en').neq('entidad', 'agendas').order('creado_en', { ascending: false }).limit(10),
    ])
    datos.value = [
      { etiqueta: 'Centros', valor: centros },
      { etiqueta: 'Especialidades', valor: especialidades },
      { etiqueta: 'Profesionales', valor: profesionales },
      { etiqueta: 'Reservas', valor: reservas },
    ]
    cambios.value = auditoria.data ?? []
    estado.value = 'contenido'
  } catch {
    estado.value = 'error'
  }
}

onMounted(cargar)
</script>
