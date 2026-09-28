import { expect, test } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

const ROUTES = ['/', '/ayuda', '/accesibilidad', '/terminos', '/ingresar', '/registrarme', '/recuperar-clave', '/confirmar-correo', '/restablecer-clave']

const THEMES = [
  { name: 'claro', prefs: { contrast: 'normal', textScale: '100' } },
  { name: 'alto contraste al 200 %', prefs: { contrast: 'alto', textScale: '200' } },
]

for (const theme of THEMES) {
  test.describe(`tema ${theme.name}`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{
        name: 'ta_prefs',
        value: encodeURIComponent(JSON.stringify(theme.prefs)),
        url: baseURL,
      }])
    })

    for (const route of ROUTES) {
      test(`${route} no tiene violaciones críticas ni serias`, async ({ page }) => {
        await page.goto(route)
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
        expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
      })

      test(`${route} no scrollea de costado`, async ({ page }) => {
        await page.goto(route)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow).toBeLessThanOrEqual(0)
      })
    }
  })
}

test('el primer Tab va al skip link y lleva al contenido', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Saltar al contenido principal' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#contenido')).toBeFocused()
})

test('la página está en español y tiene un solo h1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-AR')
  await expect(page.locator('h1')).toHaveCount(1)
})

test('el perfil por defecto es el accesible', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'alto-contraste')
  await expect(html).toHaveAttribute('data-text-scale', '125')
  await expect(html).toHaveAttribute('data-reduce-motion', 'true')
})
