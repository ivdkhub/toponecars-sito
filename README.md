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
  js/    config.js  video-player.js  scene-machine.js
         input-controller.js  blocks.js  menu.js  controls.js  main.js
  fonts/ Aldrich-Regular.woff2  AlbertSans-Variable.woff2
  media/ av1/ av1-sd/ hevc/ hevc-sd/ h264-sd/   t1..t5.mp4 + .rev.mp4
                                                darktheme.mp4 + .rev.mp4
         poster.webp  logo.webp  logo@2x.webp
tools/   generazione media, misura, autotest, confronto al pixel
tests/   autotest.html — la pagina di autotest, apribile anche a mano
video/ foto/ mockup ui sample/   sorgenti, fuori dal repository (vedi .gitignore)
vercel.json  intestazioni di cache per la pubblicazione
REPORT.md  esiti delle verifiche e difetti del materiale sorgente
```

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

Tre regole di traffico, tutte in `video-player.js`:

- **le clip riavvolte non si scaricano con la pagina.** Partono al primo scroll
  all'indietro davvero eseguibile. Chi percorre la sequenza in avanti e si ferma
  lì non ne paga un byte, e sono metà del peso totale;
- **il precaricamento riempie la cache, non i decodificatori.** Fuori da una
  finestra di poche scene si usa una `fetch`, non un `<video>`: undici video
  caricati insieme sono il modo più rapido per far scattare un telefono;
- **un solo poster.** Lo stato di riposo delle altre scene è un fotogramma video
  in pausa, quindi i loro poster venivano scaricati (5,6 MB di PNG) per non
  comparire mai.

Gli indirizzi portano una revisione (`?v=r2`, in `config.js`) perché `vercel.json`
li serve con `Cache-Control: immutable` per un anno. **Rigenerando i video va
incrementata `MEDIA_REV`**, altrimenti chi ha già visitato il sito continua a
vedere le clip vecchie.

## Il tema scuro

Sulla seconda scena la luce si spegne: la lampadina accanto alla barra del menu
riproduce `darktheme.mp4`, che parte dal fotogramma su cui quella scena si ferma
e arriva all'inquadratura notturna; premuta di nuovo riproduce la clip riavvolta
e riporta alla scena chiara. È la stessa meccanica delle transizioni fra scene —
stessa velocità, stesse dissolvenze sulle giunture, stesso rifiuto delle
richieste che arrivano mentre il video scorre — con una differenza sola: qui non
cambia la scena, cambia lo stato di riposo su cui la scena si ferma.

**A luce spenta non si cambia scena.** È un vincolo voluto: le sei transizioni
esistono soltanto illuminate, e percorrerle al buio vorrebbe dire riaccendere la
luce di nascosto. `canGo()` è quindi falso finché la luce è spenta, e ogni
richiesta — rotellina, frecce, swipe, pulsante — viene scartata come al bordo
della sequenza. Per la stessa ragione la lampadina resta visibile al buio, ed è
l'unico comando attivo: è l'unica via d'uscita.

Tutto si configura in `config.js`, sezione `theme`: quale scena lo prevede, quali
clip, quanto dura la dissolvenza della giuntura.

## I due comandi visibili

`assets/js/controls.js` contiene la lampadina e l'invito «Scroll to explore» in
basso al centro. Nessuno dei due decide alcunché: chiedono alla macchina a stati
se la cosa è possibile e, se non lo è, non la propongono. L'invito a scorrere
segue `canGo(1)`, che è già falso durante una transizione, sull'ultima scena e a
luce spenta — una condizione sola copre tutti e tre i casi.

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
node tools/autotest-run.js          # 14 scenari di meccanica
node tools/pixel-shoot.js           # scatti per il confronto
python tools/pixel-compare.py       # scostamenti per elemento
node tools/reduced-motion-check.mjs # prefers-reduced-motion
python tools/check-reference.py     # pose di riposo contro le foto di riferimento
node tools/shoot-scene.mjs 4        # scatto di una scena qualsiasi
```

I test girano sul Chrome installato **con le impostazioni normali**: nessun flag
che abiliti l'autoplay incondizionato, altrimenti non si vedrebbero proprio i
difetti che colpiscono l'utente.

## Stato e limiti noti

Vedi `REPORT.md`: giunzioni video che non combaciano nel materiale sorgente,
mockup che non corrispondono al formato dichiarato, e il carattere del titolo
gigante che non è nessuno dei due ammessi.
