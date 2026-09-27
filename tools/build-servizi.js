#!/usr/bin/env node
// Genera assets/js/servizi-data.js da menu_servizi.txt, il file consegnato dal
// committente. Il sito non legge il .txt a runtime: cosi' un errore di
// formattazione si vede qui, al momento della generazione, e non in pagina.
//
//   npm run servizi
//
// Il file non ha marcatori: categorie e servizi sono righe come le altre. Le
// distingue la scrittura del committente, che nei titoli di categoria mette la
// maiuscola a ogni parola piena ("Pneumatici e Assetto") e nei servizi solo alla
// prima ("Riparazione forature"). Lo script stampa l'albero che ha ricavato:
// va letto, perche' e' l'unico controllo che la regola abbia funzionato.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'menu_servizi.txt');
const OUT = path.join(ROOT, 'assets', 'js', 'servizi-data.js');

/** Titolo di categoria: nessuna parentesi, e ogni parola di almeno quattro
 *  lettere comincia con la maiuscola (almeno due parole cosi'). */
function isCategoria(riga) {
  if (/[()]/.test(riga)) return false;
  const piene = riga.split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 4);
  return piene.length >= 2 && piene.every((w) => /^\p{Lu}/u.test(w));
}

/** Separa il nome del servizio dal dettaglio fra parentesi finale. Le sigle
 *  brevi senza spazi — (OBD), (MCTC), (DPF/FAP) — restano nel nome, perche' ne
 *  fanno parte; un elenco vero diventa la riga di dettaglio. */
function servizio(riga) {
  const m = riga.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!m || !/\s/.test(m[2])) return { nome: riga };
  const det = m[2].trim();
  return { nome: m[1].trim(), dettaglio: det.charAt(0).toUpperCase() + det.slice(1) };
}

const righe = fs.readFileSync(SRC, 'utf8').replace(/^﻿/, '')
  .split(/\r?\n/).map((r) => r.trim()).filter(Boolean);

const categorie = [];
for (const riga of righe) {
  if (isCategoria(riga)) {
    categorie.push({ titolo: riga, servizi: [] });
  } else {
    if (!categorie.length) {
      console.error(`Errore: il file comincia con un servizio e non con una categoria:\n  "${riga}"`);
      process.exit(1);
    }
    categorie.at(-1).servizi.push(servizio(riga));
  }
}

const vuote = categorie.filter((c) => !c.servizi.length);
if (vuote.length) {
  console.error('Errore: categorie senza servizi (forse un servizio scambiato per categoria?):');
  vuote.forEach((c) => console.error('  - ' + c.titolo));
  process.exit(1);
}

const js = `// FILE GENERATO da tools/build-servizi.js a partire da menu_servizi.txt.
// Non modificarlo a mano: si cambia il .txt e si rigenera con \`npm run servizi\`.
export const SERVIZI = ${JSON.stringify(categorie, null, 2)};
`;
fs.writeFileSync(OUT, js);

for (const c of categorie) {
  console.log(`${c.titolo}  (${c.servizi.length})`);
  for (const s of c.servizi) console.log(`   · ${s.nome}${s.dettaglio ? '  — ' + s.dettaglio : ''}`);
}
const tot = categorie.reduce((n, c) => n + c.servizi.length, 0);
console.log(`\n${categorie.length} categorie, ${tot} servizi → ${path.relative(ROOT, OUT)}`);
