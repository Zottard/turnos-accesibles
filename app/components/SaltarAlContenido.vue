<!-- Primer enlace de la página: con Tab aparece y lleva directo al contenido principal. -->
<template>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
</template>

<style scoped>
.saltar {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 100;
  padding: 0.75rem 1.25rem;
  background: var(--texto);
  color: var(--fondo);
  border-radius: var(--radio-chico);
  font-family: var(--fuente-titulos);
  font-weight: 700;
  transform: translateY(-200%);
}

.saltar:focus {
  transform: translateY(0);
}
</style>
