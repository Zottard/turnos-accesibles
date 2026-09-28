<template>
  <UBadge :color="actual.color" :icon="actual.icon" :label="actual.label" />
</template>

<script setup lang="ts">
const props = defineProps<{ estado: string }>()

const actual = computed(() => estado(props.estado))
</script>
