// Genera los íconos PNG de la app instalable (PWA) a partir de public/icono.svg.
// Usa Chrome sin ventana (por el protocolo de DevTools) para "sacarle una foto" al SVG: no hace
// falta ninguna librería. Hace falta Node 22 o más nuevo (trae WebSocket).
//
//   node scripts/iconos.mjs            (busca Chrome en el lugar de siempre)
//   CHROME="/ruta/a/chrome" node scripts/iconos.mjs
//
// Crea en public/: icono-192.png e icono-512.png (fondo crema, ícono con margen) e
// icono-maskable-512.png (el ícono dentro de la "zona segura" del centro, para Android, que lo
// recorta en círculo o en cuadrado redondeado).
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const RAIZ = resolve(import.meta.dirname, '..')
const CREMA = '#FFF9F0'
const PUERTO = 9555

const CANDIDATOS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const rutaChrome = CANDIDATOS.find((ruta) => existsSync(ruta))
if (!rutaChrome) {
  console.error('No encontré Chrome. Indicá dónde está con la variable CHROME.')
  process.exit(1)
}

const svg = readFileSync(join(RAIZ, 'public/icono.svg'), 'utf8')

// tamano: lado del PNG. ocupa: qué parte del lado ocupa el ícono (el resto es margen crema).
const ICONOS = [
  { archivo: 'icono-192.png', tamano: 192, ocupa: 0.8 },
  { archivo: 'icono-512.png', tamano: 512, ocupa: 0.8 },
  { archivo: 'icono-maskable-512.png', tamano: 512, ocupa: 0.6 },
]

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms))
const carpeta = mkdtempSync(join(tmpdir(), 'iconos-'))
const chrome = spawn(
  rutaChrome,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${carpeta}`, 'about:blank'],
  { stdio: 'ignore' },
)

try {
  // Esperamos a que Chrome atienda y nos conectamos a su pestaña.
  let pestanas = []
  for (let intento = 0; intento < 40 && pestanas.length === 0; intento++) {
    await esperar(250)
    pestanas = await fetch(`http://127.0.0.1:${PUERTO}/json`).then((r) => r.json()).catch(() => [])
  }
  const pestana = pestanas.find((item) => item.type === 'page')
  const ws = new WebSocket(pestana.webSocketDebuggerUrl)
  await new Promise((listo) => ws.addEventListener('open', listo))
  let ultimo = 0
  const pendientes = new Map()
  ws.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(evento.data)
    pendientes.get(mensaje.id)?.(mensaje)
    pendientes.delete(mensaje.id)
  })
  const enviar = (method, params = {}) =>
    new Promise((listo) => {
      const id = ++ultimo
      pendientes.set(id, listo)
      ws.send(JSON.stringify({ id, method, params }))
    })

  for (const { archivo, tamano, ocupa } of ICONOS) {
    const html = `<!doctype html><html><head><style>
      html, body { margin: 0; width: ${tamano}px; height: ${tamano}px; background: ${CREMA}; overflow: hidden; }
      body { display: grid; place-items: center; }
      svg { width: ${Math.round(tamano * ocupa)}px; height: auto; }
    </style></head><body>${svg}</body></html>`
    const pagina = join(carpeta, `${archivo}.html`)
    writeFileSync(pagina, html)
    await enviar('Emulation.setDeviceMetricsOverride', { width: tamano, height: tamano, deviceScaleFactor: 1, mobile: false })
    await enviar('Page.navigate', { url: `file:///${pagina.replace(/\\/g, '/')}` })
    await esperar(500)
    const foto = await enviar('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: tamano, height: tamano, scale: 1 } })
    writeFileSync(join(RAIZ, 'public', archivo), Buffer.from(foto.result.data, 'base64'))
    console.log(`public/${archivo} (${tamano} × ${tamano})`)
  }
  ws.close()
} finally {
  chrome.kill()
  await esperar(500)
  // Chrome puede tardar en soltar sus archivos: si no se puede borrar, queda en la carpeta temporal.
  try {
    rmSync(carpeta, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
  } catch {}
}
