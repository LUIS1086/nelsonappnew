/* Nelson App Pro · js/core/01-base-globales.js
   Version, escape XSS, manejo global de errores, hash de PIN, init del PIN
   (extraido sin cambios de index.html; el orden de carga importa) */

        // ==================== CONFIGURACIÓN INICIAL ====================
        const DB_NAME = 'NelsonAppPro';
        window.APP_VERSION = 'v3.3.0'; // Única fuente de verdad para la versión de la app
        let db = null;
        let searchDebounceTimer = null;
        let currentPhotos = [];
        let stream = null;
        let filters = { text: '', dateFrom: null, dateTo: null, statuses: [] };
        let currentEditOrderId = null;
        let currentClientHistory = null;

        // ==================== HELPERS GLOBALES ====================
        // esc: escapa strings para inyección segura en innerHTML (previene XSS)
        // Usar siempre que concatenes datos del usuario: ${esc(orden.nom)} en vez de ${orden.nom}
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        window.esc = esc; // accesible desde cualquier parte
        // attr: para atributos HTML (escapa comillas dobles agresivamente)
        const escAttr = s => String(s ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        window.escAttr = escAttr;

        // ── Sincroniza la versión en splash y créditos desde window.APP_VERSION ──
        (function syncAppVersion() {
            try {
                const v = window.APP_VERSION || 'v3.3.0';
                const ids = ['splash-version', 'credits-version', 'cfg-header-version'];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = v;
                });
            } catch (e) { /* silencioso, no bloquea arranque */ }
        })();

        // ── PIN: almacenado con hash SHA-256 (nunca en texto plano) ──
        async function _hashPin(pin) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + '_nelsonapp_v1'));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
        }
        let _pinHash = null; // hash SHA-256 del PIN activo

        // ════════════════ ESTABILIDAD: handlers globales de errores ════════════════
        // Captura errores no manejados para que no se queden silenciosos.
        // Solo notifica al usuario una vez cada 60s para no saturar.
        let _globalErrorLastShown = 0;
        function _logGlobalError(label, err) {
            console.error('[' + label + ']', err);
            const now = Date.now();
            if (now - _globalErrorLastShown < 60000) return;
            _globalErrorLastShown = now;
            try {
                if (typeof showToast === 'function') {
                    showToast('⚠️ Algo falló en segundo plano. Si se repite, exporta un respaldo y reinicia la app.', 'warning');
                }
            } catch(_){}
        }
        window.addEventListener('error', (e) => {
            // Ignorar errores de scripts externos (CDN) y de carga de imágenes
            if (e && e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT')) return;
            _logGlobalError('window.error', e.error || e.message);
        });
        window.addEventListener('unhandledrejection', (e) => {
            _logGlobalError('unhandledrejection', e.reason);
        });

        // ════════════════ ESTABILIDAD: persistencia de IndexedDB ════════════════
        // Pide a Android/Chrome que NO borre nuestros datos cuando el almacenamiento esté presionado.
        // Sin esto, el SO puede limpiar la DB del taller si el celular se llena.
        async function _requestPersistentStorage() {
            try {
                if (navigator.storage && navigator.storage.persist) {
                    const already = await navigator.storage.persisted();
                    if (already) { console.log('[storage] ya persistente ✅'); return; }
                    const granted = await navigator.storage.persist();
                    console.log('[storage] persistencia ' + (granted ? 'concedida ✅' : 'denegada (datos pueden borrarse si el celular se llena)'));
                }
            } catch(e) { console.warn('[storage] no se pudo pedir persistencia:', e); }
        }
        // Llamarlo al cargar (sin bloquear)
        if (typeof window !== 'undefined') {
            window.addEventListener('load', () => { _requestPersistentStorage(); });
        }

        async function initPinSystem() {
            const stored = localStorage.getItem('appPinHash');
            if (stored) { _pinHash = stored; return; }
            // Migrar PIN legacy (texto plano) → hash automáticamente
            const legacy = localStorage.getItem('appPin');
            const base   = legacy || '1234';
            _pinHash = await _hashPin(base);
            localStorage.setItem('appPinHash', _pinHash);
            if (legacy) localStorage.removeItem('appPin'); // eliminar texto plano
        }
        let pinBuffer = '';
        let currentDeliveryPhotos = [];
        let currentDeliveryOrderId = null;
        let currentPresupuestoOrderId = null;
        // Estado del editor de precio de venta (null = sin override, número = precio aplicado solo a esta venta)
        let customSalePrice = null;

        // Variable para respaldo automático
        let autoBackupIntervalId = null;

        async function getNextOrderNum() {
            await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction('config', 'readwrite');
                const store = tx.objectStore('config');
                const req = store.get('orderCounter');
                req.onsuccess = () => {
                    const current = req.result ? req.result.value : 0;
                    const next = current + 1;
                    store.put({ key: 'orderCounter', value: next });
                    resolve(next);
                };
            });
        }

        // formatOrderNum se define más abajo con soporte de prefijo configurable

