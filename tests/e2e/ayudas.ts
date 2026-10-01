import type { APIRequestContext, Page } from '@playwright/test'
import { expect } from './fixtures'

const SUPABASE = process.env.NUXT_PUBLIC_SUPABASE_URL ?? 'https://ynolirfzjcjsvesnfpes.supabase.co'
const CLAVE_PUBLICA = process.env.NUXT_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_MlF21H5LBVIhHQfW6Hx8FA_76fjurU1'

export async function turnos(request: APIRequestContext, filtro: string) {
  const r = await request.get(`${SUPABASE}/rest/v1/turnos_disponibles?select=id,profesional_id,fecha_hora&${filtro}`, {
    headers: { apikey: CLAVE_PUBLICA },
  })
  return (await r.json()) as { id: string, profesional_id: string, fecha_hora: string }[]
}

export const titulo = (page: Page) => page.getByRole('heading', { level: 1 })

// Las corridas anteriores dejan reservas de Pablo: si aparece el aviso de superposición, se acepta.
export async function reservarAunqueSeSuperponga(page: Page) {
  await page.getByRole('button', { name: 'Sí, reservar este turno' }).click()
  const igual = page.getByRole('button', { name: 'Sí, reservar igual' })
  await expect(titulo(page).filter({ hasText: '¡Listo! Reservaste tu turno' }).or(igual)).toBeVisible()
  if (await igual.isVisible()) await igual.click()
  await expect(titulo(page)).toHaveText('¡Listo! Reservaste tu turno')
}

export async function turnoLibre(request: APIRequestContext, diasMinimos = 3) {
  const desde = new Date(Date.now() + diasMinimos * 86_400_000).toISOString()
  const libres = await turnos(request, `estado=eq.disponible&fecha_hora=gt.${desde}&limit=50`)
  return libres[Math.floor(Math.random() * libres.length)]!
}

export async function estadoDelTurno(request: APIRequestContext, id: string) {
  const r = await request.get(`${SUPABASE}/rest/v1/turnos_disponibles?select=estado&id=eq.${id}`, { headers: { apikey: CLAVE_PUBLICA } })
  return ((await r.json()) as { estado: string }[])[0]?.estado
}
