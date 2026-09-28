<template>
  <main class="flex flex-col gap-12 p-4">
    <AsistentePaso
      :paso="1"
      :total="6"
      titulo="¿Qué médico necesitás?"
      descripcion="Elegí una opción. Después te preguntamos dónde y cuándo."
    >
      <UFormField name="especialidad" :error="errorEspecialidad">
        <OpcionesTarjeta v-model="especialidad" legend="Médicos más pedidos" :opciones="ESPECIALIDADES" />
      </UFormField>

      <template #acciones>
        <AccionesPaso @confirmar="confirmar" @volver="announce('Volviste')" />
      </template>
    </AsistentePaso>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Texto y lectura</h2>
      <p>Tu turno es el martes 14 de octubre, a las 10 de la mañana, en el Hospital de Pacheco.</p>
      <p class="text-muted">Texto secundario: Oftalmología</p>
      <p><a href="#" class="text-primary underline">Un enlace</a></p>
      <ReadAloudButton text="Tu turno es el martes 14 de octubre, a las 10 de la mañana." />
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Botones</h2>
      <div class="flex flex-wrap gap-3">
        <UButton color="primary" variant="solid" label="Sí, reservar este turno" />
        <UButton label="Volver atrás" icon="i-lucide-arrow-left" />
        <UButton color="error" variant="solid" label="Cancelar el turno" />
        <UButton label="Cargando" loading />
        <UButton label="No disponible" disabled />
        <UButton icon="i-lucide-x" aria-label="Cerrar" />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Campos</h2>
      <UFormField label="Contanos qué necesitás" name="pedido" description="Por ejemplo: un turno con el oculista cerca de casa.">
        <div class="flex flex-col gap-3">
          <UInput v-model="pedido" class="w-full" />
          <VoiceInputButton v-model="pedido" />
        </div>
      </UFormField>
      <UFormField label="Tu documento" name="documento" error="Escribí solo los números, sin puntos.">
        <UInput class="w-full" inputmode="numeric" />
      </UFormField>
      <UCheckbox label="Acepto que me avisen por correo" />
      <USwitch label="Leer en voz alta" />
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Estados de un turno</h2>
      <div class="flex flex-wrap gap-3">
        <EstadoBadge v-for="e in ESTADOS" :key="e.value" :estado="e.value" />
        <EstadoBadge estado="desconocido" />
      </div>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Avisos</h2>
      <UAlert color="success" icon="i-lucide-circle-check" title="Listo. Reservamos tu turno." description="Te vamos a recordar el turno el día anterior." />
      <UAlert color="warning" icon="i-lucide-triangle-alert" title="Ya tenés un turno ese día a la misma hora." description="Si seguís, vas a tener dos turnos juntos." />
      <UAlert color="error" icon="i-lucide-circle-x" title="Ese turno lo tomó otra persona." description="Te mostramos otros turnos parecidos." />
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">Estados de una pantalla</h2>
      <URadioGroup v-model="estadoVista" legend="Mostrar la pantalla" orientation="horizontal" :items="ESTADOS_VISTA" />
      <VistaEstados :estado="estadoVista" texto-vacio="No hay turnos para ese día." @reintentar="estadoVista = 'cargando'">
        <template #vacio>
          <div class="flex flex-wrap gap-3">
            <UButton label="Probar otro día" size="lg" />
            <UButton label="Avisarme si aparece uno" size="lg" />
          </div>
        </template>
        <p>Acá va el contenido de la pantalla.</p>
      </VistaEstados>
    </section>
    <LiveRegion />
  </main>
</template>

<script setup lang="ts">
import type { EstadoVista } from '~/components/patrones/VistaEstados.vue'

const ESPECIALIDADES = [
  { value: 'oftalmologia', label: 'Oculista', description: 'Oftalmología', icon: 'i-lucide-eye' },
  { value: 'medicina-general', label: 'Médico de familia', description: 'Medicina general', icon: 'i-lucide-stethoscope' },
  { value: 'cardiologia', label: 'Cardiólogo', description: 'Cardiología', icon: 'i-lucide-heart-pulse' },
  { value: 'odontologia', label: 'Dentista', description: 'Odontología', icon: 'i-lucide-smile' },
]

const ESTADOS_VISTA: { label: string, value: EstadoVista }[] = [
  { label: 'Contenido', value: 'contenido' },
  { label: 'Cargando', value: 'cargando' },
  { label: 'Vacío', value: 'vacio' },
  { label: 'Error', value: 'error' },
  { label: 'Sin permiso', value: 'sin-permiso' },
]

definePageMeta({ layout: false })

const route = useRoute()
const { announce, alert } = useAnuncio()

const especialidad = ref<string>()
const errorEspecialidad = ref<string>()
const pedido = ref('')
const estadoVista = ref<EstadoVista>('contenido')

function confirmar() {
  errorEspecialidad.value = especialidad.value ? undefined : 'Elegí un médico para seguir.'
  if (errorEspecialidad.value) alert(errorEspecialidad.value)
  else announce('Confirmaste')
}

watch(especialidad, () => { errorEspecialidad.value = undefined })

useHead({
  title: 'Muestra',
  htmlAttrs: {
    'data-theme': () => String(route.query.tema ?? 'claro'),
    'data-text-scale': () => String(route.query.escala ?? '100'),
  },
})
</script>
