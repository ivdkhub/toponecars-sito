/**
 * Il titolo "Top One Cars" che si tinge di viola quando si spegne la luce.
 *
 * Il colore non segue un timer suo: legge la clip del buio fotogramma per
 * fotogramma ed espone quanto buio c'e' come `--buio` (da 0 a 1). Cosi' il
 * viola cresce esattamente quanto cala la luce, anche se la clip rallenta,
 * si blocca un istante in rete o viene trascinata a mano all'indietro — e al
 * ritorno della luce si ritira con la stessa curva.
 *
 * La variabile sta sul titolo e non sulla radice: aggiornarla a ogni
 * fotogramma ricalcola lo stile di due righe di testo, non della pagina intera.
 */
export class ThemeTint {
  /**
   * @param {object} config CONFIG risolto
   * @param {import('./video-player.js').VideoPlayer} player
   * @param {import('./scene-machine.js').SceneMachine} machine
   * @param {HTMLElement|null} el elemento su cui scrivere --buio
   */
  constructor(config, player, machine, el) {
    this.config = config;
    this.player = player;
    this.machine = machine;
    this.el = el;
    this.raf = 0;
    this.last = 0;
  }

  attach() {
    if (!this.el) return;
    document.addEventListener('themestart', (e) => { if (e.detail) this.segui(); });
    document.addEventListener('themeend', (e) => { if (e.detail) this.ferma(); });
    this.scrivi(this.statoFinale());
  }

  /** 1 a luce spenta, 0 a luce accesa: il valore a clip ferma. */
  statoFinale() {
    const spec = this.machine.variantSpec('theme');
    return spec && this.machine.variants.theme !== spec.base ? 1 : 0;
  }

  segui() {
    cancelAnimationFrame(this.raf);
    const opzioni = (this.player.variants.theme || {}).options || {};
    const tick = () => {
      const v = this.player.visible;
      for (const o of Object.values(opzioni)) {
        const d = v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
        if (!d) break;
        // La clip in avanti va dalla luce al buio; quella riavvolta dal buio
        // alla luce. Il trascinamento all'indietro usa la clip in avanti, quindi
        // ricade nel primo caso senza bisogno di saperlo.
        if (v === o.fwd) { this.scrivi(v.currentTime / d); break; }
        if (v === o.rev) { this.scrivi(1 - v.currentTime / d); break; }
      }
      // Nei pochi fotogrammi in cui e' visibile un'altra clip (la dissolvenza di
      // raccordo) il valore resta l'ultimo letto: nessun salto.
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  ferma() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.scrivi(this.statoFinale());
  }

  scrivi(p) {
    const x = Math.min(1, Math.max(0, p));
    if (x === this.last && this.el.style.getPropertyValue('--buio')) return;
    this.last = x;
    this.el.style.setProperty('--buio', x.toFixed(4));
  }
}
