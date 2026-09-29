# Top One Cars — landing page a scene video

Sette scene a tutto schermo collegate da sei transizioni video. Il viewport è
fisso, la pagina non scorre: un gesto di scroll vale esattamente una transizione
e non si può saltare una scena.

Lo stato di riposo di una scena **è l'ultimo fotogramma del video precedente**:
non è un'immagine separata, è l'elemento `<video>` della transizione lasciato in
pausa su quel fotogramma. La giuntura «transizione → scena ferma» è quindi esatta
per costruzione. Lo scroll all'indietro usa clip riavvolte precodificate, quindi è
fluido quanto quello in avanti.

## Avvio

```
node tools/serve.js
# poi apri http://localhost:5173/
```

Il server incluso **non è un dettaglio**: serve il supporto alle richieste
`Range`, senza il quale Chrome non può fare seek dentro un `<video>` e lo
scrubbing manuale smette di funzionare. `python -m http.server` non lo implementa.
Aprendo la pagina con `file://` compare una spiegazione a schermo.

## Struttura

```
index.html
assets/
  css/   base.css  type.css  chrome.css  blocks.css
         servizi.css  prenotazione.css  recensioni.css  contenuti.css
         admin.css  hint.css  stampa-preventivo.css  legale.css
  js/    config.js  video-player.js  scene-machine.js
         input-controller.js  blocks.js  menu.js  controls.js  main.js
         theme-tint.js  menu-hint.js  legale.js  consenso.js
         servizi.js  prenotazione.js  recensioni.js  contenuti.js
         admin.js  admin-pagine.js  dati-officina.js
         servizi-data.js  recensioni-data.js  contenuti-data.js   (dati)
         legale-testi.js   informativa, cookie policy, note legali (3 lingue)
  fonts/ Aldrich-Regular.woff2  AlbertSans-Variable.woff2
  media/ av1/ av1-sd/ hevc/ hevc-sd/ h264-sd/   t1..t5.mp4 + .rev.mp4
                                                darktheme.mp4 + .rev.mp4
                                                vernice-giallo.mp4 + .rev.mp4
         contenuti/   i video dell'iPhone (AV1, HEVC, H.264 originale)
         poster.webp  logo.webp  logo@2x.webp
tools/   generazione media, misura, autotest, confronto al pixel
tests/   autotest.html — la pagina di autotest, apribile anche a mano
video/ foto/ mockup ui sample/ video-sezione-contenuti/
         sorgenti, fuori dal repository (vedi .gitignore)
menu_servizi.txt  il catalogo dei servizi scritto dal committente
vercel.json  intestazioni di sicurezza e di cache per la pubblicazione
REPORT.md  esiti delle verifiche e difetti del materiale sorgente
```

## Le pagine

| Scena | Voce di menu      | Contenuto |
|-------|-------------------|-----------|
| 2     | Chi siamo         | titolo, indirizzo, tre schede di vetro con i numeri |
| 3     | Servizi           | pulsante "Prenota un servizio!": elenco servizi, poi calendario e modulo |
| 4     | Contenuti         | note sulla ruota; il secondo scroll apre la card con l'iPhone |
| 5     | Recensioni        | sette card attorno all'auto vista dall'alto |
| 6     | Vieni a trovarci  | solo video, nessun contenuto |
| 7     | Noleggio          | solo video, nessun contenuto |

A luce spenta (lampadina, scena 2) si apre l'**area amministratore**: vedi sotto.

## Cambiare i contenuti

- **Catalogo servizi**: si scrive in `menu_servizi.txt` (le categorie con ogni
  parola maiuscola, i servizi solo con la prima) e si rigenera con
  `npm run servizi`, che stampa l'albero ricavato. Da li' in poi prezzi,
  durate, servizi aggiunti o tolti si gestiscono dall'area amministratore.
- **Recensioni**: `assets/js/recensioni-data.js`. `google: true` solo sulle
  recensioni copiate davvero da Google.
- **Video dell'iPhone**: si mettono in `video-sezione-contenuti/` e si lancia
  `python tools/build-contenuti.py`. Per ogni video cerca il CRF che resta a
  SSIM 0,9895 dall'originale pesando meno; se non ci riesce il formato non si
  pubblica e resta l'originale H.264. I titoli si correggono in
  `assets/js/contenuti-data.js`.
- **Orari, Instagram, invio prenotazioni, accesso admin**: `assets/js/config.js`,
  voci `prenotazione`, `contenuti`, `admin`.

## Sul telefono

Sul telefono (schermo largo fino a 640 px, o basso e a tocco in orizzontale)
la sequenza di scene video non parte: nessun video viene scaricato, e al suo
posto c'e' una pagina che scorre, su un fondo fermo viola e giallo, con le
stesse sezioni e le stesse card di vetro. Computer e tablet non cambiano.

- `assets/js/mobile-detect.js`, script sincrono nel `<head>`, mette
  `html[data-mobile]` prima del primo disegno; `?mobile=1` e `?mobile=0`
  forzano la scelta per le prove da computer.
- `assets/js/mobile.js` avvia la pagina al posto del motore (lo chiama
  `main.js`): menu a comparsa, servizi e prenotazione in un foglio a tutto
  schermo, lampadina nella barra per l'area amministratore.
- `assets/css/mobile.css` impagina tutto in colonna; ogni regola comincia con
  `html[data-mobile]`, quindi fuori dal telefono non ne vale nessuna.
- `node tools/mobile-shoot.mjs [cartella]` scatta la pagina, il menu, la
  prenotazione completa e ogni pagina dell'area amministratore a 390x844.

## Lingue

Il sito e' in italiano, inglese e ucraino; si sceglie con le bandierine nella
barra del menu e la scelta resta nel browser (`assets/js/i18n.js`).

- Le frasi stanno in `assets/js/i18n-testi.js`: chiave la frase italiana,
  valore `[inglese, ucraino]`. Una frase senza traduzione resta in italiano.
- Negli script ogni testo passa da `t('frase italiana', { valori })`, o da
  `tn(n, 'forma singolare', 'forma plurale')` quando un numero decide la forma
  (l'ucraino ne ha tre). Chi scrive testi ascolta `linguachange` e si
  ridisegna. Date, mesi, giorni e importi li formatta `Intl` nella lingua scelta.
- I testi scritti in `index.html` si traducono da soli se la frase e' nel
  dizionario; i paragrafi spezzati con `<br>` portano `data-i18n-righe`.
- I valori salvati nell'archivio (nomi dei servizi, stati, categorie) restano
  in italiano e si traducono solo a video: un servizio aggiunto dall'area
  amministratore compare con il nome che gli si e' dato, in ogni lingua.
- Albert Sans e Aldrich non hanno il cirillico: per l'ucraino li completano
  Onest e Tektur, dichiarati in `base.css` sotto lo stesso nome e scaricati
  solo quando serve (`unicode-range`).

Aggiungendo o cambiando un testo:

```
node tools/i18n-check.mjs    # frasi del sito che mancano nel dizionario
node tools/i18n-probe.mjs    # il sito nelle tre lingue, pannelli e area admin compresi
```

## Area amministratore

Spegnendo la luce le voci del menu diventano Servizi, Prenotazioni, Parco
auto-noleggio, Orari di apertura, Genera preventivo, e compare l'accesso.
Riaccendendo la luce si esce (logout).

Oggi e' una **demo**: credenziali scritte nel form (`demo` / `toponecars`),
dati salvati nel `localStorage` del browser di chi la usa
(`assets/js/dati-officina.js`). Il sito pubblico legge lo stesso archivio:
servizi tolti, orari e chiusure cambiati nell'area si vedono subito nel
pannello dei servizi e nel calendario. Per la produzione servono un server che
verifichi le credenziali (`admin.endpoint`) e un archivio condiviso al posto del
`localStorage` (`carica` e `salva` in `dati-officina.js`).

## Prima della pubblicazione

Contenuti segnaposto o da confermare, tutti marcati nel codice:

- recensioni inventate (`recensioni-data.js`): vanno sostituite con recensioni vere;
- orari di apertura (`config.js`, `prenotazione.orari`);
- profilo Instagram (`config.js`, `contenuti.instagram.url`);
- invio delle prenotazioni (`config.js`, `prenotazione.endpoint`): oggi la
  conferma compare ma la richiesta non parte;
- accesso amministratore reale (`config.js`, `admin.endpoint`) e rimozione di
  `admin.demo`;
- dati dell'impresa (`config.js`, voce `azienda`): ragione sociale, partita
  IVA, numero REA, email per i diritti privacy, e PEC, telefono, capitale
  sociale se ci sono. Finche' mancano, nel sito compare «[da completare]» e la
  console lo segnala a ogni caricamento. Si prendono dalla visura camerale;
- testi legali (`legale-testi.js`) da far rileggere a chi segue la privacy
  dell'officina, in particolare se le prenotazioni arriveranno per email o su
  un gestionale: vanno nominati i fornitori effettivi;
- `og:image` e `og:url` in `index.html`, quando il dominio e' noto.

## Privacy, cookie e note legali

In fondo a ogni scena, a destra, c'e' la barra legale: insegna, partita IVA
(obbligatoria nella pagina iniziale, art. 35 DPR 633/1972) e i tre documenti,
che si aprono in un pannello (`legale.js`, testi in `legale-testi.js`).

- Il sito **non usa cookie** propri, ne' statistiche ne' pubblicita': salva nel
  browser solo lingua, scelte sul consenso e i dati della demo admin, che non
  richiedono consenso. Per questo **non c'e' il banner**.
- L'unico contenuto di terzi e' la **mappa di Google** nella scena «Vieni a
  trovarci». Finche' non si preme «Carica la mappa» da Google non si scarica
  nulla; la scelta vale 180 giorni e si revoca dalla cookie policy
  (`consenso.js`). Aggiungendo statistiche, pixel o video incorporati serve
  anche il banner al primo accesso.
- Il modulo di prenotazione chiede la **presa visione** dell'informativa, non
  un consenso: la base giuridica e' la richiesta stessa del cliente.
- La sezione sulle recensioni delle note legali compare da sola quando in
  `recensioni-data.js` c'e' almeno una recensione vera (`google: true`).
- Cambiando un testo legale si cambia in tutte e tre le lingue e si aggiorna
  `informativaAggiornata` in `config.js`.

## Come vengono serviti i media

Ogni clip esiste in cinque codifiche, prodotte da `python tools/build-media.py`.
Il browser riceve **la prima che sa decodificare**, scelta in `config.js` con
`canPlayType`:

| cartella  | codec | misura    | a chi va |
|-----------|-------|-----------|----------|
| `av1`     | AV1   | 1928×1072 | Chrome, Edge, Firefox, Android, Mac e iPhone recenti |
| `av1-sd`  | AV1   | 1280×712  | gli stessi, su schermo piccolo o connessione lenta |
| `hevc`    | HEVC  | 1928×1072 | Safari e iOS senza decodifica AV1 |
| `hevc-sd` | HEVC  | 1280×712  | gli stessi, su schermo piccolo |
| `h264-sd` | H.264 | 1280×712  | rete di sicurezza per i browser senza né l'uno né l'altro |

AV1 pesa circa un quarto dell'H.264 a parità di qualità misurata (SSIM), quindi
la scelta **non** toglie nulla alla resa: è lo stesso fotogramma con un codec
migliore.

Le regole di traffico (le prime in `video-player.js`):

- **le clip riavvolte non si scaricano con la pagina.** Partono al primo scroll
  all'indietro davvero eseguibile. Chi percorre la sequenza in avanti e si ferma
  lì non ne paga un byte, e sono metà del peso totale;
- **il precaricamento riempie la cache, non i decodificatori.** Fuori da una
  finestra di poche scene si usa una `fetch`, non un `<video>`: undici video
  caricati insieme sono il modo più rapido per far scattare un telefono;
- **cio' che sta lontano si chiede quando ci si avvicina.** Le foto del
  noleggio partono quando una transizione punta a due scene di distanza; i
  testi legali (37 KB) al primo passaggio del puntatore sui collegamenti; le
  pagine dell'area amministratore (50 KB) mentre la luce si spegne. Tutti i
  moduli dell'avvio sono invece dichiarati in `index.html` con
  `modulepreload`, cosi' arrivano in un solo giro di rete invece che uno
  strato alla volta;
- **un solo poster.** Lo stato di riposo delle altre scene è un fotogramma video
  in pausa, quindi i loro poster venivano scaricati (5,6 MB di PNG) per non
  comparire mai.

Gli indirizzi portano una revisione (`?v=r2`, in `config.js`) perché `vercel.json`
li serve con `Cache-Control: immutable` per un anno. **Rigenerando i video va
incrementata `MEDIA_REV`**, altrimenti chi ha già visitato il sito continua a
vedere le clip vecchie.

## Le varianti di una scena

Sulla seconda scena si può spegnere la luce e si può cambiare il colore
dell'auto. Nessuna delle due è una scena in più: sono **stati di riposo
alternativi** della stessa scena. La clip parte dal fotogramma su cui quella
scena si ferma e arriva altrove, dove resta in pausa; riprodotta al contrario
riporta al punto di partenza.

| variante | comando | clip | stati |
|---|---|---|---|
| `theme` | lampadina | `darktheme.mp4` | `chiaro` → `scuro` |
| `paint` | vernice | `vernice-giallo.mp4` | `rosso` → `giallo` |

È la stessa meccanica delle transizioni fra scene — stessa velocità, stesse
dissolvenze sulle giunture, stesso rifiuto delle richieste che arrivano mentre il
video scorre. Le giunture sono state misurate come tutte le altre: **3,45** per
il buio e **3,57** per la vernice, contro il 3,30 della giuntura fra la prima e
la seconda transizione.

Due regole, entrambe volute:

- **da una variante non si cambia scena.** Le sei transizioni della sequenza
  esistono soltanto con le luci accese e l'auto rossa, quindi percorrerle da lì
  vorrebbe dire riaccendere la luce, o ridipingere l'auto, di nascosto. `canGo()`
  è falso e ogni richiesta viene scartata come al bordo della sequenza;
- **due varianti non sono attive insieme,** per la stessa ragione: la clip del
  buio riprende un'auto rossa, quella della vernice un'auto illuminata. Il
  comando dell'una sparisce mentre l'altra è attiva.

Per questo ogni comando resta visibile quando la sua variante è attiva: è l'unica
via d'uscita. Tutto si configura in `config.js`, sezione `variants`: quale scena,
quali clip, quali colori, quanto dura la dissolvenza. Aggiungere un colore
significa aggiungere una clip e una voce in `options`, nient'altro.

## I comandi visibili

`assets/js/controls.js` contiene la lampadina, la vernice e l'invito «Scroll to
explore» in basso al centro. Nessuno di loro decide alcunché: chiedono alla
macchina a stati se la cosa è possibile e, se non lo è, non la propongono.
L'invito a scorrere segue `canGo(1)`, che è già falso durante una transizione,
sull'ultima scena e da qualunque variante — una condizione sola copre tutti i
casi.

## Sostituire un video

Si tocca **solo** `assets/js/config.js`. Due forme supportate:

```js
// un file per transizione: il nome nudo viene risolto nella codifica adatta al
// browser, cioè assets/media/<variante>/t1.mp4
{ src: 't1.mp4', reverseSrc: 't1.rev.mp4' }

// un percorso completo viene invece usato tale e quale: è la strada per
// spostare i media su una CDN esterna senza toccare altro
{ src: 'https://cdn.esempio.it/toponecars/t1.mp4' }

// un unico video lungo, con tagli temporali
{ src: 'full.mp4', in: 0, out: 4.042 }
```

Senza `reverseSrc` lo scroll all'indietro ricade sullo scrubbing manuale del
`currentTime`: funziona, ma i file riavvolti sono più fluidi. Si generano con
`python tools/build-media.py`.

Ogni scena dichiara anche `menuItem`, cioè quale voce del menu rende corrente
(o `null` per nessuna): l'evidenziazione segue lo scroll senza che il menu si
sposti di un pixel.

Niente vieta di usare la stessa clip in due transizioni con i ruoli scambiati: la
settima scena è ottenuta così, riproducendo in avanti il riavvolgimento della
quinta transizione. Ogni transizione può anche avere la propria `seamFadeMs`,
perché le giunture del materiale non sono difettose allo stesso modo.

## Verifiche

```
node tools/autotest-run.js          # 24 scenari: meccanica, contenuti, admin, ripiego codifiche
node tools/i18n-check.mjs           # dizionario completo per inglese e ucraino
node tools/i18n-probe.mjs           # tre lingue: errori, blocchi, testi non tradotti, scatti
node tools/check-modulepreload.mjs  # l'elenco dei moduli precaricati in index.html e' completo
node tools/pixel-shoot.js           # scatti per il confronto
python tools/pixel-compare.py       # scostamenti per elemento
node tools/reduced-motion-check.mjs # prefers-reduced-motion
python tools/check-reference.py     # pose di riposo contro le foto di riferimento
node tools/shoot-scene.mjs 4        # scatto di una scena qualsiasi
```

I test girano sul Chrome installato **con le impostazioni normali**: nessun flag
che abiliti l'autoplay incondizionato, altrimenti non si vedrebbero proprio i
difetti che colpiscono l'utente.

Il server di sviluppo (`tools/serve.js`) applica le stesse intestazioni di
sicurezza di `vercel.json`, Content-Security-Policy compresa: una regola troppo
stretta si scopre nei test, non dopo la pubblicazione.

Se un browser dichiara una codifica e poi non la sa leggere (verificato: un
WebKit che dichiara AV1), la pagina passa da sola alla successiva
(`mediaDirDiRiserva` in `config.js`); lo stesso fanno i video dell'iPhone.

## Stato e limiti noti

Vedi `REPORT.md`: giunzioni video che non combaciano nel materiale sorgente,
mockup che non corrispondono al formato dichiarato, e il carattere del titolo
gigante che non è nessuno dei due ammessi.
