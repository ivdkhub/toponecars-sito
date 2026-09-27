/**
 * Dizionario del sito: per ogni frase italiana, [inglese, ucraino].
 *
 * - La chiave e' la frase italiana esatta, spazi compresi dentro la frase
 *   (quelli ai bordi e gli a capo dell'HTML non contano).
 * - {nome} e' un valore che lo script inserisce: va lasciato identico nella
 *   traduzione, anche se cambia posizione.
 * - Le frasi con un numero che decide la forma (tn() in i18n.js) hanno per
 *   traduzione un oggetto con le forme: one / other in inglese; one / few /
 *   many in ucraino (1, 21, 31… / 2-4, 22-24… / 5-20, 25-30…).
 * - \n separa le righe dei paragrafi che nell'HTML sono spezzati con <br>
 *   (data-i18n-righe): le righe tradotte possono essere di numero diverso.
 * - Nomi propri, indirizzi, targhe e marchi non si traducono.
 *
 * `node tools/i18n-check.mjs` elenca le frasi usate nel sito che qui mancano.
 */
export const TESTI = {

  /* ------------------------------------------------ pagina e barra del menu */

  'Top One Cars — Officina autoriparazioni, Vizzolo Predabissi': [
    'Top One Cars — Car repair workshop, Vizzolo Predabissi',
    'Top One Cars — автомайстерня у Vizzolo Predabissi'],
  'Top One Cars, officina autoriparazioni a Vizzolo Predabissi (MI), SS 9 Via Emilia 312: tagliandi, diagnosi, freni, pneumatici, climatizzazione, revisioni e noleggio auto. Prenota il servizio online.': [
    'Top One Cars, car repair workshop in Vizzolo Predabissi (MI), SS 9 Via Emilia 312: servicing, diagnostics, brakes, tyres, air conditioning, inspections and car rental. Book your service online.',
    'Top One Cars — автомайстерня у Vizzolo Predabissi (MI), SS 9 Via Emilia 312: ТО, діагностика, гальма, шини, кондиціонери, техогляд і оренда авто. Бронюйте послугу онлайн.'],
  "Cambia colore dell'auto": ['Change the car colour', 'Змінити колір авто'],
  'Spegni le luci': ['Turn off the lights', 'Вимкнути світло'],
  'Accendi le luci': ['Turn on the lights', 'Увімкнути світло'],
  'Rosso Carmine': ['Carmine Red', 'Кармінно-червоний'],
  'Giallo Top One Cars': ['Top One Cars Yellow', 'Жовтий Top One Cars'],
  'Principale': ['Main', 'Головне меню'],
  'Lingua del sito': ['Site language', 'Мова сайту'],
  'Chi siamo': ['About us', 'Про нас'],
  'Servizi': ['Services', 'Послуги'],
  'Contenuti': ['Content', 'Відео'],
  'Recensioni': ['Reviews', 'Відгуки'],
  'Vieni a trovarci': ['Visit us', 'Завітайте до нас'],
  'Noleggio': ['Rental', 'Оренда'],
  'Prenotazioni': ['Bookings', 'Бронювання'],
  'Parco auto-noleggio': ['Rental fleet', 'Автопарк для оренди'],
  'Orari di apertura': ['Opening hours', 'Години роботи'],
  'Genera preventivo': ['Create quote', 'Створити кошторис'],
  'Vai alla scena successiva': ['Go to the next scene', 'Перейти до наступної сцени'],
  'Scorri per esplorare': ['Scroll to explore', 'Гортайте, щоб дослідити'],
  'Errore': ['Error', 'Помилка'],

  /* ---------------------------------------------------- scena 2: l'officina */

  'Off. auto-riparazioni.': ['Car repair workshop.', 'Автомайстерня.'],
  'Clienti soddisfatti': ['Satisfied customers', 'Задоволених клієнтів'],
  'pezzi sostituiti': ['parts replaced', 'замінених деталей'],
  'media recensioni Google': ['average Google rating', 'середня оцінка в Google'],

  /* ---------------------------------------------------- area amministratore */

  'Top One Cars · Area riservata': ['Top One Cars · Private area', 'Top One Cars · Закрита зона'],
  'Accesso amministratore': ['Administrator login', 'Вхід для адміністратора'],
  'Area amministratore': ['Admin area', 'Адмін-панель'],
  'Utente': ['Username', 'Користувач'],
  'Password': ['Password', 'Пароль'],
  'Mostra la password': ['Show password', 'Показати пароль'],
  'Nascondi la password': ['Hide password', 'Сховати пароль'],
  'Accedi': ['Sign in', 'Увійти'],
  'Demo': ['Demo', 'Демо'],
  'utente': ['username', 'користувач'],
  '· password': ['· password', '· пароль'],
  'Compila': ['Fill in', 'Заповнити'],
  'Scegli una sezione dal menu in alto. Per uscire, riaccendi la luce.': [
    'Choose a section from the menu above. To leave, turn the light back on.',
    'Оберіть розділ у меню вгорі. Щоб вийти, знову увімкніть світло.'],
  'Chiudi la pagina': ['Close page', 'Закрити сторінку'],
  'Inserisci utente e password.': ['Enter username and password.', 'Введіть ім’я користувача та пароль.'],
  'Credenziali non corrette. Per la demo usa quelle indicate qui sotto.': [
    'Incorrect credentials. For the demo, use the ones shown below.',
    'Невірні облікові дані. Для демо скористайтеся наведеними нижче.'],
  'Accesso non disponibile: il server di autenticazione non è ancora collegato.': [
    'Login unavailable: the authentication server is not connected yet.',
    'Вхід недоступний: сервер автентифікації ще не підключено.'],
  'Utente o password non corretti.': ['Incorrect username or password.', 'Невірне ім’я користувача або пароль.'],
  'Il server non risponde. Riprova tra poco.': ['The server is not responding. Try again shortly.', 'Сервер не відповідає. Спробуйте трохи згодом.'],
  'Accesso effettuato come {nome}.': ['Signed in as {nome}.', 'Ви увійшли як {nome}.'],

  // Riepilogo dopo l'accesso
  'Da confermare': ['To confirm', 'Очікує'],
  'prenotazioni': ['bookings', 'бронювання'],
  'Oggi': ['Today', 'Сьогодні'],
  'appuntamenti': ['appointments', 'записи'],
  'Auto': ['Car', 'Авто'],
  'disponibili su {n}': ['available out of {n}', 'доступні з {n}'],
  'prenotabili su {n}': ['bookable out of {n}', 'для бронювання з {n}'],

  // Pagine: comuni
  'Confermi?': ['Confirm?', 'Підтвердити?'],
  'Salva': ['Save', 'Зберегти'],
  'Modifica': ['Edit', 'Змінити'],
  'Elimina': ['Delete', 'Видалити'],
  'Aggiungi': ['Add', 'Додати'],
  'Togli': ['Remove', 'Прибрати'],
  'Chiuso': ['Closed', 'Зачинено'],
  'Stato': ['Status', 'Статус'],
  'Spazio del browser esaurito: l’ultima modifica non è stata salvata. Togli qualche foto e riprova.': [
    'Browser storage is full: the last change was not saved. Remove some photos and try again.',
    'Сховище браузера заповнене: останню зміну не збережено. Видаліть кілька фото й спробуйте ще раз.'],
  '{n} min': ['{n} min', '{n} хв'],
  '{n} h': ['{n} h', '{n} год'],
  '{n} minuti': ['{n} minutes', '{n} хв'],

  // Pagina Servizi
  '{attivi} prenotabili su {tutti}, in {categorie} categorie. Le modifiche si salvano da sole e si vedono subito nel sito.': [
    '{attivi} bookable out of {tutti}, in {categorie} categories. Changes are saved automatically and appear on the site straight away.',
    'Доступно для бронювання: {attivi} з {tutti}, категорій: {categorie}. Зміни зберігаються автоматично й одразу з’являються на сайті.'],
  'Nuova categoria': ['New category', 'Нова категорія'],
  'Nome della nuova categoria': ['Name of the new category', 'Назва нової категорії'],
  'Aggiungi la categoria': ['Add the category', 'Додати категорію'],
  'Nessuna categoria: aggiungine una.': ['No categories: add one.', 'Категорій немає: додайте першу.'],
  'Nome del servizio': ['Service name', 'Назва послуги'],
  'Dettaglio (facoltativo)': ['Detail (optional)', 'Деталі (необов’язково)'],
  'Dettaglio del servizio': ['Service detail', 'Деталі послуги'],
  'Da': ['From', 'Від'],
  'Prezzo di {nome}': ['Price of {nome}', 'Ціна: {nome}'],
  'Durata di {nome}': ['Duration of {nome}', 'Тривалість: {nome}'],
  '{nome}: prenotabile dal sito': ['{nome}: bookable on the site', '{nome}: можна забронювати на сайті'],
  'Prenotabile': ['Bookable', 'Можна бронювати'],
  'Non prenotabile': ['Not bookable', 'Не можна бронювати'],
  'Servizio senza nome': ['Unnamed service', 'Послуга без назви'],
  'Elimina {nome}': ['Delete {nome}', 'Видалити: {nome}'],
  'Serve almeno il nome del servizio.': ['At least the service name is required.', 'Потрібна принаймні назва послуги.'],
  'Aggiungi un servizio a «{categoria}»': ['Add a service to “{categoria}”', 'Додати послугу до «{categoria}»'],
  'Nome del nuovo servizio': ['Name of the new service', 'Назва нової послуги'],
  'Dettaglio del nuovo servizio': ['Detail of the new service', 'Деталі нової послуги'],
  'Prezzo del nuovo servizio': ['Price of the new service', 'Ціна нової послуги'],
  'Durata del nuovo servizio': ['Duration of the new service', 'Тривалість нової послуги'],
  'Elimina categoria': ['Delete category', 'Видалити категорію'],
  'Nessun servizio in questa categoria.': ['No services in this category.', 'У цій категорії немає послуг.'],

  // Pagina Prenotazioni
  'Cerca cliente, targa, telefono…': ['Search customer, plate, phone…', 'Клієнт, номер, телефон…'],
  'Cerca nelle prenotazioni': ['Search bookings', 'Пошук у бронюваннях'],
  'Scarica tutte le prenotazioni, senza filtri, in un file CSV': [
    'Download all bookings, unfiltered, as a CSV file',
    'Завантажити всі бронювання, без фільтрів, у файлі CSV'],
  'Esporta CSV': ['Export CSV', 'Експорт CSV'],
  '{daConfermare} da confermare · {confermate} confermate · {tutte} in tutto · eliminate in automatico {giorni} giorni dopo l’appuntamento': [
    '{daConfermare} to confirm · {confermate} confirmed · {tutte} in total · deleted automatically {giorni} days after the appointment',
    'Очікують: {daConfermare} · підтверджено: {confermate} · усього: {tutte} · видаляються через {giorni} днів після запису'],
  'Tutte': ['All', 'Усі'],
  'Confermata': ['Confirmed', 'Підтверджено'],
  'Completata': ['Completed', 'Виконано'],
  'Annullata': ['Cancelled', 'Скасовано'],
  'Conferma': ['Confirm', 'Підтвердити'],
  'Annulla': ['Cancel', 'Скасувати'],
  'Dettagli di {nome}': ['Details for {nome}', 'Деталі: {nome}'],
  'Appuntamento': ['Appointment', 'Запис'],
  'Cliente': ['Customer', 'Клієнт'],
  'Contatti': ['Contacts', 'Контакти'],
  'Note del cliente': ['Customer notes', 'Примітки клієнта'],
  'Ricevuta il': ['Received on', 'Отримано'],
  'Nota interna (non la vede il cliente)': ['Internal note (not visible to the customer)', 'Внутрішня примітка (клієнт її не бачить)'],
  'Elimina prenotazione': ['Delete booking', 'Видалити бронювання'],
  'Nessuna prenotazione corrisponde alla ricerca.': ['No bookings match your search.', 'Жодне бронювання не відповідає пошуку.'],
  'Nessuna prenotazione in questo stato.': ['No bookings with this status.', 'Немає бронювань із таким статусом.'],
  // Intestazioni del file CSV
  'Data': ['Date', 'Дата'],
  'Ora': ['Time', 'Час'],
  'Nota interna': ['Internal note', 'Внутрішня примітка'],

  // Pagina Parco auto-noleggio
  '{auto} auto · {disponibili} disponibili · {noleggiate} noleggiate · {manutenzione} in manutenzione': [
    '{auto} cars · {disponibili} available · {noleggiate} rented · {manutenzione} in maintenance',
    'Авто: {auto} · доступні: {disponibili} · в оренді: {noleggiate} · на сервісі: {manutenzione}'],
  '+ Nuova auto': ['+ New car', '+ Нове авто'],
  'Modifica {nome}': ['Edit {nome}', 'Змінити: {nome}'],
  'Nessuna foto': ['No photo', 'Немає фото'],
  'Nessuna auto nel parco: aggiungine una.': ['No cars in the fleet: add one.', 'В автопарку немає авто: додайте перше.'],
  'Anteprima della foto': ['Photo preview', 'Попередній перегляд фото'],
  'Carica una foto dell’auto': ['Upload a photo of the car', 'Завантажити фото авто'],
  'Foto non leggibile.': ['The photo could not be read.', 'Не вдалося прочитати фото.'],
  'Il file scelto non è un’immagine.': ['The selected file is not an image.', 'Обраний файл не є зображенням.'],
  'La foto supera {n} MB.': ['The photo is larger than {n} MB.', 'Фото перевищує {n} МБ.'],
  'Servono almeno modello e targa.': ['At least model and number plate are required.', 'Потрібні принаймні модель і номерний знак.'],
  'Indica il prezzo al giorno.': ['Enter the daily price.', 'Вкажіть ціну за добу.'],
  'C’è già un’auto con targa {targa}.': ['There is already a car with plate {targa}.', 'Авто з номером {targa} вже є.'],
  'Aggiungi un’auto': ['Add a car', 'Додати авто'],
  'Cambia foto': ['Change photo', 'Змінити фото'],
  'Carica foto': ['Upload photo', 'Завантажити фото'],
  'Togli foto': ['Remove photo', 'Прибрати фото'],
  'Modello': ['Model', 'Модель'],
  'Es. Peugeot 208': ['E.g. Peugeot 208', 'Напр. Peugeot 208'],
  'Targa': ['Number plate', 'Номерний знак'],
  'Categoria': ['Category', 'Категорія'],
  'Anno': ['Year', 'Рік'],
  'Alimentazione': ['Fuel', 'Пальне'],
  'Cambio': ['Gearbox', 'Коробка передач'],
  'Posti': ['Seats', 'Місця'],
  '€ / giorno': ['€ / day', '€ / добу'],
  'Cauzione €': ['Deposit €', 'Застава €'],
  'Km': ['Km', 'Км'],
  'Es. seggiolino disponibile': ['E.g. child seat available', 'Напр. є дитяче крісло'],
  'Salva modifiche': ['Save changes', 'Зберегти зміни'],

  // Pagina Orari di apertura
  'Aperto {giorni} giorni su 7 · appuntamenti ogni {passo} minuti. Il calendario delle prenotazioni sul sito segue questi orari.': [
    'Open {giorni} days out of 7 · appointments every {passo} minutes. The booking calendar on the site follows these hours.',
    'Працюємо {giorni} дн. із 7 · записи кожні {passo} хв. Календар бронювань на сайті відповідає цьому графіку.'],
  '{giorno} aperto': ['{giorno} open', '{giorno}: відчинено'],
  'Orario': ['Hours', 'Години'],
  'Mattina': ['Morning', 'Ранок'],
  'Pomeriggio': ['Afternoon', 'Після обіду'],
  '{giorno}, apertura': ['{giorno}, opening', '{giorno}, відкриття'],
  '{giorno}, chiusura mattina': ['{giorno}, morning closing', '{giorno}, закриття на перерву'],
  '{giorno}, riapertura': ['{giorno}, reopening', '{giorno}, відкриття після перерви'],
  '{giorno}, chiusura': ['{giorno}, closing', '{giorno}, закриття'],
  '+ Pausa': ['+ Break', '+ Перерва'],
  'Continuato': ['No break', 'Без перерви'],
  'Chiusure straordinarie': ['Special closures', 'Позапланові вихідні'],
  'Dal {da} al {a}': ['From {da} to {a}', 'З {da} по {a}'],
  'Nessuna chiusura in programma.': ['No closures planned.', 'Позапланових вихідних немає.'],
  'Indica almeno il primo giorno.': ['Enter at least the first day.', 'Вкажіть принаймні перший день.'],
  'Dal': ['From', 'З'],
  'Al': ['To', 'По'],
  'Motivo': ['Reason', 'Причина'],
  'Es. Ferie estive': ['E.g. Summer holidays', 'Напр. літня відпустка'],
  'Un appuntamento ogni': ['One appointment every', 'Один запис кожні'],
  'Intervallo fra gli appuntamenti': ['Interval between appointments', 'Інтервал між записами'],
  'Come lo vede il cliente': ['What the customer sees', 'Як це бачить клієнт'],
  'Orari prenotabili nei prossimi 7 giorni': ['Bookable times in the next 7 days', 'Вільний час на найближчі 7 днів'],

  // Pagina Genera preventivo e foglio del preventivo
  'Preventivo n. {numero} · i prezzi dei servizi arrivano dalla pagina Servizi': [
    'Quote no. {numero} · service prices come from the Services page',
    'Кошторис № {numero} · ціни послуг беруться зі сторінки «Послуги»'],
  'Anteprima del preventivo': ['Quote preview', 'Попередній перегляд кошторису'],
  'Prezzo unitario riga {n}': ['Unit price, line {n}', 'Ціна за одиницю, рядок {n}'],
  'Servizio o ricambio': ['Service or part', 'Послуга або запчастина'],
  'Descrizione riga {n}': ['Description, line {n}', 'Опис, рядок {n}'],
  'Quantità riga {n}': ['Quantity, line {n}', 'Кількість, рядок {n}'],
  'Togli la riga {n}': ['Remove line {n}', 'Прибрати рядок {n}'],
  'Aggiungi almeno una riga con prezzo, o la manodopera.': ['Add at least one line with a price, or the labour.', 'Додайте принаймні один рядок із ціною або роботу.'],
  'Il browser ha bloccato la finestra del preventivo: consenti i popup per questo sito.': [
    'The browser blocked the quote window: allow pop-ups for this site.',
    'Браузер заблокував вікно кошторису: дозвольте спливаючі вікна для цього сайту.'],
  'Nome e cognome': ['Full name', 'Ім’я та прізвище'],
  'Telefono o email': ['Phone or email', 'Телефон або ел. пошта'],
  'Auto e targa': ['Car and number plate', 'Авто й номерний знак'],
  'Es. Audi A4 · AB123CD': ['E.g. Audi A4 · AB123CD', 'Напр. Audi A4 · AB123CD'],
  'Servizi e ricambi': ['Services and parts', 'Послуги та запчастини'],
  'Descrizione': ['Description', 'Опис'],
  'Q.tà': ['Qty', 'К-сть'],
  'Prezzo': ['Price', 'Ціна'],
  'Importo': ['Amount', 'Сума'],
  '+ Aggiungi riga': ['+ Add line', '+ Додати рядок'],
  'Ore di manodopera': ['Labour hours', 'Години роботи'],
  'Tariffa oraria (€)': ['Hourly rate (€)', 'Погодинна ставка (€)'],
  'Sconto (%)': ['Discount (%)', 'Знижка (%)'],
  'Note per il cliente': ['Notes for the customer', 'Примітки для клієнта'],
  'Es. tempi di consegna, ricambi da ordinare': ['E.g. delivery times, parts to order', 'Напр. терміни, запчастини на замовлення'],
  'Anteprima PDF': ['PDF preview', 'Попередній перегляд PDF'],
  'Totale': ['Total', 'Разом'],
  'Stampa / PDF': ['Print / PDF', 'Друк / PDF'],
  'Preventivo {numero} — Top One Cars': ['Quote {numero} — Top One Cars', 'Кошторис {numero} — Top One Cars'],
  'Officina autoriparazioni': ['Car repair workshop', 'Автомайстерня'],
  'Preventivo': ['Quote', 'Кошторис'],
  'Preventivo valido 30 giorni dalla data di emissione.': ['Quote valid for 30 days from the date of issue.', 'Кошторис дійсний 30 днів від дати видачі.'],
  'n. {numero}': ['no. {numero}', '№ {numero}'],
  'Nome del cliente': ['Customer name', 'Ім’я клієнта'],
  'Modello e targa': ['Model and number plate', 'Модель і номерний знак'],
  'Veicolo': ['Vehicle', 'Автомобіль'],
  'Manodopera ({ore} h × {tariffa})': ['Labour ({ore} h × {tariffa})', 'Робота ({ore} год × {tariffa})'],
  'Le voci del preventivo compariranno qui': ['The quote items will appear here', 'Тут з’являться позиції кошторису'],
  'Sconto {n}%': ['Discount {n}%', 'Знижка {n}%'],
  'Imponibile': ['Taxable amount', 'Сума без ПДВ'],
  'IVA {n}%': ['VAT {n}%', 'ПДВ {n}%'],

  /* --------------------------------------------- scena 3: servizi e prenotazione */

  'Scopri come progettiamo la nuova generazione di performance': [
    'Discover how we engineer the new generation of performance',
    'Дізнайтеся, як ми створюємо нове покоління швидкості'],
  'Scopri come progettiamo': ['Discover how we engineer', 'Дізнайтеся, як ми'],
  'la nuova generazione': ['the new generation', 'створюємо нове'],
  'di performance.': ['of performance.', 'покоління швидкості.'],
  'Prenota un servizio!': ['Book a service!', 'Забронюйте послугу!'],
  'Top One Cars · Officina': ['Top One Cars · Workshop', 'Top One Cars · Майстерня'],
  'Servizi prenotabili': ['Bookable services', 'Послуги для бронювання'],
  "Chiudi l'elenco dei servizi": ['Close the list of services', 'Закрити перелік послуг'],
  'Categorie di servizi': ['Service categories', 'Категорії послуг'],
  '{totale} servizi in {aree} aree · selezionane uno o più per prenotare': [
    '{totale} services in {aree} areas · select one or more to book',
    'Послуг: {totale} у {aree} розділах · оберіть одну чи кілька, щоб забронювати'],
  'Al momento non ci sono servizi prenotabili online. Chiamaci per un appuntamento.': [
    'There are currently no services bookable online. Call us to make an appointment.',
    'Наразі немає послуг для онлайн-бронювання. Зателефонуйте нам, щоб записатися.'],

  'Prenotazione': ['Booking', 'Бронювання'],
  'Prenotazione · passo {passo} di 2': ['Booking · step {passo} of 2', 'Бронювання · крок {passo} з 2'],
  'Scegli data e ora': ['Choose date and time', 'Оберіть дату й час'],
  'I tuoi dati': ['Your details', 'Ваші дані'],
  'Richiesta inviata': ['Request sent', 'Запит надіслано'],
  '{n} servizi scelti': [
    { one: '{n} service selected', other: '{n} services selected' },
    { one: 'Обрано {n} послугу', few: 'Обрано {n} послуги', many: 'Обрано {n} послуг', other: 'Обрано {n} послуги' }],
  'Svuota': ['Clear', 'Очистити'],
  'Togli {nome}': ['Remove {nome}', 'Прибрати: {nome}'],
  'Mese precedente': ['Previous month', 'Попередній місяць'],
  'Mese successivo': ['Next month', 'Наступний місяць'],
  '{data}, non prenotabile': ['{data}, not available', '{data}, недоступно'],
  'Scegli un giorno per vedere gli orari': ['Choose a day to see the available times', 'Оберіть день, щоб побачити вільний час'],
  'Orari di {data}': ['Times on {data}', 'Вільний час: {data}'],
  'Continua': ['Continue', 'Продовжити'],
  '{data}, ore {ora}': ['{data}, at {ora}', '{data}, о {ora}'],
  'Telefono': ['Phone', 'Телефон'],
  'Email': ['Email', 'Ел. пошта'],
  'facoltativa': ['optional', 'необов’язково'],
  'facoltative': ['optional', 'необов’язково'],
  'Es. Porsche 911 · AB123CD': ['E.g. Porsche 911 · AB123CD', 'Напр. Porsche 911 · AB123CD'],
  'Note': ['Notes', 'Примітки'],
  'Rumori, spie accese, richieste particolari': ['Noises, warning lights, special requests', 'Шуми, індикатори на панелі, особливі побажання'],
  'Indietro': ['Back', 'Назад'],
  'Invia richiesta': ['Send request', 'Надіслати запит'],
  'Nuova prenotazione': ['New booking', 'Нове бронювання'],
  'Scrivi nome e cognome.': ['Enter your first and last name.', 'Вкажіть ім’я та прізвище.'],
  'Serve un numero valido.': ['Please enter a valid number.', 'Потрібен дійсний номер.'],
  'Indirizzo non valido.': ['Invalid address.', 'Недійсна адреса.'],
  'Indica almeno il modello.': ['Enter at least the model.', 'Вкажіть принаймні модель.'],
  'Invio non riuscito. Riprova o chiamaci.': ['Sending failed. Try again or call us.', 'Не вдалося надіслати. Спробуйте ще раз або зателефонуйте нам.'],
  'Grazie {nome}. Ti ricontatteremo al {telefono} per confermare l’appuntamento di {data} alle {ora}.': [
    'Thank you, {nome}. We will call you on {telefono} to confirm your appointment on {data} at {ora}.',
    'Дякуємо, {nome}! Ми зателефонуємо вам за номером {telefono}, щоб підтвердити запис на {data} о {ora}.'],

  /* --------------------------------------- catalogo dei servizi (servizi-data.js) */

  'Manutenzione Ordinaria e Tagliandi': ['Routine maintenance and servicing', 'Планове технічне обслуговування'],
  'Tagliando completo': ['Full service', 'Повне ТО'],
  'Sostituzione olio motore, filtro olio, filtro aria, filtro carburante, filtro abitacolo': [
    'Engine oil, oil filter, air filter, fuel filter and cabin filter replacement',
    'Заміна моторної оливи, оливного, повітряного, паливного фільтрів і фільтра салону'],
  'Cambio olio e filtro rapido': ['Quick oil and filter change', 'Швидка заміна оливи та фільтра'],
  'Controllo e rabbocco liquidi': ['Fluid check and top-up', 'Перевірка та доливання рідин'],
  'Freni, radiatore, lavavetri, servosterzo': ['Brakes, radiator, screenwash, power steering', 'Гальма, радіатор, омивач скла, гідропідсилювач керма'],
  'Azzeramento spie service e manutenzione programmata': ['Service light reset and scheduled maintenance', 'Скидання індикатора сервісу та планове обслуговування'],
  'Diagnosi e Meccanica Generale': ['Diagnostics and general mechanics', 'Діагностика та загальна механіка'],
  'Diagnosi computerizzata errori centralina (OBD)': ['Computerised ECU fault diagnosis (OBD)', 'Комп’ютерна діагностика помилок ЕБК (OBD)'],
  'Manutenzione e sostituzione impianto frenante': ['Brake system maintenance and replacement', 'Обслуговування та заміна гальмівної системи'],
  'Pastiglie, dischi, ganasce, liquido freni': ['Pads, discs, shoes, brake fluid', 'Колодки, диски, барабанні колодки, гальмівна рідина'],
  'Sostituzione kit cinghia di distribuzione e pompa acqua': ['Timing belt kit and water pump replacement', 'Заміна комплекту ременя ГРМ і помпи'],
  'Sostituzione cinghia servizi': ['Auxiliary belt replacement', 'Заміна приводного ременя'],
  'Riparazione/sostituzione frizione e volano': ['Clutch and flywheel repair/replacement', 'Ремонт/заміна зчеплення та маховика'],
  'Controllo e sostituzione sospensioni, ammortizzatori e bracci oscillanti': [
    'Suspension, shock absorber and control arm check and replacement',
    'Перевірка та заміна підвіски, амортизаторів і важелів'],
  'Riparazione impianto di scarico e filtro antiparticolato (DPF/FAP)': [
    'Exhaust system and particulate filter (DPF/FAP) repair',
    'Ремонт вихлопної системи та сажового фільтра (DPF/FAP)'],
  'Pneumatici e Assetto': ['Tyres and alignment', 'Шини та розвал-сходження'],
  'Cambio gomme stagionale': ['Seasonal tyre change', 'Сезонна заміна шин'],
  'Estive / invernali': ['Summer / winter', 'Літні / зимові'],
  'Equilibratura e convergenza ruote': ['Wheel balancing and alignment', 'Балансування коліс і розвал-сходження'],
  'Riparazione forature': ['Puncture repair', 'Ремонт проколів'],
  'Controllo pressione e usura battistrada': ['Tyre pressure and tread wear check', 'Перевірка тиску та зносу протектора'],
  'Servizio di deposito pneumatici': ['Tyre storage service', 'Зберігання шин'],
  'Hotel gomme': ['Tyre hotel', 'Шинний готель'],
  'Elettronica e Climatizzazione': ['Electronics and air conditioning', 'Електроніка та кондиціонування'],
  'Controllo, ricarica e sostituzione batteria': ['Battery check, charging and replacement', 'Перевірка, заряджання та заміна акумулятора'],
  'Riparazione motorino di avviamento e alternatore': ['Starter motor and alternator repair', 'Ремонт стартера та генератора'],
  'Ricarica gas climatizzatore': ['Air conditioning gas recharge', 'Заправка кондиціонера'],
  'R134a e R1234yf': ['R134a and R1234yf', 'R134a та R1234yf'],
  'Igienizzazione condotti aria e trattamento antibatterico abitacolo': [
    'Air duct sanitising and antibacterial cabin treatment',
    'Дезінфекція повітроводів і антибактеріальна обробка салону'],
  'Sostituzione lampadine, regolazione fari e fari LED/Xenon': [
    'Bulb replacement, headlight adjustment and LED/Xenon headlights',
    'Заміна ламп, регулювання фар, LED/ксенонові фари'],
  'Revisioni e Burocrazia': ['Inspections and paperwork', 'Техогляд і документи'],
  'Pre-revisione con check-up dei parametri ministeriali': [
    'Pre-inspection check of the official test parameters',
    'Передогляд із перевіркою офіційних параметрів'],
  'Gestione e svolgimento revisione periodica di legge (MCTC)': [
    'Handling and carrying out the mandatory periodic inspection (MCTC)',
    'Організація та проходження обов’язкового періодичного техогляду (MCTC)'],
  'Servizi Accessori': ['Additional services', 'Додаткові послуги'],
  'Auto di cortesia / vettura sostitutiva': ['Courtesy car / replacement vehicle', 'Підмінний автомобіль'],
  'Sanificazione interni ad ozono': ['Ozone interior sanitising', 'Озонова дезінфекція салону'],
  'Servizio di presa e riconsegna veicolo a domicilio': ['Vehicle collection and delivery at your address', 'Забір і доставка авто за вашою адресою'],

  /* ----------------------------------------------------- scena 4: la ruota */

  'Dettagli della ruota': ['Wheel details', 'Деталі колеса'],
  'Cerchio forgiato a più\nrazze (design a razze\nsdoppiate) con finitura\nsatinata color oro/bronzo\n(tipica tonalità Neodyme o\nSatin Aurum di Porsche).': [
    'Multi-spoke forged\nwheel (split-spoke\ndesign) with a satin\ngold/bronze finish\n(the typical Porsche\nNeodyme or Satin Aurum).',
    'Кований диск\nіз роздвоєними спицями,\nсатинове покриття\nкольору золото/бронза\n(типовий для Porsche\nNeodyme або Satin Aurum).'],
  'Uno pneumatico ad\naltissime prestazioni\nMichelin Pilot Sport Cup\n2, una gomma semi-slick\nomologata per uso\nstradale ma progettata\nspecificamente per la\npista, caratterizzata da\nspalla ribassata e mescola\nad elevato grip.': [
    'An ultra-high\nperformance tyre,\nthe Michelin Pilot Sport\nCup 2: a semi-slick\napproved for road\nuse but designed\nspecifically for the\ntrack, with a low\nsidewall and a\nhigh-grip compound.',
    'Надзвичайно\nвисокопродуктивна шина\nMichelin Pilot Sport Cup\n2 — напівслік,\nдопущений для доріг\nзагального користування,\nале створений спеціально\nдля треку: низький\nпрофіль і суміш\nз високим зчепленням.'],
  "Pinza fissa monoblocco ad\nalte prestazioni\n(tipicamente a 6 pistoncini\nsull'anteriore), rifinita in\nrosso lucido con il marchio\nPORSCHE in bianco a\ncontrasto, posizionata a\nridosso del disco.": [
    'High-performance fixed\nmonobloc caliper\n(typically 6-piston\nat the front), finished in\ngloss red with the\nPORSCHE logo in\ncontrasting white, set\nclose to the disc.',
    'Високопродуктивний\nмоноблочний супорт\n(зазвичай 6-поршневий\nспереду), глянцево-\nчервоний, із контрастним\nбілим написом PORSCHE,\nрозташований впритул\nдо диска.'],
  'Disco cross-drilled per\nmassimizzare la\ndissipazione del\ncalore, pulire le\npastiglie e disperdere i\ngas di frenata.': [
    'Cross-drilled disc to\nmaximise heat\ndissipation, keep the\npads clean and\nvent the braking\ngases.',
    'Перфорований диск\nдля максимального\nвідведення тепла,\nочищення колодок\nі відведення\nгальмівних газів.'],
  'Fissato alla campana\ncentrale tramite\nperni/boccole.': [
    'Fixed to the central\nbell by means of\npins/bushings.',
    'Кріпиться до центральної\nматочини штифтами\nта втулками.'],

  /* ------------------------------------------ sottopagina Contenuti (iPhone) */

  'Chiudi i contenuti': ['Close content', 'Закрити відео'],
  'Top One Cars · Contenuti': ['Top One Cars · Content', 'Top One Cars · Відео'],
  'Dall’officina': ['From the workshop', 'З майстерні'],
  'Guarda come lavoriamo, direttamente dal telefono.': ['See how we work, straight from your phone.', 'Подивіться, як ми працюємо, просто з телефона.'],
  'Scorri ancora per proseguire': ['Keep scrolling to continue', 'Гортайте далі, щоб продовжити'],
  'Reels': ['Reels', 'Reels'],
  'Apri Profilo': ['Open profile', 'Відкрити профіль'],
  'Apri il profilo Instagram': ['Open the Instagram profile', 'Відкрити профіль в Instagram'],
  'Attiva Audio': ['Turn sound on', 'Увімкнути звук'],
  "Attiva l'audio": ['Turn sound on', 'Увімкнути звук'],
  'Disattiva Audio': ['Turn sound off', 'Вимкнути звук'],
  "Disattiva l'audio": ['Turn sound off', 'Вимкнути звук'],
  'Mi piace': ['Like', 'Подобається'],
  'Commenti': ['Comments', 'Коментарі'],
  'Condividi': ['Share', 'Поділитися'],
  'Altro': ['More', 'Більше'],
  'Profilo': ['Profile', 'Профіль'],
  'Segui': ['Follow', 'Стежити'],
  'Aprire Instagram?': ['Open Instagram?', 'Відкрити Instagram?'],
  'Vuoi visualizzare il profilo ufficiale di @{utente} per scoprire tutti i lavori e le novità?': [
    'Would you like to view the official @{utente} profile to see all our work and news?',
    'Хочете переглянути офіційний профіль @{utente}, щоб побачити всі наші роботи й новини?'],
  'Rimani sul Sito': ['Stay on the site', 'Залишитися на сайті'],
  'Dentro l’officina Top One Cars: i prodotti che usiamo sulla tua auto. 🔧': [
    'Inside the Top One Cars workshop: the products we use on your car. 🔧',
    'Усередині майстерні Top One Cars: продукти, які ми використовуємо для вашого авто. 🔧'],
  'Audio originale • Top One Cars': ['Original audio • Top One Cars', 'Оригінальний звук • Top One Cars'],
  // Titoli dei video (contenuti-data.js)
  'Anche tu hai una RS6?': ['Do you have an RS6 too?', 'У вас теж RS6?'],
  'I prodotti che usiamo': ['The products we use', 'Продукти, які ми використовуємо'],
  'Sold out': ['Sold out', 'Усе продано'],

  /* ------------------------------------------------- scena 5: le recensioni */

  'Recensioni dei clienti': ['Customer reviews', 'Відгуки клієнтів'],
  'Recensione verificata da Google': ['Review verified by Google', 'Відгук перевірено Google'],
  '{n} stelle su 5': [
    { one: '{n} star out of 5', other: '{n} stars out of 5' },
    { one: '{n} зірка з 5', few: '{n} зірки з 5', many: '{n} зірок з 5', other: '{n} зірки з 5' }],
  '1 settimana fa': ['1 week ago', '1 тиждень тому'],
  '2 settimane fa': ['2 weeks ago', '2 тижні тому'],
  '1 mese fa': ['1 month ago', '1 місяць тому'],
  '2 mesi fa': ['2 months ago', '2 місяці тому'],
  '3 mesi fa': ['3 months ago', '3 місяці тому'],
  '5 mesi fa': ['5 months ago', '5 місяців тому'],
  // Testi delle recensioni segnaposto (recensioni-data.js): vanno sostituiti
  // insieme alle recensioni, con quelle vere.
  'Tagliando in giornata, preventivo chiaro e nessuna sorpresa al ritiro. Officina seria.': [
    'Service done the same day, a clear quote and no surprises at pick-up. A serious workshop.',
    'ТО в той самий день, зрозумілий кошторис і жодних сюрпризів під час отримання авто. Серйозна майстерня.'],
  'Spia motore accesa da mesi: diagnosi precisa e risolto in un pomeriggio.': [
    'Engine light on for months: precise diagnosis and fixed in one afternoon.',
    'Лампа check engine горіла місяцями: точна діагностика, і все полагодили за пів дня.'],
  'Cambio gomme in mezz’ora. Gentilissimi.': ['Tyres changed in half an hour. Very kind.', 'Заміна шин за пів години. Дуже привітні.'],
  'Frizione sostituita sulla Cayenne: lavoro impeccabile e tempi rispettati. Consigliatissimi.': [
    'Clutch replaced on my Cayenne: flawless work, on schedule. Highly recommended.',
    'Замінили зчеплення на Cayenne: бездоганна робота, усе вчасно. Дуже рекомендую.'],
  'Auto di cortesia pronta, zero pensieri.': ['Courtesy car ready, zero hassle.', 'Підмінне авто вже чекало, жодних турбот.'],
  'Pre-revisione e revisione nella stessa mattina. Mi hanno spiegato tutto senza fretta.': [
    'Pre-check and inspection on the same morning. They explained everything without rushing.',
    'Передогляд і техогляд за один ранок. Усе пояснили спокійно, без поспіху.'],
  'Ricarica clima e igienizzazione fatte bene. Un po’ di attesa al banco, ma ne vale la pena.': [
    'A/C recharge and sanitising done well. A bit of a wait at the counter, but worth it.',
    'Заправка кондиціонера й дезінфекція — якісно. Трохи довелося почекати, але воно того варте.'],

  /* ------------------------------------------- scena 7: Vieni a trovarci */

  'Mappa della zona di Top One Cars': ['Map of the Top One Cars area', 'Мапа району Top One Cars'],
  'GPS · Destinazione': ['GPS · Destination', 'GPS · Пункт призначення'],
  'Apri la posizione in Google Maps': ['Open the location in Google Maps', 'Відкрити місце в Google Maps'],
  'Avvia navigazione': ['Start navigation', 'Почати навігацію'],
  'Aperto ora · chiude alle {ora}': ['Open now · closes at {ora}', 'Відчинено · зачиняємося о {ora}'],
  'Chiuso ora · apre alle {ora}': ['Closed now · opens at {ora}', 'Зачинено · відчиняємося о {ora}'],
  'Chiuso ora': ['Closed now', 'Зачинено'],
  'Chiuso ora · riapre domani alle {ora}': ['Closed now · reopens tomorrow at {ora}', 'Зачинено · відчинимося завтра о {ora}'],
  'Chiuso ora · riapre {giorno} alle {ora}': ['Closed now · reopens {giorno} at {ora}', 'Зачинено · відчинимося: {giorno}, о {ora}'],

  /* ------------------------------------------------------ scena 8: Noleggio */

  'Scegli la tua auto': ['Choose your car', 'Оберіть своє авто'],
  'Auto precedenti': ['Previous cars', 'Попередні авто'],
  'Auto successive': ['Next cars', 'Наступні авто'],
  'Auto a noleggio': ['Rental cars', 'Авто в оренду'],
  '{n} auto disponibili su {totale} · tariffe al giorno, cauzione alla consegna': [
    { one: '{n} car available out of {totale} · daily rates, deposit on collection',
      other: '{n} cars available out of {totale} · daily rates, deposit on collection' },
    { one: '{n} авто доступне з {totale} · ціни за добу, застава під час отримання',
      few: '{n} авто доступні з {totale} · ціни за добу, застава під час отримання',
      many: '{n} авто доступно з {totale} · ціни за добу, застава під час отримання',
      other: '{n} авто доступні з {totale} · ціни за добу, застава під час отримання' }],
  'Il parco auto a noleggio è in allestimento.': ['The rental fleet is being prepared.', 'Автопарк для оренди ще формується.'],
  '{modello}, targa {targa}': ['{modello}, plate {targa}', '{modello}, номер {targa}'],
  '{n} posti': [
    { one: '{n} seat', other: '{n} seats' },
    { one: '{n} місце', few: '{n} місця', many: '{n} місць', other: '{n} місця' }],
  'giorno': ['day', 'добу'],
  'Cauzione {importo}': ['Deposit {importo}', 'Застава {importo}'],
  'Come noleggiarla': ['How to rent it', 'Як орендувати'],
  'Già noleggiata': ['Already rented', 'Уже в оренді'],
  '{da}–{a} di {totale}': ['{da}–{a} of {totale}', '{da}–{a} з {totale}'],
  // Valori del parco auto (dati-officina.js, area amministratore)
  'Disponibile': ['Available', 'Доступне'],
  'Noleggiata': ['Rented', 'В оренді'],
  'In manutenzione': ['In maintenance', 'На сервісі'],
  'Citycar': ['City car', 'Міське авто'],
  'Compatta': ['Compact', 'Компактне'],
  'Berlina': ['Saloon', 'Седан'],
  'Station wagon': ['Estate', 'Універсал'],
  'SUV': ['SUV', 'SUV'],
  'Premium': ['Premium', 'Преміум'],
  'Furgone': ['Van', 'Фургон'],
  'Benzina': ['Petrol', 'Бензин'],
  'Diesel': ['Diesel', 'Дизель'],
  'Ibrida': ['Hybrid', 'Гібрид'],
  'Elettrica': ['Electric', 'Електро'],
  'GPL': ['LPG', 'Газ (LPG)'],
  'Metano': ['CNG', 'Метан'],
  'Manuale': ['Manual', 'Механіка'],
  'Automatico': ['Automatic', 'Автомат'],

  // Parte legale: barra in fondo, pannello dei documenti, consenso alla mappa
  // (legale.js, visita.js). I documenti stessi sono in legale-testi.js.
  'P.IVA': ['VAT no.', 'ПДВ'],
  'Privacy': ['Privacy', 'Конфіденційність'],
  'Cookie': ['Cookies', 'Cookie'],
  'Note legali': ['Legal', 'Правова інформація'],
  '[da completare]': ['[to be completed]', '[буде доповнено]'],
  'Chiudi': ['Close', 'Закрити'],
  'Mappa di Google': ['Google map', 'Мапа Google'],
  'Consentita il {data}': ['Allowed on {data}', 'Дозволено {data}'],
  'Non consentita: la mappa non si carica': ['Not allowed: the map does not load', 'Не дозволено: мапа не завантажується'],
  'Gli strumenti tecnici sono sempre attivi: senza, il sito non ricorderebbe la lingua né le tue scelte.': [
    'Technical storage is always on: without it the site would not remember your language or your choices.',
    'Технічні записи завжди ввімкнені: без них сайт не запам’ятав би мову й ваш вибір.',
  ],
  'Ho letto l’informativa sulla privacy.': ['I have read the privacy notice.', 'Я ознайомився(-лася) з політикою конфіденційності.'],
  'Leggi': ['Read', 'Читати'],
  'Conferma di aver letto l’informativa.': ['Please confirm you have read the privacy notice.', 'Підтвердьте, що ознайомилися з політикою конфіденційності.'],
  'La mappa è fornita da Google, che riceverà il tuo indirizzo IP e potrà usare cookie.': [
    'The map is provided by Google, which will receive your IP address and may use cookies.',
    'Мапу надає Google, який отримає вашу IP-адресу й може використовувати cookie.',
  ],
  'Carica la mappa': ['Load the map', 'Завантажити мапу'],
  'Cookie policy': ['Cookie policy', 'Політика cookie'],
};
