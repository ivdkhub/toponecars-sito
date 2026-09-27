/**
 * Il pannello dei servizi prenotabili, sulla pagina "Servizi" (blocco 2).
 *
 * I dati vengono dall'archivio dell'officina (dati-officina.js): il catalogo di
 * menu_servizi.txt come lo modifica l'area amministratore, con i soli servizi
 * prenotabili. Si rilegge a ogni apertura, cosi' una modifica fatta nell'area
 * si vede la volta dopo.
 *
 * Ogni servizio si puo' selezionare. La selezione sopravvive al cambio di
 * categoria e alla chiusura del pannello; a ogni cambiamento il pannello avvisa
 * chi ascolta (`onChange`) — e' cosi' che compare, a destra, il pannello della
 * prenotazione (assets/js/prenotazione.js).
 *
 * Finche' il pannello e' aperto la pagina non cambia scena, per la stessa
 * ragione della luce spenta: un passo porterebbe via il blocco che lo contiene
 * mentre lo si sta leggendo. main.js lo chiede a `aperto` prima di ogni passo.
 * Lo stato si espone anche come html[data-panel="servizi"], cosi' il CSS puo'
 * ritirare cio' che il vetro coprirebbe a meta'.
 *
 * Nomi e categorie si traducono solo in pagina: la scelta (`scelta`) resta in
 * italiano, perche' e' con quei nomi che la richiesta arriva all'officina.
 */
import { catalogoPubblico } from './dati-officina.js';
import { t } from './i18n.js';

export class ServiziPanel {
  /**
   * @param {Document|HTMLElement} root
   */
  constructor(root = document) {
    this.panel = root.querySelector('[data-svc]');
    this.trigger = root.querySelector('[data-svc-open]');
    this.tabsEl = this.panel ? this.panel.querySelector('[data-svc-tabs]') : null;
    this.listEl = this.panel ? this.panel.querySelector('[data-svc-list]') : null;
    this.panelEl = this.panel ? this.panel.querySelector('[data-svc-panel]') : null;
    this.tabs = [];
    this.corrente = 0;
    this.aperto = false;
    /** Chiavi "categoria-servizio" dei servizi scelti, in ordine di scelta. */
    this.selezionati = new Set();
    /** @type {(sel: {categoria: string, nome: string, dettaglio?: string, chiave: string}[], aperto: boolean) => void} */
    this.onChange = () => {};
  }

  attach() {
    if (!this.panel || !this.trigger || !this.tabsEl || !this.listEl) return;
    this.leggiCatalogo();

    this.trigger.addEventListener('click', () => this.apri());
    this.panel.querySelector('[data-svc-close]').addEventListener('click', () => this.chiudi());
    // Un click fuori dal vetro chiude, come per l'elenco della vernice. Il
    // pannello della prenotazione conta come "dentro": e' la sua continuazione.
    document.addEventListener('click', (e) => {
      if (!this.aperto) return;
      const t = e.target;
      if (this.panel.contains(t) || this.trigger.contains(t)) return;
      if (t instanceof Element && t.closest('[data-bk]')) return;
      // Un nodo appena tolto dal DOM (il contenuto di un passo sostituito)
      // non e' piu' "dentro" a niente: non e' un click fuori.
      if (!t.isConnected) return;
      this.chiudi();
    });
    document.addEventListener('keydown', (e) => {
      if (this.aperto && e.key === 'Escape') { e.preventDefault(); this.chiudi(); }
    });
    // Le frecce scorrono le categorie. preventDefault qui, sul pannello, arriva
    // prima dell'ascoltatore su window di InputController, che ignora gli eventi
    // gia' gestiti: la freccia cambia categoria e non scena.
    this.tabsEl.addEventListener('keydown', (e) => this.tastiera(e));
    // Cambio lingua: stesse schede, stessa categoria, stessa scelta.
    document.addEventListener('linguachange', () => this.ridisegna());
  }

  ridisegna() {
    this.scriviSottotitolo();
    const focus = this.tabsEl.contains(document.activeElement);
    this.costruisciSchede();
    this.mostra(this.corrente, focus);
    this.segnaSchede();
  }

  scriviSottotitolo() {
    const totale = this.cat.reduce((n, c) => n + c.servizi.length, 0);
    this.panel.querySelector('[data-svc-sub]').textContent =
      t('{totale} servizi in {aree} aree · selezionane uno o più per prenotare', { totale, aree: this.cat.length });
  }

  /**
   * Rilegge il catalogo pubblico e, se e' cambiato (servizi aggiunti, tolti o
   * resi non prenotabili nell'area amministratore), ricostruisce schede ed
   * elenco. La scelta in corso si svuota: le sue chiavi indicherebbero
   * posizioni che ora contengono altro.
   */
  leggiCatalogo() {
    const nuovo = catalogoPubblico();
    const firma = JSON.stringify(nuovo);
    if (firma === this.firma) return;
    this.firma = firma;
    this.cat = nuovo;
    this.scriviSottotitolo();
    const cera = this.selezionati.size > 0;
    this.selezionati.clear();
    this.costruisciSchede();
    this.mostra(Math.min(this.corrente, Math.max(0, nuovo.length - 1)), false);
    this.segnaSchede();
    if (cera) this.avvisa();
  }

  /** I servizi scelti, con la loro categoria, nell'ordine in cui sono stati scelti. */
  get scelta() {
    return [...this.selezionati].map((chiave) => {
      const [i, k] = chiave.split('-').map(Number);
      return { chiave, categoria: this.cat[i].titolo, ...this.cat[i].servizi[k] };
    });
  }

  costruisciSchede() {
    this.tabsEl.replaceChildren();
    this.tabs = this.cat.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'svc__tab';
      b.id = `svc-tab-${i}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'svc-panel');
      const etichetta = document.createElement('span');
      etichetta.className = 'svc__tab-label';
      etichetta.textContent = t(c.titolo);
      const n = document.createElement('span');
      n.className = 'svc__tab-count';
      n.textContent = String(c.servizi.length);
      b.append(etichetta, n);
      b.addEventListener('click', () => this.mostra(i));
      this.tabsEl.appendChild(b);
      return b;
    });
  }

  /** Mostra la categoria i. Le righe nuove entrano scaglionate da CSS: essendo
   *  elementi appena creati, l'animazione riparte da sola a ogni cambio. */
  mostra(i, focus = false) {
    this.corrente = i;
    // L'area amministratore puo' aver reso non prenotabile ogni servizio.
    if (!this.cat.length) {
      const li = document.createElement('li');
      li.className = 'svc__item svc__empty';
      li.textContent = t('Al momento non ci sono servizi prenotabili online. Chiamaci per un appuntamento.');
      this.listEl.replaceChildren(li);
      return;
    }
    this.tabs.forEach((b, k) => {
      const on = k === i;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) this.tabs[i].focus();
    if (this.panelEl) this.panelEl.setAttribute('aria-labelledby', this.tabs[i].id);

    this.listEl.replaceChildren(...this.cat[i].servizi.map((s, k) => {
      const chiave = `${i}-${k}`;
      const li = document.createElement('li');
      li.className = 'svc__item';
      li.style.setProperty('--k', String(k));

      // Tutta la riga e' il comando: un bersaglio grande, come le righe di iOS.
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'svc__pick';
      b.dataset.key = chiave;
      b.setAttribute('aria-pressed', String(this.selezionati.has(chiave)));

      const num = document.createElement('span');
      num.className = 'svc__num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = String(k + 1).padStart(2, '0');
      const testo = document.createElement('span');
      testo.className = 'svc__text';
      const nome = document.createElement('span');
      nome.className = 'svc__name';
      nome.textContent = t(s.nome);
      testo.appendChild(nome);
      if (s.dettaglio) {
        const det = document.createElement('span');
        det.className = 'svc__detail';
        det.textContent = t(s.dettaglio);
        testo.appendChild(det);
      }
      const check = document.createElement('span');
      check.className = 'svc__check';
      check.setAttribute('aria-hidden', 'true');
      check.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" '
        + 'stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';

      b.append(num, testo, check);
      b.addEventListener('click', () => this.alterna(chiave, b));
      li.appendChild(b);
      return li;
    }));
  }

  alterna(chiave, btn) {
    if (this.selezionati.has(chiave)) this.selezionati.delete(chiave);
    else this.selezionati.add(chiave);
    btn.setAttribute('aria-pressed', String(this.selezionati.has(chiave)));
    this.segnaSchede();
    this.avvisa();
  }

  /** Toglie un servizio dalla scelta (lo chiede il riepilogo della prenotazione). */
  togli(chiave) {
    if (!this.selezionati.delete(chiave)) return;
    const b = this.listEl.querySelector(`[data-key="${chiave}"]`);
    if (b) b.setAttribute('aria-pressed', 'false');
    this.segnaSchede();
    this.avvisa();
  }

  /** Svuota la scelta: dopo una richiesta inviata si riparte da zero. */
  svuota() {
    this.selezionati.clear();
    this.listEl.querySelectorAll('[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    this.segnaSchede();
    this.avvisa();
  }

  /** Le categorie con almeno un servizio scelto portano un segno. */
  segnaSchede() {
    const conScelte = new Set([...this.selezionati].map((c) => c.split('-')[0]));
    this.tabs.forEach((b, i) => { b.dataset.picked = String(conScelte.has(String(i))); });
  }

  avvisa() { this.onChange(this.scelta, this.aperto); }

  tastiera(e) {
    const n = this.tabs.length;
    let i = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') i = (this.corrente + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') i = (this.corrente - 1 + n) % n;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    if (i === null) return;
    e.preventDefault();
    this.mostra(i, true);
  }

  apri() {
    if (this.aperto) return;
    this.leggiCatalogo();
    this.aperto = true;
    this.panel.hidden = false;
    // Un fotogramma con il pannello presente ma ancora nello stato di partenza,
    // poi l'attributo che fa partire la transizione di entrata.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.aperto) this.panel.dataset.open = 'true';
    }));
    document.documentElement.dataset.panel = 'servizi';
    this.trigger.setAttribute('aria-expanded', 'true');
    const scheda = this.tabs[this.corrente];
    if (scheda) scheda.focus({ preventScroll: true });
    this.avvisa();
  }

  chiudi() {
    if (!this.aperto) return;
    this.aperto = false;
    this.panel.dataset.open = 'false';
    delete document.documentElement.dataset.panel;
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.focus({ preventScroll: true });
    this.avvisa();
    // hidden solo a transizione d'uscita finita, e solo se nel frattempo nessuno
    // l'ha riaperto.
    const fine = () => { if (!this.aperto) this.panel.hidden = true; };
    const ms = parseFloat(getComputedStyle(this.panel).transitionDuration) * 1000 || 0;
    setTimeout(fine, ms + 40);
  }
}
