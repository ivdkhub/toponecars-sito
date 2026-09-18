/**
 * Collegamento fra blocchi di design e scene, piu' il contatore dei blocchi.
 *
 * Regola di visualizzazione: il contenuto di un blocco compare SOLO quando la
 * transizione video e' finita, e sparisce con una breve animazione coordinata
 * appena ne comincia un'altra. E' il "cambio pagina" fra un blocco e l'altro.
 *
 * I blocchi restano sempre nel DOM: non vengono creati e distrutti. Cosi' il
 * confronto al pixel e' deterministico e il browser non ricalcola i layout a
 * ogni scena.
 */

export class BlockBinder {
  /**
   * @param {object} config CONFIG risolto
   * @param {Document|ShadowRoot} root
   */
  constructor(config, root = document) {
    this.config = config;
    this.root = root;
    this.blocks = new Map();
    for (const scene of config.scenes) {
      if (!scene.block) continue;
      const el = root.getElementById(scene.block);
      if (el) this.blocks.set(scene.block, el);
    }
    this.current = null;
    this.exitTimer = 0;
  }

  attach() {
    // Attenzione: 'transitionstart' e 'transitionend' sono anche eventi CSS
    // nativi che risalgono fino a document. I nostri sono CustomEvent con
    // detail: il controllo su detail distingue i due senza rinominare gli eventi
    // richiesti dalla specifica.
    document.addEventListener('transitionstart', (e) => {
      if (!e.detail) return;
      this.hide();
    });
    document.addEventListener('transitionend', (e) => {
      if (!e.detail) return;
      this.reveal(e.detail.to);
    });
  }

  /** Stato iniziale: tutti nascosti, tranne eventualmente quello della scena. */
  init(sceneIndex) {
    for (const el of this.blocks.values()) el.dataset.visible = 'false';
    this.current = null;
    this.reveal(sceneIndex, true);
  }

  reveal(sceneIndex, immediate = false) {
    const scene = this.config.scenes[sceneIndex];
    const el = scene && scene.block ? this.blocks.get(scene.block) : null;
    this.current = el || null;
    if (!el) return;
    if (immediate || el.dataset.visible === 'false') {
      // Gia' nello stato di partenza: si puo' accendere subito e l'animazione
      // di entrata parte comunque. Rinviare al frame successivo lascerebbe un
      // istante in cui il blocco risulta ancora nascosto a transizione finita.
      el.dataset.visible = 'true';
      return;
    }
    // Se il blocco era ancora visibile o in uscita serve un frame completo nello
    // stato nascosto, altrimenti il browser salta l'animazione di entrata.
    clearTimeout(this.exitTimer);
    el.dataset.visible = 'false';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.dataset.visible = 'true';
    }));
  }

  hide() {
    clearTimeout(this.exitTimer);
    const el = this.current;
    if (!el || el.dataset.visible === 'false') return;
    el.dataset.visible = 'exiting';
    this.exitTimer = setTimeout(() => {
      el.dataset.visible = 'false';
    }, this.config.blockExitMs);
  }
}

/**
 * Contatore dei blocchi: "01 ———".
 *
 * Dichiarato una sola volta nel markup, fuori dai blocchi. Non viene mai
 * ricreato, non partecipa alle animazioni di comparsa e non si sposta di un
 * pixel: cambiano solo la cifra (che scorre) e la lunghezza della barra, presi
 * dalla configurazione delle scene.
 */
export class SceneCounter {
  constructor(config, el) {
    this.config = config;
    this.el = el;
    this.digits = el ? el.querySelector('[data-counter-digits]') : null;
    this.bar = el ? el.querySelector('[data-counter-bar]') : null;
    this.total = el ? el.querySelector('[data-counter-total]') : null;
    this.value = null;
  }

  attach() {
    // Aggiornato all'inizio della transizione: la barra cresce mentre il video
    // scorre, cosi' il cambio di scena e il cambio di numero sono un gesto solo.
    document.addEventListener('transitionstart', (e) => {
      if (!e.detail) return;          // scarta gli eventi CSS nativi omonimi
      this.set(e.detail.to);
    });
  }

  format(n) { return String(n).padStart(2, '0'); }

  set(sceneIndex) {
    const scene = this.config.scenes[sceneIndex];
    if (!scene || !this.el) return;
    const { n, bar } = scene.counter;
    if (this.total) this.total.textContent = this.format(this.config.scenes.length);
    if (this.bar) this.bar.style.setProperty('--fill', String(bar));
    if (this.value === n) return;

    const up = this.value === null ? false : n > this.value;
    this.value = n;
    this.el.dataset.value = this.format(n);
    if (!this.digits) return;

    if (this.digits.firstElementChild && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const outgoing = this.digits.firstElementChild;
      outgoing.dataset.role = 'out';
      outgoing.dataset.dir = up ? 'up' : 'down';
      setTimeout(() => outgoing.remove(), 450);
    } else {
      this.digits.replaceChildren();
    }
    const incoming = document.createElement('span');
    incoming.className = 'counter__digit';
    incoming.dataset.role = 'in';
    incoming.dataset.dir = up ? 'up' : 'down';
    incoming.textContent = this.format(n);
    this.digits.appendChild(incoming);
    // Riavvia l'animazione di entrata anche se la classe non e' cambiata.
    requestAnimationFrame(() => { incoming.dataset.role = 'current'; });
  }
}
