<template>
  <main class="flex flex-col gap-8 p-4">
    <h1 class="text-2xl font-bold">Muestra: {{ route.query.tema }}, {{ route.query.escala }} %</h1>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold">Texto</h2>
      <p>Texto de contenido. Tu turno es el martes 14 de octubre, a las 10 de la mañana.</p>
      <p class="text-muted">Texto secundario: Oftalmología</p>
      <p><a href="#" class="text-primary underline">Un enlace</a></p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold">Botones</h2>
      <div class="flex flex-wrap gap-2">
        <UButton color="primary" variant="solid" label="Sí, reservar este turno" />
        <UButton label="Volver atrás" icon="i-lucide-arrow-left" />
        <UButton color="error" variant="solid" label="Cancelar el turno" />
        <UButton label="Deshabilitado" disabled />
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold">Campos</h2>
      <UFormField label="Tu correo" name="correo">
        <UInput type="email" class="w-full" />
      </UFormField>
      <UFormField label="Tu documento" name="documento" error="Escribí solo los números, sin puntos.">
        <UInput class="w-full" />
      </UFormField>
      <USwitch label="Leer en voz alta" size="xl" />
      <URadioGroup legend="¿Cuándo podés ir?" :items="['Lo antes posible', 'A la mañana', 'A la tarde']" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold">Estados</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge color="success" variant="outline" icon="i-lucide-circle-check" label="Disponible" size="xl" />
        <UBadge color="warning" variant="outline" icon="i-lucide-clock" label="Reservado" size="xl" />
        <UBadge color="error" variant="outline" icon="i-lucide-circle-x" label="Cancelado" size="xl" />
      </div>
      <UAlert color="success" variant="outline" icon="i-lucide-circle-check" title="Listo. Reservamos tu turno." />
      <UAlert color="warning" variant="outline" icon="i-lucide-triangle-alert" title="Ya tenés un turno ese día a la misma hora." />
      <UAlert color="error" variant="outline" icon="i-lucide-circle-x" title="Ese turno lo tomó otra persona." description="Te mostramos otros turnos parecidos." />
    </section>
  </main>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

useHead({
  title: 'Muestra',
  htmlAttrs: {
    'data-theme': () => String(route.query.tema ?? 'claro'),
    'data-text-scale': () => String(route.query.escala ?? '100'),
  },
})
</script>
