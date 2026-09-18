/**
 * Player a livelli per le transizioni video.
 *
 * Idea portante: lo stato di riposo di una scena NON e' un'immagine separata, e'
 * l'elemento <video> della transizione precedente lasciato in pausa sul proprio
 * ultimo fotogramma. Cosi' la giuntura "fine transizione -> scena ferma" e'
 * esatta per costruzione, senza un solo pixel di scarto.
 *
 * Ogni clip (avanti e riavvolta) ha il suo elemento sovrapposto agli altri; solo
 * uno e' opaco. Quando il passaggio richiede di cambiare elemento si fa una
 * dissolvenza incrociata, perche' e' li' che cade il difetto del materiale
 * sorgente: il primo fotogramma di una clip non coincide con l'ultimo della
 * precedente (vedi REPORT.md).
 */

/** Margine per atterrare DENTRO l'ultimo fotogramma invece che sul confine. */
const FRAME_EPS = 0.004;

const raf = (fn) => requestAnimationFrame(fn);

function once(el, type) {
  return new Promise((resolve) => {
    const on = () => { el.removeEventListener(type, on); resolve(type); };
    el.addEventListener(type, on, { once: true });
  });
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));
}

export class VideoPlayer {
  /**
   * @param {HTMLElement} stage contenitore a schermo intero
   * @param {object} config CONFIG risolto
   */
  constructor(stage, config) {
    this.stage = stage;
    this.config = config;
    this.clips = [];
    this.visible = null;
    this.running = false;
    this.reversePreloaded = false;
    this.scene = 0;
    this.warmed = new Set();
    this.diagnostics = { rejectedPlays: 0, scrubbedRuns: 0, forcedEnds: 0, timeouts: 0, unloaded: 0 };
  }

  /**
   * Quante transizioni restano "calde" attorno alla scena corrente.
   *
   * Ogni <video> con dati caricati tiene occupato un decodificatore e qualche
   * decina di MB di superficie video. Undici elementi tutti carichi sono
   * sostenibili su un desktop e sono il modo piu' rapido per far scattare o
   * chiudere una scheda su un telefono. La finestra copre cio' che serve
   * davvero: il fotogramma di riposo che si sta guardando (clip scena-1), il
   * passo avanti (clip scena), il passo indietro (clip scena-1 riavvolta) e il
   * riposo in cui si atterrerebbe tornando indietro (clip scena-2).
   */
  static HOT_BEFORE = 2;
  static HOT_AFTER = 1;

  /* ------------------------------------------------------------------ setup */

  build() {
    this.config.transitions.forEach((spec, i) => {
      // Il poster sta SOLO sulla prima clip. E' l'unico che si vede: lo stato di
      // riposo di ogni altra scena e' un fotogramma video in pausa. Metterlo su
      // tutte significava far scaricare al browser sei immagini a fondo pagina —
      // e proprio mentre serviva banda per la clip che si sta guardando.
      const poster = i === 0 ? (spec.poster || this.config.poster) : null;
      // L'etichetta usa il numero della TRANSIZIONE (da 1) ed e' distinta dal
      // nome del file, che puo' non corrispondere: la sesta transizione, per
      // esempio, riproduce t5.rev.mp4. Chiamarle entrambe "t5" confonde e basta.
      const fwd = this.makeVideo(spec.src, poster, 'tr' + (i + 1) + '-avanti');
      const rev = spec.reverseSrc ? this.makeVideo(spec.reverseSrc, null, 'tr' + (i + 1) + '-indietro') : null;
      this.clips.push({
        spec, fwd, rev,
        in: spec.in ?? null,
        out: spec.out ?? null,
        // Ogni giuntura ha il suo difetto: chi combacia quasi non ha bisogno di
        // una dissolvenza lunga, chi non combacia per niente si'.
        seamFadeMs: spec.seamFadeMs ?? this.config.seamFadeMs,
      });
    });
  }

  makeVideo(src, poster, id) {
    const v = document.createElement('video');
    v.className = 'layer';
    v.dataset.clip = id;
    v.dataset.file = src.split('/').pop().split('?')[0];   // per non dover indovinare in console
    v.dataset.src = src;                     // per rimetterlo dopo uno scarico
    v.src = src;
    if (poster) v.poster = poster;
    v.muted = true;                 // l'audio e' gia' rimosso in transcodifica
    v.defaultMuted = true;
    v.playsInline = true;
    // preload='none' e non 'auto': undici elementi <video> che si mettono a
    // scaricare insieme esauriscono le connessioni del browser verso l'origine e
    // NESSUNO arriva a readyState utile (verificato: sei clip ferme a readyState 0
    // con networkState LOADING). Il caricamento e' quindi su richiesta, e il
    // precaricamento avviene una clip alla volta.
    v.preload = 'none';
    v.loop = false;
    v.controls = false;
    v.disablePictureInPicture = true;
    v.setAttribute('aria-hidden', 'true');
    // defaultPlaybackRate oltre a playbackRate: load(), che qui viene chiamata
    // quando la clip serve davvero, riporta playbackRate al valore predefinito.
    // Senza questa riga la velocita' tornerebbe a 1 al primo caricamento.
    v.defaultPlaybackRate = this.config.playbackRate;
    v.playbackRate = this.config.playbackRate;
    this.stage.appendChild(v);
    return v;
  }

  /**
   * Attende che una clip sia utilizzabile, ma mai oltre loadTimeoutMs: un file
   * irraggiungibile non deve congelare la navigazione per sempre.
   */
  async ready(el) {
    if (el.readyState >= 2 && Number.isFinite(el.duration)) return true;
    if (el.preload !== 'auto') {
      el.preload = 'auto';
      el.load();
      el.playbackRate = this.config.playbackRate;
    }
    const got = await Promise.race([
      once(el, 'loadeddata'),
      once(el, 'canplay'),
      once(el, 'error'),
      timeout(this.config.loadTimeoutMs),
    ]);
    if (got === 'timeout') this.diagnostics.timeouts += 1;
    return el.readyState >= 2 && Number.isFinite(el.duration);
  }

  /**
   * Ordine di probabile utilizzo a partire da una scena: prima cio' che sta
   * davanti, poi cio' che sta dietro, alternando via via che ci si allontana.
   */
  #order(fromScene) {
    const n = this.clips.length;
    const out = [];
    for (let d = 0; d < n; d += 1) {
      const a = fromScene + d;
      const b = fromScene - 1 - d;
      if (a < n && !out.includes(a)) out.push(a);
      if (b >= 0 && !out.includes(b)) out.push(b);
    }
    return out;
  }

  /**
   * Precarica le clip UNA ALLA VOLTA, in ordine di probabile utilizzo.
   *
   * In parallelo non funziona: le connessioni verso l'origine sono poche e sei
   * video che le occupano tutte si bloccano a vicenda. In sequenza ognuno arriva
   * in fondo, e chi serve subito arriva per primo. Il precaricamento cede
   * comunque il passo a una transizione in corso, per non rubarle banda.
   *
   * Dentro la finestra calda si carica l'elemento, cosi' il decodificatore e'
   * pronto; fuori ci si limita a riempire la cache del browser, perche' tenere
   * aperti undici video insieme e' il modo piu' rapido per far scattare un
   * telefono.
   */
  async #preload(indices, pick) {
    for (const i of indices) {
      while (this.running) await new Promise((r) => setTimeout(r, 120));
      const el = pick(this.clips[i]);
      if (!el) continue;
      if (this.#isHot(i)) {
        if (el.readyState < 2) await this.ready(el);
      } else {
        await this.#warm(el);
      }
    }
  }

  /** Se la clip i rientra nella finestra dei decodificatori tenuti pronti. */
  #isHot(i) {
    return i >= this.scene - VideoPlayer.HOT_BEFORE && i <= this.scene + VideoPlayer.HOT_AFTER;
  }

  /** Vero se l'elemento ha gia' in pancia tutto il file: non va riscaricato. */
  #fullyBuffered(el) {
    if (!Number.isFinite(el.duration) || el.buffered.length === 0) return false;
    return el.buffered.end(el.buffered.length - 1) >= el.duration - 0.05;
  }

  /**
   * Porta un file nella cache del browser senza attaccarlo a un decodificatore.
   *
   * E' la parte del precaricamento che conta davvero: quando la clip servira',
   * load() la trovera' su disco e partira' senza toccare la rete. Il corpo della
   * risposta viene letto e buttato via, serve solo a far completare il
   * trasferimento.
   */
  async #warm(el) {
    const url = el.dataset.src;
    if (!url || this.warmed.has(url)) return;
    if (this.#fullyBuffered(el)) { this.warmed.add(url); return; }
    try {
      const res = await fetch(url, { credentials: 'omit' });
      if (res.ok) {
        await res.arrayBuffer();
        this.warmed.add(url);
      }
    } catch {
      // Rete assente o richiesta annullata: nessun danno, la clip si scarichera'
      // quando servira'. Il precaricamento non deve poter far fallire nulla.
    }
  }

  /**
   * Libera i decodificatori delle clip lontane dalla scena corrente.
   *
   * Non e' un risparmio di traffico: i file restano nella cache del browser
   * (sono serviti immutable) e tornare a chiederli non costa rete. E' un
   * risparmio di memoria e di decodificatori video, che su mobile sono pochi e
   * contesi. L'elemento visibile non si tocca mai, a nessuna condizione.
   */
  forget(sceneIndex) {
    const from = sceneIndex - VideoPlayer.HOT_BEFORE;
    const to = sceneIndex + VideoPlayer.HOT_AFTER;
    this.clips.forEach((clip, i) => {
      if (i >= from && i <= to) return;
      this.#unload(clip.fwd);
      this.#unload(clip.rev);
    });
  }

  #unload(el) {
    if (!el || el === this.visible) return;
    if (el.readyState === 0 && el.preload === 'none') return;   // gia' freddo
    el.pause();
    el.removeAttribute('src');
    el.preload = 'none';
    el.load();                        // e' questo che libera buffer e decoder
    el.src = el.dataset.src;          // pronto a ripartire, ma senza scaricare
    el.defaultPlaybackRate = this.config.playbackRate;
    el.playbackRate = this.config.playbackRate;
    this.diagnostics.unloaded += 1;
  }

  /** Solo le clip in avanti: sono quelle che ogni visitatore percorrera'. */
  preloadForward(fromScene = 0) {
    return this.#preload(this.#order(fromScene), (c) => c.fwd);
  }

  /**
   * Le clip riavvolte, che pesano quanto tutte le altre messe insieme.
   *
   * Non partono con la pagina: si scaricano dal primo scroll all'indietro in
   * poi. Chi percorre la sequenza in avanti e si ferma li' non le vede mai, e
   * non ha motivo di pagarne il traffico.
   */
  preloadReverse(fromScene = 0) {
    if (this.reversePreloaded) return Promise.resolve();
    this.reversePreloaded = true;
    return this.#preload(this.#order(fromScene), (c) => c.rev);
  }

  /* -------------------------------------------------------- tempi di un clip */

  startTime(clip, reversed) {
    if (reversed) return 0;                       // il file riavvolto parte da capo
    return clip.in ?? 0;
  }

  endTime(clip, reversed, el) {
    const dur = Number.isFinite(el.duration) ? el.duration : 0;
    if (reversed) return Math.max(0, dur - FRAME_EPS);
    const out = clip.out ?? dur;
    return Math.max(0, Math.min(out, dur) - FRAME_EPS);
  }

  /* ------------------------------------------ stato di riposo di una scena */

  /**
   * Elemento e istante che rappresentano la scena ferma.
   * Scena 0: primo fotogramma della transizione 0. Scena i>0: ultimo fotogramma
   * della transizione i-1, cioe' esattamente dove il video si e' fermato.
   */
  restTarget(sceneIndex) {
    if (sceneIndex <= 0) {
      const c = this.clips[0];
      return { el: c.fwd, time: this.startTime(c, false) };
    }
    const c = this.clips[sceneIndex - 1];
    return { el: c.fwd, time: this.endTime(c, false, c.fwd) };
  }

  /** Porta la pagina sullo stato di riposo di una scena, senza animazione. */
  async settleAt(sceneIndex) {
    this.scene = sceneIndex;
    const target = this.restTarget(sceneIndex);
    await this.ready(target.el);
    const fresh = this.restTarget(sceneIndex);   // la durata puo' essere nota solo ora
    await this.seek(fresh.el, fresh.time);
    this.show(fresh.el, 0);
  }

  /* ------------------------------------------------------------ riproduzione */

  /**
   * Riproduce la transizione `index` nella direzione data.
   * @param {number} index indice della transizione
   * @param {1|-1} dir 1 = avanti, -1 = indietro
   * @param {number} destScene scena di arrivo
   */
  async run(index, dir, destScene) {
    this.running = true;
    try {
      return await this.runInner(index, dir, destScene);
    } finally {
      this.running = false;
    }
  }

  async runInner(index, dir, destScene) {
    const clip = this.clips[index];
    const useReverseFile = dir < 0 && !!clip.rev;
    const el = useReverseFile ? clip.rev : clip.fwd;
    const reversedScrub = dir < 0 && !useReverseFile;

    await this.ready(el);
    el.playbackRate = this.config.playbackRate;

    const from = reversedScrub
      ? this.endTime(clip, false, el)
      : this.startTime(clip, useReverseFile);
    const to = reversedScrub
      ? this.startTime(clip, false)
      : this.endTime(clip, useReverseFile, el);

    await this.seek(el, from);
    // Il cambio di elemento e' esattamente il punto in cui il materiale sorgente
    // non combacia: si copre con la dissolvenza, non si finge che vada bene.
    this.show(el, el === this.visible ? 0 : clip.seamFadeMs);

    if (reversedScrub) {
      this.diagnostics.scrubbedRuns += 1;
      await this.scrub(el, from, to);
    } else {
      await this.playTo(el, to);
    }

    // Qualunque cosa sia successa, il fotogramma finisce dove deve stare:
    // altrimenti stato logico e immagine si disallineano.
    el.pause();
    await this.seek(el, to);

    // Arrivo: lo stato di riposo della scena di destinazione puo' vivere su un
    // altro elemento (tipico del ritorno indietro).
    const rest = this.restTarget(destScene);
    if (rest.el !== el) {
      await this.ready(rest.el);
      const fresh = this.restTarget(destScene);
      await this.seek(fresh.el, fresh.time);
      this.show(fresh.el, clip.seamFadeMs);
      await new Promise((r) => setTimeout(r, clip.seamFadeMs));
    }

    // Arrivati: la finestra dei decodificatori si sposta con la scena.
    this.scene = destScene;
    this.forget(destScene);
  }

  /** Riproduzione nativa, con guardie contro ogni modo in cui puo' non finire. */
  async playTo(el, to) {
    let rejected = this.config.forceRejectPlay === true;
    if (!rejected) {
      try {
        // play() va messo a tempo come tutto il resto: su una clip senza dati la
        // promessa puo' non risolversi MAI (accade con la scheda in secondo
        // piano, dove il browser congela il caricamento dei media). Senza questa
        // corsa la macchina a stati resterebbe in transizione per sempre.
        const outcome = await Promise.race([
          el.play().then(() => 'play', () => 'rejected'),
          timeout(this.config.loadTimeoutMs),
        ]);
        if (outcome !== 'play') rejected = true;
      } catch {
        rejected = true;
      }
    }
    if (rejected) {
      // La rotellina del mouse non e' un gesto utente per il browser: se
      // l'autoplay e' negato, play() viene respinto anche durante lo scroll.
      // La transizione NON diventa un salto istantaneo: la si trascina a mano.
      this.diagnostics.rejectedPlays += 1;
      this.diagnostics.scrubbedRuns += 1;
      return this.scrub(el, el.currentTime, to);
    }
    return this.awaitEnd(el, to);
  }

  /** Attende la fine reale della riproduzione, con watchdog su stallo e durata. */
  awaitEnd(el, to) {
    return new Promise((resolve) => {
      const rate = this.config.playbackRate || 1;
      const budget = ((to - el.currentTime) / rate) * 1000 + 1500;
      const started = performance.now();
      let lastTime = el.currentTime;
      let lastProgress = started;
      let done = false;

      const finish = (why) => {
        if (done) return;
        done = true;
        el.removeEventListener('ended', onEnded);
        document.removeEventListener('visibilitychange', onHidden);
        if (why !== 'ended') this.diagnostics.forcedEnds += 1;
        resolve(why);
      };
      const onEnded = () => finish('ended');
      const onHidden = () => { if (document.hidden) finish('hidden'); };

      el.addEventListener('ended', onEnded);
      document.addEventListener('visibilitychange', onHidden);

      const tick = (now) => {
        if (done) return;
        if (el.currentTime >= to) return finish('reached');
        if (el.currentTime > lastTime + 1e-4) { lastTime = el.currentTime; lastProgress = now; }
        // Scheda in secondo piano, buffer impantanato, decoder fermo: si esce
        // comunque e poi il fotogramma viene portato a destinazione a mano.
        if (now - lastProgress > this.config.stallTimeoutMs) return finish('stalled');
        if (now - started > budget) return finish('budget');
        raf(tick);
      };
      raf(tick);
    });
  }

  /**
   * Trascinamento manuale del currentTime a velocita' costante.
   * Serve in due casi: play() respinto dalla policy di autoplay, e ritorno
   * indietro quando manca il file riavvolto. E' sempre consentito, perche' non
   * richiede alcun gesto utente.
   */
  scrub(el, from, to) {
    return new Promise((resolve) => {
      const rate = this.config.playbackRate || 1;
      const span = to - from;
      // Se la durata non e' nota (clip mai caricata) non c'e' niente da
      // trascinare: si chiude subito e il chiamante porta comunque lo stato a
      // destinazione, senza lasciare la pagina in transizione.
      if (!Number.isFinite(span) || Math.abs(span) < 1e-6) return resolve('vuoto');
      const durationMs = Math.abs(span) / rate * 1000;
      const t0 = performance.now();
      el.pause();
      const tick = (now) => {
        const k = durationMs <= 0 ? 1 : Math.min(1, (now - t0) / durationMs);
        const t = from + span * k;
        if (Math.abs(el.currentTime - t) > 1e-4) el.currentTime = t;
        if (k >= 1) return resolve('scrubbed');
        raf(tick);
      };
      raf(tick);
    });
  }

  /* --------------------------------------------------------------- utilita' */

  seek(el, time) {
    const target = Math.max(0, time);
    if (Math.abs(el.currentTime - target) < 1e-3 && el.readyState >= 2) return Promise.resolve();
    return new Promise((resolve) => {
      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        el.removeEventListener('seeked', settle);
        resolve();
      };
      el.addEventListener('seeked', settle, { once: true });
      el.currentTime = target;
      // Un seek che non torna mai non deve bloccare la macchina a stati.
      setTimeout(settle, 800);
    });
  }

  show(el, fadeMs) {
    if (this.visible === el) { el.style.opacity = '1'; return; }
    const prev = this.visible;
    el.style.transitionDuration = fadeMs + 'ms';
    el.style.opacity = '1';
    el.style.zIndex = '2';
    if (prev) {
      prev.style.transitionDuration = fadeMs + 'ms';
      prev.style.opacity = '0';
      prev.style.zIndex = '1';
    }
    this.visible = el;
  }
}
