<template>
  <div class="max-w-prose flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Declaración de accesibilidad</h1>
      <p class="text-lg">
        Turnos Accesibles quiere que cualquier persona pueda sacar un turno, use como use el celular o la computadora.
        Esta declaración cumple con lo que pide la Ley 26.653 de accesibilidad de la información en las páginas web.
      </p>
    </div>

    <section aria-labelledby="titulo-nivel" class="flex flex-col gap-3">
      <h2 id="titulo-nivel" class="text-xl font-bold">Nivel que buscamos</h2>
      <p class="text-lg">
        La app está hecha para cumplir con las <strong>Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1, nivel AA</strong>.
        Creemos que la cumple en forma <strong>parcial</strong>: abajo contamos qué todavía no está resuelto.
      </p>
    </section>

    <section aria-labelledby="titulo-hicimos" class="flex flex-col gap-3">
      <h2 id="titulo-hicimos" class="text-xl font-bold">Qué hicimos</h2>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg">
        <li>Todo se puede usar solo con el teclado, y siempre se ve dónde está el foco.</li>
        <li>Un enlace al principio de cada página lleva directo al contenido.</li>
        <li>Los colores tienen buen contraste: 7 a 1 en el texto principal, al menos 4,5 a 1 en el resto del texto y 3 a 1 en los bordes. Lo controla una prueba automática.</li>
        <li>La letra nunca baja de 16 píxeles y se puede agrandar al doble sin que se rompa la página.</li>
        <li>Los botones son grandes, de al menos 48 por 48 píxeles.</li>
        <li>Una pregunta por pantalla, con el paso en el que estás y la posibilidad de volver atrás.</li>
        <li>Los errores dicen qué pasó y qué hacer, y se anuncian al lector de pantalla.</li>
        <li>Nunca se te corta la sesión mientras estás usando la app.</li>
        <li>Se puede elegir alto contraste, sin animaciones, lenguaje simple, lectura en voz alta y dictado por voz.</li>
        <li>Los gráficos tienen al lado una tabla con los mismos datos.</li>
      </ul>
    </section>

    <section aria-labelledby="titulo-limites" class="flex flex-col gap-3">
      <h2 id="titulo-limites" class="text-xl font-bold">Lo que todavía no está resuelto</h2>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg">
        <li>La lectura en voz alta y el dictado usan las voces del navegador. En Firefox el dictado no anda, y en algunos celulares la voz en español puede no estar instalada.</li>
        <li>La ayuda todavía no tiene el video corto con subtítulos y lengua de señas.</li>
        <li>Las pruebas automáticas no encuentran todo. Falta un recorrido completo con personas que usan lectores de pantalla.</li>
        <li>El archivo de métricas para administración se descarga como CSV, que no tiene la estructura de una tabla accesible.</li>
      </ul>
    </section>

    <section aria-labelledby="titulo-como" class="flex flex-col gap-3">
      <h2 id="titulo-como" class="text-xl font-bold">Cómo lo revisamos</h2>
      <p class="text-lg">
        Autoevaluación del equipo. Cada pantalla pasa por axe-core en las pruebas automáticas, en computadora y en celular,
        y hay pruebas que recorren los flujos principales solo con el teclado.
        Última revisión: octubre de 2026.
      </p>
    </section>

    <section aria-labelledby="titulo-contacto" class="flex flex-col gap-3">
      <h2 id="titulo-contacto" class="text-xl font-bold">Si algo no te funciona</h2>
      <p class="text-lg">
        Contanos qué pantalla era y qué estabas haciendo. Lo vamos a usar para mejorar la app.
      </p>
      <UButton to="/ayuda#escribinos" color="primary" variant="solid" icon="i-lucide-message-circle" label="Escribinos" class="self-start" />
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Declaración de accesibilidad' })
</script>
