/**
 * Scatti del sito sul telefono: pagina intera, menu, foglio dei servizi con la
 * prenotazione, area amministratore con ogni pagina di gestione. Segnala gli
 * errori in console e ogni elemento piu' largo dello schermo.
 *
 *   node tools/mobile-shoot.mjs [cartella]      (server acceso: node tools/serve.js)
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from './browser.js';

const OUT = process.argv[2] || 'tools/mobile-shots';
fs.mkdirSync(OUT, { recursive: true });
const W = 390;
const H = 844;

const browser = await launch({ width: W, height: H, scale: 2 });
const page = await browser.newPage();
await page.emulate({
  viewport: { width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const errori = [];
page.on('pageerror', (e) => errori.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()); });

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const scatta = async (nome, intera = false) => {
  await pausa(700);
  await page.screenshot({ path: path.join(OUT, `${nome}.png`), fullPage: intera });
};
const larghi = () => page.evaluate((w) => [...document.querySelectorAll('body *')]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > w + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.nl__view, .svc__tabs, .lg, [hidden]'); })
  .slice(0, 12).map((e) => `${e.tagName.toLowerCase()}.${e.className} → ${Math.round(e.getBoundingClientRect().right)}`), W);

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__TOC__ && window.__TOC__.mobile);
console.log('video nella pagina:', await page.evaluate(() => document.querySelectorAll('.stage video').length));
await scatta('01-inizio');
await page.evaluate(() => { for (let y = 0; y < document.body.scrollHeight; y += 400) window.scrollTo(0, y); window.scrollTo(0, 0); });
await pausa(1500);
await scatta('02-pagina-intera', true);
console.log('troppo larghi (pagina):', await larghi());

await page.click('.m-burger');
await scatta('03-menu');
await page.click('.m-burger');

await page.evaluate(() => document.querySelector('[data-svc-open]').click());
await scatta('04-servizi');
await page.evaluate(() => { document.querySelectorAll('.svc__pick')[0].click(); document.querySelectorAll('.svc__pick')[2].click(); });
await scatta('05-servizi-scelti');
await page.evaluate(() => { const b = document.querySelector('.m-sheet__go'); if (b.hidden) document.querySelector('[data-bk]').scrollIntoView(); else b.click(); });
await pausa(600);
const giorno = await page.$('.cal__day:not(:disabled):not([data-out="true"])');
await giorno.click();
await pausa(300);
const slot = await page.$('.bk__slot');
if (slot) await slot.click();
await scatta('06-calendario');
await page.evaluate(() => document.querySelector('[data-bk-next]').click());
await pausa(400);
await page.evaluate(() => document.querySelector('[data-bk-form]').scrollIntoView());
await scatta('07-modulo');
await page.type('[name="nome"]', 'Mario Rossi');
await page.type('[name="telefono"]', '3331234567');
await page.type('[name="auto"]', 'Fiat Panda AB123CD');
await page.evaluate(() => { document.querySelector('[name="privacy"]').checked = true; document.querySelector('[data-bk-send]').click(); });
await pausa(500);
await scatta('08-inviata');
await page.evaluate(() => document.querySelector('[data-svc-close]').click());
await pausa(500);

await page.click('[data-lamp]');
await scatta('09-admin-accesso');
await page.evaluate(() => document.querySelector('[data-adm-demo-fill]').click());
await page.evaluate(() => document.querySelector('[data-adm-send]').click());
await pausa(800);
await scatta('10-admin-dentro');
for (const p of ['servizi', 'prenotazioni', 'flotta', 'orari', 'preventivo']) {
  await page.click('.m-burger');
  await pausa(300);
  await page.click(`[data-admin-item="${p}"]`);
  await pausa(700);
  if (p === 'prenotazioni') await page.evaluate(() => { const b = document.querySelector('.admp__expand'); if (b) b.click(); });
  await scatta(`11-admin-${p}`, true);
  console.log(`troppo larghi (${p}):`, await larghi());
}
await page.click('[data-lamp]');
await pausa(600);
await scatta('12-luce-riaccesa');

console.log('errori:', errori);
await browser.close();
