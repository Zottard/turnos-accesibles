<!--
  Auditoría (RF-08 y RNF Confiabilidad): los últimos 100 cambios, del más nuevo al más viejo, cada uno
  en una frase. Se puede filtrar por tipo de cambio. Sin datos personales: solo quién lo hizo.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'admin' })
useSeoMeta({ title: 'Auditoría' })

const route = useRoute()
const router = useRouter()
const { cargarAuditoria } = useAdmin()
const { anunciar } = useAnuncio()

// El filtro va en la dirección (?tabla=centros): se puede recargar o compartir.
const tabla = computed(() => {
  const pedida = typeof route.query.tabla === 'string' ? route.query.tabla : ''
  return pedida in NOMBRES_TABLA_AUDITORIA ? pedida : ''
})
const elegida = ref(tabla.value)

const { data: auditoria, refresh } = await useAsyncData('admin-auditoria', () => cargarAuditoria(tabla.value || null))
const entradas = computed(() => auditoria.value?.datos ?? [])

watch(tabla, async () => {
  elegida.value = tabla.value
  await refresh()
  anunciar(entradas.value.length === 1 ? 'Mostramos 1 cambio.' : `Mostramos ${entradas.value.length} cambios.`)
})

async function filtrar() {
  await router.push({ query: elegida.value ? { tabla: elegida.value } : {} })
}
</script>

<template>
  <div class="contenedor pagina">
    <NavPanel />
    <h1>Auditoría</h1>
    <p class="pagina__bajada">Quién cambió qué y cuándo. Mostramos los últimos 100 cambios.</p>

    <form class="filtro tarjeta" @submit.prevent="filtrar">
      <div class="campo-lista">
        <label for="auditoria-tabla">Qué cambios ver</label>
        <select id="auditoria-tabla" v-model="elegida">
          <option value="">Todos</option>
          <option v-for="(nombre, clave) in NOMBRES_TABLA_AUDITORIA" :key="clave" :value="clave">{{ nombre }}</option>
        </select>
      </div>
      <div>
        <Boton type="submit" variante="secundario">Ver</Boton>
      </div>
    </form>

    <Aviso v-if="auditoria?.error" tipo="error">
      <p>{{ auditoria.error }}</p>
    </Aviso>
    <p v-else-if="entradas.length === 0">Todavía no hay cambios de este tipo.</p>
    <ol v-else class="registro">
      <li v-for="entrada in entradas" :key="entrada.id" class="registro__fila" :class="`registro__fila--${entrada.accion}`">
        {{ textoAuditoria(entrada) }}
      </li>
    </ol>
  </div>
</template>

<style scoped>
.filtro {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--espacio-3);
  max-width: 40rem;
  border-top-width: var(--grosor-borde);
}

.filtro .campo-lista {
  flex: 1 1 14rem;
}

.registro {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-2);
  padding: 0;
  list-style: none;
}

.registro__fila {
  max-width: 70ch;
  padding: var(--espacio-2) var(--espacio-3);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-left: 6px solid var(--primario);
  border-radius: var(--radio-chico);
}

.registro__fila--baja {
  border-left-color: var(--error);
}

.registro__fila--acceso_denegado {
  border-left-color: var(--atencion);
}
</style>
