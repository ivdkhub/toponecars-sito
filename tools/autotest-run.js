/**
 * Esegue tests/autotest.html in Chrome e riporta l'esito sul terminale.
 *
 * La pagina di test e' la stessa che si puo' aprire a mano nel browser: qui
 * viene solo pilotata e letta. Chrome parte con le impostazioni normali, senza
 * flag sull'autoplay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from './browser.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'autotest-report.json');
const SHOT = path.join(HERE, 'autotest-report.png');

const browser = await launch({ width: 1500, height: 900 });
const page = await browser.newPage();

page.on('pageerror', (e) => console.error('  [errore pagina]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('  [console]', m.text());
});

await page.goto(BASE + '/tests/autotest.html', { waitUntil: 'load' });
await page.waitForFunction(() => window.__DONE__ === true, { timeout: 5 * 60 * 1000, polling: 500 });

const results = await page.evaluate(() => window.__RESULTS__);
await page.screenshot({ path: SHOT, fullPage: true });
await browser.close();

fs.writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');

let failed = 0;
let checks = 0;
for (const [i, r] of results.entries()) {
  const bad = r.checks.filter((c) => !c.ok);
  checks += r.checks.length;
  const ko = r.error || bad.length;
  if (ko) failed += 1;
  console.log(`${ko ? 'FALLITO' : '     ok'}  ${String(i + 1).padStart(2)}. ${r.name}`);
  if (r.error) console.log('          ' + String(r.error).split('\n')[0]);
  for (const c of r.checks) {
    if (!c.ok) console.log(`          ! ${c.label} — ${c.detail}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} scenari superati, ${checks} verifiche.`);
console.log('dettaglio: tools/autotest-report.json e tools/autotest-report.png');
process.exit(failed ? 1 : 0);
