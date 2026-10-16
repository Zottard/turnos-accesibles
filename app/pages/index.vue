<script setup lang="ts">
useSeoMeta({
  title: 'Inicio',
  description:
    'Sacá tu turno de salud pública paso a paso. Con letra grande, alto contraste y lectura en voz alta.',
})

const PASOS = [
  {
    titulo: 'Contanos qué necesitás',
    texto: 'Escribilo o decilo con tus palabras. Por ejemplo: "me duele la rodilla".',
  },
  {
    titulo: 'Elegí día y lugar',
    texto: 'Te mostramos los centros de salud más cerca y los días libres.',
  },
  {
    titulo: 'Recibí el aviso',
    texto: 'Te avisamos antes del turno, con la dirección y qué tenés que llevar.',
  },
]

const AYUDAS = [
  {
    icono: 'Aa',
    titulo: 'Texto grande',
    texto: 'Agrandá la letra todo lo que necesites. También podés pasar a alto contraste.',
  },
  {
    icono: '🔊',
    titulo: 'Lectura en voz alta',
    texto: 'Tocá "Escuchar" y la página te lee lo que dice.',
  },
  {
    icono: '🤝',
    titulo: 'Ayuda de alguien de confianza',
    texto: 'Un familiar o amigo va a poder sacar turnos por vos, solo si vos le das permiso.',
  },
]
</script>

<template>
  <div>
    <section class="portada" aria-labelledby="titulo-portada">
      <div class="contenedor portada__interior">
        <div id="que-es" class="portada__texto">
          <p class="portada__etiqueta">Turnos de salud pública</p>
          <h1 id="titulo-portada">Sacá tu turno de salud, paso a paso</h1>
          <p class="portada__bajada">
            Te ayudamos a pedir turnos en hospitales y centros de salud. Sin apuro y con letra
            grande. Una cosa por pantalla.
          </p>
        </div>

        <div class="portada__acciones">
          <Boton to="/asistente">Pedir un turno paso a paso</Boton>
          <Boton to="/buscar" variante="secundario">Buscar un turno</Boton>
          <Boton to="/accesibilidad#preferencias" variante="secundario">Configurar accesibilidad</Boton>
        </div>
        <LeerEnVoz objetivo-id="que-es" />
        <p class="portada__nota">
          Podés buscar turnos sin cuenta. Si <NuxtLink to="/registrarme">creás una cuenta</NuxtLink>,
          guardamos cómo preferís ver la página.
        </p>

        <!-- Dibujo decorativo: un turno confirmado rodeado de formas de colores. -->
        <div class="portada__dibujo" aria-hidden="true">
          <span class="forma forma--sol" />
          <span class="forma forma--turquesa" />
          <span class="forma forma--coral" />
          <div class="ficha">
            <img src="/icono.svg" alt="" width="68" height="64" />
            <p class="ficha__estado">Turno confirmado</p>
            <p class="ficha__dato"><strong>Martes 14</strong> · 9:30</p>
            <p class="ficha__dato">Clínica médica</p>
            <p class="ficha__dato">Hospital de Pacheco</p>
          </div>
        </div>
      </div>
    </section>

    <section class="contenedor seccion" aria-labelledby="titulo-como">
      <h2 id="titulo-como">Cómo funciona</h2>
      <ol class="pasos">
        <li v-for="(paso, indice) in PASOS" :key="paso.titulo" class="paso" :class="`paso--${indice + 1}`">
          <span class="paso__numero" aria-hidden="true">{{ indice + 1 }}</span>
          <h3>{{ paso.titulo }}</h3>
          <p>{{ paso.texto }}</p>
        </li>
      </ol>
    </section>

    <section class="contenedor seccion" aria-labelledby="titulo-vos">
      <h2 id="titulo-vos">Pensado para vos</h2>
      <ul class="ayudas">
        <li v-for="ayuda in AYUDAS" :key="ayuda.titulo" class="ayuda">
          <span class="ayuda__icono" aria-hidden="true">{{ ayuda.icono }}</span>
          <h3>{{ ayuda.titulo }}</h3>
          <p>{{ ayuda.texto }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* --- Portada --- */
.portada {
  position: relative;
  overflow: hidden;
  padding-block: var(--espacio-5) var(--espacio-6);
  background: var(--fondo);
}

.portada__interior {
  display: grid;
  gap: var(--espacio-4);
  align-items: start;
}

@media (min-width: 60rem) {
  .portada__interior {
    grid-template-columns: 1.3fr 1fr;
    column-gap: var(--espacio-6);
  }

  .portada__interior > :not(.portada__dibujo) {
    grid-column: 1;
  }

  .portada__dibujo {
    grid-column: 2;
    grid-row: 1 / span 4;
    align-self: center;
  }
}

.portada__etiqueta {
  display: inline-block;
  max-width: 100%;
  margin-bottom: var(--espacio-3);
  padding: 0.2rem 0.9rem;
  background: var(--color-sol);
  color: var(--color-tinta);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 600;
}

.portada h1 {
  font-size: clamp(2rem, 1.4rem + 2.5vw, 3rem);
  color: var(--texto);
}

.portada__bajada {
  margin-top: var(--espacio-3);
  font-size: 1.15rem;
  color: var(--texto-suave);
}

.portada__nota {
  color: var(--texto-suave);
}

.portada__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espacio-3);
}

/* Dibujo decorativo: solo en pantallas anchas, en el celular ocupa lugar sin aportar. */
.portada__dibujo {
  display: none;
}

@media (min-width: 48rem) {
  .portada__dibujo {
    display: grid;
  }
}

.portada__dibujo {
  position: relative;
  min-height: 18rem;
  place-items: center;
  padding: var(--espacio-5);
}

.forma {
  position: absolute;
  border-radius: 50%;
}

.forma--sol {
  width: 60%;
  aspect-ratio: 1;
  top: 0;
  right: 5%;
  background: var(--color-sol);
}

.forma--turquesa {
  width: 38%;
  aspect-ratio: 1;
  bottom: 0;
  left: 2%;
  background: var(--color-turquesa);
  opacity: 0.85;
}

.forma--coral {
  width: 22%;
  aspect-ratio: 1;
  bottom: 12%;
  right: 0;
  background: var(--color-coral);
  border-radius: 40% 60% 55% 45%;
}

.ficha {
  position: relative;
  width: min(100%, 17rem);
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
  transform: rotate(-3deg);
}

.ficha img {
  width: 3rem;
  height: auto;
  margin-bottom: var(--espacio-2);
}

.ficha__estado {
  display: inline-block;
  margin-bottom: var(--espacio-2);
  padding: 0.1rem 0.7rem;
  background: var(--fondo-exito);
  color: var(--exito);
  border-radius: var(--radio-boton);
  font-family: var(--fuente-titulos);
  font-weight: 700;
}

.ficha__dato {
  color: var(--texto);
}

/* --- Secciones --- */
.seccion {
  padding-block: var(--espacio-5);
}

.seccion h2 {
  margin-bottom: var(--espacio-4);
}

.pasos,
.ayudas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: var(--espacio-4);
  padding: 0;
  list-style: none;
}

.paso,
.ayuda {
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
}

.paso {
  --color-paso: var(--color-violeta);
  border-top: 8px solid var(--color-paso);
}

.paso--2 {
  --color-paso: var(--color-turquesa);
}

.paso--3 {
  --color-paso: var(--color-coral);
}

.paso__numero {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--espacio-3);
  border-radius: 50%;
  background: var(--color-paso);
  color: var(--color-blanco);
  font-family: var(--fuente-titulos);
  font-size: 1.4rem;
  font-weight: 800;
}

.paso h3,
.ayuda h3 {
  margin-bottom: var(--espacio-2);
}

.ayuda__icono {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: var(--espacio-3);
  border-radius: var(--radio-chico);
  background: var(--fondo-resaltado);
  color: var(--color-tinta);
  font-family: var(--fuente-titulos);
  font-size: 1.3rem;
  font-weight: 800;
}

/* Con el texto muy grande, el dibujo no entra: lo sacamos y el texto usa todo el ancho. */
html[data-texto='175'] .portada__dibujo,
html[data-texto='200'] .portada__dibujo {
  display: none;
}

html[data-texto='175'] .portada__interior,
html[data-texto='200'] .portada__interior {
  grid-template-columns: 1fr;
}

/* --- Alto contraste: sin formas de color, todo blanco sobre negro. --- */
html[data-contraste='alto'] .forma {
  display: none;
}

html[data-contraste='alto'] .portada__etiqueta {
  background: var(--primario);
  color: #000;
}

html[data-contraste='alto'] .paso {
  --color-paso: #fff;
}

html[data-contraste='alto'] .paso__numero {
  color: #000;
}

html[data-contraste='alto'] .ayuda__icono {
  border: 3px solid #fff;
  color: #fff;
}

html[data-contraste='alto'] .ficha {
  transform: none;
}
</style>
