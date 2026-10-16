<!--
  Personas que te ayudan (RF-07): a quién invitaste, qué puede hacer cada una y en qué estado está.
  Las vigentes arriba; las anteriores (permiso quitado, invitación vencida o no aceptada) abajo,
  porque también son constancia. Cada una lleva a su constancia, donde se puede quitar el permiso.
  ?revocado=<id> viene de quitar un permiso: lo confirma con un aviso.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Personas que te ayudan' })

const route = useRoute()
const { cargarMios } = useAcompanantes()
const { data: cargado, refresh } = await useAsyncData('acompanantes', () => cargarMios())

const vigentes = computed(() => (cargado.value?.datos ?? []).filter((fila) => esVigente(fila.estado)))
const anteriores = computed(() => (cargado.value?.datos ?? []).filter((fila) => !esVigente(fila.estado)))
const revocado = computed(() => (cargado.value?.datos ?? []).find((fila) => fila.id === route.query.revocado) ?? null)
</script>

<template>
  <div class="contenedor pagina">
    <h1>Personas que te ayudan</h1>
    <p class="pagina__bajada">
      Podés dejar que alguien de confianza vea tus turnos o te saque turnos. Vos decidís qué puede
      hacer y le podés quitar el permiso cuando quieras.
    </p>

    <Aviso v-if="revocado" tipo="exito" :titulo="revocado.aceptadoEn ? 'Le quitaste el permiso' : 'Cancelaste la invitación'">
      <p v-if="revocado.aceptadoEn">
        Desde ahora {{ revocado.nombreInvitado }} ya no puede ver tus turnos ni hacer nada con ellos. Le avisamos.
      </p>
      <p v-else>El enlace que le mandaste a {{ revocado.nombreInvitado }} ya no sirve.</p>
    </Aviso>

    <div>
      <Boton to="/acompanantes/invitar"><span aria-hidden="true">➕</span> Invitar a alguien</Boton>
    </div>

    <template v-if="cargado?.error">
      <Aviso tipo="error">
        <p>{{ cargado.error }}</p>
      </Aviso>
      <div>
        <Boton @click="refresh()">Probar de nuevo</Boton>
      </div>
    </template>

    <template v-else>
      <section class="pila" aria-labelledby="titulo-vigentes">
        <h2 id="titulo-vigentes">Ahora</h2>
        <p v-if="vigentes.length === 0">Nadie te ayuda por ahora. Si querés, invitá a alguien de confianza.</p>
        <ul v-else class="lista">
          <li v-for="fila in vigentes" :key="fila.id" class="persona">
            <EstadoAcompanamiento :estado="fila.estado" />
            <h3 :id="`persona-${fila.id}`">{{ fila.nombreInvitado }}</h3>
            <p class="texto-suave">{{ fila.correoInvitado }}</p>
            <p>Puede {{ alcanceEnPalabras(fila.alcance, 'tuyo') }}.</p>
            <p v-if="fila.estado === 'pendiente'" class="texto-suave">
              La invitación vence el {{ momentoEnPalabras(fila.venceEn) }}.
            </p>
            <div>
              <Boton :to="`/acompanantes/${fila.id}`" variante="secundario" :aria-describedby="`persona-${fila.id}`">
                {{ fila.estado === 'pendiente' ? 'Ver la invitación' : 'Ver la constancia' }}
              </Boton>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="anteriores.length > 0" class="pila" aria-labelledby="titulo-anteriores">
        <h2 id="titulo-anteriores">Anteriores</h2>
        <ul class="lista">
          <li v-for="fila in anteriores" :key="fila.id" class="persona persona--anterior">
            <EstadoAcompanamiento :estado="fila.estado" />
            <h3 :id="`persona-${fila.id}`">{{ fila.nombreInvitado }}</h3>
            <p class="texto-suave">{{ fila.correoInvitado }}</p>
            <p>
              <NuxtLink :to="`/acompanantes/${fila.id}`" :aria-describedby="`persona-${fila.id}`">Ver la constancia</NuxtLink>
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.lista {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  gap: var(--espacio-3);
  padding: 0;
  list-style: none;
}

.persona {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--espacio-2);
  max-width: none;
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-left: 8px solid var(--exito);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
}

.persona--anterior {
  border-left-color: var(--borde);
  box-shadow: none;
}
</style>
