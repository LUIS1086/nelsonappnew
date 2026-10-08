/* NelsonApp — 00-foundation.js
 * Núcleo, helpers, almacenamiento, autenticación y arranque
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */

        // ==================== CONFIGURACIÓN INICIAL ====================
        const DB_NAME = 'NelsonAppPro';
        window.APP_VERSION = 'v3.3.0'; // Única fuente de verdad para la versión de la app

        // ── Compatibilidad entre navegadores ──
        // Fecha local YYYY-MM-DD (toISOString() usa UTC y en Colombia da "mañana" después de las 7 p.m.)
        window._ymdLocal = function(d) {
            d = d instanceof Date ? d : new Date(d);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };
        // Copiar al portapapeles con respaldo para WebViews, http y Safari antiguo
        window._copyText = async function(text) {
            text = String(text == null ? '' : text);
            try {
                if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
            } catch (_) {}
            const ta = document.createElement('textarea');
            ta.value = text; ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { ta.setSelectionRange(0, text.length); } catch (_) {}
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (_) {}
            ta.remove();
            if (!ok) throw new Error('No se pudo copiar');
            return true;
        };
        // Redimensiona y comprime una imagen (File/Blob) antes de guardarla. Evita llenar localStorage/IndexedDB con fotos de 5-10 MB.
        window._resizeImage = function(file, maxDim, quality, mime) {
            return new Promise(function(resolve, reject) {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = function() {
                    try {
                        let w = img.naturalWidth, h = img.naturalHeight;
                        const k = Math.min(1, maxDim / Math.max(w, h));
                        w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
                        const c = document.createElement('canvas');
                        c.width = w; c.height = h;
                        const ctx = c.getContext('2d');
                        if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(c.toDataURL(mime, quality));
                    } catch (e) { reject(e); }
                    finally { URL.revokeObjectURL(url); }
                };
                img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Imagen no válida')); };
                img.src = url;
            });
        };
        // Escáner: Chrome/Edge lo traen nativo; en Safari/iPhone/Firefox se carga un polyfill solo cuando se necesita
        window._ensureBarcodeDetector = function() {
            if ('BarcodeDetector' in window) return Promise.resolve(true);
            if (window._bdPromise) return window._bdPromise;
            window._bdPromise = new Promise(function(resolve) {
                const sc = document.createElement('script');
                sc.src = 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/iife/polyfill.min.js';
                sc.async = true;
                sc.onload  = function() { resolve('BarcodeDetector' in window); };
                sc.onerror = function() { window._bdPromise = null; resolve(false); };
                document.head.appendChild(sc);
            });
            return window._bdPromise;
        };
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

        // ==================== MODALES PERSONALIZADOS ====================
        function showAlert(msg, type = 'info', onOk = null) {
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            document.getElementById('cm-icon').innerText = icons[type] || 'ℹ️';
            document.getElementById('cm-msg').innerText = msg;
            document.getElementById('cm-buttons').innerHTML = `<button id="cm-ok" class="flex-1 py-4 font-black text-sm uppercase text-white bg-orange-600 hover:bg-orange-500 active:scale-95 transition">Aceptar</button>`;
            document.getElementById('custom-modal').classList.remove('hidden');
            document.getElementById('cm-ok').onclick = () => { document.getElementById('custom-modal').classList.add('hidden'); if (onOk) onOk(); };
        }
        function showConfirm(msg, onConfirm, type = 'warning') {
            const icons = { warning: '⚠️', error: '❌', info: '❓' };
            document.getElementById('cm-icon').innerText = icons[type] || '❓';
            document.getElementById('cm-msg').innerText = msg;
            document.getElementById('cm-buttons').innerHTML = `
                <button id="cm-cancel" class="flex-1 py-4 font-black text-sm uppercase text-slate-300 bg-slate-700 hover:bg-slate-600 active:scale-95 transition">Cancelar</button>
                <button id="cm-confirm" class="flex-1 py-4 font-black text-sm uppercase text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition">Confirmar</button>`;
            document.getElementById('custom-modal').classList.remove('hidden');
            document.getElementById('cm-cancel').onclick = () => document.getElementById('custom-modal').classList.add('hidden');
            document.getElementById('cm-confirm').onclick = () => { document.getElementById('custom-modal').classList.add('hidden'); onConfirm(); };
        }

        // IndexedDB helpers
        function _showDBError(msg) {
            // Pantalla de error crítico en vez de pantalla negra
            document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;background:#0d0f1a;color:#e8eaf6;padding:32px;text-align:center;font-family:sans-serif;">
                <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
                <h2 style="font-size:18px;font-weight:900;color:#f43f5e;margin-bottom:8px;">Error de Base de Datos</h2>
                <p style="font-size:13px;color:#6b7a99;max-width:320px;line-height:1.6;margin-bottom:24px;">${msg}<br><br>Intenta cerrar y volver a abrir la app. Si el problema persiste, exporta tus datos desde Configuración antes de reinstalar.</p>
                <button onclick="location.reload()" style="background:#f97316;color:white;border:none;padding:14px 28px;border-radius:14px;font-size:14px;font-weight:900;cursor:pointer;">🔄 Reintentar</button>
            </div>`;
        }

        function openDB() {
            return new Promise((resolve, reject) => {
                if (db && db.name === DB_NAME) return resolve(db);
                const request = indexedDB.open(DB_NAME, 15);
                request.onblocked = () => { try { showAlert('Cierra las otras pestañas o ventanas de la app y vuelve a intentar.', 'warning'); } catch(_) {} };
                request.onerror = (e) => {
                    const err = request.error || e.target.error;
                    _showDBError('No se pudo abrir la base de datos local. (' + (err?.message || 'Error desconocido') + ')');
                    reject(err);
                };
                request.onsuccess = () => {
                    db = request.result;
                    db.onversionchange = () => {
                        try { db.close(); } catch(_) {}
                        db = null;
                        try { showAlert('Se abrió una versión más nueva de la app en otra pestaña. Recarga esta página.', 'warning'); } catch(_) {}
                    };
                    // Manejar errores en transacciones futuras
                    db.onerror = (e) => console.warn('IndexedDB error:', e.target.error);
                    resolve(db);
                };
                request.onupgradeneeded = (event) => {
                    const idb = event.target.result;
                    if (!idb.objectStoreNames.contains('orders')) {
                        const store = idb.createObjectStore('orders', { keyPath: 'id' });
                        store.createIndex('fecha', 'fecha');
                        store.createIndex('nom', 'nom');
                    }
                    if (!idb.objectStoreNames.contains('stock'))        idb.createObjectStore('stock',        { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('sales'))        idb.createObjectStore('sales',        { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('gastos'))       idb.createObjectStore('gastos',       { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('clientes'))     idb.createObjectStore('clientes',     { keyPath: 'nombre' });
                    if (!idb.objectStoreNames.contains('payments'))     idb.createObjectStore('payments',     { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('config'))       idb.createObjectStore('config',       { keyPath: 'key' });
                    if (!idb.objectStoreNames.contains('stockHistory')) idb.createObjectStore('stockHistory', { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('changelog')) {
                        const cl = idb.createObjectStore('changelog', { keyPath: 'id' });
                        cl.createIndex('ordenId', 'ordenId');
                    }
                    if (!idb.objectStoreNames.contains('proveedores'))  idb.createObjectStore('proveedores',  { keyPath: 'id' });
                    // v11
                    if (!idb.objectStoreNames.contains('orderChat')) {
                        const oc = idb.createObjectStore('orderChat', { keyPath: 'id' });
                        oc.createIndex('ordenId', 'ordenId');
                    }
                    if (!idb.objectStoreNames.contains('paymentPlans')) idb.createObjectStore('paymentPlans', { keyPath: 'id' });
                    if (!idb.objectStoreNames.contains('calificaciones')) idb.createObjectStore('calificaciones', { keyPath: 'id' });
                    // v15: store de salud de la app
                    if (!idb.objectStoreNames.contains('appHealth'))    idb.createObjectStore('appHealth',    { keyPath: 'key' });
                };
            });
        }

        // ═══ CACHE EN MEMORIA DE getAll (v1) ═══
        // Guarda los resultados de getAll para no re-leer la misma store múltiples veces.
        // Se invalida automáticamente cada vez que put/del/clearStore modifican una store.
        // TTL también de 3s como red de seguridad por si algo externo modifica la DB.
        const _dbCache = {};          // { storeName: { data: [...], ts: timestamp } }
        const _CACHE_TTL = 3000;       // 3 segundos
        function _invalidateCache(store) {
            if (store) delete _dbCache[store];
            else Object.keys(_dbCache).forEach(k => delete _dbCache[k]);
        }

        async function getAll(store) {
            // Si hay cache válido, retornar copia rápida
            const cached = _dbCache[store];
            if (cached && (Date.now() - cached.ts) < _CACHE_TTL) {
                return cached.data.slice();  // copia para que no mutten el cache
            }
            await openDB();
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(store, 'readonly');
                    const req = tx.objectStore(store).getAll();
                    req.onsuccess = () => {
                        const data = req.result || [];
                        _dbCache[store] = { data, ts: Date.now() };
                        resolve(data.slice());
                    };
                    req.onerror = () => resolve([]);
                } catch(e) { resolve([]); }
            });
        }
        async function getOne(store, key) {
            await openDB();
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(store, 'readonly');
                    const req = tx.objectStore(store).get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => { console.warn('[IDB getOne] error:', req.error); resolve(null); };
                    tx.onabort = () => { console.warn('[IDB getOne] tx abort:', tx.error); resolve(null); };
                } catch(e) { console.warn('[IDB getOne] excepción:', e); resolve(null); }
            });
        }
        // Mostrador de error de IDB: solo una vez cada 30s para no saturar al usuario
        let _idbErrorLastShown = 0;
        function _idbNotifyError(err, op) {
            const now = Date.now();
            if (now - _idbErrorLastShown < 30000) return;
            _idbErrorLastShown = now;
            const isQuota = err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''));
            const msg = isQuota
                ? '⚠️ Almacenamiento lleno. Exporta un respaldo y elimina órdenes antiguas.'
                : `⚠️ Error guardando datos (${op}). Intenta de nuevo.`;
            try { showToast(msg, 'error'); } catch(_){}
        }
        async function put(store, item) {
            await openDB();
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(store, 'readwrite');
                    const req = tx.objectStore(store).put(item);
                    req.onsuccess = () => { _invalidateCache(store); resolve(true); };
                    req.onerror = () => { console.warn('[IDB put] error:', req.error); _idbNotifyError(req.error, 'put'); resolve(false); };
                    tx.onabort = () => { console.warn('[IDB put] tx abort:', tx.error); _idbNotifyError(tx.error, 'put'); resolve(false); };
                } catch(e) { console.warn('[IDB put] excepción:', e); _idbNotifyError(e, 'put'); resolve(false); }
            });
        }
        async function del(store, id) {
            await openDB();
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(store, 'readwrite');
                    const req = tx.objectStore(store).delete(id);
                    req.onsuccess = () => { _invalidateCache(store); resolve(true); };
                    req.onerror = () => { console.warn('[IDB del] error:', req.error); _idbNotifyError(req.error, 'del'); resolve(false); };
                    tx.onabort = () => { console.warn('[IDB del] tx abort:', tx.error); _idbNotifyError(tx.error, 'del'); resolve(false); };
                } catch(e) { console.warn('[IDB del] excepción:', e); _idbNotifyError(e, 'del'); resolve(false); }
            });
        }
        async function clearStore(store) {
            await openDB();
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(store, 'readwrite');
                    const req = tx.objectStore(store).clear();
                    req.onsuccess = () => { _invalidateCache(store); resolve(true); };
                    req.onerror = () => { console.warn('[IDB clear] error:', req.error); _idbNotifyError(req.error, 'clear'); resolve(false); };
                    tx.onabort = () => { console.warn('[IDB clear] tx abort:', tx.error); _idbNotifyError(tx.error, 'clear'); resolve(false); };
                } catch(e) { console.warn('[IDB clear] excepción:', e); _idbNotifyError(e, 'clear'); resolve(false); }
            });
        }

        // ==================== PIN AUTH ====================
        // Función reutilizable: lo que pasa cuando el usuario se autentica con éxito
        // (ya sea por PIN correcto o por huella). Centraliza el flujo de desbloqueo.
        async function _unlockAppFromAuth() {
            document.getElementById('pin-modal').classList.add('hidden');
            document.getElementById('app-header').classList.remove('hidden');
            document.querySelectorAll('.app-view').forEach(v => v.classList.remove('hidden'));
            await initApp();
            // Manejar navegación/acción venida desde dashboard.html
            const dashTab    = sessionStorage.getItem('dashGoTab');
            const dashAction = sessionStorage.getItem('dashAction');
            sessionStorage.removeItem('dashGoTab');
            sessionStorage.removeItem('dashAction');
            if (dashTab) {
                tab(dashTab);
            } else if (dashAction === 'caja' || dashAction === 'report' || dashAction === 'stats') {
                tab('ventas');
            } else {
                tab('taller');
            }
            if (dashAction) {
                setTimeout(() => {
                    if (dashAction === 'notify') notifyAllReady();
                    if (dashAction === 'report') exportMonthlyReport();
                    if (dashAction === 'stats')  openStatsModal();
                    if (dashAction === 'caja')   openCajaModal();
                }, 350);
            }
            if (!localStorage.getItem('tutorialShown')) {
                const _biz = _safeBizConfig();
                const _bizName = _biz.name || 'Todo Repuestos Nelson';
                setTimeout(() => showAlert(`👋 ¡Bienvenido a ${_bizName}!\n\nDesliza entre pestañas, toca el nombre de un cliente para ver su historial, y usa el escáner 📷 en inventario.`, "info"), 600);
                localStorage.setItem('tutorialShown', 'true');
            }
        }

        async function verifyPin() {
            const input = document.getElementById('pin-input').value;
            const inputHash = await _hashPin(input);
            if (inputHash === _pinHash) {
                // Animación de éxito en dots + pequeña vibración positiva
                document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                    d.classList.add('success');
                });
                if (navigator.vibrate) { try { navigator.vibrate(25); } catch(_) {} }
                setTimeout(() => { _unlockAppFromAuth(); }, 300);
            } else {
                // PIN incorrecto: shake + vibración + dots en rojo
                const dotsContainer = document.getElementById('pin-dots');
                dotsContainer.classList.add('shake');
                document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                    d.classList.add('error');
                });
                // Vibración háptica en móviles compatibles
                if (navigator.vibrate) {
                    try { navigator.vibrate([60, 40, 60]); } catch(_) {}
                }
                setTimeout(() => {
                    dotsContainer.classList.remove('shake');
                    document.querySelectorAll('#pin-dots .pin-dot').forEach(d => {
                        d.classList.remove('error', 'filled');
                        d.style.background = '';
                        d.style.borderColor = '';
                    });
                    updatePinOkState();
                }, 550);
                document.getElementById('pin-input').value = '';
                document.getElementById('pin-error').innerText = '⚠️ PIN incorrecto';
                pinBuffer = '';
            }
        }

        function openChangePinModal() { document.getElementById('modal-pin-change').classList.remove('hidden'); }
        async function changePin() {
            const newPin     = document.getElementById('new-pin').value;
            const confirmPin = document.getElementById('confirm-pin').value;
            if (!/^\d{4,6}$/.test(newPin))    return showAlert("El PIN debe tener entre 4 y 6 dígitos numéricos.", "warning");
            if (newPin !== confirmPin)          return showAlert("Los PIN no coinciden. Inténtalo de nuevo.", "warning");
            _pinHash = await _hashPin(newPin);
            localStorage.setItem('appPinHash', _pinHash);
            localStorage.removeItem('appPin'); // asegurar que no quede texto plano
            closePinChangeModal();
            showAlert("PIN actualizado correctamente. ✅", "success");
        }
        function closePinChangeModal() { document.getElementById('modal-pin-change').classList.add('hidden'); }

        // ==================== HUELLA DIGITAL (WebAuthn) ====================
        // Implementación premium de biometría usando la API estándar WebAuthn.
        // Funciona en Chrome (PWABuilder/TWA, Chrome móvil, Chrome desktop).
        // El "secreto" nunca sale del dispositivo: la verificación es local.
        const _BIO_KEY_ENABLED = 'appBiometricEnabled';
        const _BIO_KEY_CRED    = 'appBiometricCredentialId';

        function isBiometricEnabled() {
            return localStorage.getItem(_BIO_KEY_ENABLED) === '1' && !!localStorage.getItem(_BIO_KEY_CRED);
        }

        async function _isBiometricAvailable() {
            if (!window.PublicKeyCredential) return false;
            if (!window.isSecureContext && location.hostname !== 'localhost') return false;
            try {
                return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            } catch(_) { return false; }
        }

        // Helpers base64 ↔ ArrayBuffer
        function _b64ToBuf(b64) {
            const bin = atob(b64.replace(/-/g,'+').replace(/_/g,'/'));
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            return buf;
        }
        function _bufToB64(buf) {
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            return btoa(bin);
        }

        // Registrar huella nueva (lo invoca el toggle al activarse)
        async function enableBiometric() {
            if (!await _isBiometricAvailable()) {
                showAlert('Tu dispositivo no soporta huella digital o no tienes una huella registrada en el sistema. Configúrala primero en los ajustes de tu teléfono.', 'warning');
                return false;
            }
            try {
                const biz = _safeBizConfig();
                const rpName = biz.name || 'Todo Repuestos Nelson';
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const userId    = crypto.getRandomValues(new Uint8Array(16));
                const cred = await navigator.credentials.create({
                    publicKey: {
                        challenge,
                        rp: { name: rpName },
                        user: { id: userId, name: 'owner', displayName: rpName },
                        pubKeyCredParams: [
                            { type: 'public-key', alg: -7   }, // ES256
                            { type: 'public-key', alg: -257 }  // RS256
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: 'platform',
                            userVerification: 'required',
                            residentKey: 'preferred'
                        },
                        timeout: 60000,
                        attestation: 'none'
                    }
                });
                if (!cred || !cred.rawId) return false;
                localStorage.setItem(_BIO_KEY_CRED, _bufToB64(cred.rawId));
                localStorage.setItem(_BIO_KEY_ENABLED, '1');
                return true;
            } catch(e) {
                console.warn('[biometric register]', e);
                if (e && e.name === 'NotAllowedError') {
                    // Usuario canceló o se agotó el tiempo: silencio, no spamear alertas
                    return false;
                }
                showAlert('No se pudo registrar la huella. ' + (e.message || 'Inténtalo de nuevo.'), 'error');
                return false;
            }
        }

        function disableBiometric() {
            localStorage.removeItem(_BIO_KEY_ENABLED);
            localStorage.removeItem(_BIO_KEY_CRED);
        }

        // Verificar huella (intenta autenticar y, si pasa, desbloquea la app)
        async function verifyBiometricUnlock() {
            if (!isBiometricEnabled()) return;
            const btn   = document.getElementById('biometric-pin-btn');
            const label = document.getElementById('biometric-pin-label');
            if (!btn) return;
            // Reset visual
            btn.classList.remove('success','error');
            btn.classList.add('scanning');
            if (label) label.textContent = 'Coloca tu huella…';
            try {
                const credIdB64 = localStorage.getItem(_BIO_KEY_CRED);
                const challenge = crypto.getRandomValues(new Uint8Array(32));
                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge,
                        allowCredentials: [{
                            type: 'public-key',
                            id: _b64ToBuf(credIdB64),
                            transports: ['internal']
                        }],
                        userVerification: 'required',
                        timeout: 60000
                    }
                });
                btn.classList.remove('scanning');
                if (!assertion) throw new Error('Sin respuesta del autenticador');
                btn.classList.add('success');
                if (label) label.textContent = '¡Bienvenido!';
                if (navigator.vibrate) { try { navigator.vibrate(25); } catch(_) {} }
                setTimeout(() => { _unlockAppFromAuth(); }, 380);
            } catch(e) {
                console.warn('[biometric verify]', e);
                btn.classList.remove('scanning');
                btn.classList.add('error');
                if (label) {
                    if (e && e.name === 'NotAllowedError') {
                        label.textContent = 'Cancelado · usa tu PIN';
                    } else {
                        label.textContent = 'No reconocida · usa tu PIN';
                    }
                }
                if (navigator.vibrate) { try { navigator.vibrate([60,40,60]); } catch(_) {} }
                setTimeout(() => {
                    btn.classList.remove('error');
                    if (label) label.textContent = 'Toca para usar huella';
                }, 1800);
            }
        }

        // Render del botón de huella en el modal de PIN (mostrar/ocultar según estado)
        function _renderBiometricInPinModal() {
            const wrap  = document.getElementById('biometric-pin-wrap');
            const label = document.getElementById('biometric-pin-label');
            const btn   = document.getElementById('biometric-pin-btn');
            if (!wrap) return;
            if (isBiometricEnabled()) {
                wrap.classList.remove('hidden');
                if (btn) btn.classList.remove('scanning','success','error');
                if (label) label.textContent = 'Toca para usar huella';
            } else {
                wrap.classList.add('hidden');
            }
        }

        // Render del switch en settings
        async function _renderBiometricToggle() {
            const sw  = document.getElementById('biometric-switch');
            const sub = document.getElementById('biometric-row-sub');
            const row = document.getElementById('biometric-row');
            if (!sw) return;
            const supported = await _isBiometricAvailable();
            if (!supported) {
                sw.classList.remove('active');
                if (sub) sub.textContent = 'No disponible en este dispositivo';
                if (row) row.style.opacity = '0.55';
                return;
            }
            if (row) row.style.opacity = '';
            if (isBiometricEnabled()) {
                sw.classList.add('active');
                if (sub) sub.textContent = 'Activa · toca para desactivar';
            } else {
                sw.classList.remove('active');
                if (sub) sub.textContent = 'Acceso rápido y seguro';
            }
        }

        // Toggle: activar o desactivar huella
        async function toggleBiometric() {
            const supported = await _isBiometricAvailable();
            if (!supported) {
                showAlert('Tu dispositivo no soporta huella digital, o no tienes una huella registrada en el sistema. Configúrala primero en los ajustes de tu teléfono.', 'warning');
                return;
            }
            if (isBiometricEnabled()) {
                // Desactivar (con confirmación)
                if (confirm('¿Desactivar el desbloqueo con huella?\nSeguirás pudiendo entrar con tu PIN.')) {
                    disableBiometric();
                    _renderBiometricToggle();
                    showAlert('Huella desactivada.', 'success');
                }
                return;
            }
            // Activar: pedir registro de huella
            const ok = await enableBiometric();
            await _renderBiometricToggle();
            if (ok) {
                if (navigator.vibrate) { try { navigator.vibrate(30); } catch(_) {} }
                showAlert('✅ Huella registrada.\nLa próxima vez podrás entrar tocando el sensor.', 'success');
            }
        }

        // Helper: muestra el modal de PIN y, si la huella está habilitada,
        // intenta autenticar automáticamente tras un breve delay para que
        // la animación del modal no se vea interrumpida.
        function showPinModal() {
            document.getElementById('pin-modal').classList.remove('hidden');
            _renderBiometricInPinModal();
            if (isBiometricEnabled()) {
                setTimeout(() => {
                    // Solo auto-trigger si el modal sigue visible (usuario no ha empezado a teclear)
                    const m = document.getElementById('pin-modal');
                    if (m && !m.classList.contains('hidden') && pinBuffer === '') {
                        verifyBiometricUnlock();
                    }
                }, 450);
            }
        }

        // ==================== TEMA CLARO / OSCURO ====================
        // NOTA: modo claro desactivado por ahora. La app mantiene su identidad "Taller Pro"
        // oscura de forma consistente. Muchas tarjetas (Menú Datos, Nelson IA, Google Drive,
        // modales) usan colores hardcoded que no respetan light-mode. Cuando queramos
        // retomar el tema claro, hay que pasar esas cards a variables CSS.
        function toggleTheme() {
            // Desactivado — si se llama, simplemente asegurar modo oscuro
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('appTheme', 'dark');
        }
        function applyStoredTheme() {
            // Siempre forzar modo oscuro
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem('appTheme', 'dark');
        }

        // (sidebar sync is embedded in tab() and syncSidebarCash() above)
        function showToast(msg, type = 'info') {
            const colors = { info: '#3b82f6', success: '#10b981', warning: '#f97316', error: '#ef4444' };
            const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
            const toast = document.createElement('div');
            toast.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);background:${colors[type]};color:white;padding:10px 18px;border-radius:999px;font-size:12px;font-weight:800;z-index:99999;opacity:0;transition:all 0.3s ease;max-width:90vw;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.4);`;
            toast.innerText = `${icons[type]} ${msg}`;
            document.body.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
        }

        function requestNotificationPermission() { /* No-op en WebView, usamos toasts internos */ }

        // ===== FUNCIÓN checkLowStock MODIFICADA para usar umbral configurable =====
        async function checkLowStock() {
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const stock = await getAll('stock');
            const low = stock.filter(s => s.q <= threshold && s.q > 0);
            if (low.length) showToast(`Stock bajo: ${low.length} productos con menos de ${threshold} unidades`, 'warning');
        }
        async function checkOverdueOrders() {
            const orders = await getAll('orders');
            const today = new Date();
            const overdue = orders.filter(o => o.sta !== 'entregado' && getBusinessDaysDiff(new Date(o.fecha), today) >= 60);
            if (overdue.length) showToast(`${overdue.length} órdenes con más de 60 días pendientes`, 'warning');
        }

        // Equipos REPARADOS que llevan +5 días sin ser recogidos → recordatorio al cliente
        async function checkUnclaimedRepairs() {
            try {
                // Solo si ya se mostró hoy, no repetir (una sola vez al día para no molestar)
                const today = _ymdLocal(new Date());
                const lastShown = localStorage.getItem('unclaimedCheckDate');
                if (lastShown === today) return;

                const orders = await getAll('orders');
                const now = Date.now();
                const cincoDias = 5 * 86400000;
                const candidates = orders.filter(o => {
                    if (o.sta !== 'reparado') return false;
                    if (!o.tel) return false;
                    const ref = o.fechaReparado || o.fechaEstado || o.fecha || 0;
                    const dias = (now - ref) / 86400000;
                    // Llevan más de 5 días reparados
                    if (dias < 5) return false;
                    // No han sido avisados O el último aviso fue hace +3 días
                    if (!o.lastNotified) return true;
                    return (now - o.lastNotified) > 3 * 86400000;
                });

                if (candidates.length === 0) return;

                localStorage.setItem('unclaimedCheckDate', today);
                // Mensaje sutil en vez de bloqueante
                setTimeout(() => {
                    showToast(`🔔 ${candidates.length} equipo${candidates.length !== 1 ? 's' : ''} reparado${candidates.length !== 1 ? 's' : ''} esperando al cliente hace varios días. Toca para avisar.`, 'info', 7000);
                }, 2500);
            } catch(e) { console.warn('[checkUnclaimedRepairs]', e); }
        }
        setInterval(() => { checkLowStock(); checkOverdueOrders(); }, 3600000);

