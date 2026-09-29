<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <span :id="idEtiqueta">Entrar como:</span>
      <ul :aria-labelledby="idEtiqueta" class="flex flex-wrap gap-2">
        <li v-for="u in USUARIOS_DEMO" :key="u.email">
          <UButton
            size="lg"
            :label="u.etiqueta"
            :color="perfilActual === u.email ? 'primary' : 'neutral'"
            :variant="perfilActual === u.email ? 'solid' : 'outline'"
            :aria-current="perfilActual === u.email ? 'true' : undefined"
            :loading="entrando === u.email"
            @click="entrarComo(u)"
          />
        </li>
      </ul>
    </div>

    <UButton to="/demo" size="lg" icon="i-lucide-map" label="Ver todo el alcance" class="sm:ml-auto" />
  </div>
</template>

<script setup lang="ts">
const idEtiqueta = useId()

const { user, ingresar, salir } = useSesion()
const { announce, alert } = useAnuncio()

const entrando = ref<string>()

const perfilActual = computed(() => user.value?.email as string | undefined)

async function entrarComo(u: (typeof USUARIOS_DEMO)[number]) {
  if (perfilActual.value === u.email) return navigateTo(u.destino)
  entrando.value = u.email
  if (user.value) await salir()
  const resultado = await ingresar(u.email, CLAVE_DEMO)
  entrando.value = undefined
  if (!resultado.ok) {
    alert(`${resultado.aviso.titulo} ${resultado.aviso.ayuda}`)
    return
  }
  announce(`Entraste como ${u.etiqueta}.`)
  await navigateTo(u.destino)
}
</script>
