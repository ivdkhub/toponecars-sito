/**
 * Telefono o no: si decide qui, prima del primo disegno.
 *
 * Script classico e sincrono nel <head>, non un modulo: i moduli partono solo
 * a pagina analizzata, e fino ad allora il telefono mostrerebbe per un istante
 * il canvas 1440x810 rimpicciolito. L'attributo html[data-mobile] accende
 * assets/css/mobile.css e fa scegliere a main.js l'avvio di mobile.js al posto
 * del motore a scene video.
 *
 * Telefono = schermo stretto in verticale, oppure basso e a tocco in
 * orizzontale. I tablet (dai 744 px dell'iPad mini in su) e i computer restano
 * sulla versione a scene, identica a prima.
 *
 * ?mobile=1 e ?mobile=0 forzano la scelta: servono alle prove da computer.
 */
(function () {
  var forza = new URLSearchParams(location.search).get('mobile');
  var telefono = forza === '1' || (forza !== '0' && matchMedia(
    '(max-width: 640px), (max-height: 500px) and (max-width: 1000px) and (pointer: coarse)',
  ).matches);
  if (telefono) document.documentElement.dataset.mobile = 'true';
})();
