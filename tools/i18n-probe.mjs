/**
 * Sonda della traduzione nel browser (server locale gia' avviato).
 *
 * Per ciascuna lingua: carica la pagina con quella lingua ricordata, percorre
 * tutte le scene, usa servizi e prenotazione fino alla conferma, apre i
 * contenuti, entra nell'area amministratore e ne apre ogni pagina; poi cambia
 * lingua con i pannelli aperti. Segnala:
 *  - errori della pagina e thread bloccato;
 *  - frasi chieste a t() senza traduzione (i18n.js, `mancanti`);
 *  - testi visibili rimasti in italiano pur avendo una traduzione.
 * Salva uno scatto per scena e lingua in tools/shots/i18n/.
 *
 *   node tools/i18n-probe.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, BASE } from './browser.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, 'shots', 'i18n');
fs.mkdirSync(SHOTS, { recursive: true });

const LINGUE = ['it', 'en', 'uk'];
const pausa = (ms) => new Promise((r) => { setTimeout(r, ms); });
const browser = await launch({ width: 1440, height: 810 });
let problemi = 0;

/** Una valutazione che non risponde entro 5 s vuol dire thread bloccato. */
async function valuta(page, fn, ...arg) {
  return Promise.race([
    page.evaluate(fn, ...arg),
    pausa(5000).then(() => { throw new Error('THREAD BLOCCATO'); }),
  ]);
}

const idle = (page, ms = 20000) => page.waitForFunction(
  () => window.__TOC__ && window.__TOC__.introDone && !window.__TOC__.machine.isBusy, { timeout: ms, polling: 100 });

async function avanti(page) {
  await page.keyboard.press('ArrowDown');
  await pausa(250);
  await idle(page);
  await pausa(900);   // entrata dei blocchi
}

/** Testi visibili che sono ancora frasi italiane del dizionario. */
function residui() {
  return import('/assets/js/i18n-testi.js').then(({ TESTI }) => import('/assets/js/i18n.js').then(({ lingua }) => {
    const l = lingua();
    if (l === 'it') return [];
    const col = l === 'en' ? 0 : 1;
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const out = new Set();
    const visibile = (el) => {
      for (let e = el; e; e = e.parentElement) {
        if (e.hidden) return false;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      }
      return true;
    };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const s = norm(n.nodeValue);
      const v = TESTI[s];
      if (v && v[col] !== s && typeof v[col] === 'string' && n.parentElement && visibile(n.parentElement)) out.add(s);
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
      for (const a of ['aria-label', 'title', 'placeholder']) {
        const s = el.getAttribute(a);
        const v = s && TESTI[norm(s)];
        if (v && typeof v[col] === 'string' && v[col] !== norm(s)) out.add(`@${a}: ${s}`);
      }
    }
    return [...out];
  }));
}

for (const lingua of LINGUE) {
  const page = await browser.newPage();
  const errori = [];
  const nota = (s) => errori.push(s);
  page.on('pageerror', (e) => nota('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') nota('console: ' + m.text()); });
  page.on('dialog', (d) => d.dismiss());
  await page.evaluateOnNewDocument((l) => {
    try { localStorage.setItem('toc-lingua', l); localStorage.removeItem('toc-officina-demo-v2'); } catch { /* */ }
  }, lingua);
  const scatta = (nome) => page.screenshot({ path: path.join(SHOTS, `${lingua}-${nome}.png`) });
  const controlla = async (dove) => {
    for (const r of await valuta(page, residui)) nota(`in italiano (${dove}): ${r}`);
  };

  try {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await idle(page, 40000);
    await pausa(800);
    if (await valuta(page, () => document.documentElement.lang) !== lingua) nota('html[lang] errato');

    // Scena per scena, con le parti interattive dove ci sono.
    for (let i = 0; i < 12; i++) {
      const id = await valuta(page, () => window.__TOC__.machine.scene.id);
      await scatta(`${String(i).padStart(2, '0')}-${id}`);
      await controlla(id);

      if (id === 'fronte-tre-q') {
        await valuta(page, () => document.querySelector('[data-svc-open]').click());
        await pausa(700);
        await valuta(page, () => document.querySelector('[data-svc-list] .svc__pick').click());
        await pausa(700);
        // Primo giorno prenotabile, primo orario, avanti.
        await valuta(page, () => {
          const next = document.querySelector('[data-cal-next]');
          let giorno = document.querySelector('.cal__day:not([disabled])');
          if (!giorno && next && !next.disabled) { next.click(); giorno = document.querySelector('.cal__day:not([disabled])'); }
          giorno.click();
        });
        await pausa(400);
        await valuta(page, () => document.querySelector('.bk__slot').click());
        await scatta('servizi-calendario');
        await controlla('calendario');
        await valuta(page, () => document.querySelector('[data-bk-next]').click());
        await pausa(400);
        // Invio a vuoto: devono comparire gli errori, tradotti.
        await valuta(page, () => document.querySelector('[data-bk-send]').click());
        await pausa(300);
        await scatta('servizi-errori');
        await controlla('errori del modulo');
        await valuta(page, () => {
          const f = document.querySelector('[data-bk-form]').elements;
          f.nome.value = 'Mario Rossi'; f.telefono.value = '333 1234567'; f.auto.value = 'Fiat Panda'; f.privacy.checked = true;
          document.querySelector('[data-bk-send]').click();
        });
        await pausa(600);
        await scatta('servizi-conferma');
        await controlla('conferma');
        // Cambio lingua con il pannello aperto sulla conferma, e ritorno.
        for (const altra of LINGUE.filter((l) => l !== lingua).concat(lingua)) {
          await valuta(page, (l) => document.querySelector(`[data-lang-code="${l}"]`).click(), altra);
          await pausa(250);
        }
        await controlla('dopo i cambi di lingua');
        await valuta(page, () => document.querySelector('[data-svc-close]').click());
        await pausa(700);
      }
      if (id === 'ruota') {
        await page.keyboard.press('ArrowDown');     // apre la sottopagina
        await pausa(1800);
        await scatta('contenuti');
        await controlla('contenuti');
      }

      const prima = await valuta(page, () => window.__TOC__.machine.index);
      await avanti(page);
      if (await valuta(page, () => window.__TOC__.machine.index) === prima) break;
    }

    // Noleggio: la freccia avanti, poi un cambio di lingua sulla pagina.
    await valuta(page, () => { const b = document.querySelector('[data-nl-next]'); if (b && !b.disabled) b.click(); });
    await pausa(500);
    await controlla('noleggio');

    // Area amministratore: si torna alla scena 2 e si spegne la luce.
    for (let k = 0; k < 12 && await valuta(page, () => window.__TOC__.machine.index) > 1; k++) {
      await page.keyboard.press('ArrowUp');
      await pausa(250);
      await idle(page);
    }
    await pausa(800);
    await valuta(page, () => document.querySelector('[data-lamp]').click());
    await pausa(300);
    await idle(page);
    await pausa(1500);
    await scatta('admin-accesso');
    await controlla('accesso');
    await valuta(page, () => document.querySelector('[data-adm-send]').click());   // vuoto: errore
    await pausa(200);
    await controlla('errore di accesso');
    await valuta(page, () => { document.querySelector('[data-adm-demo-fill]').click(); document.querySelector('[data-adm-send]').click(); });
    await pausa(800);
    await scatta('admin-benvenuto');
    await controlla('benvenuto');
    for (const voce of ['servizi', 'prenotazioni', 'flotta', 'orari', 'preventivo']) {
      await valuta(page, (v) => document.querySelector(`[data-admin-item="${v}"]`).click(), voce);
      await pausa(900);
      if (voce === 'prenotazioni') {
        await valuta(page, () => { const b = document.querySelector('.admp__expand'); if (b) b.click(); });
        await pausa(400);
      }
      await scatta(`admin-${voce}`);
      await controlla(`admin ${voce}`);
    }
    // Cambio lingua dentro l'area, con la pagina del preventivo aperta.
    for (const altra of LINGUE.filter((l) => l !== lingua).concat(lingua)) {
      await valuta(page, (l) => document.querySelector(`[data-lang-code="${l}"]`).click(), altra);
      await pausa(300);
    }
    await controlla('admin dopo i cambi di lingua');
    // Luce riaccesa: si esce.
    await valuta(page, () => document.querySelector('[data-lamp]').click());
    await pausa(300);
    await idle(page);
    await pausa(800);

    const mancanti = await valuta(page, () => import('/assets/js/i18n.js').then((m) => [...m.mancanti]));
    mancanti.forEach((m) => nota('senza traduzione: ' + m));
    const failure = await valuta(page, () => { const f = document.getElementById('failure'); return f && !f.hidden ? f.innerText : null; });
    if (failure) nota('riquadro di errore: ' + failure);
  } catch (e) {
    nota('interrotto: ' + e.message);
  }

  const unici = [...new Set(errori)];
  console.log(`\n== ${lingua}: ${unici.length ? unici.length + ' problemi' : 'ok'}`);
  unici.forEach((e) => console.log('  ! ' + e));
  problemi += unici.length;
  await page.close().catch(() => {});
}
await browser.close();
console.log(`\nscatti in ${path.relative(process.cwd(), SHOTS)}`);
process.exit(problemi ? 1 : 0);
