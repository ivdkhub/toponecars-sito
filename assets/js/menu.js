/**
 * Evidenziazione della voce di menu corrispondente alla scena.
 *
 * Il vincolo che comanda tutto: il menu non deve spostarsi di un pixel al cambio
 * di scena. Per questo l'evidenziazione NON e' uno sfondo applicato alla voce —
 * darle uno sfondo significherebbe darle anche un'imbottitura, e l'intera barra
 * si riassesterebbe. E' invece una "pastiglia" posizionata in modo assoluto
 * DIETRO le voci, che scivola da una all'altra: il flusso resta intatto e si
 * muove soltanto una decorazione.
 *
 * La pastiglia si misura sul riquadro del TESTO, non su quello dell'elemento:
 * i collegamenti sono testo nudo mentre i bottoni hanno gia' la loro imbottitura,
 * e prendendo il testo si ottiene la stessa pastiglia per tutti. Con il valore di
 * imbottitura misurato sul mockup, la voce "Vieni a trovarci" riproduce
 * esattamente la pastiglia che ha nel mockup.
 */
export class MenuHighlight {
  /**
   * @param {object} config CONFIG risolto
   * @param {HTMLElement} menu la barra
   */
  constructor(config, menu) {
    this.config = config;
    this.menu = menu;
    this.pill = menu ? menu.querySelector('[data-menu-pill]') : null;
    this.items = menu ? [...menu.querySelectorAll('[data-menu-item]')] : [];
    this.current = null;
    this.observer = null;
  }

  attach() {
    if (!this.menu || !this.pill) return;
    // Il cambio avviene all'INIZIO della transizione, insieme al contatore: il
    // menu e il numero raccontano lo stesso passaggio, quindi devono muoversi
    // nello stesso momento.
    document.addEventListener('transitionstart', (e) => {
      if (!e.detail) return;                  // scarta gli eventi CSS omonimi
      this.set(e.detail.to);
    });
    // Cambiando le proporzioni della finestra cambia --s, e con esso la
    // posizione delle voci: la pastiglia va rimisurata, non ricordata.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.reposition(true));
      this.observer.observe(this.menu);
    }
  }

  /** Indice della voce associata a una scena, o null se non ce n'e' una. */
  itemOf(sceneIndex) {
    const scene = this.config.scenes[sceneIndex];
    if (!scene) return null;
    const i = scene.menuItem;
    return Number.isInteger(i) && this.items[i] ? i : null;
  }

  set(sceneIndex) {
    const next = this.itemOf(sceneIndex);
    if (next === this.current) return;
    this.current = next;
    this.items.forEach((el, i) => {
      if (i === next) el.setAttribute('data-current', '');
      else el.removeAttribute('data-current');
    });
    this.reposition(false);
  }

  /**
   * @param {boolean} immediate true quando si sta solo rimisurando (ridimensiona-
   *   mento della finestra): in quel caso la pastiglia non deve scivolare.
   */
  reposition(immediate) {
    const el = this.current === null ? null : this.items[this.current];
    if (!el) {
      this.pill.dataset.on = 'false';
      return;
    }
    const menuBox = this.menu.getBoundingClientRect();
    const textBox = this.textRect(el);
    if (!textBox) return;

    const s = this.unit();
    const pad = (this.config.menuPillPadding ?? 6.84) * s;
    // La pastiglia avvolge il testo, ma non puo' risultare piu' stretta del
    // riquadro della voce: "Test Drive" ha gia' un suo bottone piu' largo del
    // testo, e una pastiglia piu' piccola gli starebbe dentro invece di
    // evidenziarlo. Sulle voci di solo testo vince l'imbottitura, su "Vieni a
    // trovarci" le due misure coincidono gia'.
    const itemBox = el.getBoundingClientRect();
    let left = textBox.left - menuBox.left - pad;
    let width = textBox.width + pad * 2;
    const itemLeft = itemBox.left - menuBox.left;
    if (itemBox.width > width) {
      left = itemLeft;
      width = itemBox.width;
    }

    this.pill.style.transitionDuration = immediate ? '0ms' : '';
    this.pill.style.setProperty('--pill-x', left.toFixed(2) + 'px');
    this.pill.style.setProperty('--pill-w', width.toFixed(2) + 'px');
    this.pill.dataset.on = 'true';
    if (immediate) {
      // forza l'applicazione prima di restituire la durata normale
      void this.pill.offsetWidth;
      this.pill.style.transitionDuration = '';
    }
  }

  /** Riquadro del solo testo della voce, imbottitura esclusa. */
  textRect(el) {
    const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) return el.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(node);
    const box = r.getBoundingClientRect();
    return box.width ? box : el.getBoundingClientRect();
  }

  /** Valore corrente di --s, in pixel. */
  unit() {
    const probe = getComputedStyle(this.menu).getPropertyValue('--s-px');
    const v = parseFloat(probe);
    if (Number.isFinite(v) && v > 0) return v;
    // ripiego: si ricava dall'altezza nota della barra
    return this.menu.getBoundingClientRect().height / 45.59;
  }
}
