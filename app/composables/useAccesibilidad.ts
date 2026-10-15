// Preferencias de accesibilidad compartidas por toda la app.
//
// En la v0.1 se guardan en una cookie del navegador (`ta_prefs`). Usamos cookie y no
// localStorage porque el servidor también la lee: así la página llega ya con el texto
// grande o el alto contraste aplicados, sin un "parpadeo" al cargar.
// En la v0.2 también se van a guardar en la cuenta de la persona (tabla `preferencias`).

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365

export function useAccesibilidad() {
  const cookie = useCookie<unknown>('ta_prefs', {
    maxAge: UN_ANIO_EN_SEGUNDOS,
    sameSite: 'lax',
    path: '/',
  })

  // Estado compartido: todos los componentes ven las mismas preferencias.
  const preferencias = useState<Preferencias>('preferencias', () => normalizarPreferencias(cookie.value))

  function guardar(nuevas: Preferencias) {
    preferencias.value = nuevas
    cookie.value = nuevas
  }

  function cambiar<Clave extends keyof Preferencias>(clave: Clave, valor: Preferencias[Clave]) {
    guardar(normalizarPreferencias({ ...preferencias.value, [clave]: valor }))
  }

  function restablecer() {
    guardar({ ...PREFERENCIAS_PREDETERMINADAS })
  }

  // Pone las preferencias como atributos de <html>; el CSS (tokens.css) hace el resto.
  // Se llama una sola vez, desde app.vue.
  function aplicarAlDocumento() {
    useHead({
      htmlAttrs: {
        'data-texto': computed(() => String(preferencias.value.tamanoTexto)),
        'data-contraste': computed(() => (preferencias.value.altoContraste ? 'alto' : 'normal')),
        'data-movimiento': computed(() => (preferencias.value.reducirMovimiento ? 'reducido' : 'normal')),
      },
    })
  }

  return {
    preferencias: readonly(preferencias),
    cambiar,
    restablecer,
    aplicarAlDocumento,
  }
}
