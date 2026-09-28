export function useLenguajeSimple() {
  const { prefs } = useAccesibilidad()

  function t(key: CopyKey, params: Record<string, string | number> = {}) {
    const copy = COPYS[key]
    const text = prefs.value.plainLanguage ? copy.simple : copy.tecnico
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
  }

  return { t }
}
