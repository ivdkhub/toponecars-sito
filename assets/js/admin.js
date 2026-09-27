/**
 * Area amministratore: la luce spenta sulla scena 2 e' la porta di servizio.
 *
 *  - Spegnendo la luce (themestart in avanti) le schede statistiche si
 *    ritirano e le voci del menu diventano quelle di amministrazione; a buio
 *    raggiunto (themeend) compare il form di accesso, su vetro.
 *  - Riaccendendo la luce (themestart all'indietro) si esce: logout, form
 *    svuotato e nascosto, voci e schede del sito tornano al loro posto.
 *
 * Lo stato si espone su <html>: data-admin="on" durante tutto il buio,
 * "off" dopo esserne usciti (serve alle animazioni di ritorno; al primo
 * caricamento l'attributo non c'e'), e data-admin-auth="true" a sessione
 * aperta.
 *
 * Sicurezza: con il server collegato (config.admin.endpoint) le credenziali
 * vanno a lui, che apre la sessione; la pagina tiene in memoria solo il nome
 * da mostrare. Senza server c'e' soltanto la DEMO (config.admin.demo): le sue
 * credenziali sono scritte nel form, aprono le pagine con dati di prova
 * salvati nel browser di chi la usa e non proteggono nulla — e' una vetrina,
 * non un accesso.
 */
import { t } from './i18n.js';

export class AdminArea {
  /**
   * @param {object} config CONFIG risolto
   * @param {Document|HTMLElement} root
   */
  constructor(config, root = document) {
    this.cfg = config.admin || {};
    this.root = document.documentElement;
    this.el = root.querySelector('[data-adm]');
    this.voci = [...root.querySelectorAll('[data-admin-item]')];
    this.dentro = false;
    this.nome = '';
    /** Il messaggio d'errore mostrato, come frase italiana: si ritraduce. */
    this.erroreIt = '';
  }

  /** Mostra (o toglie, con '') un messaggio sotto il form. */
  errore(testo) {
    this.erroreIt = testo;
    this.err.textContent = t(testo);
  }

  /** I testi del riquadro che dipendono dallo stato e dalla lingua. */
  scriviTesti() {
    this.el.querySelector('[data-adm-title]').textContent =
      t(this.dentro ? 'Area amministratore' : 'Accesso amministratore');
    this.el.querySelector('[data-adm-welcome]').textContent =
      this.dentro ? t('Accesso effettuato come {nome}.', { nome: this.nome === 'Demo' ? t('Demo') : this.nome }) : '';
    this.el.querySelector('[data-adm-note]').textContent =
      t('Scegli una sezione dal menu in alto. Per uscire, riaccendi la luce.');
    const occhio = this.el.querySelector('[data-adm-eye]');
    const visibile = occhio.getAttribute('aria-pressed') === 'true';
    occhio.setAttribute('aria-label', t(visibile ? 'Nascondi la password' : 'Mostra la password'));
    this.err.textContent = t(this.erroreIt);
  }

  attach() {
    if (!this.el) return;
    this.form = this.el.querySelector('[data-adm-form]');
    this.err = this.el.querySelector('[data-adm-err]');
    this.inBox = this.el.querySelector('[data-adm-in]');

    document.addEventListener('themestart', (e) => {
      if (!e.detail) return;
      // Le pagine di gestione (50 KB) servono solo a chi entra: si scaricano
      // mentre la luce si spegne, e sono pronte prima che compaia il form.
      if (e.detail.direction > 0) { this.caricaPagine(); this.entra(); } else this.esci();
    });
    document.addEventListener('themeend', (e) => {
      if (e.detail && e.detail.direction > 0) this.mostraForm();
    });

    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.accedi(); });
    this.form.addEventListener('input', () => this.errore(''));

    const occhio = this.el.querySelector('[data-adm-eye]');
    occhio.addEventListener('click', () => {
      const pwd = this.form.elements.password;
      const mostra = pwd.type === 'password';
      pwd.type = mostra ? 'text' : 'password';
      occhio.setAttribute('aria-pressed', String(mostra));
      occhio.setAttribute('aria-label', t(mostra ? 'Nascondi la password' : 'Mostra la password'));
    });

    document.addEventListener('officinachange', () => this.disegnaRiepilogo());
    document.addEventListener('linguachange', () => {
      this.scriviTesti();
      this.disegnaRiepilogo();
      if (this.pagine && this.pagine.pagina) this.pagine.disegna();
    });

    for (const v of this.voci) {
      v.addEventListener('click', (e) => {
        e.preventDefault();
        if (!this.dentro) { this.form.elements.utente.focus({ preventScroll: true }); return; }
        this.pagine.apri(v.dataset.adminItem);
        this.segnaVoce(v.dataset.adminItem);
      });
    }

    // Credenziali della demo, visibili nel form.
    const demo = this.cfg.demo;
    const box = this.el.querySelector('[data-adm-demo]');
    if (demo && !this.cfg.endpoint) {
      box.hidden = false;
      this.el.querySelector('[data-adm-demo-user]').textContent = demo.utente;
      this.el.querySelector('[data-adm-demo-pwd]').textContent = demo.password;
      this.el.querySelector('[data-adm-demo-fill]').addEventListener('click', () => {
        this.form.elements.utente.value = demo.utente;
        this.form.elements.password.value = demo.password;
        this.errore('');
        this.el.querySelector('[data-adm-send]').focus({ preventScroll: true });
      });
    }
  }

  /** Il modulo delle pagine di gestione, caricato una volta sola. */
  caricaPagine() {
    this.pronte ??= import('./admin-pagine.js').then(({ AdminPagine }) => {
      this.pagine = new AdminPagine(document);
      this.pagine.attach();
      this.pagine.onChiudi = () => this.segnaVoce(null);
      return this.pagine;
    });
    return this.pronte;
  }

  /** La voce della pagina aperta resta accesa nel menu. */
  segnaVoce(id) {
    this.voci.forEach((v) => {
      if (v.dataset.adminItem === id) v.setAttribute('aria-current', 'page');
      else v.removeAttribute('aria-current');
    });
  }

  entra() {
    this.root.dataset.admin = 'on';
  }

  mostraForm() {
    if (this.root.dataset.admin !== 'on') return;
    this.el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.root.dataset.admin === 'on') this.el.dataset.open = 'true';
    }));
    this.form.elements.utente.focus({ preventScroll: true });
  }

  esci() {
    if (this.root.dataset.admin !== 'on') return;
    this.logout();
    this.root.dataset.admin = 'off';
    this.el.dataset.open = 'false';
    const ms = parseFloat(getComputedStyle(this.el).transitionDuration) * 1000 || 0;
    setTimeout(() => { if (this.root.dataset.admin !== 'on') this.el.hidden = true; }, ms + 40);
  }

  async accedi() {
    const f = this.form.elements;
    const utente = f.utente.value.trim();
    const password = f.password.value;
    if (!utente || !password) {
      this.errore('Inserisci utente e password.');
      (utente ? f.password : f.utente).focus({ preventScroll: true });
      return;
    }
    if (!this.cfg.endpoint) {
      const demo = this.cfg.demo;
      if (demo && utente === demo.utente && password === demo.password) {
        f.password.value = '';
        this.apriSessione('Demo');
        return;
      }
      this.errore(demo
        ? 'Credenziali non corrette. Per la demo usa quelle indicate qui sotto.'
        : 'Accesso non disponibile: il server di autenticazione non è ancora collegato.');
      return;
    }
    const btn = this.el.querySelector('[data-adm-send]');
    btn.disabled = true;
    try {
      const r = await fetch(this.cfg.endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utente, password }),
      });
      if (r.status === 401 || r.status === 403) {
        this.errore('Utente o password non corretti.');
        f.password.value = '';
        f.password.focus({ preventScroll: true });
        return;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const dati = await r.json().catch(() => ({}));
      // La luce potrebbe essere stata riaccesa mentre si aspettava la risposta.
      if (this.root.dataset.admin !== 'on') { this.logout(); return; }
      this.apriSessione(dati.nome || utente);
    } catch (e) {
      this.errore('Il server non risponde. Riprova tra poco.');
    } finally {
      btn.disabled = false;
      f.password.value = '';
    }
  }

  async apriSessione(nome) {
    await this.caricaPagine();
    // La luce potrebbe essere stata riaccesa mentre il modulo arrivava.
    if (this.root.dataset.admin !== 'on') return;
    this.dentro = true;
    this.root.dataset.adminAuth = 'true';
    this.nome = nome;
    this.voci.forEach((v) => v.removeAttribute('aria-disabled'));
    this.scriviTesti();
    this.form.hidden = true;
    this.inBox.hidden = false;
    this.disegnaRiepilogo();
  }

  /** I numeri della giornata nella card di benvenuto. */
  disegnaRiepilogo() {
    const ul = this.el.querySelector('[data-adm-kpi]');
    if (!ul || !this.dentro) return;
    ul.replaceChildren(...this.pagine.riepilogo().map(([titolo, n, sotto]) => {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.className = 'adm__kpi-t';
      t.textContent = titolo;
      const v = document.createElement('b');
      v.textContent = String(n);
      const s = document.createElement('small');
      s.textContent = sotto;
      li.append(t, v, s);
      return li;
    }));
  }

  /** Chiude la sessione e riporta il form allo stato iniziale, vuoto. */
  logout() {
    if (this.dentro && this.cfg.logout) {
      fetch(this.cfg.logout, { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
    }
    this.dentro = false;
    if (this.pagine) this.pagine.chiudi(true);
    this.segnaVoce(null);
    delete this.root.dataset.adminAuth;
    this.voci.forEach((v) => v.setAttribute('aria-disabled', 'true'));
    this.form.reset();
    this.form.elements.password.type = 'password';
    this.el.querySelector('[data-adm-eye]').setAttribute('aria-pressed', 'false');
    this.nome = '';
    this.erroreIt = '';
    this.form.hidden = false;
    this.inBox.hidden = true;
    this.scriviTesti();
  }
}
