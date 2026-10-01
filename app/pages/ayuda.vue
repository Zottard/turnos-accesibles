<template>
  <div class="max-w-prose flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Ayuda</h1>
      <p class="text-lg">Acá te contamos cómo usar la app, paso a paso. Si algo no te sale, escribinos al final de esta página.</p>
    </div>

    <nav aria-labelledby="titulo-indice">
      <h2 id="titulo-indice" class="text-xl font-bold mb-3">En esta página</h2>
      <ul class="flex flex-col gap-2 list-disc ps-6">
        <li v-for="s in SECCIONES" :key="s.id"><ULink :to="`#${s.id}`" class="underline">{{ s.titulo }}</ULink></li>
      </ul>
    </nav>

    <section :aria-labelledby="SECCIONES[0]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[0]!.id" class="text-xl font-bold">{{ SECCIONES[0]!.titulo }}</h2>
      <ol class="flex flex-col gap-2 list-decimal ps-6 text-lg">
        <li>Tocá <strong>Sacar un turno</strong>.</li>
        <li>Contanos qué te pasa o elegí el médico. Si no sabés cuál, escribí cómo te sentís y te sugerimos uno.</li>
        <li>Elegí dónde te queda cómodo.</li>
        <li>Elegí el día y la hora.</li>
        <li>Revisá todo y tocá <strong>Sí, reservar este turno</strong>.</li>
      </ol>
      <p class="text-lg">Te hacemos una pregunta por pantalla. Siempre ves en qué paso estás y podés volver atrás sin perder lo que elegiste.</p>
      <p class="text-lg">Para reservar necesitás una cuenta. Para mirar los turnos libres, no.</p>
    </section>

    <section :aria-labelledby="SECCIONES[1]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[1]!.id" class="text-xl font-bold">{{ SECCIONES[1]!.titulo }}</h2>
      <p class="text-lg">Entrá a <strong>Mis turnos</strong>. Al lado de cada turno están los botones <strong>Cancelar</strong> y <strong>Cambiar de fecha</strong>.</p>
      <p class="text-lg">Si cambiás la fecha, tu turno de antes queda reservado hasta que confirmes el nuevo. Así no te quedás sin ninguno.</p>
    </section>

    <section :aria-labelledby="SECCIONES[2]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[2]!.id" class="text-xl font-bold">{{ SECCIONES[2]!.titulo }}</h2>
      <p class="text-lg">Arriba de todo está el botón <strong>Cómo se ve</strong>. Ahí podés:</p>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg">
        <li>Hacer la letra más grande.</li>
        <li>Poner fondo negro con letras blancas, o al revés.</li>
        <li>Sacar las animaciones.</li>
        <li>Pedir que las explicaciones sean más simples.</li>
      </ul>
      <p class="text-lg">Si tenés cuenta, eso se guarda en <strong>Cómo quiero usar la app</strong> y lo vas a ver igual en cualquier celular o computadora.</p>
    </section>

    <section :aria-labelledby="SECCIONES[3]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[3]!.id" class="text-xl font-bold">{{ SECCIONES[3]!.titulo }}</h2>
      <p class="text-lg">Si activás <strong>Leer las pantallas en voz alta</strong> en <strong>Cómo se ve</strong>, aparece el botón <strong>Escuchar</strong> para que la app te lea lo importante.</p>
      <p class="text-lg">En los lugares donde hay que escribir, el botón <strong>Decilo con tu voz</strong> te deja decirlo en voz alta. La primera vez, el navegador te pide permiso para usar el micrófono.</p>
      <p class="text-lg">Las dos cosas dependen del navegador. Andan mejor en Chrome y en Edge.</p>
    </section>

    <section :aria-labelledby="SECCIONES[4]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[4]!.id" class="text-xl font-bold">{{ SECCIONES[4]!.titulo }}</h2>
      <p class="text-lg">Un familiar o alguien de confianza puede sacar turnos por vos. Entrá a <strong>Mis acompañantes</strong>, tocá <strong>Invitar a alguien</strong> y elegí qué puede hacer.</p>
      <p class="text-lg">Le mandás el enlace. Cuando lo acepta, puede ver tus turnos y, si lo permitiste, sacar o cancelar. Le podés quitar el permiso cuando quieras.</p>
    </section>

    <section :aria-labelledby="SECCIONES[5]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[5]!.id" class="text-xl font-bold">{{ SECCIONES[5]!.titulo }}</h2>
      <p class="text-lg">Así la tenés con tus otras aplicaciones, sin buscarla en el navegador.</p>
      <InstalarApp />
      <h3 class="text-lg font-bold">En un celular Android</h3>
      <p class="text-lg">Abrí la app en Chrome. Tocá los tres puntos de arriba a la derecha y después <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.</p>
      <h3 class="text-lg font-bold">En un iPhone</h3>
      <p class="text-lg">Abrí la app en Safari. Tocá el botón de compartir (un cuadrado con una flecha para arriba) y después <strong>Agregar a inicio</strong>.</p>
    </section>

    <section :aria-labelledby="SECCIONES[6]!.id" class="flex flex-col gap-3">
      <h2 :id="SECCIONES[6]!.id" class="text-xl font-bold">{{ SECCIONES[6]!.titulo }}</h2>
      <p class="text-lg">
        No. Es un trabajo de la facultad. Los hospitales y centros de salud existen, pero los turnos son de prueba:
        <strong>no te presentes con un turno de esta app</strong>. Para un turno real, usá el sistema oficial de tu municipio o provincia.
      </p>
      <p class="text-lg">Más detalles en los <ULink to="/terminos" class="underline">Términos de uso</ULink>.</p>
    </section>

    <section :aria-labelledby="SECCIONES[7]!.id" class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2 :id="SECCIONES[7]!.id" class="text-xl font-bold">{{ SECCIONES[7]!.titulo }}</h2>
        <p class="text-lg">Contanos si algo no se entiende, no se puede usar con tu lector de pantalla o querés pedirnos algo sobre tus datos.</p>
      </div>

      <div v-if="enviada" class="flex flex-col gap-4">
        <p ref="listoEl" tabindex="-1" class="text-lg font-bold">Listo. Recibimos tu mensaje.</p>
        <p class="text-lg">{{ form.correo ? `Te respondemos a ${form.correo}.` : 'No nos dejaste un correo, así que no vamos a poder responderte, pero lo vamos a leer.' }}</p>
        <UButton icon="i-lucide-pencil" label="Escribir otro mensaje" class="self-start" @click="otro" />
      </div>

      <UForm v-else method="post" :validate-on="['input']" :schema="SCHEMA_CONSULTA" :state="form" class="flex flex-col gap-6" @submit="enviar" @error="alFallar">
        <OpcionesTarjeta v-model="form.tipo" legend="¿Sobre qué es?" :opciones="TIPOS" />
        <UFormField label="Tu mensaje" name="mensaje" description="Por ejemplo: en el paso de elegir la hora, el lector no me dice qué día es.">
          <UTextarea id="consulta-mensaje" v-model="form.mensaje" :rows="5" autoresize class="w-full" />
        </UFormField>
        <UFormField label="Tu correo (si querés que te respondamos)" name="correo">
          <UInput id="consulta-correo" v-model="form.correo" type="email" autocomplete="email" class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" icon="i-lucide-circle-x" title="No pudimos mandar tu mensaje." :description="error" />

        <UButton type="submit" color="primary" variant="solid" icon="i-lucide-send" label="Mandar el mensaje" block class="sm:w-auto sm:self-start" :loading="enviando" />
      </UForm>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Opcion } from '~/components/patrones/OpcionesTarjeta.vue'

const SECCIONES = [
  { id: 'sacar-turno', titulo: 'Cómo sacar un turno' },
  { id: 'cancelar', titulo: 'Cómo cancelar o cambiar de fecha' },
  { id: 'como-se-ve', titulo: 'Cómo hacer la letra más grande o cambiar los colores' },
  { id: 'voz', titulo: 'Que la app te lea, o hablar en vez de escribir' },
  { id: 'acompanante', titulo: 'Pedirle ayuda a alguien' },
  { id: 'instalar', titulo: 'Instalar la app en el celular' },
  { id: 'reales', titulo: '¿Los turnos son de verdad?' },
  { id: 'escribinos', titulo: 'Escribinos' },
]

const TIPOS: Opcion[] = [
  { value: 'accesibilidad', label: 'Algo no se puede usar o no se entiende', icon: 'i-lucide-accessibility' },
  { value: 'datos', label: 'Mis datos personales', description: 'Ver, corregir o borrar lo que guardamos.', icon: 'i-lucide-shield' },
  { value: 'otra', label: 'Otra cosa', icon: 'i-lucide-message-circle' },
]

useHead({ title: 'Ayuda' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { alFallar } = useFormulario()
const { announce, alert } = useAnuncio()
const listoEl = useTemplateRef<HTMLElement>('listoEl')

const form = reactive({ tipo: 'accesibilidad', mensaje: '', correo: (user.value?.email as string | undefined) ?? '' })
const enviando = ref(false)
const enviada = ref(false)
const error = ref('')

async function enviar() {
  enviando.value = true
  error.value = ''
  const { error: e } = await supabase.from('consultas').insert({ tipo: form.tipo, mensaje: form.mensaje.trim(), correo: form.correo.trim() || null })
  enviando.value = false
  if (e) {
    error.value = mensajeDeError(e)
    alert(`No pudimos mandar tu mensaje. ${error.value}`)
    return
  }
  enviada.value = true
  announce('Listo. Recibimos tu mensaje.')
  await nextTick()
  listoEl.value?.focus()
}

function otro() {
  form.mensaje = ''
  enviada.value = false
}
</script>
