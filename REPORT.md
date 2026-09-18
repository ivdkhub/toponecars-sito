# Rapporto di verifica — landing page a scene video

> **Aggiornamento: sette scene.** Alle tre transizioni iniziali ne sono state
> accodate tre: due da video nuovi (`4.mp4` e `5.mp4`) e una ottenuta
> riproducendo al contrario una clip che c'era già. Le sezioni sotto sono
> aggiornate; il §8 raccoglie quello che riguarda solo le scene aggiunte.

Tutto quello che segue è misurato, non stimato a occhio. Gli strumenti che
producono questi numeri stanno in `tools/` e sono rieseguibili.

```
node tools/serve.js              # server statico con supporto Range (obbligatorio)
node tools/autotest-run.js       # autotest della meccanica
node tools/pixel-shoot.js        # cattura gli scatti del confronto
python tools/pixel-compare.py    # confronto al pixel, elemento per elemento
```

---

## 1. Difetti del materiale sorgente

### 1.1 Le giunzioni fra i video non coincidono fotogramma per fotogramma

L'ultimo fotogramma di una clip **non** è uguale al primo della clip successiva:
l'auto è visibilmente scalata e traslata fra i due. Non è rumore di compressione.

| giunzione | differenza media (0–255) | pixel oltre soglia 8 | dissolvenza adottata |
|---|---|---|---|
| ultimo `t1.mp4` → primo `t2.mp4` | 3,545 | 11,37 % | 300 ms |
| ultimo `t2.mp4` → primo `t3.mp4` | 3,307 | 10,16 % | 300 ms |
| ultimo `t3.mp4` → primo `t4.mp4` | **6,212** | **27,00 %** | **480 ms** |
| ultimo `t4.mp4` → primo `t5.mp4` | 1,732 | 4,50 % | 180 ms |
| ultimo `t5.mp4` → primo `t5.rev.mp4` | **0,797** | **0,67 %** | 120 ms |

La giuntura fra la terza e la quarta clip è **la peggiore del materiale**: quasi
il doppio delle altre, con oltre un quarto dei pixel fuori soglia. Le giunture
non sono difettose allo stesso modo, quindi ogni transizione ha la sua
dissolvenza: `seamFadeMs` è un valore predefinito che la singola transizione può
sovrascrivere in `config.js`. Dare a tutte la stessa durata significherebbe o
lasciare scoperto lo scatto peggiore, o rallentare senza motivo la giuntura che
già combacia quasi.

Per confronto, la giunzione con i file riavvolti — che *deve* essere esatta —
misura un ordine di grandezza meno, cioè solo rumore di ricodifica:

| coppia | differenza media | pixel oltre soglia 8 |
|---|---|---|
| ultimo `t1.mp4` vs primo `t1.rev.mp4` | 0,823 | 0,51 % |
| ultimo `t2.mp4` vs primo `t2.rev.mp4` | 0,769 | 0,48 % |
| ultimo `t3.mp4` vs primo `t3.rev.mp4` | 1,151 | 0,72 % |
| ultimo `t4.mp4` vs primo `t4.rev.mp4` | 0,431 | 0,22 % |
| ultimo `t5.mp4` vs primo `t5.rev.mp4` | 0,797 | 0,67 % |

La sesta transizione non ha bisogno di coprire nulla: le due clip condividono
letteralmente lo stesso fotogramma, quindi i suoi 120 ms servono solo a smorzare
il cambio di elemento, non a nascondere uno scatto.

**Come è stato affrontato.** Il difetto è coperto da una dissolvenza incrociata
di **300 ms** (`seamFadeMs` in `assets/js/config.js`), applicata esattamente dove
cade la cucitura: all'inizio della transizione in avanti e alla fine di quella
all'indietro. Non è una scelta estetica, è una pezza a un difetto del materiale:
con una dissolvenza più corta lo scatto si vede. Sostituendo i video con clip che
combaciano davvero, il valore può essere riportato a 0 senza toccare il codice.

Lo stato di riposo di una scena, invece, è esatto per costruzione: non è
un'immagine separata ma l'elemento `<video>` della transizione precedente
lasciato in pausa sul proprio ultimo fotogramma.

### 1.2 I mockup non sono quello che il brief dichiara

| | dichiarato | reale |
|---|---|---|
| `mockup ui sample/1.png` | 2880×1620 (@2x di 1440×810) | **1903×1066**, scala 1:1 |
| `mockup ui sample/2.png` | idem | **1904×1061**, scala 1:1 |
| `mockup ui sample/3.png` | idem | **1903×1062**, scala 1:1 |

Il template matching del menu fra le tre immagini dà fattore di scala **1,000**:
sono tre ritagli della stessa pagina, non esportazioni @2x. Dall'inquadratura del
video di sfondo risulta che la finestra originale era alta **1080 px** e che gli
screenshot ne tagliano la parte bassa (14–19 px). Il confronto al pixel viene
quindi fatto **1:1 alle dimensioni native di ciascun mockup**, senza alcun
ricampionamento.

### 1.3 Il carattere del titolo gigante non è fra quelli ammessi

Nel blocco 2, il titolo di sfondo «911 Porsche» ha un `1` con la bandierina molto
più lunga e un avanzamento molto maggiore di quelli di Albert Sans: la distanza
fra i due `1` è 250 px contro i 134 px del carattere ammesso a parità di corpo, e
il rapporto fra larghezza della `P` e larghezza del `1` è 1,82 contro 2,00 anche
al peso massimo. Nessun peso di Albert Sans riproduce quelle proporzioni.

**Come è stato affrontato.** I parametri sono stati risolti **sulle sole lettere**
di «Porsche», che combaciano entro 1 px di scarto quadratico medio (peso 550,
corpo 322,17, tracking 10,75 in unità di design). Al gruppo «911» è stata poi data
una spaziatura propria (`--b2-giant-num-ls`) perché occupi lo stesso ingombro
orizzontale del mockup. **Resta una differenza nella forma delle cifre**, non
riducibile con Aldrich o Albert Sans. È l'unico elemento non riproducibile al
pixel, ed è un fondale decorativo tagliato da due bordi.

---

## 2. Deroghe decise con il committente

1. **Posizione del menu.** Nel mockup 1 la barra sta 56 px più in basso perché
   sopra c'è il logo; nei mockup 2 e 3 il logo non c'è e la barra è attaccata in
   alto. Poiché la specifica impone che il menu non si sposti di un pixel fra le
   scene, si è adottata **la posizione del mockup 1**, con logo e barra come
   elementi comuni fissi. Nelle righe del confronto la voce «barra menu» dei
   blocchi 2 e 3 è quindi marcata `i` (informativa) e non conta come scarto.
2. **Evidenziazione del menu.** Su richiesta, la voce corrente segue la scena:
   scena 2 «Servizi», 3 «Contenuti», 4 «Recensioni», 5 «Vieni a trovarci»,
   6 «Test Drive»; la prima e la settima non ne evidenziano nessuna. Nei mockup
   l'evidenziazione sta sempre su «Vieni a trovarci», quindi da qui in poi le
   righe del confronto che dipendono dalla pastiglia misurano due cose diverse
   per costruzione: restano nel rapporto marcate `i`, perche' toglierle
   nasconderebbe la divergenza invece di dichiararla.

   L'evidenziazione **non e' uno sfondo applicato alla voce**: darle uno sfondo
   vorrebbe dire darle anche un'imbottitura, e l'intera barra si riassesterebbe,
   violando il vincolo che il menu non si sposti. E' una pastiglia posizionata in
   modo assoluto dietro le voci, che scivola da una all'altra. La prova che il
   flusso non si e' mosso e' nel confronto al pixel: «Recensioni», «Vieni a
   trovarci» e «Test Drive» restano a scarto `+0,+0 +0,+0` esatto.
3. **Contatore dei blocchi.** «01 ———» è richiesto dalla specifica ma non compare
   in nessuno dei tre mockup. È stato creato in basso a sinistra con i colori
   della palette ed è escluso dal confronto al pixel, non avendo un riferimento.
4. **Audio.** Le tracce audio di `2.mp4` e `3.mp4` sono state rimosse in
   transcodifica. Effetto pratico: un video muto può partire in autoplay con le
   impostazioni normali di Chrome, quindi l'intro non dipende dal ripiego.

---

## 3. Confronto al pixel

Metodo: l'«inchiostro» viene estratto **con la stessa identica operazione** dalle
due immagini — differenza fra l'immagine con la UI e la stessa immagine senza,
oltre una soglia comune. Per il rendering le due immagini sono due caricamenti
della stessa pagina (uno con `?capture=bg`); per il mockup l'immagine senza UI è
il fotogramma video riallineato con precisione sub-pixel. Tolleranza: **2 px**.

| blocco | elementi entro 2 px |
|---|---|
| 1 — vista posteriore | **19 / 19** |
| 2 — vista anteriore | 1 / 4 entro 2 px, 3 / 4 entro 4 px (vedi sotto) |
| 3 — ruota in primo piano | **10 / 10** |

(Sono informative, e fuori dal conteggio, la voce «barra menu» dei blocchi 2 e 3
— deroga al §2.1 — e le righe che dipendono dalla pastiglia di evidenziazione —
deroga al §2.2.)

Scarti residui del blocco 2:

| elemento | posizione | estensione | causa |
|---|---|---|---|
| headline riga 1 | dx 0, dy 0 | dw −3 | coda della `g` al limite della regione di misura |
| headline riga 2 | dx 0, dy +1 | dw +1, dh −1 | — |
| headline riga 3 | dx +1, dy 0 | dh −4 | coda della `p` al limite della regione |
| titolo gigante | dx −5 | dw −83 | forma delle cifre, carattere non riproducibile (§1.3) |

Le tre righe dell'headline combaciano **in posizione entro 1 px**; lo scarto
residuo è solo sull'estensione dell'inchiostro misurato ai bordi della regione.

**Nota sull'inquadratura del video.** Confrontati alle dimensioni ritagliate dei
mockup, i fotogrammi del rendering risultano l'1,3 % più piccoli. Non è un errore:
il mockup è il ritaglio di una finestra alta 1080 px, e a 1080 px di altezza
`object-fit: cover` dà scala 1,00746, cioè esattamente quella misurata sul mockup
(1,00750). A proporzioni 16:9 reali l'inquadratura coincide.

---

## 4. Come sono stati ricavati i parametri tipografici

Nessun corpo e nessun tracking è stato indovinato. Per ogni stringa si misura
larghezza e altezza dell'inchiostro nel mockup, si misura **la stessa stringa** nel
rendering e si risolve:

```
H = b · f                      la spaziatura non tocca l'altezza
W = a · f + (n−1) · l          n = numero di caratteri
```

da cui `f' = f · H_mock / H_render` e `l'` di conseguenza. Poiché l'inchiostro è
estratto allo stesso modo dalle due immagini, l'allargamento dovuto
all'antialiasing compare in entrambe le misure e si semplifica nel rapporto. Il
ciclo è in `tools/fit-type.py`, i valori risultanti in `assets/css/type.css`.

**Il peso non viene adattato automaticamente, ed è una scelta.** La densità
d'inchiostro dovrebbe determinarlo indipendentemente da corpo e spaziatura, ma la
soglia che estrae l'inchiostro risente del contrasto: sui testi semitrasparenti
(il «GT3 RS» al 21 %, il bottone chiaro) restituisce un peso gonfiato. Peggio,
peso e letter-spacing governano entrambi la larghezza, quindi adattarli insieme
rende il sistema indeterminato: il ciclo oscillava senza fermarsi (il peso delle
card saliva 480 → 519 → 582 → 618). Tenendo il peso a 400 il tracking residuo
resta piccolo e credibile — sotto 0,05 em ovunque tranne le note in Aldrich, che
nel mockup sono dichiaratamente spaziate — e il sistema torna ben posto.

Le linee guida del blocco 3 sono state estratte dal mockup (maschera del chiaro
meno i blocchi di testo, poi trasformata di Hough) e sono **spezzate**, non
diritte: hanno un tratto obliquo e uno orizzontale. La freccia c'è solo dove c'è
nel mockup — la linea del cerchione finisce senza punta.

---

## 5. Autotest della meccanica

`node tools/autotest-run.js` — **15 scenari su 15 superati, 80 verifiche.**
Ogni scenario carica la pagina reale in un iframe 1440×810 e la comanda con eventi
sintetici, poi verifica lo stato effettivo del DOM.

| # | scenario | esito |
|---|---|---|
| 1 | catena in avanti 1→4, un passo per gesto | ok |
| 2 | catena all'indietro 4→1 con i file reverse (nessuno scrubbing) | ok |
| 3 | blocco sulla prima scena | ok |
| 4 | blocco sull'ultima scena | ok |
| 5 | gesto inerziale: 30 eventi a 16 ms = **un solo** passo | ok |
| 6 | scroll durante una transizione: ignorato, **non** accodato | ok |
| 7 | swipe, un passo per swipe nei due versi | ok |
| 8 | frecce e PageUp/PageDown | ok |
| 9 | ritorno indietro senza file reverse: scrubbing, non salto | ok |
| 10 | `play()` respinto: transizione trascinata via rAF, non un salto | ok |
| 11 | blocchi nascosti durante il video, visibili dopo | ok |
| 12 | menu, logo **e ogni singola voce**: geometria identica in tutte le rilevazioni | ok |
| 13 | contatore: numero e barra coerenti con la configurazione | ok |
| 14 | la voce di menu corrente segue la scena, e la pastiglia la copre | ok |
| 15 | la velocità di riproduzione della configurazione arriva a tutti i livelli | ok |

I test girano su Chrome installato **con le impostazioni normali**: nessun flag
tipo `--autoplay-policy=no-user-gesture-required`. Se un difetto colpisce
l'utente deve colpire anche il test.

Il ramo «`play()` respinto» viene esercitato con `?forceRejectPlay=1`, che
simula il rifiuto senza toccare il browser; il ramo «manca il file reverse» con
`?forceNoReverse=1`.

---

## 6. Media generati

`python tools/build-media.py` (idempotente). Sorgenti 1928×1072 a 24 fps.

| clip | fotogrammi | durata |
|---|---|---|
| `t1` | 97 | 4,042 s |
| `t2` | 97 | 4,042 s |
| `t3` | 73 | 3,042 s |
| `t4` | 97 | 4,042 s |
| `t5` | 97 | 4,042 s |

La sesta transizione non ha una clip propria: riproduce `t5.rev.mp4`, che esiste
già come riavvolgimento della quinta.

Ogni clip viene prodotta in cinque codifiche, senza audio e con **GOP 24** (un
fotogramma chiave al secondo). Il GOP resta corto perché lo scrubbing manuale del
`currentTime` — il ripiego quando `play()` viene respinto — salta avanti e
indietro, e con un GOP lungo risulterebbe a scatti; dodici fotogrammi, come nella
prima versione, erano però più del necessario e costavano circa il 10% del peso.

| cartella | codec | misura | peso (10 file) |
|---|---|---|---|
| `av1` | AV1 CRF 24 | 1928×1072 | 14,8 MB |
| `av1-sd` | AV1 CRF 28 | 1280×712 | 7,2 MB |
| `hevc` | HEVC CRF 24 | 1928×1072 | 12,1 MB |
| `hevc-sd` | HEVC CRF 26 | 1280×712 | 5,6 MB |
| `h264-sd` | H.264 CRF 23 | 1280×712 | 10,4 MB |

Il profilo originale — H.264 CRF 16, 10,8 Mbit/s — pesava 53,7 MB per le stesse
dieci clip. **Il guadagno non viene da una qualità inferiore ma da un codec
migliore**: misurato con SSIM sulla prima clip, AV1 CRF 24 dà 0,9916 contro
0,9911 dell'H.264 CRF 20, a meno di due quinti del peso; rispetto alla sorgente
CRF 16 il file passa da 5,45 MB a 1,24 MB. Le due verifiche che guardano davvero
i pixel lo confermano: il confronto al pixel dà **scarti geometrici identici,
elemento per elemento**, e il confronto con le foto di riferimento passa da 3,252
a 3,234 di residuo medio sulla scena 5 e da 4,260 a 4,277 sulla scena 6 — scarti
di un quarantesimo di livello, cioè rumore.

I poster sono un file solo, `poster.webp` (34 KB). Prima erano sei PNG da 5,6 MB
complessivi, scaricati all'apertura della pagina per non comparire mai: lo stato
di riposo di una scena è un fotogramma video in pausa, non un'immagine. I
fotogrammi di riposo continuano a essere estratti, ma finiscono in `tools/frames/`
perché a leggerli sono soltanto `align-mockups.py` e `check-reference.py`.

I font Aldrich e Albert Sans sono in locale in `assets/fonts/` (woff2, sottoinsieme
latino, 16 KB e 31 KB). La pagina non fa nessuna richiesta di rete verso terzi.

---

## 7. Strategia di caricamento dei video

Gli elementi `<video>` nascono con `preload="none"`: una clip viene caricata
quando serve, e il precaricamento delle altre avviene **una alla volta**, in
ordine di probabile utilizzo e solo dopo l'intro, cedendo il passo a una
transizione in corso. Sei clip che si mettono a scaricare insieme occuperebbero
tutte le connessioni verso l'origine, e la prima — quella che l'utente sta
guardando — arriverebbe per ultima.

A questa regola se ne sono aggiunte tre, tutte misurate sul traffico reale con
Chrome (`page.on('response')`, escludendo le risposte servite dalla cache).

1. **Le clip riavvolte non partono con la pagina.** Sono metà del peso totale e
   servono a una cosa sola: tornare indietro. Si cominciano a scaricare al primo
   scroll all'indietro eseguibile.
2. **Il precaricamento riempie la cache, non i decodificatori.** Fuori da una
   finestra di poche scene si usa una `fetch` il cui corpo viene letto e buttato:
   quando la clip servirà davvero, `load()` la troverà su disco. Nel percorso
   completo in avanti si contano 8 richieste di rete e 5 risposte servite dalla
   cache, cioè **nessun file scaricato due volte**.
3. **I decodificatori lontani vengono liberati** (`forget()`): alla fine della
   sequenza restano due `<video>` caldi su dodici. Non è un risparmio di rete —
   i file restano in cache — ma di memoria e di decodificatori, che su mobile
   sono pochi e contesi. L'elemento visibile non viene mai toccato.

Traffico misurato, percorso completo in avanti su schermo grande: **8,55 MB**,
contro i 59,3 MB della prima versione (53,7 MB di clip più 5,6 MB di poster).
Tornando anche indietro si arriva a 15,0 MB. Le durate delle transizioni sono
identiche nelle tre codifiche (2,72 s per una clip di 4,042 s riprodotta a 1,5×,
contro 2,69 s teorici): AV1 non costa nulla in fluidità sul materiale di questo
progetto.

I media sono serviti con `Cache-Control: public, max-age=31536000, immutable`
(`vercel.json`), quindi una seconda visita non li richiede affatto. Per questo
ogni indirizzo porta una revisione — `?v=r2`, da `MEDIA_REV` in `config.js` — che
**va incrementata ogni volta che si rigenerano i video**, altrimenti chi ha già
visitato il sito continuerebbe a vedere le clip vecchie per un anno.

Attenzione a un dettaglio: `load()` riporta `playbackRate` al valore predefinito,
quindi la velocità va fissata anche su `defaultPlaybackRate`. L'autotest n. 14
copre esattamente questo caso, e lo ha colto.

---

## 8. Le scene accodate

`4.mp4` e `5.mp4` diventano le transizioni 4 e 5. L'ordine è verificato sui
fotogrammi, non assunto: l'ultimo di `3.mp4` si aggancia al primo di `4.mp4`, e
l'ultimo di `4.mp4` al primo di `5.mp4`; le combinazioni alternative danno
differenze del 99 %, cioè immagini senza alcun rapporto.

### La settima scena non ha un video proprio

La settima scena chiede che le parti delle ruote si ricompongano e
l'inquadratura torni dall'alto. È **esattamente la quinta transizione percorsa al
contrario**, e la clip riavvolta era già stata prodotta per lo scroll
all'indietro: la sesta transizione riproduce `t5.rev.mp4` in avanti e `t5.mp4`
all'indietro. Nessun video nuovo, nessuna ricodifica.

Conseguenza da conoscere: il movimento è l'inverso esatto della quinta
transizione, non un'altra ripresa. Se serve una camera diversa — per esempio un
avvicinamento mentre le parti si ricompongono — occorre girare la clip.

| | |
|---|---|
| ingresso (riposo scena 6 → primo fotogramma) | 0,797 / 255 — le due clip condividono il fotogramma |
| uscita (posa della scena 7 contro quella della scena 5) | 1,440 / 255, 4,0 % dei pixel |

La scena 7 mostra quindi la stessa posa della scena 5, con uno scarto dovuto solo
al fatto che l'una arriva dal primo fotogramma di `t5` e l'altra dall'ultimo di
`t4`: 1,7 su 255, la stessa incoerenza che il materiale ha già fra quelle due
clip. A occhio sono identiche.

**Le due immagini fornite non sono mockup: sono fotogrammi di riferimento.** Non
contengono né menu, né testi, né blocchi — sono i render delle due nuove pose a
risoluzione maggiore. Non c'è quindi nessun blocco di design da copiare per le
scene 5 e 6, e non ne è stato inventato uno: la regola «non aggiungere contenuti
che non sono nei mockup» vale anche qui. Le due scene mostrano il fotogramma con
gli elementi comuni sopra (logo, menu, contatore) e nient'altro.

Quello che si può verificare, e che è stato verificato, è che il fotogramma di
riposo riproduca davvero la foto di riferimento (`python tools/check-reference.py`):

| scena | riferimento | residuo medio | pixel oltre soglia 8 |
|---|---|---|---|
| 5 — vista dall'alto | `retro-highview.png` | **3,25** / 255 | 6,8 % |
| 6 — ruote scomposte | `retro-ruotescomposte.png` | **4,26** / 255 | 13,3 % |
| 7 — ruote ricomposte | stessa posa della scena 5 | **1,44** / 255 | 4,0 % |

Lo stesso ordine di grandezza del rumore di ricodifica: le pose coincidono. Le
foto sono 2752×1536 contro i 1928×1072 del video, con proporzioni leggermente
diverse (1,7917 contro 1,7985), quindi un minimo di scarto ai bordi è atteso.

**Una nota di leggibilità, non un difetto.** Le tre nuove scene hanno lo sfondo
giallo pieno, mentre i tre mockup originali erano su viola. La barra del menu e i
suoi testi, che hanno colori fissi presi dal mockup 1, su quel giallo perdono
molto contrasto: «Test Drive» diventa quasi illeggibile. Non l'ho corretto di mia
iniziativa perché gli elementi comuni non devono cambiare fra le scene, ed è una
scelta di design, non un errore di implementazione. Se vuoi che il menu si adatti
allo sfondo, si può fare senza spostarlo di un pixel.

---

## 9. Le varianti della scena 2

Due stati di riposo alternativi della seconda scena, aggiunti su richiesta:
le luci spente (`darktheme.mp4`) e la vernice gialla (`vernice-giallo.mp4`).
Entrambe partono dal fotogramma su cui la scena si ferma, e la giuntura è stata
misurata con lo stesso metodo delle altre:

| giuntura | scarto medio | oltre soglia |
|---|---|---|
| riposo scena 2 → `darktheme` | 3,45 | 11,1% |
| riposo scena 2 → `vernice-giallo` | 3,57 | 11,5% |
| *(riferimento)* `t1` → `t2` | 3,30 | 10,6% |

Sono quindi difettose quanto le giunture ordinarie del progetto, e si coprono con
la stessa dissolvenza da 300 ms.

I colori dei pallini nel menu della vernice non sono scelti a occhio: sono la
mediana dei pixel che la clip ridipinge davvero — presi mascherando i pixel che
cambiano fra il primo e l'ultimo fotogramma — e valgono `#950f19` per il rosso e
`#eab709` per il giallo.

Due vincoli, entrambi voluti dal committente e verificati dagli autotest 17, 19 e
20: da una variante non si cambia scena, e due varianti non possono essere attive
insieme. Il secondo non è una comodità: la clip del buio riprende un'auto rossa e
quella della vernice un'auto illuminata, quindi sovrapporle mostrerebbe un salto.

Un difetto trovato durante la verifica e corretto: il comando della vernice era
marcato `data-paint`, lo stesso nome con cui la macchina a stati espone lo stato
della variante su `<html>`. `querySelector('[data-paint]')` pescava quindi
l'elemento radice e il comando restava invisibile. Ora il comando si chiama
`data-paint-control`.

Un effetto collaterale sul confronto al pixel, atteso e non preoccupante: la
«barra menu» risulta ora larga 1572 px invece di 1534 e spostata a sinistra di
38. Non si è mossa di un pixel — lo confermano le voci al suo interno, tutte a
scarto zero — ma il rilevatore misura il rettangolo dell'inchiostro in quella
fascia, e i due comandi che ora stanno alla sua sinistra ne fanno parte. Nei
mockup non esistono, quindi lo strumento li segnala come differenza: è
esattamente il suo mestiere.

---

## 10. Modifiche chieste dopo la consegna

Quattro interventi decisi dal committente a valle delle verifiche, tutti
documentati qui perché **si discostano dai mockup** e il confronto al pixel li
registra come scostamenti:

1. **Le schede della scena 2 non hanno più fondo.** Nel mockup sono gialle piene
   e sul video chiaro funzionavano; con il tema scuro diventavano tre macchie
   fluorescenti su una scena notturna. Restano contorno e testo, che si leggono
   su entrambi i temi perché non dipendono da nessuno dei due.
2. **La barra del menu ha angoli quasi vivi** (raggio 4 invece di 22,8), come da
   `header-rivisitato.png`. La pastiglia dell'evidenziazione resta arrotondata,
   perché è quella del mockup.
3. **I colori del menu sono più contrastati.** Erano campionati da un mockup che
   ha sempre un fondo scuro alle spalle della barra; nella pagina vera il video
   passa per inquadrature chiare — il giallo della scena 2, il bianco della
   quarta — e lì il viola tenue si perdeva. Il fondo della barra passa da 0,42 a
   0,58 di opacità e il testo da `rgb(169,128,192)` a `rgb(214,198,232)`.
4. **Il logo viene da un originale ad altissima risoluzione** (4768×3352), servito
   in due misure con `srcset` perché il riquadro non cambia mai ma su un monitor
   largo può valere il doppio dei pixel. Geometria e posizione sono quelle di
   prima: la tela conserva il rapporto 467:150 del file precedente e il contenuto
   ne occupa il 97%. Il confronto al pixel misura però il logo 13 px più basso
   del mockup: il disegno nuovo ha tratti più sottili e precisi, e la parte alta
   del profilo dell'auto resta sotto la soglia del rilevatore. A schermo si vede
   meglio di prima, non peggio — verificato sullo scatto a 2×.

---

## 11. Cosa non è stato verificato

- Browser diversi da Chrome 153 su Windows.
- Dispositivi touch reali: lo swipe è verificato con eventi sintetici.
- **Una prova in una scheda in secondo piano non è una prova.** Aprendo la pagina
  in una scheda non attiva, Chrome congela il caricamento dei media: tutte le
  clip restano a `readyState 0` e l'intro non parte mai. Non è un difetto della
  pagina — sembra esserlo. Le verifiche valide sono quelle di
  `tools/autotest-run.js` e `tools/pixel-shoot.js`, che lavorano su una finestra
  in primo piano.
Verificato invece con uno strumento dedicato (`node tools/reduced-motion-check.mjs`):
con `prefers-reduced-motion: reduce` resta **solo** la dissolvenza — `transform` e
`filter` sono `none`, l'unica proprietà in transizione è `opacity` e il ritardo di
scaglionamento è azzerato.
