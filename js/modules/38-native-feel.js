/* Nelson App Pro · js/modules/38-native-feel.js
   Sensación de app nativa: vibración sutil, transición entre pestañas, cabecera que se compacta,
   barra inferior que se esconde con el teclado, botón flotante y ventanas que se cierran deslizando.
   Todo es opcional: si algo no existe, simplemente no hace nada. */
(function () {
    'use strict';
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.matchMedia && matchMedia('(max-width: 780px)').matches;

    // 1) Vibración sutil (Android; iPhone no la permite). Se apaga con localStorage.hapticsOff = '1'
    function haptic(kind) {
        if (typeof navigator.vibrate !== 'function' || localStorage.getItem('hapticsOff') === '1') return;
        const p = { tap: 6, press: 10, success: [10, 40, 12], warn: [20, 40, 20], error: [30, 50, 30, 50, 30] }[kind] || 6;
        try { navigator.vibrate(p); } catch (_) {}
    }
    window.haptic = haptic;
    document.addEventListener('click', function (e) {
        const b = e.target.closest && e.target.closest('button, [role="button"], .quick-action');
        if (!b || b.disabled) return;
        haptic(b.closest('.bottom-nav-mobile') ? 'tap' : 'press');
    }, true);
    if (typeof window.showToast === 'function') {
        const _toast = window.showToast;
        window.showToast = function (msg, type) {
            haptic(type === 'error' ? 'error' : type === 'warning' ? 'warn' : type === 'success' ? 'success' : 'tap');
            return _toast.apply(this, arguments);
        };
    }

    // 2) Transición suave entre pestañas
    if (typeof window.tab === 'function') {
        const _tab = window.tab;
        window.tab = function (t) {
            const run = () => _tab.call(this, t);
            if (!reduce && document.startViewTransition) {
                try { document.startViewTransition(run); return; } catch (_) {}
            }
            run();
        };
    }

    // 3) Cabecera que se compacta al bajar
    const hdr = document.getElementById('app-header');
    let ticking = false;
    window.addEventListener('scroll', function () {
        if (ticking || !hdr) return;
        ticking = true;
        requestAnimationFrame(function () { hdr.classList.toggle('is-compact', window.scrollY > 24); ticking = false; });
    }, { passive: true });

    // 4) Teclado abierto → esconde la barra inferior y el botón flotante
    const isField = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    document.addEventListener('focusin', e => { if (isField(e.target)) document.body.classList.add('kb-open'); });
    document.addEventListener('focusout', () => setTimeout(() => { if (!isField(document.activeElement)) document.body.classList.remove('kb-open'); }, 120));

    // 5) Modo instalada (PWA) y accesibilidad de la barra inferior
    if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone) {
        document.documentElement.classList.add('is-standalone');
    }
    const nav = document.querySelector('nav.bottom-nav-mobile');
    if (nav) { nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', 'Secciones'); }

    // 6) Botón flotante "Nueva recepción" (solo en móvil y solo en la pestaña Órdenes)
    const fab = document.createElement('button');
    fab.id = 'fab-nueva'; fab.type = 'button'; fab.hidden = true;
    fab.setAttribute('aria-label', 'Nueva recepción');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    fab.addEventListener('click', function () {
        window.tab('taller');
        setTimeout(function () {
            const i = document.getElementById('c-nom');
            if (i) { i.scrollIntoView({ block: 'center' }); i.focus({ preventScroll: true }); }
        }, 380);
    });
    document.body.appendChild(fab);

    function syncChrome() {
        // Solo en Órdenes: en Caja/Datos taparía los botones de cada fila
        const ord = document.getElementById('view-ordenes');
        const appOn = hdr && !hdr.classList.contains('hidden');
        fab.hidden = !(appOn && ord && !ord.classList.contains('hidden') && isMobile());
        document.querySelectorAll('nav.bottom-nav-mobile .nav-btn').forEach(function (b) {
            const on = b.classList.contains('nav-active');
            b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
    }
    let raf = 0;
    new MutationObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncChrome); })
        .observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
    syncChrome();

    // 7) Ventanas como hoja inferior: se cierran deslizando hacia abajo desde la manija o la cabecera
    let sheet = null, startY = 0, dy = 0, t0 = 0, dragging = false;
    function closeSheet(s) {
        const btn = s.querySelector('[onclick*="close"]');
        if (btn) btn.click(); else if (s.parentElement) s.parentElement.classList.add('hidden');
    }
    document.addEventListener('touchstart', function (e) {
        if (!isMobile()) return;
        const s = e.target.closest && e.target.closest('.modal-custom:not(#modal-qr-scanner) > div:first-child');
        if (!s) return;
        const y = e.touches[0].clientY;
        if (y - s.getBoundingClientRect().top > 84 || s.scrollTop > 0) return;
        sheet = s; startY = y; dy = 0; t0 = Date.now(); dragging = false;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
        if (!sheet) return;
        dy = e.touches[0].clientY - startY;
        if (dy > 8) { dragging = true; sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    document.addEventListener('touchend', function () {
        if (!sheet) return;
        const s = sheet; sheet = null;
        if (!dragging) return;
        const fast = dy / Math.max(1, Date.now() - t0) > 0.6;
        s.style.transition = 'transform .2s ease';
        if (dy > 110 || fast) {
            s.style.transform = 'translateY(110%)'; haptic('tap');
            setTimeout(function () { closeSheet(s); s.style.transform = ''; s.style.transition = ''; }, 190);
        } else {
            s.style.transform = '';
            setTimeout(function () { s.style.transition = ''; }, 220);
        }
    }, { passive: true });
})();
