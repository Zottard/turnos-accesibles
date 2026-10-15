<!-- Estructura común de todas las pantallas: encabezado, contenido y pie. -->
<script setup lang="ts">
const { anuncio, anunciar } = useAnuncio()
const { conSesion, salir } = useSesion()

async function salirDeLaCuenta() {
  await salir()
  anunciar('Saliste de tu cuenta.')
  await navigateTo('/')
}
</script>

<template>
  <div class="sitio">
    <SaltarAlContenido />

    <header class="encabezado">
      <div class="contenedor encabezado__interior">
        <!-- Con la sesión iniciada, el inicio es /inicio (y el logo lleva ahí). -->
        <NuxtLink :to="conSesion ? '/inicio' : '/'" class="encabezado__marca">
          <picture>
            <source media="(max-width: 30rem)" srcset="/icono.svg" />
            <img src="/logo.svg" alt="Turnos Accesibles, ir al inicio" width="225" height="48" />
          </picture>
        </NuxtLink>

        <!-- Pocas opciones, para que en el celular entren en una sola línea. -->
        <nav class="encabezado__nav" aria-label="Principal">
          <ul>
            <li><NuxtLink :to="conSesion ? '/inicio' : '/'">Inicio</NuxtLink></li>
            <!-- Con sesión, la ayuda sigue en el menú de accesibilidad y en el pie. -->
            <li v-if="!conSesion"><NuxtLink to="/accesibilidad">Ayuda</NuxtLink></li>
            <template v-if="conSesion">
              <li><NuxtLink to="/mis-turnos">Mis turnos</NuxtLink></li>
              <li><NuxtLink to="/perfil">Mi cuenta</NuxtLink></li>
              <li>
                <button type="button" class="encabezado__salir" @click="salirDeLaCuenta">Salir</button>
              </li>
            </template>
            <li v-else><NuxtLink to="/ingresar">Ingresar</NuxtLink></li>
          </ul>
        </nav>

        <MenuAccesibilidad />
      </div>
    </header>

    <main id="contenido" tabindex="-1" class="contenido">
      <slot />
    </main>

    <footer class="pie">
      <div class="contenedor pie__interior">
        <img class="pie__logo" src="/karma-tech.svg" alt="Karma Tech" width="201" height="48" />
        <nav aria-label="Información legal">
          <ul class="pie__enlaces">
            <li><NuxtLink to="/terminos">Términos de uso</NuxtLink></li>
            <li><NuxtLink to="/accesibilidad">Declaración de accesibilidad</NuxtLink></li>
          </ul>
        </nav>
        <p class="pie__nota">
          Prototipo académico — UTN FRGP, Metodología de Sistemas I, Grupo 28. No reemplaza a los
          sistemas oficiales de turnos.
        </p>
      </div>
    </footer>

    <!-- Regiones para lectores de pantalla: anuncian cambios sin mover el foco. -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ anuncio.urgente ? '' : anuncio.texto }}
    </div>
    <div class="sr-only" aria-live="assertive" aria-atomic="true">
      {{ anuncio.urgente ? anuncio.texto : '' }}
    </div>
  </div>
</template>

<style scoped>
.sitio {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.encabezado {
  background: var(--superficie);
  border-bottom: var(--grosor-borde) solid var(--borde);
}

.encabezado__interior {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--espacio-2) var(--espacio-4);
  padding-block: 0.75rem;
}

.encabezado__marca {
  display: block;
  margin-right: auto;
  border-radius: var(--radio-chico);
}

.encabezado__marca img {
  height: 56px;
  width: auto;
}

.encabezado__nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-1) var(--espacio-2);
  padding: 0;
  list-style: none;
}

.encabezado__nav a,
.encabezado__salir {
  display: inline-flex;
  align-items: center;
  min-height: var(--alto-tactil);
  padding-inline: 0.75rem;
  border-radius: var(--radio-chico);
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--texto);
  text-decoration: none;
}

.encabezado__nav a:hover,
.encabezado__salir:hover {
  color: var(--primario);
  text-decoration: underline;
}

/* "Salir" es una acción (button), pero se ve igual que los enlaces del menú. */
.encabezado__salir {
  background: transparent;
  border: 0;
  cursor: pointer;
}

/* Página actual: subrayado grueso, no solo color. */
.encabezado__nav a[aria-current='page'] {
  color: var(--primario);
  text-decoration: underline;
  text-decoration-thickness: 4px;
  text-underline-offset: 8px;
}

/* En pantallas angostas la navegación pasa a su propia línea. */
@media (max-width: 40rem) {
  .encabezado__nav {
    order: 3;
    width: 100%;
  }

  .encabezado__nav ul {
    gap: var(--espacio-1);
  }

  .encabezado__nav a,
  .encabezado__salir {
    padding-inline: 0.5rem;
  }
}

.contenido {
  flex: 1;
}

.contenido:focus {
  outline: none;
}

.pie {
  margin-top: var(--espacio-6);
  background: var(--superficie);
  border-top: 6px solid var(--color-sol);
}

.pie__interior {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-3);
  padding-block: var(--espacio-5);
}

.pie__logo {
  align-self: flex-start;
  height: 48px;
  width: auto;
}

.pie__enlaces {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-2) var(--espacio-4);
  padding: 0;
  list-style: none;
}

.pie__enlaces a {
  display: inline-flex;
  align-items: center;
  min-height: var(--alto-tactil);
}

.pie__nota {
  color: var(--texto-suave);
}

/* En alto contraste los logos (texto oscuro) van sobre una placa blanca. */
html[data-contraste='alto'] .encabezado__marca img,
html[data-contraste='alto'] .pie__logo {
  padding: 4px 8px;
  background: #fff;
  border-radius: var(--radio-chico);
  box-sizing: content-box;
}

html[data-contraste='alto'] .pie {
  border-top-color: #fff;
}
</style>
