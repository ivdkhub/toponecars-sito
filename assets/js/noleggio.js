/**
 * La pagina "Noleggio" (blocco 6, scena 8): le card delle auto a noleggio.
 *
 * Le auto sono quelle del parco dell'officina (dati-officina.js, `flotta`), lo
 * stesso che l'area amministratore gestisce nella pagina "Parco auto-noleggio":
 * un'auto aggiunta, tolta, fotografata o noleggiata li' cambia qui.
 *
 * Le card riprendono quelle del sito Valenzani Motors: foto con lo stato e la
 * categoria sopra, alimentazione e modello, quattro dati in griglia, il prezzo
 * in evidenza, il comando in fondo. L'inclinazione 3D che segue il puntatore
 * e' quella comune a tutte le card del sito (parallax.js).
 * Quattro alla volta, le frecce scorrono le altre. Il comando porta a "Vieni a
 * trovarci": il noleggio si concorda in officina, e li' ci sono indirizzo,
 * orari e navigatore.
 *
 * Tutto il testo entra con textContent; la foto e' un'immagine scontornata del
 * parco di esempio, una foto gia' ridotta dall'area amministratore, oppure una
 * silhouette disegnata qui.
 */
import { carica, CARTELLA_FOTO_AUTO } from './dati-officina.js';
import { t, tn, numero, euro as euroIn } from './i18n.js';

const VISIBILI = 4;
const ORDINE_STATI = { Disponibile: 0, Noleggiata: 1, 'In manutenzione': 2 };
const SVG = 'http://www.w3.org/2000/svg';

const euro = (n) => euroIn(n, false);

function el(tag, cls, testo) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (testo !== undefined && testo !== null) e.textContent = testo;
  return e;
}

/** Icone a tratto, come quelle delle card Valenzani (lucide), disegnate qui. */
const ICONE = {
  anno: 'M3 5.5h10v8H3zM3 8h10M5.5 3.5v3M10.5 3.5v3',
  km: 'M2.5 11a5.5 5.5 0 1 1 11 0M8 11l2.6-3.2',
  posti: 'M5.5 5.3a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M3 13.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4',
  cambio: 'M4 3v10M8 3v10M12 3v5M4 8h8',
};
function icona(nome) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 16 16');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'nl__ico');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', ICONE[nome]);
  s.append(p);
  return s;
}

/** Senza foto: la sagoma di un'auto nei colori del marchio. */
function sagoma() {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 240 90');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'nl__shape');
  const corpo = document.createElementNS(SVG, 'path');
  corpo.setAttribute('d', 'M12 64c1-11 9-17 27-19l32-4c14-12 33-18 56-18 21 0 37 6 51 16l26 4c15 2 22 9 24 19v4H12z');
  const vetri = document.createElementNS(SVG, 'path');
  vetri.setAttribute('class', 'nl__shape-glass');
  vetri.setAttribute('d', 'M84 41c11-9 26-13 43-13 16 0 29 4 40 11z');
  s.append(corpo, vetri);
  for (const x of [60, 186]) {
    const r = document.createElementNS(SVG, 'circle');
    r.setAttribute('cx', String(x));
    r.setAttribute('cy', '67');
    r.setAttribute('r', '14');
    r.setAttribute('class', 'nl__shape-wheel');
    s.append(r);
  }
  return s;
}

export class NoleggioPage {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {Document|HTMLElement} root
   */
  constructor(config, machine, root = document) {
    this.el = root.querySelector('[data-nl]');
    this.machine = machine;
    this.scenaVisita = config.scenes.findIndex((s) => s.block === 'block-5');
    this.scena = config.scenes.findIndex((s) => s.block === 'block-6');
    this.vicina = false;
    this.primo = 0;
  }

  attach() {
    if (!this.el) return;
    this.track = this.el.querySelector('[data-nl-track]');
    this.prev = this.el.querySelector('[data-nl-prev]');
    this.next = this.el.querySelector('[data-nl-next]');
    this.pos = this.el.querySelector('[data-nl-pos]');
    this.sub = this.el.querySelector('[data-nl-sub]');
    this.prev.addEventListener('click', () => this.vai(this.primo - 1));
    this.next.addEventListener('click', () => this.vai(this.primo + 1));
    document.addEventListener('officinachange', () => this.disegna());
    document.addEventListener('linguachange', () => this.disegna());
    // Le foto stanno nell'ultima scena: chiederle con la pagina vorrebbe dire
    // rubare banda alla clip d'apertura per immagini che forse nessuno vedra'.
    // Partono quando una transizione punta a una scena vicina, come la mappa,
    // e arrivano ben prima della fine del video.
    const vicino = (i) => Math.abs(i - this.scena) <= 2;
    const avvicina = (i) => { if (!this.vicina && vicino(i)) { this.vicina = true; this.mostraFoto(); } };
    document.addEventListener('transitionstart', (e) => { if (e.detail) avvicina(e.detail.to); });
    document.addEventListener('scenechange', (e) => { if (e.detail) avvicina(e.detail.index); });
    this.disegna();
  }

  mostraFoto() {
    this.track.querySelectorAll('img[data-src]').forEach((img) => {
      img.src = img.dataset.src;
      delete img.dataset.src;
    });
  }

  disegna() {
    const auto = [...carica().flotta].sort((a, b) =>
      (ORDINE_STATI[a.stato] ?? 9) - (ORDINE_STATI[b.stato] ?? 9) || (Number(a.prezzo) || 0) - (Number(b.prezzo) || 0));
    this.totale = auto.length;
    const libere = auto.filter((a) => a.stato === 'Disponibile').length;
    this.sub.textContent = auto.length
      ? tn(libere, '{n} auto disponibile su {totale} · tariffe al giorno, cauzione alla consegna',
        '{n} auto disponibili su {totale} · tariffe al giorno, cauzione alla consegna', { totale: auto.length })
      : t('Il parco auto a noleggio è in allestimento.');
    this.track.replaceChildren(...auto.map((a, i) => this.card(a, i)));
    this.vai(Math.min(this.primo, Math.max(0, auto.length - VISIBILI)));
  }

  card(a, i) {
    const li = el('li', 'nl__slot');
    li.dataset.anim = '';
    li.style.setProperty('--i', String(Math.min(i, VISIBILI - 1) + 1));

    const card = el('article', 'nl__card');
    card.dataset.stato = a.stato;

    // Foto con lo stato e la categoria sopra.
    const media = el('div', 'nl__media');
    if (a.foto) {
      // Le foto del parco di esempio sono scontornate: stanno intere sul fondo
      // della card. Quelle caricate dall'officina sono foto vere, a tutto campo.
      const img = el('img', a.foto.startsWith(CARTELLA_FOTO_AUTO) ? 'nl__img nl__img--cut' : 'nl__img');
      if (this.vicina) img.src = a.foto; else img.dataset.src = a.foto;
      img.alt = t('{modello}, targa {targa}', { modello: a.modello, targa: a.targa });
      img.decoding = 'async';
      media.append(img);
    } else {
      media.append(sagoma());
    }
    const badge = el('span', 'nl__badge', t(a.stato));
    badge.dataset.stato = a.stato;
    media.append(badge);
    if (a.categoria) media.append(el('span', 'nl__cat', t(a.categoria)));

    // Corpo: alimentazione, modello, dati.
    const body = el('div', 'nl__body');
    const top = el('p', 'nl__eyebrow');
    top.append(el('b', null, t(a.alimentazione || 'Auto')));
    if (a.targa) top.append(el('span', null, ` · ${a.targa}`));
    const titolo = el('h3', 'nl__title', a.modello);

    const dati = el('ul', 'nl__specs');
    const dato = (ic, testo) => {
      if (!testo) return;
      const d = el('li');
      d.append(icona(ic), el('span', null, testo));
      dati.append(d);
    };
    dato('anno', a.anno ? String(a.anno) : null);
    dato('km', Number.isFinite(Number(a.km)) ? `${numero(a.km)} km` : null);
    dato('posti', a.posti ? tn(Number(a.posti), '{n} posto', '{n} posti') : null);
    dato('cambio', a.cambio ? t(a.cambio) : null);

    // Prezzo e comando.
    const piede = el('div', 'nl__foot');
    const prezzo = el('p', 'nl__price');
    prezzo.append(el('b', null, euro(Number(a.prezzo))), el('span', null, ` / ${t('giorno')}`));
    const cauzione = el('p', 'nl__deposit', a.cauzione ? t('Cauzione {importo}', { importo: euro(Number(a.cauzione)) }) : '');
    const libera = a.stato === 'Disponibile';
    const cta = el('button', 'nl__cta', t(libera ? 'Come noleggiarla' : (a.stato === 'Noleggiata' ? 'Già noleggiata' : 'In manutenzione')));
    cta.type = 'button';
    cta.disabled = !libera;
    cta.addEventListener('click', () => this.aVisita());
    piede.append(prezzo, cauzione, cta);

    body.append(top, titolo, dati, piede);
    card.append(media, body);
    li.append(card);
    return li;
  }

  vai(n) {
    const max = Math.max(0, this.totale - VISIBILI);
    this.primo = Math.max(0, Math.min(max, n));
    this.track.style.setProperty('--nl-primo', String(this.primo));
    this.prev.disabled = this.primo === 0;
    this.next.disabled = this.primo >= max;
    const fine = Math.min(this.totale, this.primo + VISIBILI);
    this.pos.textContent = this.totale ? t('{da}–{a} di {totale}', { da: this.primo + 1, a: fine, totale: this.totale }) : '';
    this.el.dataset.piene = String(this.totale <= VISIBILI);   // tutte in vista: niente frecce
    // Le card fuori vista non si raggiungono con il tabulatore.
    [...this.track.children].forEach((li, i) => {
      li.inert = i < this.primo || i >= fine;
    });
  }

  /** Il noleggio si concorda in officina: si torna a "Vieni a trovarci". */
  aVisita() {
    if (this.scenaVisita < 0) return;
    if (this.machine.index === this.scenaVisita + 1) this.machine.step(-1, 'noleggio');
  }
}
