<template>
  <div class="max-w-3xl flex flex-col gap-8">
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Mis avisos</h1>
      <p class="text-lg">Acá ves los avisos de tus turnos. Te recordamos cada turno el día anterior a las 10 de la mañana.</p>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <UButton v-if="noLeidas" icon="i-lucide-check-check" label="Marcar todos como leídos" @click="marcarTodos" />
        <UButton to="/perfil/accesibilidad" icon="i-lucide-settings" label="Cómo quiero que me avisen" />
      </div>
    </div>

    <VistaEstados
      :estado="estado"
      texto-cargando="Estamos buscando tus avisos. Esperá un momento."
      texto-vacio="Todavía no tenés avisos. Cuando reserves un turno, te vamos a avisar acá."
      error-titulo="No pudimos mostrar tus avisos."
      error-ayuda="Revisá tu conexión a internet y probá de nuevo."
      @reintentar="cargar"
    >
      <ul class="flex flex-col gap-4">
        <li v-for="a in avisos" :key="a.id">
          <article :aria-labelledby="`aviso-${a.id}`" class="flex flex-col gap-3 border-2 rounded-md p-4 sm:p-5" :class="a.leida_en ? 'border-default' : 'border-primary'">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <h2 :id="`aviso-${a.id}`" class="min-w-0 text-lg font-bold">{{ a.titulo }}</h2>
              <UBadge
                :color="a.leida_en ? 'neutral' : 'primary'"
                :icon="a.leida_en ? 'i-lucide-mail-open' : 'i-lucide-mail'"
                :label="a.leida_en ? 'Leído' : 'Sin leer'"
              />
            </div>
            <p>{{ a.cuerpo }}</p>
            <p class="text-muted">{{ cuando(a.enviada_en) }}{{ a.correo_enviado_en ? '. También te lo mandamos por correo.' : '' }}</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <UButton v-if="a.reserva_id" :to="`/reservas/${a.reserva_id}`" size="lg" icon="i-lucide-eye" label="Ver el turno" :aria-describedby="`aviso-${a.id}`" @click="leer(a.id, a.leida_en)" />
              <UButton v-if="!a.leida_en" size="lg" icon="i-lucide-check" label="Marcar como leído" :aria-describedby="`aviso-${a.id}`" @click="leer(a.id, a.leida_en)" />
            </div>
          </article>
        </li>
      </ul>
    </VistaEstados>
  </div>
</template>

<script setup lang="ts">
import type { Notificacion } from '~/composables/useNotificaciones'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Mis avisos' })

const { noLeidas, listar, marcarLeidas } = useNotificaciones()
const { announce } = useAnuncio()

const avisos = ref<Notificacion[]>([])
const estado = ref<EstadoVista>('cargando')

const cuando = (fecha: string | null) => (fecha ? `Llegó el ${fechaHoraEnPalabras(fecha)}` : '')

async function cargar() {
  estado.value = 'cargando'
  try {
    avisos.value = await listar()
    estado.value = avisos.value.length ? 'contenido' : 'vacio'
  } catch {
    estado.value = 'error'
  }
}

async function leer(id: string, yaLeida: string | null) {
  if (yaLeida) return
  await marcarLeidas(id)
  avisos.value = avisos.value.map((a) => (a.id === id ? { ...a, leida_en: new Date().toISOString() } : a))
}

async function marcarTodos() {
  await marcarLeidas()
  const ahora = new Date().toISOString()
  avisos.value = avisos.value.map((a) => ({ ...a, leida_en: a.leida_en ?? ahora }))
  announce('Marcamos todos los avisos como leídos.')
}

onMounted(cargar)
</script>
