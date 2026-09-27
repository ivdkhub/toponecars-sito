/**
 * Effetto "ParallaxCard" su tutte le card del sito: la card si inclina in 3D
 * verso il puntatore e torna piana quando il puntatore esce. E' l'effetto
 * delle card del sito Valenzani Motors (components/ParallaxCard.tsx), qui in
 * JavaScript semplice e per delega: vale anche per le card che gli script
 * costruiscono dopo (recensioni, noleggio).
 *
 * Perche' `rotate` e non `transform`. Le card usano gia' `transform` per
 * entrare e uscire con il blocco ([data-anim], la card dei contenuti) e
 * `translate` per galleggiare (le recensioni). La proprieta' indipendente
 * `rotate` si compone con entrambe invece di sovrascriverle. Per lo stesso
 * motivo l'inclinazione non e' una transizione CSS (ogni card ha le sue):
 * la muove un piccolo ciclo a fotogrammi, attivo solo finche' c'e' movimento.
 *
 * La prospettiva sta sul genitore della card, con l'origine sul centro della
 * card inclinata, e si toglie quando la card e' tornata piana.
 *
 * Solo col mouse: su un touch non c'e' un puntatore da seguire. Niente
 * effetto con prefers-reduced-motion.
 */

const CARD = '.b1__card, .rv__card, .cnt, .vt, .nl__card';
/** Inclinazione massima per una card larga fino a 320 unita' (come Valenzani);
 *  le card piu' grandi si inclinano meno, o gli angoli sporgerebbero troppo. */
const MAX_DEG = 6;
const RIF_LARGHEZZA = 320;
/** Prospettiva, in unita' di design (Valenzani: 1000 px). */
const PROSPETTIVA = 1000;
/** Inseguimento per fotogramma: rapido verso il puntatore, lento al ritorno. */
const SEGUI = 0.2;
const RITORNA = 0.09;

export class ParallaxCards {
  constructor(root = document) {
    this.root = root;
    this.stati = new Map();   // card -> { tx, ty, x, y, attiva }
    this.corrente = null;
    this.raf = 0;
    this.tick = this.tick.bind(this);
  }

  attach() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.root.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const card = e.target instanceof Element ? e.target.closest(CARD) : null;
      if (card !== this.corrente) this.lascia();
      if (!card) return;
      this.corrente = card;
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      const s = this.stato(card);
      const max = MAX_DEG * Math.min(1, (RIF_LARGHEZZA * scala()) / r.width);
      // Come ParallaxCard: il bordo sotto il puntatore si abbassa.
      s.tx = -y * 2 * max;   // rotazione attorno all'asse X
      s.ty = x * 2 * max;    // rotazione attorno all'asse Y
      s.attiva = true;
      card.dataset.tilt = 'true';
      // Per il riflesso delle card che ne hanno uno (noleggio).
      card.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
      this.prospettiva(card, r);
      this.avvia();
    }, { passive: true });
    this.root.addEventListener('pointerleave', () => this.lascia());
    window.addEventListener('blur', () => this.lascia());
  }

  stato(card) {
    let s = this.stati.get(card);
    if (!s) { s = { tx: 0, ty: 0, x: 0, y: 0, attiva: false }; this.stati.set(card, s); }
    return s;
  }

  lascia() {
    const card = this.corrente;
    this.corrente = null;
    if (!card) return;
    const s = this.stati.get(card);
    if (s) { s.tx = 0; s.ty = 0; s.attiva = false; }
    delete card.dataset.tilt;
    this.avvia();
  }

  prospettiva(card, r) {
    const p = card.parentElement;
    if (!p) return;
    const pr = p.getBoundingClientRect();
    p.style.perspective = `${PROSPETTIVA * scala()}px`;
    p.style.perspectiveOrigin = `${r.left - pr.left + r.width / 2}px ${r.top - pr.top + r.height / 2}px`;
  }

  avvia() {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  tick() {
    this.raf = 0;
    let ancora = false;
    for (const [card, s] of this.stati) {
      const k = s.attiva ? SEGUI : RITORNA;
      s.x += (s.tx - s.x) * k;
      s.y += (s.ty - s.y) * k;
      const ferma = Math.abs(s.tx - s.x) < 0.01 && Math.abs(s.ty - s.y) < 0.01;
      if (ferma) { s.x = s.tx; s.y = s.ty; } else ancora = true;
      const angolo = Math.hypot(s.x, s.y);
      if (angolo < 0.01) {
        // Tornata piana: via rotazione e prospettiva, la card torna com'era.
        card.style.removeProperty('rotate');
        // Il genitore puo' essere condiviso (le tre schede della scena 2): la
        // prospettiva resta finche' un'altra card li' si sta muovendo.
        const p = card.parentElement;
        const altre = p && [...this.stati.keys()].some((c) => c !== card && c.parentElement === p);
        if (!s.attiva && p && !altre) {
          card.parentElement.style.removeProperty('perspective');
          card.parentElement.style.removeProperty('perspective-origin');
        }
        if (!s.attiva && ferma) this.stati.delete(card);
      } else {
        // Rotazione attorno all'asse (x, y, 0): per angoli piccoli equivale a
        // rotateX(x) seguito da rotateY(y).
        card.style.rotate = `${(s.x / angolo).toFixed(4)} ${(s.y / angolo).toFixed(4)} 0 ${angolo.toFixed(3)}deg`;
      }
    }
    if (ancora) this.avvia();
  }
}

/** --s del canvas di design, come in base.css: min(larghezza/1440, altezza/810). */
function scala() {
  return Math.min(innerWidth / 1440, innerHeight / 810);
}
