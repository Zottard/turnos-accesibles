<template>
  <aside aria-label="Modo demo" class="border-b-2 border-dashed border-default bg-elevated">
    <div class="w-full max-w-5xl hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2 mx-auto px-4 py-2">
      <p class="flex items-center gap-2 font-bold">
        <UIcon name="i-lucide-presentation" class="size-6 shrink-0" aria-hidden="true" />
        Modo demo
      </p>
      <DemoControles class="flex-1" />
    </div>

    <details class="sm:hidden px-4 py-2">
      <summary class="flex items-center gap-2 min-h-12 font-bold">
        <UIcon name="i-lucide-presentation" class="size-6 shrink-0" aria-hidden="true" />
        Modo demo: entrar como otra persona y ver el alcance
      </summary>
      <DemoControles class="pb-2" />
    </details>
  </aside>
</template>
