/* Nelson App Pro · js/modules/37-aviso-actualizacion.js
   Avisa cuando se instala una versión nueva del service worker y deja que el
   usuario elija cuándo recargar (así no se pierde un formulario a medias). */
(function () {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;
    // Solo avisar si ya había una versión controlando la página (no en la primera instalación)
    var hadController = !!navigator.serviceWorker.controller;
    var shown = false;
    function showBanner() {
        if (shown) return; shown = true;
        var b = document.createElement('div');
        b.className = 'nv-banner'; b.setAttribute('role', 'status');
        b.innerHTML = '<div class="nv-txt">🚀 Nueva versión disponible<small>Actualiza cuando termines lo que estás haciendo</small></div>' +
                      '<button class="nv-later" type="button">Después</button><button class="nv-ok" type="button">Actualizar</button>';
        b.querySelector('.nv-ok').onclick = function () { location.reload(); };
        b.querySelector('.nv-later').onclick = function () { b.classList.remove('nv-show'); setTimeout(function () { b.remove(); }, 300); };
        document.body.appendChild(b);
        requestAnimationFrame(function () { b.classList.add('nv-show'); });
    }
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadController) showBanner(); });
    // Revisar si hay versión nueva cada vez que la app vuelve al primer plano
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update().catch(function () {}); }).catch(function () {});
    });
})();
