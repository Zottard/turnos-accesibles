<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-6">
      <h1 class="text-2xl font-bold">Sacá un turno médico, paso a paso</h1>
      <p class="max-w-prose text-lg">
        Te ayudamos a pedir un turno en un hospital o centro de salud público.
        Te hacemos una pregunta por pantalla. Podés volver atrás cuando quieras.
      </p>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <UButton to="/turnos/asistente" color="primary" variant="solid" icon="i-lucide-calendar-plus" label="Sacar un turno" block class="sm:w-auto" />
        <UButton to="/turnos/buscar" icon="i-lucide-search" label="Ver todos los turnos libres" block class="sm:w-auto" />
      </div>
    </div>

    <section aria-labelledby="titulo-como" class="flex flex-col gap-4">
      <h2 id="titulo-como" class="text-xl font-bold">Cómo funciona</h2>
      <ol class="grid gap-4 sm:grid-cols-3">
        <li v-for="(p, i) in PASOS" :key="p.titulo" class="flex flex-col gap-2 border-2 border-default rounded-md p-4">
          <span class="flex items-center gap-2 text-lg font-bold">
            <UIcon :name="p.icono" class="size-6 shrink-0" aria-hidden="true" />
            <span><span class="sr-only">Paso {{ i + 1 }}: </span>{{ p.titulo }}</span>
          </span>
          <span class="text-lg">{{ p.texto }}</span>
        </li>
      </ol>
    </section>

    <section aria-labelledby="titulo-para-vos" class="flex flex-col gap-4">
      <h2 id="titulo-para-vos" class="text-xl font-bold">Hecha para que la puedas usar</h2>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg max-w-prose">
        <li>Letra grande, que podés agrandar más con el botón <strong>Cómo se ve</strong>.</li>
        <li>La app te puede leer las pantallas en voz alta, y podés hablar en vez de escribir.</li>
        <li>Un familiar te puede ayudar a sacar turnos desde su celular.</li>
      </ul>
      <p class="text-lg"><ULink to="/ayuda" class="underline">Ver la ayuda</ULink></p>
    </section>

    <section v-if="!user" aria-labelledby="titulo-cuenta" class="flex flex-col gap-4">
      <h2 id="titulo-cuenta" class="text-xl font-bold">Tu cuenta</h2>
      <p class="max-w-prose text-lg">Para reservar necesitás una cuenta. Para mirar los turnos libres, no.</p>
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <UButton to="/registrarme" icon="i-lucide-user-plus" label="Crear una cuenta" block class="sm:w-auto" />
        <UButton to="/ingresar" icon="i-lucide-log-in" label="Ya tengo cuenta, quiero ingresar" block class="sm:w-auto" />
      </div>
    </section>

    <p class="max-w-prose text-lg text-muted">
      Esta app es un trabajo de la facultad y no es el sistema oficial de turnos. Los turnos son de prueba.
      <ULink to="/terminos" class="underline">Leer los términos de uso</ULink>.
    </p>
  </div>
</template>

<script setup lang="ts">
const PASOS = [
  { titulo: 'Contanos qué te pasa', texto: 'Con tus palabras. Te decimos qué médico te conviene.', icono: 'i-lucide-message-circle' },
  { titulo: 'Elegí dónde y cuándo', texto: 'Te mostramos los lugares más cerca y los días libres.', icono: 'i-lucide-map-pin' },
  { titulo: 'Listo', texto: 'Te avisamos antes del turno. Lo podés cancelar o cambiar.', icono: 'i-lucide-circle-check' },
]

useHead({ title: 'Inicio' })

const user = useSupabaseUser()
</script>
