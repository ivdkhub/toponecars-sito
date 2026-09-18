/**
 * Verifica che con prefers-reduced-motion resti SOLO la dissolvenza: niente
 * spostamento, niente sfocatura, niente scaglionamento.
 */
import { launch, BASE } from './browser.js';

const browser = await launch({ width: 1440, height: 810 });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto(BASE + '/?scene=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__TOC__ && window.__TOC__.introDone, { timeout: 30000 });
await page.evaluate(() => new Promise((r) => setTimeout(r, 1200)));

const res = await page.evaluate(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = document.querySelector('.b1__title-line');
  const snap = (e) => {
    const c = getComputedStyle(e);
    // copia immediata: getComputedStyle restituisce un oggetto vivo, riletto
    // dopo l'attesa mostrerebbe lo stato sbagliato
    return { transform: c.transform, filter: c.filter, opacity: c.opacity,
             delay: c.transitionDelay, prop: c.transitionProperty };
  };
  const visibile = snap(el);
  const block = document.getElementById('block-1');
  // stato nascosto: si rilegge la regola di partenza mettendo il blocco a false
  block.dataset.visible = 'false';
  await wait(900);                 // la dissolvenza deve avere il tempo di finire
  const hidden = snap(el);
  const out = {
    ridotto: matchMedia('(prefers-reduced-motion: reduce)').matches,
    visibile,
    nascosto: hidden,
  };
  block.dataset.visible = 'true';
  return out;
});
await browser.close();

const ok = res.ridotto
  && res.nascosto.transform === 'none'
  && res.nascosto.filter === 'none'
  && res.nascosto.opacity === '0'
  && res.nascosto.delay === '0s'
  && res.nascosto.prop === 'opacity'
  && res.visibile.opacity === '1';
console.log(JSON.stringify(res, null, 1));
console.log(ok ? '\nok: resta solo la dissolvenza' : '\nFALLITO: qualcosa oltre la dissolvenza e\u2019 rimasto attivo');
process.exit(ok ? 0 : 1);
