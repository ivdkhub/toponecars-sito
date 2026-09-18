/**
 * Cattura gli scatti che servono al confronto al pixel.
 *
 * Per ogni blocco si fotografa due volte la stessa scena, con la stessa
 * inquadratura: una volta con la sola immagine video e una volta con la UI
 * sopra. La differenza fra i due scatti e' l'inchiostro della UI, ottenuto con
 * la stessa identica operazione che si applica al mockup (mockup meno sfondo
 * ricostruito). E' l'unico modo di confrontare testo sovrapposto a un fotogramma
 * senza che lo sfondo inquini la misura.
 *
 * La finestra ha esattamente le dimensioni del mockup corrispondente, cosi' il
 * confronto avviene 1:1 senza alcun ricampionamento. Con --scale 2 si producono
 * in piu' gli scatti @2x per l'ispezione visiva.
 *
 * Chrome parte con le impostazioni NORMALI: nessun flag sull'autoplay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from './browser.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots');

/** Ogni blocco si confronta con il proprio mockup, alla risoluzione di quel
 *  mockup: le tre immagini hanno altezze leggermente diverse e quindi un --s
 *  leggermente diverso. */
export const TARGETS = [
  { block: 1, scene: 1, mockup: '1.png', width: 1903, height: 1066 },
  { block: 2, scene: 2, mockup: '2.png', width: 1904, height: 1061 },
  { block: 3, scene: 3, mockup: '3.png', width: 1903, height: 1062 },
];

/** specimen -> selettore, per ricavare dal DOM la regione da misurare. */
const SELECTORS = {
  'menu.servizi': '.menu__link:nth-of-type(1)',
  'menu.contenuti': '.menu__link:nth-of-type(2)',
  'menu.recensioni': '.menu__link:nth-of-type(3)',
  'menu.vieni': '.menu__btn--light',
  'menu.testdrive': '.menu__btn--ghost',
  'b1.title1': '.b1__title-line:nth-child(1)',
  'b1.title2': '.b1__title-line:nth-child(2)',
  'b1.value1': '.b1__card:nth-child(1) .b1__card-value',
  'b1.label1': '.b1__card:nth-child(1) .b1__card-label',
  'b1.value2': '.b1__card:nth-child(2) .b1__card-value',
  'b1.label2': '.b1__card:nth-child(2) .b1__card-label',
  'b1.value3': '.b1__card:nth-child(3) .b1__card-value',
  'b1.label3': '.b1__card:nth-child(3) .b1__card-label',
  'b2.line1': '.b2__line:nth-child(1)',
  'b2.line2': '.b2__line:nth-child(2)',
  'b2.line3': '.b2__line:nth-child(3)',
  'b2.giant': '.b2__giant',
  'b3.cerchio': '.b3__note--cerchio',
  'b3.pneumatico': '.b3__note--pneumatico',
  'b3.pinza': '.b3__note--pinza',
  'b3.disco': '.b3__note--disco',
  'b3.campana': '.b3__note--campana',
  'card1': '.b1__card:nth-child(1)',
  'card2': '.b1__card:nth-child(2)',
  'card3': '.b1__card:nth-child(3)',
  'menu': '.menu',
  'logo': '.chrome__logo',
};

const scaleArg = Number((process.argv.find((a) => a.startsWith('--scale=')) || '').split('=')[1]) || 1;

fs.mkdirSync(SHOTS, { recursive: true });

for (const t of TARGETS) {
  const suffix = scaleArg === 1 ? '' : `@${scaleArg}x`;

  // Due caricamenti distinti, non un interruttore a pagina aperta: cosi' lo
  // scatto non dipende da quando il compositore applica il cambio di stile.
  for (const [kind, extra] of [['ui', ''], ['bg', '&capture=bg']]) {
    const browser = await launch({ width: t.width, height: t.height, scale: scaleArg });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('  [errore pagina]', e.message));

    // mediaDir esplicito: il confronto al pixel deve leggere sempre il materiale
    // a qualita' piena, qualunque codifica il browser di turno preferirebbe.
    await page.goto(`${BASE}/?scene=${t.scene}&mediaDir=av1${extra}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__TOC__ && window.__TOC__.introDone, { timeout: 30000 });
    await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 15000 });
    // L'entrata dei blocchi e' scaglionata: si aspetta che sia tutta finita,
    // altrimenti si fotograferebbe un fotogramma intermedio dell'animazione.
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1800)));

    // Se la pagina ha mostrato la schermata di errore lo scatto non vale nulla:
    // meglio fermarsi che misurare un'immagine sbagliata.
    const failed = await page.evaluate(() => {
      const el = document.getElementById('failure');
      return el.hidden ? null : el.querySelector('[data-failure-title]').textContent;
    });
    if (failed) {
      await browser.close();
      throw new Error(`blocco ${t.block} (${kind}): la pagina ha mostrato "${failed}"`);
    }

    await page.screenshot({ path: path.join(SHOTS, `${kind}-${t.block}${suffix}.png`) });

    if (kind === 'ui') {
      // I riquadri degli elementi diventano le regioni di misura del rendering.
      const rects = await page.evaluate((map) => {
        const out = {};
        for (const [id, sel] of Object.entries(map)) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          out[id] = { x: r.x, y: r.y, w: r.width, h: r.height };
        }
        return out;
      }, SELECTORS);
      fs.writeFileSync(path.join(SHOTS, `rects-${t.block}.json`),
        JSON.stringify(rects, null, 2), 'utf8');

      const info = await page.evaluate(() => ({
        scene: document.documentElement.dataset.scene,
        dpr: window.devicePixelRatio,
        clip: (() => {
          const v = [...document.querySelectorAll('.stage video')].find((x) => x.style.opacity === '1');
          return v ? `${v.dataset.clip} (${v.dataset.file}) t=${v.currentTime.toFixed(3)}` : 'nessuna';
        })(),
      }));
      console.log(`blocco ${t.block}: ${t.width}x${t.height}@${scaleArg}x  scena ${info.scene}  clip ${info.clip}`);
    }
    await browser.close();
  }
}

console.log('scatti in tools/shots/');
