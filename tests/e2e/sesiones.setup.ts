import { expect, test as setup } from './fixtures'
import { SESIONES } from './sesiones'

for (const [rol, archivo] of Object.entries(SESIONES)) {
  setup(`inicia sesión como ${rol}`, async ({ page }) => {
    await page.goto('/ingresar')
    await page.getByLabel('Tu correo').fill(`${rol}@demo.ar`)
    await page.getByLabel('Tu contraseña').fill('demo1234')
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
    await expect(page).toHaveURL(/\/inicio$/)
    await page.context().storageState({ path: archivo })
  })
}
