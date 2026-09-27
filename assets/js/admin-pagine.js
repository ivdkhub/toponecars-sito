/**
 * Le pagine dell'area amministratore: Servizi, Prenotazioni, Parco
 * auto-noleggio, Orari di apertura, Genera preventivo. Piu' il riepilogo che
 * compare nella card di benvenuto dopo l'accesso.
 *
 * Una sola lastra di vetro, larga quanto la barra del menu, che cambia
 * contenuto con la voce scelta.
 *
 * I dati sono quelli dell'archivio dell'officina (dati-officina.js), lo stesso
 * che legge il sito pubblico: un servizio tolto qui sparisce dal pannello dei
 * servizi, un orario cambiato qui cambia il calendario della prenotazione, una
 * prenotazione inviata dal sito compare qui.
 *
 * Niente finestre di dialogo del browser: le eliminazioni si confermano con un
 * secondo click sullo stesso pulsante. Tutto il testo entra nel DOM con
 * textContent, mai come HTML costruito da stringhe.
 *
 * Le etichette passano da t() (i18n.js); i valori salvati nell'archivio (stati,
 * categorie, alimentazioni) restano in italiano e si traducono solo a video.
 * Al cambio lingua admin.js ridisegna la pagina aperta.
 */
import {
  carica, salva, nuovoId, isoGiorno, slotDi, ORDINE_GIORNI,
  pulisciPrenotazioni, GIORNI_CONSERVAZIONE,
} from './dati-officina.js';
import {
  t, tn, numero as num, euro as euroIn, data, giornoSettimana, maiuscola,
} from './i18n.js';

const IVA = 0.22;
const STATI_PREN = ['Da confermare', 'Confermata', 'Completata', 'Annullata'];
const STATI_AUTO = ['Disponibile', 'Noleggiata', 'In manutenzione'];
const CATEGORIE_AUTO = ['Citycar', 'Compatta', 'Berlina', 'Station wagon', 'SUV', 'Premium', 'Furgone'];
const ALIMENTAZIONI = ['Benzina', 'Diesel', 'Ibrida', 'Elettrica', 'GPL', 'Metano'];
const DURATE = [15, 30, 45, 60, 90, 120, 180, 240, 480];
const PASSI = [15, 30, 45, 60, 90];
const FOTO_MAX_LATO = 1280;
const FOTO_MAX_MB = 15;

/* ------------------------------------------------------------ utilita' DOM */

/** h('div', {class: 'x', onclick: fn}, figli...) — i figli stringa diventano testo. */
function h(tag, props = {}, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    // value come proprieta', e per ultimo: una textarea ignora l'attributo, e
    // un input numerico va valorizzato dopo aver ricevuto il suo tipo.
    if (k === 'value') continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of figli.flat()) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  if (props.value !== undefined && props.value !== null) el.value = String(props.value);
  return el;
}

const euro = (n) => euroIn(n);
const numero = (v) => (v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const dataBreve = (iso) => {
  const [y, m, g] = iso.split('-').map(Number);
  return data(new Date(y, m - 1, g), { weekday: 'short', day: 'numeric', month: 'short' });
};
const dataLunga = (iso) => {
  const [y, m, g] = iso.split('-').map(Number);
  return data(new Date(y, m - 1, g), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
/** Nome del giorno, con l'iniziale maiuscola: 0 = domenica. */
const nomeGiorno = (g) => maiuscola(giornoSettimana(g));
const dataCsv = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * Le prenotazioni come file CSV da aprire in Excel italiano: separatore punto
 * e virgola, BOM UTF-8 per gli accenti, righe CRLF. I campi che iniziano con
 * = + - @ prendono un apostrofo davanti: arrivano dal modulo pubblico, e un
 * foglio di calcolo li eseguirebbe come formule.
 */
function csvPrenotazioni(prenotazioni) {
  const cella = (v) => {
    let t = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const colonne = [
    ['Data', (p) => dataCsv(p.data)], ['Ora', (p) => p.ora], ['Cliente', (p) => p.nome],
    ['Telefono', (p) => p.telefono], ['Email', (p) => p.email], ['Auto', (p) => p.auto],
    ['Servizi', (p) => (p.servizi || []).map((s) => t(s)).join(', ')], ['Note del cliente', (p) => p.note],
    ['Stato', (p) => t(p.stato)], ['Nota interna', (p) => p.notaInterna], ['Ricevuta il', (p) => dataCsv(p.creata)],
  ];
  const righe = [colonne.map(([titolo]) => t(titolo)), ...prenotazioni.map((p) => colonne.map(([, f]) => f(p)))];
  return `﻿${righe.map((r) => r.map(cella).join(';')).join('\r\n')}\r\n`;
}

function scarica(nome, testo, tipo) {
  const url = URL.createObjectURL(new Blob([testo], { type: tipo }));
  const a = h('a', { href: url, download: nome, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const durata = (m) => (m < 60 ? t('{n} min', { n: m }) : t('{n} h', { n: num(m / 60) }));

/**
 * Pulsante che chiede conferma senza finestre: al primo click diventa
 * "Confermi?", al secondo esegue; dopo 3 secondi torna com'era.
 */
function conConferma(etichetta, azione, props = {}) {
  let timer = 0;
  const b = h('button', {
    type: 'button', class: 'admp__btn admp__btn--danger', ...props,
    onclick: () => {
      if (b.dataset.confirm === 'true') { clearTimeout(timer); azione(); return; }
      b.dataset.confirm = 'true';
      b.textContent = t('Confermi?');
      timer = setTimeout(() => { b.dataset.confirm = 'false'; b.textContent = etichetta; }, 3000);
    },
  }, etichetta);
  return b;
}

/**
 * La foto caricata diventa un'immagine di al massimo 1280 px sul lato lungo,
 * in WebP (JPEG dove il browser non sa scrivere WebP). Serve alla DEMO, che
 * salva tutto nel localStorage del browser (pochi MB in tutto): con un server
 * la foto originale andrebbe caricata la', e le misure si deciderebbero in
 * pubblicazione come per il resto dei media del sito.
 */
async function preparaFoto(file) {
  if (!file.type.startsWith('image/')) throw new Error(t('Il file scelto non è un’immagine.'));
  if (file.size > FOTO_MAX_MB * 1e6) throw new Error(t('La foto supera {n} MB.', { n: FOTO_MAX_MB }));
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, FOTO_MAX_LATO / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  let url = c.toDataURL('image/webp', 0.86);
  if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', 0.88);
  return url;
}

/* ------------------------------------------------------ foglio del preventivo */

const FOGLIO_W = 794; // A4 a 96 dpi, come .pv in stampa-preventivo.css

/**
 * Il foglio del preventivo, costruito nel documento `doc`: la pagina stessa
 * per l'anteprima, la finestra di stampa per il PDF. Stessa struttura e stesso
 * foglio di stile nei due casi. Intestazione e logo si costruiscono una volta;
 * `aggiorna` rifa' solo la parte che cambia con le voci.
 */
function foglioPreventivo(doc) {
  const el = (tag, testo, attr = {}) => {
    const e = doc.createElement(tag);
    if (testo !== null && testo !== undefined) e.textContent = testo;
    for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
    return e;
  };
  const foglio = el('article', null, { class: 'pv' });
  const logo = el('img', null, {
    class: 'pv__logo', alt: 'Top One Cars', width: '1024', height: '329', decoding: 'async',
    src: new URL('assets/media/logo@2x.webp', location.href).href,
  });
  const ditta = el('p', null, { class: 'pv__firm' });
  ditta.append(el('b', 'Top One Cars'), ` · ${t('Officina autoriparazioni')}`, el('br'),
    'SS 9 Via Emilia, 312 · 20070 Vizzolo Predabissi (MI)');
  const numero = el('span', null, { class: 'pv__num' });
  const dataEl = el('span', null, { class: 'pv__date' });
  const docBox = el('div', null, { class: 'pv__doc' });
  docBox.append(el('span', t('Preventivo'), { class: 'pv__eyebrow' }), numero, dataEl);
  const sx = el('div');
  sx.append(logo, ditta);
  const head = el('header', null, { class: 'pv__head' });
  head.append(sx, docBox);
  const corpo = el('div');
  const piede = el('p', t('Preventivo valido 30 giorni dalla data di emissione.'), { class: 'pv__foot' });
  foglio.append(head, corpo, piede);

  /** @param {boolean} anteprima i campi vuoti mostrano cosa ci andra'. */
  const aggiorna = (numeroP, s, tot_, anteprima = false) => {
    numero.textContent = t('n. {numero}', { numero: numeroP });
    dataEl.textContent = data(new Date(), { day: 'numeric', month: 'long', year: 'numeric' });
    const vuoto = (testo) => (anteprima ? el('span', testo, { class: 'pv__empty' }) : '—');

    const cli = el('section', null, { class: 'pv__client' });
    const a = el('div');
    const b = el('div');
    const nome = el('p');
    nome.append(s.cliente.trim() ? el('strong', s.cliente.trim()) : vuoto(t('Nome del cliente')));
    const contatto = el('p');
    contatto.append(s.contatto.trim() || vuoto(t('Telefono o email')));
    a.append(el('span', t('Cliente'), { class: 'pv__eyebrow' }), nome, contatto);
    const auto = el('p');
    auto.append(s.auto.trim() || vuoto(t('Modello e targa')));
    b.append(el('span', t('Veicolo'), { class: 'pv__eyebrow' }), auto);
    cli.append(a, b);

    const tr = (celle, cls) => {
      const r = el('tr', null, cls ? { class: cls } : {});
      celle.forEach(([v, n]) => {
        const td = el('td', null, n ? { class: 'n' } : {});
        td.append(v);
        r.append(td);
      });
      return r;
    };
    const tab = el('table');
    const th = el('tr');
    [['Descrizione'], ['Q.tà', 1], ['Prezzo', 1], ['Importo', 1]]
      .forEach(([v, n]) => th.append(el('th', t(v), n ? { class: 'n' } : {})));
    tab.append(th);
    const righe = s.righe.filter((r) => r.desc.trim() || Number(r.prezzo));
    righe.forEach((r) => tab.append(tr([[r.desc.trim() || '—'], [String(r.qta), 1],
      [euro(Number(r.prezzo)), 1], [euro((Number(r.qta) || 0) * (Number(r.prezzo) || 0)), 1]])));
    if (tot_.lavoro) {
      tab.append(tr([[t('Manodopera ({ore} h × {tariffa})', { ore: num(Number(s.ore) || 0), tariffa: euro(Number(s.tariffa)) })],
        ['', 1], ['', 1], [euro(tot_.lavoro), 1]]));
    }
    if (!righe.length && !tot_.lavoro && anteprima) {
      tab.append(tr([[vuoto(t('Le voci del preventivo compariranno qui'))], ['', 1], ['', 1], ['', 1]]));
    }

    const tot = el('table', null, { class: 'pv__tot' });
    if (tot_.sconto) tot.append(tr([[t('Sconto {n}%', { n: s.sconto })], [euro(-tot_.sconto), 1]]));
    tot.append(tr([[t('Imponibile')], [euro(tot_.imponibile), 1]]));
    tot.append(tr([[t('IVA {n}%', { n: IVA * 100 })], [euro(tot_.iva), 1]]));
    tot.append(tr([[t('Totale')], [euro(tot_.totale), 1]], 'g'));

    corpo.replaceChildren(cli, tab, tot);
    if (s.note.trim()) corpo.append(el('p', s.note.trim(), { class: 'pv__note' }));
  };

  return { el: foglio, logo, aggiorna };
}

/* --------------------------------------------------------------- pagine */

export class AdminPagine {
  constructor(root = document) {
    this.el = root.querySelector('[data-admp]');
    this.q = (s) => this.el.querySelector(s);
    this.pagina = null;
    this.onChiudi = () => {};
    this.catServizi = 0;
    this.filtroPren = 'Tutte';
    this.cercaPren = '';
    this.aperta = null;          // prenotazione espansa
    this.autoInModifica = null;  // id dell'auto nel modulo, null = nuova
  }

  get d() { return carica(); }

  attach() {
    if (!this.el) return;
    this.q('[data-admp-close]').addEventListener('click', () => this.chiudi());
    // Le richieste dal modulo pubblico finiscono nell'archivio, anche fuori
    // dall'area: e' li' che l'officina le trova.
    document.addEventListener('prenotazione', (e) => {
      const r = e.detail;
      if (!r) return;
      this.d.prenotazioni.push({
        id: nuovoId(), data: r.data, ora: r.ora, nome: r.nome, telefono: r.telefono, email: r.email,
        auto: r.auto, servizi: r.servizi.map((s) => s.nome), note: r.note,
        stato: 'Da confermare', notaInterna: '', creata: isoGiorno(new Date()),
      });
      salva();
      if (this.pagina === 'prenotazioni') this.disegna();
    });
  }

  apri(pagina) {
    this.pagina = pagina;
    this.el.hidden = false;
    this.el.dataset.page = pagina;
    document.documentElement.dataset.adminPage = pagina;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.pagina) this.el.dataset.open = 'true';
    }));
    this.disegna();
  }

  /** @param {boolean} subito true al logout: la lastra esce con tutto il resto. */
  chiudi(subito = false) {
    if (!this.pagina) return;
    this.pagina = null;
    delete document.documentElement.dataset.adminPage;
    this.el.dataset.open = 'false';
    const ms = subito ? 0 : (parseFloat(getComputedStyle(this.el).transitionDuration) * 1000 || 0);
    setTimeout(() => {
      if (this.pagina) return;
      this.el.hidden = true;
      this.q('[data-admp-body]').replaceChildren();
    }, ms + 40);
    this.onChiudi();
  }

  testa(titolo, sotto, strumenti = []) {
    this.q('[data-admp-eyebrow]').textContent = t('Area amministratore');
    this.q('[data-admp-title]').textContent = titolo;
    this.q('[data-admp-sub]').textContent = sotto;
    this.q('[data-admp-tools]').replaceChildren(...strumenti);
  }

  /** Salva e, se il browser rifiuta (spazio esaurito), lo dice. */
  salva(dove) {
    if (salva()) return true;
    const avviso = h('p', { class: 'admp__warn', role: 'alert' },
      t('Spazio del browser esaurito: l’ultima modifica non è stata salvata. Togli qualche foto e riprova.'));
    (dove || this.q('[data-admp-body]')).prepend(avviso);
    return false;
  }

  disegna() {
    const corpo = this.q('[data-admp-body]');
    const pagine = {
      servizi: () => this.servizi(),
      prenotazioni: () => this.prenotazioni(),
      flotta: () => this.flotta(),
      orari: () => this.orari(),
      preventivo: () => this.preventivo(),
    };
    const fn = pagine[this.pagina];
    if (!fn) return;
    // Lo scorrimento dell'elenco non deve saltare in cima a ogni modifica.
    const scorrevoli = [...corpo.querySelectorAll('[data-scroll]')].map((s) => s.scrollTop);
    const contenuto = fn();
    contenuto.classList.add('admp__view');
    if (corpo.firstChild && corpo.dataset.page === this.pagina) contenuto.classList.add('admp__view--same');
    corpo.dataset.page = this.pagina;
    corpo.replaceChildren(contenuto);
    corpo.querySelectorAll('[data-scroll]').forEach((s, i) => { if (scorrevoli[i]) s.scrollTop = scorrevoli[i]; });
  }

  /** Numeri per la card di benvenuto dopo l'accesso. */
  riepilogo() {
    const d = this.d;
    const oggi = isoGiorno(new Date());
    const tutti = d.catalogo.flatMap((c) => c.servizi);
    return [
      [t('Da confermare'), d.prenotazioni.filter((p) => p.stato === 'Da confermare').length, t('prenotazioni')],
      [t('Oggi'), d.prenotazioni.filter((p) => p.data === oggi && p.stato !== 'Annullata').length, t('appuntamenti')],
      [t('Auto a noleggio'), d.flotta.filter((a) => a.stato === 'Disponibile').length, t('disponibili su {n}', { n: d.flotta.length })],
      [t('Servizi'), tutti.filter((s) => s.attivo).length, t('prenotabili su {n}', { n: tutti.length })],
    ];
  }

  /* ------------------------------------------------------------- Servizi */

  servizi() {
    const cat = this.d.catalogo;
    if (this.catServizi >= cat.length) this.catServizi = Math.max(0, cat.length - 1);
    const tutti = cat.flatMap((c) => c.servizi);
    this.testa(t('Servizi'),
      t('{attivi} prenotabili su {tutti}, in {categorie} categorie. Le modifiche si salvano da sole e si vedono subito nel sito.',
        { attivi: tutti.filter((s) => s.attivo).length, tutti: tutti.length, categorie: cat.length }));

    // Colonna delle categorie, con l'aggiunta di una nuova in fondo.
    let nuovaCat = '';
    const schede = h('div', { class: 'admp__cats' },
      h('div', { class: 'svc__tabs', role: 'tablist', 'aria-orientation': 'vertical', 'data-scroll': '' },
        cat.map((c, i) => h('button', {
          type: 'button', class: 'svc__tab', role: 'tab', 'aria-selected': String(i === this.catServizi),
          onclick: () => { this.catServizi = i; this.disegna(); },
        }, h('span', {}, t(c.titolo)), h('span', { class: 'svc__tab-count' }, String(c.servizi.length))))),
      h('form', {
        class: 'admp__inline', novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          const t = nuovaCat.trim();
          if (!t) return;
          cat.push({ id: nuovoId(), titolo: t, servizi: [] });
          this.catServizi = cat.length - 1;
          this.salva();
          this.disegna();
        },
      },
      h('input', { class: 'fld__input', placeholder: t('Nuova categoria'), 'aria-label': t('Nome della nuova categoria'), oninput: (e) => { nuovaCat = e.target.value; } }),
      h('button', { type: 'submit', class: 'admp__btn', 'aria-label': t('Aggiungi la categoria') }, '+')));

    const c = cat[this.catServizi];
    if (!c) return h('div', { class: 'admp__split' }, schede, h('p', { class: 'admp__empty' }, t('Nessuna categoria: aggiungine una.')));

    const righe = c.servizi.map((s, k) => {
      const modifica = s.id === this.servizioInModifica;
      return h('li', { class: 'admp__row admp__row--svc', dataset: { off: String(!s.attivo) } },
        h('span', { class: 'svc__num' }, String(k + 1).padStart(2, '0')),
        modifica
          ? h('span', { class: 'admp__edit' },
            h('input', { class: 'fld__input', value: s.nome, 'aria-label': t('Nome del servizio'), oninput: (e) => { s.nome = e.target.value; } }),
            h('input', { class: 'fld__input', value: s.dettaglio || '', placeholder: t('Dettaglio (facoltativo)'), 'aria-label': t('Dettaglio del servizio'), oninput: (e) => { s.dettaglio = e.target.value; } }))
          : h('span', { class: 'admp__name' }, t(s.nome), s.dettaglio ? h('small', {}, t(s.dettaglio)) : null),
        h('label', { class: 'admp__mini' }, h('span', {}, t('Da')),
          h('input', {
            class: 'fld__input admp__num', type: 'number', min: '0', step: '1', inputmode: 'decimal',
            value: s.prezzo ?? '', placeholder: '—', 'aria-label': t('Prezzo di {nome}', { nome: t(s.nome) }),
            onchange: (e) => { s.prezzo = numero(e.target.value); this.salva(); },
          }), h('span', {}, '€')),
        h('select', {
          class: 'fld__input admp__sel', 'aria-label': t('Durata di {nome}', { nome: t(s.nome) }),
          onchange: (e) => { s.durata = Number(e.target.value); this.salva(); },
        }, DURATE.map((m) => h('option', { value: String(m), selected: m === s.durata }, durata(m)))),
        h('button', {
          type: 'button', class: 'admp__switch', role: 'switch', 'aria-checked': String(s.attivo),
          'aria-label': t('{nome}: prenotabile dal sito', { nome: t(s.nome) }), title: t(s.attivo ? 'Prenotabile' : 'Non prenotabile'),
          onclick: () => { s.attivo = !s.attivo; this.salva(); this.disegna(); },
        }, h('span')),
        h('span', { class: 'admp__acts' },
          modifica
            ? h('button', {
              type: 'button', class: 'admp__btn admp__btn--on',
              onclick: () => {
                s.nome = s.nome.trim() || t('Servizio senza nome');
                s.dettaglio = (s.dettaglio || '').trim();
                this.servizioInModifica = null; this.salva(); this.disegna();
              },
            }, t('Salva'))
            : h('button', { type: 'button', class: 'admp__btn', onclick: () => { this.servizioInModifica = s.id; this.disegna(); } }, t('Modifica')),
          conConferma(t('Elimina'), () => {
            c.servizi = c.servizi.filter((x) => x !== s);
            this.salva(); this.disegna();
          }, { 'aria-label': t('Elimina {nome}', { nome: t(s.nome) }) })));
    });

    // Aggiunta di un servizio alla categoria aperta.
    const nuovo = { nome: '', dettaglio: '', prezzo: '', durata: 60 };
    const errore = h('span', { class: 'fld__err' });
    const aggiungi = h('form', {
      class: 'admp__addsvc', novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        if (!nuovo.nome.trim()) { errore.textContent = t('Serve almeno il nome del servizio.'); return; }
        c.servizi.push({
          id: nuovoId(), nome: nuovo.nome.trim(), dettaglio: nuovo.dettaglio.trim(),
          attivo: true, prezzo: numero(nuovo.prezzo), durata: Number(nuovo.durata),
        });
        this.salva();
        this.disegna();
      },
    },
    h('p', { class: 'admp__add-title' }, t('Aggiungi un servizio a «{categoria}»', { categoria: t(c.titolo) })),
    h('div', { class: 'admp__addsvc-row' },
      h('input', { class: 'fld__input', placeholder: t('Nome del servizio'), 'aria-label': t('Nome del nuovo servizio'), oninput: (e) => { nuovo.nome = e.target.value; errore.textContent = ''; } }),
      h('input', { class: 'fld__input', placeholder: t('Dettaglio (facoltativo)'), 'aria-label': t('Dettaglio del nuovo servizio'), oninput: (e) => { nuovo.dettaglio = e.target.value; } }),
      h('input', { class: 'fld__input admp__num', type: 'number', min: '0', placeholder: '€', 'aria-label': t('Prezzo del nuovo servizio'), oninput: (e) => { nuovo.prezzo = e.target.value; } }),
      h('select', { class: 'fld__input admp__sel', 'aria-label': t('Durata del nuovo servizio'), onchange: (e) => { nuovo.durata = e.target.value; } },
        DURATE.map((m) => h('option', { value: String(m), selected: m === 60 }, durata(m)))),
      h('button', { type: 'submit', class: 'bk__primary' }, t('Aggiungi'))),
    errore);

    const eliminaCat = c.servizi.length === 0
      ? conConferma(t('Elimina categoria'), () => { cat.splice(this.catServizi, 1); this.catServizi = 0; this.salva(); this.disegna(); })
      : null;

    return h('div', { class: 'admp__split' }, schede,
      h('div', { class: 'admp__col' },
        h('ul', { class: 'admp__list', 'data-scroll': '' },
          righe.length ? righe : h('li', { class: 'admp__empty' }, t('Nessun servizio in questa categoria.'), eliminaCat)),
        aggiungi));
  }

  /* --------------------------------------------------------- Prenotazioni */

  prenotazioni() {
    const d = this.d;
    if (pulisciPrenotazioni(d)) this.salva();
    const tutte = [...d.prenotazioni].sort((a, b) => (a.data + a.ora).localeCompare(b.data + b.ora));
    const conta = (st) => tutte.filter((p) => p.stato === st).length;
    const cerca = h('input', {
      class: 'fld__input admp__search', type: 'search', placeholder: t('Cerca cliente, targa, telefono…'),
      value: this.cercaPren, 'aria-label': t('Cerca nelle prenotazioni'),
      oninput: (e) => {
        this.cercaPren = e.target.value;
        this.disegna();
        // La barra si ridisegna: il fuoco e il cursore tornano dove erano.
        const s = this.q('.admp__search');
        if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
      },
    });
    const esporta = h('button', {
      type: 'button', class: 'admp__btn', disabled: tutte.length === 0,
      title: t('Scarica tutte le prenotazioni, senza filtri, in un file CSV'),
      onclick: () => scarica(`prenotazioni-${isoGiorno(new Date())}.csv`, csvPrenotazioni(tutte), 'text/csv;charset=utf-8'),
    }, t('Esporta CSV'));
    this.testa(t('Prenotazioni'), t('{daConfermare} da confermare · {confermate} confermate · {tutte} in tutto · eliminate in automatico {giorni} giorni dopo l’appuntamento',
      { daConfermare: conta('Da confermare'), confermate: conta('Confermata'), tutte: tutte.length, giorni: GIORNI_CONSERVAZIONE }),
      [cerca, esporta, ...['Tutte', ...STATI_PREN].map((f) => h('button', {
        type: 'button', class: 'admp__chip', 'aria-pressed': String(this.filtroPren === f),
        onclick: () => { this.filtroPren = f; this.disegna(); },
      }, t(f), h('small', {}, ` ${f === 'Tutte' ? tutte.length : conta(f)}`)))]);

    const testo = this.cercaPren.trim().toLowerCase();
    const lista = tutte
      .filter((p) => this.filtroPren === 'Tutte' || p.stato === this.filtroPren)
      .filter((p) => !testo || [p.nome, p.telefono, p.email, p.auto, ...p.servizi, ...p.servizi.map((s) => t(s))]
        .join(' ').toLowerCase().includes(testo));
    const cambia = (p, stato) => { p.stato = stato; this.salva(); this.disegna(); };

    const righe = lista.map((p) => {
      const aperta = this.aperta === p.id;
      const riga = h('li', { class: 'admp__row admp__row--pren', dataset: { stato: p.stato, open: String(aperta) } },
        h('button', {
          type: 'button', class: 'admp__expand', 'aria-expanded': String(aperta), 'aria-label': t('Dettagli di {nome}', { nome: p.nome }),
          onclick: () => { this.aperta = aperta ? null : p.id; this.disegna(); },
        }, '›'),
        h('span', { class: 'admp__when' }, h('b', {}, dataBreve(p.data)), p.ora),
        h('span', { class: 'admp__name' }, p.nome, h('small', {}, p.telefono)),
        h('span', { class: 'admp__name' }, p.auto, p.note ? h('small', {}, p.note) : null),
        h('span', { class: 'admp__tags' }, p.servizi.map((s) => h('span', { class: 'admp__tag', title: t(s) }, t(s)))),
        h('span', { class: 'admp__badge' }, t(p.stato)),
        h('span', { class: 'admp__acts' },
          p.stato === 'Da confermare' ? h('button', { type: 'button', class: 'admp__btn admp__btn--on', onclick: () => cambia(p, 'Confermata') }, t('Conferma')) : null,
          p.stato === 'Confermata' ? h('button', { type: 'button', class: 'admp__btn admp__btn--on', onclick: () => cambia(p, 'Completata') }, t('Completata')) : null,
          p.stato === 'Da confermare' || p.stato === 'Confermata'
            ? h('button', { type: 'button', class: 'admp__btn', onclick: () => cambia(p, 'Annullata') }, t('Annulla')) : null));
      if (!aperta) return riga;

      // Dettaglio: tutti i dati, i contatti diretti, una nota interna e i comandi.
      const tel = (p.telefono || '').replace(/[^\d+]/g, '');
      const dettaglio = h('li', { class: 'admp__detail' },
        h('dl', { class: 'admp__dl' },
          h('dt', {}, t('Appuntamento')), h('dd', {}, t('{data}, ore {ora}', { data: dataLunga(p.data), ora: p.ora })),
          h('dt', {}, t('Cliente')), h('dd', {}, p.nome),
          h('dt', {}, t('Contatti')), h('dd', {},
            tel ? h('a', { href: `tel:${tel}` }, p.telefono) : '—',
            p.email ? [' · ', h('a', { href: `mailto:${p.email}` }, p.email)] : null),
          h('dt', {}, t('Auto')), h('dd', {}, p.auto),
          h('dt', {}, t('Servizi')), h('dd', {}, p.servizi.map((s) => t(s)).join(', ')),
          h('dt', {}, t('Note del cliente')), h('dd', {}, p.note || '—'),
          h('dt', {}, t('Ricevuta il')), h('dd', {}, p.creata ? dataLunga(p.creata) : '—')),
        h('div', { class: 'admp__detail-side' },
          h('label', { class: 'fld' }, h('span', { class: 'fld__label' }, t('Nota interna (non la vede il cliente)')),
            h('textarea', {
              class: 'fld__input admp__area', rows: 3, value: p.notaInterna || '',
              onchange: (e) => { p.notaInterna = e.target.value; this.salva(); },
            })),
          h('label', { class: 'fld' }, h('span', { class: 'fld__label' }, t('Stato')),
            h('select', { class: 'fld__input', onchange: (e) => cambia(p, e.target.value) },
              STATI_PREN.map((st) => h('option', { value: st, selected: st === p.stato }, t(st))))),
          h('div', { class: 'admp__acts' },
            conConferma(t('Elimina prenotazione'), () => {
              d.prenotazioni = d.prenotazioni.filter((x) => x !== p);
              this.aperta = null; this.salva(); this.disegna();
            }))));
      return [riga, dettaglio];
    });

    return h('ul', { class: 'admp__list admp__list--full', 'data-scroll': '' },
      righe.length ? righe.flat() : h('li', { class: 'admp__empty' },
        t(testo ? 'Nessuna prenotazione corrisponde alla ricerca.' : 'Nessuna prenotazione in questo stato.')));
  }

  /* ----------------------------------------------------- Parco auto-noleggio */

  flotta() {
    const d = this.d;
    const auto = d.flotta;
    const conta = (st) => auto.filter((a) => a.stato === st).length;
    this.testa(t('Parco auto-noleggio'),
      t('{auto} auto · {disponibili} disponibili · {noleggiate} noleggiate · {manutenzione} in manutenzione',
        { auto: auto.length, disponibili: conta('Disponibile'), noleggiate: conta('Noleggiata'), manutenzione: conta('In manutenzione') }),
      [h('button', {
        type: 'button', class: 'admp__chip', 'aria-pressed': String(this.autoInModifica === null),
        onclick: () => { this.autoInModifica = null; this.disegna(); },
      }, t('+ Nuova auto'))]);

    const schede = auto.map((a) => h('li', {
      class: 'admp__car', dataset: { stato: a.stato, sel: String(a.id === this.autoInModifica) },
    },
    h('button', {
      type: 'button', class: 'admp__car-open', 'aria-label': t('Modifica {nome}', { nome: `${a.modello} ${a.targa}` }),
      onclick: () => { this.autoInModifica = a.id; this.disegna(); },
    },
    a.foto
      ? h('img', { class: 'admp__car-img', src: a.foto, alt: t('{modello}, targa {targa}', { modello: a.modello, targa: a.targa }) })
      : h('span', { class: 'admp__car-img admp__car-img--none', 'aria-hidden': 'true' }, t('Nessuna foto')),
    h('span', { class: 'admp__car-body' },
      h('span', { class: 'admp__car-top' },
        h('span', { class: 'admp__plate' }, a.targa),
        h('span', { class: 'admp__dot' }, t(a.stato))),
      h('span', { class: 'admp__car-name' }, a.modello),
      h('span', { class: 'admp__car-meta' },
        [t(a.categoria), a.anno, t(a.alimentazione), t(a.cambio), a.posti ? tn(Number(a.posti), '{n} posto', '{n} posti') : null,
          `${num(Number(a.km || 0))} km`].filter(Boolean).join(' · ')),
      h('span', { class: 'admp__car-price' }, euro(Number(a.prezzo)), h('small', {}, ` / ${t('giorno')}`))))));

    return h('div', { class: 'admp__split admp__split--fleet' },
      h('ul', { class: 'admp__cars', 'data-scroll': '' },
        schede.length ? schede : h('li', { class: 'admp__empty' }, t('Nessuna auto nel parco: aggiungine una.'))),
      this.moduloAuto());
  }

  /** Modulo a destra: nuova auto, o modifica di quella scelta. */
  moduloAuto() {
    const d = this.d;
    const esistente = d.flotta.find((a) => a.id === this.autoInModifica) || null;
    if (!esistente) this.autoInModifica = null;
    const a = esistente
      ? { ...esistente }
      : { modello: '', targa: '', categoria: 'Compatta', anno: new Date().getFullYear(), alimentazione: 'Benzina', cambio: 'Manuale', posti: 5, prezzo: '', cauzione: '', km: '', stato: 'Disponibile', foto: null, note: '' };

    const errore = h('p', { class: 'fld__err', role: 'alert' });
    const anteprima = h('div', { class: 'admp__photo', dataset: { vuota: String(!a.foto) } });
    const disegnaFoto = () => {
      anteprima.dataset.vuota = String(!a.foto);
      anteprima.replaceChildren(a.foto
        ? h('img', { src: a.foto, alt: t('Anteprima della foto') })
        : h('span', {}, t('Nessuna foto')));
    };
    disegnaFoto();

    const file = h('input', {
      type: 'file', accept: 'image/*', class: 'admp__file', 'aria-label': t('Carica una foto dell’auto'),
      onchange: async (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        errore.textContent = '';
        anteprima.dataset.carica = 'true';
        try { a.foto = await preparaFoto(f); disegnaFoto(); } catch (err) { errore.textContent = err.message || t('Foto non leggibile.'); }
        anteprima.dataset.carica = 'false';
        e.target.value = '';
      },
    });

    const campo = (etichetta, chiave, attr = {}) => h('label', { class: 'fld' },
      h('span', { class: 'fld__label' }, t(etichetta)),
      h('input', { class: 'fld__input', value: a[chiave] ?? '', ...attr, oninput: (e) => { a[chiave] = e.target.value; errore.textContent = ''; } }));
    const scelta = (etichetta, chiave, valori) => h('label', { class: 'fld' },
      h('span', { class: 'fld__label' }, t(etichetta)),
      h('select', { class: 'fld__input', onchange: (e) => { a[chiave] = e.target.value; } },
        valori.map((v) => h('option', { value: v, selected: String(v) === String(a[chiave]) }, t(v)))));

    return h('form', {
      class: 'admp__add', novalidate: true, 'data-scroll': '',
      onsubmit: (e) => {
        e.preventDefault();
        const targa = String(a.targa || '').replace(/\s+/g, '').toUpperCase();
        if (!String(a.modello).trim() || !targa) { errore.textContent = t('Servono almeno modello e targa.'); return; }
        if (!(numero(a.prezzo) > 0)) { errore.textContent = t('Indica il prezzo al giorno.'); return; }
        if (d.flotta.some((x) => x.targa === targa && x.id !== a.id)) { errore.textContent = t('C’è già un’auto con targa {targa}.', { targa }); return; }
        const pulita = {
          ...a, targa, modello: String(a.modello).trim(), anno: numero(a.anno), posti: numero(a.posti),
          prezzo: numero(a.prezzo), cauzione: numero(a.cauzione), km: numero(a.km) || 0, note: String(a.note || '').trim(),
        };
        if (esistente) Object.assign(esistente, pulita);
        else { pulita.id = nuovoId(); d.flotta.push(pulita); this.autoInModifica = pulita.id; }
        if (this.salva()) this.disegna();
      },
    },
    h('p', { class: 'admp__add-title' }, esistente ? t('Modifica {nome}', { nome: esistente.modello }) : t('Aggiungi un’auto')),
    anteprima,
    h('div', { class: 'admp__photo-acts' },
      h('label', { class: 'admp__btn admp__upload' }, t(a.foto ? 'Cambia foto' : 'Carica foto'), file),
      a.foto ? h('button', { type: 'button', class: 'admp__btn', onclick: () => { a.foto = null; disegnaFoto(); } }, t('Togli foto')) : null),
    campo('Modello', 'modello', { placeholder: t('Es. Peugeot 208') }),
    h('div', { class: 'fld__row' },
      campo('Targa', 'targa', { placeholder: 'AB123CD', autocapitalize: 'characters' }),
      scelta('Categoria', 'categoria', CATEGORIE_AUTO)),
    h('div', { class: 'fld__row' },
      campo('Anno', 'anno', { type: 'number', min: '1990', max: '2100' }),
      scelta('Alimentazione', 'alimentazione', ALIMENTAZIONI)),
    h('div', { class: 'fld__row' },
      scelta('Cambio', 'cambio', ['Manuale', 'Automatico']),
      campo('Posti', 'posti', { type: 'number', min: '1', max: '9' })),
    h('div', { class: 'fld__row' },
      campo('€ / giorno', 'prezzo', { type: 'number', min: '1', inputmode: 'decimal' }),
      campo('Cauzione €', 'cauzione', { type: 'number', min: '0', inputmode: 'decimal' })),
    h('div', { class: 'fld__row' },
      campo('Km', 'km', { type: 'number', min: '0', inputmode: 'numeric' }),
      scelta('Stato', 'stato', STATI_AUTO)),
    campo('Note', 'note', { placeholder: t('Es. seggiolino disponibile') }),
    errore,
    h('div', { class: 'bk__actions' },
      esistente ? conConferma(t('Elimina'), () => {
        d.flotta = d.flotta.filter((x) => x.id !== esistente.id);
        this.autoInModifica = null; this.salva(); this.disegna();
      }) : null,
      h('button', { type: 'submit', class: 'bk__primary' }, t(esistente ? 'Salva modifiche' : 'Aggiungi'))));
  }

  /* ---------------------------------------------------- Orari di apertura */

  orari() {
    const o = this.d.orari;
    const settimana = o.settimana;
    const aperti = ORDINE_GIORNI.filter((g) => settimana[g].aperto).length;
    this.testa(t('Orari di apertura'),
      t('Aperto {giorni} giorni su 7 · appuntamenti ogni {passo} minuti. Il calendario delle prenotazioni sul sito segue questi orari.',
        { giorni: aperti, passo: o.passo }));

    const salvaOrari = () => { this.salva(); this.disegna(); };
    const ora = (valore, etichetta, onchange) => h('input', {
      class: 'fld__input admp__time', type: 'time', step: '900', value: valore || '', 'aria-label': etichetta, onchange,
    });

    const giorni = ORDINE_GIORNI.map((g) => {
      const s = settimana[g];
      const [m, p] = [s.fasce[0] || null, s.fasce[1] || null];
      const continuato = s.fasce.length === 1;
      return h('li', { class: 'admp__row admp__row--day', dataset: { off: String(!s.aperto) } },
        h('span', { class: 'admp__day' }, nomeGiorno(g)),
        h('button', {
          type: 'button', class: 'admp__switch', role: 'switch', 'aria-checked': String(s.aperto), 'aria-label': t('{giorno} aperto', { giorno: nomeGiorno(g) }),
          onclick: () => {
            s.aperto = !s.aperto;
            if (s.aperto && !s.fasce.length) s.fasce = [{ da: '08:30', a: '12:30' }, { da: '14:30', a: '18:30' }];
            salvaOrari();
          },
        }, h('span')),
        s.aperto
          ? h('span', { class: 'admp__ranges' },
            h('span', { class: 'admp__range' }, h('small', {}, t(continuato ? 'Orario' : 'Mattina')),
              ora(m && m.da, t('{giorno}, apertura', { giorno: nomeGiorno(g) }), (e) => { s.fasce[0].da = e.target.value; salvaOrari(); }),
              '–',
              ora(m && m.a, t('{giorno}, chiusura mattina', { giorno: nomeGiorno(g) }), (e) => { s.fasce[0].a = e.target.value; salvaOrari(); })),
            continuato ? null : h('span', { class: 'admp__range' }, h('small', {}, t('Pomeriggio')),
              ora(p && p.da, t('{giorno}, riapertura', { giorno: nomeGiorno(g) }), (e) => { s.fasce[1].da = e.target.value; salvaOrari(); }),
              '–',
              ora(p && p.a, t('{giorno}, chiusura', { giorno: nomeGiorno(g) }), (e) => { s.fasce[1].a = e.target.value; salvaOrari(); })),
            h('button', {
              type: 'button', class: 'admp__btn',
              onclick: () => {
                s.fasce = continuato ? [s.fasce[0], { da: '14:30', a: '18:30' }] : [{ da: s.fasce[0].da, a: (s.fasce[1] || s.fasce[0]).a }];
                salvaOrari();
              },
            }, t(continuato ? '+ Pausa' : 'Continuato')))
          : h('span', { class: 'admp__closed' }, t('Chiuso')));
    });

    // Chiusure straordinarie: ferie, ponti, festivita'.
    const nuova = { da: '', a: '', motivo: '' };
    const errore = h('span', { class: 'fld__err' });
    const chiusure = h('div', { class: 'admp__closures' },
      h('p', { class: 'admp__add-title' }, t('Chiusure straordinarie')),
      h('ul', { class: 'admp__list' },
        o.chiusure.length
          ? o.chiusure.map((c) => h('li', { class: 'admp__row admp__row--closure' },
            h('span', { class: 'admp__name' },
              c.da === c.a ? dataLunga(c.da) : t('Dal {da} al {a}', { da: dataBreve(c.da), a: dataBreve(c.a) }),
              c.motivo ? h('small', {}, c.motivo) : null),
            conConferma(t('Togli'), () => { o.chiusure = o.chiusure.filter((x) => x !== c); salvaOrari(); })))
          : h('li', { class: 'admp__empty admp__empty--small' }, t('Nessuna chiusura in programma.'))),
      h('form', {
        class: 'admp__closure-add', novalidate: true,
        onsubmit: (e) => {
          e.preventDefault();
          if (!nuova.da) { errore.textContent = t('Indica almeno il primo giorno.'); return; }
          const a = nuova.a && nuova.a >= nuova.da ? nuova.a : nuova.da;
          o.chiusure.push({ id: nuovoId(), da: nuova.da, a, motivo: nuova.motivo.trim() });
          o.chiusure.sort((x, y) => x.da.localeCompare(y.da));
          salvaOrari();
        },
      },
      h('label', { class: 'fld' }, h('span', { class: 'fld__label' }, t('Dal')), h('input', { class: 'fld__input', type: 'date', onchange: (e) => { nuova.da = e.target.value; errore.textContent = ''; } })),
      h('label', { class: 'fld' }, h('span', { class: 'fld__label' }, t('Al')), h('input', { class: 'fld__input', type: 'date', onchange: (e) => { nuova.a = e.target.value; } })),
      h('label', { class: 'fld' }, h('span', { class: 'fld__label' }, t('Motivo')), h('input', { class: 'fld__input', placeholder: t('Es. Ferie estive'), oninput: (e) => { nuova.motivo = e.target.value; } })),
      h('button', { type: 'submit', class: 'bk__primary' }, t('Aggiungi'))),
      errore);

    // Anteprima: i prossimi sette giorni come li vede il cliente.
    const prossimi = [];
    for (let i = 1; i <= 7; i++) {
      const g = new Date(); g.setHours(0, 0, 0, 0); g.setDate(g.getDate() + i);
      const slot = slotDi(g);
      prossimi.push(h('li', { class: 'admp__preview-day', dataset: { off: String(!slot.length) } },
        h('b', {}, data(g, { weekday: 'short', day: 'numeric' })),
        slot.length ? slot.join('  ') : t('Chiuso')));
    }

    return h('div', { class: 'admp__split admp__split--hours' },
      h('div', { class: 'admp__col', 'data-scroll': '' },
        h('div', { class: 'admp__step' },
          h('span', { class: 'fld__label' }, t('Un appuntamento ogni')),
          h('select', {
            class: 'fld__input admp__sel', 'aria-label': t('Intervallo fra gli appuntamenti'),
            onchange: (e) => { o.passo = Number(e.target.value); salvaOrari(); },
          }, PASSI.map((m) => h('option', { value: String(m), selected: m === Number(o.passo) }, t('{n} minuti', { n: m }))))),
        h('ul', { class: 'admp__list' }, giorni),
        chiusure),
      h('div', { class: 'admp__summary' },
        h('p', { class: 'svc__eyebrow' }, t('Come lo vede il cliente')),
        h('p', { class: 'admp__preview-sub' }, t('Orari prenotabili nei prossimi 7 giorni')),
        h('ul', { class: 'admp__preview', 'data-scroll': '', tabindex: '0', 'aria-label': t('Orari prenotabili nei prossimi 7 giorni') }, prossimi)));
  }

  /* ------------------------------------------------------ Genera preventivo */

  preventivo() {
    const listino = this.d.catalogo.flatMap((c) => c.servizi.map((s) => ({ nome: t(s.nome), prezzo: s.prezzo })));
    const numeroP = `${new Date().getFullYear()}-${String(this.d.preventivi + 1).padStart(3, '0')}`;
    this.testa(t('Genera preventivo'), t('Preventivo n. {numero} · i prezzi dei servizi arrivano dalla pagina Servizi', { numero: numeroP }));

    const stato = { cliente: '', contatto: '', auto: '', righe: [{ desc: '', qta: 1, prezzo: '' }], ore: 0, tariffa: 45, sconto: 0, note: '' };
    const righeBox = h('div', { class: 'admp__lines' });

    const calcola = () => {
      const ricambi = stato.righe.reduce((n, r) => n + (Number(r.qta) || 0) * (Number(r.prezzo) || 0), 0);
      const lavoro = (Number(stato.ore) || 0) * (Number(stato.tariffa) || 0);
      const lordo = ricambi + lavoro;
      const sconto = lordo * (Math.min(100, Math.max(0, Number(stato.sconto) || 0)) / 100);
      const imponibile = lordo - sconto;
      const iva = imponibile * IVA;
      return { ricambi, lavoro, sconto, imponibile, iva, totale: imponibile + iva };
    };

    // Anteprima: il foglio vero, a grandezza A4, rimpicciolito a misura della
    // colonna. Si aggiorna a ogni tasto.
    const foglio = foglioPreventivo(document);
    const totale = h('b', { class: 'admp__pv-total' });
    const aggiornaTotali = () => {
      const totali = calcola();
      foglio.aggiorna(numeroP, stato, totali, true);
      totale.textContent = euro(totali.totale);
    };
    const adatta = h('div', { class: 'admp__paper-fit' }, foglio.el);
    const carta = h('div', { class: 'admp__paper', 'data-scroll': '', tabindex: '0', 'aria-label': t('Anteprima del preventivo') }, adatta);
    // Nel fotogramma dopo, e solo se la misura cambia: dentro la notifica,
    // cambiare l'altezza puo' far comparire la barra di scorrimento, che
    // cambia la larghezza e rinotifica nello stesso fotogramma (Chrome lo
    // segnala come errore "ResizeObserver loop").
    let attesa = 0;
    const scala = () => {
      if (attesa) return;
      attesa = requestAnimationFrame(() => {
        attesa = 0;
        const k = carta.clientWidth / FOGLIO_W;
        if (!k) return;
        const t = `scale(${k})`;
        const alto = `${Math.ceil(foglio.el.offsetHeight * k)}px`;
        if (foglio.el.style.transform !== t) foglio.el.style.transform = t;
        if (adatta.style.height !== alto) adatta.style.height = alto;
      });
    };
    const misura = new ResizeObserver(scala);
    misura.observe(carta);
    misura.observe(foglio.el);

    const disegnaRighe = () => {
      righeBox.replaceChildren(...stato.righe.map((r, i) => {
        const prezzo = h('input', {
          class: 'fld__input admp__num', type: 'number', min: '0', step: '0.01', value: r.prezzo, placeholder: '€',
          'aria-label': t('Prezzo unitario riga {n}', { n: i + 1 }), oninput: (e) => { r.prezzo = e.target.value; aggiornaTotali(); },
        });
        return h('div', { class: 'admp__line' },
          h('input', {
            class: 'fld__input', list: 'admp-listino', value: r.desc, placeholder: t('Servizio o ricambio'),
            'aria-label': t('Descrizione riga {n}', { n: i + 1 }),
            oninput: (e) => {
              r.desc = e.target.value;
              const hit = listino.find((x) => x.nome === r.desc);
              if (hit && hit.prezzo != null && !Number(r.prezzo)) { r.prezzo = hit.prezzo; prezzo.value = String(hit.prezzo); }
              aggiornaTotali();
            },
          }),
          h('input', {
            class: 'fld__input admp__num', type: 'number', min: '0', step: '1', value: r.qta, 'aria-label': t('Quantità riga {n}', { n: i + 1 }),
            oninput: (e) => { r.qta = e.target.value; aggiornaTotali(); },
          }),
          prezzo,
          h('button', {
            type: 'button', class: 'admp__x', 'aria-label': t('Togli la riga {n}', { n: i + 1 }), disabled: stato.righe.length === 1,
            onclick: () => { stato.righe.splice(i, 1); disegnaRighe(); aggiornaTotali(); },
          }, '×'));
      }));
    };

    const campo = (etichetta, chiave, attr = {}) => h('label', { class: 'fld' },
      h('span', { class: 'fld__label' }, t(etichetta)),
      h('input', { class: 'fld__input', value: stato[chiave], ...attr, oninput: (e) => { stato[chiave] = e.target.value; aggiornaTotali(); } }));

    disegnaRighe();
    aggiornaTotali();
    const errore = h('p', { class: 'fld__err', role: 'alert' });

    const stampa = () => {
      const totali = calcola();
      if (!stato.righe.some((r) => r.desc.trim() && Number(r.prezzo) > 0) && !totali.lavoro) {
        errore.textContent = t('Aggiungi almeno una riga con prezzo, o la manodopera.');
        return;
      }
      if (!this.stampa(numeroP, stato, totali)) {
        errore.textContent = t('Il browser ha bloccato la finestra del preventivo: consenti i popup per questo sito.');
        return;
      }
      this.d.preventivi += 1;
      this.salva();
      this.disegna();
    };

    return h('div', { class: 'admp__split admp__split--quote' },
      h('div', { class: 'admp__quote', 'data-scroll': '' },
        h('div', { class: 'fld__row fld__row--3' },
          campo('Cliente', 'cliente', { placeholder: t('Nome e cognome') }),
          campo('Telefono o email', 'contatto'),
          campo('Auto e targa', 'auto', { placeholder: t('Es. Audi A4 · AB123CD') })),
        h('p', { class: 'admp__add-title' }, t('Servizi e ricambi')),
        h('div', { class: 'admp__line admp__line--head', 'aria-hidden': 'true' },
          h('span', {}, t('Descrizione')), h('span', {}, t('Q.tà')), h('span', {}, t('Prezzo')), h('span')),
        righeBox,
        h('datalist', { id: 'admp-listino' }, listino.map((x) => h('option', { value: x.nome }))),
        h('button', {
          type: 'button', class: 'bk__link admp__addline',
          onclick: () => { stato.righe.push({ desc: '', qta: 1, prezzo: '' }); disegnaRighe(); righeBox.lastChild.querySelector('input').focus(); },
        }, t('+ Aggiungi riga')),
        h('div', { class: 'fld__row fld__row--3' },
          campo('Ore di manodopera', 'ore', { type: 'number', min: '0', step: '0.5' }),
          campo('Tariffa oraria (€)', 'tariffa', { type: 'number', min: '0', step: '1' }),
          campo('Sconto (%)', 'sconto', { type: 'number', min: '0', max: '100', step: '1' })),
        campo('Note per il cliente', 'note', { placeholder: t('Es. tempi di consegna, ricambi da ordinare') })),
      h('div', { class: 'admp__summary admp__summary--pv' },
        h('div', { class: 'admp__pv-head' },
          h('p', { class: 'svc__eyebrow' }, t('Anteprima PDF')),
          h('span', { class: 'admp__pv-sum' }, `${t('Totale')} `, totale)),
        carta,
        errore,
        h('div', { class: 'bk__actions' },
          h('button', { type: 'button', class: 'bk__ghost', onclick: () => this.disegna() }, t('Svuota')),
          h('button', { type: 'button', class: 'bk__primary', onclick: stampa }, t('Stampa / PDF')))));
  }

  /** Apre il preventivo in una finestra pulita, pronto per stampa o PDF.
   *  @returns {boolean} false se il browser ha bloccato la finestra. */
  stampa(numeroP, s, totali) {
    const w = window.open('', '_blank', 'width=880,height=1000');
    if (!w) return false;
    const d = w.document;
    d.title = t('Preventivo {numero} — Top One Cars', { numero: numeroP });
    d.documentElement.lang = document.documentElement.lang;
    // Il foglio di stile e' un file del sito: la Content-Security-Policy non
    // ammette <style> scritti dallo script. Si stampa quando foglio di stile,
    // logo e carattere sono pronti, altrimenti il PDF uscirebbe senza.
    const caricato = (x) => new Promise((ok) => { x.onload = ok; x.onerror = ok; });
    const css = d.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('assets/css/stampa-preventivo.css', location.href).href;
    const cssPronto = caricato(css);
    d.head.appendChild(css);
    const foglio = foglioPreventivo(d);
    foglio.aggiorna(numeroP, s, totali);
    const logoPronto = foglio.logo.complete ? null : caricato(foglio.logo);
    d.body.className = 'pv-win';
    d.body.append(foglio.el);
    const pronto = Promise.all([cssPronto, logoPronto]).then(() => d.fonts.ready);
    const scadenza = new Promise((ok) => { setTimeout(ok, 2500); });
    Promise.race([pronto, scadenza]).then(() => { w.focus(); w.print(); });
    return true;
  }
}
