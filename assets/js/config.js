/**
 * Unico file di configurazione di scene e transizioni.
 *
 * Per sostituire un video basta cambiare i percorsi qui sotto: nessun altro file
 * va toccato. Sono supportate due forme.
 *
 * 1) Un file per transizione (quella in uso):
 *      { src: 't1.mp4', reverseSrc: 't1.rev.mp4' }
 *
 *    Il nome nudo viene risolto nella variante di codifica che il browser sa
 *    decodificare (vedi MEDIA_VARIANTS piu' sotto). Un percorso che contiene una
 *    barra, o un indirizzo completo, viene invece usato tale e quale: e' la
 *    strada per spostare i media su una CDN esterna senza toccare altro.
 *
 * 2) Un unico video lungo con tagli temporali: lo stesso `src` per tutte le
 *    transizioni piu' `in` / `out` in secondi. Il player riproduce il segmento e
 *    si ferma su `out`; se manca `reverseSrc` lo scroll all'indietro ricade sullo
 *    scrubbing manuale del currentTime.
 *      { src: '.../full.mp4', in: 0, out: 4.042 }
 *
 * Invariante della meccanica: lo stato di riposo della scena i e' l'ULTIMO
 * fotogramma della transizione i-1, non un'immagine a parte. Per questo ogni
 * transizione tiene il proprio elemento <video> in pausa sul suo ultimo
 * fotogramma: la giuntura "transizione -> scena" e' esatta per costruzione.
 */
/**
 * Revisione dei media. Fa parte dell'indirizzo di ogni clip, e serve a una cosa
 * sola: i file sono serviti con Cache-Control immutable per un anno (vedi
 * vercel.json), quindi un browser che li ha in cache non tornerebbe mai a
 * chiederli. Rigenerando i video con tools/build-media.py va incrementata, cosi'
 * gli indirizzi cambiano e le nuove clip arrivano davvero.
 */
export const MEDIA_REV = 'r2';

/** Cartella dei media risolti dai nomi nudi delle transizioni. */
export const MEDIA_ROOT = 'assets/media';

/**
 * Codifiche disponibili, in ordine di preferenza. Si serve la prima che il
 * browser dichiara di saper decodificare.
 *
 * AV1 pesa circa un quarto dell'H.264 a parita' di qualita' misurata, ed e'
 * capito da Chrome, Edge, Firefox, Android e dai Mac e iPhone recenti. HEVC
 * copre tutti gli altri Safari, che senza hardware recente non decodificano AV1.
 * H.264 resta come rete di sicurezza per i browser che non hanno ne' l'uno ne'
 * l'altro: e' materiale d'archivio, quindi esiste solo nella misura ridotta.
 *
 * `hd` e' 1928x1072, `sd` 1280x712.
 */
export const MEDIA_VARIANTS = [
  { name: 'av1',  type: 'video/mp4; codecs="av01.0.05M.08"',    hd: 'av1',  sd: 'av1-sd' },
  { name: 'hevc', type: 'video/mp4; codecs="hvc1.1.6.L93.B0"',  hd: 'hevc', sd: 'hevc-sd' },
  { name: 'h264', type: 'video/mp4; codecs="avc1.4d401f"',      hd: null,   sd: 'h264-sd' },
];

/**
 * La cartella di riserva quando quella in uso si e' rivelata illeggibile.
 *
 * Un browser puo' dichiarare di saper decodificare un formato (canPlayType
 * "probably") e poi fallire su ogni fotogramma: verificato su un WebKit che
 * dichiara AV1. Qui si sceglie la famiglia successiva nell'ordine di
 * MEDIA_VARIANTS che il browser dichiara di leggere, nella stessa misura se
 * esiste. null se non c'e' piu' niente da provare.
 *
 * @param {string} dir cartella che ha fallito
 * @param {Set<string>} fallite cartelle gia' scartate
 */
export function mediaDirDiRiserva(dir, fallite, win = window) {
  const i = MEDIA_VARIANTS.findIndex((v) => v.hd === dir || v.sd === dir);
  const piccola = i >= 0 && MEDIA_VARIANTS[i].sd === dir;
  const probe = win.document.createElement('video');
  for (const v of MEDIA_VARIANTS.slice(i + 1)) {
    let ok = false;
    try { ok = probe.canPlayType(v.type) !== ''; } catch { ok = false; }
    if (!ok) continue;
    const scelta = piccola ? (v.sd || v.hd) : (v.hd || v.sd);
    if (scelta && !fallite.has(scelta)) return scelta;
  }
  return null;
}

/**
 * Se convenga la misura ridotta.
 *
 * Non e' una questione di nitidezza: il palcoscenico e' in object-fit: cover, e
 * su un telefono in verticale il video viene ingrandito, non rimpicciolito.
 * Serve invece a non far scaricare 12 MB a chi naviga in mobilita': su schermo
 * piccolo un po' di morbidezza sul ritaglio si nota molto meno di un'attesa.
 */
function preferSmall(win) {
  const conn = win.navigator && win.navigator.connection;
  if (conn) {
    if (conn.saveData === true) return true;
    if (/^(slow-)?2g$/.test(conn.effectiveType || '')) return true;
    if (conn.effectiveType === '3g') return true;
  }
  const coarse = win.matchMedia && win.matchMedia('(pointer: coarse)').matches;
  const longSide = Math.max(win.innerWidth || 0, win.innerHeight || 0);
  return Boolean(coarse && longSide <= 900);
}

/**
 * Cartella da cui prendere le clip. `force` vale 'hd' o 'sd' e serve ai test.
 * Se nessuna codifica risulta supportata si ripiega sull'ultima: un browser che
 * mente su canPlayType e' comunque meglio servito da qualcosa che da niente.
 */
export function pickMediaDir(win = window, force = null) {
  const probe = win.document.createElement('video');
  const small = force ? force === 'sd' : preferSmall(win);
  for (const v of MEDIA_VARIANTS) {
    let ok = false;
    try { ok = probe.canPlayType(v.type) !== ''; } catch { ok = false; }
    if (!ok) continue;
    const dir = small ? (v.sd || v.hd) : (v.hd || v.sd);
    if (dir) return dir;
  }
  const last = MEDIA_VARIANTS[MEDIA_VARIANTS.length - 1];
  return last.sd || last.hd;
}

/** Trasforma i nomi nudi delle transizioni in indirizzi completi. */
export function resolveMediaPaths(config, dir, rev = MEDIA_REV) {
  const resolve = (name) => {
    if (!name) return name;
    if (name.includes('/')) return name;              // gia' un percorso: non si tocca
    return MEDIA_ROOT + '/' + dir + '/' + name + '?v=' + rev;
  };
  config.mediaDir = dir;
  config.transitions.forEach((t) => {
    t.src = resolve(t.src);
    t.reverseSrc = resolve(t.reverseSrc);
  });
  for (const variante of Object.values(config.variants || {})) {
    variante.options.forEach((o) => {
      o.src = resolve(o.src);
      o.reverseSrc = resolve(o.reverseSrc);
    });
  }
  return config;
}

export const CONFIG = {
  /** Velocita' di riproduzione di tutte le transizioni. */
  playbackRate: 1.5,

  /** L'unico poster che si vede davvero: quello della scena 0. Lo stato di
   *  riposo delle altre scene e' un fotogramma video in pausa, non un'immagine,
   *  quindi i loro poster venivano scaricati (5,6 MB di PNG) per non comparire
   *  mai — e per giunta in concorrenza con la prima clip. */
  poster: 'assets/media/poster.webp',

  /**
   * Le varianti di una scena.
   *
   * Una variante non e' una scena in piu': e' uno stato di riposo alternativo
   * della scena indicata da `scene`. Ogni sua opzione ha una clip che parte
   * esattamente dal fotogramma su cui quella scena si ferma e arriva altrove,
   * dove resta in pausa; riprodotta al contrario riporta al punto di partenza.
   * Le giunzioni sono state misurate come tutte le altre del progetto — 3,45 per
   * il buio e 3,52 per la vernice, contro il 3,30 della giuntura fra la prima e
   * la seconda transizione — e si coprono con la stessa dissolvenza.
   *
   * `base` e' lo stato ordinario, quello in cui la scena si trova arrivandoci.
   *
   * `blockNavigation` e' il vincolo chiesto dal committente: fuori dallo stato
   * ordinario non si cambia scena. La ragione e' la stessa per entrambe le
   * varianti — le sei transizioni della sequenza esistono soltanto con le luci
   * accese e l'auto rossa, quindi percorrerle da un'altra variante vorrebbe dire
   * riaccendere la luce, o ridipingere l'auto, di nascosto.
   *
   * Due varianti non possono essere attive insieme, e per la stessa ragione: la
   * clip del buio riprende un'auto rossa, quella della vernice un'auto illuminata.
   */
  variants: {
    theme: {
      scene: 1,
      base: 'chiaro',
      blockNavigation: true,
      options: [
        {
          id: 'scuro',
          label: 'Luci spente',
          src: 'darktheme.mp4',
          reverseSrc: 'darktheme.rev.mp4',
          seamFadeMs: 300,
        },
      ],
    },
    // I due colori non sono scelti a occhio: sono la mediana dei pixel che la
    // clip ridipinge davvero, presi sul primo e sull'ultimo fotogramma. Servono
    // ai pallini del menu, che cosi' mostrano esattamente la vernice che si
    // otterrebbe.
    paint: {
      scene: 1,
      base: 'rosso',
      baseLabel: 'Rosso Carmine',
      baseSwatch: '#950f19',
      blockNavigation: true,
      // Da un'opzione della vernice uno scroll all'indietro (rotellina, freccia,
      // swipe) non cambia scena: riporta al colore ordinario, riproducendo la
      // clip al contrario. In avanti resta bloccato come prima.
      backScrollRestores: true,
      options: [
        {
          id: 'giallo',
          label: 'Giallo Top One Cars',
          swatch: '#eab709',
          src: 'vernice-giallo.mp4',
          reverseSrc: 'vernice-giallo.rev.mp4',
          seamFadeMs: 300,
        },
        // Non una vernice dell'auto, che resta rossa: la parete alle sue spalle
        // si dipinge con i colori dell'officina (wallpainting.mp4). Stessa
        // partenza e stessa meccanica, quindi e' un'opzione della stessa
        // variante. Il pallino mostra i due colori della parete.
        {
          id: 'officina',
          label: 'Officina Top One Cars',
          swatch: 'linear-gradient(135deg, rgb(127, 77, 177) 0 50%, rgb(215, 171, 35) 50% 100%)',
          src: 'vernice-officina.mp4',
          reverseSrc: 'vernice-officina.rev.mp4',
          seamFadeMs: 300,
        },
      ],
    },
  },

  /** Silenzio che chiude un gesto: finche' gli eventi arrivano piu' fitti di
   *  cosi' sono lo stesso gesto (annulla l'inerzia del trackpad). */
  gestureSilenceMs: 180,

  /** Uscita coordinata del blocco all'inizio della transizione. */
  blockExitMs: 350,

  /** Oltre questa attesa si procede comunque: un file irraggiungibile non deve
   *  bloccare la navigazione per sempre. */
  loadTimeoutMs: 6000,

  /** Se currentTime non avanza per questo tempo la riproduzione e' considerata
   *  impantanata e il fotogramma viene portato a destinazione a mano. */
  stallTimeoutMs: 1200,

  /** Dissolvenza che copre la giuntura fra lo stato di riposo e il primo
   *  fotogramma della transizione successiva. Il materiale sorgente NON combacia
   *  fotogramma per fotogramma (vedi REPORT.md): senza questa dissolvenza si
   *  vedrebbe uno scatto. Non e' una scelta estetica, e' una pezza a un difetto.
   *  Valore predefinito: ogni transizione puo' sovrascriverlo con il proprio,
   *  perche' le giunture non sono difettose allo stesso modo. */
  seamFadeMs: 300,

  /** Soglia di uno swipe, in px. */
  swipeThresholdPx: 40,

  /** Imbottitura orizzontale della pastiglia che evidenzia la voce di menu
   *  corrente, in unita' di design. Misurata sul mockup: con questo valore la
   *  voce "Vieni a trovarci" riproduce esattamente la pastiglia che ha li'. */
  menuPillPadding: 6.84,

  /** Prenotazione dei servizi (assets/js/prenotazione.js).
   *
   *  ATTENZIONE: giorni e orari sono VALORI DI PARTENZA, non ancora confermati
   *  dal committente. Vanno sostituiti con gli orari reali dell'officina.
   *
   *  Sono solo la base: l'archivio dell'officina (dati-officina.js) li
   *  trasforma in fasce orarie, e da li' in poi li modifica la pagina "Orari
   *  di apertura" dell'area amministratore. */
  prenotazione: {
    /** Giorni chiusi, come Date.getDay(): 0 = domenica. */
    giorniChiusi: [0],
    /** Orari di accettazione proposti per giorno della settimana (1 = lunedi'). */
    orari: {
      1: ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30'],
      2: ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30'],
      3: ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30'],
      4: ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30'],
      5: ['08:30', '09:30', '10:30', '11:30', '14:30', '15:30', '16:30', '17:30'],
      6: ['08:30', '09:30', '10:30', '11:30'],
    },
    /** Primo giorno prenotabile: domani (1) — oggi l'officina non puo'
     *  confermare in tempo. */
    anticipoGiorni: 1,
    /** Quanto avanti si puo' prenotare, in giorni. */
    finestraGiorni: 90,
    /** Dove inviare la richiesta (POST JSON). null = non ancora collegato: la
     *  richiesta viene solo emessa come evento `prenotazione` su document. */
    endpoint: null,
  },

  /** Area amministratore, a luce spenta sulla scena 2 (assets/js/admin.js).
   *
   *  Le credenziali le verifica il server: `endpoint` riceve in POST
   *  { utente, password } e risponde { nome } con una sessione (cookie
   *  HttpOnly) se l'accesso e' valido, 401 altrimenti; `logout` chiude la
   *  sessione. Finche' `endpoint` e' null il form lo dice e non fa entrare
   *  nessuno: una password controllata nel browser la leggerebbe chiunque. */
  admin: {
    endpoint: null,
    logout: null,
    /** Credenziali della DEMO, mostrate nel form. Valgono solo finche'
     *  `endpoint` e' null: aprono l'area con dati di prova salvati nel browser
     *  di chi la usa, e non proteggono nulla. Con il server collegato vanno
     *  tolte (null), e l'accesso passa solo da li'. */
    demo: { utente: 'demo', password: 'toponecars' },
  },

  /** Pagina "Contenuti": la card con l'iPhone (assets/js/contenuti.js).
   *
   *  ATTENZIONE: nome utente e indirizzo del profilo Instagram sono DA
   *  CONFERMARE con il committente. Finche' `url` e' null i comandi che nel
   *  telefono porterebbero su Instagram non aprono nulla. */
  contenuti: {
    instagram: {
      utente: 'toponecars',
      url: null,
    },
    didascalia: 'Dentro l’officina Top One Cars: i prodotti che usiamo sulla tua auto. 🔧',
    audio: 'Audio originale • Top One Cars',
  },

  /** Dati dell'impresa per informativa privacy, cookie policy, informazioni
   *  legali e barra in fondo alla pagina (assets/js/legale.js).
   *
   *  OBBLIGATORI PRIMA DELLA PUBBLICAZIONE: i campi a null compaiono nel sito
   *  come "da completare", e la console lo segnala a ogni caricamento.
   *   - P.IVA in ogni pagina del sito: art. 35 DPR 633/1972;
   *   - ragione sociale, sede, recapito email, iscrizione al Registro delle
   *     Imprese (REA), capitale sociale per le societa': art. 7 D.Lgs. 70/2003
   *     e art. 2250 c.c.;
   *   - un indirizzo email a cui esercitare i diritti privacy: artt. 13 e
   *     15-22 GDPR.
   *  Si prendono dalla visura camerale dell'officina. */
  azienda: {
    /** Es. "Top One Cars S.r.l." oppure "Top One Cars di Mario Rossi". */
    ragioneSociale: 'TOP ONE CARS SRL',
    /** Nome commerciale, come compare nel sito. */
    insegna: 'Top One Cars',
    sede: 'SS 9 Via Emilia, 312 · 20070 Vizzolo Predabissi (MI)',
    piva: '13478420964',
    /** Solo se diverso dalla partita IVA (ditte individuali). */
    codiceFiscale: null,
    /** Es. "MI-1234567". */
    rea: null,
    /** Solo per le societa' di capitali, es. "10.000 € i.v."; null altrimenti. */
    capitaleSociale: null,
    email: 'toponecars.srl@gmail.com',
    pec: null,
    telefono: null,
  },

  /** Data dell'ultima revisione di informativa privacy e cookie policy
   *  (AAAA-MM-GG): va aggiornata a ogni modifica dei testi in legale-testi.js. */
  informativaAggiornata: '2026-09-27',

  // sottopagina: una scena puo' avere un secondo "piano" che si apre con uno
  // scroll in avanti, invece di passare subito alla scena dopo. Il secondo
  // scroll lo apre, il successivo prosegue; uno scroll indietro lo richiude.
  // menuItem: indice della voce di menu che la scena rende corrente, oppure null
  // se nessuna lo e'. Le voci sono sei, nell'ordine: Chi siamo, Servizi,
  // Contenuti, Recensioni, Vieni a trovarci, Noleggio. La prima scena, il campo
  // lungo d'apertura, non ne ha una; "Vieni a trovarci" copre la sesta e la
  // settima, e "Noleggio" ha l'ottava, un passo fermo sull'inquadratura della
  // settima (vedi l'ultima transizione).
  scenes: [
    { id: 'campo-lungo',     label: 'Campo lungo',          block: null,      counter: { n: 1, bar: 0.120 }, menuItem: null },
    { id: 'retro-tre-q',     label: 'Vista posteriore',     block: 'block-1', counter: { n: 2, bar: 0.246 }, menuItem: 0 },
    { id: 'fronte-tre-q',    label: 'Vista anteriore',      block: 'block-2', counter: { n: 3, bar: 0.371 }, menuItem: 1 },
    { id: 'ruota',           label: 'Ruota in primo piano', block: 'block-3', counter: { n: 4, bar: 0.497 }, menuItem: 2, sottopagina: 'contenuti' },
    { id: 'vista-alto',      label: 'Vista dall’alto',     block: 'block-4',    counter: { n: 5, bar: 0.623 }, menuItem: 3 },
    { id: 'ruote-scomposte', label: 'Ruote scomposte',      block: null,      counter: { n: 6, bar: 0.749 }, menuItem: 4 },
    { id: 'ritorno-alto',    label: 'Ruote ricomposte',     block: 'block-5', counter: { n: 7, bar: 0.874 }, menuItem: 4 },
    { id: 'noleggio',        label: 'Noleggio',             block: 'block-6', counter: { n: 8, bar: 1.000 }, menuItem: 5 },
  ],

  transitions: [
    { src: 't1.mp4', reverseSrc: 't1.rev.mp4' },
    { src: 't2.mp4', reverseSrc: 't2.rev.mp4' },
    { src: 't3.mp4', reverseSrc: 't3.rev.mp4' },
    // La giuntura fra la clip 3 e la 4 e' la piu' difettosa del materiale
    // (scarto medio 6,2 contro 3,5 e 3,3 delle altre, 27% dei pixel oltre
    // soglia): serve una dissolvenza piu' lunga per coprirla.
    { src: 't4.mp4', reverseSrc: 't4.rev.mp4', seamFadeMs: 480 },
    // Questa invece combacia quasi (1,7): basta una dissolvenza breve.
    { src: 't5.mp4', reverseSrc: 't5.rev.mp4', seamFadeMs: 180 },
    // Settima scena: le ruote si ricompongono e l'inquadratura torna dall'alto.
    // E' esattamente la quinta transizione percorsa al contrario, quindi si usa
    // la clip riavvolta che esiste gia' — nessun video nuovo da girare. Le parti
    // si scambiano: cio' che qui va avanti e' t5.rev, e tornare indietro
    // significa riprodurre t5.
    // La giuntura d'ingresso e' la migliore del progetto (0,797, 0,67% oltre
    // soglia) perche' le due clip condividono lo stesso fotogramma: basta una
    // dissolvenza minima, che serve solo a coprire il cambio di elemento.
    { src: 't5.rev.mp4', reverseSrc: 't5.mp4', seamFadeMs: 120 },
    // Ottava scena, "Noleggio": un passo fermo. Nessuna clip, l'immagine resta
    // sull'ultimo fotogramma della settima; cambiano solo contatore e voce di
    // menu. `durataMs` e' il tempo del passo, che si comporta come gli altri:
    // gli input che arrivano nel frattempo vengono scartati.
    { ferma: true, durataMs: 600 },
  ],
};

/** Sovrascritture da querystring, solo per i test automatici.
 *  Non alterano il comportamento di default della pagina. */
export function applyOverrides(config, search = location.search) {
  const q = new URLSearchParams(search);
  const out = structuredClone(config);
  if (q.has('playbackRate')) out.playbackRate = Number(q.get('playbackRate'));
  if (q.has('seamFadeMs')) out.seamFadeMs = Number(q.get('seamFadeMs'));
  if (q.has('gestureSilenceMs')) out.gestureSilenceMs = Number(q.get('gestureSilenceMs'));
  if (q.has('loadTimeoutMs')) out.loadTimeoutMs = Number(q.get('loadTimeoutMs'));
  // Esercita il ramo "play() respinto" senza toccare i flag del browser.
  out.forceRejectPlay = q.get('forceRejectPlay') === '1';
  // Esercita il fallback di riavvolgimento quando il file reverse non esiste.
  out.forceNoReverse = q.get('forceNoReverse') === '1';
  if (out.forceNoReverse) out.transitions.forEach((t) => { t.reverseSrc = null; });
  // Blocca la partenza automatica dell'intro (utile al confronto al pixel).
  out.noIntro = q.get('noIntro') === '1';
  // Parte direttamente da una scena: serve al confronto al pixel per fotografare
  // un blocco senza attendere tutte le transizioni. Implica noIntro.
  if (q.has('scene')) {
    out.startScene = Math.max(0, Math.min(out.scenes.length - 1, Number(q.get('scene'))));
    out.noIntro = true;
  }
  // Scelta della codifica. `media=hd|sd` forza la misura, `mediaDir=<cartella>`
  // impone direttamente una variante: serve al confronto al pixel, che deve
  // fotografare sempre lo stesso materiale su qualunque macchina.
  const dir = q.get('mediaDir') || pickMediaDir(window, q.get('media'));
  resolveMediaPaths(out, dir);
  // Dopo la risoluzione: forceNoReverse deve azzerare anche i percorsi appena
  // composti.
  if (out.forceNoReverse) out.transitions.forEach((t) => { t.reverseSrc = null; });
  return out;
}
