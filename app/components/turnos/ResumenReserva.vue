<template>
  <ul class="flex flex-col gap-3 text-lg">
    <li class="flex gap-3">
      <UIcon :name="turno.especialidad?.icono ?? 'i-lucide-stethoscope'" class="size-7 shrink-0" aria-hidden="true" />
      <span>
        Es un turno de <strong>{{ turno.especialidad?.nombre_comun }}</strong>
        <span class="text-muted">({{ turno.especialidad?.nombre_tecnico }})</span>,
        con {{ turno.profesional?.nombre }} {{ turno.profesional?.apellido }}.
      </span>
    </li>
    <li class="flex gap-3">
      <UIcon name="i-lucide-calendar" class="size-7 shrink-0" aria-hidden="true" />
      <span>Es el <strong>{{ cuando }}</strong>.</span>
    </li>
    <li class="flex gap-3">
      <UIcon name="i-lucide-map-pin" class="size-7 shrink-0" aria-hidden="true" />
      <span>Es en <strong>{{ turno.centro?.nombre }}</strong>, {{ turno.centro?.direccion }}, {{ turno.centro?.localidad }}.</span>
    </li>
    <li v-if="requisitos" class="flex gap-3">
      <UIcon name="i-lucide-id-card" class="size-7 shrink-0" aria-hidden="true" />
      <span>{{ requisitos }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
export interface TurnoResumible {
  fecha_hora: string
  especialidad: { nombre_comun: string, nombre_tecnico: string, icono: string } | null
  profesional: { nombre: string, apellido: string } | null
  centro: { nombre: string, direccion: string, localidad: string } | null
}

const props = defineProps<{ turno: TurnoResumible, requisitos?: string | null }>()

const cuando = computed(() => fechaHoraEnPalabras(props.turno.fecha_hora))
</script>
