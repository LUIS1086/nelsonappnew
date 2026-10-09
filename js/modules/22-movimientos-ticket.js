/* Nelson App Pro · js/modules/22-movimientos-ticket.js
   Movimientos completos y tickets
   (extraido sin cambios de index.html; el orden de carga importa) */
        async function clearMovFiltros() {
            document.getElementById('mov-filter-from').value = '';
            document.getElementById('mov-filter-to').value = '';
            // Recargar para que los totales vuelvan a los del scope completo
            await _loadMovimientosByScope();
            renderMovimientosFull(_allMovimientos);
        }

        function renderMovimientosFull(list) {
            const container = document.getElementById('mov-full-list');
            if (!list.length) { container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">Sin movimientos en este período</div>'; return; }
            container.innerHTML = list.map(m => {
                const fecha = new Date(m.fecha).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                if (m.type === 'sale')   return `<div class="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-emerald-400">+ Venta repuesto</p><p class="text-[11px] text-slate-300">${escapeHtml(m.item)} × ${m.qty}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-emerald-400">+${fmtMoney(m.val||0)}</p></div>`;
                if (m.type === 'repair') return `<div class="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-blue-400">+ Reparación</p><p class="text-[11px] text-slate-300">${escapeHtml(m.nom||'')} — ${escapeHtml(m.equ||'')}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-blue-400">+${fmtMoney(m.val||0)}</p></div>`;
                return `<div class="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl"><div><p class="text-xs font-black text-rose-400">− Gasto</p><p class="text-[11px] text-slate-300">${escapeHtml(m.det||'')}</p><p class="text-[10px] text-slate-500">${fecha}</p></div><p class="text-sm font-black text-rose-400">-${fmtMoney(m.val||0)}</p></div>`;
            }).join('');
        }

        function closeMovimientosModal() { document.getElementById('modal-movimientos').classList.add('hidden'); }
        function closeTicketMovModal()    { document.getElementById('modal-ticket-mov').classList.add('hidden'); }

        function generarTicketMovimientos() {
            const biz = _safeBizConfig();
            const now = new Date().toLocaleString('es-ES');
            const list = _allMovimientos;
            const ing = list.filter(m => m.type !== 'gasto').reduce((a,b) => a + (b.val||0), 0);
            const gas = list.filter(m => m.type === 'gasto').reduce((a,b) => a + (b.val||0), 0);
            const net = ing - gas;
            const c = getCurrency();
            let lines = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="font-size:22px;">${biz.name ? '' : '🔧'}</div>
  <strong style="font-size:14px;">${biz.name || 'TALLER'}</strong><br>
  <span style="font-size:10px;color:#666;">${biz.address || ''} ${biz.phone ? '| ' + biz.phone : ''}</span>
</div>
<div style="text-align:center;font-size:10px;color:#999;margin-bottom:4px;">REPORTE DE MOVIMIENTOS</div>
<div style="font-size:10px;text-align:center;color:#555;margin-bottom:8px;">${now}</div>
<div style="border-top:1px dashed #ccc;margin:6px 0;"></div>`;

            list.forEach(m => {
                const d = new Date(m.fecha).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
                const label = m.type === 'sale' ? `Venta: ${m.item}` : m.type === 'repair' ? `Reparo: ${m.nom}` : `Gasto: ${m.det}`;
                const val   = m.type === 'gasto' ? `-${c}${(m.val||0).toLocaleString()}` : `+${c}${(m.val||0).toLocaleString()}`;
                const color = m.type === 'gasto' ? '#dc2626' : m.type === 'repair' ? '#2563eb' : '#059669';
                lines += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px dotted #eee;">
  <span style="color:#333;max-width:65%;overflow:hidden;">${label}<br><span style="font-size:9px;color:#999;">${d}</span></span>
  <strong style="color:${color};">${val}</strong>
</div>`;
            });

            lines += `
<div style="border-top:2px solid #333;margin-top:8px;padding-top:6px;">
  <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Ingresos:</span><strong style="color:#059669;">+${c}${ing.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Gastos:</span><strong style="color:#dc2626;">-${c}${gas.toLocaleString()}</strong></div>
  <div style="display:flex;justify-content:space-between;font-size:14px;border-top:1px dashed #ccc;margin-top:4px;padding-top:4px;"><span><strong>NETO:</strong></span><strong style="color:${net>=0?'#059669':'#dc2626'};">${net>=0?'+':''}${c}${net.toLocaleString()}</strong></div>
</div>
<div style="text-align:center;font-size:10px;color:#aaa;margin-top:8px;">${biz.footer || '¡Gracias por su preferencia!'}</div>`;

            document.getElementById('ticket-mov-content').innerHTML = lines;
            document.getElementById('modal-ticket-mov').classList.remove('hidden');
        }

        async function descargarTicketMovimientos() {
            generarTicketMovimientos();
            await new Promise(r => setTimeout(r, 200));
            saveTicketAsImage();
        }

        async function saveTicketAsImage() {
            const el = document.getElementById('ticket-mov-content');
            if (!el || typeof html2canvas === 'undefined') { showAlert('html2canvas no disponible', 'error'); return; }
            try {
                const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
                await downloadImageCompat(canvas, `movimientos_${new Date().toISOString().slice(0,10)}.png`);
            } catch(e) { showAlert('Error al generar imagen', 'error'); }
        }

        async function downloadImageCompat(canvas, fileName) {
            if (navigator.share && navigator.canShare) {
                try {
                    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                    const file = new File([blob], fileName, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: fileName });
                        showToast('Imagen lista para guardar', 'success');
                        return;
                    }
                } catch(e) { if (e.name !== 'AbortError') console.warn('Share falló:', e); }
            }
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Imagen descargada', 'success');
        }

        function formatOrderNum(n) {
            const config = _safeBizConfig();
            const prefix = config.orderPrefix || '#';
            return prefix + String(n).padStart(4, '0');
        }

        // ==================== GOOGLE DRIVE ====================
        const DRIVE_CLIENT_ID = '1048860878818-srq77k0q63bbka6p9k0m55jah31gkmnt.apps.googleusercontent.com';
        const DRIVE_SCOPES    = 'https://www.googleapis.com/auth/drive.file';
        const DRIVE_FOLDER    = 'NelsonApp_Backups';
        let driveToken = null;
        let driveFolderId = null;
        let driveTokenClient = null;       // Cliente OAuth reutilizable (se crea una sola vez)
        let driveTokenExpiresAt = 0;       // Timestamp (ms) de cuándo expira el token
        let driveRefreshTimerId = null;    // ID del setTimeout para refresh proactivo

