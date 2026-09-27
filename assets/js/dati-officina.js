/**
 * Archivio dei dati dell'officina: catalogo dei servizi, orari di apertura,
 * parco auto a noleggio, prenotazioni.
 *
 * Lo leggono il sito pubblico (pannello dei servizi, calendario della
 * prenotazione) e lo scrive l'area amministratore: cosi' quello che si cambia
 * nell'area si vede subito nel sito.
 *
 * DEMO. Senza un server l'archivio vive nel localStorage del browser: le
 * modifiche le vede solo chi le ha fatte, su quel browser. Al primo avvio (o
 * senza localStorage) si parte dai dati di base: il catalogo di
 * menu_servizi.txt, gli orari di config.prenotazione e qualche dato di esempio
 * per prenotazioni e parco auto. Con un server, `carica` e `salva` sono gli
 * unici due punti da sostituire con chiamate alla sua API.
 */
import { SERVIZI } from './servizi-data.js';
import { CONFIG } from './config.js';

export const CHIAVE = 'toc-officina-demo-v2';

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
/** Ordine di visualizzazione: da lunedi' a domenica. */
export const ORDINE_GIORNI = [1, 2, 3, 4, 5, 6, 0];

export const nuovoId = () => Math.random().toString(36).slice(2, 10);

const oggi = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const isoGiorno = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fraGiorni = (n) => { const d = oggi(); d.setDate(d.getDate() + n); return isoGiorno(d); };
/** L'n-esimo giorno lavorativo (lun-sab) da oggi, in avanti o indietro: le
 *  prenotazioni di esempio non devono cadere di domenica, quando e' chiuso. */
const fraGiorniAperti = (n) => {
  const d = oggi();
  const passo = n < 0 ? -1 : 1;
  for (let i = 0; i < Math.abs(n);) { d.setDate(d.getDate() + passo); if (d.getDay() !== 0) i++; }
  return isoGiorno(d);
};

const minuti = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/* ------------------------------------------------------------ dati di base */

/** Gli orari di config.prenotazione (elenchi di orari) diventati fasce:
 *  la prima fascia del mattino e quella del pomeriggio, chiuse un passo dopo
 *  l'ultimo orario proposto. */
function orariBase() {
  const cfg = CONFIG.prenotazione || {};
  const passo = 60;
  const settimana = {};
  for (let g = 0; g < 7; g++) {
    const slot = ((cfg.orari && cfg.orari[g]) || []).map(minuti);
    const chiuso = (cfg.giorniChiusi || []).includes(g) || !slot.length;
    const mattina = slot.filter((m) => m < 13 * 60);
    const pomeriggio = slot.filter((m) => m >= 13 * 60);
    const fascia = (xs) => (xs.length ? { da: hhmm(xs[0]), a: hhmm(xs[xs.length - 1] + passo) } : null);
    settimana[g] = { aperto: !chiuso, fasce: [fascia(mattina), fascia(pomeriggio)].filter(Boolean) };
  }
  return { passo, settimana, chiusure: [] };
}

/** Foto del parco di esempio, per targa: immagini scontornate su fondo
 *  trasparente (assets/media/noleggio). Le altre auto restano senza foto
 *  finche' l'officina non ne carica una dall'area amministratore. */
export const CARTELLA_FOTO_AUTO = 'assets/media/noleggio/';
const FOTO_ESEMPIO = {
  GH118AB: 'fiat-panda-hybrid.webp',
  GF902KL: 'volkswagen-polo.webp',
  GL330TR: 'toyota-c-hr-hybrid.webp',
  GM015CD: 'audi-a3-sportback.webp',
};
const fotoEsempio = (targa) => (FOTO_ESEMPIO[targa] ? CARTELLA_FOTO_AUTO + FOTO_ESEMPIO[targa] : null);

/** Prezzi di partenza di esempio: solo alcuni, gli altri li mette l'officina. */
const PREZZI_ESEMPIO = {
  'Tagliando completo': 190, 'Cambio olio e filtro rapido': 79,
  'Diagnosi computerizzata errori centralina (OBD)': 45, 'Cambio gomme stagionale': 40,
  'Equilibratura e convergenza ruote': 55, 'Ricarica gas climatizzatore': 70,
  'Pre-revisione con check-up dei parametri ministeriali': 35,
  'Gestione e svolgimento revisione periodica di legge (MCTC)': 79,
};

function base() {
  return {
    versione: 2,
    catalogo: SERVIZI.map((c) => ({
      id: nuovoId(),
      titolo: c.titolo,
      servizi: c.servizi.map((s) => ({
        id: nuovoId(), nome: s.nome, dettaglio: s.dettaglio || '',
        attivo: true, prezzo: PREZZI_ESEMPIO[s.nome] ?? null, durata: 60,
      })),
    })),
    orari: orariBase(),
    // Dati di esempio: nomi, telefoni e targhe sono inventati.
    prenotazioni: [
      { id: nuovoId(), data: fraGiorniAperti(1), ora: '08:30', nome: 'Luca Ferri', telefono: '333 204 7781', email: null, auto: 'Audi A4 · FG123KL', servizi: ['Tagliando completo'], note: null, stato: 'Confermata', notaInterna: '', creata: fraGiorni(-3) },
      { id: nuovoId(), data: fraGiorniAperti(1), ora: '10:30', nome: 'Chiara Villa', telefono: '347 118 0923', email: 'chiara.v@example.com', auto: 'Fiat 500X · GB552TR', servizi: ['Cambio gomme stagionale', 'Equilibratura e convergenza ruote'], note: 'Gomme in deposito', stato: 'Da confermare', notaInterna: '', creata: fraGiorni(-1) },
      { id: nuovoId(), data: fraGiorniAperti(2), ora: '14:30', nome: 'Marco Galli', telefono: '339 902 1144', email: null, auto: 'BMW 320d · FT908ZA', servizi: ['Diagnosi computerizzata errori centralina (OBD)'], note: 'Spia motore accesa', stato: 'Da confermare', notaInterna: '', creata: fraGiorni(0) },
      { id: nuovoId(), data: fraGiorniAperti(4), ora: '09:30', nome: 'Elena Rota', telefono: '328 441 6620', email: null, auto: 'Toyota Yaris · GK014MN', servizi: ['Ricarica gas climatizzatore'], note: null, stato: 'Confermata', notaInterna: '', creata: fraGiorni(-5) },
      { id: nuovoId(), data: fraGiorniAperti(-2), ora: '11:30', nome: 'Paolo Neri', telefono: '335 700 2213', email: null, auto: 'VW Golf · EZ771PL', servizi: ['Gestione e svolgimento revisione periodica di legge (MCTC)'], note: null, stato: 'Completata', notaInterna: 'Revisione superata', creata: fraGiorni(-9) },
    ],
    flotta: [
      { id: nuovoId(), modello: 'Fiat Panda Hybrid', targa: 'GH118AB', categoria: 'Citycar', anno: 2023, alimentazione: 'Ibrida', cambio: 'Manuale', posti: 5, prezzo: 39, cauzione: 300, km: 18400, stato: 'Disponibile', foto: fotoEsempio('GH118AB'), note: '' },
      { id: nuovoId(), modello: 'Volkswagen Polo', targa: 'GF902KL', categoria: 'Compatta', anno: 2022, alimentazione: 'Benzina', cambio: 'Manuale', posti: 5, prezzo: 49, cauzione: 400, km: 32150, stato: 'Noleggiata', foto: fotoEsempio('GF902KL'), note: '' },
      { id: nuovoId(), modello: 'Toyota C-HR Hybrid', targa: 'GL330TR', categoria: 'SUV', anno: 2023, alimentazione: 'Ibrida', cambio: 'Automatico', posti: 5, prezzo: 69, cauzione: 500, km: 21780, stato: 'Disponibile', foto: fotoEsempio('GL330TR'), note: '' },
      { id: nuovoId(), modello: 'Ford Transit Custom', targa: 'FZ447MN', categoria: 'Furgone', anno: 2020, alimentazione: 'Diesel', cambio: 'Manuale', posti: 3, prezzo: 89, cauzione: 800, km: 64020, stato: 'In manutenzione', foto: null, note: 'Tagliando in corso' },
      { id: nuovoId(), modello: 'Audi A3 Sportback', targa: 'GM015CD', categoria: 'Premium', anno: 2024, alimentazione: 'Benzina', cambio: 'Automatico', posti: 5, prezzo: 79, cauzione: 600, km: 9800, stato: 'Disponibile', foto: fotoEsempio('GM015CD'), note: '' },
    ],
    preventivi: 0,
  };
}

/* ------------------------------------------------------ lettura e scrittura */

let cache = null;

/** L'archivio corrente. Sempre lo stesso oggetto: chi lo modifica chiama `salva`. */
export function carica() {
  if (cache) return cache;
  // L'archivio della prima versione della demo non lo legge piu' nessuno.
  try { localStorage.removeItem('toc-admin-demo-v1'); } catch { /* niente */ }
  try {
    const d = JSON.parse(localStorage.getItem(CHIAVE));
    if (d && d.versione === 2 && Array.isArray(d.catalogo)) cache = d;
  } catch { /* nessun archivio leggibile: si parte dalla base */ }
  // Un archivio salvato prima che arrivassero le foto di esempio le ha vuote:
  // si riempiono, ma solo dove manca una foto (quelle caricate restano).
  if (cache) {
    for (const a of cache.flotta || []) if (!a.foto && fotoEsempio(a.targa)) a.foto = fotoEsempio(a.targa);
  }
  if (!cache) cache = base();
  if (pulisciPrenotazioni(cache)) salva();
  return cache;
}

/** Oltre questi giorni dall'appuntamento una prenotazione esce dall'archivio. */
export const GIORNI_CONSERVAZIONE = 30;

/**
 * Toglie le prenotazioni con l'appuntamento passato da oltre
 * GIORNI_CONSERVAZIONE giorni, qualunque sia il loro stato.
 * @returns {number} quante ne ha tolte.
 */
export function pulisciPrenotazioni(d = carica()) {
  const limite = fraGiorni(-GIORNI_CONSERVAZIONE);
  const prima = d.prenotazioni.length;
  d.prenotazioni = d.prenotazioni.filter((p) => !p.data || p.data >= limite);
  return prima - d.prenotazioni.length;
}

/**
 * Salva l'archivio e avvisa la pagina (evento `officinachange`).
 * @returns {boolean} false se il browser ha rifiutato (spazio esaurito, per
 *   esempio con molte foto): chi chiama lo deve dire all'utente.
 */
export function salva() {
  let ok = true;
  try { localStorage.setItem(CHIAVE, JSON.stringify(carica())); } catch { ok = false; }
  document.dispatchEvent(new CustomEvent('officinachange'));
  return ok;
}

/** Torna ai dati di base (serve alla demo e ai test). */
export function ripristina() {
  cache = base();
  try { localStorage.removeItem(CHIAVE); } catch { /* niente da togliere */ }
  document.dispatchEvent(new CustomEvent('officinachange'));
  return cache;
}

/* --------------------------------------------------------- viste pubbliche */

/** Il catalogo come lo vede il cliente: solo i servizi prenotabili, solo le
 *  categorie che ne hanno almeno uno. Stessa forma di SERVIZI. */
export function catalogoPubblico() {
  return carica().catalogo
    .map((c) => ({
      titolo: c.titolo,
      servizi: c.servizi.filter((s) => s.attivo).map((s) => (s.dettaglio ? { nome: s.nome, dettaglio: s.dettaglio } : { nome: s.nome })),
    }))
    .filter((c) => c.servizi.length);
}

/** Gli orari prenotabili di un giorno: vuoto se chiuso (giorno della settimana
 *  o chiusura straordinaria). Un orario e' proposto se c'e' un passo intero
 *  prima della fine della fascia. */
export function slotDi(data) {
  const o = carica().orari;
  if (o.chiusure.some((c) => data >= new Date(c.da + 'T00:00') && data <= new Date(c.a + 'T23:59'))) return [];
  const g = o.settimana[data.getDay()];
  if (!g || !g.aperto) return [];
  const passo = Number(o.passo) || 60;
  const out = [];
  for (const f of g.fasce) {
    if (!f || !f.da || !f.a) continue;
    for (let m = minuti(f.da); m + passo <= minuti(f.a); m += passo) out.push(hhmm(m));
  }
  return out;
}
