import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile('public/icono.svg', 'utf8')
const tamanos = [
  ['public/pwa-192x192.png', 192, 0],
  ['public/pwa-512x512.png', 512, 0],
  ['public/maskable-icon-512x512.png', 512, 0.1],
  ['public/apple-touch-icon-180x180.png', 180, 0.1],
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [archivo, lado, margen] of tamanos) {
  await page.setViewportSize({ width: lado, height: lado })
  const interior = svg.replace('rx="96"', margen ? 'rx="0"' : 'rx="96"')
  const escala = 1 - margen * 2
  await page.setContent(`<html><body style="margin:0;background:${margen ? "#0b4f9e" : "transparent"}"><div style="width:${lado}px;height:${lado}px;display:grid;place-items:center">${interior.replace('<svg ', `<svg width="${lado * escala}" height="${lado * escala}" `)}</div></body></html>`)
  await page.screenshot({ path: archivo, omitBackground: margen === 0 })
}
await browser.close()
