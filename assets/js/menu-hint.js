/**
 * Avviso delle voci di menu.
 *
 * La pagina si percorre scorrendo: le voci del menu dicono dove ci si trova,
 * ma non portano da nessuna parte. Invece di un click morto, un click su una
 * voce sfoca tutta la pagina e mostra al centro "Scorri per esplorare".
 *
 * Il primo gesto dell'utente ritira l'avviso: scroll, swipe, un tasto o un
 * click. Gli ascoltatori sono in fase di cattura e non fermano l'evento, quindi
 * uno scroll ritira il velo E fa il passo, esattamente come l'avviso invita a
 * fare.
 *
 * Se in quel momento la pagina non puo' scorrere in nessuna direzione (luce
 * spenta, auto ridipinta, transizione in corso) l'avviso non compare: direbbe
 * una cosa falsa.
 */
const GESTI = ['wheel', 'touchstart', 'keydown', 'pointerdown'];

export class MenuHint {
  /**
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {Document|HTMLElement} root
   */
  constructor(machine, root = document) {
    this.machine = machine;
    this.el = root.querySelector('[data-hint]');
    this.voci = [...root.querySelectorAll('[data-menu-item]')];
    this.aperto = false;
    this.ritira = this.ritira.bind(this);
  }

  attach() {
    if (!this.el) return;
    for (const v of this.voci) {
      v.addEventListener('click', (e) => {
        e.preventDefault();                 // href="#": niente salto in cima
        this.mostra();
      });
    }
  }

  mostra() {
    if (this.aperto) return;
    if (!this.machine.canGo(1) && !this.machine.canGo(-1)) return;
    this.aperto = true;
    this.el.hidden = false;
    // Un fotogramma a sfocatura zero, poi l'attributo che la fa crescere.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.aperto) this.el.dataset.open = 'true';
    }));
    // Dopo il click che l'ha aperto, non durante: altrimenti lo stesso click
    // lo richiuderebbe subito.
    setTimeout(() => {
      if (!this.aperto) return;
      GESTI.forEach((t) => document.addEventListener(t, this.ritira, { capture: true, passive: true }));
    }, 0);
  }

  ritira() {
    if (!this.aperto) return;
    this.aperto = false;
    GESTI.forEach((t) => document.removeEventListener(t, this.ritira, { capture: true }));
    this.el.dataset.open = 'false';
    const ms = parseFloat(getComputedStyle(this.el).transitionDuration) * 1000 || 0;
    setTimeout(() => { if (!this.aperto) this.el.hidden = true; }, ms + 40);
  }
}
