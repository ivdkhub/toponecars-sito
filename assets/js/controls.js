/**
 * I due comandi visibili della pagina: la lampadina del tema e l'invito a
 * scorrere.
 *
 * Nessuno dei due decide alcunche' da solo. Chiedono alla macchina a stati se la
 * cosa e' possibile e, se non lo e', si limitano a non proporla: e' la stessa
 * regola dello scroll, dove un passo impossibile viene scartato e non messo in
 * coda. Cosi' l'interfaccia non promette mai qualcosa che la pagina in quel
 * momento rifiuterebbe.
 */

/**
 * La lampadina: spegne e riaccende la luce sulla scena che lo prevede.
 *
 * Vive dentro il blocco, quindi compare e scompare con esso senza che questa
 * classe debba occuparsene. A luce spenta resta l'unico comando attivo della
 * pagina, perche' la navigazione fra le scene e' sospesa: e' anche la ragione
 * per cui a tema scuro si colora di giallo.
 */
export class ThemeSwitch {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {Document|HTMLElement} root
   */
  constructor(config, machine, root = document) {
    this.config = config;
    this.machine = machine;
    this.el = root.querySelector('[data-lamp]');
    this.etichette = { chiaro: 'Spegni le luci', scuro: 'Accendi le luci' };
  }

  attach() {
    if (!this.el) return;
    this.el.addEventListener('click', () => this.toggle());
    // Il controllo su detail distingue i nostri CustomEvent dagli eventi CSS
    // omonimi che risalgono fino a document. 'scenechange' e' compreso perche'
    // arriva anche al termine del boot: senza di esso, una pagina aperta
    // direttamente sulla scena della lampadina la troverebbe ancora spenta.
    for (const [type, busy] of [['themestart', true], ['transitionstart', true],
                                ['themeend', false], ['transitionend', false],
                                ['scenechange', false]]) {
      document.addEventListener(type, (e) => { if (e.detail) this.sync(busy); });
    }
    this.sync(false);
  }

  toggle() {
    if (!this.machine.canToggleTheme()) return false;
    this.machine.toggleTheme('lampadina');
    return true;
  }

  /**
   * Allinea il comando allo stato della macchina.
   *
   * `data-on` decide se si vede: la lampadina esiste solo dove e' azionabile, e
   * durante una transizione non lo e'. A luce spenta pero' deve restare visibile
   * comunque, altrimenti sparirebbe l'unico modo per riaccenderla.
   */
  sync(busy = false) {
    if (!this.el) return;
    const tema = this.machine.theme;
    const azionabile = this.machine.canToggleTheme();
    this.el.dataset.on = String(azionabile || tema === 'scuro');
    this.el.disabled = busy || !azionabile;
    this.el.setAttribute('aria-pressed', String(tema === 'scuro'));
    this.el.setAttribute('aria-label', this.etichette[tema] || this.etichette.chiaro);
  }
}

/**
 * L'invito a scorrere, in basso al centro.
 *
 * Si mostra esattamente quando un passo avanti e' possibile: `canGo(1)` e' gia'
 * falso durante una transizione, sull'ultima scena e a luce spenta, quindi non
 * serve nessun'altra condizione. Cliccarlo vale uno scroll.
 */
export class ScrollCue {
  /**
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {(dir: 1|-1, source: string) => void} onStep
   * @param {Document|HTMLElement} root
   */
  constructor(machine, onStep, root = document) {
    this.machine = machine;
    this.onStep = onStep;
    this.el = root.querySelector('[data-scrollcue]');
  }

  attach() {
    if (!this.el) return;
    this.el.addEventListener('click', () => this.onStep(1, 'scrollcue'));
    for (const type of ['transitionstart', 'transitionend', 'themestart', 'themeend', 'scenechange']) {
      document.addEventListener(type, (e) => { if (e.detail) this.sync(); });
    }
    this.sync();
  }

  sync() {
    if (!this.el) return;
    this.el.dataset.on = String(this.machine.canGo(1));
  }
}
