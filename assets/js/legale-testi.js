/**
 * I documenti legali del sito: informativa privacy (art. 13 GDPR), cookie
 * policy (art. 122 Codice privacy, linee guida del Garante del 10 giugno
 * 2021) e informazioni legali (D.Lgs. 70/2003, DPR 633/1972, Codice del
 * consumo). Li mostra legale.js.
 *
 * Fa fede il testo italiano; inglese e ucraino sono traduzioni. Cambiando un
 * testo si cambia in tutte e tre le lingue e si aggiorna
 * config.informativaAggiornata.
 *
 * Forma dei documenti: { titolo, intro, sezioni: [{ titolo, blocchi }] }.
 * Un blocco e':
 *  - una stringa o un elenco di pezzi (paragrafo); un pezzo e' una stringa,
 *    { link, testo } per un indirizzo esterno, { doc, testo } per un altro
 *    documento di questo pannello;
 *  - { elenco: [paragrafi] };
 *  - { tabella: { colonne: [...], righe: [[...]] } };
 *  - { preferenze: true }: il punto in cui legale.js mette i comandi del
 *    consenso.
 *
 * I dati dell'impresa arrivano in `d` (vedi legale.js, `datiImpresa()`): i
 * campi obbligatori mancanti valgono gia' "[da completare]" nella lingua
 * giusta. Una sezione puo' essere condizionale (`d.x && { ... }`): quelle
 * false si saltano. La sezione sulle recensioni compare solo quando nel sito
 * ci sono recensioni vere, copiate da Google (`google: true` in
 * recensioni-data.js): sulle segnaposto dichiarerebbe il falso.
 */

const GARANTE = 'https://www.garanteprivacy.it';
const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';
const GOOGLE_COOKIE = 'https://policies.google.com/technologies/cookies';
const META_PRIVACY = 'https://privacycenter.instagram.com/policy';
const VERCEL_PRIVACY = 'https://vercel.com/legal/privacy-policy';

/* =================================================================== ITALIANO */

function it(d) {
  const contatti = [`email ${d.email}`, d.pec && `PEC ${d.pec}`, d.telefono && `telefono ${d.telefono}`].filter(Boolean).join(', ');
  return {
    privacy: {
      titolo: 'Informativa sulla privacy',
      intro: `Come ${d.insegna} tratta i dati personali di chi usa questo sito, ai sensi dell’art. 13 del Regolamento (UE) 2016/679 (GDPR). Ultimo aggiornamento: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'Titolare del trattamento', blocchi: [
          `${d.ragione}, con sede in ${d.sede}, P.IVA ${d.piva}. Per qualunque richiesta sui tuoi dati: ${contatti}.`,
        ] },
        { titolo: 'Quali dati trattiamo', blocchi: [{ elenco: [
          'Richieste di prenotazione: nome e cognome, telefono, email (facoltativa), modello e targa dell’auto, note, servizi, giorno e ora scelti. Li scrivi tu nel modulo.',
          'Dati di navigazione: il server che ospita il sito registra, per motivi di sicurezza, dati tecnici come indirizzo IP, data e ora, pagina richiesta e tipo di browser.',
          ['Preferenze salvate nel tuo browser: la lingua e le scelte sui contenuti esterni. Vedi la ', { doc: 'cookie', testo: 'cookie policy' }, '.'],
          'La mappa di Google, solo se scegli di caricarla: in quel caso Google riceve il tuo indirizzo IP.',
          'Il sito non contiene contenuti incorporati da Instagram: se scegli di aprire il nostro profilo, lasci il sito e si applica l’informativa di Meta.',
        ] }] },
        { titolo: 'Perché li trattiamo e su quale base', blocchi: [{ elenco: [
          'Rispondere alla richiesta di appuntamento e ricontattarti: misure precontrattuali adottate su tua richiesta (art. 6, par. 1, lett. b GDPR).',
          'Eseguire l’intervento, emettere documenti fiscali e tenere la contabilità: esecuzione del contratto e obblighi di legge (art. 6, par. 1, lett. b e c).',
          'Proteggere il sito da abusi e attacchi (dati di navigazione): legittimo interesse del titolare (art. 6, par. 1, lett. f).',
          'Accertare, esercitare o difendere un diritto in sede giudiziaria: legittimo interesse del titolare.',
          'Caricare la mappa di Google: il tuo consenso (art. 6, par. 1, lett. a), che puoi revocare in ogni momento.',
        ] },
        'I campi del modulo di prenotazione non contrassegnati come facoltativi servono a rispondere: senza, non possiamo gestire la richiesta. Non usiamo i tuoi dati per pubblicità, non li vendiamo e non facciamo profilazione né decisioni automatizzate.',
        ] },
        { titolo: 'Per quanto tempo', blocchi: [{ elenco: [
          `Richieste di prenotazione: cancellate automaticamente ${d.conservazione} giorni dopo la data dell’appuntamento.`,
          'Documenti fiscali e contabili relativi agli interventi eseguiti: 10 anni, come previsto dall’art. 2220 del Codice civile.',
          'Dati di navigazione: per il periodo limitato stabilito dal fornitore di hosting per finalità di sicurezza.',
          `Consenso alla mappa: ${d.durataConsenso} giorni, poi te lo chiediamo di nuovo.`,
        ] }] },
        { titolo: 'Chi può vedere i dati', blocchi: [{ elenco: [
          'Il personale dell’officina autorizzato a gestire appuntamenti e interventi.',
          ['Vercel Inc., che ospita il sito, in qualità di responsabile del trattamento (', { link: VERCEL_PRIVACY, testo: 'informativa di Vercel' }, ').'],
          'I fornitori dei servizi informatici con cui l’officina riceve e gestisce le richieste (per esempio la posta elettronica), nominati responsabili del trattamento.',
          'Consulenti fiscali e contabili, e le autorità pubbliche quando la legge lo richiede.',
          ['Google Ireland Limited, titolare autonomo, solo se carichi la mappa (', { link: GOOGLE_PRIVACY, testo: 'informativa di Google' }, ').'],
        ] }] },
        { titolo: 'Trasferimenti fuori dall’Unione europea', blocchi: [
          'Vercel e Google possono trattare dati negli Stati Uniti. Il trasferimento si basa sulla decisione di adeguatezza della Commissione europea relativa all’EU-U.S. Data Privacy Framework o, in mancanza, sulle clausole contrattuali tipo approvate dalla Commissione (art. 45 e 46 GDPR).',
        ] },
        { titolo: 'I tuoi diritti', blocchi: [
          `Puoi chiedere in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverli in un formato leggibile (portabilità) e opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR). Puoi revocare il consenso alla mappa quando vuoi, senza conseguenze sul trattamento già avvenuto. Per esercitare i diritti scrivi a ${d.email}.`,
          ['Se ritieni che il trattamento violi la normativa, puoi proporre reclamo al Garante per la protezione dei dati personali (', { link: GARANTE, testo: 'garanteprivacy.it' }, ').'],
        ] },
      ],
    },

    cookie: {
      titolo: 'Cookie policy',
      intro: `Quali strumenti questo sito salva nel tuo browser e come gestire le tue scelte. Ultimo aggiornamento: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'In breve', blocchi: [
          'Il sito non usa cookie di profilazione, pubblicitari o statistici. Salva nel tuo browser solo poche informazioni tecniche, necessarie a funzioni che chiedi tu, che per legge non richiedono consenso (art. 122 del Codice privacy). L’unico contenuto di terze parti è la mappa di Google, che si carica solo se lo scegli.',
        ] },
        { titolo: 'Strumenti tecnici', blocchi: [
          'Sono dati salvati nella memoria locale del browser (localStorage): restano sul tuo dispositivo e non vengono inviati al nostro server.',
          { tabella: {
            colonne: ['Nome', 'A cosa serve', 'Durata'],
            righe: [
              ['toc-lingua', 'Ricorda la lingua che hai scelto con le bandierine.', 'Fino a quando la cancelli dal browser'],
              ['toc-consenso', 'Ricorda le tue scelte sui contenuti di terze parti e la loro data.', `${d.durataConsenso} giorni`],
              ['toc-officina-demo-v2', 'Dati dell’area riservata dimostrativa e copia delle richieste di prenotazione inviate da questo dispositivo, che restano solo nel tuo browser.', `Richieste: ${d.conservazione} giorni dopo l’appuntamento; il resto fino a quando lo cancelli`],
            ],
          } },
        ] },
        { titolo: 'Contenuti di terze parti', blocchi: [
          { tabella: {
            colonne: ['Servizio', 'Fornitore', 'Cosa succede'],
            righe: [
              ['Google Maps (mappa nella sezione “Vieni a trovarci”)', 'Google Ireland Limited, Gordon House, Barrow Street, Dublino 4, Irlanda', 'Caricando la mappa il tuo browser si collega ai server di Google, che riceve il tuo indirizzo IP e può installare cookie propri, anche per finalità sue. Senza il tuo consenso la mappa non si carica.'],
            ],
          } },
          ['Google agisce come titolare autonomo: ', { link: GOOGLE_PRIVACY, testo: 'informativa privacy di Google' }, ' e ', { link: GOOGLE_COOKIE, testo: 'uso dei cookie di Google' }, '.'],
          ['I collegamenti al profilo Instagram e alle indicazioni stradali di Google Maps aprono altri siti: lì si applicano le informative dei rispettivi gestori (per Instagram, ', { link: META_PRIVACY, testo: 'informativa di Meta' }, ').'],
        ] },
        { titolo: 'Le tue scelte', blocchi: [
          `Puoi dare o revocare qui il consenso in qualunque momento. La scelta vale ${d.durataConsenso} giorni. Puoi anche cancellare i dati salvati dalle impostazioni del browser.`,
          { preferenze: true },
        ] },
      ],
    },

    note: {
      titolo: 'Informazioni legali',
      intro: 'Dati dell’impresa e condizioni d’uso del sito.',
      sezioni: [
        { titolo: 'Dati dell’impresa', blocchi: [{ elenco: [
          `Ragione sociale: ${d.ragione}`,
          `Nome commerciale: ${d.insegna}`,
          `Sede: ${d.sede}`,
          `Partita IVA: ${d.piva}`,
          d.cf && `Codice fiscale: ${d.cf}`,
          `Iscrizione al Registro delle Imprese di Milano Monza Brianza Lodi, n. REA ${d.rea}`,
          d.capitale && `Capitale sociale: ${d.capitale}`,
          `Email: ${d.email}`,
          d.pec && `PEC: ${d.pec}`,
          d.telefono && `Telefono: ${d.telefono}`,
          'Attività: impresa di autoriparazione ai sensi della Legge 5 febbraio 1992, n. 122.',
        ].filter(Boolean) }] },
        { titolo: 'Prenotazioni e prezzi', blocchi: [
          'Le richieste inviate dal sito sono richieste di appuntamento: non costituiscono un contratto e non comportano costi. Intervento e prezzo si concordano con l’officina.',
          'I prezzi indicati nel sito sono in euro e comprendono l’IVA. Le tariffe del noleggio sono giornaliere; l’importo della cauzione è indicato su ogni auto, e le condizioni complete si ricevono in officina prima della firma del contratto.',
        ] },
        d.recensioniVere && { titolo: 'Recensioni', blocchi: [
          'Le recensioni mostrate nel sito sono tratte dalle recensioni pubbliche lasciate sul profilo Google dell’officina e sono riportate senza modifiche al testo. Non le selezioniamo in base al voto. Non verifichiamo che ogni autore abbia acquistato un nostro servizio: valgono i controlli che Google applica alle proprie recensioni (art. 22, comma 4-bis, del Codice del consumo).',
        ] },
        { titolo: 'Marchi', blocchi: [
          'Porsche, 911, GT3 RS, Michelin, Pilot Sport e gli altri marchi citati appartengono ai rispettivi titolari e sono usati solo per descrivere veicoli e prodotti. Salvo dove indicato espressamente, l’officina non è affiliata a né autorizzata da tali titolari.',
        ] },
        { titolo: 'Contenuti del sito', blocchi: [
          `Testi, immagini e video del sito appartengono a ${d.ragione} o ai rispettivi autori e non possono essere riprodotti senza autorizzazione.`,
        ] },
        { titolo: 'Reclami', blocchi: [
          `Per un reclamo scrivi a ${d.email}${d.pec ? ` o alla PEC ${d.pec}` : ''}. Restano salvi il ricorso agli organismi di risoluzione alternativa delle controversie e all’autorità giudiziaria competente.`,
        ] },
      ],
    },
  };
}

/* ==================================================================== INGLESE */

function en(d) {
  const contatti = [`email ${d.email}`, d.pec && `certified email (PEC) ${d.pec}`, d.telefono && `phone ${d.telefono}`].filter(Boolean).join(', ');
  return {
    privacy: {
      titolo: 'Privacy notice',
      intro: `How ${d.insegna} processes the personal data of people using this website, under Article 13 of Regulation (EU) 2016/679 (GDPR). The Italian version is the legally binding one. Last updated: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'Data controller', blocchi: [
          `${d.ragione}, registered office at ${d.sede}, VAT no. ${d.piva}. For any request about your data: ${contatti}.`,
        ] },
        { titolo: 'What data we process', blocchi: [{ elenco: [
          'Booking requests: first and last name, phone number, email (optional), car model and number plate, notes, services, chosen day and time. You enter them in the form.',
          'Browsing data: the server hosting the site records, for security purposes, technical data such as IP address, date and time, requested page and browser type.',
          ['Preferences saved in your browser: your language and your choices about external content. See the ', { doc: 'cookie', testo: 'cookie policy' }, '.'],
          'The Google map, only if you choose to load it: in that case Google receives your IP address.',
          'The site contains no embedded Instagram content: if you choose to open our profile, you leave the site and Meta’s privacy policy applies.',
        ] }] },
        { titolo: 'Why we process it and on what legal basis', blocchi: [{ elenco: [
          'Answering your appointment request and contacting you: pre-contractual steps taken at your request (Art. 6(1)(b) GDPR).',
          'Carrying out the work, issuing tax documents and keeping accounts: performance of a contract and legal obligations (Art. 6(1)(b) and (c)).',
          'Protecting the site from abuse and attacks (browsing data): the controller’s legitimate interest (Art. 6(1)(f)).',
          'Establishing, exercising or defending legal claims: the controller’s legitimate interest.',
          'Loading the Google map: your consent (Art. 6(1)(a)), which you can withdraw at any time.',
        ] },
        'The booking form fields not marked as optional are needed to reply: without them we cannot handle the request. We do not use your data for advertising, we do not sell it and we do not carry out profiling or automated decision-making.',
        ] },
        { titolo: 'How long we keep it', blocchi: [{ elenco: [
          `Booking requests: deleted automatically ${d.conservazione} days after the appointment date.`,
          'Tax and accounting documents for work carried out: 10 years, as required by Article 2220 of the Italian Civil Code.',
          'Browsing data: for the limited period set by the hosting provider for security purposes.',
          `Consent to the map: ${d.durataConsenso} days, after which we ask again.`,
        ] }] },
        { titolo: 'Who can see the data', blocchi: [{ elenco: [
          'Workshop staff authorised to manage appointments and work.',
          ['Vercel Inc., which hosts the site, as data processor (', { link: VERCEL_PRIVACY, testo: 'Vercel privacy policy' }, ').'],
          'Providers of the IT services the workshop uses to receive and manage requests (for example email), appointed as data processors.',
          'Tax and accounting advisers, and public authorities where required by law.',
          ['Google Ireland Limited, as an independent controller, only if you load the map (', { link: GOOGLE_PRIVACY, testo: 'Google privacy policy' }, ').'],
        ] }] },
        { titolo: 'Transfers outside the European Union', blocchi: [
          'Vercel and Google may process data in the United States. Transfers rely on the European Commission’s adequacy decision for the EU-U.S. Data Privacy Framework or, failing that, on the standard contractual clauses approved by the Commission (Articles 45 and 46 GDPR).',
        ] },
        { titolo: 'Your rights', blocchi: [
          `At any time you can ask to access, correct or delete your data, restrict its processing, receive it in a machine-readable format (portability) and object to processing based on legitimate interest (Articles 15-22 GDPR). You can withdraw your consent to the map whenever you like, without affecting processing already carried out. To exercise your rights, write to ${d.email}.`,
          ['If you believe the processing breaks the law, you can lodge a complaint with the Italian Data Protection Authority, the Garante per la protezione dei dati personali (', { link: GARANTE, testo: 'garanteprivacy.it' }, ').'],
        ] },
      ],
    },

    cookie: {
      titolo: 'Cookie policy',
      intro: `What this website saves in your browser and how to manage your choices. Last updated: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'In short', blocchi: [
          'The site uses no profiling, advertising or analytics cookies. It saves in your browser only a few technical items needed for features you ask for, which by law require no consent (Article 122 of the Italian Privacy Code). The only third-party content is the Google map, which loads only if you choose so.',
        ] },
        { titolo: 'Technical storage', blocchi: [
          'This data is saved in the browser’s local storage (localStorage): it stays on your device and is not sent to our server.',
          { tabella: {
            colonne: ['Name', 'Purpose', 'Duration'],
            righe: [
              ['toc-lingua', 'Remembers the language you chose with the flags.', 'Until you delete it from your browser'],
              ['toc-consenso', 'Remembers your choices about third-party content and when you made them.', `${d.durataConsenso} days`],
              ['toc-officina-demo-v2', 'Data for the demo private area and a copy of the booking requests sent from this device, which stay only in your browser.', `Requests: ${d.conservazione} days after the appointment; the rest until you delete it`],
            ],
          } },
        ] },
        { titolo: 'Third-party content', blocchi: [
          { tabella: {
            colonne: ['Service', 'Provider', 'What happens'],
            righe: [
              ['Google Maps (map in the “Visit us” section)', 'Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland', 'When the map loads, your browser connects to Google’s servers, which receive your IP address and may set their own cookies, also for their own purposes. Without your consent the map does not load.'],
            ],
          } },
          ['Google acts as an independent controller: ', { link: GOOGLE_PRIVACY, testo: 'Google privacy policy' }, ' and ', { link: GOOGLE_COOKIE, testo: 'how Google uses cookies' }, '.'],
          ['Links to the Instagram profile and to Google Maps directions open other websites, where their operators’ policies apply (for Instagram, ', { link: META_PRIVACY, testo: 'Meta privacy policy' }, ').'],
        ] },
        { titolo: 'Your choices', blocchi: [
          `You can give or withdraw consent here at any time. Your choice lasts ${d.durataConsenso} days. You can also delete saved data in your browser settings.`,
          { preferenze: true },
        ] },
      ],
    },

    note: {
      titolo: 'Legal information',
      intro: 'Company details and terms of use of the website. The Italian version is the legally binding one.',
      sezioni: [
        { titolo: 'Company details', blocchi: [{ elenco: [
          `Company name: ${d.ragione}`,
          `Trading name: ${d.insegna}`,
          `Registered office: ${d.sede}`,
          `VAT number: ${d.piva}`,
          d.cf && `Tax code: ${d.cf}`,
          `Registered with the Milano Monza Brianza Lodi Companies Register, REA no. ${d.rea}`,
          d.capitale && `Share capital: ${d.capitale}`,
          `Email: ${d.email}`,
          d.pec && `Certified email (PEC): ${d.pec}`,
          d.telefono && `Phone: ${d.telefono}`,
          'Business: car repair company under Italian Law no. 122 of 5 February 1992.',
        ].filter(Boolean) }] },
        { titolo: 'Bookings and prices', blocchi: [
          'Requests sent from the site are appointment requests: they are not a contract and cost nothing. The work and its price are agreed with the workshop.',
          'Prices shown on the site are in euros and include VAT. Rental rates are per day; the deposit amount is shown on each car, and the full terms are given at the workshop before signing the contract.',
        ] },
        d.recensioniVere && { titolo: 'Reviews', blocchi: [
          'The reviews shown on the site are taken from the public reviews left on the workshop’s Google profile and are reported without changes to the text. We do not select them by rating. We do not check that each author bought one of our services: the checks Google applies to its own reviews apply (Article 22(4-bis) of the Italian Consumer Code).',
        ] },
        { titolo: 'Trademarks', blocchi: [
          'Porsche, 911, GT3 RS, Michelin, Pilot Sport and the other trademarks mentioned belong to their respective owners and are used only to describe vehicles and products. Unless expressly stated, the workshop is not affiliated with or authorised by those owners.',
        ] },
        { titolo: 'Website content', blocchi: [
          `Texts, images and videos on the site belong to ${d.ragione} or to their authors and may not be reproduced without permission.`,
        ] },
        { titolo: 'Complaints', blocchi: [
          `To make a complaint, write to ${d.email}${d.pec ? ` or to the certified email ${d.pec}` : ''}. You may still turn to alternative dispute resolution bodies and to the competent court.`,
        ] },
      ],
    },
  };
}

/* ==================================================================== UCRAINO */

function uk(d) {
  const contatti = [`ел. пошта ${d.email}`, d.pec && `PEC ${d.pec}`, d.telefono && `телефон ${d.telefono}`].filter(Boolean).join(', ');
  return {
    privacy: {
      titolo: 'Політика конфіденційності',
      intro: `Як ${d.insegna} обробляє персональні дані користувачів цього сайту відповідно до ст. 13 Регламенту (ЄС) 2016/679 (GDPR). Юридичну силу має італійська версія. Останнє оновлення: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'Контролер даних', blocchi: [
          `${d.ragione}, юридична адреса: ${d.sede}, ПДВ-номер ${d.piva}. З будь-яких питань щодо ваших даних: ${contatti}.`,
        ] },
        { titolo: 'Які дані ми обробляємо', blocchi: [{ elenco: [
          'Запити на бронювання: ім’я та прізвище, телефон, ел. пошта (необов’язково), модель і номерний знак авто, примітки, послуги, обрані день і час. Ви вводите їх у формі.',
          'Дані перегляду: сервер, на якому розміщено сайт, з міркувань безпеки записує технічні дані — IP-адресу, дату й час, запитану сторінку та тип браузера.',
          ['Налаштування, збережені у вашому браузері: мова та ваш вибір щодо зовнішнього вмісту. Див. ', { doc: 'cookie', testo: 'політику щодо файлів cookie' }, '.'],
          'Мапа Google — лише якщо ви вирішите її завантажити: тоді Google отримує вашу IP-адресу.',
          'Сайт не містить вбудованого вмісту Instagram: якщо ви відкриваєте наш профіль, ви залишаєте сайт, і діє політика конфіденційності Meta.',
        ] }] },
        { titolo: 'Навіщо ми їх обробляємо і на якій підставі', blocchi: [{ elenco: [
          'Відповісти на запит на запис і зв’язатися з вами: переддоговірні заходи на ваш запит (ст. 6(1)(b) GDPR).',
          'Виконати роботи, видати податкові документи й вести облік: виконання договору та вимоги закону (ст. 6(1)(b) і (c)).',
          'Захищати сайт від зловживань і атак (дані перегляду): законний інтерес контролера (ст. 6(1)(f)).',
          'Встановлення, здійснення або захист прав у суді: законний інтерес контролера.',
          'Завантаження мапи Google: ваша згода (ст. 6(1)(a)), яку ви можете будь-коли відкликати.',
        ] },
        'Поля форми бронювання, не позначені як необов’язкові, потрібні для відповіді: без них ми не зможемо опрацювати запит. Ми не використовуємо ваші дані для реклами, не продаємо їх і не здійснюємо профілювання чи автоматизованого ухвалення рішень.',
        ] },
        { titolo: 'Як довго ми їх зберігаємо', blocchi: [{ elenco: [
          `Запити на бронювання: автоматично видаляються через ${d.conservazione} днів після дати запису.`,
          'Податкові та облікові документи щодо виконаних робіт: 10 років, як передбачено ст. 2220 Цивільного кодексу Італії.',
          'Дані перегляду: протягом обмеженого строку, встановленого хостинг-провайдером з міркувань безпеки.',
          `Згода на мапу: ${d.durataConsenso} днів, після чого ми запитаємо знову.`,
        ] }] },
        { titolo: 'Хто може бачити дані', blocchi: [{ elenco: [
          'Працівники майстерні, уповноважені вести записи та роботи.',
          ['Vercel Inc., що розміщує сайт, як обробник даних (', { link: VERCEL_PRIVACY, testo: 'політика Vercel' }, ').'],
          'Постачальники ІТ-послуг, через які майстерня отримує й опрацьовує запити (наприклад, ел. пошта), призначені обробниками даних.',
          'Податкові й бухгалтерські консультанти, а також державні органи, коли цього вимагає закон.',
          ['Google Ireland Limited як самостійний контролер — лише якщо ви завантажуєте мапу (', { link: GOOGLE_PRIVACY, testo: 'політика Google' }, ').'],
        ] }] },
        { titolo: 'Передавання за межі Європейського Союзу', blocchi: [
          'Vercel і Google можуть обробляти дані в США. Передавання ґрунтується на рішенні Європейської комісії про адекватність щодо EU-U.S. Data Privacy Framework або, за його відсутності, на стандартних договірних положеннях, затверджених Комісією (ст. 45 і 46 GDPR).',
        ] },
        { titolo: 'Ваші права', blocchi: [
          `Ви будь-коли можете вимагати доступу до своїх даних, їх виправлення чи видалення, обмеження обробки, отримання даних у машинозчитуваному форматі (перенесення) та заперечити проти обробки на підставі законного інтересу (ст. 15–22 GDPR). Згоду на мапу можна відкликати будь-коли, це не впливає на вже здійснену обробку. Щоб скористатися правами, напишіть на ${d.email}.`,
          ['Якщо ви вважаєте, що обробка порушує закон, можете подати скаргу до італійського органу із захисту даних — Garante per la protezione dei dati personali (', { link: GARANTE, testo: 'garanteprivacy.it' }, ').'],
        ] },
      ],
    },

    cookie: {
      titolo: 'Політика щодо файлів cookie',
      intro: `Що цей сайт зберігає у вашому браузері і як керувати своїм вибором. Останнє оновлення: ${d.aggiornata}.`,
      sezioni: [
        { titolo: 'Коротко', blocchi: [
          'Сайт не використовує рекламних, аналітичних чи профілюючих cookie. Він зберігає у вашому браузері лише кілька технічних записів, потрібних для функцій, якими ви користуєтеся, — за законом для них згода не потрібна (ст. 122 Кодексу про захист персональних даних Італії). Єдиний вміст третіх сторін — мапа Google, яка завантажується лише за вашим вибором.',
        ] },
        { titolo: 'Технічні записи', blocchi: [
          'Ці дані зберігаються в локальному сховищі браузера (localStorage): вони залишаються на вашому пристрої й не надсилаються на наш сервер.',
          { tabella: {
            colonne: ['Назва', 'Призначення', 'Строк'],
            righe: [
              ['toc-lingua', 'Запам’ятовує мову, яку ви обрали прапорцем.', 'Доки ви не видалите її з браузера'],
              ['toc-consenso', 'Запам’ятовує ваш вибір щодо вмісту третіх сторін і його дату.', `${d.durataConsenso} днів`],
              ['toc-officina-demo-v2', 'Дані демонстраційної закритої зони та копія запитів на бронювання, надісланих із цього пристрою; вони залишаються лише у вашому браузері.', `Запити: ${d.conservazione} днів після запису; решта — доки ви не видалите`],
            ],
          } },
        ] },
        { titolo: 'Вміст третіх сторін', blocchi: [
          { tabella: {
            colonne: ['Сервіс', 'Постачальник', 'Що відбувається'],
            righe: [
              ['Google Maps (мапа в розділі «Завітайте до нас»)', 'Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ірландія', 'Під час завантаження мапи ваш браузер з’єднується із серверами Google, які отримують вашу IP-адресу й можуть встановлювати власні cookie, зокрема для власних цілей. Без вашої згоди мапа не завантажується.'],
            ],
          } },
          ['Google діє як самостійний контролер: ', { link: GOOGLE_PRIVACY, testo: 'політика конфіденційності Google' }, ' і ', { link: GOOGLE_COOKIE, testo: 'як Google використовує cookie' }, '.'],
          ['Посилання на профіль Instagram і на маршрут у Google Maps відкривають інші сайти, де діють політики їхніх власників (для Instagram — ', { link: META_PRIVACY, testo: 'політика Meta' }, ').'],
        ] },
        { titolo: 'Ваш вибір', blocchi: [
          `Тут ви можете будь-коли надати або відкликати згоду. Вибір діє ${d.durataConsenso} днів. Збережені дані також можна видалити в налаштуваннях браузера.`,
          { preferenze: true },
        ] },
      ],
    },

    note: {
      titolo: 'Правова інформація',
      intro: 'Дані підприємства та умови користування сайтом. Юридичну силу має італійська версія.',
      sezioni: [
        { titolo: 'Дані підприємства', blocchi: [{ elenco: [
          `Найменування: ${d.ragione}`,
          `Торгова назва: ${d.insegna}`,
          `Юридична адреса: ${d.sede}`,
          `ПДВ-номер (Partita IVA): ${d.piva}`,
          d.cf && `Податковий код: ${d.cf}`,
          `Зареєстровано в Реєстрі підприємств Мілан — Монца-Бріанца — Лоді, № REA ${d.rea}`,
          d.capitale && `Статутний капітал: ${d.capitale}`,
          `Ел. пошта: ${d.email}`,
          d.pec && `Сертифікована ел. пошта (PEC): ${d.pec}`,
          d.telefono && `Телефон: ${d.telefono}`,
          'Діяльність: підприємство з ремонту автомобілів відповідно до Закону Італії № 122 від 5 лютого 1992 р.',
        ].filter(Boolean) }] },
        { titolo: 'Бронювання та ціни', blocchi: [
          'Запити, надіслані із сайту, — це запити на запис: вони не є договором і нічого не коштують. Роботи та їхня ціна узгоджуються з майстернею.',
          'Ціни на сайті вказано в євро з ПДВ. Тарифи оренди — за добу; сума застави вказана для кожного авто, а повні умови ви отримаєте в майстерні до підписання договору.',
        ] },
        d.recensioniVere && { titolo: 'Відгуки', blocchi: [
          'Відгуки на сайті взято з публічних відгуків на профілі майстерні в Google і наведено без змін тексту. Ми не добираємо їх за оцінкою. Ми не перевіряємо, чи кожен автор купував наші послуги: діють перевірки, які Google застосовує до своїх відгуків (ст. 22, ч. 4-bis Кодексу прав споживачів Італії).',
        ] },
        { titolo: 'Торговельні марки', blocchi: [
          'Porsche, 911, GT3 RS, Michelin, Pilot Sport та інші згадані марки належать їхнім власникам і використовуються лише для опису автомобілів і продуктів. Якщо прямо не зазначено інше, майстерня не пов’язана з цими власниками й не уповноважена ними.',
        ] },
        { titolo: 'Вміст сайту', blocchi: [
          `Тексти, зображення й відео сайту належать ${d.ragione} або їхнім авторам і не можуть відтворюватися без дозволу.`,
        ] },
        { titolo: 'Скарги', blocchi: [
          `Щоб подати скаргу, напишіть на ${d.email}${d.pec ? ` або на PEC ${d.pec}` : ''}. Ви також можете звернутися до органів альтернативного вирішення спорів і до компетентного суду.`,
        ] },
      ],
    },
  };
}

export const DOCUMENTI = { it, en, uk };
