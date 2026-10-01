import type { FormErrorEvent } from '@nuxt/ui'

const siguienteCuadro = () => new Promise((resolve) => requestAnimationFrame(resolve))

export function useFormulario() {
  const { alert } = useAnuncio()

  async function alFallar(event: FormErrorEvent) {
    const primero = event.errors[0]
    if (!primero) return
    alert(primero.message ?? '')
    if (!primero.id) return

    const control = () =>
      document.querySelector<HTMLElement>(`[aria-describedby~="${primero.id}-error"]`) ?? document.getElementById(primero.id!)

    // UForm deshabilita los campos mientras valida y los vuelve a habilitar después de emitir el error
    for (let i = 0; i < 30 && control()?.matches(':disabled'); i++) await siguienteCuadro()
    control()?.focus()
  }

  return { alFallar }
}
