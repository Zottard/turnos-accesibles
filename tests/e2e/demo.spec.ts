import { expect, test } from './fixtures'

test('el alcance lista todas las pantallas con su estado', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Todo lo que va a tener Turnos Accesibles')
  await expect(page.getByText(/\d+ de \d+ pantallas listas/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Reservar con el asistente/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute('href', '/registrarme')
  await expect(page.getByRole('link', { name: 'Asistente paso a paso' })).toHaveCount(0)
})

test('en el celular la barra demo arranca cerrada', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'solo celular')
  await page.goto('/')
  const barra = page.getByRole('complementary', { name: 'Modo demo' })
  await expect(barra.getByRole('button', { name: 'Rosa (solicitante)' })).toBeHidden()
  await barra.getByText('Modo demo: entrar como otra persona').click()
  await expect(barra.getByRole('button', { name: 'Rosa (solicitante)' })).toBeVisible()
})
