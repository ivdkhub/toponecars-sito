/**
 * Pagina "Recensioni" (blocco 4, scena 5: l'auto vista dall'alto).
 *
 * Costruisce le card una volta sola all'avvio, dentro il blocco che esiste gia'
 * nel DOM: da li' in poi il blocco si comporta come gli altri, e le card
 * entrano e escono con le animazioni di [data-anim]. La posizione di ciascuna
 * card la decide il CSS (assets/css/recensioni.css), il contenuto
 * recensioni-data.js.
 */
import { RECENSIONI } from './recensioni-data.js';
import { t, tn } from './i18n.js';

/** Ordine di entrata: alternato fra le due colonne, dall'alto in basso, cosi'
 *  le card compaiono attorno all'auto invece che una colonna alla volta. */
const ORDINE_ENTRATA = [0, 2, 4, 6, 1, 3, 5];

const STELLA = 'M8 1.2l2.03 4.3 4.7.6-3.44 3.25.87 4.66L8 11.73 3.84 14l.87-4.66L1.27 6.1l4.7-.6z';

function stelle(n) {
  const wrap = document.createElement('span');
  wrap.className = 'rv__stars';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', tn(n, '{n} stella su 5', '{n} stelle su 5'));
  for (let i = 0; i < 5; i++) {
    const piena = i < n;
    wrap.insertAdjacentHTML('beforeend',
      `<svg viewBox="0 0 16 16" aria-hidden="true" class="rv__star${piena ? '' : ' rv__star--off'}">`
      + `<path d="${STELLA}"/></svg>`);
  }
  return wrap;
}

/** Quante card vanno nella colonna di sinistra; le altre vanno a destra. */
const A_SINISTRA = 4;

export function costruisciRecensioni(root = document) {
  const box = root.querySelector('[data-rv]');
  if (!box) return;
  /** Cosa riscrivere al cambio lingua: le card restano le stesse, perche' sono
   *  gia' elementi animati del blocco. */
  const testi = [];
  const schede = RECENSIONI.map((r, k) => {
    const card = document.createElement('li');
    card.className = 'rv__card';
    card.dataset.anim = '';
    card.dataset.k = String(k);
    card.style.setProperty('--i', String(ORDINE_ENTRATA[k] ?? k));

    const head = document.createElement('div');
    head.className = 'rv__head';
    const quando = document.createElement('span');
    quando.className = 'rv__when';
    const voto = stelle(r.stelle);
    head.append(voto, quando);

    const testo = document.createElement('blockquote');
    testo.className = 'rv__text';

    const firma = document.createElement('p');
    firma.className = 'rv__by';
    const nome = document.createElement('span');
    nome.className = 'rv__name';
    nome.textContent = r.autore;
    const auto = document.createElement('span');
    auto.className = 'rv__car';
    auto.textContent = r.auto;
    firma.append(nome, auto);

    card.append(head, testo, firma);

    // Solo sulle recensioni prese davvero da Google (vedi recensioni-data.js).
    if (r.google) {
      const fonte = document.createElement('p');
      fonte.className = 'rv__source';
      card.appendChild(fonte);
    }
    const scrivi = () => {
      quando.textContent = t(r.quando);
      testo.textContent = t(r.testo);
      voto.setAttribute('aria-label', tn(r.stelle, '{n} stella su 5', '{n} stelle su 5'));
      const fonte = card.querySelector('.rv__source');
      if (fonte) fonte.textContent = t('Recensione verificata da Google');
    };
    scrivi();
    testi.push(scrivi);
    return card;
  });
  document.addEventListener('linguachange', () => testi.forEach((f) => f()));

  const colonna = (lato, voci) => {
    const ul = document.createElement('ul');
    ul.className = `rv__col rv__col--${lato}`;
    ul.append(...voci);
    return ul;
  };
  box.replaceChildren(
    colonna('sx', schede.slice(0, A_SINISTRA)),
    colonna('dx', schede.slice(A_SINISTRA)),
  );
}
