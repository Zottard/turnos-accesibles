<!-- Estructura común de todas las pantallas: encabezado, contenido y pie. -->
<script setup lang="ts">
const { anuncio, anunciar } = useAnuncio()
const { conSesion, salir } = useSesion()
const { sinLeer } = useAvisos()
const route = useRoute()

const sinLeerCantidad = computed(() => sinLeer.value.length)

async function salirDeLaCuenta() {
  await salir()
  anunciar('Saliste de tu cuenta.')
  await navigateTo('/')
}

// Menú del celular (v0.5): con la sesión iniciada y la pantalla angosta, Inicio, Mis turnos, Mi cuenta
// y Salir van dentro de "Menú". Avisos queda siempre a la vista. En pantallas anchas el botón no se
// ve y todo está en una línea.
const menuAbierto = ref(false)
const botonMenu = ref<HTMLButtonElement | null>(null)

function cerrarMenu() {
  menuAbierto.value = false
  botonMenu.value?.focus()
}

function alTocarTeclaEnMenu(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && menuAbierto.value) {
    cerrarMenu()
  }
}

watch(
  () => route.fullPath,
  () => {
    menuAbierto.value = false
  },
)
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

        <!-- Sin sesión, pocas opciones: entran en una línea. Con sesión, en el celular van en "Menú". -->
        <nav
          class="encabezado__nav"
          :class="{ 'encabezado__nav--sesion': conSesion, 'encabezado__nav--abierto': menuAbierto }"
          aria-label="Principal"
          @keydown="alTocarTeclaEnMenu"
        >
          <button
            v-if="conSesion"
            ref="botonMenu"
            type="button"
            class="encabezado__menu"
            :aria-expanded="menuAbierto ? 'true' : 'false'"
            aria-controls="menu-principal"
            @click="menuAbierto = !menuAbierto"
          >
            <span aria-hidden="true">{{ menuAbierto ? '✕' : '☰' }}</span>
            Menú
          </button>
          <ul id="menu-principal">
            <li class="encabezado__plegable"><NuxtLink :to="conSesion ? '/inicio' : '/'">Inicio</NuxtLink></li>
            <!-- Con sesión, la ayuda sigue en el menú de accesibilidad y en el pie. -->
            <li v-if="!conSesion"><NuxtLink to="/accesibilidad">Ayuda</NuxtLink></li>
            <template v-if="conSesion">
              <li class="encabezado__plegable"><NuxtLink to="/mis-turnos">Mis turnos</NuxtLink></li>
              <!-- Avisos siempre a la vista, con la cantidad sin leer en número (no solo un color). -->
              <li>
                <NuxtLink to="/avisos" class="encabezado__avisos">
                  Avisos
                  <span v-if="sinLeerCantidad > 0" class="encabezado__contador" aria-hidden="true">{{ sinLeerCantidad }}</span>
                  <span v-if="sinLeerCantidad > 0" class="sr-only">, {{ sinLeerCantidad }} sin leer</span>
                </NuxtLink>
              </li>
              <li class="encabezado__plegable"><NuxtLink to="/perfil">Mi cuenta</NuxtLink></li>
              <li class="encabezado__plegable">
                <button type="button" class="encabezado__salir" @click="salirDeLaCuenta">Salir</button>
              </li>
            </template>
            <li v-else><NuxtLink to="/ingresar">Ingresar</NuxtLink></li>
          </ul>
        </nav>

        <MenuAccesibilidad />
      </div>
    </header>

    <BandaAvisos />

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

/* Cantidad de avisos sin leer: un número en una pastilla (además del texto para lectores). */
.encabezado__contador {
  display: inline-grid;
  place-items: center;
  min-width: 1.7em;
  height: 1.7em;
  margin-left: 0.4em;
  padding-inline: 0.4em;
  border-radius: var(--radio-boton);
  background: var(--atencion);
  color: var(--sobre-primario);
  font-size: 0.9em;
  line-height: 1;
}

/* "Menú": solo en pantallas angostas y con la sesión iniciada. */
.encabezado__menu {
  display: none;
  align-items: center;
  gap: var(--espacio-2);
  min-height: var(--alto-tactil);
  padding-inline: 0.9rem;
  background: var(--superficie);
  color: var(--primario);
  border: var(--grosor-borde) solid var(--primario);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 600;
  cursor: pointer;
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

  /* Con sesión: "Menú" y "Avisos" a la vista; el resto se despliega con "Menú". */
  .encabezado__nav--sesion {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--espacio-1) var(--espacio-2);
  }

  .encabezado__menu {
    display: inline-flex;
  }

  .encabezado__nav--sesion .encabezado__plegable {
    display: none;
  }

  .encabezado__nav--abierto ul {
    flex-direction: column;
    width: 100%;
  }

  .encabezado__nav--abierto .encabezado__plegable {
    display: block;
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
