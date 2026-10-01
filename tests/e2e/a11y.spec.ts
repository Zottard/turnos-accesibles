import { expect, test } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import { SESIONES } from './sesiones'
import { turnoLibre } from './ayudas'

const ROUTES = ['/', '/ayuda', '/accesibilidad', '/terminos', '/ingresar', '/registrarme', '/recuperar-clave', '/confirmar-correo', '/restablecer-clave', '/demo', '/turnos/buscar']

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

test.describe('pantallas con sesión', () => {
  test.use({ storageState: SESIONES.solicitante })

  for (const route of ['/inicio', '/perfil', '/perfil/accesibilidad', '/bienvenida']) {
    test(`${route} no tiene violaciones críticas ni serias`, async ({ page }) => {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
    })

    test(`${route}: cada etiqueta apunta a un campo que existe`, async ({ page }) => {
      await page.goto(route)
      const huerfanas = await page.evaluate(() => [...document.querySelectorAll('label[for]')]
        .filter((l) => !document.getElementById((l as HTMLLabelElement).htmlFor))
        .map((l) => l.textContent?.trim()))
      expect(huerfanas).toEqual([])
    })
  }

  test('barrido de axe por el resto de las pantallas con sesión', async ({ page, request }) => {
    test.setTimeout(120_000)
    const turno = await turnoLibre(request)
    await page.goto('/mis-turnos')
    const ver = page.locator('main').getByRole('link', { name: 'Ver el turno' }).first()
    const reserva = (await ver.count()) ? (await ver.getAttribute('href'))! : null
    const rutas = [
      '/mis-turnos', '/notificaciones', '/acompanantes', '/acompanantes/invitar', '/turnos/asistente',
      `/turnos/${turno.id}`, `/turnos/${turno.id}/confirmar`, '/invitacion/no-existe',
      ...(reserva ? [reserva, `${reserva}/cancelar`, `${reserva}/reprogramar`] : []),
    ]
    for (const ruta of rutas) {
      await page.goto(ruta)
      await expect(page.locator('h1').first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      expect(graves, `${ruta}: ${JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)}`).toEqual([])
    }
  })
})
