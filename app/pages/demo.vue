<template>
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Todo lo que va a tener Turnos Accesibles</h1>
      <p class="max-w-prose text-lg">
        Estas son todas las pantallas del trabajo final. Las que dicen "Lista" ya se pueden usar.
        Para las que son de un rol, entrá primero con la barra de arriba.
      </p>
      <div class="flex flex-col gap-2">
        <p class="text-lg font-bold">{{ listas }} de {{ total }} pantallas listas, {{ borradores }} en borrador</p>
        <UProgress :model-value="listas" :max="total" aria-hidden="true" />
      </div>
      <ul class="flex flex-wrap gap-3" aria-label="Qué significa cada estado">
        <li v-for="e in Object.values(ESTADOS_PANTALLA)" :key="e.label">
          <UBadge :color="e.color" :icon="e.icon" :label="e.label" />
          <span class="sr-only">: {{ e.ayuda }}</span>
        </li>
      </ul>
    </div>

    <section v-for="grupo in ALCANCE" :key="grupo.titulo" class="flex flex-col gap-4" :aria-labelledby="idGrupo(grupo.titulo)">
      <h2 :id="idGrupo(grupo.titulo)" class="text-xl font-bold">
        {{ grupo.titulo }}
        <span v-if="grupo.requerimiento" class="text-base font-normal text-muted">· {{ grupo.requerimiento }}</span>
      </h2>

      <ul class="flex flex-col">
        <li
          v-for="p in grupo.pantallas"
          :key="p.nombre"
          class="flex flex-wrap items-start gap-x-6 gap-y-2 border-b-2 border-default py-4"
        >
          <div class="min-w-0 flex-1 flex flex-col gap-1">
            <p class="text-lg font-bold">
              <NuxtLink v-if="navegable(p)" :to="p.ruta" class="underline">{{ p.nombre }}</NuxtLink>
              <template v-else>{{ p.nombre }}</template>
            </p>
            <p>{{ p.descripcion }}</p>
            <p class="text-base text-muted">
              <span v-if="p.ruta" class="font-mono">{{ p.ruta }}</span>
              <span v-if="p.rol"> · Hay que entrar como {{ ROLES[p.rol] }}</span>
            </p>
          </div>
          <UBadge
            :color="ESTADOS_PANTALLA[p.estado].color"
            :icon="ESTADOS_PANTALLA[p.estado].icon"
            :label="p.estado === 'pendiente' ? `Fase ${p.fase}` : ESTADOS_PANTALLA[p.estado].label"
          />
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { EstadoPantalla, Pantalla } from '~/utils/alcance'

const ESTADOS_PANTALLA: Record<EstadoPantalla, { label: string, icon: string, color: 'success' | 'warning' | 'neutral', ayuda: string }> = {
  lista: { label: 'Lista', icon: 'i-lucide-circle-check', color: 'success', ayuda: 'ya se puede usar' },
  borrador: { label: 'En borrador', icon: 'i-lucide-pencil', color: 'warning', ayuda: 'la pantalla existe pero todavía no está completa' },
  pendiente: { label: 'Más adelante', icon: 'i-lucide-clock', color: 'neutral', ayuda: 'se hace en la fase que indica' },
}

const ROLES = { solicitante: 'Rosa', acompanante: 'Lucía', admin: 'Administración' }

if (!useRuntimeConfig().public.demo) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos esta página.', fatal: true })
}

useHead({ title: 'Alcance' })

const pantallas = ALCANCE.flatMap((g) => g.pantallas)
const total = pantallas.length
const listas = pantallas.filter((p) => p.estado === 'lista').length
const borradores = pantallas.filter((p) => p.estado === 'borrador').length

const navegable = (p: Pantalla) => p.estado !== 'pendiente' && !!p.ruta && !p.ruta.includes(':')
const idGrupo = (titulo: string) => `grupo-${titulo.toLowerCase().replace(/[^a-z]+/g, '-')}`
</script>
