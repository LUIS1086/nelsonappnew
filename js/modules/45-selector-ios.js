/* Nelson App Pro · js/modules/45-selector-ios.js
   Reemplaza el desplegable nativo de TODOS los <select> por una hoja de selección estilo iOS
   (action sheet): filas grandes, marca de selección, emoji en tarjeta, "Cancelar" aparte,
   arrastrar hacia abajo para cerrar y buscador cuando hay muchas opciones.
   - El <select> real sigue siendo la fuente de verdad: al elegir se actualiza su valor y se
     disparan 'input' y 'change', así que los onchange existentes siguen funcionando.
   - Para dejar un select con el desplegable del sistema: <select data-native>.
   - Teclado: Enter / Espacio / Alt+↓ abren; ↑ ↓ Inicio Fin navegan; Esc cierra. */
(function () {
    'use strict';
    if (window.NelsonSelectSheet) return;

    var root = null, wrap = null, list = null, activeSel = null, returnFocus = null, closing = false;
    var SEARCH_FROM = 12;                         // con más opciones se muestra el buscador
    var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var EMOJI = null;
    try { EMOJI = new RegExp('^((?:\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic}|\\p{Emoji_Modifier})*)+)\\s*([\\s\\S]*)$', 'u'); } catch (e) { EMOJI = null; }

    function enhanced(sel) {
        return !!sel && sel.tagName === 'SELECT' && !sel.multiple && !(sel.size > 1) &&
            !sel.disabled && !sel.hasAttribute('data-native') && sel.options.length > 0;
    }
    function selectOf(e) { var t = e.target; return t && t.closest ? t.closest('select') : null; }
    function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

    function titleFor(sel) {
        var t = sel.getAttribute('data-sheet-title') || sel.getAttribute('aria-label') || '';
        if (!t && sel.id) { var l = document.querySelector('label[for="' + sel.id + '"]'); if (l) t = l.textContent; }
        if (!t && sel.parentElement && sel.parentElement.querySelectorAll('select').length === 1) {
            var l2 = sel.parentElement.querySelector('label'); if (l2) t = l2.textContent;
        }
        try { t = t.replace(/^[^\p{L}\p{N}¿¡]+/u, ''); } catch (e) { /* navegador antiguo */ }
        t = t.replace(/\s+/g, ' ').trim();
        if (t && t === t.toUpperCase() && t !== t.toLowerCase()) {
            t = t.toLowerCase();
            try { t = t.replace(/\p{L}/u, function (c) { return c.toUpperCase(); }); } catch (e) { t = t.charAt(0).toUpperCase() + t.slice(1); }
        }
        return t.length > 48 ? t.slice(0, 47) + '…' : t;
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function buildRow(opt, index, selected) {
        var b = el('button', 'nn-opt');
        b.type = 'button'; b.setAttribute('role', 'option'); b.dataset.index = String(index);
        b.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (opt.disabled) b.setAttribute('aria-disabled', 'true');
        var txt = (opt.textContent || '').trim(), icon = '', m = EMOJI && EMOJI.exec(txt);
        if (m) { icon = m[1]; txt = m[2] || txt; }
        if (icon) b.appendChild(el('span', 'nn-opt-ico', icon)).setAttribute('aria-hidden', 'true');
        b.appendChild(el('span', 'nn-opt-txt', txt || ' '));
        var c = el('span', 'nn-opt-check'); c.innerHTML = CHECK; c.setAttribute('aria-hidden', 'true'); b.appendChild(c);
        b.dataset.q = norm(txt);
        return b;
    }

    function ensureRoot() {
        if (root) return;
        root = el('div', 'nn-sheet-root'); root.setAttribute('role', 'presentation');
        var back = el('div', 'nn-sheet-backdrop');
        wrap = el('div', 'nn-sheet-wrap');
        root.appendChild(back); root.appendChild(wrap);
        back.addEventListener('click', function () { close(); });
        root.addEventListener('keydown', onKey);
        document.body.appendChild(root);
    }

    function openFor(sel) {
        if (!enhanced(sel) || (root && root.classList.contains('is-open'))) return;
        ensureRoot(); closing = false;
        activeSel = sel; returnFocus = document.activeElement;
        wrap.innerHTML = ''; wrap.style.transform = ''; wrap.classList.remove('is-dragging');

        var card = el('div', 'nn-sheet-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true');
        var title = titleFor(sel); if (title) card.setAttribute('aria-label', title);
        var head = el('div', 'nn-sheet-head');
        head.appendChild(el('div', 'nn-sheet-grab'));
        head.appendChild(el('p', 'nn-sheet-title', title));
        card.appendChild(head);

        var search = null;
        if (sel.options.length > SEARCH_FROM) {
            var sw = el('div', 'nn-sheet-search'); search = el('input'); search.type = 'search';
            search.placeholder = 'Buscar'; search.setAttribute('aria-label', 'Buscar opción'); search.autocomplete = 'off';
            sw.appendChild(search); card.appendChild(sw);
            search.addEventListener('input', function () { filter(search.value); });
        }

        list = el('div', 'nn-sheet-list'); list.setAttribute('role', 'listbox');
        var selectedRow = null;
        Array.prototype.forEach.call(sel.children, function (ch) {
            if (ch.tagName === 'OPTGROUP') {
                list.appendChild(el('div', 'nn-opt-group', ch.label || ''));
                Array.prototype.forEach.call(ch.children, function (o) { var r = buildRow(o, o.index, o.index === sel.selectedIndex); list.appendChild(r); if (o.index === sel.selectedIndex) selectedRow = r; });
            } else if (ch.tagName === 'OPTION' && !ch.hidden) {
                var r2 = buildRow(ch, ch.index, ch.index === sel.selectedIndex); list.appendChild(r2); if (ch.index === sel.selectedIndex) selectedRow = r2;
            }
        });
        list.addEventListener('click', function (e) {
            var b = e.target.closest && e.target.closest('.nn-opt'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
            choose(Number(b.dataset.index));
        });
        card.appendChild(list);

        var cancel = el('button', 'nn-sheet-cancel', 'Cancelar'); cancel.type = 'button';
        cancel.addEventListener('click', function () { close(); });
        wrap.appendChild(card); wrap.appendChild(cancel);
        attachDrag(head);

        root.classList.add('is-open');
        var target = selectedRow || list.querySelector('.nn-opt:not([aria-disabled="true"])');
        if (selectedRow) list.scrollTop = Math.max(0, selectedRow.offsetTop - list.clientHeight / 2 + selectedRow.offsetHeight / 2);
        if (target) setTimeout(function () { try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); } }, 60);
    }

    function filter(q) {
        q = norm(q).trim(); var shown = 0;
        Array.prototype.forEach.call(list.querySelectorAll('.nn-opt'), function (b) {
            var ok = !q || b.dataset.q.indexOf(q) !== -1; b.style.display = ok ? '' : 'none'; if (ok) shown++;
        });
        Array.prototype.forEach.call(list.querySelectorAll('.nn-opt-group'), function (g) { g.style.display = q ? 'none' : ''; });
        var old = list.querySelector('.nn-sheet-empty'); if (old) old.remove();
        if (!shown) list.appendChild(el('div', 'nn-sheet-empty', 'Sin resultados'));
    }

    function choose(index) {
        var sel = activeSel; if (!sel) return;
        var changed = sel.selectedIndex !== index;
        if (changed) {
            sel.selectedIndex = index;
            sel.dispatchEvent(new Event('input', { bubbles: true }));
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* sin vibración */ } }
        }
        close();
    }

    function close() {
        if (!root || !root.classList.contains('is-open') || closing) return;
        closing = true; root.classList.remove('is-open');
        var sel = returnFocus && document.contains(returnFocus) ? returnFocus : activeSel;
        setTimeout(function () { if (wrap) wrap.innerHTML = ''; closing = false; }, 380);
        if (sel && sel.focus) { try { sel.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
        activeSel = null;
    }

    function onKey(e) {
        if (!root.classList.contains('is-open')) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        var rows = Array.prototype.filter.call(list.querySelectorAll('.nn-opt'), function (b) { return b.style.display !== 'none' && b.getAttribute('aria-disabled') !== 'true'; });
        var i = rows.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (rows[Math.min(rows.length - 1, i + 1)] || rows[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (rows[Math.max(0, i - 1)] || rows[0]).focus(); }
        else if (e.key === 'Home' && i >= 0) { e.preventDefault(); rows[0].focus(); }
        else if (e.key === 'End' && i >= 0) { e.preventDefault(); rows[rows.length - 1].focus(); }
        else if (e.key === 'Tab') {                       // el foco se queda dentro de la hoja
            var f = Array.prototype.filter.call(wrap.querySelectorAll('input,button'), function (n) { return n.style.display !== 'none' && n.getAttribute('aria-disabled') !== 'true'; });
            if (!f.length) return; var k = f.indexOf(document.activeElement);
            e.preventDefault(); f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
    }

    // Arrastrar la cabecera hacia abajo para cerrar (como en iOS)
    function attachDrag(handle) {
        var y0 = null, dy = 0;
        handle.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; wrap.classList.add('is-dragging'); try { handle.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } });
        handle.addEventListener('pointermove', function (e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); wrap.style.transform = 'translateY(' + dy + 'px)'; });
        function end() { if (y0 == null) return; y0 = null; wrap.classList.remove('is-dragging'); if (dy > 80) close(); wrap.style.transform = ''; }
        handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    }

    // ── Interceptar la apertura del desplegable nativo ──────────────────────────────
    var tx = 0, ty = 0, moved = false;
    document.addEventListener('touchstart', function (e) {
        var t = e.touches && e.touches[0]; if (!t) return; tx = t.clientX; ty = t.clientY; moved = false;
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', function (e) {
        var t = e.touches && e.touches[0]; if (t && (Math.abs(t.clientX - tx) > 8 || Math.abs(t.clientY - ty) > 8)) moved = true;
    }, { capture: true, passive: true });
    document.addEventListener('touchend', function (e) {          // toque en pantalla táctil
        var s = selectOf(e); if (!enhanced(s) || moved || !e.cancelable) return;
        e.preventDefault(); openFor(s);                           // evita mousedown/click emulados → no sale el nativo
    }, { capture: true, passive: false });
    document.addEventListener('mousedown', function (e) {         // ratón
        var s = selectOf(e); if (enhanced(s) && e.button === 0) e.preventDefault();
    }, true);
    document.addEventListener('click', function (e) {
        var s = selectOf(e); if (!enhanced(s)) return;
        e.preventDefault(); e.stopPropagation(); openFor(s);
    }, true);
    document.addEventListener('keydown', function (e) {           // teclado en el select
        var s = e.target && e.target.tagName === 'SELECT' ? e.target : null; if (!enhanced(s)) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); openFor(s); }
    }, true);
    window.addEventListener('popstate', close);

    window.NelsonSelectSheet = { open: openFor, close: close };
})();
