<!--
  Mensaje destacado. Cada tipo tiene color, ícono y una palabra ("Atención:"),
  así nunca dependemos solo del color. Los errores usan role="alert" (se leen enseguida).
-->
<script setup lang="ts">
type TipoAviso = 'info' | 'exito' | 'atencion' | 'error'

const props = withDefaults(
  defineProps<{
    tipo?: TipoAviso
    titulo?: string
  }>(),
  {
    tipo: 'info',
    titulo: undefined,
  },
)

const DATOS: Record<TipoAviso, { icono: string; palabra: string }> = {
  info: { icono: 'i', palabra: 'Información' },
  exito: { icono: '✓', palabra: 'Listo' },
  atencion: { icono: '!', palabra: 'Atención' },
  error: { icono: '✕', palabra: 'Hubo un problema' },
}

const datos = computed(() => DATOS[props.tipo])
</script>

<template>
  <div class="aviso" :class="`aviso--${tipo}`" :role="tipo === 'error' ? 'alert' : 'status'">
    <span class="aviso__icono" aria-hidden="true">{{ datos.icono }}</span>
    <div class="aviso__texto">
      <p class="aviso__titulo">
        <template v-if="titulo">{{ titulo }}</template>
        <template v-else>{{ datos.palabra }}</template>
      </p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.aviso {
  --color-aviso: var(--primario);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--espacio-3);
  padding: var(--relleno-tarjeta);
  background: var(--fondo-info);
  border: var(--grosor-borde) solid var(--color-aviso);
  border-left-width: 8px;
  border-radius: var(--radio-tarjeta);
}

.aviso--exito {
  --color-aviso: var(--exito);
  background: var(--fondo-exito);
}

.aviso--atencion {
  --color-aviso: var(--atencion);
  background: var(--fondo-atencion);
}

.aviso--error {
  --color-aviso: var(--error);
  background: var(--fondo-error);
}

.aviso__icono {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-aviso);
  color: var(--fondo);
  font-family: var(--fuente-titulos);
  font-weight: 800;
  line-height: 1;
}

/* Si no hay lugar al lado del ícono, el texto baja abajo. */
.aviso__texto {
  flex: 1 1 8rem;
  overflow-wrap: break-word;
}

.aviso__titulo {
  font-family: var(--fuente-titulos);
  font-weight: 700;
}
</style>
