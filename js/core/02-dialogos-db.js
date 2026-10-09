/* Nelson App Pro · js/core/02-dialogos-db.js
   Alertas/confirmaciones y capa IndexedDB (openDB, getAll, put, del)
   (extraido sin cambios de index.html; el orden de carga importa) */
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
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0d0f1a;color:#e8eaf6;padding:32px;text-align:center;font-family:sans-serif;">
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
                request.onerror = (e) => {
                    const err = request.error || e.target.error;
                    _showDBError('No se pudo abrir la base de datos local. (' + (err?.message || 'Error desconocido') + ')');
                    reject(err);
                };
                request.onsuccess = () => {
                    db = request.result;
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

