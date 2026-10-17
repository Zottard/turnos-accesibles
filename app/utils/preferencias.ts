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
// Los colores de marca ya cumplen contraste AA, por eso el alto contraste arranca apagado
// (se ofrece en el primer ingreso, en /bienvenida).
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

// --- Avisos (v0.2): cómo y cuándo avisarle a la persona. Se usan en la v0.5. ---

export const CANALES_AVISO = ['visual', 'sonoro', 'ambos'] as const
export type CanalAviso = (typeof CANALES_AVISO)[number]

export const ANTELACIONES_HORAS = [2, 24, 48] as const
export type AntelacionHoras = (typeof ANTELACIONES_HORAS)[number]

export type PreferenciasAviso = {
  canalAviso: CanalAviso
  antelacionHoras: AntelacionHoras
}

export const AVISO_PREDETERMINADO: PreferenciasAviso = {
  canalAviso: 'ambos',
  antelacionHoras: 24,
}

// --- Fila de la tabla `preferencias` (Supabase). Las columnas van en snake_case. ---

export type FilaPreferencias = {
  tamano_texto: number
  alto_contraste: boolean
  reducir_movimiento: boolean
  lectura_voz: boolean
  velocidad_voz: number
  lenguaje_simple: boolean
  canal_aviso: CanalAviso
  antelacion_horas: AntelacionHoras
}

/** Arma la fila para guardar en la base a partir de lo que usa la app. */
export function aFilaPreferencias(p: Preferencias, aviso: PreferenciasAviso): FilaPreferencias {
  return {
    tamano_texto: p.tamanoTexto,
    alto_contraste: p.altoContraste,
    reducir_movimiento: p.reducirMovimiento,
    lectura_voz: p.lecturaVoz,
    velocidad_voz: p.velocidadVoz,
    lenguaje_simple: p.lenguajeSimple,
    canal_aviso: aviso.canalAviso,
    antelacion_horas: aviso.antelacionHoras,
  }
}

/** Lo contrario: convierte una fila de la base (o lo que venga) en preferencias válidas. */
export function desdeFilaPreferencias(fila: unknown): { preferencias: Preferencias; aviso: PreferenciasAviso } {
  const f = esObjeto(fila) ? fila : {}
  const canal = CANALES_AVISO.find((canal) => canal === f.canal_aviso)
  const antelacion = ANTELACIONES_HORAS.find((horas) => horas === Number(f.antelacion_horas))
  return {
    preferencias: normalizarPreferencias({
      tamanoTexto: f.tamano_texto,
      altoContraste: f.alto_contraste,
      reducirMovimiento: f.reducir_movimiento,
      lecturaVoz: f.lectura_voz,
      // Postgres guarda la velocidad como `numeric`: por las dudas la pasamos a número.
      velocidadVoz: f.velocidad_voz === undefined || f.velocidad_voz === null ? undefined : Number(f.velocidad_voz),
      lenguajeSimple: f.lenguaje_simple,
    }),
    aviso: {
      canalAviso: canal ?? AVISO_PREDETERMINADO.canalAviso,
      antelacionHoras: antelacion ?? AVISO_PREDETERMINADO.antelacionHoras,
    },
  }
}
