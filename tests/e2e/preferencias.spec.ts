import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'

test.use({ storageState: SESIONES.prueba })
test.describe.configure({ mode: 'serial' })

test('la bienvenida configura todo de a una pregunta y lo guarda en la cuenta', async ({ page, context }) => {
  await page.goto('/bienvenida?volver=/inicio')
  const html = page.locator('html')
  const titulo = page.getByRole('heading', { level: 1 })

  await expect(titulo).toHaveText('¿Qué tamaño de letra te queda más cómodo?')
  await expect(page.locator('main').getByText('Paso 1 de 6')).toBeVisible()
  await page.getByRole('radio', { name: /Enorme/ }).click()
  await expect(html).toHaveAttribute('data-text-scale', '200')
  await page.getByRole('button', { name: 'Sí, continuar' }).click()

  await expect(titulo).toHaveText('¿Cómo ves mejor?')
  await page.getByRole('radio', { name: /Fondo blanco/ }).click()
  await expect(html).toHaveAttribute('data-theme', 'claro')
  await page.getByRole('button', { name: 'Sí, continuar' }).click()

  await expect(titulo).toHaveText('¿Querés que te leamos las pantallas en voz alta?')
  await page.getByRole('radio', { name: /Sí, leeme/ }).click()
  await expect(page.getByRole('group', { name: '¿A qué velocidad?' })).toBeVisible()
  await page.getByRole('radio', { name: /Despacio/ }).click()
  await page.getByRole('button', { name: 'Sí, continuar' }).click()

  await expect(titulo).toHaveText('¿Cómo querés que te expliquemos las cosas?')
  await page.getByRole('radio', { name: /Con palabras simples/ }).click()
  await page.getByRole('button', { name: 'Sí, continuar' }).click()

  await expect(titulo).toHaveText('¿Cómo querés que te avisemos de tus turnos?')
  await page.getByRole('radio', { name: /Solo con un aviso en la pantalla/ }).click()
  await page.getByRole('button', { name: 'Sí, continuar' }).click()

  await expect(titulo).toHaveText('Listo, así queda la app')
  await expect(page.locator('dd', { hasText: 'Enorme' })).toBeVisible()
  await expect(page.locator('dd', { hasText: 'Sí, despacio' })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar y empezar' }).click()
  await expect(page).toHaveURL((u) => u.pathname === '/inicio')

  await context.clearCookies({ name: 'ta_prefs' })
  await page.reload()
  await expect(html).toHaveAttribute('data-text-scale', '200')
  await expect(html).toHaveAttribute('data-theme', 'claro')
})

test('mis preferencias se guardan solas', async ({ page, context }) => {
  await page.goto('/perfil/accesibilidad')
  await page.getByRole('radio', { name: /^Grande/ }).click()
  await page.getByRole('radio', { name: /Fondo negro/ }).click()
  await page.getByRole('radio', { name: /No, prefiero leer yo/ }).click()
  await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText('Guardamos el cambio.')

  await context.clearCookies({ name: 'ta_prefs' })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', '125')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'alto-contraste')
})

test('mi perfil guarda teléfono y localidad', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByLabel('Tu teléfono').fill('11 4567 8901')
  await page.getByRole('button', { name: 'Tu localidad' }).click()
  await page.keyboard.type('benav')
  await page.getByRole('option', { name: /Benavídez/ }).click()
  await page.getByRole('button', { name: 'Guardar mis datos' }).click()
  await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText('Listo. Guardamos tus datos.')

  await page.reload()
  await expect(page.getByLabel('Tu teléfono')).toHaveValue('11 4567 8901')
  await expect(page.getByRole('button', { name: 'Tu localidad' })).toContainText('Benavídez')
})

test('un teléfono con letras se explica', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByLabel('Tu teléfono').fill('once cuarenta')
  await page.getByRole('button', { name: 'Guardar mis datos' }).click()
  await expect(page.getByText('Escribí el teléfono con números').first()).toBeVisible()
  await expect(page.getByLabel('Tu teléfono')).toBeFocused()
})
