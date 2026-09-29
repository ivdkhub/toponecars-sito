/**
 * Avvio sul telefono: una pagina che scorre, al posto delle scene video.
 *
 * Sul telefono la sequenza di scene non si usava: il canvas 1440x810 diventava
 * largo un quarto dello schermo, e lo scroll, preso tutto dal motore, non
 * scorreva i pannelli. Qui non si costruiscono ne' il player ne' la macchina a
 * stati (nessun video scaricato): le stesse sezioni, con gli stessi moduli e
 * le stesse card di vetro, si mettono una sotto l'altra su un fondo fermo nei
 * colori dell'officina. L'impaginazione e' tutta in assets/css/mobile.css,
 * sotto html[data-mobile], che mette assets/js/mobile-detect.js.
 *
 * Cosa cambia rispetto al computer, e solo qui:
 *  - il menu si apre dal pulsante in alto a destra e porta alle sezioni;
 *  - la lampadina sta sempre nella barra: spegnerla apre l'area
 *    amministratore, riaccenderla ne esce (stessi eventi del computer);
 *  - servizi e prenotazione stanno in un foglio a tutto schermo, uno sotto
 *    l'altro, con un pulsante che porta al calendario;
 *  - mappa, foto del noleggio e video dei contenuti si caricano quando la
 *    loro sezione si avvicina, come fa il computer quando ci si avvicina alla
 *    scena.
 */
import { CONFIG, applyOverrides } from './config.js';
import { avviaLingua, t, tn } from './i18n.js';
import { costruisciRecensioni } from './recensioni.js';
import { ServiziPanel } from './servizi.js';
import { BookingPanel } from './prenotazione.js';
import { ContenutiCard } from './contenuti.js';
import { LegalePanel } from './legale.js';
import { AdminArea } from './admin.js';
import { SceltaLingua } from './lingua.js';
import { VisitaCard } from './visita.js';
import { NoleggioPage } from './noleggio.js';
import * as datiOfficina from './dati-officina.js';

/** Le voci del menu del sito, nell'ordine: la sezione a cui portano. */
const SEZIONI = ['block-1', 'block-2', 'block-3', 'block-4', 'block-5', 'block-6'];

const ICONA_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
  + 'stroke-linecap="round" aria-hidden="true"><path class="m-burger__a" d="M4 8h16"/>'
  + '<path class="m-burger__b" d="M4 16h16"/></svg>';

export function avviaMobile() {
  const html = document.documentElement;
  avviaLingua();
  const config = applyOverrides(CONFIG);

  // Tutti i blocchi sono in pagina insieme: "visibili" per sempre, cosi' le
  // regole scritte per il blocco acceso (recensioni, area admin) valgono.
  for (const id of SEZIONI) {
    const b = document.getElementById(id);
    if (b) b.dataset.visible = 'true';
  }

  costruisciRecensioni(document);

  const servizi = new ServiziPanel(document);
  servizi.attach();
  const booking = new BookingPanel(config, servizi, document);
  booking.attach();
  const contenuti = new ContenutiCard(config, document);
  contenuti.attach();
  const legale = new LegalePanel(document);
  legale.attach();
  const admin = new AdminArea(config, document);
  admin.attach();
  new SceltaLingua(document).attach();
  const visita = new VisitaCard(config, document);
  visita.attach();

  // Il noleggio chiede alla macchina a stati di tornare a "Vieni a trovarci":
  // qui basta scorrere fin li'. Tutte le card sono raggiungibili, perche'
  // scorrono di lato con il dito invece che con le frecce.
  const noleggio = new NoleggioPage(config, { index: -1, step() {} }, document);
  const vai = noleggio.vai.bind(noleggio);
  noleggio.vai = (n) => {
    vai(n);
    [...noleggio.track.children].forEach((li) => { li.inert = false; });
  };
  noleggio.aVisita = () => vaiA('block-5');
  noleggio.attach();

  const barra = costruisciBarra();
  const menu = document.querySelector('.menu');
  const apriMenu = (on) => {
    html.dataset.mMenu = on ? 'open' : 'closed';
    barra.burger.setAttribute('aria-expanded', String(on));
    barra.burger.setAttribute('aria-label', t(on ? 'Chiudi il menu' : 'Apri il menu'));
  };
  apriMenu(false);
  barra.burger.addEventListener('click', () => apriMenu(html.dataset.mMenu !== 'open'));
  document.addEventListener('click', (e) => {
    if (html.dataset.mMenu !== 'open') return;
    if (menu.contains(e.target) || barra.burger.contains(e.target)) return;
    apriMenu(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') apriMenu(false); });
  document.addEventListener('linguachange', () => apriMenu(html.dataset.mMenu === 'open'));

  // Voci del sito: portano alla sezione. Voci dell'area riservata: le apre
  // admin.js; qui si chiude il menu e si torna in cima, dove sta la pagina.
  const voci = [...menu.querySelectorAll('[data-menu-item]')];
  voci.forEach((v, i) => v.addEventListener('click', (e) => {
    e.preventDefault();
    apriMenu(false);
    vaiA(SEZIONI[i]);
  }));
  menu.querySelectorAll('[data-admin-item]').forEach((v) => v.addEventListener('click', () => {
    if (v.getAttribute('aria-disabled') === 'true') return;
    apriMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));

  // La voce della sezione che occupa il centro dello schermo resta accesa.
  const correnti = new IntersectionObserver((voci_) => {
    for (const v of voci_) {
      if (!v.isIntersecting) continue;
      const i = SEZIONI.indexOf(v.target.id);
      voci.forEach((a, k) => { if (k === i) a.dataset.current = ''; else delete a.dataset.current; });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  SEZIONI.forEach((id) => { const b = document.getElementById(id); if (b) correnti.observe(b); });

  // La lampadina: spegnere la luce apre l'area amministratore. Gli stessi
  // eventi della variante del computer, cosi' admin.js non sa la differenza.
  const lamp = document.querySelector('[data-lamp]');
  lamp.dataset.on = 'true';
  const scriviLampada = () => {
    const buio = html.dataset.theme === 'scuro';
    lamp.setAttribute('aria-pressed', String(buio));
    lamp.setAttribute('aria-label', t(buio ? 'Accendi le luci' : 'Spegni le luci'));
  };
  const tema = (tipo, direction) => document.dispatchEvent(
    new CustomEvent(tipo, { detail: { variant: 'theme', direction } }));
  lamp.addEventListener('click', () => {
    apriMenu(false);
    const spegni = html.dataset.theme !== 'scuro';
    if (spegni) html.dataset.theme = 'scuro'; else delete html.dataset.theme;
    tema('themestart', spegni ? 1 : -1);
    if (spegni) tema('themeend', 1);
    scriviLampada();
    window.scrollTo({ top: 0 });
  });
  document.addEventListener('linguachange', scriviLampada);
  scriviLampada();

  foglioServizi(servizi);
  caricaAvvicinandosi({ visita, noleggio, contenuti });

  // Esposizione per le prove, come window.__TOC__ sul computer.
  window.__TOC__ = {
    mobile: true, config, servizi, booking, contenuti, legale, admin, visita, noleggio, dati: datiOfficina,
  };
  html.dataset.state = 'idle';
  document.dispatchEvent(new CustomEvent('engineready', { detail: { mobile: true } }));
}

function vaiA(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === SEZIONI[0]) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Il pulsante del menu, accanto alla lampadina nella barra in alto. */
function costruisciBarra() {
  const chrome = document.querySelector('.chrome');
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'm-burger';
  burger.setAttribute('aria-controls', 'm-menu');
  burger.innerHTML = ICONA_MENU;
  // Il menu esce dalla barra: una lastra con backdrop-filter dentro un'altra
  // che ne ha uno non sfoca la pagina, ma solo la barra.
  const menu = document.querySelector('.menu');
  menu.id = 'm-menu';
  chrome.append(burger);
  document.body.append(menu);
  return { burger };
}

/**
 * Servizi e prenotazione in un foglio a tutto schermo che scorre: prima
 * l'elenco dei servizi, sotto il calendario e il modulo. Finche' c'e' una
 * scelta e il calendario non e' in vista, in fondo resta un pulsante che ci
 * porta.
 */
function foglioServizi(servizi) {
  const svc = document.querySelector('[data-svc]');
  const bk = document.querySelector('[data-bk]');
  const foglio = document.createElement('div');
  foglio.className = 'm-sheet';
  foglio.dataset.scroll = '';

  const vai = document.createElement('button');
  vai.type = 'button';
  vai.className = 'm-sheet__go';
  vai.hidden = true;
  const testo = document.createElement('span');
  const freccia = document.createElement('span');
  freccia.setAttribute('aria-hidden', 'true');
  freccia.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" '
    + 'stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M4 9l4 4 4-4"/></svg>';
  vai.append(testo, freccia);
  // stopPropagation: un click fuori dai due vetri chiude i servizi, e questo
  // pulsante sta fuori da entrambi.
  vai.addEventListener('click', (e) => {
    e.stopPropagation();
    bk.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  foglio.append(svc, bk, vai);
  document.body.append(foglio);

  let scelti = 0;
  let bkInVista = false;
  const aggiorna = () => {
    vai.hidden = !(servizi.aperto && scelti > 0 && !bkInVista);
    testo.textContent = `${tn(scelti, '{n} servizio scelto', '{n} servizi scelti')} · ${t('Scegli data e ora')}`;
  };
  new IntersectionObserver(([v]) => { bkInVista = v.isIntersecting; aggiorna(); },
    { root: foglio, threshold: 0.15 }).observe(bk);

  const prima = servizi.onChange;
  servizi.onChange = (scelta, aperto) => {
    prima(scelta, aperto);
    scelti = scelta.length;
    if (aperto && !foglio.dataset.open) foglio.scrollTop = 0;
    if (aperto) foglio.dataset.open = 'true'; else delete foglio.dataset.open;
    aggiorna();
  };
  document.addEventListener('linguachange', aggiorna);
}

/**
 * Cio' che pesa si chiede solo quando la sua sezione si avvicina: la mappa
 * (se c'e' il consenso), le foto del noleggio, i video dei contenuti. Il video
 * del telefono si ferma quando la sezione esce dallo schermo.
 */
function caricaAvvicinandosi({ visita, noleggio, contenuti }) {
  const vicino = (id, fn, margine = '600px') => {
    const el = document.getElementById(id);
    if (!el) return;
    const io = new IntersectionObserver(([v]) => {
      if (!v.isIntersecting) return;
      io.disconnect();
      fn();
    }, { rootMargin: `${margine} 0px` });
    io.observe(el);
  };
  vicino('block-5', () => { visita.vicina = true; visita.caricaMappa(); });
  vicino('block-6', () => { noleggio.vicina = true; noleggio.mostraFoto(); });

  const card = document.getElementById('block-3');
  if (!card) return;
  new IntersectionObserver(([v]) => {
    if (v.isIntersecting) {
      if (!contenuti.aperto) contenuti.apri(); else contenuti.avvia();
    } else if (contenuti.aperto) {
      contenuti.video.pause();
    }
  }, { rootMargin: '200px 0px' }).observe(card);
}
