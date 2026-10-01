<template>
  <div class="max-w-2xl flex flex-col gap-8">
    <AsistentePaso :paso="paso + 1" :total="PASOS.length" :titulo="actual.titulo" :descripcion="actual.descripcion">
      <PreferenciaControl v-if="actual.clave" :key="actual.clave" :clave="actual.clave" :legend="actual.titulo" legend-oculta />

      <dl v-else class="flex flex-col">
        <div v-for="r in resumen" :key="r.etiqueta" class="flex flex-wrap gap-x-6 gap-y-1 border-b-2 border-default py-3">
          <dt class="min-w-48 font-bold">{{ r.etiqueta }}</dt>
          <dd>{{ r.valor }}</dd>
        </div>
      </dl>

      <template #acciones>
        <AccionesPaso
          :confirmar="esUltimo ? 'Guardar y empezar' : undefined"
          :cargando="guardando"
          :sin-volver="paso === 0"
          @confirmar="avanzar"
          @volver="paso--"
        />
        <UButton v-if="paso === 0" variant="link" label="Lo configuro después" class="self-start" :loading="guardando" @click="terminar" />
      </template>
    </AsistentePaso>
  </div>
</template>

<script setup lang="ts">
import type { ClavePreferencia } from '~/components/preferencias/PreferenciaControl.vue'

const PASOS: { clave?: ClavePreferencia, titulo: string, descripcion: string }[] = [
  { clave: 'textScale', titulo: '¿Qué tamaño de letra te queda más cómodo?', descripcion: 'Cuando elegís una opción, la pantalla cambia al instante. Probá las que quieras.' },
  { clave: 'contrast', titulo: '¿Cómo ves mejor?', descripcion: 'Elegí los colores con los que te cuesta menos leer.' },
  { clave: 'voz', titulo: '¿Querés que te leamos las pantallas en voz alta?', descripcion: 'Si decís que sí, en cada pantalla te leemos la pregunta.' },
  { clave: 'plainLanguage', titulo: '¿Cómo querés que te expliquemos las cosas?', descripcion: 'Podés cambiarlo cuando quieras.' },
  { clave: 'avisos', titulo: '¿Cómo querés que te avisemos de tus turnos?', descripcion: 'Te recordamos cada turno el día anterior.' },
  { titulo: 'Listo, así queda la app', descripcion: 'Si querés cambiar algo, volvé atrás. También lo podés cambiar después desde "Mi perfil".' },
]

const TEXTOS_TAMANO = { 100: 'Normal', 125: 'Grande', 150: 'Muy grande', 200: 'Enorme' }
const TEXTOS_CANAL = { ambos: 'Aviso en la pantalla y sonido', visual: 'Solo aviso en la pantalla', sonoro: 'Solo sonido' }
const TEXTOS_VELOCIDAD = { lenta: 'despacio', normal: 'a velocidad normal', rapida: 'rápido' }

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Bienvenida' })

const route = useRoute()
const { prefs } = useAccesibilidad()
const { guardar } = usePreferenciasCuenta()
const { announce, alert } = useAnuncio()

const paso = ref(0)
const guardando = ref(false)

const actual = computed(() => PASOS[paso.value] ?? PASOS[0]!)
const esUltimo = computed(() => paso.value === PASOS.length - 1)

const resumen = computed(() => [
  { etiqueta: 'Letra', valor: TEXTOS_TAMANO[prefs.value.textScale] },
  { etiqueta: 'Colores', valor: prefs.value.contrast === 'alto' ? 'Fondo negro con letras blancas' : 'Fondo blanco con letras negras' },
  { etiqueta: 'Lectura en voz alta', valor: prefs.value.voiceEnabled ? `Sí, ${TEXTOS_VELOCIDAD[prefs.value.voiceRate]}` : 'No' },
  { etiqueta: 'Explicaciones', valor: prefs.value.plainLanguage ? 'Con palabras simples' : 'Con los términos de siempre' },
  { etiqueta: 'Avisos', valor: `${TEXTOS_CANAL[prefs.value.notificationChannel]}${prefs.value.emailReminders ? ', y también por correo' : ''}` },
])

function avanzar() {
  if (esUltimo.value) return terminar()
  paso.value++
}

async function terminar() {
  guardando.value = true
  const ok = await guardar()
  guardando.value = false
  if (!ok) {
    alert('No pudimos guardar tus preferencias. Revisá tu conexión y probá de nuevo.')
    return
  }
  announce('Guardamos tus preferencias.')
  await navigateTo(rutaSegura(route.query.volver))
}
</script>
