/**
 * Avvio della pagina: mette insieme player, macchina a stati, input e blocchi.
 *
 * Due impegni sull'affidabilita':
 *  - la pagina non diventa mai nera in silenzio (file://, motore che non parte,
 *    eccezione non gestita: viene sempre mostrata una spiegazione a schermo);
 *  - nessuna attesa e' illimitata, quindi un video irraggiungibile non blocca
 *    la navigazione per sempre.
 */
import { CONFIG, applyOverrides, mediaDirDiRiserva } from './config.js';
import { VideoPlayer } from './video-player.js';
import { SceneMachine } from './scene-machine.js';
import { InputController } from './input-controller.js';
import { BlockBinder, SceneCounter } from './blocks.js';
import { MenuHighlight } from './menu.js';
import { ThemeSwitch, PaintPicker, ScrollCue } from './controls.js';
import { ThemeTint } from './theme-tint.js';
import { ServiziPanel } from './servizi.js';
import { BookingPanel } from './prenotazione.js';
import { MenuHint } from './menu-hint.js';
import { costruisciRecensioni } from './recensioni.js';
import { ContenutiCard } from './contenuti.js';
import { AdminArea } from './admin.js';
import { SceltaLingua } from './lingua.js';
import { avviaLingua } from './i18n.js';
import { VisitaCard } from './visita.js';
import { NoleggioPage } from './noleggio.js';
import { ParallaxCards } from './parallax.js';
import { LegalePanel } from './legale.js';
import * as datiOfficina from './dati-officina.js';

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

  // Sul telefono niente scene video: una pagina che scorre, con le stesse
  // sezioni (assets/js/mobile.js). Lo decide mobile-detect.js, nel <head>.
  if (document.documentElement.dataset.mobile === 'true') {
    const { avviaMobile } = await import('./mobile.js');
    avviaMobile();
    booted = true;
    return;
  }

  // La lingua prima di tutto: i moduli qui sotto scrivono i loro testi gia'
  // tradotti, e l'istantanea dei testi dell'HTML va fatta prima che li tocchino.
  avviaLingua();

  const config = applyOverrides(CONFIG);
  const stage = document.getElementById('stage');
  const counterEl = document.getElementById('counter');

  // Le card delle recensioni vanno nel DOM prima che il binder dei blocchi le
  // veda: da li' in poi sono elementi animati come tutti gli altri.
  costruisciRecensioni(document);

  const player = new VideoPlayer(stage, config);
  // Codifica dichiarata ma illeggibile: si passa alla successiva (config.js).
  player.onFormatoIllegibile = (dir, fallite) => mediaDirDiRiserva(dir, fallite);
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
  const rejected = { inTransition: 0, atEdge: 0, panelOpen: 0 };

  // Il pannello dei servizi, sulla pagina "Servizi". Va creato prima del punto
  // di ingresso dei passi, che deve poterlo interrogare.
  const servizi = new ServiziPanel(document);
  servizi.attach();
  // A destra dei servizi, appena se ne sceglie uno: calendario e modulo.
  const booking = new BookingPanel(config, servizi, document);
  booking.attach();
  // La card dei contenuti, sottopagina della scena "Contenuti".
  const contenuti = new ContenutiCard(config, document);
  contenuti.attach();
  // Barra legale in fondo e pannello di privacy, cookie e note legali.
  const legale = new LegalePanel(document);
  legale.attach();

  // Un solo punto di ingresso per ogni richiesta di passo, da qualunque parte
  // arrivi: rotellina, tastiera, swipe o il pulsante in fondo alla pagina. Se il
  // passo non e' possibile si scarta e basta: niente coda.
  const richiediPasso = (dir, source) => {
    if (machine.isBusy) { rejected.inTransition += 1; return; }
    // A pannello dei servizi aperto la scena resta ferma: un passo porterebbe
    // via il blocco che lo contiene mentre lo si legge.
    if (servizi.aperto || legale.aperto) { rejected.panelOpen += 1; return; }
    // Sottopagina: sulla scena che ne ha una, il primo passo in avanti la apre
    // invece di cambiare scena, e un passo indietro la richiude soltanto. A
    // sottopagina aperta il passo in avanti prosegue normalmente, e la card
    // esce con il suo blocco.
    if (contenuti.aperto && dir < 0) { contenuti.chiudi(); return; }
    if (!contenuti.aperto && dir > 0 && machine.canGo(dir)
        && machine.scene && machine.scene.sottopagina === 'contenuti') {
      contenuti.apri();
      return;
    }
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

  // Il titolo segue la luce: a lampadina spenta si tinge di viola.
  const tint = new ThemeTint(config, player, machine, document.querySelector('.b1__title'));
  tint.attach();

  // Le voci del menu non portano altrove: un click sfoca la pagina e ricorda
  // che si naviga scorrendo.
  const hint = new MenuHint(machine, document);
  hint.attach();

  // A luce spenta: area amministratore (form di accesso e voci di gestione).
  const admin = new AdminArea(config, document);
  admin.attach();

  // Le bandierine nella barra: italiano, inglese, ucraino (i18n.js).
  new SceltaLingua(document).attach();

  // "Vieni a trovarci": orari dall'archivio dell'officina, mappa caricata
  // soltanto avvicinandosi alla scena.
  new VisitaCard(config, document).attach();

  // "Noleggio": le card del parco auto, dall'archivio dell'officina.
  new NoleggioPage(config, machine, document).attach();

  // Tutte le card si inclinano verso il cursore (effetto ParallaxCard).
  new ParallaxCards(document).attach();

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
    config, player, machine, input, binder, counter, menu, lamp, paint, scrollcue, tint, servizi, booking, contenuti, legale, hint, admin, dati: datiOfficina,
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
