// Buscador de especialidades para el cuadro "¿Qué necesitás?".
// La persona escribe como habla ("me duele la rodilla", "oculista", "corazon") y le sugerimos
// especialidades. Comparamos sin mayúsculas ni tildes, contra el nombre simple ("Oculista"),
// el nombre técnico ("Oftalmología") y las palabras clave ({ojos, vista, anteojos}).
// Son funciones puras: las prueba tests/especialidades.test.ts.
// Está en shared/ porque también la usa el servidor (las reglas del asistente).

export type Especialidad = {
  id: number
  nombre: string
  nombreSimple: string
  descripcion: string
  palabrasClave: string[]
}

/** "  Oftalmología!! " → "oftalmologia". Minúsculas, sin tildes ni signos, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD') // separa la letra de su tilde: "á" → "a" + "´"
    .replace(/[̀-ͯ]/g, '') // y saca las tildes
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cuántas letras hay que cambiar, agregar o sacar para pasar de una palabra a otra
 * (distancia de Levenshtein). "cardilogia" → "cardiologia" es 1. Sirve para perdonar errores de tipeo.
 */
export function distanciaEdicion(a: string, b: string): number {
  // anterior[j] = distancia entre las primeras i-1 letras de `a` y las primeras j de `b`.
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    for (let j = 1; j <= b.length; j++) {
      const cambio = a[i - 1] === b[j - 1] ? 0 : 1
      actual[j] = Math.min(anterior[j]! + 1, actual[j - 1]! + 1, anterior[j - 1]! + cambio)
    }
    anterior = actual
  }
  return anterior[b.length]!
}

// Puntajes: cuanto más alto, más seguro estamos de que es lo que busca.
const PUNTAJE = {
  nombreExacto: 100, // "oculista", "oftalmologia"
  nombreEmpieza: 80, // "ocul..." mientras escribe
  claveExacta: 70, // "rodilla", "corazon"
  palabraDeLaFrase: 60, // "me duele la RODILLA"
  palabraEmpieza: 50, // "rodi..."
  parecida: 30, // "cardilogia" (error de tipeo)
}

// Palabras que no dicen nada de la especialidad: "necesito un turno CON el oculista".
const PALABRAS_VACIAS = ['del', 'las', 'los', 'una', 'con', 'por', 'para', 'que', 'muy', 'tengo', 'necesito', 'quiero', 'turno']

/** Qué tan bien coincide el texto con una especialidad. 0 = nada. */
export function puntajeEspecialidad(texto: string, especialidad: Especialidad): number {
  const buscado = normalizar(texto)
  if (buscado.length < 2) {
    return 0
  }
  const nombres = [especialidad.nombreSimple, especialidad.nombre].map(normalizar)
  const claves = especialidad.palabrasClave.map(normalizar)
  // Todas las palabras sueltas de los nombres y de las claves: "medico", "corazon", "nariz"...
  const palabrasConocidas = [...nombres, ...claves]
    .flatMap((frase) => frase.split(' '))
    .filter((palabra) => !PALABRAS_VACIAS.includes(palabra))

  if (nombres.includes(buscado)) {
    return PUNTAJE.nombreExacto
  }
  if (nombres.some((nombre) => nombre.startsWith(buscado))) {
    return PUNTAJE.nombreEmpieza
  }
  if (claves.includes(buscado)) {
    return PUNTAJE.claveExacta
  }

  // Si escribió una frase, miramos cada palabra de 3 letras o más ("me", "la" no cuentan).
  let mejor = 0
  const palabrasDelTexto = buscado.split(' ').filter((p) => p.length >= 3 && !PALABRAS_VACIAS.includes(p))
  for (const palabra of palabrasDelTexto) {
    if (claves.includes(palabra) || palabrasConocidas.includes(palabra)) {
      mejor = Math.max(mejor, PUNTAJE.palabraDeLaFrase)
    } else if (palabrasConocidas.some((conocida) => conocida.startsWith(palabra))) {
      mejor = Math.max(mejor, PUNTAJE.palabraEmpieza)
    } else if (palabra.length >= 5) {
      // Perdonamos 1 error en palabras cortas y 2 en las largas.
      const tolerancia = palabra.length >= 8 ? 2 : 1
      if (palabrasConocidas.some((conocida) => distanciaEdicion(palabra, conocida) <= tolerancia)) {
        mejor = Math.max(mejor, PUNTAJE.parecida)
      }
    }
  }
  return mejor
}

/** Las especialidades que coinciden con el texto, de la más a la menos parecida. */
export function buscarEspecialidades(texto: string, lista: Especialidad[], maximo = 5): Especialidad[] {
  return lista
    .map((especialidad) => ({ especialidad, puntaje: puntajeEspecialidad(texto, especialidad) }))
    .filter((item) => item.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.especialidad.nombreSimple.localeCompare(b.especialidad.nombreSimple, 'es'))
    .slice(0, maximo)
    .map((item) => item.especialidad)
}

/**
 * Si el texto apunta claramente a una sola especialidad, la devuelve.
 * Claramente: escribió su nombre ("cardiología", "dentista") o es la única que coincide ("rodilla").
 * Si hay dudas devuelve null, y la página pregunta "¿Quisiste decir…?".
 */
export function elegirEspecialidad(texto: string, lista: Especialidad[]): Especialidad | null {
  const resultados = buscarEspecialidades(texto, lista)
  const primera = resultados[0]
  if (!primera) {
    return null
  }
  if (resultados.length === 1 || puntajeEspecialidad(texto, primera) === PUNTAJE.nombreExacto) {
    return primera
  }
  return null
}

/**
 * Para el asistente, que recibe frases largas ("algo para la presión a la tarde").
 * Como elegirEspecialidad, pero si coinciden varias suma lo que da cada palabra de la frase:
 * en "control con el médico clínico" gana Clínica médica, que coincide en tres palabras.
 * Si empatan, devuelve null y la persona elige.
 */
export function especialidadDeLaFrase(texto: string, lista: Especialidad[]): Especialidad | null {
  const elegida = elegirEspecialidad(texto, lista)
  if (elegida) {
    return elegida
  }
  const palabras = normalizar(texto)
    .split(' ')
    .filter((palabra) => palabra.length >= 3 && !PALABRAS_VACIAS.includes(palabra))
  const [primera, segunda] = lista
    .map((especialidad) => ({
      especialidad,
      puntaje: palabras.reduce((suma, palabra) => suma + puntajeEspecialidad(palabra, especialidad), 0),
    }))
    .filter((item) => item.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
  if (primera && (!segunda || primera.puntaje > segunda.puntaje)) {
    return primera.especialidad
  }
  return null
}

/** "Oculista (Oftalmología)". Si los dos nombres son casi iguales, va uno solo. */
export function nombreCompleto(especialidad: Pick<Especialidad, 'nombre' | 'nombreSimple'>): string {
  const simple = normalizar(especialidad.nombreSimple)
  const tecnico = normalizar(especialidad.nombre)
  if (simple.includes(tecnico) || tecnico.includes(simple)) {
    return especialidad.nombreSimple
  }
  return `${especialidad.nombreSimple} (${especialidad.nombre})`
}
