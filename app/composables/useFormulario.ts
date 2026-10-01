import type { FormErrorEvent } from '@nuxt/ui'

export function useFormulario() {
  const { alert } = useAnuncio()

  async function alFallar(event: FormErrorEvent) {
    const primero = event.errors[0]
    if (!primero) return
    // UForm deshabilita los campos mientras valida y los vuelve a habilitar después de emitir el error
    await new Promise((resolve) => setTimeout(resolve))
    if (primero.id) {
      const control = document.querySelector<HTMLElement>(`[aria-describedby~="${primero.id}-error"]`) ?? document.getElementById(primero.id)
      control?.focus()
    }
    alert(primero.message ?? '')
  }

  return { alFallar }
}
