/**
 * Avvio della pagina: mette insieme player, macchina a stati, input e blocchi.
 *
 * Due impegni sull'affidabilita':
 *  - la pagina non diventa mai nera in silenzio (file://, motore che non parte,
 *    eccezione non gestita: viene sempre mostrata una spiegazione a schermo);
 *  - nessuna attesa e' illimitata, quindi un video irraggiungibile non blocca
 *    la navigazione per sempre.
 */
import { CONFIG, applyOverrides } from './config.js';
import { VideoPlayer } from './video-player.js';
import { SceneMachine } from './scene-machine.js';
import { InputController } from './input-controller.js';
import { BlockBinder, SceneCounter } from './blocks.js';
import { MenuHighlight } from './menu.js';
import { ThemeSwitch, PaintPicker, ScrollCue } from './controls.js';

// Generoso di proposito: serve a non lasciare mai una pagina nera in silenzio,
// non a dichiarare guasto un caricamento semplicemente lento. Viene comunque
// annullato appena il motore e' pronto, quindi un'attesa lunga ma riuscita non
// mostra nessun errore.
const BOOT_WATCHDOG_MS = 15000;
let booted = false;

function showFailure(title, detail) {
  const box = document.getElementById('failure');
  if (!box) return;
  box.querySelector('[data-failure-title]').textContent = title;
  box.querySelector('[data-failure-detail]').textContent = detail;
  box.hidden = false;
  document.documentElement.dataset.state = 'failed';
}

function describeFileProtocol() {
  return [
    'La pagina e’ stata aperta con il protocollo file://.',
    'I moduli JavaScript e le richieste Range sui video non funzionano cosi’.',
    'Avvia il server incluso e riapri la pagina:',
    '',
    '    node tools/serve.js',
    '    http://localhost:5173/',
  ].join('\n');
}

async function start() {
  // Modalita' di cattura per il confronto al pixel. Va decisa PRIMA del primo
  // disegno: cambiarla a pagina gia' dipinta rende il momento dello scatto
  // dipendente dal compositore, e i due scatti finiscono per essere identici.
  if (new URLSearchParams(location.search).get('capture') === 'bg') {
    document.documentElement.dataset.capture = 'bg';
  }

  if (location.protocol === 'file:') {
    showFailure('Serve un server locale', describeFileProtocol());
    return;
  }

  const config = applyOverrides(CONFIG);
  const stage = document.getElementById('stage');
  const counterEl = document.getElementById('counter');

  const player = new VideoPlayer(stage, config);
  player.build();

  const machine = new SceneMachine(config, player);
  const binder = new BlockBinder(config, document);
  const counter = new SceneCounter(config, counterEl);
  const menu = new MenuHighlight(config, document.querySelector('.menu'));
  binder.attach();
  counter.attach();
  menu.attach();

  // Contatori dei passi scartati: servono agli autotest per distinguere
  // "ignorato perche' in transizione" da "ignorato perche' al bordo".
  const rejected = { inTransition: 0, atEdge: 0 };

  // Un solo punto di ingresso per ogni richiesta di passo, da qualunque parte
  // arrivi: rotellina, tastiera, swipe o il pulsante in fondo alla pagina. Se il
  // passo non e' possibile si scarta e basta: niente coda.
  const richiediPasso = (dir, source) => {
    if (machine.isBusy) { rejected.inTransition += 1; return; }
    // canGo e' falso anche a luce spenta: la sequenza si percorre solo con il
    // tema chiaro, quindi il passo viene scartato come al bordo della sequenza.
    if (!machine.canGo(dir)) { rejected.atEdge += 1; return; }
    // Le clip riavvolte pesano quanto tutte le altre messe insieme e servono a
    // una sola cosa: tornare indietro. Si cominciano a scaricare qui, alla prima
    // richiesta di tornare indietro che sia davvero eseguibile — mai prima.
    // Quella in partenza adesso se la carica il player da solo; questa coda
    // prepara le successive, e cede comunque il passo alla transizione in corso.
    if (dir < 0) player.preloadReverse(machine.index);
    machine.step(dir, source);
  };

  const input = new InputController(config, richiediPasso);

  // I due comandi visibili. Vengono dopo perche' lo scrollcue chiede un passo
  // esattamente come la rotellina, e passa dallo stesso punto di ingresso.
  const lamp = new ThemeSwitch(config, machine, document);
  const paint = new PaintPicker(config, machine, document);
  const scrollcue = new ScrollCue(machine, richiediPasso, document);
  lamp.attach();
  paint.attach();
  scrollcue.attach();

  const start0 = config.startScene ?? 0;
  await machine.boot(start0);
  binder.init(start0);
  counter.set(start0);
  menu.set(start0);
  input.attach();

  // Entrati in una variante, l'unica cosa che si puo' fare e' uscirne: le clip
  // del ritorno vengono preparate mentre si guarda quella dell'andata.
  document.addEventListener('variantstart', (e) => {
    if (e.detail && e.detail.direction > 0) player.preloadVariants('rev');
  });

  // Esposizione per gli autotest: nessun effetto sul comportamento normale.
  // introDone distingue "fermo perche' l'intro deve ancora partire" da "fermo
  // perche' l'intro e' finita": senza questa bandiera un test che aspetta solo
  // lo stato idle puo' leggere la pagina un istante prima che l'intro cominci.
  window.__TOC__ = {
    config, player, machine, input, binder, counter, menu, lamp, paint, scrollcue,
    rejected, introDone: false,
  };
  booted = true;
  document.dispatchEvent(new CustomEvent('engineready', { detail: { scenes: config.scenes.length } }));

  if (config.noIntro) {
    window.__TOC__.introDone = true;
  } else {
    // Intro: il primo video parte da solo, senza alcuno scroll, e porta alla
    // seconda scena. Da li' in poi si procede solo tramite scroll.
    await machine.step(1, 'intro');
    window.__TOC__.introDone = true;
  }

  // Il precaricamento parte solo ORA, e soltanto sulle clip in avanti: durante
  // l'intro ruberebbe banda proprio alla clip che si sta guardando, e le clip
  // riavvolte non servono a nessuno finche' non si torna indietro.
  await player.preloadForward(machine.index);

  // Le clip delle varianti per ultime: lampadina e vernice sono comandi
  // volontari, quindi possono aspettare che la sequenza sia pronta, ma quando
  // vengono premuti devono partire subito e non mettersi a scaricare.
  player.preloadVariants('fwd');
}

window.addEventListener('error', (e) => {
  showFailure('Errore in pagina', String(e.message || e.error || e));
});
window.addEventListener('unhandledrejection', (e) => {
  showFailure('Errore in pagina', String((e.reason && e.reason.message) || e.reason || e));
});

setTimeout(() => {
  if (!booted && document.documentElement.dataset.state === 'boot') {
    showFailure(
      'Il motore non e’ partito',
      'Nessuna scena si e’ avviata entro ' + (BOOT_WATCHDOG_MS / 1000) + ' secondi.\n'
      + 'Controlla la console del browser e che i file in assets/media/ siano raggiungibili.',
    );
  }
}, BOOT_WATCHDOG_MS);

start().catch((err) => showFailure('Avvio fallito', String((err && err.stack) || err)));
