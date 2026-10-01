import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'
import { reservarAunqueSeSuperponga, titulo, turnoLibre } from './ayudas'

test.use({ storageState: SESIONES.prueba })

test('reservar y cancelar dejan avisos en la bandeja y el contador los muestra', async ({ page, request }) => {
  await page.goto('/notificaciones')
  await page.locator('main article').first().or(page.getByText('Todavía no tenés avisos')).waitFor()
  if (await page.getByRole('button', { name: 'Marcar todos como leídos' }).isVisible()) {
    await page.getByRole('button', { name: 'Marcar todos como leídos' }).click()
  }
  await expect(page.getByRole('link', { name: 'Avisos', exact: true })).toBeVisible()

  const turno = await turnoLibre(request)
  await page.goto(`/turnos/${turno.id}/confirmar`)
  await reservarAunqueSeSuperponga(page)
  await expect(page.getByRole('link', { name: /^Avisos, \d+ sin leer$/ })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('link', { name: /^Avisos, \d+ sin leer$/ }).click()
  await expect(titulo(page)).toHaveText('Mis avisos')
  const aviso = page.locator('article').first()
  await expect(aviso.getByRole('heading')).toHaveText('Reservaste un turno')
  await expect(aviso.getByText('Sin leer')).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([])

  await aviso.getByRole('button', { name: 'Marcar como leído' }).click()
  await expect(aviso.getByText('Leído')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Avisos', exact: true })).toBeVisible()

  await aviso.getByRole('link', { name: 'Ver el turno' }).click()
  await page.getByRole('link', { name: 'Cancelar este turno' }).click()
  await page.getByRole('button', { name: 'Sí, cancelar el turno' }).click()
  await expect(titulo(page)).toHaveText('Listo. Cancelamos tu turno.')

  await page.goto('/notificaciones')
  await expect(page.locator('article').first().getByRole('heading')).toHaveText('Cancelaste un turno')
})
