/* NelsonApp — 50-drive-reports.js
 * Google Drive, técnicos, reportes y órdenes de compra
 * Script clásico secuencial: se conserva el scope global deliberadamente.
 */
        // ==================== GOOGLE DRIVE ====================
        const DRIVE_CLIENT_ID = '1048860878818-srq77k0q63bbka6p9k0m55jah31gkmnt.apps.googleusercontent.com';
        const DRIVE_SCOPES    = 'https://www.googleapis.com/auth/drive.file';
        const DRIVE_FOLDER    = 'NelsonApp_Backups';
        let driveToken = null;
        let driveFolderId = null;
        let driveTokenClient = null;       // Cliente OAuth reutilizable (se crea una sola vez)
        let driveTokenExpiresAt = 0;       // Timestamp (ms) de cuándo expira el token
        let driveRefreshTimerId = null;    // ID del setTimeout para refresh proactivo

        // Crea (o retorna) el cliente OAuth. Reutilizamos el mismo cliente para todas
        // las operaciones (sign in inicial + renovaciones silenciosas).
        function getDriveTokenClient() {
            if (driveTokenClient) return driveTokenClient;
            if (!window.google || !google.accounts) return null;
            driveTokenClient = google.accounts.oauth2.initTokenClient({
                client_id: DRIVE_CLIENT_ID,
                scope: DRIVE_SCOPES,
                callback: () => {} // sobrescrito antes de cada requestAccessToken
            });
            return driveTokenClient;
        }

        // Renueva el token SIN mostrar popup, usando la sesión activa de Google.
        // Funciona si el usuario sigue logueado en Google en este navegador/WebView.
        function driveSilentRefresh() {
            return new Promise((resolve, reject) => {
                if (!navigator.onLine) { reject(new Error('sin conexión')); return; }
                const client = getDriveTokenClient();
                if (!client) { reject(new Error('GIS no cargado aún')); return; }
                // prompt '' = intento silencioso (no pide confirmación al usuario)
                client.callback = (resp) => {
                    if (resp && resp.error) { reject(new Error(resp.error)); return; }
                    if (!resp || !resp.access_token) { reject(new Error('sin token')); return; }
                    driveToken = resp.access_token;
                    sessionStorage.setItem('driveToken', driveToken);
                    const lifeMs = (parseInt(resp.expires_in, 10) || 3600) * 1000;
                    driveTokenExpiresAt = Date.now() + lifeMs;
                    localStorage.setItem('driveTokenExpiresAt', String(driveTokenExpiresAt));
                    scheduleNextDriveRefresh();
                    console.log('[Drive] Token renovado silenciosamente, expira en', Math.round(lifeMs/60000), 'min');
                    resolve(driveToken);
                };
                try {
                    client.requestAccessToken({ prompt: '' });
                } catch(e) { reject(e); }
            });
        }

        // Programa la próxima renovación 5 minutos antes de que expire el token
        function scheduleNextDriveRefresh() {
            if (driveRefreshTimerId) { clearTimeout(driveRefreshTimerId); driveRefreshTimerId = null; }
            if (!driveTokenExpiresAt) return;
            const msLeft = driveTokenExpiresAt - Date.now() - (5 * 60 * 1000);
            // Mínimo 60s, máximo 55min (por si el sistema se despertó del sleep)
            const delay = Math.min(55 * 60 * 1000, Math.max(60 * 1000, msLeft));
            driveRefreshTimerId = setTimeout(() => {
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh proactivo falló:', e.message);
                    // Reintentar en 2 minutos si falló
                    driveRefreshTimerId = setTimeout(() => {
                        driveSilentRefresh().catch(() => {});
                    }, 2 * 60 * 1000);
                });
            }, delay);
        }


        // fetch a Drive con token, timeout y reintento automático si el token expiró (401)
        async function driveFetch(url, opts = {}, _retried = false) {
            if (!driveToken) throw Object.assign(new Error('No conectado a Drive'), { status: 401 });
            const { timeout = 30000, ...fetchOpts } = opts;
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeout);
            try {
                const resp = await fetch(url, {
                    ...fetchOpts,
                    headers: { ...(fetchOpts.headers || {}), Authorization: 'Bearer ' + driveToken },
                    signal: ctrl.signal
                });
                if (resp.status === 401 && !_retried) {
                    clearTimeout(timer);
                    await driveSilentRefresh();          // si falla, lanza y el llamador muestra "reconectar"
                    return driveFetch(url, opts, true);
                }
                return resp;
            } catch (e) {
                if (e.name === 'AbortError') throw new Error('Drive tardó demasiado en responder');
                throw e;
            } finally { clearTimeout(timer); }
        }

        // Garantiza un token vigente antes de respaldar/restaurar (renueva en silencio si está por vencer)
        async function _driveEnsureFresh() {
            if (!localStorage.getItem('driveEmail')) return !!driveToken;
            if (driveToken && (!driveTokenExpiresAt || driveTokenExpiresAt > Date.now() + 2 * 60 * 1000)) return true;
            try { await driveSilentRefresh(); return true; }
            catch (_) { return !!driveToken && driveTokenExpiresAt > Date.now(); }
        }

        // Retención: conserva los últimos N respaldos diarios y manda los más viejos a la papelera de Drive (recuperables 30 días)
        const DRIVE_KEEP_BACKUPS = 30;
        const DRIVE_KEEP_SAFETY  = 5;   // copias de seguridad previas a restaurar
        async function driveApplyRetention(folderId) {
            try {
                if (!folderId) return;
                const q = `'${folderId}' in parents and name contains 'nelson_backup_' and trashed=false`;
                const r = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=name desc&pageSize=200&fields=files(id,name)`);
                if (!r.ok) return;
                const all = (await r.json()).files || [];
                const daily  = all.filter(f => /^nelson_backup_\d{4}-\d{2}-\d{2}\.json$/.test(f.name));
                const safety = all.filter(f => /^nelson_backup_prerestore_/.test(f.name));
                for (const f of [...daily.slice(DRIVE_KEEP_BACKUPS), ...safety.slice(DRIVE_KEEP_SAFETY)]) {
                    await driveFetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true })
                    });
                }
            } catch (e) { console.warn('[Drive] Retención falló:', e.message); }
        }

        function driveSignIn() {
            if (!navigator.onLine) {
                showAlert('Sin conexión. Conecta a internet para iniciar sesión con Google.', 'warning'); return;
            }
            if (!window.google || !google.accounts) {
                showAlert('Google API aún cargando. Intenta en unos segundos.', 'warning'); return;
            }
            const client = getDriveTokenClient();
            if (!client) { showAlert('Google API aún cargando. Intenta en unos segundos.', 'warning'); return; }
            client.callback = async (resp) => {
                if (resp.error) { showAlert('Error al conectar con Google: ' + resp.error, 'error'); return; }
                driveToken = resp.access_token;
                sessionStorage.setItem('driveToken', driveToken);
                // Guardar timestamp de expiración para el sistema de refresh automático
                const lifeMs = (parseInt(resp.expires_in, 10) || 3600) * 1000;
                driveTokenExpiresAt = Date.now() + lifeMs;
                localStorage.setItem('driveTokenExpiresAt', String(driveTokenExpiresAt));
                scheduleNextDriveRefresh();
                try {
                    const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: 'Bearer ' + driveToken }
                    }).then(r => r.json());
                    localStorage.setItem('driveEmail', info.email || '');
                    updateDriveUI(true, info.email);
                } catch(e) { updateDriveUI(true, 'Conectado'); }
                await ensureDriveFolder();
                startAutoBackup(); // reiniciar respaldo automático al conectar
            };
            client.requestAccessToken();
        }

        function driveSignOut() {
            driveToken = null; driveFolderId = null; _driveFolderCheckedAt = 0;
            driveTokenExpiresAt = 0;
            if (driveRefreshTimerId) { clearTimeout(driveRefreshTimerId); driveRefreshTimerId = null; }
            sessionStorage.removeItem('driveToken');
            localStorage.removeItem('driveEmail');
            localStorage.removeItem('driveFolderId');
            localStorage.removeItem('driveTokenExpiresAt');
            updateDriveUI(false);
            if (autoBackupIntervalId) clearInterval(autoBackupIntervalId);
            autoBackupIntervalId = null;
            showToast('Sesión de Google cerrada', 'info');
        }

        function updateDriveUI(connected, email = '') {
            const statusText = document.getElementById('drive-status-text');
            const connectBtn = document.getElementById('drive-connect-btn');
            const actions    = document.getElementById('drive-actions');
            if (connected) {
                statusText.innerHTML = `<span class="text-emerald-400 font-bold">✅ ${email || 'Conectado'}</span>`;
                connectBtn.innerText = 'DESCONECTAR';
                connectBtn.onclick = driveSignOut;
                connectBtn.className = 'text-[10px] bg-slate-700 text-white px-4 py-2 rounded-xl font-black uppercase active:scale-95 transition';
                actions.classList.remove('hidden');
            } else {
                statusText.innerText = 'No conectado';
                connectBtn.innerText = 'CONECTAR';
                connectBtn.onclick = driveSignIn;
                connectBtn.className = 'text-[10px] bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase active:scale-95 transition';
                actions.classList.add('hidden');
            }
        }

        let _driveFolderCheckedAt = 0;
        async function ensureDriveFolder() {
            if (!driveToken) return null;
            try {
                // Carpeta ya verificada hace poco: no repetir la consulta
                if (driveFolderId && Date.now() - _driveFolderCheckedAt < 10 * 60 * 1000) return driveFolderId;
                const saved = localStorage.getItem('driveFolderId');
                if (saved) {
                    const chk = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(saved)}?fields=id,trashed`);
                    if (chk.ok) {
                        const meta = await chk.json();
                        if (!meta.trashed) { driveFolderId = saved; _driveFolderCheckedAt = Date.now(); return saved; }
                    }
                    localStorage.removeItem('driveFolderId');   // la borraron o está en la papelera → buscar/recrear
                    driveFolderId = null;
                }
                const q = `name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
                const search = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`).then(r => r.json());
                if (search.files && search.files.length > 0) {
                    driveFolderId = search.files[0].id;
                } else {
                    const created = await driveFetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' })
                    }).then(r => r.json());
                    driveFolderId = created.id || null;
                }
                if (driveFolderId) { localStorage.setItem('driveFolderId', driveFolderId); _driveFolderCheckedAt = Date.now(); }
                return driveFolderId;
            } catch(e) { console.warn('Drive folder error:', e); return null; }
        }

        // driveBackupNow ya está redefinido arriba con el parámetro silent
        // driveRestore original

        // Descarga desde Drive con progreso real usando XHR
        function downloadFromDriveWithProgress(fileId, token, onProgress) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                _activeDriveXhr = xhr;
                xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, true);
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.responseType = 'text';
                let lastProgressAt = Date.now();
                if (typeof onProgress === 'function') {
                    xhr.onprogress = (e) => {
                        lastProgressAt = Date.now();
                        if (e.lengthComputable) {
                            onProgress((e.loaded / e.total) * 100, e.loaded, e.total);
                        } else {
                            onProgress(-1, e.loaded, 0);
                        }
                    };
                }
                const watchdog = setInterval(() => {
                    if (Date.now() - lastProgressAt > 45000) {
                        const cancelBtn = document.getElementById('dup-cancel-btn');
                        if (cancelBtn) {
                            cancelBtn.style.background = 'rgba(244,63,94,0.2)';
                            cancelBtn.style.borderColor = 'rgba(244,63,94,0.5)';
                            cancelBtn.style.color = '#fb7185';
                            cancelBtn.innerHTML = '⚠️ PARECE COLGADO · CANCELAR';
                        }
                        const statusEl = document.getElementById('dup-status');
                        if (statusEl) statusEl.textContent = 'Sin respuesta de Drive...';
                    }
                }, 5000);
                xhr.onload = () => {
                    clearInterval(watchdog);
                    _activeDriveXhr = null;
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.responseText);
                    } else {
                        const err = new Error(`HTTP ${xhr.status}: ${xhr.responseText.slice(0,200)}`);
                        err.status = xhr.status;
                        reject(err);
                    }
                };
                xhr.onerror = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Error de red al descargar desde Drive')); };
                xhr.onabort = () => { clearInterval(watchdog); _activeDriveXhr = null; reject(new Error('Descarga cancelada')); };
                xhr.send();
            });
        }

        async function driveRestore() {
            if (!driveToken && !(await _driveEnsureFresh())) { showAlert('Primero conecta tu cuenta de Google.', 'warning'); return; }
            if (!navigator.onLine) { showAlert('Sin conexión. Conecta a internet para restaurar desde Drive.', 'warning'); return; }
            showToast('Buscando respaldos en Drive...', 'info');
            try {
                const folderId = await ensureDriveFolder();
                const query    = folderId
                    ? `'${folderId}' in parents and name contains 'nelson_backup' and trashed=false`
                    : `name contains 'nelson_backup' and trashed=false`;
                const list = await driveFetch(
                    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,modifiedTime,size)`
                ).then(r => r.json());

                if (!list.files || !list.files.length) { showAlert('No se encontraron respaldos en Drive.', 'info'); return; }

                const modal = document.createElement('div');
                modal.id = 'modal-drive-restore';
                modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:16px;';
                const _fmtSize = (n) => { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
                const _isSafety = (n) => /^nelson_backup_prerestore_/.test(n);
                const _firstRegular = list.files.findIndex(f => !_isSafety(f.name));
                const items = list.files.map((f, i) => {
                    const date = new Date(f.modifiedTime).toLocaleString('es-ES');
                    const safeName = escapeHtml(f.name);
                    const badge = _isSafety(f.name)
                        ? '<span style="background:#f59e0b;color:#111;font-size:9px;font-weight:900;padding:2px 8px;border-radius:99px;margin-left:8px;">COPIA PREVIA</span>'
                        : (i === _firstRegular ? '<span style="background:#10b981;color:#fff;font-size:9px;font-weight:900;padding:2px 8px;border-radius:99px;margin-left:8px;">MÁS RECIENTE</span>' : '');
                    return `<button onclick="driveRestoreFile('${escapeHtml(String(f.id))}', decodeURIComponent('${encodeURIComponent(f.name)}'))" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;margin-bottom:8px;text-align:left;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        <p style="color:#fff;font-weight:900;font-size:13px;">📄 ${safeName}${badge}</p>
                        <p style="color:#64748b;font-size:11px;margin-top:2px;">📅 ${date} · 💾 ${_fmtSize(f.size)}</p>
                    </button>`;
                }).join('');
                modal.innerHTML = `<div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px;width:100%;max-width:400px;overflow:hidden;">
                    <div style="background:linear-gradient(to right,#3b82f6,#2563eb);padding:16px;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="color:white;font-weight:900;font-size:16px;">⬇️ RESTAURAR DESDE DRIVE</h3>
                        <button onclick="document.getElementById('modal-drive-restore').remove()" style="color:white;background:rgba(0,0,0,0.3);width:32px;height:32px;border-radius:50%;font-weight:bold;">✕</button>
                    </div>
                    <div style="padding:16px;max-height:60vh;max-height:60dvh;overflow-y:auto;">${items}</div>
                </div>`;
                document.body.appendChild(modal);
            } catch(e) { showAlert('Error al acceder a Drive: ' + e.message, 'error'); }
        }

        async function driveRestoreFile(fileId, fileName) {
            document.getElementById('modal-drive-restore')?.remove();
            showConfirm(`¿Restaurar "${fileName}"?\nEsto reemplazará TODOS los datos actuales.`, async () => {
                // Reutilizo el overlay de progreso (mismo estilo que la subida pero en verde)
                await _driveEnsureFresh();
                showDriveProgress(fileName, 'download');
                updateDriveProgress(0, 0, 0, 'Conectando con Drive...');
                try {
                    const content = await downloadFromDriveWithProgress(fileId, driveToken, (pct, loaded, total) => {
                        if (pct < 0) {
                            // Progreso indeterminado (sin Content-Length): solo mostrar bytes
                            updateDriveProgress(0, loaded, loaded, 'Descargando respaldo...');
                        } else {
                            updateDriveProgress(pct, loaded, total, pct >= 99 ? 'Finalizando descarga...' : 'Descargando respaldo...');
                        }
                    });

                    updateDriveProgress(100, 0, 0, 'Aplicando respaldo...');

                    const blob = new Blob([content], { type: 'application/json' });
                    const file = new File([blob], fileName, { type: 'application/json' });
                    const dt   = new DataTransfer();
                    dt.items.add(file);
                    const input = document.getElementById('import-file');
                    Object.defineProperty(input, 'files', { value: dt.files, writable: false });

                    // Cerrar el overlay antes de que importData dispare su propio confirm/alert
                    hideDriveProgress(400);
                    setTimeout(() => importData({ target: input }), 450);
                } catch(e) {
                    hideDriveProgress();
                    const isAuthErr = (e.status === 401) || (e.message && e.message.includes('401'));
                    if (isAuthErr) {
                        driveToken = null; updateDriveUI(false);
                        showAlert('Sesión de Google expirada. Vuelve a conectar.', 'warning');
                    } else {
                        showAlert('Error al restaurar: ' + e.message, 'error');
                    }
                }
            });
        }

        function tryDriveReconnect() {
            const email = localStorage.getItem('driveEmail');
            if (!email) return; // nunca se conectó, no hacer nada

            // 1) Restaurar token en memoria desde sessionStorage (persiste mientras la app siga abierta)
            const storedToken = sessionStorage.getItem('driveToken');
            const storedExp   = parseInt(localStorage.getItem('driveTokenExpiresAt') || '0', 10);
            if (storedToken) { driveToken = storedToken; driveTokenExpiresAt = storedExp; }

            // 2) UI como conectado (optimista, mejor UX que mostrar "desconectado")
            updateDriveUI(true, email);

            // 3) Decidir si renovar ahora o agendar
            const now = Date.now();
            const aboutToExpire = !driveTokenExpiresAt || driveTokenExpiresAt <= now + 5 * 60 * 1000;
            if (aboutToExpire) {
                // Token vencido o casi vencido → renovar silenciosamente
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh automático al iniciar falló:', e.message);
                    // Si falla, no mostramos alerta. El usuario tendrá que reconectar
                    // manualmente si llega a intentar un respaldo.
                });
            } else {
                // Token aún válido → solo agendar el siguiente refresh
                scheduleNextDriveRefresh();
            }
        }

        // Cuando la app vuelve del segundo plano (WhatsApp, etc.), revisamos si el token
        // está por expirar. Esto cubre el caso donde el teléfono estuvo en sleep y el
        // setTimeout se pausó.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return;
            if (!localStorage.getItem('driveEmail')) return; // no estaba conectado
            const now = Date.now();
            const needsRefresh = !driveToken || !driveTokenExpiresAt || driveTokenExpiresAt <= now + 10 * 60 * 1000;
            if (needsRefresh) {
                driveSilentRefresh().catch(e => {
                    console.warn('[Drive] Refresh al volver del background falló:', e.message);
                });
            }
        });

        // ==================== PLANTILLAS WHATSAPP ====================
        function saveWhatsappTemplates() {
            const tpls = {
                recepcion:   document.getElementById('tpl-recepcion').value,
                revision:    document.getElementById('tpl-revision').value,
                presupuesto: document.getElementById('tpl-presupuesto').value,
                listo:       document.getElementById('tpl-listo').value,
                garantia:    document.getElementById('tpl-garantia').value,
                norepara:    document.getElementById('tpl-norepara').value,
                retraso:     document.getElementById('tpl-retraso').value,
                cobro:       document.getElementById('tpl-cobro').value
            };
            localStorage.setItem('whatsappTemplates', JSON.stringify(tpls));
            showToast('Plantillas guardadas', 'success');
        }
        function loadWhatsappTemplates() {
            const saved = localStorage.getItem('whatsappTemplates');
            if (!saved) return;
            const tpls = JSON.parse(saved);
            // Migración suave: si una plantilla guardada NO incluye {negocio}, agregárselo al inicio
            // (esto solo corre una vez por instalación gracias al flag)
            const migrated = localStorage.getItem('tplsBizMigrated_v1');
            if (!migrated) {
                let changedAny = false;
                Object.keys(tpls).forEach(k => {
                    if (tpls[k] && !tpls[k].includes('{negocio}')) {
                        tpls[k] = '🔧 *{negocio}*\n\n' + tpls[k];
                        changedAny = true;
                    }
                });
                if (changedAny) {
                    localStorage.setItem('whatsappTemplates', JSON.stringify(tpls));
                    console.log('[NelsonApp] Plantillas WhatsApp migradas para incluir nombre del negocio');
                }
                localStorage.setItem('tplsBizMigrated_v1', '1');
            }
            const ids = ['recepcion','revision','presupuesto','listo','garantia','norepara','retraso','cobro'];
            ids.forEach(k => {
                const el = document.getElementById('tpl-' + k);
                if (el) el.value = tpls[k] || '';
            });
        }
        function buildWhatsappMsg(type, order) {
            const saved = localStorage.getItem('whatsappTemplates');
            const tpls  = saved ? JSON.parse(saved) : {};
            const biz   = _safeBizConfig();
            const bizName = ((biz.name || 'Todo Repuestos Nelson').trim()).toUpperCase();
            const defaults = {
                recepcion:   '🔧 *{negocio}*\n\nHola {cliente}, recibimos tu {equipo}. Orden {orden}. Te avisamos cuando esté listo. ¡Gracias por confiar en nosotros! 🙌',
                revision:    '🔧 *{negocio}*\n\nHola {cliente}, tu {equipo} está siendo revisado y diagnosticado. En breve te informamos el estado 🔍',
                presupuesto: '🔧 *{negocio}*\n\nHola {cliente}, el presupuesto para reparar tu {equipo} es de ${valor}. Por favor confírmanos si apruebas la reparación ✅',
                listo:       '🔧 *{negocio}*\n\nHola {cliente}, tu {equipo} ya está listo! Valor: ${valor}. Puedes pasar a recogerlo cuando gustes 🎉',
                garantia:    '🔧 *{negocio}*\n\nHola {cliente}, recuerda que tu {equipo} tiene garantía de {dias} días desde la fecha de entrega. Estamos a tu servicio 🛡️',
                norepara:    '🔧 *{negocio}*\n\nHola {cliente}, lamentamos informarte que tu {equipo} no tiene reparación posible o no conseguimos el repuesto. Puedes pasar a recogerlo cuando gustes 😔',
                retraso:     '🔧 *{negocio}*\n\nHola {cliente}, te informamos que la reparación de tu {equipo} está tomando un poco más de tiempo del previsto. Te avisamos en cuanto esté listo, gracias por tu paciencia ⏳',
                cobro:       '🔧 *{negocio}*\n\nHola {cliente}, tienes un saldo pendiente de ${valor} por la reparación de tu {equipo}. Te agradecemos pasar a cancelar cuando gustes 🙏'
            };
            let msg = tpls[type] || defaults[type] || '';
            msg = msg
                .replace(/{negocio}/g, bizName)
                .replace(/{cliente}/g, order.nom || '')
                .replace(/{equipo}/g,  order.equ || '')
                .replace(/{valor}/g,   (order.val || 0).toLocaleString())
                .replace(/{orden}/g,   formatOrderNum(order.orderNum || 0))
                .replace(/{dias}/g,    order.garantia || '');
            return msg;
        }

        // ==================== TÉCNICOS ====================
        function getTecnicos() { return JSON.parse(localStorage.getItem('tecnicos') || '[]'); }
        function saveTecnicos(list) { localStorage.setItem('tecnicos', JSON.stringify(list)); }
        function addTecnico() {
            const input = document.getElementById('new-tecnico');
            const name  = input.value.trim().toUpperCase();
            if (!name) return;
            const list = getTecnicos();
            if (list.includes(name)) { showToast('Ya existe ese técnico', 'warning'); return; }
            list.push(name);
            saveTecnicos(list);
            input.value = '';
            renderTecnicosList();
            _refreshTecnicosSelects();
            showToast(`Técnico ${name} agregado`, 'success');
        }
        function removeTecnico(name) {
            saveTecnicos(getTecnicos().filter(t => t !== name));
            renderTecnicosList();
        }
        function renderTecnicosList() {
            const list = getTecnicos();
            const el = document.getElementById('tecnicos-list');
            if (!el) return;
            el.innerHTML = list.length
                ? list.map(t => `<div class="flex justify-between items-center bg-slate-800/60 px-3 py-2 rounded-xl"><span class="text-sm font-bold">👷 ${t}</span><button onclick="removeTecnico('${t}')" class="text-rose-400 text-xs bg-rose-500/20 px-2 py-1 rounded-lg">✕</button></div>`).join('')
                : '<p class="text-xs text-slate-500 text-center py-2">Sin técnicos registrados</p>';
        }

        // ==================== META MENSUAL + SEMANAL ====================
        function saveMetaConfig() {
            const meta        = parseFloat(document.getElementById('config-meta').value) || 0;
            const visible     = document.getElementById('config-meta-visible').checked;
            const metaSemanal = parseFloat(document.getElementById('config-meta-semanal')?.value) || 0;
            localStorage.setItem('metaMensual',  meta);
            localStorage.setItem('metaVisible',  visible);
            localStorage.setItem('metaSemanal',  metaSemanal);
            updateMetaBar();
            showToast('Metas guardadas ✅', 'success');
        }
        function loadMetaConfig() {
            const meta        = localStorage.getItem('metaMensual')  || '';
            const visible     = localStorage.getItem('metaVisible')  === 'true';
            const metaSemanal = localStorage.getItem('metaSemanal')  || '';
            const mEl  = document.getElementById('config-meta');         if (mEl)  mEl.value  = meta;
            const vEl  = document.getElementById('config-meta-visible'); if (vEl)  vEl.checked = visible;
            const msEl = document.getElementById('config-meta-semanal'); if (msEl) msEl.value = metaSemanal;
        }
        async function updateMetaBar() {
            const meta    = parseFloat(localStorage.getItem('metaMensual')) || 0;
            const visible = localStorage.getItem('metaVisible') === 'true';
            const wrap    = document.getElementById('meta-bar-wrap');
            if (!wrap) return;
            if (!visible || !meta) { wrap.classList.add('hidden'); return; }
            wrap.classList.remove('hidden');
            const now   = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            const orders = await getAll('orders');
            const sales  = await getAll('sales');
            const total  = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha) >= start).reduce((a,b) => a+(b.val||0), 0)
                         + sales.filter(s => s.fecha >= start && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega').reduce((a,b) => a+(b.val||0), 0);
            const pct = Math.min(100, Math.round((total / meta) * 100));
            document.getElementById('meta-bar-fill').style.width = pct + '%';
            document.getElementById('meta-bar-pct').innerText    = pct + '%';
            const fill = document.getElementById('meta-bar-fill');
            fill.style.background = pct >= 100 ? 'linear-gradient(to right,#10b981,#34d399)'
                                  : pct >= 60  ? 'linear-gradient(to right,#f59e0b,#fbbf24)'
                                  : 'linear-gradient(to right,#ef4444,#f87171)';
            const amtEl = document.getElementById('meta-bar-amount');
            if (amtEl) amtEl.innerText = getCurrency() + total.toLocaleString('es-CO') + ' / ' + getCurrency() + meta.toLocaleString('es-CO');
            if (pct >= 100) showToast('🎉 ¡Meta del mes alcanzada!', 'success');
        }

        // ==================== BLOQUE B: GRÁFICA DE INGRESOS ====================
        async function openGraficaIngresos() {
            document.getElementById('modal-grafica').classList.remove('hidden');
            await renderGraficaIngresos();
        }
        function closeGraficaIngresos() {
            document.getElementById('modal-grafica').classList.add('hidden');
        }

        async function renderGraficaIngresos() {
            const orders = await getAll('orders');
            const sales  = await getAll('sales');
            const cur    = getCurrency();
            const now    = new Date();

            // Construir datos de los últimos 6 meses
            const meses = [];
            for (let i = 5; i >= 0; i--) {
                const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const start = d.getTime();
                const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
                const label = d.toLocaleDateString('es-ES', {month:'short'}).replace('.','');
                const reps  = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega||o.fecha) >= start && (o.fechaEntrega||o.fecha) < end)
                                    .reduce((a,b) => a+(b.val||0), 0);
                const vtas  = sales.filter(s => s.fecha >= start && s.fecha < end && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega')
                                   .reduce((a,b) => a+(b.val||0), 0);
                meses.push({ label, reps, vtas, total: reps + vtas });
            }

            const maxVal    = Math.max(...meses.map(m => m.total), 1);
            const H         = 170;
            const barW      = 38;
            const gap       = 18;
            const padTop    = 24;
            const padBottom = 26;
            const totalW    = meses.length * (barW + gap) + gap;
            const svgH      = H + padTop + padBottom;
            const mesActual = meses[meses.length - 1];

            // Líneas guía horizontales
            let gridLines = '';
            [0.25, 0.5, 0.75, 1].forEach(pct => {
                const y = padTop + H - Math.round(pct * H);
                const v = maxVal * pct;
                const vl = v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'K' : '';
                gridLines += `<line x1="${gap}" y1="${y}" x2="${totalW - gap}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`;
                if (vl) gridLines += `<text x="${gap - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="#334155" font-weight="500">${vl}</text>`;
            });

            // Barras
            let bars = '';
            meses.forEach((m, i) => {
                const x      = gap + i * (barW + gap);
                const hRep   = Math.round((m.reps  / maxVal) * H);
                const hVta   = Math.round((m.vtas  / maxVal) * H);
                const hTot   = Math.round((m.total / maxVal) * H);
                const yBase  = padTop + H;
                const isLast = i === meses.length - 1;
                const half   = Math.floor(barW / 2) - 1;
                // Fondo barra total
                if (hTot > 0) bars += `<rect x="${x}" y="${yBase - hTot}" width="${barW}" height="${hTot}" rx="7" fill="${isLast ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)'}"/>`;
                // Reparaciones (izquierda)
                if (hRep > 0) bars += `<rect x="${x}" y="${yBase - hRep}" width="${half}" height="${hRep}" rx="5" fill="${isLast ? '#10b981' : '#34d399'}" opacity="${isLast ? 1 : 0.6}"/>`;
                // Ventas (derecha)
                if (hVta > 0) bars += `<rect x="${x + half + 2}" y="${yBase - hVta}" width="${half}" height="${hVta}" rx="5" fill="${isLast ? '#3b82f6' : '#60a5fa'}" opacity="${isLast ? 1 : 0.6}"/>`;
                // Etiqueta mes
                bars += `<text x="${x + barW/2}" y="${yBase + 18}" text-anchor="middle" font-size="11" fill="${isLast ? '#f1f5f9' : '#64748b'}" font-weight="${isLast ? '900' : '500'}">${m.label}</text>`;
                // Valor encima
                if (m.total > 0) {
                    const sv = m.total >= 1000000 ? (m.total/1000000).toFixed(1)+'M' : m.total >= 1000 ? Math.round(m.total/1000)+'K' : String(m.total);
                    bars += `<text x="${x + barW/2}" y="${yBase - hTot - 6}" text-anchor="middle" font-size="10" fill="${isLast ? '#34d399' : '#475569'}" font-weight="800">${sv}</text>`;
                }
            });

            // Línea meta mensual
            const metaMes = parseFloat(localStorage.getItem('metaMensual')) || 0;
            let metaLine = '';
            if (metaMes > 0 && metaMes <= maxVal * 1.5) {
                const yMeta = padTop + H - Math.round((metaMes / maxVal) * H);
                metaLine = `<line x1="${gap}" y1="${yMeta}" x2="${totalW - gap}" y2="${yMeta}" stroke="#f97316" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.85"/><text x="${totalW - gap - 2}" y="${yMeta - 5}" text-anchor="end" font-size="9" fill="#f97316" font-weight="800">META</text>`;
            }

            const svgHTML = `<svg width="100%" viewBox="0 0 ${totalW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block;">${gridLines}${bars}${metaLine}</svg>`;

            document.getElementById('grafica-container').innerHTML = svgHTML;

            // Leyenda
            const resumen = document.getElementById('grafica-resumen');
            const promedio = Math.round(meses.reduce((a,m) => a+m.total,0) / meses.filter(m=>m.total>0).length || 1);
            const tendencia = meses.length >= 2 ? meses[meses.length-1].total - meses[meses.length-2].total : 0;
            resumen.innerHTML = `
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Este mes</p>
                    <p class="text-base font-black text-emerald-400 leading-tight">${cur}${mesActual.total.toLocaleString('es-CO')}</p>
                </div>
                <div class="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Promedio</p>
                    <p class="text-base font-black text-blue-400 leading-tight">${cur}${promedio.toLocaleString('es-CO')}</p>
                </div>
                <div class="${tendencia >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-2xl p-4 text-center">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Tendencia</p>
                    <p class="text-base font-black ${tendencia >= 0 ? 'text-emerald-400' : 'text-rose-400'} leading-tight">${tendencia >= 0 ? '▲' : '▼'} ${cur}${Math.abs(tendencia).toLocaleString('es-CO')}</p>
                </div>`;

            // Meta semanal
            const metaSem = parseFloat(localStorage.getItem('metaSemanal')) || 0;
            const cardSem = document.getElementById('meta-semanal-card');
            if (metaSem > 0) {
                cardSem.classList.remove('hidden');
                // Calcular inicio de semana (lunes)
                const hoy = new Date(); hoy.setHours(0,0,0,0);
                const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay()||7)-1));
                const semStart = lunes.getTime();
                const semTotal = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) >= semStart).reduce((a,b) => a+(b.val||0), 0)
                               + sales.filter(s => s.fecha >= semStart && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega').reduce((a,b) => a+(b.val||0), 0);
                const pct = Math.min(100, Math.round((semTotal / metaSem) * 100));
                const diasRestantes = 7 - ((hoy.getDay()||7) - 1);
                const faltante      = Math.max(0, metaSem - semTotal);
                const porDia        = diasRestantes > 0 ? Math.ceil(faltante / diasRestantes) : 0;
                document.getElementById('meta-sem-pct').innerText   = pct + '%';
                document.getElementById('meta-sem-fill').style.width = pct + '%';
                document.getElementById('meta-sem-actual').innerText = cur + semTotal.toLocaleString('es-CO');
                document.getElementById('meta-sem-goal').innerText   = 'Meta: ' + cur + metaSem.toLocaleString('es-CO');
                document.getElementById('meta-sem-label').innerText  = `Semana del ${lunes.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}`;
                document.getElementById('meta-sem-daily').innerText  = pct >= 100 ? '🎉 ¡Meta semanal alcanzada!' : `Necesitas ${cur}${porDia.toLocaleString('es-CO')}/día para llegar`;
            } else {
                cardSem.classList.add('hidden');
            }
        }

        // ==================== BLOQUE B: ÓRDENES DE COMPRA ====================
        async function openOrdenesCompra() {
            // Cargar proveedores
            const provs  = await getAll('proveedores');
            const stock  = await getAll('stock');
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;

            const sel = document.getElementById('oc-proveedor');
            sel.innerHTML = '<option value="">— Sin proveedor específico —</option>' +
                provs.map(p => `<option value="${p.id}">${escapeHtml(p.nombre)}</option>`).join('');

            // Items bajo mínimo
            const bajos = stock.filter(s => s.q <= (s.minStock || threshold));
            document.getElementById('oc-subtitle').innerText =
                `${bajos.length} repuesto${bajos.length!==1?'s':''} bajo mínimo`;

            const cur = getCurrency();
            const list = document.getElementById('oc-items-list');

            if (!bajos.length) {
                list.innerHTML = '<p class="text-center text-slate-500 text-sm py-6">✅ Todo el stock está sobre el mínimo</p>';
            } else {
                list.innerHTML = bajos.map(s => {
                    const hasSupplier = (s.supplier || '').trim().length > 0;
                    const supplierShort = hasSupplier ? (s.supplier.length > 18 ? s.supplier.substring(0,18) + '…' : s.supplier) : '';
                    return `
                    <div class="flex items-center gap-3 bg-black/20 rounded-xl p-3 border border-amber-500/20">
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-black text-white truncate">${escapeHtml(s.n)}</p>
                            <p class="text-[10px] text-slate-400">
                                Stock: <span class="text-rose-400 font-bold">${s.q}</span>
                                · Mín: ${s.minStock || threshold}
                                ${s.code ? `· ${s.code}` : ''}
                            </p>
                            ${hasSupplier ? `<p class="text-[9.5px] text-cyan-400 font-bold mt-1">📌 ${escapeHtml(supplierShort)}</p>` : ''}
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <input type="number" inputmode="decimal" value="${Math.max(1,(s.minStock||threshold)*2 - s.q)}"
                                min="1" class="w-12 text-center text-xs font-black text-amber-400"
                                id="oc-qty-${s.id}">
                            <span class="text-[10px] text-slate-500 mr-1">uds</span>
                            ${hasSupplier ? `<button onclick="pedirAProveedor(${s.id})" title="Pedir a ${escapeHtml(s.supplier).replace(/"/g,'&quot;')}" style="background:linear-gradient(135deg,#16a34a,#15803d);border:none;color:#fff;width:30px;height:30px;border-radius:8px;font-size:12px;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,0.35);" class="active:scale-90 transition">📱</button>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }

            document.getElementById('oc-notas').value = '';
            document.getElementById('modal-ordenes-compra').classList.remove('hidden');
        }

        function closeOrdenesCompra() {
            document.getElementById('modal-ordenes-compra').classList.add('hidden');
        }

        // Pedido rápido al proveedor asociado de un repuesto bajo mínimo
        // ════════════════════════════════════════════════════════════════════════
        // TOUR GUIADO v1 — Sistema de onboarding para usuarios nuevos
        // ════════════════════════════════════════════════════════════════════════
        const _TOUR_STEPS = [
            {
                target: '#btn-taller',
                emoji: '🔧',
                title: 'Aquí empieza todo',
                text: 'Este botón "Taller" es donde recibes los equipos de los clientes. Cada vez que llegue un cliente con un equipo dañado, tocas aquí primero.',
                position: 'top'
            },
            {
                target: '#c-nom',
                emoji: '👤',
                title: 'Nombre del cliente',
                text: 'Escribe el nombre completo del cliente aquí. Si ya lo habías atendido antes, te aparece una tarjeta azul con su historial. Puedes tocarla para ver qué le has reparado.',
                position: 'bottom'
            },
            {
                target: '#c-tel',
                emoji: '📱',
                title: 'WhatsApp del cliente',
                text: 'Muy importante escribir bien el número. La app envía mensajes automáticos al cliente por WhatsApp cuando su equipo está listo.',
                position: 'bottom'
            },
            {
                target: '#c-equ',
                emoji: '🔌',
                title: 'Describe el equipo',
                text: 'Escribe marca, modelo y tipo. Por ejemplo: "OSTER LICUADORA" o "LG NEVERA". Así después es fácil buscar.',
                position: 'bottom'
            },
            {
                target: '#c-fal',
                emoji: '⚠️',
                title: 'La falla reportada',
                text: 'Escribe qué le pasa al equipo. Lo que te dijo el cliente. Por ejemplo: "NO PRENDE" o "HACE RUIDO EXTRAÑO". Con letra sencilla, sin complicarse.',
                position: 'top'
            },
            {
                target: '#btn-ordenes',
                emoji: '📋',
                title: 'Todas las órdenes',
                text: 'Aquí ves todos los equipos que has recibido. Puedes cambiar el estado (en revisión, reparado, entregado) tocando el botón de estado en cada orden.',
                position: 'top'
            },
            {
                target: '#btn-ventas',
                emoji: '💵',
                title: 'Caja e inventario',
                text: 'En "Caja" registras ventas de repuestos y gastos del día. Y manejas el inventario. Todo el dinero que entra y sale pasa por aquí.',
                position: 'top'
            },
            {
                target: '#btn-admin',
                emoji: '📊',
                title: 'Datos y reportes',
                text: 'En "Datos" ves los reportes del mes, estadísticas, y ajustes. Al final del mes revisa aquí cuánto ganaste. Y usa "Respaldar" para guardar tu información en Google Drive.',
                position: 'top'
            }
        ];
        let _tourIdx = 0;
        let _tourActive = false;

        function tourShowWelcome() {
            const prevTab = document.querySelector('.app-view:not(.hidden)');
            // Asegurarnos de estar en la vista Taller antes del tour
            if (typeof tab === 'function') tab('taller');
            setTimeout(() => {
                document.getElementById('tour-welcome').classList.remove('hidden');
            }, 200);
        }

        function tourStart() {
            document.getElementById('tour-welcome').classList.add('hidden');
            document.getElementById('tour-complete').classList.add('hidden');
            _tourIdx = 0;
            _tourActive = true;
            _tourShowStep(0);
        }

        function tourNext() {
            if (_tourIdx >= _TOUR_STEPS.length - 1) {
                _tourHideUI();
                document.getElementById('tour-complete').classList.remove('hidden');
                return;
            }
            _tourIdx++;
            _tourShowStep(_tourIdx);
        }

        function tourPrev() {
            if (_tourIdx === 0) return;
            _tourIdx--;
            _tourShowStep(_tourIdx);
        }

        function tourEnd(markSeen) {
            _tourHideUI();
            document.getElementById('tour-welcome').classList.add('hidden');
            document.getElementById('tour-complete').classList.add('hidden');
            _tourActive = false;
            // Marcar como visto (tanto si completó como si decidió saltar)
            localStorage.setItem('tourCompleted', '1');
        }

        function _tourHideUI() {
            document.getElementById('tour-overlay').classList.add('hidden');
            document.getElementById('tour-highlight').classList.add('hidden');
            document.getElementById('tour-tooltip').classList.add('hidden');
        }

        function _tourShowStep(idx) {
            const step = _TOUR_STEPS[idx];
            if (!step) return;

            // Asegurarnos que estamos en vista Taller (muchos targets están ahí)
            if (typeof tab === 'function' && step.target && step.target.startsWith('#c-')) {
                const tallerView = document.getElementById('view-taller');
                if (tallerView && tallerView.classList.contains('hidden')) tab('taller');
            }

            // Localizar el elemento destacado
            setTimeout(() => {
                const targetEl = document.querySelector(step.target);
                if (!targetEl) {
                    // Si no existe, saltar el paso (evitar que el tour se rompa)
                    console.warn('[tour] target no encontrado:', step.target);
                    if (idx < _TOUR_STEPS.length - 1) {
                        _tourIdx++;
                        _tourShowStep(_tourIdx);
                    } else {
                        _tourHideUI();
                        document.getElementById('tour-complete').classList.remove('hidden');
                    }
                    return;
                }

                // Scroll al elemento si está fuera de vista
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                setTimeout(() => {
                    const rect = targetEl.getBoundingClientRect();
                    const highlight = document.getElementById('tour-highlight');
                    const overlay   = document.getElementById('tour-overlay');
                    const tooltip   = document.getElementById('tour-tooltip');
                    const emojiEl   = document.getElementById('tour-tooltip-emoji');
                    const stepEl    = document.getElementById('tour-tooltip-step');
                    const titleEl   = document.getElementById('tour-tooltip-title');
                    const textEl    = document.getElementById('tour-tooltip-text');
                    const prevBtn   = document.getElementById('tour-btn-prev');
                    const nextBtn   = document.getElementById('tour-btn-next');

                    // Posición del highlight (con pequeño padding)
                    const pad = 6;
                    highlight.style.left   = (rect.left - pad) + 'px';
                    highlight.style.top    = (rect.top - pad) + 'px';
                    highlight.style.width  = (rect.width + pad * 2) + 'px';
                    highlight.style.height = (rect.height + pad * 2) + 'px';
                    highlight.classList.remove('hidden');
                    overlay.classList.remove('hidden');

                    // Contenido del tooltip
                    emojiEl.textContent = step.emoji;
                    stepEl.textContent  = `Paso ${idx + 1} de ${_TOUR_STEPS.length}`;
                    titleEl.textContent = step.title;
                    textEl.textContent  = step.text;
                    prevBtn.disabled    = (idx === 0);
                    prevBtn.style.opacity = (idx === 0) ? '0.4' : '1';
                    nextBtn.textContent = (idx === _TOUR_STEPS.length - 1) ? 'Finalizar ✓' : 'Siguiente →';

                    // Calcular posición del tooltip (arriba o abajo del target)
                    tooltip.classList.remove('hidden');
                    // Esperar a que se renderice para medir altura real
                    requestAnimationFrame(() => {
                        const ttRect = tooltip.getBoundingClientRect();
                        const vw = window.innerWidth;
                        const vh = window.innerHeight;
                        const wantBelow = step.position === 'bottom';
                        const spaceBelow = vh - rect.bottom;
                        const spaceAbove = rect.top;
                        let top;
                        if (wantBelow && spaceBelow >= ttRect.height + 20) {
                            top = rect.bottom + 14;
                        } else if (spaceAbove >= ttRect.height + 20) {
                            top = rect.top - ttRect.height - 14;
                        } else if (spaceBelow >= ttRect.height + 20) {
                            top = rect.bottom + 14;
                        } else {
                            // No cabe ni arriba ni abajo — centrar vertical
                            top = Math.max(10, (vh - ttRect.height) / 2);
                        }
                        // Centrar horizontal relativo al target, sin salirse de pantalla
                        let left = rect.left + (rect.width / 2) - (ttRect.width / 2);
                        left = Math.max(10, Math.min(vw - ttRect.width - 10, left));
                        tooltip.style.left = left + 'px';
                        tooltip.style.top  = top + 'px';
                    });
                }, 350);
            }, 100);
        }

        // Verifica al inicio si se debe mostrar el tour de bienvenida
        function _maybeShowTourOnStart() {
            try {
                if (localStorage.getItem('tourCompleted') === '1') return;
                // Solo si no hay todavía órdenes (usuario realmente nuevo) o el flag explícito
                getAll('orders').then(orders => {
                    // Dar tiempo para que la UI cargue
                    setTimeout(() => tourShowWelcome(), 1800);
                }).catch(() => {});
            } catch(e) { console.warn('[tour init]', e); }
        }

        // Permite re-lanzar el tour desde un botón en Ajustes
        function tourRestart() {
            localStorage.removeItem('tourCompleted');
            tourShowWelcome();
        }

        // Generar PDF imprimible con guía básica de uso
        async function downloadGuidePDF() {
            try {
                showToast('📄 Generando guía...', 'info');
                // Usar el helper centralizado: garantiza jsPDF + autoTable
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    if (!navigator.onLine) {
                        showAlert('Para generar la guía necesitas conexión a Internet (se descarga una librería la primera vez).\n\nIntenta de nuevo cuando tengas señal.', 'info');
                        return;
                    }
                }
                await _ensurePdfLibsReady();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const biz = _safeBizConfig();
                const bizName = biz.name || 'Todo Repuestos Nelson';
                const pageW = doc.internal.pageSize.getWidth();
                const pageH = doc.internal.pageSize.getHeight();

                // ═══ PÁGINA 1 — Portada y flujo básico ═══
                // Header con color
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageW, 48, 'F');
                doc.setFillColor(249, 115, 22);
                doc.rect(0, 46, pageW, 2, 'F');
                // Logo/título
                doc.setTextColor(254, 243, 199);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('Guía Rápida', pageW/2, 22, { align: 'center' });
                doc.setTextColor(252, 211, 77);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(bizName, pageW/2, 32, { align: 'center' });
                doc.setTextColor(156, 163, 175);
                doc.setFontSize(9);
                doc.text('Los pasos básicos para usar la app', pageW/2, 40, { align: 'center' });

                // Intro
                let y = 62;
                doc.setTextColor(31, 41, 55);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('📱 La app tiene 4 botones abajo:', 14, y);
                y += 8;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(75, 85, 99);
                const intros = [
                    ['🔧 TALLER', 'Para recibir equipos nuevos de los clientes.'],
                    ['📋 ÓRDENES', 'Lista de todos los equipos recibidos.'],
                    ['💵 CAJA', 'Ventas de repuestos, gastos e inventario.'],
                    ['📊 DATOS', 'Reportes, estadísticas y configuración.'],
                ];
                intros.forEach(([nombre, desc]) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(17, 24, 39);
                    doc.text(nombre, 18, y);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(75, 85, 99);
                    doc.text(desc, 60, y);
                    y += 7;
                });

                // Sección 1
                y += 4;
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('1. Cuando un cliente trae un equipo dañado', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos1 = [
                    '1) Toca el botón TALLER abajo.',
                    '2) Escribe el NOMBRE COMPLETO del cliente.',
                    '3) Escribe el NÚMERO DE WHATSAPP (sin espacios).',
                    '4) Describe el EQUIPO: marca, modelo, tipo.',
                    '5) Escribe la FALLA que reportó el cliente.',
                    '6) Pon el VALOR aproximado de la reparación.',
                    '7) Si dejó un adelanto, escríbelo en ADELANTO.',
                    '8) Al final, toca el botón naranja REGISTRAR.',
                ];
                pasos1.forEach(p => {
                    doc.text(p, 18, y);
                    y += 6.5;
                });
                y += 3;
                doc.setFillColor(220, 252, 231);
                doc.rect(10, y - 3, pageW - 20, 10, 'F');
                doc.setTextColor(6, 95, 70);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('💡 TIP: Si el cliente ya vino antes, sale una tarjeta azul con su', 14, y + 1);
                doc.text('historial. Puedes tocarla para ver qué le has reparado.', 14, y + 5);
                y += 14;

                // Sección 2
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('2. Cuando ya reparaste el equipo', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos2 = [
                    '1) Ve a ÓRDENES.',
                    '2) Busca la orden del cliente.',
                    '3) Toca el botón de ESTADO (dice "RECIBIDO", "EN REVISIÓN"...)',
                    '4) Cambia a REPARADO.',
                    '5) La app te preguntará qué repuestos usaste (opcional).',
                    '6) Avisa al cliente con el botón 💬 de WhatsApp.',
                ];
                pasos2.forEach(p => {
                    doc.text(p, 18, y);
                    y += 6.5;
                });

                // Footer página 1
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text('Página 1 de 2', pageW / 2, pageH - 8, { align: 'center' });

                // ═══ PÁGINA 2 — Entrega, Caja y Consejos ═══
                doc.addPage();
                // Header pág 2
                doc.setFillColor(15, 23, 42);
                doc.rect(0, 0, pageW, 20, 'F');
                doc.setFillColor(249, 115, 22);
                doc.rect(0, 19, pageW, 1, 'F');
                doc.setTextColor(254, 243, 199);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Guía Rápida — ' + bizName, pageW/2, 13, { align: 'center' });

                y = 32;

                // Sección 3
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('3. Cuando el cliente viene a recoger', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos3 = [
                    '1) Abre la orden del cliente.',
                    '2) Cambia el estado a ENTREGADO.',
                    '3) Registra el pago final.',
                    '4) Si usaste efectivo, queda registrado en CAJA automáticamente.',
                ];
                pasos3.forEach(p => { doc.text(p, 18, y); y += 6.5; });
                y += 3;

                // Sección 4
                doc.setFillColor(254, 243, 199);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(146, 64, 14);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('4. Caja (ventas de repuestos y gastos)', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const pasos4 = [
                    '• Para VENDER un repuesto: toca CAJA → Nueva Venta.',
                    '• Para registrar un GASTO: toca CAJA → Nuevo Gasto.',
                    '• El saldo de la caja se actualiza solo al final del día.',
                    '• Si ves que un repuesto baja de cantidad, es normal:',
                    '  la app descuenta el stock automáticamente al vender.',
                ];
                pasos4.forEach(p => { doc.text(p, 18, y); y += 6.5; });
                y += 3;

                // Sección 5 - Consejos
                doc.setFillColor(219, 234, 254);
                doc.rect(10, y - 5, pageW - 20, 8, 'F');
                doc.setTextColor(29, 78, 216);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('✨ Consejos importantes', 14, y);
                y += 12;
                doc.setTextColor(55, 65, 81);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                const consejos = [
                    '• En la parte de arriba de TALLER verás el "Panel de hoy":',
                    '  te dice cuántos equipos están listos, vencidos, o bajo stock.',
                    '',
                    '• Si te equivocas en una orden, puedes editarla:',
                    '  toca el nombre del cliente en la tarjeta de la orden.',
                    '',
                    '• Para GUARDAR tu información en la nube de Google:',
                    '  DATOS → Respaldar. Hazlo al menos una vez por semana.',
                    '',
                    '• Si quieres ver el tour otra vez:',
                    '  DATOS → AJUSTES → Primeros pasos.',
                    '',
                    '• Si algo no te funciona bien, cierra y vuelve a abrir la app.',
                ];
                consejos.forEach(p => {
                    if (p) doc.text(p, 18, y);
                    y += 5.5;
                });
                y += 2;

                // Botón de ayuda al final
                doc.setFillColor(254, 226, 226);
                doc.rect(10, y - 3, pageW - 20, 18, 'F');
                doc.setDrawColor(248, 113, 113);
                doc.setLineWidth(0.5);
                doc.rect(10, y - 3, pageW - 20, 18, 'S');
                doc.setTextColor(153, 27, 27);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('⚠️ ¿Te trabaste? Llama a Luis para que te ayude.', 14, y + 2);
                doc.setTextColor(127, 29, 29);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text('No te preocupes si algo sale mal, todo se puede corregir después.', 14, y + 9);

                // Footer
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text('Página 2 de 2', pageW / 2, pageH - 8, { align: 'center' });

                const today = _ymdLocal(new Date());
                doc.save(`Guia-Rapida-${today}.pdf`);
                showToast('✅ Guía descargada · Imprímela y tenla cerca del taller', 'success');
            } catch (e) {
                console.warn('[downloadGuidePDF]', e);
                showAlert('Error al generar la guía. Intenta de nuevo.', 'error');
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // COLA DE MENSAJES WHATSAPP PENDIENTES (se usa cuando hay offline)
        // El indicador visual principal lo maneja showNetBadge (net-badge)
        // ════════════════════════════════════════════════════════════════════════
        function _getPendingMessagesCount() {
            try {
                const q = JSON.parse(localStorage.getItem('waQueue') || '[]');
                return Array.isArray(q) ? q.length : 0;
            } catch(e) { return 0; }
        }

        async function _flushWhatsappQueue() {
            try {
                const queue = JSON.parse(localStorage.getItem('waQueue') || '[]');
                if (!queue.length) return;
                showToast(`Abriendo ${queue.length} mensaje${queue.length !== 1 ? 's' : ''} pendiente${queue.length !== 1 ? 's' : ''}...`, 'info');
                for (let i = 0; i < queue.length; i++) {
                    const m = queue[i];
                    if (!m || !m.url) continue;
                    sessionStorage.setItem('_waJump', '1');
                    window.open(m.url, '_blank');
                    if (i < queue.length - 1) await new Promise(r => setTimeout(r, 1500));
                }
                localStorage.setItem('waQueue', '[]');
                showToast('✅ Todos los mensajes fueron abiertos', 'success');
            } catch(e) { console.warn('[flushWhatsappQueue]', e); }
        }

        // Helper: encolar o enviar al instante un mensaje según conexión real
        function _sendOrQueueWA(url, label) {
            if (_isReallyOnline()) {
                sessionStorage.setItem('_waJump', '1');
                window.open(url, '_blank');
                return 'sent';
            } else {
                try {
                    const q = JSON.parse(localStorage.getItem('waQueue') || '[]');
                    q.push({ url, label: label || '', ts: Date.now() });
                    localStorage.setItem('waQueue', JSON.stringify(q));
                    showToast(`📥 Guardado · Se abrirá cuando vuelva la señal`, 'info');
                    return 'queued';
                } catch(e) { return 'failed'; }
            }
        }

        // Estado real de conexión (combina navigator.onLine + último ping verificado)
        let _lastOnlineVerified = true;
        function _isReallyOnline() {
            // Si navigator.onLine dice false, confiar en eso (está 100% desconectado del sistema)
            if (!navigator.onLine) return false;
            // Si navigator.onLine dice true, usar el resultado de nuestro último ping
            return _lastOnlineVerified;
        }

        // Ping real a internet para verificar conexión más allá de navigator.onLine
        // (algunos Android/WebView reportan onLine=false aunque haya datos, y al revés)
        async function _verifyRealConnection() {
            if (!navigator.onLine) {
                _lastOnlineVerified = false;
                return false;
            }
            try {
                // Ping ligero a Google (imagen transparente de 1 pixel, sin caché)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch('https://www.google.com/generate_204', {
                    method: 'GET',
                    mode: 'no-cors',
                    cache: 'no-store',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                _lastOnlineVerified = true;
                return true;
            } catch (e) {
                // Si falla el ping, intentar con un fallback más tolerante
                try {
                    await fetch('https://cdnjs.cloudflare.com/favicon.ico', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store'
                    });
                    _lastOnlineVerified = true;
                    return true;
                } catch(e2) {
                    _lastOnlineVerified = false;
                    return false;
                }
            }
        }

        async function pedirAProveedor(stockId) {
            try {
                const stock = await getAll('stock');
                const item  = stock.find(s => s.id === stockId);
                if (!item) return showAlert('Repuesto no encontrado', 'error');
                if (!item.supplier || !item.supplier.trim()) return showAlert('Este repuesto no tiene proveedor asignado. Edítalo y agrega el proveedor.', 'info');

                const cantidadSugerida = Math.max(1, (item.minStock || 3) * 2 - (item.q || 0));
                const qtyInput = document.getElementById(`oc-qty-${stockId}`);
                const cantidad = (qtyInput && qtyInput.value) ? parseInt(qtyInput.value) : cantidadSugerida;

                // Buscar match en tabla de proveedores (por nombre, case-insensitive)
                const provs = await getAll('proveedores');
                const supplierNorm = item.supplier.trim().toLowerCase();
                const matchProv = provs.find(p => (p.nombre || '').trim().toLowerCase() === supplierNorm)
                                || provs.find(p => (p.nombre || '').trim().toLowerCase().includes(supplierNorm))
                                || provs.find(p => supplierNorm.includes((p.nombre || '').trim().toLowerCase()));

                const biz = _safeBizConfig();
                const bizName = biz.name || 'Todo Repuestos Nelson';

                let mensaje = `Hola, ${matchProv && matchProv.nombre ? matchProv.nombre.split(' ')[0] : ''}\n\n`;
                mensaje += `Te escribo de *${bizName}*. Necesito el siguiente repuesto:\n\n`;
                mensaje += `📦 *${item.n}*\n`;
                if (item.code) mensaje += `🔖 Código: ${item.code}\n`;
                mensaje += `🔢 Cantidad: *${cantidad} unidad${cantidad !== 1 ? 'es' : ''}*\n\n`;
                mensaje += `¿Tienes disponibilidad y cuál sería el precio?\n\nGracias.`;

                // Si hay proveedor con teléfono, abrir WhatsApp directo
                if (matchProv && matchProv.telefono) {
                    const tel = matchProv.telefono.replace(/\D/g, '');
                    const prefix = tel.length === 10 ? '57' : '';
                    const url = `https://wa.me/${prefix}${tel}?text=${encodeURIComponent(mensaje)}`;
                    sessionStorage.setItem('_waJump', '1');
                    window.open(url, '_blank');
                    showToast(`📱 Enviando a ${matchProv.nombre}`, 'success');
                } else {
                    // No hay match con teléfono → solo copiar el mensaje al portapapeles
                    try {
                        await _copyText(mensaje);
                        showAlert(`El proveedor "${item.supplier}" no tiene teléfono guardado.\n\nEl mensaje se copió al portapapeles — pégalo en tu WhatsApp.`, 'info');
                    } catch (e) {
                        showAlert(`Proveedor "${item.supplier}" no encontrado.\n\nNo se pudo armar el WhatsApp automático. Llámalo directamente.`, 'info');
                    }
                }
            } catch (e) {
                console.warn('[pedirAProveedor]', e);
                showAlert('Error al armar el pedido', 'error');
            }
        }

        async function _buildOCText() {
            const stock  = await getAll('stock');
            const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
            const bajos  = stock.filter(s => s.q <= (s.minStock || threshold));
            const biz    = _safeBizConfig();
            const notas  = document.getElementById('oc-notas').value.trim();
            const provId = document.getElementById('oc-proveedor').value;
            const provs  = await getAll('proveedores');
            const prov   = provs.find(p => p.id === Number(provId));
            const fecha  = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'});

            let txt = `📦 *ORDEN DE COMPRA*\n`;
            txt += `🏢 ${biz.name || 'TODO REPUESTOS NELSON'}\n`;
            txt += `📅 ${fecha}\n`;
            if (prov) txt += `👤 Proveedor: *${prov.nombre}*\n`;
            txt += `\n*ARTÍCULOS REQUERIDOS:*\n`;
            bajos.forEach(s => {
                const qty = parseInt(document.getElementById(`oc-qty-${s.id}`)?.value) || 1;
                txt += `• ${s.n}${s.code ? ` (${s.code})` : ''} — *${qty} uds*\n`;
            });
            if (notas) txt += `\n📝 Notas: ${notas}`;
            return { txt, prov };
        }

        async function sendOCWhatsApp() {
            const { txt, prov } = await _buildOCText();
            if (!prov?.tel) return showAlert('Selecciona un proveedor con teléfono registrado para enviar por WhatsApp.', 'warning');
            const num = prov.tel.replace(/\D/g,'');
            const prefix = num.startsWith('57') ? '' : '57';
            sessionStorage.setItem('_waJump','1'); window.open(`https://wa.me/${prefix}${num}?text=${encodeURIComponent(txt)}`, '_blank');
        }

        async function copyOCText() {
            const { txt } = await _buildOCText();
            try {
                await _copyText(txt);
                showToast('Orden copiada al portapapeles ✅', 'success');
            } catch(e) {
                showAlert('No se pudo copiar automáticamente. Selecciona el texto manualmente.', 'info');
            }
        }

