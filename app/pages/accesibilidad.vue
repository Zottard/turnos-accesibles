<script setup lang="ts">
useSeoMeta({
  title: 'Accesibilidad',
  description:
    'Declaración de accesibilidad de Turnos Accesibles y preferencias para leer mejor: texto grande, alto contraste y voz.',
})

// Correo de ejemplo (dominio reservado .example) hasta que el equipo tenga uno real.
const CORREO_CONTACTO = 'contacto@turnos-accesibles.example'
</script>

<template>
  <div class="contenedor pagina">
    <h1>Accesibilidad</h1>
    <p class="pagina__bajada">
      Queremos que cualquier persona pueda sacar un turno sola, sin importar su edad, su vista o
      cuánto use la computadora.
    </p>

    <section id="preferencias" class="tarjeta" aria-labelledby="titulo-preferencias" tabindex="-1">
      <h2 id="titulo-preferencias">Tus preferencias</h2>
      <p class="texto-suave">
        Elegí cómo querés ver y escuchar el sitio. Los cambios se ven enseguida.
      </p>
      <PreferenciasFormulario prefijo="pagina" />
    </section>

    <section id="declaracion" aria-labelledby="titulo-declaracion" class="pila">
      <h2 id="titulo-declaracion">Declaración de accesibilidad</h2>
      <LeerEnVoz objetivo-id="declaracion" />
      <p>
        Buscamos cumplir las pautas <strong>WCAG 2.1 nivel AA</strong>, que son el estándar
        internacional de accesibilidad web. También seguimos la <strong>Ley 26.653</strong> de
        accesibilidad de la información en las páginas web.
      </p>

      <h3>Qué podés hacer en este sitio</h3>
      <ul>
        <li>Agrandar el texto hasta el doble de tamaño.</li>
        <li>Usar alto contraste: fondo negro y letras blancas y amarillas.</li>
        <li>Escuchar la página con el botón "Escuchar".</li>
        <li>Sacar las animaciones.</li>
        <li>Usar todo con el teclado. El foco se ve siempre, con un borde amarillo.</li>
        <li>Usar un lector de pantalla. Te avisamos cada cambio importante.</li>
      </ul>

      <h3>Lo que todavía no está bien</h3>
      <ul>
        <li>La lectura en voz alta depende de tu navegador. Algunos no tienen voces en español.</li>
        <li>Tus preferencias quedan guardadas solo en este navegador. Pronto vas a poder guardarlas en tu cuenta.</li>
        <li>Es un prototipo: todavía no lo probamos con todas las personas y lectores de pantalla.</li>
      </ul>

      <h3>Contacto</h3>
      <p>
        Si algo no te funciona, contanos. Escribinos a
        <a :href="`mailto:${CORREO_CONTACTO}`">{{ CORREO_CONTACTO }}</a>. Te responde el equipo Karma
        Tech.
      </p>
    </section>
  </div>
</template>

<style scoped>
.tarjeta {
  max-width: 44rem;
  padding: var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-top: 8px solid var(--primario);
  border-radius: var(--radio-tarjeta);
  box-shadow: var(--sombra);
}

.tarjeta > h2 {
  margin-bottom: var(--espacio-2);
}

.tarjeta > p {
  margin-bottom: var(--espacio-4);
}

.pila h3 {
  margin-top: var(--espacio-4);
}
</style>
