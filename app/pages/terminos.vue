<template>
  <div class="max-w-prose flex flex-col gap-10">
    <div class="flex flex-col gap-3">
      <h1 class="text-2xl font-bold">Términos de uso</h1>
      <p class="text-lg">Lo importante, en pocas palabras. Si usás la app, aceptás lo que dice esta página.</p>
    </div>

    <UAlert
      color="warning"
      icon="i-lucide-triangle-alert"
      title="Esta app no es el sistema oficial de turnos."
      description="Es un trabajo de la facultad. Los turnos son de prueba: no te presentes en el hospital con un turno de esta app. Para un turno real, usá el sistema oficial de tu municipio o provincia."
    />

    <section aria-labelledby="titulo-que-es" class="flex flex-col gap-3">
      <h2 id="titulo-que-es" class="text-xl font-bold">Qué es esta app</h2>
      <p class="text-lg">
        Turnos Accesibles es un prototipo hecho para el Trabajo Final de Metodología de Sistemas I
        de la UTN, Facultad Regional General Pacheco (Grupo 28). Muestra cómo podría ser una forma más simple de sacar turnos de salud pública.
      </p>
      <p class="text-lg">
        Los hospitales y centros de salud son reales: salen del Registro Federal de Establecimientos de Salud (REFES).
        Los médicos, los horarios y los turnos son inventados. Ningún hospital recibe las reservas que hacés acá.
      </p>
    </section>

    <section aria-labelledby="titulo-uso" class="flex flex-col gap-3">
      <h2 id="titulo-uso" class="text-xl font-bold">Cómo usarla</h2>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg">
        <li>No uses tus datos de salud reales. Si probás el asistente, contale algo inventado.</li>
        <li>No la uses para emergencias. Si es urgente, llamá al 107 o andá a la guardia más cercana.</li>
        <li>La app sugiere a qué médico ir según lo que le contás, pero no es un diagnóstico. Eso lo hace un profesional.</li>
        <li>Puede dejar de andar o borrarse en cualquier momento, porque es un trabajo práctico.</li>
      </ul>
    </section>

    <section aria-labelledby="titulo-datos" class="flex flex-col gap-3">
      <h2 id="titulo-datos" class="text-xl font-bold">Tus datos personales</h2>
      <p class="text-lg">Los cuidamos según la Ley 25.326 de Protección de los Datos Personales.</p>
      <h3 class="text-lg font-bold">Qué guardamos</h3>
      <ul class="flex flex-col gap-2 list-disc ps-6 text-lg">
        <li>Lo que pusiste al crear la cuenta: nombre, apellido, documento, fecha de nacimiento, correo y localidad. El teléfono, si lo agregaste.</li>
        <li>Cómo querés usar la app: tamaño de letra, colores, voz y avisos.</li>
        <li>Los turnos que sacaste, cancelaste o cambiaste, y quién lo hizo (vos o tu acompañante).</li>
        <li>Las personas que invitaste para que te ayuden.</li>
      </ul>
      <h3 class="text-lg font-bold">Para qué</h3>
      <p class="text-lg">
        Solo para que la app funcione: reservar turnos, avisarte y recordar cómo te gusta verla.
        No vendemos ni compartimos tus datos. Las métricas que ve administración son anónimas: cuentan cuántas búsquedas y reservas hubo, no quién las hizo.
      </p>
      <h3 class="text-lg font-bold">Tus derechos</h3>
      <p class="text-lg">
        Podés pedir ver, corregir o borrar tus datos cuando quieras, sin costo. Los datos de tu perfil los podés cambiar vos mismo en <ULink to="/perfil" class="underline">Mi perfil</ULink>.
        Para lo demás, escribinos.
      </p>
      <p class="text-lg">
        La Agencia de Acceso a la Información Pública es el organismo de control de la Ley 25.326 y recibe denuncias si no se respetan tus derechos.
      </p>
      <UButton to="/ayuda#escribinos" icon="i-lucide-message-circle" label="Escribinos sobre tus datos" class="self-start" />
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Términos de uso' })
</script>
