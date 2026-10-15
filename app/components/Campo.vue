<!--
  Campo de formulario: etiqueta + entrada, con ayuda y error opcionales.
  La ayuda y el error quedan unidos a la entrada con aria-describedby,
  así el lector de pantalla los lee al llegar al campo.
-->
<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string
    etiqueta: string
    type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'search'
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'search' | 'url'
    ayuda?: string
    error?: string
    requerido?: boolean
  }>(),
  {
    type: 'text',
    autocomplete: undefined,
    inputmode: undefined,
    ayuda: undefined,
    error: undefined,
    requerido: false,
  },
)

const valor = defineModel<string>({ default: '' })

const idAyuda = computed(() => `${props.id}-ayuda`)
const idError = computed(() => `${props.id}-error`)

const descripcion = computed(() => {
  const ids: string[] = []
  if (props.error) ids.push(idError.value)
  if (props.ayuda) ids.push(idAyuda.value)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="campo">
    <label :for="id" class="campo__etiqueta">
      {{ etiqueta }}
      <span v-if="!requerido" class="campo__opcional">(opcional)</span>
    </label>
    <p v-if="ayuda" :id="idAyuda" class="campo__ayuda">{{ ayuda }}</p>
    <p v-if="error" :id="idError" class="campo__error">
      <span aria-hidden="true">✕</span>
      {{ error }}
    </p>
    <input
      :id="id"
      v-model="valor"
      :type="type"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :required="requerido"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="descripcion"
    />
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
}

.campo__opcional {
  font-family: var(--fuente-texto);
  font-weight: 400;
  color: var(--texto-suave);
}

.campo__ayuda {
  color: var(--texto-suave);
}

.campo__error {
  display: flex;
  gap: var(--espacio-2);
  font-weight: 700;
  color: var(--error);
}
</style>
