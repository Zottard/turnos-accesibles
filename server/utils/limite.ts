// Límite simple de pedidos por persona (por IP), guardado en la memoria del servidor.
// Alcanza para un prototipo: si el servidor se reinicia, los contadores vuelven a cero.
// Es una función pura (recibe el mapa y la hora): la prueba tests/limite.test.ts.

export type Contador = { desde: number; cantidad: number }

const UN_MINUTO_MS = 60 * 1000

/** Suma un pedido de `clave` y devuelve true si todavía está dentro del límite por minuto. */
export function dentroDelLimite(
  contadores: Map<string, Contador>,
  clave: string,
  limitePorMinuto: number,
  ahora = Date.now(),
): boolean {
  // Para que el mapa no crezca sin fin: de vez en cuando borramos los contadores viejos.
  if (contadores.size > 1000) {
    for (const [otra, contador] of contadores) {
      if (ahora - contador.desde >= UN_MINUTO_MS) {
        contadores.delete(otra)
      }
    }
  }

  const actual = contadores.get(clave)
  if (!actual || ahora - actual.desde >= UN_MINUTO_MS) {
    contadores.set(clave, { desde: ahora, cantidad: 1 })
    return true
  }
  actual.cantidad += 1
  return actual.cantidad <= limitePorMinuto
}
