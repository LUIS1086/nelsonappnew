/* Nelson App Pro · js/modules/42-ios-iconos.js  (v3.8.0)
   Cambia los emoji de la "estructura" de la app (menú lateral, barra superior,
   etiquetas de formulario, acciones rápidas) por iconos SVG de un solo estilo,
   para que se vean igual en iPhone, Android y Windows.
   Solo toca la presentación: no cambia IDs, eventos ni textos. Si algo falla,
   el emoji original queda como estaba. Para desactivarlo, quita su <script>. */
(function () {
    'use strict';

    var P = {
        tools:     '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
        wallet:    '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
        gear:      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        chart:     '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
        chat:      '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
        doc:       '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
        keyboard:  '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
        plus:      '<path d="M12 5v14M5 12h14"/>',
        search:    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        user:      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        phone:     '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
        download:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
        shield:    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
        calendar:  '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
        megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
        banknote:  '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
        lock:      '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        mic:       '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
        edit:      '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>'
    };
    // emoji (sin selector de variación) → icono
    var MAP = {
        '\uD83D\uDEE0': 'tools', '\uD83D\uDD27': 'tools', '\uD83D\uDCCB': 'clipboard', '\uD83D\uDCB0': 'wallet',
        '\u2699': 'gear', '\uD83D\uDCCA': 'chart', '\uD83D\uDCAC': 'chat', '\uD83D\uDCC4': 'doc',
        '\u2328': 'keyboard', '\u2795': 'plus', '\uD83D\uDD0D': 'search', '\uD83D\uDC64': 'user',
        '\uD83D\uDCF1': 'phone', '\u2B07': 'download', '\uD83D\uDCDD': 'edit',
        '\uD83D\uDEE1': 'shield', '\uD83D\uDCC5': 'calendar', '\uD83D\uDCE3': 'megaphone', '\uD83D\uDCB5': 'banknote',
        '\uD83D\uDD12': 'lock', '\uD83C\uDFA4': 'mic', '\uD83D\uDC77': 'user'
    };

    function svg(name) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + P[name] + '</svg>';
    }
    function clean(s) { return String(s || '').replace(/\uFE0F/g, '').trim(); }

    // El elemento contiene SOLO un emoji → lo reemplaza por el icono.
    function swapWhole(el, cls) {
        try {
            if (!el || el.querySelector('svg')) return;
            var name = MAP[clean(el.textContent)];
            if (!name) return;
            el.innerHTML = svg(name);
            el.setAttribute('data-ic', name);
            el.classList.add(cls || 'ios-ic');
        } catch (_) { /* se deja el emoji */ }
    }

    // El texto empieza por un emoji → lo reemplaza por un icono pequeño en línea.
    function swapLeading(el) {
        try {
            if (!el || el.querySelector(':scope > .ios-ic-inline')) return;
            for (var i = 0; i < el.childNodes.length; i++) {
                var node = el.childNodes[i];
                if (node.nodeType !== 3 || !node.nodeValue.trim()) continue;
                var s = node.nodeValue.replace(/^\s+/, '');
                var cp = Array.from(s)[0];
                var name = cp && MAP[cp];
                if (!name) return;
                var rest = s.slice(cp.length).replace(/^\uFE0F/, '').replace(/^\s+/, '');
                var span = document.createElement('span');
                span.className = 'ios-ic-inline';
                span.setAttribute('data-ic', name);
                span.innerHTML = svg(name);
                node.nodeValue = rest ? ' ' + rest : '';
                el.insertBefore(span, node);
                return;
            }
        } catch (_) { /* se deja el emoji */ }
    }

    function apply() {
        document.querySelectorAll('.sidebar-nav-icon').forEach(function (e) { swapWhole(e, 'ios-tile'); });
        document.querySelectorAll('.qa-icon').forEach(function (e) { swapWhole(e, 'ios-ic'); });
        document.querySelectorAll('#topbar-primary-action > span:first-child').forEach(function (e) { swapWhole(e, 'ios-ic'); });
        document.querySelectorAll('#desktop-topbar-right button:not(#topbar-primary-action)').forEach(swapLeading);
        document.querySelectorAll('#view-taller [style*="top:-10px"]').forEach(swapLeading);
        document.querySelectorAll('#view-taller label, #view-taller .form-label').forEach(swapLeading);
        document.querySelectorAll('.voice-mic-btn').forEach(function (e) { swapWhole(e, 'ios-ic'); });
        document.querySelectorAll('#shortcuts-overlay h3').forEach(swapLeading);
        document.querySelectorAll('#sidebar-footer button').forEach(swapLeading);
    }

    apply();
    window.addEventListener('load', apply);
})();
