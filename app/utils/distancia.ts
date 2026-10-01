export function distanciaEnPalabras(km: number | null | undefined) {
  if (km === null || km === undefined) return undefined
  if (km < 1) return 'A menos de 1 km'
  return `A ${km.toFixed(1).replace('.', ',').replace(',0', '')} km`
}

export const enlaceComoLlegar = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
