/**
 * I comandi visibili della pagina: la lampadina, la vernice e l'invito a
 * scorrere.
 *
 * Nessuno di loro decide alcunche' da solo. Chiedono alla macchina a stati se la
 * cosa e' possibile e, se non lo e', si limitano a non proporla: e' la stessa
 * regola dello scroll, dove un passo impossibile viene scartato e non messo in
 * coda. Cosi' l'interfaccia non promette mai qualcosa che la pagina in quel
 * momento rifiuterebbe.
 *
 * Lampadina e vernice sono due facce della stessa cosa — due varianti della
 * scena 2, dichiarate in config.js — e si escludono a vicenda: la clip del buio
 * riprende un'auto rossa, quella della vernice un'auto illuminata, quindi
 * attivarle insieme mostrerebbe un salto. La macchina lo impedisce; qui i due
 * comandi si limitano a sparire quando non sono azionabili.
 */

/** Base comune: un comando legato a una variante della scena. */
class VariantControl {
  constructor(machine, key, el) {
    this.machine = machine;
    this.key = key;
    this.el = el;
  }

  /** Vero se il comando va mostrato: azionabile, oppure gia' attivo — e in quel
   *  caso e' l'unica via d'uscita, quindi deve restare li'. */
  get visibile() {
    return this.machine.canToggleVariant(this.key) || this.machine.variantAttiva(this.key);
  }

  /**
   * Gli eventi dopo i quali lo stato del comando puo' essere cambiato. Il
   * controllo su `detail` distingue i nostri CustomEvent dagli eventi CSS
   * omonimi che risalgono fino a document; 'scenechange' e' compreso perche'
   * arriva anche al termine del boot, e senza di esso una pagina aperta
   * direttamente sulla scena della variante troverebbe i comandi spenti.
   */
  ascolta() {
    for (const [type, busy] of [['variantstart', true], ['transitionstart', true],
                                ['variantend', false], ['transitionend', false],
                                ['scenechange', false]]) {
      document.addEventListener(type, (e) => { if (e.detail) this.sync(busy); });
    }
  }
}

/**
 * La lampadina: spegne e riaccende la luce sulla scena che lo prevede.
 *
 * Ha una sola opzione, quindi e' un interruttore: un click e si passa all'altro
 * stato. Lo stato lo dice il disegno — i raggi ci sono a luce spenta, cioe'
 * quando serve riaccenderla — e a luce spenta resta uno dei due soli comandi
 * attivi della pagina, perche' li' la navigazione fra le scene e' sospesa.
 */
export class ThemeSwitch extends VariantControl {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {Document|HTMLElement} root
   */
  constructor(config, machine, root = document) {
    super(machine, 'theme', root.querySelector('[data-lamp]'));
    this.config = config;
    this.etichette = { chiaro: 'Spegni le luci', scuro: 'Accendi le luci' };
  }

  attach() {
    if (!this.el) return;
    this.el.addEventListener('click', () => this.toggle());
    this.ascolta();
    this.sync(false);
  }

  toggle() {
    const spec = this.machine.variantSpec('theme');
    if (!spec || !this.machine.canToggleVariant('theme')) return false;
    const acceso = this.machine.variants.theme === spec.base;
    this.machine.setVariant('theme', acceso ? spec.options[0].id : null, 'lampadina');
    return true;
  }

  sync(busy = false) {
    if (!this.el) return;
    const stato = this.machine.variants.theme;
    this.el.dataset.on = String(this.visibile);
    this.el.disabled = busy || !this.machine.canToggleVariant('theme');
    this.el.setAttribute('aria-pressed', String(this.machine.variantAttiva('theme')));
    this.el.setAttribute('aria-label', this.etichette[stato] || this.etichette.chiaro);
  }
}

/**
 * La vernice: cambia il colore dell'auto.
 *
 * A differenza della lampadina puo' avere piu' di un colore, quindi non e' un
 * interruttore ma un elenco: si apre, si sceglie, si chiude. Le voci vengono
 * costruite da `config.variants.paint` — il colore ordinario piu' una per
 * opzione — cosi' aggiungerne uno significa aggiungere una clip e una riga di
 * configurazione, non toccare questo file.
 */
export class PaintPicker extends VariantControl {
  constructor(config, machine, root = document) {
    // L'attributo si chiama data-paint-control e non data-paint: lo stato della
    // variante vive gia' su <html> come data-paint, e un selettore [data-paint]
    // finirebbe per pescare l'elemento radice invece del comando.
    super(machine, 'paint', root.querySelector('[data-paint-control]'));
    this.config = config;
    this.btn = this.el ? this.el.querySelector('[data-paint-toggle]') : null;
    this.menu = this.el ? this.el.querySelector('[data-paint-menu]') : null;
    this.voci = [];
  }

  get spec() { return this.machine.variantSpec('paint'); }

  attach() {
    if (!this.el || !this.btn || !this.menu || !this.spec) return;
    this.costruisciMenu();

    this.btn.addEventListener('click', () => this.apriChiudi());
    // Un click fuori chiude l'elenco, come ci si aspetta da un menu.
    document.addEventListener('click', (e) => {
      if (!this.el.contains(e.target)) this.chiudi();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.chiudi();
    });
    // Mentre un video scorre l'elenco non ha senso di restare aperto.
    for (const type of ['variantstart', 'transitionstart']) {
      document.addEventListener(type, (e) => { if (e.detail) this.chiudi(); });
    }
    this.ascolta();
    this.sync(false);
  }

  /** Una voce per il colore ordinario, piu' una per ogni opzione. */
  costruisciMenu() {
    const spec = this.spec;
    const voci = [
      { id: spec.base, label: spec.baseLabel || spec.base, swatch: spec.baseSwatch },
      ...spec.options.map((o) => ({ id: o.id, label: o.label || o.id, swatch: o.swatch })),
    ];
    this.menu.replaceChildren();
    this.voci = voci.map((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'paint__opt';
      b.dataset.paintOption = v.id;
      const pallino = document.createElement('span');
      pallino.className = 'paint__swatch';
      if (v.swatch) pallino.style.background = v.swatch;
      const testo = document.createElement('span');
      testo.className = 'paint__label';
      testo.textContent = v.label;
      b.append(pallino, testo);
      b.addEventListener('click', () => this.scegli(v.id));
      this.menu.appendChild(b);
      return b;
    });
  }

  scegli(id) {
    const spec = this.spec;
    this.chiudi();
    if (id === this.machine.variants.paint) return false;
    // null significa "torna al colore ordinario": la macchina riproduce al
    // contrario la clip del colore attuale.
    return this.machine.setVariant('paint', id === spec.base ? null : id, 'vernice');
  }

  apriChiudi() {
    if (this.menu.hidden) this.apri(); else this.chiudi();
  }

  apri() {
    if (!this.machine.canToggleVariant('paint')) return;
    this.menu.hidden = false;
    this.btn.setAttribute('aria-expanded', 'true');
  }

  chiudi() {
    if (!this.menu || this.menu.hidden) return;
    this.menu.hidden = true;
    this.btn.setAttribute('aria-expanded', 'false');
  }

  sync(busy = false) {
    if (!this.el || !this.spec) return;
    const stato = this.machine.variants.paint;
    const azionabile = this.machine.canToggleVariant('paint');
    this.el.dataset.on = String(this.visibile);
    this.btn.disabled = busy || !azionabile;
    if (!azionabile) this.chiudi();
    for (const b of this.voci) {
      b.dataset.current = String(b.dataset.paintOption === stato);
    }
  }
}

/**
 * L'invito a scorrere, in basso al centro.
 *
 * Si mostra esattamente quando un passo avanti e' possibile: `canGo(1)` e' gia'
 * falso durante una transizione, sull'ultima scena e da qualunque variante — luci
 * spente o auto ridipinta — quindi non serve nessun'altra condizione. Cliccarlo
 * vale uno scroll.
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
    for (const type of ['transitionstart', 'transitionend', 'variantstart', 'variantend', 'scenechange']) {
      document.addEventListener(type, (e) => { if (e.detail) this.sync(); });
    }
    this.sync();
  }

  sync() {
    if (!this.el) return;
    this.el.dataset.on = String(this.machine.canGo(1));
  }
}
