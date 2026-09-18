/**
 * Macchina a stati delle scene.
 *
 * Quattro stati di riposo, tre transizioni in mezzo. Un passo alla volta: non si
 * salta nessuna scena e, mentre una transizione e' in corso, ogni richiesta viene
 * SCARTATA, non messa in coda (un gesto che arriva a meta' video non deve
 * accumularsi e far partire un secondo passo alla fine).
 *
 * Espone lo stato corrente sugli attributi data- di <html> ed emette su document
 * gli eventi scenechange / transitionstart / transitionend.
 */
export class SceneMachine extends EventTarget {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./video-player.js').VideoPlayer} player
   */
  constructor(config, player) {
    super();
    this.config = config;
    this.player = player;
    this.index = 0;
    this.state = 'boot';
    this.direction = 0;
    this.busy = false;
    this.root = document.documentElement;
  }

  get scene() { return this.config.scenes[this.index]; }
  get count() { return this.config.scenes.length; }
  get isBusy() { return this.busy; }

  canGo(dir) {
    const next = this.index + dir;
    return !this.busy && next >= 0 && next < this.count;
  }

  /**
   * Stato iniziale. Di norma la scena 0, ferma sul primo fotogramma della
   * transizione 0; il parametro serve al confronto al pixel, che deve poter
   * fotografare una scena qualsiasi senza attraversare tutte le transizioni.
   */
  async boot(index = 0) {
    this.index = Math.max(0, Math.min(this.count - 1, index));
    this.#syncRoot();
    await this.player.settleAt(this.index);
    this.state = 'idle';
    this.direction = 0;
    this.#syncRoot();
    this.#emit('scenechange', { index: this.index, scene: this.scene, direction: 0, reason: 'boot' });
  }

  /**
   * Esegue un passo. Ritorna false se il passo non era possibile: e' il caso dei
   * blocchi su prima e ultima scena e degli eventi arrivati durante una
   * transizione.
   */
  async step(dir, reason = 'input') {
    if (!this.canGo(dir)) return false;

    const from = this.index;
    const to = from + dir;
    const transition = dir > 0 ? from : to;   // la transizione i sta fra le scene i e i+1

    this.busy = true;
    this.state = 'transitioning';
    this.direction = dir;
    this.#syncRoot();
    this.#emit('transitionstart', {
      from, to, direction: dir, transition, reason,
      scene: this.config.scenes[from], nextScene: this.config.scenes[to],
    });

    try {
      await this.player.run(transition, dir, to);
    } finally {
      this.index = to;
      this.state = 'idle';
      this.busy = false;
      this.#syncRoot();
      this.#emit('transitionend', {
        from, to, direction: dir, transition, reason, scene: this.scene,
      });
      this.#emit('scenechange', {
        index: to, scene: this.scene, direction: dir, reason,
      });
    }
    return true;
  }

  #syncRoot() {
    const r = this.root;
    r.dataset.scene = String(this.index);
    r.dataset.sceneId = this.scene ? this.scene.id : '';
    r.dataset.state = this.state;
    r.dataset.direction = this.direction === 0 ? 'none' : (this.direction > 0 ? 'forward' : 'backward');
    r.dataset.first = String(this.index === 0);
    r.dataset.last = String(this.index === this.count - 1);
  }

  #emit(type, detail) {
    const ev = new CustomEvent(type, { detail, bubbles: true });
    document.dispatchEvent(ev);
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
