/**
 * I moduli dichiarati con <link rel="modulepreload"> in index.html devono
 * essere esattamente quelli che main.js importa staticamente, a ogni livello.
 *
 * Senza la dichiarazione il browser scopre gli import uno strato alla volta:
 * quattro giri di rete prima che il motore parta. Un modulo nuovo non
 * dichiarato funziona lo stesso, arriva solo piu' tardi; uno dichiarato e non
 * piu' usato si scarica per niente. Uso: node tools/check-modulepreload.mjs
 * (con --scrivi riscrive l'elenco in index.html).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'assets/js');
const HTML = path.join(ROOT, 'index.html');

const grafo = [];
const visti = new Set();
(function visita(f) {
  if (visti.has(f)) return;
  visti.add(f);
  const s = fs.readFileSync(path.join(JS, f), 'utf8');
  for (const m of s.matchAll(/^import[^'"]*from\s+['"]\.\/([^'"]+)['"]/gm)) visita(m[1]);
  grafo.push(f);
})('main.js');

const html = fs.readFileSync(HTML, 'utf8');
const dichiarati = [...html.matchAll(/<link rel="modulepreload" href="assets\/js\/([^"]+)">/g)].map((m) => m[1]);
const mancano = grafo.filter((f) => !dichiarati.includes(f));
const inPiu = dichiarati.filter((f) => !grafo.includes(f));

if (process.argv.includes('--scrivi')) {
  const righe = grafo.map((f) => `<link rel="modulepreload" href="assets/js/${f}">`).join('\n');
  const nuovo = html.replace(/(<!-- modulepreload:inizio -->)[\s\S]*?(<!-- modulepreload:fine -->)/, `$1\n${righe}\n$2`);
  if (nuovo === html && (mancano.length || inPiu.length)) throw new Error('segnaposto modulepreload non trovati in index.html');
  fs.writeFileSync(HTML, nuovo);
  console.log(`index.html: ${grafo.length} moduli dichiarati.`);
} else if (mancano.length || inPiu.length) {
  if (mancano.length) console.log('da dichiarare:', mancano.join(', '));
  if (inPiu.length) console.log('dichiarati ma non importati:', inPiu.join(', '));
  console.log('\nnode tools/check-modulepreload.mjs --scrivi   per sistemare');
  process.exitCode = 1;
} else {
  console.log(`${grafo.length} moduli, elenco allineato.`);
}
