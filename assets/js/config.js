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

  // menuItem: indice della voce di menu che la scena rende corrente, oppure null
  // se nessuna lo e'. Le voci sono cinque e coprono le scene 2-6; la prima e
  // l'ultima non ne hanno una.
  scenes: [
    { id: 'campo-lungo',     label: 'Campo lungo',          block: null,      counter: { n: 1, bar: 0.120 }, menuItem: null },
    { id: 'retro-tre-q',     label: 'Vista posteriore',     block: 'block-1', counter: { n: 2, bar: 0.267 }, menuItem: 0 },
    { id: 'fronte-tre-q',    label: 'Vista anteriore',      block: 'block-2', counter: { n: 3, bar: 0.413 }, menuItem: 1 },
    { id: 'ruota',           label: 'Ruota in primo piano', block: 'block-3', counter: { n: 4, bar: 0.560 }, menuItem: 2 },
    { id: 'vista-alto',      label: 'Vista dall’alto',     block: null,      counter: { n: 5, bar: 0.707 }, menuItem: 3 },
    { id: 'ruote-scomposte', label: 'Ruote scomposte',      block: null,      counter: { n: 6, bar: 0.853 }, menuItem: 4 },
    { id: 'ritorno-alto',    label: 'Ruote ricomposte',     block: null,      counter: { n: 7, bar: 1.000 }, menuItem: null },
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
