/**
 * Risolve i parametri del titolo gigante del blocco 2.
 *
 * Il testo esce dal bordo sinistro e da quello inferiore, quindi altezza e
 * larghezza complessive non si possono misurare: l'unica cosa osservabile sono
 * le posizioni orizzontali dei glifi. Si cercano allora peso, dimensione,
 * spaziatura e ascissa che riproducono quelle posizioni, calcolandole con
 * measureText sui prefissi della stringa (nessuno screenshot, nessuna stima).
 *
 * Misure sul mockup 2 (bordo sinistro dell'inchiostro, in pixel dell'immagine),
 * prese nella fascia y 955..1055: piu' in alto passa l'ombra dell'auto, che
 * altrimenti si attacca ai glifi e ne falsa la larghezza (un '1' risultava largo
 * 128 px invece di 51).
 *   '1' 341   '1' 591   'P' 870   'o' 1135   'r' 1394   's' 1547   'c' 1768
 */
import { launch, BASE } from './browser.js';

const TEXT = '911 Porsche';
// indice del glifo -> ascissa misurata sul mockup
// Si adattano solo le LETTERE. Le cifre del mockup hanno una bandierina del '1'
// molto piu' lunga di quella di Albert Sans: la loro forma non e' riproducibile
// con i due caratteri ammessi, e includerle nel sistema guasterebbe anche la
// parola. La spaziatura del gruppo "911" viene poi calcolata a parte perche'
// l'ingombro complessivo torni (vedi REPORT.md).
const TARGET = { 4: 870, 5: 1135, 6: 1394, 7: 1547, 8: 1768 };
// posizione attesa del gruppo delle cifre: bandierina del primo '1' e del secondo
const DIGITS = { first: 264, second: 514 };
const S_MOCKUP = 1.30988;     // unita' di design per pixel del mockup 2

const browser = await launch({ width: 400, height: 300 });
const page = await browser.newPage();
await page.goto(BASE + '/?scene=0&noIntro=1&capture=bg', { waitUntil: 'load' });
await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 20000 });

const best = await page.evaluate(({ TEXT, TARGET }) => {
  const c = document.createElement('canvas').getContext('2d');
  const REF = 400;

  /** Ascissa del bordo sinistro dell'inchiostro di ogni glifo, a dimensione REF
   *  e spaziatura nulla, piu' il contributo per unita' di spaziatura. */
  function metrics(weight) {
    c.letterSpacing = '0px';
    c.font = `${weight} ${REF}px "Albert Sans"`;
    const lefts = [];
    for (let i = 0; i < TEXT.length; i += 1) {
      const prefix = TEXT.slice(0, i);
      const advance = prefix ? c.measureText(prefix).width : 0;
      const m = c.measureText(TEXT[i]);
      lefts.push((advance - m.actualBoundingBoxLeft) / REF);   // in em
    }
    return lefts;
  }

  let best = null;
  for (let weight = 300; weight <= 900; weight += 25) {
    const lefts = metrics(weight);
    for (let fs = 200; fs <= 700; fs += 2) {
      // Con spaziatura l, il glifo i si sposta di i*l. Con due incognite (x0 e l)
      // e cinque osservazioni si risolve ai minimi quadrati.
      const idx = Object.keys(TARGET).map(Number);
      // modello: target_i = x0 + lefts[i]*fs + i*l
      let Sxx = 0, Sxy = 0, Sx = 0, Sy = 0, n = 0;
      for (const i of idx) {
        const base = lefts[i] * fs;
        const y = TARGET[i] - base;      // = x0 + i*l
        Sx += i; Sy += y; Sxx += i * i; Sxy += i * y; n += 1;
      }
      const det = n * Sxx - Sx * Sx;
      const l = (n * Sxy - Sx * Sy) / det;
      const x0 = (Sy * Sxx - Sx * Sxy) / det;
      let sse = 0;
      for (const i of idx) {
        const pred = x0 + lefts[i] * fs + i * l;
        sse += (pred - TARGET[i]) ** 2;
      }
      const rms = Math.sqrt(sse / idx.length);
      if (!best || rms < best.rms) best = { weight, fs, ls: l, x0, rms };
    }
  }
  const lefts = metrics(best.weight);
  best.predicted = Object.keys(TARGET).map(Number)
    .map((i) => ({ i, glyph: TEXT[i], target: TARGET[i],
      got: Math.round(best.x0 + lefts[i] * best.fs + i * best.ls) }));
  return best;
}, { TEXT, TARGET });

await browser.close();

console.log(`peso ${best.weight}   font-size ${best.fs} px mockup   letter-spacing ${best.ls.toFixed(1)} px   scarto quadratico medio ${best.rms.toFixed(1)} px`);
for (const p of best.predicted) {
  console.log(`   '${p.glyph}'  atteso ${String(p.target).padStart(5)}  ottenuto ${String(p.got).padStart(5)}  (${p.got - p.target >= 0 ? '+' : ''}${p.got - p.target})`);
}
console.log('\nin unita’ di design:');
console.log(`   --b2-giant-fs: ${(best.fs / S_MOCKUP).toFixed(2)}`);
console.log(`   --b2-giant-ls: ${(best.ls / S_MOCKUP).toFixed(2)}`);
console.log(`   --b2-giant-w:  ${best.weight}`);
console.log(`   bordo sinistro del testo: ${((best.x0 - 8.89) / S_MOCKUP).toFixed(2)} (x0 = ${best.x0.toFixed(1)} px)`);

// Spaziatura del gruppo "911": la distanza fra i due '1' nel mockup e' nota, e
// con l'avanzamento naturale del carattere resta una sola incognita.
const digits = await (async () => {
  const b2 = await launch({ width: 300, height: 200 });
  const pg = await b2.newPage();
  await pg.goto(BASE + '/?scene=0&noIntro=1&capture=bg', { waitUntil: 'load' });
  await pg.waitForFunction(() => document.fonts.status === 'loaded');
  const adv = await pg.evaluate((w) => {
    const c = document.createElement('canvas').getContext('2d');
    c.letterSpacing = '0px';
    c.font = `${w} 400px "Albert Sans"`;
    return (c.measureText('11').width - c.measureText('1').width) / 400;
  }, best.weight);
  await b2.close();
  return adv;
})();
const need = DIGITS.second - DIGITS.first;          // px fra i due '1'
const lsDigits = need - digits * best.fs;
console.log(`
   avanzamento naturale del '1': ${(digits * best.fs).toFixed(1)} px, nel mockup ${need} px`);
console.log(`   --b2-giant-num-ls: ${(lsDigits / S_MOCKUP).toFixed(2)}  (spaziatura del solo gruppo 911)`);
