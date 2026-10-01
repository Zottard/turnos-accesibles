import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'
import { estadoDelTurno, reservarAunqueSeSuperponga, titulo, turnoLibre } from './ayudas'

test.use({ storageState: SESIONES.prueba })

test('mis turnos separa próximos y anteriores', async ({ page, request }) => {
  const turno = await turnoLibre(request)
  await page.goto(`/turnos/${turno.id}/confirmar`)
  await reservarAunqueSeSuperponga(page)
  const numero = (await page.locator('main').getByText('Número de turno:').textContent())?.match(/\d+/)?.[0]

  await page.goto('/mis-turnos')
  const proximos = page.locator('section', { has: page.getByRole('heading', { level: 2, name: /Próximos/ }) })
  await expect(proximos.getByText(`Número de turno: ${numero}`)).toBeVisible()

  const anteriores = page.locator('section', { has: page.getByRole('heading', { level: 2, name: /Anteriores/ }) })
  await expect(anteriores.getByText('Ya fuiste').first()).toBeVisible()

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
})

test('cancelar un turno libera el lugar', async ({ page, request }) => {
  const turno = await turnoLibre(request)
  await page.goto(`/turnos/${turno.id}/confirmar`)
  await reservarAunqueSeSuperponga(page)

  await page.getByRole('link', { name: 'Cancelar este turno' }).click()
  await expect(titulo(page)).toHaveText('¿Querés cancelar este turno?')
  await page.getByRole('radio', { name: /No puedo ir ese día/ }).click()
  await page.getByRole('button', { name: 'Sí, cancelar el turno' }).click()

  await expect(titulo(page)).toHaveText('Listo. Cancelamos tu turno.')
  await expect(titulo(page)).toBeFocused()
  await expect.poll(() => estadoDelTurno(request, turno.id)).toBe('disponible')
})

test('cambiar de fecha libera el turno anterior', async ({ page, request }) => {
  const turno = await turnoLibre(request)
  await page.goto(`/turnos/${turno.id}/confirmar`)
  await reservarAunqueSeSuperponga(page)

  await page.getByRole('link', { name: 'Cambiar de fecha' }).click()
  await expect(titulo(page)).toHaveText('Elegí el turno nuevo')
  await page.getByRole('button', { name: 'Sí, continuar' }).click()
  await expect(page.getByText('Elegí uno de los turnos.').first()).toBeVisible()

  await page.getByRole('group', { name: 'Turnos libres' }).getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Sí, continuar' }).click()
  await expect(titulo(page)).toHaveText('Confirmá el cambio')
  await expect(page.getByRole('heading', { level: 2, name: 'Tu turno nuevo' })).toBeVisible()

  await page.getByRole('button', { name: 'Sí, cambiar el turno' }).click()
  const igual = page.getByRole('button', { name: 'Sí, cambiar igual' })
  await expect(titulo(page).filter({ hasText: /^Listo\. Cambiamos tu turno al/ }).or(igual)).toBeVisible()
  if (await igual.isVisible()) await igual.click()

  await expect(titulo(page)).toHaveText(/^Listo\. Cambiamos tu turno al /)
  await expect.poll(() => estadoDelTurno(request, turno.id)).toBe('disponible')
})

test('un turno que ya pasó no se puede cancelar y se explica por qué', async ({ page }) => {
  await page.goto('/mis-turnos')
  const anteriores = page.locator('section', { has: page.getByRole('heading', { level: 2, name: /Anteriores/ }) })
  const pasado = anteriores.locator('article', { hasText: 'Ya fuiste' }).first()
  await pasado.getByRole('link', { name: 'Ver el turno' }).click()
  await expect(page).toHaveURL(/\/reservas\/[0-9a-f-]+$/)
  await expect(titulo(page)).toHaveText('Tu turno')
  await expect(page.getByRole('link', { name: 'Cancelar este turno' })).toHaveCount(0)

  await page.goto(`${new URL(page.url()).pathname}/cancelar`)
  await expect(page.getByText('Ese turno ya pasó.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sí, cancelar el turno' })).toHaveCount(0)
})
