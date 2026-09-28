import { readFileSync } from 'node:fs'

type Tokens = Record<string, string>
type Pair = [fg: string, bg: string, min: number]

const TOKENS_PATH = new URL('../app/assets/css/tokens.css', import.meta.url)

const PAIRS: Pair[] = [
  ['text', 'bg', 7],
  ['text', 'surface', 7],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['primary', 'bg', 4.5],
  ['primary', 'surface', 4.5],
  ['primary-text', 'primary', 4.5],
  ['success', 'bg', 4.5],
  ['warning', 'bg', 4.5],
  ['danger', 'bg', 4.5],
  ['bg', 'success', 4.5],
  ['bg', 'warning', 4.5],
  ['bg', 'danger', 4.5],
  ['border', 'bg', 3],
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
]

function readBlock(css: string, selector: string): Tokens {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No encontré el bloque ${selector}`)
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...block.matchAll(/--c-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const css = readFileSync(TOKENS_PATH, 'utf8')
const base = readBlock(css, ':root')
const themes: Record<string, Tokens> = {
  claro: base,
  'alto-contraste': { ...base, ...readBlock(css, ':root[data-theme="alto-contraste"]') },
}

let failures = 0

for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`\n${theme}`)
  for (const [fg, bg, min] of PAIRS) {
    const value = ratio(tokens[fg], tokens[bg])
    const ok = value >= min
    if (!ok) failures++
    console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${fg} sobre ${bg}: ${value.toFixed(2)}:1 (mínimo ${min}:1)`)
  }
}

if (failures) {
  console.error(`\n${failures} pares no llegan al mínimo.`)
  process.exit(1)
}
console.log('\nTodos los pares cumplen.')
