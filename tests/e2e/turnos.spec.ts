import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

async function sinViolaciones(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
}

async function elegir(page: Page, campo: string, texto: string, opcion: RegExp) {
  await page.getByRole('button', { name: campo }).click()
  await page.keyboard.type(texto)
  await page.getByRole('option', { name: opcion }).click()
}

test('buscar sin elegir explica qué falta y lleva el foco al primer campo', async ({ page }) => {
  await page.goto('/turnos/buscar')
  await page.getByRole('button', { name: 'Buscar turnos' }).click()
  await expect(page.getByText('Elegí qué médico necesitás.').first()).toBeVisible()
  await expect(page.getByRole('button', { name: '¿Qué médico necesitás?' })).toBeFocused()
})

test('busca oculista cerca de General Pacheco y abre la ficha', async ({ page }) => {
  await page.goto('/turnos/buscar')
  await elegir(page, '¿Qué médico necesitás?', 'ocul', /Oculista/)
  await elegir(page, 'Tu localidad', 'pacheco', /General Pacheco/)
  await page.getByRole('button', { name: 'Buscar turnos' }).click()

  const titulo = page.getByRole('heading', { level: 2, name: 'Turnos libres de oculista' })
  await expect(titulo).toBeFocused()
  await expect(page).toHaveURL(/especialidad=oftalmologia/)

  const tarjetas = page.locator('article')
  await expect(tarjetas).toHaveCount(5)
  await expect(tarjetas.first().getByRole('heading', { level: 3 })).toHaveText(/(lunes|martes|miércoles|jueves|viernes) \d+ de [a-z]+, a las? \d+/)
  await expect(tarjetas.first()).toContainText('km')
  await expect(tarjetas.first().getByText('Disponible')).toBeVisible()
  await expect(page.getByText(/Estás viendo 5 de \d+ lugares/)).toBeVisible()
  await sinViolaciones(page)

  await page.getByRole('button', { name: 'Mostrar más' }).click()
  await expect(tarjetas).toHaveCount(6)

  await tarjetas.first().getByRole('link', { name: 'Ver este turno' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/a las? \d+/)
  await expect(page.getByText('Este es un turno de prueba.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Dónde' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute('href', /google\.com\/maps/)
  await sinViolaciones(page)

  await page.getByRole('link', { name: 'Ver otros horarios en este lugar' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Horarios libres de oculista' })).toBeVisible()
  await expect(page.getByText(/Estás viendo los horarios de/)).toBeVisible()
})

test('ordenar por fecha o por cercanía', async ({ page }) => {
  await buscarCardiologoDesde(page, 'General Pacheco')
  const cerca = page.getByRole('button', { name: 'Los más cerca' })
  await expect(cerca).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Los más pronto' }).click()
  await expect(page).toHaveURL(/orden=fecha/)
  await expect(page.getByRole('button', { name: 'Los más pronto' })).toHaveAttribute('aria-pressed', 'true')
})

test('sin resultados sugiere cómo ampliar la búsqueda', async ({ page }) => {
  await page.goto('/turnos/buscar?especialidad=nefrologia&desde_donde=cualquiera&desde=2030-01-01')
  await expect(page.locator('main').getByText('No encontramos turnos libres con lo que elegiste.')).toBeVisible()
  await page.getByRole('button', { name: 'Buscar desde hoy' }).click()
  await expect(page.locator('article').first()).toBeVisible()
})

test('un turno que no existe muestra un error claro', async ({ page }) => {
  await page.goto('/turnos/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No encontramos esta página.')
})

async function buscarCardiologoDesde(page: Page, nombre: string) {
  await page.goto('/turnos/buscar')
  await page.getByRole('button', { name: 'Tu localidad' }).click()
  await page.keyboard.type(nombre)
  await page.getByRole('option', { name: new RegExp(nombre) }).click()
  await page.getByRole('button', { name: '¿Qué médico necesitás?' }).click()
  await page.keyboard.type('cardi')
  await page.getByRole('option', { name: /Cardiólogo/ }).click()
  await page.getByRole('button', { name: 'Buscar turnos' }).click()
  await expect(page).toHaveURL(/localidad=\d+/)
}
