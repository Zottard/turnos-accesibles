import { expect, test } from './fixtures'
import { titulo } from './ayudas'

test('sin conexión muestra la página de aviso, sin datos guardados', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }))
    }
  })
  await context.setOffline(true)
  await page.evaluate(() => { location.href = '/turnos/buscar' })
  await expect(page.getByRole('heading', { level: 1, name: 'No hay internet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Probar de nuevo' })).toBeVisible()
  await context.setOffline(false)
  await expect(titulo(page)).toHaveText('Buscar un turno', { timeout: 10_000 })
})

test('el formulario de ayuda explica qué falta y manda el mensaje', async ({ page }) => {
  await page.goto('/ayuda')
  await page.getByRole('button', { name: 'Mandar el mensaje' }).click()
  await expect(page.getByText('Contanos qué pasó en una o dos oraciones.').first()).toBeVisible()
  await expect(page.getByLabel('Tu mensaje')).toBeFocused()

  await page.getByLabel('Tu mensaje').fill('Mensaje de prueba de los tests automáticos.')
  await page.getByRole('button', { name: 'Mandar el mensaje' }).click()
  await expect(page.getByText('Listo. Recibimos tu mensaje.').first()).toBeFocused()
})
