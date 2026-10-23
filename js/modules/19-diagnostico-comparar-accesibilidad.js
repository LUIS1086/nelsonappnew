/* Nelson App Pro · js/modules/19-diagnostico-comparar-accesibilidad.js
   Diagnostico, comparar y accesibilidad
   (extraido sin cambios de index.html; el orden de carga importa) */
        function closeMonthlyReportModal() { document.getElementById('modal-monthly-report').classList.add('hidden'); }
        async function saveMonthlyReportAsImage() {
            const el = document.getElementById('monthly-report-printable');
            if (!el) return;
            try {
                const canvas = await html2canvas(el, { backgroundColor: '#0a0e1a', scale: 2, useCORS: true });
                await downloadImageCompat(canvas, `reporte_mensual_${new Date().toISOString().slice(0,10)}.png`);
            } catch(e) { showAlert('Error al generar imagen', 'error'); }
        }

        // ==================== SUGERENCIA DE DIAGNÓSTICO ====================
        async function suggestDiagnosis() {
            const falla = document.getElementById('c-fal').value.trim().toUpperCase();
            const equ = document.getElementById('c-equ').value.trim().toUpperCase();
            const box = document.getElementById('diagnosis-suggestions');
            if (falla.length < 4 && equ.length < 3) { box.style.display = 'none'; return; }
            const orders = await getAll('orders');
            const keyword = falla.length >= 4 ? falla : equ;
            const matches = orders.filter(o =>
                (o.det && o.det.includes(keyword)) || (o.equ && o.equ.includes(equ))
            ).slice(-10);
            if (!matches.length) { box.style.display = 'none'; return; }
            const freq = {};
            matches.forEach(o => { if (o.det) freq[o.det] = (freq[o.det] || 0) + 1; });
            const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,3);
            box.innerHTML = '<p class="text-[9px] text-slate-500 font-bold px-2 mb-1">💡 DIAGNÓSTICOS FRECUENTES:</p>' +
                sorted.map(([det, cnt]) => `<div class="suggestion-item" onclick="applyDiagnosis('${det.replace(/'/g,"\\'")}')">🔧 ${escapeHtml(det)} <span class="text-slate-500">(${cnt}x)</span></div>`).join('');
            box.style.display = 'block';
        }
        function applyDiagnosis(det) {
            document.getElementById('c-fal').value = det;
            document.getElementById('diagnosis-suggestions').style.display = 'none';
        }

        // ==================== MODAL COMPARACIÓN ANTES / DESPUÉS ====================
        async function openCompareModal(id) {
            const orders = await getAll('orders');
            const o = orders.find(x => x.id === id);
            if (!o) return;

            const fotosRecep   = o.fotos        || [];
            const fotosEntrega = o.fotosEntrega  || [];

            if (!fotosRecep.length && !fotosEntrega.length) {
                return showAlert('Esta orden no tiene fotos registradas.', 'info');
            }

            document.getElementById('modal-compare-title').innerText =
                `🔀 ${escapeHtml(o.equ)} — ANTES / DESPUÉS`;

            const container = document.getElementById('modal-compare-container');
            container.innerHTML = '';

            // Emparejar fotos: mostramos pares lado a lado
            const maxPairs = Math.max(fotosRecep.length, fotosEntrega.length);

            for (let i = 0; i < maxPairs; i++) {
                const row = document.createElement('div');
                row.className = 'photo-compare-grid';

                // Columna ANTES
                const colA = document.createElement('div');
                colA.className = 'compare-entrada';
                colA.innerHTML = `<div class="photo-compare-label">📸 ANTES</div>`;
                if (fotosRecep[i]) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(fotosRecep[i]);
                    img.style.cssText = 'width:100%;border-radius:12px;border:1px solid rgba(249,115,22,0.3);';
                    colA.appendChild(img);
                } else {
                    colA.innerHTML += `<div style="height:100px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px dashed rgba(255,255,255,0.1);color:#475569;font-size:11px;">Sin foto</div>`;
                }

                // Columna DESPUÉS
                const colB = document.createElement('div');
                colB.className = 'compare-salida';
                colB.innerHTML = `<div class="photo-compare-label">📷 DESPUÉS</div>`;
                if (fotosEntrega[i]) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(fotosEntrega[i]);
                    img.style.cssText = 'width:100%;border-radius:12px;border:1px solid rgba(52,211,153,0.3);';
                    colB.appendChild(img);
                } else {
                    colB.innerHTML += `<div style="height:100px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px dashed rgba(255,255,255,0.1);color:#475569;font-size:11px;">Sin foto</div>`;
                }

                row.appendChild(colA);
                row.appendChild(colB);
                container.appendChild(row);
            }

            document.getElementById('modal-compare').classList.remove('hidden');
        }

        function closeCompareModal() {
            document.getElementById('modal-compare').classList.add('hidden');
            document.getElementById('modal-compare-container').innerHTML = '';
        }

        // ==================== NUEVAS FUNCIONES DE CONFIGURACIÓN (ya existentes) ====================
        function applyFontSize() {
            const size = localStorage.getItem('appFontSize') || 'normal';
            const html = document.documentElement;
            html.classList.remove('font-small', 'font-normal', 'font-large');
            html.classList.add(`font-${size}`);
        }
        function setFontSize(level) {
            localStorage.setItem('appFontSize', level);
            applyFontSize();
            showToast(`Tamaño de letra: ${level}`, 'success');
        }
        function toggleHighContrast() {
            const enabled = document.getElementById('high-contrast-toggle').checked;
            if (enabled) document.body.classList.add('high-contrast');
            else document.body.classList.remove('high-contrast');
            localStorage.setItem('highContrast', enabled);
        }
        function applyHighContrast() {
            const saved = localStorage.getItem('highContrast') === 'true';
            document.getElementById('high-contrast-toggle').checked = saved;
            if (saved) document.body.classList.add('high-contrast');
            else document.body.classList.remove('high-contrast');
        }
