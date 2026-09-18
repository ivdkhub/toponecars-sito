/**
 * Scatto di una scena qualsiasi, per ispezione a occhio.
 * Uso: node tools/shoot-scene.mjs <indice> [larghezza] [altezza]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from './browser.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const scene = Number(process.argv[2] ?? 0);
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 810);

const browser = await launch({ width, height });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('  [errore pagina]', e.message));
await page.goto(`${BASE}/?scene=${scene}&mediaDir=av1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__TOC__ && window.__TOC__.introDone, { timeout: 30000 });
await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 15000 });
await page.evaluate(() => new Promise((r) => setTimeout(r, 1500)));

const failed = await page.evaluate(() => {
  const el = document.getElementById('failure');
  return el.hidden ? null : el.querySelector('[data-failure-title]').textContent;
});
if (failed) { await browser.close(); throw new Error(`la pagina ha mostrato "${failed}"`); }

const info = await page.evaluate(() => ({
  scene: document.documentElement.dataset.scene,
  id: document.documentElement.dataset.sceneId,
  contatore: document.getElementById('counter').dataset.value,
  blocco: [...document.querySelectorAll('.block')].filter((b) => b.dataset.visible === 'true').map((b) => b.id),
  clip: (() => {
    const v = [...document.querySelectorAll('.stage video')].find((x) => x.style.opacity === '1');
    return v ? `${v.dataset.clip} (${v.dataset.file}) t=${v.currentTime.toFixed(3)}/${v.duration.toFixed(3)}` : 'nessuna';
  })(),
}));
const out = path.join(HERE, 'shots', `scena-${scene}.png`);
await page.screenshot({ path: out });
console.log(`scena ${info.scene} (${info.id})  contatore ${info.contatore}  blocco ${info.blocco.join(',') || 'nessuno'}  ${info.clip}`);
await browser.close();
