<!--
  El enlace de una invitación, para mandarlo: "Copiar enlace" y "Compartir por WhatsApp".
  El enlace también se ve escrito (se puede seleccionar a mano si copiar no funciona).
-->
<script setup lang="ts">
const props = defineProps<{
  token: string
  nombreQuienInvita: string
}>()

const { anunciar } = useAnuncio()
const origen = useRequestURL().origin
const enlace = computed(() => enlaceInvitacion(origen, props.token))
const whatsapp = computed(() => enlaceWhatsApp(textoInvitacion(props.nombreQuienInvita, enlace.value)))
const copiado = ref('')

async function copiar() {
  try {
    await navigator.clipboard.writeText(enlace.value)
    copiado.value = 'Copiamos el enlace. Ahora pegalo en un mensaje para la persona.'
  } catch {
    // Sin permiso para copiar: seleccionamos el enlace para que lo copie a mano.
    const campo = document.getElementById('enlace-invitacion') as HTMLInputElement | null
    campo?.focus()
    campo?.select()
    copiado.value = 'No pudimos copiarlo solo. Ya está seleccionado: copialo con el menú del teléfono o con Control + C.'
  }
  anunciar(copiado.value)
}
</script>

<template>
  <div class="pila">
    <div class="campo-enlace">
      <label for="enlace-invitacion">Enlace de la invitación</label>
      <input id="enlace-invitacion" type="text" :value="enlace" readonly @focus="($event.target as HTMLInputElement).select()" />
    </div>
    <div class="acciones">
      <Boton @click="copiar"><span aria-hidden="true">📋</span> Copiar enlace</Boton>
      <a class="boton boton--secundario" :href="whatsapp" target="_blank" rel="noopener noreferrer">
        <span aria-hidden="true">💬</span>
        Compartir por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
      </a>
    </div>
    <p v-if="copiado" role="status">{{ copiado }}</p>
  </div>
</template>

<style scoped>
.campo-enlace {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}
</style>
