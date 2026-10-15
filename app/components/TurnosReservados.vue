<!--
  Los turnos reservados que frenan una baja (RF-08): número, día y hora, profesional y centro.
  Sin datos de las personas. Si la base mandó menos de los que hay, lo dice.
-->
<script setup lang="ts">
const props = defineProps<{
  turnos: TurnoReservado[]
  cantidad?: number
}>()

const faltan = computed(() => Math.max(0, (props.cantidad ?? props.turnos.length) - props.turnos.length))
</script>

<template>
  <div v-if="turnos.length > 0" class="reservados">
    <p>Estos son los turnos reservados:</p>
    <ul>
      <li v-for="turno in turnos" :key="turno.numero">
        <strong>N.º {{ turno.numero }}</strong>: {{ conMayuscula(turnoEnPalabras(turno.inicio)) }}.
        {{ turno.especialidad }} con {{ turno.profesional }}, en {{ turno.centro }}.
      </li>
    </ul>
    <p v-if="faltan > 0">Y {{ faltan }} más.</p>
  </div>
</template>

<style scoped>
.reservados {
  margin-top: var(--espacio-2);
}

.reservados ul {
  margin-top: var(--espacio-1);
}
</style>
