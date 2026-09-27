/**
 * La card "Vieni a trovarci" (blocco 5, scena 7).
 *
 *  - Orari: letti dall'archivio dell'officina (dati-officina.js), lo stesso che
 *    l'area amministratore modifica. Uno stato in cima dice se adesso e' aperto
 *    e fino a quando, o quando riapre; chiusure straordinarie comprese.
 *  - Mappa: l'incorporamento di Google Maps, senza chiave. Caricandola Google
 *    riceve l'indirizzo IP e puo' installare cookie, quindi serve il consenso
 *    (consenso.js): finche' manca, al posto della mappa c'e' la richiesta, e
 *    da Google non si scarica nulla. Con il consenso si carica la prima volta
 *    che una transizione punta alla scena della card (o ci si parte), cosi'
 *    chi non arriva fin qui non scarica nulla, e chi ci arriva la trova pronta
 *    alla fine del video. Revocato il consenso dalla cookie policy, la mappa
 *    si scarica subito.
 */
import { carica, isoGiorno, ORDINE_GIORNI } from './dati-officina.js';
import { t, lingua, giornoSettimana, maiuscola } from './i18n.js';
import { consenso, impostaConsenso } from './consenso.js';

const minuti = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const breve = (g) => maiuscola(giornoSettimana(g, 'short').replace(/\.$/, ''));

export class VisitaCard {
  /**
   * @param {object} config CONFIG risolto
   * @param {Document|HTMLElement} root
   */
  constructor(config, root = document) {
    this.el = root.querySelector('[data-vt]');
    this.config = config;
    this.scena = config.scenes.findIndex((s) => s.block === 'block-5');
  }

  attach() {
    if (!this.el) return;
    this.frame = this.el.querySelector('[data-vt-frame]');
    this.status = this.el.querySelector('[data-vt-status]');
    this.week = this.el.querySelector('[data-vt-week]');
    this.richiesta = this.el.querySelector('[data-vt-consent]');
    this.vicina = false;

    if (this.richiesta) {
      this.richiesta.querySelector('[data-vt-consent-ok]')
        .addEventListener('click', () => impostaConsenso('mappe', true));
    }
    document.addEventListener('consensochange', (e) => {
      if (!e.detail || e.detail.voce !== 'mappe') return;
      if (e.detail.valore) { if (this.vicina) this.caricaMappa(); } else this.scaricaMappa();
      this.mostraRichiesta();
    });
    this.mostraRichiesta();

    const vicino = (i) => Math.abs(i - this.scena) <= 1;
    document.addEventListener('transitionstart', (e) => {
      if (!e.detail) return;
      if (vicino(e.detail.to)) { this.vicina = true; this.caricaMappa(); }
      if (e.detail.to === this.scena) this.disegna();   // l'ora e' cambiata
    });
    document.addEventListener('scenechange', (e) => {
      if (e.detail && vicino(e.detail.index)) { this.vicina = true; this.caricaMappa(); }
    });
    // Un orario cambiato nell'area amministratore si vede subito.
    document.addEventListener('officinachange', () => this.disegna());
    // Cambio lingua: orari riscritti, e la mappa gia' caricata con i nomi
    // nella lingua nuova.
    document.addEventListener('linguachange', () => {
      this.disegna();
      if (this.frame && this.frame.src) this.frame.src = this.indirizzoMappa();
    });
    this.disegna();
  }

  /** L'incorporamento di Google Maps, con le etichette nella lingua del sito. */
  indirizzoMappa() {
    const u = new URL(this.frame.dataset.src);
    u.searchParams.set('hl', lingua());
    return u.href;
  }

  caricaMappa() {
    if (!this.frame || this.frame.src || !consenso('mappe')) return;
    this.frame.src = this.indirizzoMappa();
  }

  /** Consenso revocato: l'iframe se ne va, e con lui la connessione a Google. */
  scaricaMappa() {
    if (!this.frame || !this.frame.hasAttribute('src')) return;
    // Togliere l'attributo non basta: il documento di Google resterebbe
    // caricato. Si naviga a una pagina vuota, poi si toglie l'attributo, cosi'
    // il CSS ([src]) la nasconde e caricaMappa() la considera assente.
    this.frame.src = 'about:blank';
    this.frame.removeAttribute('src');
  }

  mostraRichiesta() {
    if (this.richiesta) this.richiesta.hidden = consenso('mappe');
  }

  disegna() {
    const o = carica().orari;
    const ora = new Date();
    const oggi = ora.getDay();
    const iso = isoGiorno(ora);

    const chiusura = (giorno) => (o.chiusure || []).find((c) => giorno >= c.da && giorno <= c.a);
    const fasceDi = (g, isoG) => {
      const d = o.settimana[g];
      if (!d || !d.aperto || chiusura(isoG)) return [];
      return d.fasce || [];
    };

    // Stato di adesso.
    const adesso = ora.getHours() * 60 + ora.getMinutes();
    const fasce = fasceDi(oggi, iso);
    const inCorso = fasce.find((f) => adesso >= minuti(f.da) && adesso < minuti(f.a));
    let aperto = false;
    let testo;
    if (inCorso) {
      aperto = true;
      testo = t('Aperto ora · chiude alle {ora}', { ora: inCorso.a });
    } else {
      const dopo = fasce.find((f) => minuti(f.da) > adesso);
      if (dopo) testo = t('Chiuso ora · apre alle {ora}', { ora: dopo.da });
      else {
        // Il primo giorno aperto nella settimana che viene.
        testo = t('Chiuso ora');
        for (let n = 1; n <= 7; n++) {
          const d = new Date(ora); d.setDate(d.getDate() + n);
          const f = fasceDi(d.getDay(), isoGiorno(d));
          if (f.length) {
            testo = n === 1
              ? t('Chiuso ora · riapre domani alle {ora}', { ora: f[0].da })
              : t('Chiuso ora · riapre {giorno} alle {ora}', { giorno: giornoSettimana(d.getDay()), ora: f[0].da });
            break;
          }
        }
      }
      const oggiChiuso = chiusura(iso);
      if (oggiChiuso && oggiChiuso.motivo) testo += ` · ${oggiChiuso.motivo}`;
    }
    this.status.dataset.open = String(aperto);
    this.status.textContent = testo;

    // La settimana, da lunedi', con oggi in evidenza.
    this.week.replaceChildren(...ORDINE_GIORNI.map((g) => {
      const d = new Date(ora); d.setDate(d.getDate() + ((g - oggi + 7) % 7));
      const f = fasceDi(g, isoGiorno(d));
      const li = document.createElement('li');
      if (g === oggi) li.dataset.today = 'true';
      const giorno = document.createElement('span');
      giorno.textContent = breve(g);
      const orari = document.createElement('span');
      orari.textContent = f.length ? f.map((x) => `${x.da}–${x.a}`).join('  ') : t('Chiuso');
      if (!f.length) li.dataset.closed = 'true';
      li.append(giorno, orari);
      return li;
    }));
  }
}
