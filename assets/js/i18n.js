/**
 * Traduzione del sito: italiano (lingua di partenza), inglese, ucraino.
 *
 * Due strade, ciascuna per il suo tipo di testo:
 *
 *  - Testi scritti dagli script (pannelli, calendario, card, area
 *    amministratore): passano da `t()` e `tn()` nel momento in cui vengono
 *    scritti. Chi li scrive ascolta l'evento `linguachange` su document e si
 *    ridisegna, mantenendo il proprio stato (scelte, passo, pagina aperta).
 *
 *  - Testi scritti nell'HTML: `avviaLingua()` ne fa un'istantanea prima che
 *    gli script tocchino la pagina (nodi di testo e attributi aria-label,
 *    title, placeholder il cui contenuto e' una chiave del dizionario), e a
 *    ogni cambio li riscrive. Un nodo o un attributo che nel frattempo uno
 *    script ha cambiato non e' piu' dell'istantanea: lo gestisce lo script.
 *    I paragrafi spezzati a mano con <br> portano data-i18n-righe e si
 *    traducono per intero, perche' in un'altra lingua le righe cadono altrove.
 *
 * Nessun MutationObserver: tradurre il DOM dopo che uno script l'ha scritto
 * genera nuove mutazioni da tradurre, e la versione precedente di questo file
 * finiva in un ciclo infinito che bloccava la pagina.
 *
 * Le chiavi sono le frasi italiane, con {segnaposto} per i valori variabili:
 * una frase senza traduzione resta in italiano invece di sparire. Il
 * dizionario e' in i18n-testi.js; `node tools/i18n-check.mjs` elenca le chiavi
 * usate dagli script e dall'HTML che non vi compaiono.
 */
import { TESTI } from './i18n-testi.js';

export const LINGUE = ['it', 'en', 'uk'];
const LOCALE = { it: 'it-IT', en: 'en-GB', uk: 'uk-UA' };
const COLONNA = { en: 0, uk: 1 };
const CHIAVE = 'toc-lingua';
const ATTRIBUTI = ['aria-label', 'title', 'placeholder'];

let corrente = 'it';

/** Chiavi chieste e non trovate, per la lingua corrente: servono ai test. */
export const mancanti = new Set();

export const lingua = () => corrente;
export const locale = () => LOCALE[corrente];

const normalizza = (s) => s.replace(/\s+/g, ' ').trim();
const riempi = (s, vars) => (vars
  ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m))
  : s);

/** La voce del dizionario per la lingua corrente, o undefined. */
function voce(chiave) {
  if (corrente === 'it') return undefined;
  const riga = TESTI[chiave];
  const v = riga ? riga[COLONNA[corrente]] : undefined;
  if (v === undefined || v === null) mancanti.add(`${corrente}: ${chiave}`);
  return v ?? undefined;
}

/**
 * Traduce una frase italiana nella lingua corrente.
 * @param {string} testo la frase italiana, chiave del dizionario
 * @param {Record<string, unknown>} [vars] valori per i {segnaposto}
 */
export function t(testo, vars) {
  if (testo === null || testo === undefined || testo === '') return testo;
  const v = voce(testo);
  return riempi(typeof v === 'string' ? v : testo, vars);
}

/**
 * Frase con un numero: sceglie la forma giusta per la lingua (l'ucraino ne ha
 * tre: 1 / 2-4 / 5 e oltre). La chiave e' la forma plurale italiana; nel
 * dizionario la sua voce e' un oggetto { one, few, many, other }.
 * @param {number} n
 * @param {string} uno forma italiana per n = 1
 * @param {string} molti forma italiana per gli altri casi (e' la chiave)
 * @param {Record<string, unknown>} [vars] {n} e' gia' compreso
 */
export function tn(n, uno, molti, vars = {}) {
  const tutti = { n: numero(n), ...vars };
  if (corrente === 'it') return riempi(n === 1 ? uno : molti, tutti);
  const v = voce(molti);
  if (!v) return riempi(n === 1 ? uno : molti, tutti);
  if (typeof v === 'string') return riempi(v, tutti);
  const forma = new Intl.PluralRules(locale()).select(n);
  return riempi(v[forma] ?? v.other ?? v.many ?? Object.values(v)[0], tutti);
}

/* --------------------------------------------------- numeri, date, valute */

export const numero = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString(locale()) : String(n));

/** Importo in euro con il simbolo €, anche dove la lingua scriverebbe "EUR". */
export const euro = (n, decimali = true) => (Number.isFinite(n) ? n : 0).toLocaleString(locale(), {
  style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol',
  ...(decimali ? {} : { maximumFractionDigits: 0 }),
});

export const data = (d, opzioni) => d.toLocaleDateString(locale(), opzioni);

export const maiuscola = (s) => (s ? s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1) : s);

/**
 * Nome del giorno della settimana nella lingua corrente.
 * @param {number} g come Date.getDay(): 0 = domenica
 * @param {'long'|'short'|'narrow'} formato
 */
export function giornoSettimana(g, formato = 'long') {
  // Il 7 gennaio 2024 era una domenica.
  return new Date(2024, 0, 7 + g).toLocaleDateString(locale(), { weekday: formato });
}

/** Nome del mese, al nominativo (per le intestazioni del calendario). */
export function nomeMese(m) {
  return new Date(2024, m, 1).toLocaleDateString(locale(), { month: 'long' });
}

/* ------------------------------------------------------- testi dell'HTML */

/** @type {{nodo: Text, it: string, prima: string, dopo: string, ultimo: string}[]} */
let nodi = [];
/** @type {{el: Element, attr: string, it: string, ultimo: string}[]} */
let attributi = [];
/** @type {{el: Element, it: string, originali: Node[]}[]} */
let paragrafi = [];
let meta = null;

function istantanea() {
  const radice = document.body;
  paragrafi = [...radice.querySelectorAll('[data-i18n-righe]')].map((el) => ({
    el,
    it: [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => normalizza(n.nodeValue)).filter(Boolean).join('\n'),
    originali: [...el.childNodes],
  }));
  const dentroParagrafo = (n) => n.parentElement && n.parentElement.closest('[data-i18n-righe]');

  const walker = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || p.closest('script, style, noscript') || dentroParagrafo(n)) return NodeFilter.FILTER_REJECT;
      return TESTI[normalizza(n.nodeValue)] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  nodi = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = n.nodeValue;
    nodi.push({
      nodo: n, it: normalizza(v), ultimo: v,
      prima: v.match(/^\s*/)[0], dopo: v.match(/\s*$/)[0],
    });
  }

  attributi = [];
  for (const attr of ATTRIBUTI) {
    for (const el of radice.querySelectorAll(`[${attr}]`)) {
      const v = el.getAttribute(attr);
      if (TESTI[normalizza(v)]) attributi.push({ el, attr, it: normalizza(v), ultimo: v });
    }
  }

  const desc = document.querySelector('meta[name="description"]');
  meta = { titolo: document.title, descrizione: desc ? desc.content : null, desc };
}

function traduciPagina() {
  for (const r of nodi) {
    // Uno script ha riscritto il nodo: non e' piu' un testo dell'HTML.
    if (r.nodo.nodeValue !== r.ultimo) continue;
    r.ultimo = r.prima + t(r.it) + r.dopo;
    r.nodo.nodeValue = r.ultimo;
  }
  for (const r of attributi) {
    if (r.el.getAttribute(r.attr) !== r.ultimo) continue;
    r.ultimo = t(r.it);
    r.el.setAttribute(r.attr, r.ultimo);
  }
  for (const p of paragrafi) {
    if (corrente === 'it') { p.el.replaceChildren(...p.originali); continue; }
    const righe = t(p.it).split('\n');
    p.el.replaceChildren(...righe.flatMap((riga, i) => (i ? [document.createElement('br'), riga] : [riga])));
  }
  if (meta) {
    document.title = t(meta.titolo);
    if (meta.desc) meta.desc.content = t(meta.descrizione);
  }
}

/**
 * In ucraino servono i compagni cirillici dei due caratteri (base.css): il
 * browser li scaricherebbe al primo testo da disegnare, qui li si chiede
 * subito, insieme al cambio di lingua.
 */
function caricaCaratteri() {
  if (corrente !== 'uk' || !document.fonts || !document.fonts.load) return;
  for (const famiglia of ['"Albert Sans"', 'Aldrich']) {
    document.fonts.load(`16px ${famiglia}`, 'Ґґ').catch(() => {});
  }
}

/* ---------------------------------------------------------------- scelta */

/** La lingua ricordata dal browser, se valida. */
function salvata() {
  try {
    const l = localStorage.getItem(CHIAVE);
    return LINGUE.includes(l) ? l : null;
  } catch { return null; }
}

/**
 * Da chiamare una volta, PRIMA che gli script scrivano nella pagina: fa
 * l'istantanea dei testi dell'HTML e applica la lingua ricordata, cosi' i
 * moduli disegnano direttamente nella lingua giusta.
 */
export function avviaLingua() {
  istantanea();
  corrente = salvata() || 'it';
  document.documentElement.lang = corrente;
  caricaCaratteri();
  if (corrente !== 'it') traduciPagina();
  return corrente;
}

/**
 * Cambia lingua: riscrive i testi dell'HTML, poi avvisa gli script
 * (`linguachange`, detail: codice) perche' ridisegnino i loro.
 */
export function impostaLingua(codice) {
  if (!LINGUE.includes(codice) || codice === corrente) return;
  corrente = codice;
  try { localStorage.setItem(CHIAVE, codice); } catch { /* resta per questa visita */ }
  document.documentElement.lang = codice;
  caricaCaratteri();
  traduciPagina();
  document.dispatchEvent(new CustomEvent('linguachange', { detail: codice }));
}

/** Ascolta i cambi di lingua. */
export const alCambioLingua = (fn) => document.addEventListener('linguachange', () => fn(corrente));
