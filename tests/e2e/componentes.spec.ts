import { expect, test } from './fixtures'
import AxeBuilder from '@axe-core/playwright'

const COMBOS = [
  { tema: 'claro', escala: '100' },
  { tema: 'claro', escala: '200' },
  { tema: 'alto-contraste', escala: '100' },
  { tema: 'alto-contraste', escala: '200' },
]

const muestra = (tema = 'claro', escala = '100') => `/demo-ui/muestra?tema=${tema}&escala=${escala}`

for (const { tema, escala } of COMBOS) {
  test.describe(`muestra ${tema} al ${escala} %`, () => {
    test('no tiene violaciones críticas ni serias', async ({ page }) => {
      await page.goto(muestra(tema, escala))
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
      expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
    })

    test('no scrollea de costado', async ({ page }) => {
      await page.goto(muestra(tema, escala))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  })
}

test('botones y opciones miden al menos 48 × 48 px', async ({ page }) => {
  await page.goto(muestra())
  const chicos = await page.evaluate(() =>
    [...document.querySelectorAll('main button:not([role="radio"]):not([role="checkbox"]), main [data-slot="item"], main [data-slot="root"]:has([role="checkbox"])')]
      .map((el) => ({ texto: el.textContent?.trim(), ...el.getBoundingClientRect().toJSON() }))
      .filter((r) => r.height < 48 || r.width < 48),
  )
  expect(chicos).toEqual([])
})

test('los botones principales miden al menos 56 px de alto', async ({ page }) => {
  await page.goto(muestra())
  const box = await page.getByRole('button', { name: 'Sí, continuar' }).boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(56)
})

test('el paso lleva el foco al título al cargar', async ({ page }) => {
  await page.goto(muestra())
  await expect(page.getByRole('heading', { level: 1, name: '¿Qué médico necesitás?' })).toBeFocused()
  await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText('Paso 1 de 6')
})

test('las opciones se eligen con teclado y el foco se ve', async ({ page }) => {
  await page.goto(muestra())
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()

  await page.keyboard.press('Tab')
  const oculista = page.getByRole('radio', { name: 'Oculista' })
  await expect(oculista).toBeFocused()

  const outline = await oculista.evaluate((el) => getComputedStyle(el.closest('[data-slot="item"]')!).outlineStyle)
  expect(outline).toBe('solid')

  await page.keyboard.down('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Médico de familia' })).toBeFocused()
  await page.keyboard.up('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Médico de familia' })).toBeChecked()
})

test('continuar sin elegir explica qué falta, sin deshabilitar el botón', async ({ page }) => {
  await page.goto(muestra())
  await page.getByRole('button', { name: 'Sí, continuar' }).click()
  await expect(page.getByText('Elegí un médico para seguir.').first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText('Elegí un médico para seguir.')

  await page.getByRole('radio', { name: 'Cardiólogo' }).click()
  await expect(page.getByText('Elegí un médico para seguir.')).toHaveCount(1)
})

test('los estados de pantalla se anuncian', async ({ page }) => {
  await page.goto(muestra())
  await page.getByRole('radio', { name: 'Error' }).click()
  await expect(page.getByRole('alert')).toHaveText('Algo no funcionó. Probá de nuevo en un momento.')
  await page.getByRole('button', { name: 'Probar de nuevo' }).click()
  await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText('Estamos buscando. Esperá un momento.')
})
