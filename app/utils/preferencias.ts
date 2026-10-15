// Preferencias de accesibilidad: el tipo, los valores recomendados y cómo validarlas.
// Son funciones puras (sin Vue ni Nuxt) para poder probarlas con Vitest.

export const TAMANOS_TEXTO = [100, 125, 150, 175, 200] as const
export type TamanoTexto = (typeof TAMANOS_TEXTO)[number]

export const VELOCIDAD_VOZ_MINIMA = 0.7
export const VELOCIDAD_VOZ_MAXIMA = 1.3

export type Preferencias = {
  tamanoTexto: TamanoTexto
  altoContraste: boolean
  reducirMovimiento: boolean
  lecturaVoz: boolean
  velocidadVoz: number
  lenguajeSimple: boolean
}

// Perfil accesible por defecto: texto ampliado, sin animaciones y lenguaje simple.
// Los colores de marca ya cumplen contraste AA, por eso el alto contraste arranca apagado.
export const PREFERENCIAS_PREDETERMINADAS: Preferencias = {
  tamanoTexto: 125,
  altoContraste: false,
  reducirMovimiento: true,
  lecturaVoz: false,
  velocidadVoz: 0.9,
  lenguajeSimple: true,
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function siEsBooleano(valor: unknown, siNo: boolean): boolean {
  return typeof valor === 'boolean' ? valor : siNo
}

// Lleva cualquier número al tamaño permitido más cercano (por ejemplo, 160 → 150).
function normalizarTamano(valor: unknown): TamanoTexto {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return PREFERENCIAS_PREDETERMINADAS.tamanoTexto
  }
  let masCercano: TamanoTexto = TAMANOS_TEXTO[0]
  for (const tamano of TAMANOS_TEXTO) {
    if (Math.abs(tamano - valor) < Math.abs(masCercano - valor)) {
      masCercano = tamano
    }
  }
  return masCercano
}

function normalizarVelocidad(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return PREFERENCIAS_PREDETERMINADAS.velocidadVoz
  }
  const limitada = Math.min(VELOCIDAD_VOZ_MAXIMA, Math.max(VELOCIDAD_VOZ_MINIMA, valor))
  return Math.round(limitada * 10) / 10
}

/**
 * Convierte lo que venga (una cookie, datos viejos, basura) en preferencias válidas.
 * Lo que falta o está mal se reemplaza por el valor recomendado.
 */
export function normalizarPreferencias(valor: unknown): Preferencias {
  const p = PREFERENCIAS_PREDETERMINADAS
  if (!esObjeto(valor)) {
    return { ...p }
  }
  return {
    tamanoTexto: normalizarTamano(valor.tamanoTexto),
    altoContraste: siEsBooleano(valor.altoContraste, p.altoContraste),
    reducirMovimiento: siEsBooleano(valor.reducirMovimiento, p.reducirMovimiento),
    lecturaVoz: siEsBooleano(valor.lecturaVoz, p.lecturaVoz),
    velocidadVoz: normalizarVelocidad(valor.velocidadVoz),
    lenguajeSimple: siEsBooleano(valor.lenguajeSimple, p.lenguajeSimple),
  }
}
