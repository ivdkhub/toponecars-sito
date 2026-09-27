/**
 * Pagina "Contenuti": la card con l'iPhone che riproduce i video dell'officina.
 *
 * E' la sottopagina della scena "Contenuti" (config: `sottopagina`): arrivati
 * sulla scena, il primo scroll in avanti apre la card invece di passare alla
 * scena dopo; lo scroll successivo la chiude e prosegue; uno scroll indietro la
 * richiude soltanto. Il dove e il quando li decide main.js, che chiede a
 * `aperto` prima di ogni passo; qui si apre, si chiude e si fa girare il video.
 *
 * Il telefono ricostruisce InstagramPhoneMockup.tsx (beautydreamer-web): video
 * a tutto schermo, barra dei Reels, azioni a destra, profilo e didascalia in
 * basso, e una conferma prima di lasciare il sito per Instagram.
 *
 * I video vengono chiesti alla rete solo alla prima apertura: chi non apre la
 * card non ne scarica nemmeno un byte. A card chiusa il video e' in pausa.
 */
import { VIDEO_CONTENUTI } from './contenuti-data.js';
import { t } from './i18n.js';

const BASE = 'assets/media/contenuti/';

/** Le tre codifiche, nell'ordine in cui il browser deve provarle: la prima che
 *  sa decodificare e' quella che scarica (vedi tools/build-contenuti.py). */
const SORGENTI = [
  ['av1', 'video/mp4; codecs="av01.0.08M.08"'],
  ['hevc', 'video/mp4; codecs="hvc1.1.6.L120.90"'],
  ['h264', 'video/mp4; codecs="avc1.640028"'],
];

export class ContenutiCard {
  /**
   * @param {object} config CONFIG risolto
   * @param {Document|HTMLElement} root
   */
  constructor(config, root = document) {
    this.cfg = config.contenuti || {};
    this.el = root.querySelector('[data-cnt]');
    this.q = (sel) => this.el.querySelector(sel);
    this.aperto = false;
    this.corrente = 0;
    this.caricato = -1;
  }

  attach() {
    if (!this.el) return;
    this.video = this.q('[data-phone-video]');
    // Un formato che si rompe in riproduzione lascia il posto al successivo.
    this.video.addEventListener('error', () => this.ripiega());
    this.prompt = this.q('[data-ig-prompt]');
    const ig = this.cfg.instagram || {};
    this.url = ig.url || null;

    this.q('[data-ig-user]').textContent = ig.utente || '';
    this.el.dataset.ig = String(!!this.url);
    this.scriviTesti();
    this.costruisciElenco();
    // Cambio lingua: didascalia, conferma, audio e titoli dei video.
    document.addEventListener('linguachange', () => {
      this.scriviTesti();
      this.voci.forEach((b, k) => {
        b.querySelector('.cnt__item-title').textContent = t(VIDEO_CONTENUTI[k].titolo);
      });
    });

    this.q('[data-cnt-close]').addEventListener('click', () => this.chiudi());
    document.addEventListener('keydown', (e) => {
      if (!this.aperto || e.key !== 'Escape') return;
      e.preventDefault();
      if (!this.prompt.hidden) this.prompt.hidden = true; else this.chiudi();
    });

    // Il telefono: suono, mi piace, salva, e tutto il resto porta a Instagram.
    const suono = this.q('[data-ig-sound]');
    suono.addEventListener('click', (e) => {
      e.stopPropagation();
      this.video.muted = !this.video.muted;
      this.scriviSuono();
    });
    for (const sel of ['[data-ig-like]', '[data-ig-save]']) {
      const b = this.q(sel);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      });
    }
    this.el.querySelectorAll('[data-ig-open]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.chiediInstagram();
    }));
    // Un tocco sullo schermo: se il browser ha bloccato l'avvio automatico fa
    // partire il video, altrimenti porta a Instagram come nell'originale.
    this.q('[data-phone-screen]').addEventListener('click', () => {
      if (this.video.paused) this.avvia(); else this.chiediInstagram();
    });
    this.q('[data-ig-go]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.url) window.open(this.url, '_blank', 'noopener,noreferrer');
      this.prompt.hidden = true;
    });
    this.q('[data-ig-stay]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.prompt.hidden = true;
    });
    this.prompt.addEventListener('click', (e) => e.stopPropagation());

    // Qualunque transizione di scena porta via la card con il suo blocco.
    document.addEventListener('transitionstart', (e) => { if (e.detail) this.chiudi(false); });

    this.parallax();
  }

  /**
   * L'effetto di ParallaxCard.tsx (beautydreamer-web), con i valori che li' ha
   * il telefono (about/page.tsx: maxTiltDeg 9, maxTranslatePx 8):
   *  - entrata: da translateY(45px) scale(0.97) e trasparente, in 1,2 s con
   *    cubic-bezier(0.16, 1, 0.3, 1);
   *  - inclinazione 3D magnetica: la posizione del puntatore rispetto al centro
   *    (-1..+1) diventa rotateX/rotateY fino a 9 gradi e uno spostamento fino
   *    a 8 px, inseguita con una transizione di 0,12 s; all'uscita torna piatto
   *    con la transizione lunga.
   * I pixel dell'originale sono riferiti al telefono largo 380 px: qui si
   * scalano con il telefono, cosi' l'effetto ha la stessa ampiezza visiva.
   */
  parallax() {
    const el = this.q('.phone');
    if (!el) return;
    this.phone = el;
    const TILT = 9;
    const SPOSTA = 8;
    const LENTA = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    const RAPIDA = 'transform 0.12s ease-out, opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    // Larghezza reale del telefono / 380. A card nascosta la larghezza e' zero:
    // si ricava allora dalla scala della pagina (il telefono e' largo 250
    // unita' di design), esposta in pixel dalla barra del menu come --s-px.
    const scala = () => {
      const w = el.getBoundingClientRect().width;
      if (w) return w / 380;
      const menu = document.querySelector('.menu');
      const s = menu ? parseFloat(getComputedStyle(menu).getPropertyValue('--s-px')) : 1;
      return ((s || 1) * 250) / 380;
    };
    const piatta = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)';

    this.phoneEntra = (visibile) => {
      el.style.transition = LENTA;
      el.style.opacity = visibile ? '1' : '0';
      el.style.transform = visibile ? piatta
        : `perspective(1000px) translateY(${(45 * scala()).toFixed(2)}px) scale(0.97)`;
    };
    this.phoneEntra(false);

    el.addEventListener('mousemove', (e) => {
      if (!this.aperto) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;
      const k = scala();
      const rx = ((y - cy) / cy) * -TILT;
      const ry = ((x - cx) / cx) * TILT;
      const tx = ((x - cx) / cx) * SPOSTA * k;
      const ty = ((y - cy) / cy) * SPOSTA * k;
      el.style.transition = RAPIDA;
      el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) `
        + `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px)`;
    });
    el.addEventListener('mouseleave', () => {
      if (!this.aperto) return;
      el.style.transition = LENTA;
      el.style.transform = piatta;
    });
  }

  /** I testi della card che dipendono dalla lingua. */
  scriviTesti() {
    const ig = this.cfg.instagram || {};
    this.q('[data-ig-caption]').textContent = t(this.cfg.didascalia || '');
    this.q('[data-ig-audio]').textContent = t(this.cfg.audio || '');
    this.q('[data-ig-desc]').textContent = t(
      'Vuoi visualizzare il profilo ufficiale di @{utente} per scoprire tutti i lavori e le novità?',
      { utente: ig.utente || '' });
    this.scriviSuono();
  }

  /** Il pulsante dell'audio dice cosa fara' il prossimo tocco. */
  scriviSuono() {
    const suono = this.q('[data-ig-sound]');
    const on = !!this.video && !this.video.muted;
    suono.setAttribute('aria-pressed', String(on));
    suono.title = on ? t('Disattiva Audio') : t('Attiva Audio');
    suono.setAttribute('aria-label', on ? t("Disattiva l'audio") : t("Attiva l'audio"));
  }

  /** Senza indirizzo del profilo la conferma non ha senso: non si apre. */
  chiediInstagram() {
    if (this.url) this.prompt.hidden = false;
  }

  costruisciElenco() {
    const ul = this.q('[data-cnt-list]');
    this.voci = VIDEO_CONTENUTI.map((v, k) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cnt__item';
      const num = document.createElement('span');
      num.className = 'svc__num';
      num.textContent = String(k + 1).padStart(2, '0');
      const titolo = document.createElement('span');
      titolo.className = 'cnt__item-title';
      titolo.textContent = t(v.titolo);
      const play = document.createElement('span');
      play.className = 'cnt__item-play';
      play.setAttribute('aria-hidden', 'true');
      play.innerHTML = '<svg viewBox="0 0 16 16"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/></svg>';
      b.append(num, titolo, play);
      b.addEventListener('click', () => this.scegli(k));
      li.appendChild(b);
      ul.appendChild(li);
      return b;
    });
    this.segnaCorrente();
  }

  segnaCorrente() {
    this.voci.forEach((b, k) => b.setAttribute('aria-current', String(k === this.corrente)));
  }

  scegli(k) {
    if (k === this.corrente && this.caricato === k) return;
    this.corrente = k;
    this.segnaCorrente();
    this.carica(k);
    if (this.aperto) this.avvia();
  }

  /**
   * Mette le sorgenti del video k nel <video>.
   * @param {string[]} [esclusi] formati da non proporre piu' (vedi `ripiega`).
   */
  carica(k, esclusi = this.falliti || []) {
    const v = VIDEO_CONTENUTI[k];
    if (!v) return;
    this.esclusi = esclusi;
    // Solo i formati pubblicati per questo video: quelli che non battevano
    // l'originale non esistono (vedi tools/build-contenuti.py).
    const formati = (v.formati || SORGENTI.map(([s]) => s)).filter((f) => !esclusi.includes(f));
    // I media restano in cache un anno (vercel.json): l'impronta dei file
    // nell'indirizzo fa si' che un video sostituito venga riscaricato.
    const versione = v.v ? `?v=${v.v}` : '';
    this.video.replaceChildren(...SORGENTI.filter(([suff]) => formati.includes(suff)).map(([suff, tipo]) => {
      const s = document.createElement('source');
      s.src = `${BASE}${v.id}.${suff}.mp4${versione}`;
      s.type = tipo;
      return s;
    }));
    this.video.poster = `${BASE}${v.id}.webp${versione}`;
    this.video.preload = 'auto';
    this.video.load();
    this.caricato = k;
  }

  /**
   * Ripiego su errore di decodifica. Il browser sceglie il formato dalla
   * dichiarazione (canPlayType), ma puo' dire di saper leggere AV1 o HEVC e poi
   * fallire a meta' (decodificatore parziale, audio non supportato): a quel
   * punto non passa da solo alla <source> successiva. Qui si scarta il formato
   * che ha fallito e si riparte dallo stesso istante con il seguente, fino
   * all'H.264 originale, che tutti leggono.
   */
  ripiega() {
    const src = this.video.currentSrc || '';
    const m = src.match(/\.(av1|hevc|h264)\.mp4/);
    if (!m || m[1] === 'h264' || this.caricato < 0) return;
    const riprendi = this.video.currentTime || 0;
    const girava = this.aperto;
    // Il formato resta escluso per tutta la visita: se ha fallito su un video,
    // fallirebbe anche sugli altri.
    this.falliti = [...new Set([...(this.falliti || []), m[1]])];
    this.carica(this.caricato, this.falliti);
    this.video.addEventListener('loadedmetadata', () => {
      try { this.video.currentTime = riprendi; } catch { /* resta all'inizio */ }
      if (girava && this.aperto) this.avvia();
    }, { once: true });
  }

  avvia() {
    const p = this.video.play();
    // Un play() respinto (autoplay bloccato) lascia il poster: nessun errore
    // in pagina, il video parte al primo tocco sul telefono.
    if (p && p.catch) p.catch(() => {});
  }

  apri() {
    if (this.aperto) return;
    this.aperto = true;
    if (this.caricato !== this.corrente) this.carica(this.corrente);
    this.el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!this.aperto) return;
      this.el.dataset.open = 'true';
      // Il telefono entra dopo il vetro, come un secondo elemento della card.
      setTimeout(() => { if (this.aperto && this.phoneEntra) this.phoneEntra(true); }, 150);
    }));
    document.documentElement.dataset.sub = 'contenuti';
    this.avvia();
  }

  /**
   * @param {boolean} restando true quando la chiude uno scroll indietro (si
   *  resta sulla pagina: uscita breve, come il pannello dei servizi); false
   *  quando la porta via un cambio di scena: uscita lunga, vedi
   *  .cnt[data-open="leaving"] in contenuti.css.
   */
  chiudi(restando = true) {
    if (!this.aperto) return;
    this.aperto = false;
    this.el.dataset.open = restando ? 'false' : 'leaving';
    this.prompt.hidden = true;
    delete document.documentElement.dataset.sub;
    // La durata vera dell'uscita la dice il CSS dello stato appena impostato.
    const ms = (parseFloat(getComputedStyle(this.el).transitionDuration) * 1000 || 0) + 40;
    // Il video si ferma a card sparita: finche' si dissolve deve restare vivo.
    // Il telefono torna nella posizione di partenza solo allora, cosi' alla
    // prossima apertura rientra con la sua animazione.
    setTimeout(() => {
      if (this.aperto) return;
      this.video.pause();
      this.el.hidden = true;
      this.el.dataset.open = 'false';
      if (this.phoneEntra) this.phoneEntra(false);
    }, ms);
  }
}
