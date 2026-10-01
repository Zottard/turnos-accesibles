<template>
  <div class="flex flex-col gap-8">
    <ResumenReserva :turno="turno" :requisitos="turno.requisitos" />

    <UAlert
      v-if="aviso"
      :color="resultado?.motivo === 'superpuesto' ? 'warning' : 'error'"
      :icon="resultado?.motivo === 'superpuesto' ? 'i-lucide-triangle-alert' : 'i-lucide-circle-x'"
      :title="aviso.titulo"
      :description="aviso.ayuda"
    />

    <div v-if="resultado?.motivo === 'superpuesto'" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <UButton color="primary" variant="solid" label="Sí, reservar igual" :loading="enviando" @click="confirmar(true)" />
      <UButton icon="i-lucide-arrow-left" label="Elegir otro turno" @click="emit('volver')" />
    </div>

    <section v-else-if="resultado?.motivo === 'tomado'" aria-labelledby="titulo-alternativas" class="flex flex-col gap-4">
      <h2 id="titulo-alternativas" class="text-xl font-bold">Otros turnos parecidos</h2>
      <VistaEstados :estado="estadoAlternativas" texto-vacio="No encontramos otros turnos libres de este médico.">
        <ul class="flex flex-col gap-3">
          <li v-for="a in alternativas" :key="a.id">
            <UButton
              block
              class="justify-start text-left"
              icon="i-lucide-calendar-check"
              :label="`${conMayuscula(fechaHoraEnPalabras(a.fecha_hora))}. ${a.centro_nombre}`"
              @click="emit('elegir', a.id)"
            />
          </li>
        </ul>
      </VistaEstados>
      <UButton icon="i-lucide-arrow-left" label="Volver atrás" class="self-start" @click="emit('volver')" />
    </section>

    <div v-else-if="resultado?.motivo === 'sin_sesion'" class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <UButton :to="{ path: '/ingresar', query: { volver: route.fullPath } }" color="primary" variant="solid" icon="i-lucide-log-in" label="Ingresar" />
      <UButton :to="{ path: '/registrarme' }" icon="i-lucide-user-plus" label="Crear una cuenta" />
    </div>

    <AccionesPaso
      v-else-if="!resultado || resultado.motivo === 'error'"
      confirmar="Sí, reservar este turno"
      :cargando="enviando"
      @confirmar="confirmar(false)"
      @volver="emit('volver')"
    />

    <UButton v-else icon="i-lucide-arrow-left" label="Elegir otro turno" class="self-start" @click="emit('volver')" />
  </div>
</template>

<script setup lang="ts">
import type { ResultadoReserva } from '~/composables/useReserva'
import type { ResultadoTurno, TurnoDetalle } from '~/composables/useTurnos'
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const props = defineProps<{ turno: TurnoDetalle, solicitante?: string }>()
const emit = defineEmits<{ reservada: [id: string], volver: [], elegir: [turnoId: string] }>()

const route = useRoute()
const { reservar } = useReserva()
const { buscar } = useTurnos()
const { announce, alert } = useAnuncio()

const enviando = ref(false)
const resultado = ref<ResultadoReserva>()
const alternativas = ref<ResultadoTurno[]>([])
const estadoAlternativas = ref<EstadoVista>('cargando')

const aviso = computed(() => (resultado.value && !resultado.value.ok ? avisoReserva(resultado.value) : undefined))

async function buscarAlternativas() {
  const especialidad = props.turno.especialidad?.id
  if (!especialidad) return
  estadoAlternativas.value = 'cargando'
  try {
    const enCentro = await buscar({ especialidad, centro: props.turno.centro?.id, orden: 'fecha' })
    const otros = enCentro.turnos.length ? enCentro : await buscar({ especialidad, orden: 'fecha' })
    alternativas.value = otros.turnos.filter((t) => t.id !== props.turno.id).slice(0, 3)
    estadoAlternativas.value = alternativas.value.length ? 'contenido' : 'vacio'
  } catch {
    estadoAlternativas.value = 'error'
  }
}

async function confirmar(confirmarSuperposicion: boolean) {
  enviando.value = true
  const r = await reservar(props.turno.id, { confirmarSuperposicion, solicitante: props.solicitante })
  enviando.value = false
  resultado.value = r
  if (r.ok && r.reservaId) {
    announce('Listo. Reservaste el turno.')
    emit('reservada', r.reservaId)
    return
  }
  const a = avisoReserva(r)
  alert(`${a.titulo} ${a.ayuda}`)
  if (r.motivo === 'tomado') await buscarAlternativas()
}

watch(() => props.turno.id, () => {
  resultado.value = undefined
  alternativas.value = []
})
</script>
