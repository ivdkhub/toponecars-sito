/**
 * La parte legale del sito: la barra in fondo alla pagina e il pannello con
 * informativa privacy, cookie policy e informazioni legali.
 *
 *  - La barra sta fra gli elementi comuni (index.html, `[data-legal-bar]`):
 *    compare in ogni scena con insegna e partita IVA, perche' l'art. 35 del
 *    DPR 633/1972 vuole la P.IVA nella pagina iniziale del sito, e porta ai
 *    tre documenti.
 *  - Il pannello e' un <dialog> modale: fuoco intrappolato, Esc per chiudere,
 *    niente passi di scena mentre e' aperto (vedi main.js e
 *    input-controller.js). I testi sono in legale-testi.js, nelle tre lingue:
 *    quasi nessuno li apre, quindi si scaricano al primo click e non con la
 *    pagina. Qui li si disegna, e si ridisegnano al cambio di lingua.
 *  - Nella cookie policy stanno i comandi del consenso (consenso.js): si da'
 *    e si revoca da li' con la stessa facilita', come chiede il Garante.
 *
 * Qualunque elemento con `data-legal-open="privacy|cookie|note"` apre il
 * documento corrispondente: lo usano il modulo di prenotazione e la mappa.
 * Chi apre il pannello da codice chiama `apri(doc)`.
 */
import { CONFIG } from './config.js';
import { consenso, impostaConsenso, dataConsenso, DURATA_GIORNI } from './consenso.js';
import { GIORNI_CONSERVAZIONE } from './dati-officina.js';
import { RECENSIONI } from './recensioni-data.js';
import { t, lingua, data } from './i18n.js';

const DOC = ['privacy', 'cookie', 'note'];
const ETICHETTE = { privacy: 'Privacy', cookie: 'Cookie', note: 'Note legali' };

/** I campi dell'impresa che la legge vuole nel sito. */
const OBBLIGATORI = ['ragioneSociale', 'piva', 'rea', 'email'];

/** Elemento DOM in una riga: h('p', { class: 'x' }, 'testo', figlio). */
function h(tag, attr = {}, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...figli.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return el;
}

/** I dati dell'impresa per i testi, con i mancanti gia' segnalati. */
export function datiImpresa() {
  const a = CONFIG.azienda;
  const manca = t('[da completare]');
  const [y, m, g] = CONFIG.informativaAggiornata.split('-').map(Number);
  return {
    ragione: a.ragioneSociale || manca,
    insegna: a.insegna,
    sede: a.sede,
    piva: a.piva || manca,
    cf: a.codiceFiscale,
    rea: a.rea || manca,
    capitale: a.capitaleSociale,
    email: a.email || manca,
    pec: a.pec,
    telefono: a.telefono,
    aggiornata: data(new Date(y, m - 1, g), { day: 'numeric', month: 'long', year: 'numeric' }),
    conservazione: GIORNI_CONSERVAZIONE,
    durataConsenso: DURATA_GIORNI,
    recensioniVere: RECENSIONI.some((r) => r.google),
  };
}

export class LegalePanel {
  /** @param {Document|HTMLElement} root */
  constructor(root = document) {
    this.root = root;
    this.dialog = root.querySelector('[data-legal]');
    this.barra = root.querySelector('[data-legal-bar]');
    this.doc = 'privacy';
  }

  get aperto() { return !!(this.dialog && this.dialog.open); }

  attach() {
    if (!this.dialog) return;
    this.tabs = this.dialog.querySelector('[data-legal-tabs]');
    this.corpo = this.dialog.querySelector('[data-legal-body]');

    // Un solo ascoltatore per tutti i collegamenti, anche quelli che i
    // pannelli costruiscono dopo (modulo di prenotazione, mappa).
    this.root.addEventListener('click', (e) => {
      const el = e.target instanceof Element && e.target.closest('[data-legal-open]');
      if (!el) return;
      e.preventDefault();
      this.apri(el.dataset.legalOpen);
    });
    this.dialog.querySelector('[data-legal-close]').addEventListener('click', () => this.chiudi());
    // Click sul fondo oscurato, fuori dal foglio: chiude.
    this.dialog.addEventListener('click', (e) => { if (e.target === this.dialog) this.chiudi(); });
    this.dialog.addEventListener('close', () => {
      if (this.ritorno && this.ritorno.isConnected) this.ritorno.focus({ preventScroll: true });
    });

    document.addEventListener('linguachange', () => { this.barraTesti(); if (this.aperto) this.disegna(); });
    document.addEventListener('consensochange', () => { if (this.aperto && this.doc === 'cookie') this.disegna(true); });

    this.barraTesti();
    this.avvisaMancanti();
    // Il pannello e' aperto quasi sempre da un puntatore: il testo si chiede
    // quando il puntatore si avvicina alla barra o al modulo, cosi' al click
    // e' gia' arrivato.
    this.root.addEventListener('pointerover', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-legal-open]')) this.testi();
    }, { passive: true });
  }

  /** I testi dei documenti, caricati una volta sola. */
  testi() {
    this.documenti ??= import('./legale-testi.js').then((m) => m.DOCUMENTI);
    return this.documenti;
  }

  async apri(doc = 'privacy') {
    if (!this.dialog) return;
    this.doc = DOC.includes(doc) ? doc : 'privacy';
    this.DOCUMENTI = await this.testi();
    this.disegna();
    if (!this.aperto) {
      this.ritorno = document.activeElement;
      this.dialog.showModal();
    }
    this.corpo.scrollTop = 0;
    this.corpo.focus({ preventScroll: true });
  }

  chiudi() {
    if (this.aperto) this.dialog.close();
  }

  /** La barra in fondo: insegna, P.IVA e i tre collegamenti. */
  barraTesti() {
    if (!this.barra) return;
    const d = datiImpresa();
    this.barra.replaceChildren(
      h('span', { class: 'legal-bar__id' }, `© ${new Date().getFullYear()} ${d.insegna} · ${t('P.IVA')} ${d.piva}`),
      ...DOC.map((k) => h('button', { type: 'button', class: 'legal-bar__link', 'data-legal-open': k }, t(ETICHETTE[k]))),
    );
  }

  /** @param {boolean} [mantieni] true per non tornare in cima (scelte sul consenso) */
  disegna(mantieni = false) {
    const scroll = this.corpo.scrollTop;
    const testi = this.DOCUMENTI[lingua()](datiImpresa())[this.doc];

    this.tabs.replaceChildren(...DOC.map((k) => h('button', {
      type: 'button', class: 'lg__tab', role: 'tab',
      'aria-selected': String(k === this.doc),
      onclick: () => this.apri(k),
    }, t(ETICHETTE[k]))));
    this.dialog.querySelector('[data-legal-close]').setAttribute('aria-label', t('Chiudi'));

    const titolo = h('h2', { class: 'lg__title', id: 'lg-titolo' }, testi.titolo);
    this.corpo.replaceChildren(
      h('p', { class: 'svc__eyebrow' }, CONFIG.azienda.insegna),
      titolo,
      h('p', { class: 'lg__intro' }, testi.intro),
      ...testi.sezioni.filter(Boolean).map((s) => h('section', { class: 'lg__sec' },
        h('h3', { class: 'lg__h' }, s.titolo),
        ...s.blocchi.map((b) => this.blocco(b)))),
    );
    this.dialog.setAttribute('aria-labelledby', 'lg-titolo');
    if (mantieni) this.corpo.scrollTop = scroll;
  }

  blocco(b) {
    if (typeof b === 'string' || Array.isArray(b)) return h('p', {}, this.pezzi(b));
    if (b.elenco) return h('ul', { class: 'lg__list' }, b.elenco.map((p) => h('li', {}, this.pezzi(p))));
    if (b.tabella) {
      const { colonne, righe } = b.tabella;
      return h('div', { class: 'lg__table-wrap' }, h('table', { class: 'lg__table' },
        h('thead', {}, h('tr', {}, colonne.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, righe.map((r) => h('tr', {}, r.map((c, i) => h('td', { 'data-col': colonne[i] },
          // I nomi delle chiavi salvate (toc-lingua...) sono codice: non vanno a capo.
          /^[a-z0-9-]+$/.test(c) ? h('code', {}, c) : c)))))));
    }
    if (b.preferenze) return this.preferenze();
    return null;
  }

  /** Un paragrafo: stringa, o elenco di pezzi con collegamenti. */
  pezzi(p) {
    if (typeof p === 'string') return p;
    return p.map((x) => {
      if (typeof x === 'string') return x;
      if (x.link) return h('a', { href: x.link, target: '_blank', rel: 'noopener' }, x.testo);
      if (x.doc) return h('button', { type: 'button', class: 'lg__inline', onclick: () => this.apri(x.doc) }, x.testo);
      return null;
    });
  }

  /** I comandi del consenso: uno per voce, con lo stato e la data. */
  preferenze() {
    const on = consenso('mappe');
    const quando = dataConsenso();
    const stato = on
      ? t('Consentita il {data}', { data: data(quando, { day: 'numeric', month: 'long', year: 'numeric' }) })
      : t('Non consentita: la mappa non si carica');
    return h('div', { class: 'lg__prefs' },
      h('div', { class: 'lg__pref', 'data-on': String(on) },
        h('div', { class: 'lg__pref-txt' },
          h('strong', {}, t('Mappa di Google')),
          h('span', {}, stato)),
        h('button', {
          type: 'button', class: 'lg__switch', role: 'switch',
          'aria-checked': String(on), 'aria-label': t('Mappa di Google'),
          onclick: () => impostaConsenso('mappe', !on),
        }, h('span', { class: 'lg__knob', 'aria-hidden': 'true' }))),
      h('p', { class: 'lg__note' }, t('Gli strumenti tecnici sono sempre attivi: senza, il sito non ricorderebbe la lingua né le tue scelte.')));
  }

  /** Un sito pubblicato senza P.IVA o ragione sociale non e' in regola: lo si dice. */
  avvisaMancanti() {
    const mancano = OBBLIGATORI.filter((k) => !CONFIG.azienda[k]);
    if (mancano.length) {
      console.warn(`[legale] Dati dell'impresa mancanti in config.js (azienda): ${mancano.join(', ')}. `
        + 'Compaiono nel sito come "[da completare]" finche\' non si inseriscono.');
    }
  }
}
