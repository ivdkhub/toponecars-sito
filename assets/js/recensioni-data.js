// RECENSIONI SEGNAPOSTO — NON SONO RECENSIONI REALI.
//
// Scritte per dare forma alla pagina "Recensioni" mentre il layout si
// definisce. Prima della pubblicazione vanno sostituite con recensioni vere
// dei clienti (per esempio copiate da Google con il consenso dell'officina):
// pubblicare recensioni inventate come se fossero autentiche e' una pratica
// commerciale scorretta, vietata dal Codice del consumo.
//
// `google: true` mostra in fondo alla card "Recensione verificata da Google".
// Va messo SOLO sulle recensioni copiate davvero dal profilo Google
// dell'officina: su quelle qui sotto, che sono inventate, resta false.
//
// L'ordine conta: le prime quattro vanno nella colonna a sinistra dell'auto,
// dall'alto in basso; le ultime tre in quella a destra. Le colonne sono pile:
// una recensione piu' lunga allunga la sua card e sposta in giu' le seguenti,
// senza sovrapporsi. Conviene comunque restare sulle due-tre righe, perche' la
// colonna di sinistra non deve arrivare al contatore delle scene.
export const RECENSIONI = [
  {
    autore: 'Marco B.', auto: 'Audi A4 Avant', stelle: 5, quando: '2 settimane fa', google: false,
    testo: 'Tagliando in giornata, preventivo chiaro e nessuna sorpresa al ritiro. Officina seria.',
  },
  {
    autore: 'Giulia R.', auto: 'Fiat 500X', stelle: 5, quando: '1 mese fa', google: false,
    testo: 'Spia motore accesa da mesi: diagnosi precisa e risolto in un pomeriggio.',
  },
  {
    autore: 'Davide C.', auto: 'Volkswagen Golf', stelle: 5, quando: '1 mese fa', google: false,
    testo: 'Cambio gomme in mezz’ora. Gentilissimi.',
  },
  {
    autore: 'Alessandro M.', auto: 'Porsche Cayenne', stelle: 5, quando: '3 mesi fa', google: false,
    testo: 'Frizione sostituita sulla Cayenne: lavoro impeccabile e tempi rispettati. Consigliatissimi.',
  },
  {
    autore: 'Francesca L.', auto: 'Toyota Yaris Hybrid', stelle: 5, quando: '1 settimana fa', google: false,
    testo: 'Auto di cortesia pronta, zero pensieri.',
  },
  {
    autore: 'Paolo G.', auto: 'Ford Focus SW', stelle: 5, quando: '2 mesi fa', google: false,
    testo: 'Pre-revisione e revisione nella stessa mattina. Mi hanno spiegato tutto senza fretta.',
  },
  {
    autore: 'Sara T.', auto: 'Mini Cooper', stelle: 4, quando: '5 mesi fa', google: false,
    testo: 'Ricarica clima e igienizzazione fatte bene. Un po’ di attesa al banco, ma ne vale la pena.',
  },
];
