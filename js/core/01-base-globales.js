/* Nelson App Pro · js/core/01-base-globales.js
   Version, escape XSS, manejo global de errores, hash de PIN, init del PIN
   (extraido sin cambios de index.html; el orden de carga importa) */

        // ==================== CONFIGURACIÓN INICIAL ====================
        const DB_NAME = 'NelsonAppPro';
        window.APP_VERSION = 'v3.4.3'; // Única fuente de verdad para la versión de la app
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

        // waPhone: normaliza un teléfono al formato internacional que exige wa.me
        // (https://wa.me/<solo dígitos>). Evita el bug clásico del prefijo 57 duplicado
        // ("+57 314 123 4567" → "57573141234567", enlace roto).
        // Reglas:
        //   · se eliminan todos los caracteres no numéricos (+, espacios, guiones…)
        //   · 10 dígitos → número local colombiano → se le antepone 57
        //   · ya empieza por 57 → NO se duplica el prefijo
        //   · cualquier otro largo → se respeta tal cual (trae código de país propio)
        const waPhone = (tel) => {
            const num = String(tel ?? '').replace(/\D/g, '');
            if (!num) return '';
            if (num.length === 10) return '57' + num;
            if (num.startsWith('57')) return num;
            return num;
        };
        window.waPhone = waPhone;

        // Acceso uniforme a cámara para Chrome, Brave, Firefox y Samsung Internet.
        // · Solo hay UNA cámara activa a la vez: antes de pedir otra se libera la anterior
        //   (Chrome en Android responde NotReadableError si la misma página la abre dos veces).
        // · Un doble toque comparte la misma solicitud (no se abren dos streams).
        // · Si el hardware aún se está liberando, se reintenta una vez antes de rendirse.
        // · No exige la cámara trasera: algunos navegadores rechazan la restricción estricta.
        const _appCamStreams = new Set();
        let _appCamInflight = null;
        const _camWait = (ms) => new Promise(r => setTimeout(r, ms));
        function _camLive(s) { try { return s.getTracks().some(t => t.readyState === 'live'); } catch (_) { return false; } }
        function releaseAppCameraStreams() {
            _appCamStreams.forEach(s => { try { s.getTracks().forEach(t => t.stop()); } catch (_) {} });
            _appCamStreams.clear();
        }
        window.releaseAppCameraStreams = releaseAppCameraStreams;
        async function _openCameraWithFallback() {
            try {
                return await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false
                });
            } catch (err) {
                // Si el dispositivo no admite la preferencia de cámara trasera,
                // intentar con la cámara disponible. Nunca repetir un error de permiso.
                if (err && ['OverconstrainedError', 'ConstraintNotSatisfiedError', 'NotFoundError'].includes(err.name)) {
                    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                throw err;
            }
        }
        async function requestAppCameraStream() {
            if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const err = new Error('La cámara requiere HTTPS y un navegador compatible.');
                err.name = 'AppCameraUnsupportedError';
                throw err;
            }
            if (_appCamInflight) return _appCamInflight; // doble toque: misma solicitud
            _appCamInflight = (async () => {
                const hadLive = [..._appCamStreams].some(_camLive);
                releaseAppCameraStreams();
                if (hadLive) await _camWait(250); // dar tiempo a que el hardware se libere
                let s;
                try {
                    s = await _openCameraWithFallback();
                } catch (err) {
                    if (err && ['NotReadableError', 'TrackStartError', 'AbortError'].includes(err.name)) {
                        await _camWait(600); // un reintento: la cámara a veces tarda en quedar libre
                        try { s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
                        catch (_) { throw err; } // se informa el error original
                    } else {
                        throw err;
                    }
                }
                _appCamStreams.add(s);
                return s;
            })();
            try { return await _appCamInflight; } finally { _appCamInflight = null; }
        }
        window.requestAppCameraStream = requestAppCameraStream;
        // Al salir de la página, soltar la cámara
        window.addEventListener('pagehide', releaseAppCameraStreams);

        function getAppCameraErrorMessage(err) {
            const name = err && err.name ? err.name : '';
            console.warn('[NelsonApp cámara]', name, err && err.message ? err.message : err);
            if (name === 'AppCameraUnsupportedError' || name === 'SecurityError')
                return 'La cámara necesita abrir NelsonApp desde su dirección HTTPS. No funciona desde un archivo local o un contexto no seguro.';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
                return 'El navegador bloqueó el permiso de cámara. En la configuración del sitio, permite Cámara y vuelve a intentarlo; revisa también el permiso de cámara de Android para el navegador.';
            if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
                return 'No se encontró una cámara disponible en este dispositivo.';
            if (name === 'NotReadableError' || name === 'TrackStartError')
                return 'La cámara está ocupada por otra aplicación o pestaña. Cierra otras apps y navegadores que la usen (incluido Firefox si lo tienes abierto) y vuelve a intentarlo.'
                    + ' [Detalle: ' + name + (err && err.message ? ' · ' + String(err.message).slice(0, 80) : '') + ']';
            if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError')
                return 'No se encontró una cámara compatible. Prueba cerrar y volver a abrir la cámara.';
            return 'No se pudo iniciar la cámara (' + (name || 'error desconocido') + '). Revisa los permisos del sitio y vuelve a intentarlo.';
        }
        window.getAppCameraErrorMessage = getAppCameraErrorMessage;

        // ── Sincroniza la versión en splash y créditos desde window.APP_VERSION ──
        (function syncAppVersion() {
            try {
                const v = window.APP_VERSION || 'v3.4.3';
                const ids = ['splash-version', 'credits-version', 'cfg-header-version'];
                ids.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = v;
                });
            } catch (e) { /* silencioso, no bloquea arranque */ }
        })();

        // ── PIN: PBKDF2-SHA256 con sal aleatoria (nunca en texto plano) ──
        // Formato guardado: "pbkdf2$<iteraciones>$<sal hex>$<hash hex>".
        // Los PIN antiguos (SHA-256 sin sal) se siguen aceptando y se migran solos al desbloquear.
        const _PIN_ITER = 150000;
        function _toHex(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(''); }
        function _fromHex(hex) { const out = new Uint8Array(hex.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16); return out; }
        async function _pbkdf2Hex(pin, salt, iter) {
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
            return _toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, key, 256));
        }
        async function _hashPin(pin) {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            return 'pbkdf2$' + _PIN_ITER + '$' + _toHex(salt) + '$' + await _pbkdf2Hex(pin, salt, _PIN_ITER);
        }
        function _pinIsLegacy(stored) { return !stored || stored.indexOf('pbkdf2$') !== 0; }
        async function _verifyPin(pin, stored) {
            stored = stored || _pinHash;
            if (!stored) return false;
            let a, b;
            if (_pinIsLegacy(stored)) {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + '_nelsonapp_v1'));
                a = _toHex(buf); b = stored;
            } else {
                const p = stored.split('$');
                if (p.length !== 4) return false;
                a = await _pbkdf2Hex(pin, _fromHex(p[2]), parseInt(p[1], 10) || _PIN_ITER); b = p[3];
            }
            if (a.length !== b.length) return false;
            let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
            return diff === 0;
        }
        let _pinHash = null; // hash PBKDF2 del PIN activo

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

