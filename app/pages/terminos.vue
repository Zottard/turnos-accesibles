<script setup lang="ts">
useSeoMeta({
  title: 'Términos de uso',
  description: 'Las reglas de uso de Turnos Accesibles, explicadas en lenguaje simple.',
})

// Con "lenguaje simple" apagado, el texto legal completo se muestra abierto.
const { preferencias } = useAccesibilidad()
</script>

<template>
  <div class="contenedor pagina">
    <h1>Términos de uso</h1>
    <p class="pagina__bajada">Lo importante, en pocas palabras.</p>
    <LeerEnVoz objetivo-id="terminos-resumen" />

    <section id="terminos-resumen" aria-labelledby="titulo-resumen" class="pila">
      <h2 id="titulo-resumen">Lo que tenés que saber</h2>
      <ol class="puntos">
        <li>
          <strong>Es un prototipo.</strong> Lo hicimos para un trabajo de la facultad (UTN FRGP).
        </li>
        <li>
          <strong>No reemplaza a los sistemas oficiales.</strong> Para un turno de verdad, usá el
          sistema de tu hospital o centro de salud.
        </li>
        <li>
          <strong>Los turnos que ves son de prueba.</strong> No te garantizamos que exista ese turno
          ni que esté libre.
        </li>
        <li>
          <strong>Cuidamos tus datos.</strong> Seguimos la Ley 25.326 de protección de datos
          personales. Podés pedir ver, corregir o borrar tus datos.
        </li>
        <li>
          <strong>No guardamos información de tu salud.</strong> No te pedimos diagnósticos ni
          estudios médicos.
        </li>
      </ol>
    </section>

    <details class="legal" :open="!preferencias.lenguajeSimple">
      <summary>Ver el texto legal completo</summary>
      <div class="pila legal__texto">
        <p>
          Turnos Accesibles es un prototipo académico desarrollado por el equipo Karma Tech en el
          marco de la materia Metodología de Sistemas I (UTN, Facultad Regional General Pacheco,
          Grupo 28). No es un servicio oficial ni está vinculado con ningún organismo de salud.
        </p>
        <p>
          La información de centros, profesionales y turnos es ficticia y se usa solo con fines de
          demostración. Ninguna reserva hecha en este sitio genera un turno real ni obliga a ningún
          prestador de salud.
        </p>
        <p>
          El tratamiento de datos personales se rige por la Ley 25.326 de Protección de los Datos
          Personales. La persona titular puede ejercer en cualquier momento sus derechos de acceso,
          rectificación y supresión. El sitio no solicita ni almacena datos sensibles de salud
          (historia clínica, diagnósticos o estudios).
        </p>
        <p>
          Las preferencias de accesibilidad se guardan en una cookie de este navegador
          (<code>ta_prefs</code>), solo para mostrar el sitio como lo configuraste.
        </p>
      </div>
    </details>
  </div>
</template>

<style scoped>
.puntos {
  display: flex;
  flex-direction: column;
  gap: var(--espacio-3);
}

.legal {
  max-width: 70ch;
  padding: var(--espacio-3) var(--relleno-tarjeta);
  background: var(--superficie);
  border: var(--grosor-borde) solid var(--borde);
  border-radius: var(--radio-tarjeta);
}

.legal summary {
  min-height: var(--alto-tactil);
  display: flex;
  align-items: center;
  font-family: var(--fuente-titulos);
  font-weight: 600;
  color: var(--primario);
  cursor: pointer;
}

.legal summary::before {
  content: '▸';
  margin-right: var(--espacio-2);
}

.legal[open] summary::before {
  content: '▾';
}

.legal__texto {
  padding-top: var(--espacio-2);
}
</style>
