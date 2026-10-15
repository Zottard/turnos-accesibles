// Al cambiar de pantalla, el foco va al título (h1) y se anuncia su nombre.
// Así quien usa lector de pantalla o teclado sabe que llegó a una página nueva.
// Si la dirección tiene un ancla (#preferencias), el foco va a esa sección.

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const { anunciar } = useAnuncio()
  let hayCambioDePagina = false

  router.afterEach((destino, origen) => {
    // La primera carga no cuenta: ahí el navegador ya empieza desde arriba.
    hayCambioDePagina = origen.matched.length > 0 && destino.path !== origen.path
  })

  // 'page:finish' se dispara cuando la página nueva ya está en pantalla.
  nuxtApp.hook('page:finish', () => {
    if (!hayCambioDePagina) {
      return
    }
    hayCambioDePagina = false

    const destino = router.currentRoute.value
    const elemento = destino.hash ? document.getElementById(destino.hash.slice(1)) : null
    const titulo = document.querySelector<HTMLElement>('main h1')
    const aEnfocar = elemento ?? titulo
    if (!aEnfocar) {
      return
    }
    aEnfocar.setAttribute('tabindex', '-1')
    aEnfocar.focus()

    if (titulo) {
      anunciar(`Página: ${titulo.innerText}`)
    }
  })
})
