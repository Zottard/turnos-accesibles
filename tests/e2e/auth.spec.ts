import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { SESIONES } from './sesiones'

const CLAVE_DEMO = 'demo1234'

async function ingresar(page: Page, email: string, clave = CLAVE_DEMO) {
  await page.getByLabel('Tu correo').fill(email)
  await page.getByLabel('Tu contraseña').fill(clave)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

const correoAlAzar = () => `nadie-${Date.now()}-${Math.random().toString(36).slice(2)}@demo.ar`

test('una página privada manda a ingresar y después vuelve', async ({ page }) => {
  await page.goto('/inicio')
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Finicio|\/ingresar\?volver=\/inicio/)
  await ingresar(page, 'solicitante@demo.ar')
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Rosa')
})

test('la sesión sobrevive a recargar y se puede salir', async ({ page }) => {
  await page.goto('/ingresar')
  await ingresar(page, 'solicitante@demo.ar')
  await expect(page).toHaveURL(/\/inicio$/)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hola, Rosa')

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toBeVisible()
  await page.goto('/inicio')
  await expect(page).toHaveURL(/\/ingresar/)
})

test.describe('como solicitante', () => {
  test.use({ storageState: SESIONES.solicitante })

  test('ingresar manda al inicio', async ({ page }) => {
    await page.goto('/ingresar')
    await expect(page).toHaveURL(/\/inicio$/)
  })

  test('el volver no permite ir a otro sitio', async ({ page }) => {
    await page.goto('/ingresar?volver=//ejemplo.com')
    await expect(page).toHaveURL('http://localhost:3000/inicio')
  })

  test('el panel de administración lo rechaza', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('No podés ver esta página.')
  })
})

test.describe('como admin', () => {
  test.use({ storageState: SESIONES.admin })

  test('el panel de administración lo deja entrar', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Panel de administración')
  })
})

test('los campos vacíos se explican y el foco va al primero', async ({ page }) => {
  await page.goto('/ingresar')
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await expect(page.getByText('Escribí tu correo.').first()).toBeVisible()
  await expect(page.getByLabel('Tu correo')).toBeFocused()
})

test('una contraseña equivocada dice qué pasó y qué hacer', async ({ page }) => {
  await page.goto('/ingresar')
  await ingresar(page, correoAlAzar(), 'otra-clave')
  await expect(page.getByText('El correo o la contraseña no coinciden.').first()).toBeVisible()
  await expect(page.locator('[role="alert"][aria-atomic="true"]')).toContainText('Probá de nuevo.')
})

test('al quinto intento fallido se pausa el ingreso y dice cuánto esperar', async ({ page }) => {
  const email = correoAlAzar()
  await page.goto('/ingresar')
  for (let i = 1; i <= 5; i++) {
    await ingresar(page, email, `mal-${i}`)
    await expect(page.locator('[role="alert"][aria-atomic="true"]')).not.toBeEmpty()
    if (i === 4) await expect(page.getByText('Te queda 1 intento').first()).toBeVisible()
  }
  await expect(page.getByText('Por seguridad, pausamos el ingreso con este correo.').first()).toBeVisible()
  await expect(page.getByText('Esperá 15 minutos').first()).toBeVisible()
})

test('pedir una contraseña nueva no revela si el correo existe', async ({ page }) => {
  await page.goto('/recuperar-clave')
  await page.getByLabel('Tu correo').fill(correoAlAzar())
  await page.getByRole('button', { name: 'Mandarme el enlace' }).click()
  await expect(page.getByText('tiene una cuenta, te mandamos un correo')).toBeVisible()
})

test('restablecer sin enlace válido explica qué hacer', async ({ page }) => {
  await page.goto('/restablecer-clave')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este enlace ya no sirve')
  await expect(page.getByRole('link', { name: 'Pedir un enlace nuevo' })).toBeVisible()
})

test.describe('registro paso a paso', () => {
  test('recorre todos los pasos, valida cada uno y guarda el borrador', async ({ page }) => {
    await page.goto('/registrarme')
    const titulo = page.getByRole('heading', { level: 1 })
    const continuar = page.getByRole('button', { name: 'Sí, continuar' })

    await expect(titulo).toHaveText('¿Cómo te llamás?')
    await expect(titulo).toBeFocused()
    await expect(page.locator('main').getByText('Paso 1 de 7')).toBeVisible()
    await continuar.click()
    await expect(page.getByText('Escribí tu nombre.').first()).toBeVisible()
    await page.getByLabel('Tu nombre', { exact: true }).fill('Rosa')
    await page.getByLabel('Tu apellido', { exact: true }).fill('Prueba')
    await continuar.click()

    await expect(titulo).toHaveText('¿Cuál es tu número de documento?')
    await expect(titulo).toBeFocused()
    await page.getByRole('textbox', { name: 'Número de documento' }).fill('12.34')
    await continuar.click()
    await expect(page.getByText('El documento tiene 7 u 8 números').first()).toBeVisible()
    await page.getByRole('textbox', { name: 'Número de documento' }).fill('12.345.678')
    await continuar.click()

    await expect(titulo).toHaveText('¿Cuándo naciste?')
    await page.getByLabel('Día', { exact: true }).fill('31')
    await page.getByRole('combobox', { name: 'Mes' }).click()
    await page.getByRole('option', { name: 'febrero' }).click()
    await page.getByLabel('Año', { exact: true }).fill('1950')
    await continuar.click()
    await expect(page.getByText('Esa fecha no existe').first()).toBeVisible()
    await page.getByLabel('Día', { exact: true }).fill('14')
    await continuar.click()

    await expect(titulo).toHaveText('¿En qué localidad vivís?')
    await page.getByLabel('Tu localidad', { exact: true }).fill('General Pacheco')
    await continuar.click()

    await expect(titulo).toHaveText('¿Cuál es tu correo electrónico?')
    await page.getByLabel('Tu correo', { exact: true }).fill('rosa.prueba@demo.ar')
    await page.getByRole('button', { name: 'Volver atrás' }).click()
    await expect(titulo).toHaveText('¿En qué localidad vivís?')
    await expect(page.getByLabel('Tu localidad', { exact: true })).toHaveValue('General Pacheco')
    await continuar.click()
    await expect(page.getByLabel('Tu correo', { exact: true })).toHaveValue('rosa.prueba@demo.ar')
    await continuar.click()

    await expect(titulo).toHaveText('Elegí una contraseña')
    await page.getByLabel('Tu contraseña nueva', { exact: true }).fill('corta')
    await continuar.click()
    await expect(page.getByText('al menos 8 letras o números').first()).toBeVisible()
    await page.getByLabel('Tu contraseña nueva', { exact: true }).fill('una-clave-larga')
    await continuar.click()

    await expect(titulo).toHaveText('Revisá tus datos')
    await expect(page.locator('main').getByText('Paso 7 de 7')).toBeVisible()
    await expect(page.getByText('14 de febrero de 1950')).toBeVisible()
    await expect(page.getByText('12345678')).toBeVisible()

    await page.getByRole('button', { name: 'Cambiar localidad' }).click()
    await expect(titulo).toHaveText('¿En qué localidad vivís?')
    await page.getByLabel('Tu localidad', { exact: true }).fill('Tigre')
    await continuar.click()
    await expect(titulo).toHaveText('Revisá tus datos')
    await expect(page.getByText('Tigre', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Sí, crear mi cuenta' }).click()
    await expect(page.getByText('tenés que aceptar los términos de uso').first()).toBeVisible()

    await page.reload()
    await expect(titulo).toHaveText('Elegí una contraseña')
    await page.getByRole('button', { name: 'Volver atrás' }).click()
    await expect(page.getByLabel('Tu correo', { exact: true })).toHaveValue('rosa.prueba@demo.ar')
  })
})

test('la barra demo entra como admin y marca con quién estás', async ({ page }) => {
  await page.goto('/')
  const barra = page.getByRole('complementary', { name: 'Modo demo' })
  await barra.getByRole('button', { name: 'Administración' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Panel de administración')
  await expect(barra.getByRole('button', { name: 'Administración' })).toHaveAttribute('aria-current', 'true')
})
