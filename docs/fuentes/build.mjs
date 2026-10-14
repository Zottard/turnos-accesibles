// Inlines brand SVGs into the HTML sources and renders PDFs with headless Chrome.
// Markers:  <!--SVG:name-->            full <svg> (optional :class)  e.g. <!--SVG:logo:big-->
//           <!--SVGINNER:name-->       inner content only (for wrapping in a construction svg)
import fs, { readFileSync, writeFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Run from anywhere: `node docs/fuentes/build.mjs` (needs Google Chrome installed).
const here = dirname(fileURLToPath(import.meta.url));
const marca = join(here, '..', 'marca');
const salida = join(here, '..');
const temporal = join(here, '.salida');
fs.mkdirSync(temporal, { recursive: true });
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const svgs = {};
for (const n of ['logo', 'icono', 'karma-tech', 'karma-tech-icono']) {
  svgs[n] = readFileSync(join(marca, n + '.svg'), 'utf8').trim();
}
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const jobs = [
  ['manual.src.html', 'Karma Tech - Guía de marca'],
  ['requerimientos.src.html', 'Turnos Accesibles - Especificación de Requerimientos'],
];
const only = process.argv[2];
for (const [src, name] of jobs) {
  if (only && !src.startsWith(only)) continue;
  let html = readFileSync(join(here, src), 'utf8');
  html = html.replace(/__DATAURISMALL:([\w-]+)__/g, (_, n) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svgs[n].replace('<svg ', '<svg width="13" height="13" ')));
  html = html.replace(/__DATAURI:([\w-]+)__/g, (_, n) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svgs[n]));
  html = html.replace(/<!--SVGINNER:([\w-]+)-->/g, (_, n) => inner(svgs[n]));
  html = html.replace(/<!--SVG:([\w-]+)(?::([\w -]+))?-->/g, (_, n, cls) =>
    svgs[n].replace('<svg ', `<svg class="brand ${cls || ''}" aria-hidden="true" `).replace(/ role="img" aria-label="[^"]*"/, ''));
  const htmlOut = join(temporal, name + '.html');
  writeFileSync(htmlOut, html);
  const pdfOut = join(salida, name + '.pdf');
  if (existsSync(pdfOut)) rmSync(pdfOut);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=10000',
    `--print-to-pdf=${pdfOut}`, 'file:///' + htmlOut.replace(/ /g, '%20')], { stdio: 'inherit' });
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let last = -1;
  for (let i = 0; i < 120; i++) { sleep(500); if (existsSync(pdfOut)) { const sz = statSync(pdfOut).size; if (sz > 0 && sz === last) break; last = sz; } }
  console.log('ok', pdfOut);
}
