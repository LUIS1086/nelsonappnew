/* Nelson App Pro · js/modules/43-archivo-ordenes.js
   Archivar órdenes entregadas antiguas: primero descarga un respaldo JSON y solo después las borra. */
        async function archivarOrdenesViejas() {
            const sel = document.getElementById('archivo-meses');
            const meses = Math.max(6, parseInt(sel && sel.value, 10) || 12);
            const limite = Date.now() - meses * 30.44 * 86400000;
            let todas = [];
            try { todas = await getAll('orders'); } catch (e) { showAlert('No se pudieron leer las órdenes', 'error'); return; }
            const viejas = todas.filter(o => o && o.sta === 'entregado' && (o.fechaEntrega || o.fecha) && (o.fechaEntrega || o.fecha) < limite);
            const info = document.getElementById('archivo-info');
            if (!viejas.length) { if (info) info.innerText = 'No hay órdenes entregadas con más de ' + meses + ' meses.'; showToast('Nada para archivar', 'info'); return; }
            if (info) info.innerText = viejas.length + ' órdenes entregadas con más de ' + meses + ' meses.';
            showConfirm('Se descargará un archivo de respaldo con ' + viejas.length + ' órdenes y luego se borrarán de este dispositivo. Haz antes un respaldo en Drive. ¿Continuar?', async () => {
                try {
                    const cfg = (typeof _safeBizConfig === 'function' ? _safeBizConfig() : {}) || {};
                    const blob = new Blob([JSON.stringify({ tipo: 'archivo-ordenes', version: window.APP_VERSION || '', negocio: cfg.name || '', fecha: new Date().toISOString(), ordenes: viejas })], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'archivo-ordenes-' + new Date().toISOString().slice(0, 10) + '.json';
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                    await new Promise(r => setTimeout(r, 900));
                    let n = 0;
                    for (const o of viejas) { await del('orders', o.id); n++; }
                    showToast(n + ' órdenes archivadas', 'success');
                    if (info) info.innerText = n + ' órdenes archivadas. Guarda bien el archivo descargado.';
                    try { await updateTotal(); } catch (e) {}
                    try { cfgRefreshStorage(); } catch (e) {}
                } catch (e) { console.warn('[archivo]', e); showAlert('No se pudo archivar: ' + (e && e.message || e), 'error'); }
            });
        }
