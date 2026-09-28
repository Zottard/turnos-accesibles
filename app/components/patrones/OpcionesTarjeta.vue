<template>
  <URadioGroup v-model="seleccion" :legend="legend" :items="opciones">
    <template #label="{ item }">
      <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <UIcon v-if="iconOf(item)" :name="iconOf(item)!" class="size-8 shrink-0" aria-hidden="true" />
        <span>{{ labelOf(item) }}</span>
      </span>
    </template>
  </URadioGroup>
</template>

<script setup lang="ts">
export interface Opcion {
  value: string
  label: string
  description?: string
  icon?: string
}

const props = defineProps<{ legend: string, opciones: Opcion[] }>()

const seleccion = defineModel<string>()

const find = (item: unknown) => props.opciones.find((o) => o.value === (item as Opcion | undefined)?.value)
const iconOf = (item: unknown) => find(item)?.icon
const labelOf = (item: unknown) => find(item)?.label
</script>
