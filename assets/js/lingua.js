/**
 * Scelta della lingua con le bandierine nella barra del menu, sul modello del
 * sito DitchWich.
 *
 * La traduzione vera la fa i18n.js: qui si mostra quale lingua e' attiva e,
 * al click, la si cambia. La lingua ricordata dal browser e' gia' applicata
 * quando questo comando si aggancia (avviaLingua, in main.js).
 */
import { lingua, impostaLingua } from './i18n.js';

export class SceltaLingua {
  /** @param {Document|HTMLElement} root */
  constructor(root = document) {
    this.el = root.querySelector('[data-lang]');
    this.bottoni = this.el ? [...this.el.querySelectorAll('[data-lang-code]')] : [];
  }

  attach() {
    if (!this.el) return;
    this.mostra();
    this.bottoni.forEach((b) => b.addEventListener('click', () => this.scegli(b.dataset.langCode)));
    document.addEventListener('linguachange', () => this.mostra());
  }

  scegli(codice) {
    impostaLingua(codice);
  }

  mostra() {
    const l = lingua();
    this.bottoni.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langCode === l)));
  }
}
