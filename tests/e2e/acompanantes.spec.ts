import type { Browser, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'
import { reservarAunqueSeSuperponga, titulo, turnoLibre } from './ayudas'

test.describe.configure({ mode: 'serial' })

async function como(browser: Browser, sesion: string) {
  const contexto = await browser.newContext({ storageState: sesion })
  const page = await contexto.newPage()
  const goto = page.goto.bind(page)
  page.goto = async (url, opciones) => {
    const r = await goto(url, opciones)
    await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__))
    return r
  }
  return page
}

async function quitarInvitaciones(page: Page, correo: string) {
  await page.goto('/acompanantes')
  await page.locator('main h1').waitFor()
  await page.getByText(/Quiénes te ayudan/).waitFor()
  for (;;) {
    const tarjeta = page.locator('article', { hasText: correo }).first()
    if (!(await tarjeta.isVisible())) return
    await tarjeta.getByRole('button', { name: /Quitar|Cancelar la invitación/ }).click()
    await tarjeta.getByRole('button', { name: 'Sí, quitar' }).click()
    await expect(page.locator('[role="status"][aria-atomic="true"]')).toContainText('ya no te acompaña')
  }
}

async function invitar(page: Page, correo: string, cancelar: boolean) {
  await page.goto('/acompanantes/invitar')
  await page.getByLabel('El correo de la persona').fill(correo)
  if (cancelar) await page.getByLabel('Cancelar o cambiar tus turnos').check()
  await page.getByRole('button', { name: 'Sí, crear la invitación' }).click()
  await expect(titulo(page)).toHaveText('Listo. Ya podés mandar la invitación.')
  return new URL(await page.getByLabel('Enlace de invitación').inputValue()).pathname
}

test('Pablo invita a Lucía, ella acepta, saca y cancela un turno por él, y él le quita el permiso', async ({ browser, request }) => {
  const pablo = await como(browser, SESIONES.prueba)
  const lucia = await como(browser, SESIONES.acompanante)

  await quitarInvitaciones(pablo, 'acompanante@demo.ar')
  const enlace = await invitar(pablo, 'acompanante@demo.ar', true)

  await lucia.goto(enlace)
  await expect(titulo(lucia)).toHaveText('Pablo Prueba te invita a acompañarle con sus turnos')
  await expect(lucia.getByText('Cancelar o cambiar sus turnos')).toBeVisible()
  const { violations } = await new AxeBuilder({ page: lucia }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([])
  await lucia.getByRole('button', { name: 'Sí, quiero acompañar' }).click()
  await expect(titulo(lucia)).toHaveText('Listo. Ya acompañás a Pablo Prueba.')

  await lucia.getByRole('link', { name: 'Empezar a ayudar a Pablo Prueba' }).click()
  await expect(titulo(lucia)).toHaveText('Turnos de Pablo Prueba')
  await expect(lucia.getByText('Estás ayudando a Pablo Prueba')).toBeVisible()

  const turno = await turnoLibre(request, 5)
  await lucia.goto(`/turnos/${turno.id}/confirmar`)
  await expect(lucia.getByText('Este turno es para Pablo Prueba.')).toBeVisible()
  await reservarAunqueSeSuperponga(lucia)

  await lucia.getByRole('link', { name: 'Turnos de Pablo Prueba' }).click()
  const tarjeta = lucia.locator('article').filter({ has: lucia.getByRole('link', { name: 'Cancelar' }) }).first()
  await tarjeta.getByRole('link', { name: 'Cancelar' }).click()
  await lucia.getByRole('button', { name: 'Sí, cancelar el turno' }).click()
  await expect(titulo(lucia)).toHaveText('Listo. Cancelamos tu turno.')

  await pablo.goto('/notificaciones')
  await expect(pablo.getByRole('heading', { name: 'Lucía Gómez aceptó acompañarte' }).first()).toBeVisible()

  await quitarInvitaciones(pablo, 'acompanante@demo.ar')
  await lucia.getByRole('button', { name: 'Volver a mi cuenta' }).click()
  await lucia.goto('/acompanantes')
  await expect(lucia.getByRole('link', { name: 'Ayudar a Pablo Prueba' })).toHaveCount(0)
})

test('una invitación para otro correo se explica', async ({ browser }) => {
  const pablo = await como(browser, SESIONES.prueba)
  const lucia = await como(browser, SESIONES.acompanante)
  await quitarInvitaciones(pablo, 'otra.persona@demo.ar')
  const enlace = await invitar(pablo, 'otra.persona@demo.ar', false)

  await lucia.goto(enlace)
  await lucia.getByRole('button', { name: 'Sí, quiero acompañar' }).click()
  await expect(lucia.getByText('Esta invitación es para otro correo.').first()).toBeVisible()
  await expect(lucia.getByText('Ingresá con la cuenta de otra.persona@demo.ar').first()).toBeVisible()

  await quitarInvitaciones(pablo, 'otra.persona@demo.ar')
})

test('Lucía ayuda a Rosa solo con lo que Rosa le permitió', async ({ browser }) => {
  const lucia = await como(browser, SESIONES.acompanante)
  await lucia.goto('/inicio')
  await lucia.getByRole('link', { name: 'Ayudar a Rosa Gómez' }).click()
  await expect(titulo(lucia)).toHaveText('Turnos de Rosa Gómez')
  await expect(lucia.getByText('Ver sus turnos')).toBeVisible()
  await expect(lucia.getByText('Sacar turnos por Rosa Gómez')).toBeVisible()
  await expect(lucia.getByText('Cancelar o cambiar sus turnos')).toHaveCount(0)
  await expect(lucia.getByRole('link', { name: 'Sacar un turno para Rosa Gómez' })).toBeVisible()
  await lucia.getByRole('button', { name: 'Volver a mi cuenta' }).click()
  await expect(lucia.getByText('Estás ayudando a Rosa Gómez')).toHaveCount(0)
})

test('sin invitación no se puede ayudar a nadie', async ({ browser }) => {
  const lucia = await como(browser, SESIONES.acompanante)
  await lucia.goto('/asistiendo/00000000-0000-0000-0000-000000000000')
  await expect(titulo(lucia)).toHaveText('No podés ayudar a esta persona')
})
