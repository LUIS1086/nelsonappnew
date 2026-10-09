/* Nelson App Pro · js/modules/06-init-app.js
   Arranque de la app y migraciones de stock
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== FUNCIONES PRINCIPALES ====================
        // OPTIMIZACIÓN: arranque escalonado en 3 fases.
        // Fase 1 (crítica, síncrona): UI visible y usable al instante.
        // Fase 2 (defer suave): checks de datos y UI secundaria, ~200ms después.
        // Fase 3 (idle): migraciones, reconexión Drive, push permission, cuando el navegador esté ocioso.
        async function initApp() {
            // ═══ FASE 1: CRÍTICA ═══ Lo que el usuario necesita ver ya
            applyStoredTheme();
            applyAccentColor();
            applyTallerBtnColor();
            applyFontSize();
            applyHighContrast();
            loadBusinessConfig();
            await openDB();
            await updateTotal();
            await updateSuggestions();
            await renderCartera();
            updateMetaBar();
            resetLockTimer();
            _refreshTecnicosSelects();
            _renderBiometricToggle();

            // ═══ FASE 2: DEFER SUAVE ═══ Checks y configuraciones que pueden esperar un frame
            setTimeout(() => {
                try {
                    checkLowStock();
                    checkOverdueOrders();
                    checkUnclaimedRepairs();
                    checkWarrantyAlerts();
                    checkSinMovimiento();
                    loadLowStockThreshold();
                    loadBackupInterval();
                    setupReminderChecks();
                    startAutoBackup();
                    loadAutoThemeConfig();
                    startAutoThemeWatcher();
                } catch(e) { console.warn('Fase 2 init:', e); }
            }, 200);

            // ═══ FASE 3: IDLE ═══ Lo no urgente: permisos, reconexión Drive, migraciones
            const runIdle = (fn) => {
                if (window.requestIdleCallback) {
                    requestIdleCallback(fn, { timeout: 3000 });
                } else {
                    setTimeout(fn, 1500);
                }
            };
            runIdle(async () => {
                try {
                    requestNotificationPermission();
                    requestPushPermission();
                    tryDriveReconnect();
                    await _migrateStockFields();
                    // Verificar si es la primera vez que se abre la app → mostrar tour
                    _maybeShowTourOnStart();
                } catch(e) { console.warn('Fase 3 init:', e); }
            });
        }

        // ==================== MIGRACIÓN DE CAMPOS STOCK ====================
        // Helper: normaliza un item de stock al formato canónico (nombres cortos)
        // Útil como red de seguridad si en algún backup viejo entran items con campos largos
        function _normStock(s) {
            if (!s || typeof s !== 'object') return s;
            // Si solo tiene nombres largos, copiar al corto
            if (s.n        === undefined && s.name     !== undefined) s.n        = s.name;
            if (s.p        === undefined && s.price    !== undefined) s.p        = s.price;
            if (s.q        === undefined && s.qty      !== undefined) s.q        = s.qty;
            if (s.cat      === undefined && s.category !== undefined) s.cat      = s.category;
            if (s.minStock === undefined && s.minimo   !== undefined) s.minStock = s.minimo;
            return s;
        }
        // Unifica los campos del stock dejando SOLO los nombres cortos canónicos:
        // {n, p, q, cat, minStock, cost, code, supplier, notes, img}
        // Si encuentra los nombres largos {name, price, qty, category, minimo} los
        // copia a los cortos (si los cortos faltan) y luego ELIMINA los largos.
        // Esto previene desincronización entre lecturas/escrituras.
        async function _migrateStockFields() {
            try {
                const items = await getAll('stock');
                let migrated = 0;
                for (const s of items) {
                    let changed = false;
                    // 1) Si hay nombre largo y no corto → copiar al corto
                    if (s.name      !== undefined && s.n        === undefined) { s.n        = s.name;      changed = true; }
                    if (s.price     !== undefined && s.p        === undefined) { s.p        = s.price;     changed = true; }
                    if (s.qty       !== undefined && s.q        === undefined) { s.q        = s.qty;       changed = true; }
                    if (s.category  !== undefined && s.cat      === undefined) { s.cat      = s.category;  changed = true; }
                    if (s.minimo    !== undefined && s.minStock === undefined) { s.minStock = s.minimo;    changed = true; }

                    // 2) Eliminar campos largos duplicados (siempre, si existen)
                    if (s.name     !== undefined) { delete s.name;     changed = true; }
                    if (s.price    !== undefined) { delete s.price;    changed = true; }
                    if (s.qty      !== undefined) { delete s.qty;      changed = true; }
                    if (s.category !== undefined) { delete s.category; changed = true; }
                    if (s.minimo   !== undefined) { delete s.minimo;   changed = true; }

                    // 3) Asegurar tipos correctos en los campos canónicos
                    if (s.q !== undefined && typeof s.q !== 'number') { s.q = parseInt(s.q) || 0; changed = true; }
                    if (s.p !== undefined && typeof s.p !== 'number') { s.p = parseFloat(s.p) || 0; changed = true; }
                    if (s.cost !== undefined && typeof s.cost !== 'number') { s.cost = parseFloat(s.cost) || 0; changed = true; }
                    if (s.minStock !== undefined && typeof s.minStock !== 'number') { s.minStock = parseInt(s.minStock) || 0; changed = true; }

                    if (changed) { await put('stock', s); migrated++; }
                }
                if (migrated > 0) console.log(`[NelsonApp] Stock: ${migrated} items normalizados (campos unificados)`);
            } catch(e) { console.warn('[NelsonApp] Error en migración de stock:', e); }
        }

        function _refreshTecnicosSelects() {
            const tecnicos = getTecnicos();
            const opts = '<option value="">Sin asignar</option>' + tecnicos.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
            ['c-tecnico','edit-tecnico'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { const prev = el.value; el.innerHTML = opts; el.value = prev; }
            });
            // Filtro de técnicos
            const ft = document.getElementById('filter-tecnico');
            if (ft) {
                const prev = ft.value;
                ft.innerHTML = '<option value="">Todos los técnicos</option>' + tecnicos.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
                ft.value = prev;
            }
        }

