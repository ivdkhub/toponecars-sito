/**
 * Controller di input: rotellina, trackpad, swipe, frecce, PageUp/PageDown.
 *
 * Il punto delicato e' l'inerzia del trackpad. Un solo colpo di dita genera
 * decine di eventi wheel in sequenza: se ogni evento facesse un passo si
 * salterebbero tre scene invece di una. Qui un "gesto" resta aperto finche' gli
 * eventi continuano ad arrivare piu' fitti di gestureSilenceMs; si agisce solo
 * sul PRIMO evento di un gesto nuovo, cioe' dopo una pausa di silenzio.
 *
 * Gli eventi che arrivano durante una transizione vengono scartati e non messi
 * in coda: il loro unico effetto e' tenere aperto il gesto in corso, cosi' che
 * la coda dell'inerzia non faccia partire un secondo passo appena il video
 * finisce.
 */
export class InputController {
  /**
   * @param {object} config CONFIG risolto
   * @param {(dir: 1|-1, source: string) => void} onStep
   * @param {Document|HTMLElement} target
   */
  constructor(config, onStep, target = document) {
    this.config = config;
    this.onStep = onStep;
    this.target = target;
    this.lastWheelAt = -Infinity;
    this.touch = null;
    this.bound = [];
    this.stats = { wheelEvents: 0, wheelGestures: 0, keys: 0, swipes: 0 };

    this.onWheel = this.onWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchCancel = this.onTouchCancel.bind(this);
    this.onKey = this.onKey.bind(this);
  }

  attach() {
    if (this.bound.length) return;
    this.listen(this.target, 'wheel', this.onWheel, { passive: false });
    this.listen(this.target, 'touchstart', this.onTouchStart, { passive: true });
    this.listen(this.target, 'touchmove', this.onTouchMove, { passive: false });
    this.listen(this.target, 'touchend', this.onTouchEnd, { passive: true });
    this.listen(this.target, 'touchcancel', this.onTouchCancel, { passive: true });
    this.listen(window, 'keydown', this.onKey, { passive: false });
  }

  detach() {
    this.bound.forEach(([el, type, fn, opts]) => el.removeEventListener(type, fn, opts));
    this.bound.length = 0;
  }

  listen(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    this.bound.push([el, type, fn, opts]);
  }

  /* ------------------------------------------------------ rotellina e trackpad */

  onWheel(e) {
    e.preventDefault();                       // la pagina non scorre mai
    const magnitude = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(magnitude) < 1) return;      // rumore: non apre ne' tiene aperto un gesto

    this.stats.wheelEvents += 1;
    const now = performance.now();
    const gap = now - this.lastWheelAt;
    // Va aggiornato SEMPRE, anche quando l'evento viene scartato: e' cosi' che la
    // coda di inerzia resta parte dello stesso gesto invece di aprirne uno nuovo.
    this.lastWheelAt = now;

    if (gap < this.config.gestureSilenceMs) return;

    this.stats.wheelGestures += 1;
    this.onStep(magnitude > 0 ? 1 : -1, 'wheel');
  }

  /* ------------------------------------------------------------------- touch */

  onTouchStart(e) {
    if (e.touches.length !== 1) { this.touch = null; return; }
    this.touch = { y0: e.touches[0].clientY, dy: 0 };
  }

  onTouchMove(e) {
    if (!this.touch) return;
    e.preventDefault();
    this.touch.dy = e.touches[0].clientY - this.touch.y0;
  }

  onTouchEnd() {
    const t = this.touch;
    this.touch = null;
    if (!t || Math.abs(t.dy) < this.config.swipeThresholdPx) return;
    this.stats.swipes += 1;
    // Swipe verso l'alto = si avanza, esattamente come uno scroll verso il basso.
    this.onStep(t.dy < 0 ? 1 : -1, 'swipe');
  }

  onTouchCancel() { this.touch = null; }

  /* --------------------------------------------------------------- tastiera */

  onKey(e) {
    // e.repeat escluso: tenere premuto un tasto non e' un gesto ripetuto.
    if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    let dir = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') dir = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') dir = -1;
    if (!dir) return;
    e.preventDefault();
    this.stats.keys += 1;
    this.onStep(dir, 'key');
  }
}
