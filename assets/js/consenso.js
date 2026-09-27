/**
 * Consenso ai contenuti di terze parti.
 *
 * Il sito non usa cookie di profilazione ne' statistiche: l'unico contenuto di
 * terzi e' la mappa di Google nella scena "Vieni a trovarci", che al
 * caricamento trasmette a Google l'indirizzo IP e puo' installare cookie. Per
 * le linee guida del Garante (10 giugno 2021) si carica solo dopo una scelta
 * attiva e informata: il pulsante sulla mappa stessa (visita.js), revocabile
 * dal pannello dei cookie (legale.js). Nessun banner, perche' nient'altro
 * richiede consenso; se un giorno si aggiungessero statistiche o pixel
 * pubblicitari, servirebbe anche il banner al primo accesso.
 *
 * La scelta resta nel browser con la sua data e scade dopo sei mesi: poi la
 * mappa torna a chiedere. La versione cambia se cambiano le voci: una scelta
 * fatta su un elenco diverso non vale piu'.
 */
const CHIAVE = 'toc-consenso';
const VERSIONE = 1;
export const DURATA_GIORNI = 180;

/** Le voci per cui si chiede il consenso. */
export const VOCI = ['mappe'];

function leggi() {
  try {
    const r = JSON.parse(localStorage.getItem(CHIAVE));
    if (!r || r.versione !== VERSIONE) return null;
    if (Date.now() - r.data > DURATA_GIORNI * 864e5) return null;
    return r;
  } catch { return null; }
}

/** La scelta in memoria vale anche senza localStorage, per questa visita. */
let memoria = null;

/** @param {string} voce @returns {boolean} true solo con un consenso valido */
export function consenso(voce) {
  const r = leggi() || memoria;
  return !!(r && r.scelte && r.scelte[voce] === true);
}

/** Registra la scelta su una voce e avvisa la pagina (`consensochange`). */
export function impostaConsenso(voce, valore) {
  const prima = leggi() || memoria || { scelte: {} };
  const r = { versione: VERSIONE, data: Date.now(), scelte: { ...prima.scelte, [voce]: !!valore } };
  memoria = r;
  try { localStorage.setItem(CHIAVE, JSON.stringify(r)); } catch { /* vale per questa visita */ }
  document.dispatchEvent(new CustomEvent('consensochange', { detail: { voce, valore: !!valore } }));
}

/** Data della scelta registrata, o null. */
export function dataConsenso() {
  const r = leggi() || memoria;
  return r ? new Date(r.data) : null;
}
