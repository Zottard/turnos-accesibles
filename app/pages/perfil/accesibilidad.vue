<!--
  Preferencias de la cuenta (RF-02): todas juntas, con "Guardar".
  Los cambios se ven enseguida (vista previa) y se guardan en la cuenta al tocar "Guardar".
  Si no se pudo guardar, volvemos a la configuración anterior y lo decimos.
-->
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Mis preferencias' })

const cuenta = usePreferenciasCuenta()
const { anunciar } = useAnuncio()

const resultado = ref<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null)
const guardando = ref(false)

async function guardar() {
  if (guardando.value) {
    return
  }
  guardando.value = true
  resultado.value = null
  const guardado = await cuenta.guardarEnCuenta()
  guardando.value = false
  if (guardado) {
    resultado.value = { tipo: 'exito', mensaje: 'Guardamos tus preferencias en tu cuenta.' }
  } else {
    cuenta.volverALoGuardado()
    resultado.value = {
      tipo: 'error',
      mensaje: 'No pudimos guardar el cambio. Tu configuración anterior sigue igual.',
    }
  }
  anunciar(resultado.value.mensaje, !guardado)
}
</script>

<template>
  <div class="contenedor pagina formulario-angosto">
    <p><NuxtLink to="/perfil">← Volver a mi perfil</NuxtLink></p>
    <h1>Mis preferencias</h1>
    <p class="pagina__bajada">
      Los cambios se ven enseguida. Para que queden en tu cuenta y se usen en cualquier
      dispositivo, tocá "Guardar".
    </p>

    <form class="pila" novalidate @submit.prevent="guardar">
      <section class="tarjeta" aria-labelledby="titulo-ver">
        <h2 id="titulo-ver">Cómo ves y escuchás la página</h2>
        <PreferenciasFormulario prefijo="cuenta" />
      </section>

      <section class="tarjeta pila" aria-labelledby="titulo-avisos">
        <h2 id="titulo-avisos">Avisos</h2>
        <fieldset>
          <legend>Cómo querés que te avisemos</legend>
          <PreferenciasCanal prefijo="cuenta" />
        </fieldset>
        <fieldset>
          <legend>Cuándo querés el recordatorio del turno</legend>
          <p class="texto-suave ayuda-antelacion">
            Al guardar, también cambia la hora del recordatorio de los turnos que ya tenés.
          </p>
          <PreferenciasAntelacion prefijo="cuenta" />
        </fieldset>
      </section>

      <Aviso v-if="resultado" :tipo="resultado.tipo">
        <p>{{ resultado.mensaje }}</p>
      </Aviso>
      <div class="acciones">
        <Boton type="submit">{{ guardando ? 'Guardando…' : 'Guardar' }}</Boton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.tarjeta > h2 {
  margin-bottom: var(--espacio-3);
}

legend,
.ayuda-antelacion {
  margin-bottom: var(--espacio-2);
}
</style>
