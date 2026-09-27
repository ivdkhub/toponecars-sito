/**
 * Il pannello della prenotazione, a destra del pannello dei servizi.
 *
 * Compare quando il pannello dei servizi e' aperto e almeno un servizio e'
 * scelto; sparisce quando la scelta si svuota o il pannello si chiude. I passi
 * sono tre, tutti nello stesso vetro:
 *   1. data e ora — calendario del mese e orari di accettazione del giorno;
 *   2. i dati di chi prenota;
 *   3. la conferma.
 *
 * Giorni di apertura, fasce orarie e chiusure straordinarie vengono
 * dall'archivio dell'officina (dati-officina.js), che si modifica nell'area
 * amministratore; il calendario si ridisegna quando cambiano. L'invio va a
 * config.prenotazione.endpoint; finche' e' null la richiesta viene soltanto
 * emessa come evento `prenotazione` su document (vedi `invia`), che l'area
 * amministratore raccoglie.
 */
import { slotDi } from './dati-officina.js';
import { t, tn, data, nomeMese, giornoSettimana } from './i18n.js';

const TITOLI = { 1: 'Scegli data e ora', 2: 'I tuoi dati', 3: 'Richiesta inviata' };
const CAMPI = ['nome', 'telefono', 'email', 'auto', 'privacy'];

/** Mezzanotte locale del giorno di d. */
const giorno = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const stessoGiorno = (a, b) => a && b && a.getTime() === b.getTime();
/** "lunedì 28 settembre", nella lingua corrente. */
const dataLunga = (d) => data(d, { weekday: 'long', day: 'numeric', month: 'long' });

export class BookingPanel {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./servizi.js').ServiziPanel} servizi
   * @param {Document|HTMLElement} root
   */
  constructor(config, servizi, root = document) {
    this.cfg = config.prenotazione || {};
    this.servizi = servizi;
    this.el = root.querySelector('[data-bk]');
    this.q = (sel) => this.el.querySelector(sel);
    this.scelta = [];
    this.visibile = false;
    this.passo = 1;
    this.data = null;
    this.ora = null;
    /** Errori mostrati, per campo: la chiave italiana, ritradotta al cambio lingua. */
    this.errori = {};
    /** L'ultima richiesta inviata: il testo di conferma si riscrive con essa. */
    this.inviata = null;

    const oggi = giorno(new Date());
    this.primo = new Date(oggi);
    this.primo.setDate(oggi.getDate() + (this.cfg.anticipoGiorni ?? 1));
    this.ultimo = new Date(oggi);
    this.ultimo.setDate(oggi.getDate() + (this.cfg.finestraGiorni ?? 90));
    this.mese = new Date(this.primo.getFullYear(), this.primo.getMonth(), 1);
  }

  attach() {
    if (!this.el) return;
    this.form = this.q('[data-bk-form]');
    this.q('[data-cal-prev]').addEventListener('click', () => this.cambiaMese(-1));
    this.q('[data-cal-next]').addEventListener('click', () => this.cambiaMese(1));
    this.q('[data-bk-next]').addEventListener('click', () => this.vaiA(2));
    this.q('[data-bk-back]').addEventListener('click', () => this.vaiA(1));
    this.q('[data-bk-clear]').addEventListener('click', () => this.servizi.svuota());
    this.q('[data-bk-restart]').addEventListener('click', () => this.ricomincia());
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.invia(); });
    // L'errore di un campo sparisce appena lo si corregge.
    this.form.addEventListener('input', (e) => {
      const n = e.target.name;
      if (n) this.errore(n, '');
    });

    this.servizi.onChange = (scelta, aperto) => this.aggiorna(scelta, aperto);
    // Orari cambiati nell'area amministratore: calendario e orari si rifanno,
    // e un giorno o un'ora non piu' disponibili si deselezionano.
    document.addEventListener('officinachange', () => {
      if (this.data && !this.giornoAperto(this.data)) { this.data = null; this.ora = null; }
      else if (this.data && this.ora && !this.orariDi(this.data).includes(this.ora)) this.ora = null;
      this.disegnaCalendario();
      this.disegnaOrari();
      if (this.passo === 2 && !(this.data && this.ora)) this.vaiA(1, false);
    });
    // Cambio lingua: stesso passo, stesso giorno, stessi dati nel modulo.
    document.addEventListener('linguachange', () => {
      this.disegnaSettimana();
      this.disegnaRiepilogo();
      this.disegnaCalendario();
      this.disegnaOrari();
      this.vaiA(this.passo, false);
      CAMPI.forEach((n) => this.errore(n, this.errori[n] || ''));
      this.scriviConferma();
    });
    this.disegnaSettimana();
    this.disegnaCalendario();
    this.disegnaOrari();
    this.vaiA(1, false);
  }

  /** Le iniziali dei giorni sopra il calendario, da lunedi'. */
  disegnaSettimana() {
    const celle = this.el.querySelectorAll('.cal__week > span');
    celle.forEach((c, i) => {
      c.textContent = giornoSettimana((i + 1) % 7, 'narrow').toLocaleUpperCase();
    });
  }

  /* ------------------------------------------------------ comparsa e riepilogo */

  aggiorna(scelta, aperto) {
    this.scelta = scelta;
    // Dopo la conferma il pannello resta finche' non lo si chiude: la scelta
    // svuotata dall'invio non deve farlo sparire sotto gli occhi.
    const serve = aperto && (scelta.length > 0 || this.passo === 3);
    if (serve !== this.visibile) this.mostra(serve);
    this.disegnaRiepilogo();
  }

  mostra(on) {
    this.visibile = on;
    if (on) {
      this.el.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (this.visibile) this.el.dataset.open = 'true';
      }));
    } else {
      this.el.dataset.open = 'false';
      if (this.passo === 3) this.ricomincia();
      const ms = parseFloat(getComputedStyle(this.el).transitionDuration) * 1000 || 0;
      setTimeout(() => { if (!this.visibile) this.el.hidden = true; }, ms + 40);
    }
  }

  disegnaRiepilogo() {
    const n = this.scelta.length;
    this.q('[data-bk-count]').textContent = tn(n, '{n} servizio scelto', '{n} servizi scelti');
    const chips = this.q('[data-bk-chips]');
    // Al massimo tre nomi, poi un conteggio: il riepilogo non deve spingere
    // il calendario fuori dal vetro.
    const MAX = 3;
    const voci = this.scelta.slice(0, MAX).map((s) => {
      const li = document.createElement('li');
      li.className = 'bk__chip';
      const testo = document.createElement('span');
      testo.className = 'bk__chip-text';
      testo.textContent = t(s.nome);
      testo.title = t(s.nome);
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'bk__chip-x';
      x.setAttribute('aria-label', t('Togli {nome}', { nome: t(s.nome) }));
      x.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" '
        + 'stroke-linecap="round" aria-hidden="true"><path d="M5 5l6 6M11 5l-6 6"/></svg>';
      x.addEventListener('click', () => this.servizi.togli(s.chiave));
      li.append(testo, x);
      return li;
    });
    if (n > MAX) {
      const li = document.createElement('li');
      li.className = 'bk__chip bk__chip--more';
      li.textContent = `+${n - MAX}`;
      li.title = this.scelta.slice(MAX).map((s) => t(s.nome)).join('\n');
      voci.push(li);
    }
    chips.replaceChildren(...voci);
  }

  /* ------------------------------------------------------------------- passi */

  vaiA(passo, focus = true) {
    this.passo = passo;
    this.q('[data-bk-step]').textContent = passo < 3
      ? t('Prenotazione · passo {passo} di 2', { passo }) : t('Prenotazione');
    this.q('[data-bk-title]').textContent = t(TITOLI[passo]);
    this.el.querySelectorAll('[data-bk-pane]').forEach((p) => {
      p.hidden = Number(p.dataset.bkPane) !== passo;
    });
    this.el.dataset.step = String(passo);
    if (passo === 2) {
      this.q('[data-bk-when]').textContent = t('{data}, ore {ora}', { data: dataLunga(this.data), ora: this.ora });
      if (focus) this.form.elements.nome.focus({ preventScroll: true });
    }
  }

  ricomincia() {
    this.data = null;
    this.ora = null;
    this.form.reset();
    CAMPI.forEach((n) => this.errore(n, ''));
    this.inviata = null;
    this.disegnaCalendario();
    this.disegnaOrari();
    this.vaiA(1, false);
  }

  /* -------------------------------------------------------------- calendario */

  giornoAperto(d) {
    if (d < this.primo || d > this.ultimo) return false;
    return this.orariDi(d).length > 0;
  }

  /** Orari prenotabili del giorno: li decide l'archivio dell'officina, che
   *  l'area amministratore modifica (giorni, fasce, passo, chiusure). */
  orariDi(d) { return slotDi(d); }

  cambiaMese(dir) {
    const m = new Date(this.mese.getFullYear(), this.mese.getMonth() + dir, 1);
    const primoMese = new Date(this.primo.getFullYear(), this.primo.getMonth(), 1);
    const ultimoMese = new Date(this.ultimo.getFullYear(), this.ultimo.getMonth(), 1);
    if (m < primoMese || m > ultimoMese) return;
    this.mese = m;
    this.disegnaCalendario();
  }

  disegnaCalendario() {
    const y = this.mese.getFullYear();
    const m = this.mese.getMonth();
    this.q('[data-cal-month]').textContent = `${nomeMese(m)} ${y}`;
    this.q('[data-cal-prev]').disabled =
      y === this.primo.getFullYear() && m === this.primo.getMonth();
    this.q('[data-cal-next]').disabled =
      y === this.ultimo.getFullYear() && m === this.ultimo.getMonth();

    // Sei righe sempre, anche nei mesi che ne occupano cinque: il vetro non
    // cambia altezza passando da un mese all'altro.
    const scarto = (new Date(y, m, 1).getDay() + 6) % 7;    // settimana da lunedi'
    const celle = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - scarto + i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal__day';
      b.textContent = String(d.getDate());
      if (d.getMonth() !== m) b.dataset.out = 'true';
      const aperto = d.getMonth() === m && this.giornoAperto(d);
      b.disabled = !aperto;
      b.setAttribute('aria-label', aperto ? dataLunga(d) : t('{data}, non prenotabile', { data: dataLunga(d) }));
      b.setAttribute('aria-pressed', String(!!stessoGiorno(d, this.data)));
      if (stessoGiorno(d, giorno(new Date()))) b.dataset.today = 'true';
      b.addEventListener('click', () => this.scegliGiorno(d));
      celle.push(b);
    }
    this.q('[data-cal-grid]').replaceChildren(...celle);
  }

  scegliGiorno(d) {
    this.data = d;
    if (this.ora && !this.orariDi(d).includes(this.ora)) this.ora = null;
    this.disegnaCalendario();
    this.disegnaOrari();
  }

  disegnaOrari() {
    const label = this.q('[data-bk-slots-label]');
    const box = this.q('[data-bk-slots]');
    if (!this.data) {
      label.textContent = t('Scegli un giorno per vedere gli orari');
      box.replaceChildren();
    } else {
      label.textContent = t('Orari di {data}', { data: dataLunga(this.data) });
      box.replaceChildren(...this.orariDi(this.data).map((h, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bk__slot';
        b.style.setProperty('--k', String(k));
        b.textContent = h;
        b.setAttribute('aria-pressed', String(h === this.ora));
        b.addEventListener('click', () => {
          this.ora = h;
          box.querySelectorAll('.bk__slot').forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
          this.q('[data-bk-next]').disabled = false;
        });
        return b;
      }));
    }
    this.q('[data-bk-next]').disabled = !(this.data && this.ora);
  }

  /* ------------------------------------------------------------------- invio */

  /** @param {string} testo la frase italiana ('' toglie l'errore) */
  errore(nome, testo) {
    if (testo) this.errori[nome] = testo; else delete this.errori[nome];
    const e = this.el.querySelector(`[data-err="${nome}"]`);
    if (e) e.textContent = t(testo);
    const campo = this.form.elements[nome];
    if (campo && campo.setAttribute) campo.setAttribute('aria-invalid', String(!!testo));
  }

  valida() {
    const f = this.form.elements;
    const v = (n) => f[n].value.trim();
    const errori = {};
    if (v('nome').length < 3) errori.nome = 'Scrivi nome e cognome.';
    if (v('telefono').replace(/[^\d]/g, '').length < 8) errori.telefono = 'Serve un numero valido.';
    if (v('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errori.email = 'Indirizzo non valido.';
    if (v('auto').length < 2) errori.auto = 'Indica almeno il modello.';
    if (!f.privacy.checked) errori.privacy = 'Conferma di aver letto l’informativa.';
    CAMPI.forEach((n) => this.errore(n, errori[n] || ''));
    const primo = Object.keys(errori)[0];
    if (primo && f[primo].focus) f[primo].focus({ preventScroll: true });
    return !primo;
  }

  async invia() {
    if (!this.valida()) return;
    const f = this.form.elements;
    const richiesta = {
      servizi: this.scelta.map((s) => ({ categoria: s.categoria, nome: s.nome })),
      data: `${this.data.getFullYear()}-${String(this.data.getMonth() + 1).padStart(2, '0')}-${String(this.data.getDate()).padStart(2, '0')}`,
      ora: this.ora,
      nome: f.nome.value.trim(),
      telefono: f.telefono.value.trim(),
      email: f.email.value.trim() || null,
      auto: f.auto.value.trim(),
      note: f.note.value.trim() || null,
    };

    const btn = this.q('[data-bk-send]');
    btn.disabled = true;
    try {
      if (this.cfg.endpoint) {
        const r = await fetch(this.cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(richiesta),
        });
        if (!r.ok) throw new Error('HTTP ' + r.status);
      }
      // Con o senza endpoint, la richiesta esce anche come evento: e' il punto
      // a cui agganciare un invio diverso (email, WhatsApp, gestionale).
      document.dispatchEvent(new CustomEvent('prenotazione', { detail: richiesta }));
    } catch (err) {
      this.errore('privacy', 'Invio non riuscito. Riprova o chiamaci.');
      btn.disabled = false;
      return;
    }
    btn.disabled = false;

    this.inviata = { nome: richiesta.nome.split(/\s+/)[0], telefono: richiesta.telefono, data: this.data, ora: this.ora };
    this.scriviConferma();
    this.vaiA(3);
    // La scelta si svuota: la prossima prenotazione riparte da zero. Il pannello
    // resta visibile sulla conferma (vedi `aggiorna`).
    this.servizi.svuota();
  }

  scriviConferma() {
    const r = this.inviata;
    if (!r) return;
    this.q('[data-bk-done]').textContent = t(
      'Grazie {nome}. Ti ricontatteremo al {telefono} per confermare l’appuntamento di {data} alle {ora}.',
      { nome: r.nome, telefono: r.telefono, data: dataLunga(r.data), ora: r.ora });
  }
}
