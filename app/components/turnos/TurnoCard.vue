<template>
  <article :aria-labelledby="idTitulo" class="flex flex-col gap-4 border-2 border-default rounded-md p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h3 :id="idTitulo" tabindex="-1" class="min-w-0 text-xl font-bold">{{ cuando }}</h3>
      <EstadoBadge :estado="turno.estado" />
    </div>

    <dl class="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
      <dt class="font-bold">Médico</dt>
      <dd>
        {{ turno.especialidad_nombre_comun }}
        <span class="text-muted">({{ turno.especialidad_nombre_tecnico }})</span>,
        {{ turno.profesional }}
      </dd>
      <dt class="font-bold">Dónde</dt>
      <dd>{{ turno.centro_nombre }}</dd>
      <dt class="font-bold">Dirección</dt>
      <dd>
        {{ turno.centro_direccion }}, {{ turno.centro_localidad }}
        <template v-if="distancia">. {{ distancia }}</template>
      </dd>
    </dl>

    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <UButton :to="`/turnos/${turno.id}`" color="primary" variant="solid" label="Ver este turno" trailing-icon="i-lucide-arrow-right" :aria-describedby="idTitulo" />
      <UButton
        v-if="conOtrosHorarios"
        icon="i-lucide-calendar-days"
        label="Ver otros horarios en este lugar"
        :aria-describedby="idTitulo"
        @click="emit('otros-horarios', turno.centro_id)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ResultadoTurno } from '~/composables/useTurnos'

const props = defineProps<{ turno: ResultadoTurno, conOtrosHorarios?: boolean }>()
const emit = defineEmits<{ 'otros-horarios': [centroId: string] }>()

const idTitulo = useId()

const cuando = computed(() => conMayuscula(fechaHoraEnPalabras(props.turno.fecha_hora)))
const distancia = computed(() => distanciaEnPalabras(props.turno.distancia_km))
</script>
