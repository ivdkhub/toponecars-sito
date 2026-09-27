/**
 * Verifica del dizionario (assets/js/i18n-testi.js), senza browser.
 *
 * Raccoglie le frasi italiane che il sito mostra e controlla che ciascuna
 * abbia la traduzione inglese e ucraina:
 *  - le frasi letterali passate a t() e tn() negli script (anche nei rami di
 *    un'espressione condizionale);
 *  - i dati tradotti a video: catalogo dei servizi, titoli dei video,
 *    recensioni, etichette e testi di config.js, valori del parco auto;
 *  - i testi e gli attributi aria-label, title, placeholder di index.html.
 * Controlla inoltre che le traduzioni mantengano gli stessi {segnaposto}.
 *
 *   node tools/i18n-check.mjs        (esce con 1 se manca qualcosa)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const JS = path.join(ROOT, 'assets/js');
const imp = (f) => import(pathToFileURL(path.join(JS, f)).href);

const { TESTI } = await imp('i18n-testi.js');
const usate = new Map(); // frase -> dove
const usa = (frase, dove) => {
  if (typeof frase !== 'string') return;
  const f = frase.replace(/\s+/g, (s) => (s.includes('\n') && !frase.startsWith(' ') ? s : ' ')).trim();
  if (f && /[A-Za-zÀ-ÿ]/.test(f)) usate.set(f, usate.get(f) || dove);
};

/* ------------------------------------------------ chiamate t() e tn() */

/** Contenuto fra parentesi bilanciate a partire da `i` (subito dopo "("). */
function argomenti(src, i) {
  let prof = 1;
  let j = i;
  let q = null;
  for (; j < src.length && prof; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') q = c;
    else if (c === '(') prof++;
    else if (c === ')') prof--;
  }
  return src.slice(i, j - 1);
}

/** Le stringhe letterali fuori da {…} e […]: argomenti e rami condizionali. */
function letterali(arg) {
  const out = [];
  let prof = 0;
  for (let i = 0; i < arg.length; i++) {
    const c = arg[i];
    if (c === '\'' || c === '"') {
      let j = i + 1;
      let s = '';
      for (; j < arg.length && arg[j] !== c; j++) {
        if (arg[j] === '\\') { j++; s += arg[j] === 'n' ? '\n' : arg[j]; } else s += arg[j];
      }
      if (prof === 0) out.push(s);
      i = j;
    } else if ('{['.includes(c)) prof++;
    else if ('}]'.includes(c)) prof--;
  }
  return out;
}

for (const f of fs.readdirSync(JS).filter((x) => x.endsWith('.js') && !x.startsWith('i18n'))) {
  const src = fs.readFileSync(path.join(JS, f), 'utf8');
  for (const m of src.matchAll(/\b(tn?|this\.errore)\(/g)) {
    const arg = argomenti(src, m.index + m[0].length);
    const riga = src.slice(0, m.index).split('\n').length;
    const lett = letterali(arg);
    // tn(n, uno, molti): la chiave e' la forma plurale. this.errore(campo,
    // frase) nella prenotazione: il primo e' il nome del campo.
    const frasi = m[1] === 'tn' ? lett.slice(-1)
      : m[1] === 'this.errore' && /^'\w+', /.test(arg) ? lett.slice(1) : lett;
    frasi.forEach((s) => usa(s, `${f}:${riga}`));
  }
  // Frasi passate a chi le traduce dopo: errori della prenotazione e dell'accesso,
  // etichette dei moduli, titoli dei passi.
  for (const m of src.matchAll(/(?:errori\.\w+ = |campo\(|scelta\()'([^']+)'/g)) {
    usa(m[1], `${f}:${src.slice(0, m.index).split('\n').length}`);
  }
  for (const m of src.matchAll(/const (TITOLI|STATI_PREN|STATI_AUTO|CATEGORIE_AUTO|ALIMENTAZIONI) = ([\[{][^\]}]*[\]}])/g)) {
    letterali(m[2].slice(1, -1)).forEach((s) => usa(s, `${f} ${m[1]}`));
  }
  for (const m of src.matchAll(/this\.etichette = \{([^}]*)\}/g)) letterali(m[1]).forEach((s) => usa(s, `${f} etichette`));
  for (const m of src.matchAll(/scelta\('\w+', '\w+', \[([^\]]*)\]/g)) letterali(m[1]).forEach((s) => usa(s, `${f} scelta`));
}

/* ---------------------------------------------------------------- dati */

const { SERVIZI } = await imp('servizi-data.js');
for (const c of SERVIZI) {
  usa(c.titolo, 'servizi-data.js');
  for (const s of c.servizi) { usa(s.nome, 'servizi-data.js'); usa(s.dettaglio, 'servizi-data.js'); }
}
const { VIDEO_CONTENUTI } = await imp('contenuti-data.js');
VIDEO_CONTENUTI.forEach((v) => usa(v.titolo, 'contenuti-data.js'));
const { RECENSIONI } = await imp('recensioni-data.js');
RECENSIONI.forEach((r) => { usa(r.quando, 'recensioni-data.js'); usa(r.testo, 'recensioni-data.js'); });
const { CONFIG } = await imp('config.js');
usa(CONFIG.variants.paint.baseLabel, 'config.js');
CONFIG.variants.paint.options.forEach((o) => usa(o.label, 'config.js'));
usa(CONFIG.contenuti.didascalia, 'config.js');
usa(CONFIG.contenuti.audio, 'config.js');

/* ---------------------------------------------------------------- HTML */

// Nomi propri, sigle e simboli che restano uguali in ogni lingua.
const INVARIATI = new Set(['Top One Cars', 'N', 'Italiano', 'English', 'Українська',
  'SS 9 Via Emilia, 312, 20070 Vizzolo Predabissi MI', 'SS 9 Via Emilia, 312 · 20070 Vizzolo Predabissi (MI)',
  '911', 'Porsche', 'L', 'M', 'G', 'V', 'S', 'D']);

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/g, '')
  .replace(/<svg[\s\S]*?<\/svg>/g, '');
const decodifica = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
// Paragrafi a righe: una frase sola, righe unite da \n.
html = html.replace(/<(\w+)([^>]*data-i18n-righe[^>]*)>([\s\S]*?)<\/\1>/g, (_, tag, attr, corpo) => {
  const righe = corpo.split(/<br\s*\/?>/).map((r) => decodifica(r.replace(/\s+/g, ' ').trim())).filter(Boolean);
  usa(righe.join('\n'), 'index.html (righe)');
  return `<${tag}${attr}></${tag}>`;
});
for (const m of html.matchAll(/>([^<]+)</g)) {
  const s = decodifica(m[1].replace(/\s+/g, ' ').trim());
  if (s && !INVARIATI.has(s) && /[A-Za-zÀ-ÿ]/.test(s)) usa(s, 'index.html');
}
for (const m of html.matchAll(/\s(?:aria-label|title|placeholder)="([^"]*)"/g)) {
  const s = decodifica(m[1]);
  if (!INVARIATI.has(s)) usa(s, 'index.html (attributo)');
}
const titolo = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<title>([^<]*)<\/title>/);
if (titolo) usa(decodifica(titolo[1]), 'index.html <title>');
const desc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<meta name="description" content="([^"]*)"/);
if (desc) usa(decodifica(desc[1]), 'index.html description');

/* ------------------------------------------------------------ verifica */

const segnaposto = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const forme = (v) => (v && typeof v === 'object' ? Object.values(v) : [v]);
let problemi = 0;
for (const [frase, dove] of usate) {
  const riga = TESTI[frase];
  if (!riga) { console.log(`manca      ${JSON.stringify(frase)}  (${dove})`); problemi++; continue; }
  ['en', 'uk'].forEach((l, i) => {
    const v = riga[i];
    if (v === undefined || v === null || v === '') { console.log(`manca ${l}   ${JSON.stringify(frase)}`); problemi++; return; }
    for (const forma of forme(v)) {
      if (segnaposto(forma) !== segnaposto(frase)) {
        console.log(`segnaposto ${l}: ${JSON.stringify(frase)} -> ${JSON.stringify(forma)}`);
        problemi++;
      }
    }
  });
}
const inutili = Object.keys(TESTI).filter((k) => !usate.has(k));
if (inutili.length) console.log(`\n(nel dizionario ma non trovate nei sorgenti: ${inutili.map((k) => JSON.stringify(k)).join(', ')})`);
console.log(`\n${usate.size} frasi controllate, ${problemi} problemi.`);
process.exit(problemi ? 1 : 0);
