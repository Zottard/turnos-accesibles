import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'
import { reservarAunqueSeSuperponga, titulo, turnos } from './ayudas'

const continuar = (page: Page) => page.getByRole('button', { name: 'Sí, continuar' })

async function sinViolaciones(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
}


test.describe('con sesión', () => {
  test.use({ storageState: SESIONES.prueba })

  test('el asistente por menús reserva un turno de punta a punta', async ({ page }) => {
    await page.goto('/turnos/asistente')
    await page.evaluate(() => sessionStorage.removeItem('ta_asistente'))
    await page.reload()

    await expect(titulo(page)).toHaveText('¿Qué necesitás?')
    await expect(page.locator('main').getByText('Antes de empezar')).toBeVisible()
    await page.getByRole('button', { name: 'Prefiero elegir de una lista' }).click()

    await expect(titulo(page)).toHaveText('¿Qué médico necesitás?')
    await expect(titulo(page)).toBeFocused()
    await expect(page.locator('main').getByText('Paso 1 de 6')).toBeVisible()
    await continuar(page).click()
    await expect(page.getByText('Elegí qué médico necesitás.').first()).toBeVisible()
    await page.getByRole('radio', { name: /^Oculista/ }).click()
    await continuar(page).click()

    await expect(titulo(page)).toHaveText('¿Dónde te queda cómodo?')
    await page.getByRole('radio', { name: /Donde haya turno antes/ }).click()
    await continuar(page).click()

    await expect(titulo(page)).toHaveText('¿Cuándo podés ir?')
    await continuar(page).click()

    await expect(titulo(page)).toHaveText('Estos son los turnos que encontré')
    const opciones = page.getByRole('radio')
    await expect(opciones.first()).toBeVisible()
    await sinViolaciones(page)
    await opciones.first().click()
    await continuar(page).click()

    await expect(titulo(page)).toHaveText('Confirmá que está todo bien')
    await expect(page.getByText('Es un turno de')).toBeVisible()
    await reservarAunqueSeSuperponga(page)
    await expect(page).toHaveURL(/\/reservas\/[0-9a-f-]+\?nuevo=1/)
    await expect(page.locator('main').getByText('Número de turno:')).toBeVisible()
    await expect(page.getByText('Confirmado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar a mi calendario' })).toBeVisible()
    await sinViolaciones(page)

    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Agregar a mi calendario' }).click()
    expect((await descarga).suggestedFilename()).toMatch(/^turno-\d+\.ics$/)
  })

  test('el asistente entiende un pedido escrito y pide confirmación', async ({ page }) => {
    await page.goto('/turnos/asistente')
    await page.evaluate(() => sessionStorage.removeItem('ta_asistente'))
    await page.reload()

    await page.getByLabel('Contanos qué necesitás').fill('necesito un oculista a la mañana')
    await page.getByRole('button', { name: 'Buscar con lo que escribí' }).click()
    await expect(page.getByText('Entendí esto:')).toBeVisible()
    await expect(page.locator('dd', { hasText: 'Oculista' })).toBeVisible()
    await expect(page.locator('dd', { hasText: 'a la mañana' })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, buscar turnos' }).click()
    await expect(titulo(page)).toHaveText('Estos son los turnos que encontré')
    await expect(page.locator('[data-slot="item"]').first()).toContainText('de la mañana')
  })

  test('si el intérprete no responde, sigue por menús', async ({ page }) => {
    await page.route('**/api/asistente/interpretar', (r) => r.fulfill({ status: 503, body: '{}' }))
    await page.goto('/turnos/asistente')
    await page.evaluate(() => sessionStorage.removeItem('ta_asistente'))
    await page.reload()

    await page.getByLabel('Contanos qué necesitás').fill('necesito un oculista')
    await page.getByRole('button', { name: 'Buscar con lo que escribí' }).click()
    await expect(titulo(page)).toHaveText('¿Qué médico necesitás?')
    await expect(page.locator('[role="status"][aria-atomic="true"]')).toHaveText('Paso 1 de 6')
  })

  test('el borrador sobrevive a recargar la página', async ({ page }) => {
    await page.goto('/turnos/asistente')
    await page.evaluate(() => sessionStorage.removeItem('ta_asistente'))
    await page.reload()
    await page.getByRole('button', { name: 'Prefiero elegir de una lista' }).click()
    await page.getByRole('radio', { name: /^Dentista/ }).click()
    await continuar(page).click()
    await expect(titulo(page)).toHaveText('¿Dónde te queda cómodo?')

    await page.reload()
    await expect(titulo(page)).toHaveText('¿Dónde te queda cómodo?')
    await page.getByRole('button', { name: 'Volver atrás' }).click()
    await expect(page.getByRole('radio', { name: /^Dentista/ })).toBeChecked()
  })

  test('un turno que ya tomó otra persona muestra alternativas sin perder nada', async ({ page, request }) => {
    const [ocupado] = await turnos(request, `estado=eq.reservado&fecha_hora=gt.${new Date().toISOString()}&limit=1`)
    await page.goto(`/turnos/${ocupado!.id}/confirmar`)
    await page.getByRole('button', { name: 'Sí, reservar este turno' }).click()
    await expect(page.getByText('Ese turno lo tomó otra persona.').first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Otros turnos parecidos' })).toBeVisible()
    const alternativa = page.locator('section', { hasText: 'Otros turnos parecidos' }).locator('li button').first()
    await expect(alternativa).toBeVisible()
    await alternativa.click()
    await expect(page).toHaveURL(/\/turnos\/[0-9a-f-]+\/confirmar/)
    await expect(page.getByRole('button', { name: 'Sí, reservar este turno' })).toBeVisible()
  })

  test('avisa si se superpone con otro turno y deja reservar igual', async ({ page, request }) => {
    const libres = await turnos(request, `estado=eq.disponible&fecha_hora=gt.${new Date(Date.now() + 20 * 86_400_000).toISOString()}&order=profesional_id,fecha_hora&limit=200`)
    const par = libres.flatMap((t, i) => {
      const siguiente = libres[i + 1]
      return siguiente && siguiente.profesional_id === t.profesional_id
        && Date.parse(siguiente.fecha_hora) - Date.parse(t.fecha_hora) <= 3_600_000 ? [[t, siguiente] as const] : []
    })[0]
    expect(par).toBeDefined()

    await page.goto(`/turnos/${par![0].id}/confirmar`)
    await reservarAunqueSeSuperponga(page)

    await page.goto(`/turnos/${par![1].id}/confirmar`)
    await page.getByRole('button', { name: 'Sí, reservar este turno' }).click()
    await expect(page.getByText('Ya tenés otro turno cerca de ese horario.').first()).toBeVisible()
    await page.getByRole('button', { name: 'Sí, reservar igual' }).click()
    await expect(titulo(page)).toHaveText('¡Listo! Reservaste tu turno')
  })
})

test('sin sesión, el asistente pide ingresar y después sigue donde estaba', async ({ page }) => {
  await page.goto('/turnos/asistente')
  await page.getByRole('button', { name: 'Prefiero elegir de una lista' }).click()
  await page.getByRole('radio', { name: /^Cardiólogo/ }).click()
  await continuar(page).click()
  await page.getByRole('radio', { name: /Donde haya turno antes/ }).click()
  await continuar(page).click()
  await continuar(page).click()
  await page.getByRole('radio').first().click()
  await continuar(page).click()

  await expect(page.getByText('Para reservar tenés que ingresar a tu cuenta.')).toBeVisible()
  await page.getByRole('link', { name: 'Ingresar' }).last().click()
  await page.getByLabel('Tu correo').fill('prueba@demo.ar')
  await page.getByLabel('Tu contraseña').fill('demo1234')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()

  await expect(page).toHaveURL((u) => u.pathname === '/turnos/asistente')
  await expect(titulo(page)).toHaveText('Confirmá que está todo bien')
  await expect(page.getByRole('button', { name: 'Sí, reservar este turno' })).toBeVisible()
})
