import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'
import { reservarAunqueSeSuperponga, titulo, turnoLibre } from './ayudas'

test.use({ storageState: SESIONES.admin })

const enDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10)

for (const ruta of ['/admin', '/admin/centros', '/admin/especialidades', '/admin/profesionales', '/admin/agendas', '/admin/metricas']) {
  test(`${ruta} no tiene violaciones críticas ni serias`, async ({ page }) => {
    await page.goto(ruta)
    await expect(titulo(page)).toBeVisible()
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const graves = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([])
  })
}

test('alta, edición y baja de una especialidad', async ({ page }) => {
  const nombre = `Prueba ${Date.now()}`
  await page.goto('/admin/especialidades')
  await page.getByRole('button', { name: 'Agregar una especialidad' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText('Escribí cómo lo dice la gente').first()).toBeVisible()
  await modal.getByLabel('Nombre común').fill(nombre)
  await modal.getByLabel('Nombre técnico').fill(`${nombre} técnica`)
  await modal.getByLabel('Para qué sirve').fill('Especialidad creada por los tests.')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()

  const tarjeta = page.locator('article', { hasText: nombre })
  await expect(tarjeta.getByText('Activa')).toBeVisible()
  await tarjeta.getByRole('button', { name: 'Dar de baja' }).click()
  await expect(tarjeta.getByText('Dada de baja')).toBeVisible()
})

test('no deja dar de baja un centro con turnos reservados', async ({ page, request }) => {
  const turno = await turnoLibre(request, 3)
  await page.goto(`/turnos/${turno.id}/confirmar`)
  await reservarAunqueSeSuperponga(page)
  const centro = (await page.locator('li', { hasText: 'Es en' }).locator('strong').textContent())!.trim()

  await page.goto('/admin/centros')
  await page.locator('article', { hasText: centro }).first().getByRole('button', { name: 'Dar de baja' }).click()
  await expect(page.locator('[role="alert"][aria-atomic="true"]')).toContainText('No se puede dar de baja: tiene')
  await expect(page.locator('article', { hasText: centro }).first().getByText('Activo')).toBeVisible()

  await page.goBack()
  await page.goto('/mis-turnos')
  const reserva = page.locator('article', { hasText: centro }).first()
  await reserva.getByRole('link', { name: 'Cancelar' }).click()
  await page.getByRole('button', { name: 'Sí, cancelar el turno' }).click()
  await expect(titulo(page)).toHaveText('Listo. Cancelamos tu turno.')
})

test('genera una agenda y avisa si se superpone', async ({ page }) => {
  const apellido = `Prueba${Date.now()}`
  await page.goto('/admin/profesionales')
  await page.getByRole('button', { name: 'Agregar un profesional' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByLabel('Nombre').first().fill('Test')
  await modal.getByLabel('Apellido').fill(apellido)
  await modal.getByLabel('Matrícula').fill('MP 999999')
  await modal.getByRole('button', { name: 'Especialidad' }).click()
  await page.keyboard.type('Riñ')
  await page.getByRole('option', { name: /Riñón/ }).click()
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()

  await page.goto('/admin/agendas')
  await page.getByRole('button', { name: 'Centro' }).click()
  await page.keyboard.type('Bocalandro')
  await page.getByRole('option', { name: /Bocalandro/ }).click()
  await page.getByRole('button', { name: 'Especialidad' }).click()
  await page.keyboard.type('Riñ')
  await page.getByRole('option', { name: /Riñón/ }).click()
  await page.getByRole('button', { name: 'Profesional' }).click()
  await page.getByRole('option', { name: new RegExp(apellido) }).click()
  await page.getByLabel('Desde').fill(enDias(100))
  await page.getByLabel('Hasta').fill(enDias(106))
  await page.getByLabel('Empieza a atender').fill('06:00')
  await page.getByLabel('Termina de atender').fill('07:00')

  await page.getByRole('button', { name: 'Generar la agenda' }).click()
  await expect(page.locator('main').getByText(/^Listo\. Creamos \d+ días de agenda con \d+ turnos\.$/)).toBeVisible()

  await page.getByRole('button', { name: 'Generar la agenda' }).click()
  await expect(page.getByText('Se superpone con otra agenda de este profesional.').first()).toBeVisible()
})

test('las métricas muestran resumen, tabla equivalente y se descargan', async ({ page }) => {
  await page.goto('/admin/metricas')
  await expect(page.getByRole('heading', { level: 2, name: 'Resumen del período' })).toBeVisible()
  await expect(page.locator('li', { hasText: 'Turnos reservados' }).first()).toBeVisible()
  await expect(page.getByText('Reservados por un acompañante')).toBeVisible()
  const tabla = page.getByRole('table', { name: 'Turnos reservados por médico en el período' })
  await expect(tabla.getByRole('row').nth(1)).toBeVisible()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar en Excel (CSV)' }).click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toMatch(/^metricas-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv$/)

  await page.getByLabel('Desde').fill('2020-01-01')
  await page.getByLabel('Hasta').fill('2020-01-31')
  await expect(page.getByText('No hubo reservas en este período.')).toBeVisible()
})
