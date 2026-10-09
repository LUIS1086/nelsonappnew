/* Nelson App Pro · js/modules/35-exportacion-pdf-csv-excel.js
   Panel de exportacion PDF/CSV/Excel
   (extraido sin cambios de index.html; el orden de carga importa) */
        // ==================== ⬇️ EXPORTAR PDF / EXCEL / CSV ====================
        // ==================== EXPORTAR DATOS v2 ====================
        let _exportFmt = 'pdf';
        let _exportRange = 'month'; // month | prevmonth | 3months | year | all

        // Calcula timestamps de inicio/fin según el rango elegido
        function _getExportRange() {
            const now = new Date();
            const endMs = now.getTime();
            let fromMs = 0, label = 'Todo el historial';
            const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
            if (_exportRange === 'month') {
                const d = new Date(now.getFullYear(), now.getMonth(), 1);
                fromMs = d.getTime();
                label = `Del 1 al ${now.getDate()} de ${meses[now.getMonth()]}`;
            } else if (_exportRange === 'prevmonth') {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end   = new Date(now.getFullYear(), now.getMonth(), 1).getTime() - 1;
                fromMs = start.getTime();
                label = `${meses[start.getMonth()]} ${start.getFullYear()} completo`;
                return { from: fromMs, to: end + 1, label };
            } else if (_exportRange === '3months') {
                const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                fromMs = d.getTime();
                label = `${meses[d.getMonth()]} → ${meses[now.getMonth()]} ${now.getFullYear()}`;
            } else if (_exportRange === 'year') {
                const d = new Date(now.getFullYear(), 0, 1);
                fromMs = d.getTime();
                label = `Año ${now.getFullYear()}`;
            } else if (_exportRange === 'all') {
                fromMs = 0;
                label = 'Todo el historial';
            }
            return { from: fromMs, to: endMs, label };
        }

        // Shortname del rango para el nombre del archivo
        function _exportRangeFileSlug() {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            if (_exportRange === 'month')     return `${y}-${m}`;
            if (_exportRange === 'prevmonth') {
                const d = new Date(y, now.getMonth() - 1, 1);
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            }
            if (_exportRange === '3months') return `${y}-${m}-3m`;
            if (_exportRange === 'year')    return `${y}`;
            if (_exportRange === 'all')     return 'todo';
            return now.toISOString().slice(0,10);
        }

        function openExportPanel() {
            _exportFmt = 'pdf';
            _exportRange = 'month';
            setExportFmt('pdf');
            setExportRange('month');
            document.getElementById('modal-export-panel').classList.remove('hidden');
        }
        function closeExportPanel() {
            document.getElementById('modal-export-panel').classList.add('hidden');
            document.getElementById('export-loading').classList.add('hidden');
        }

        function setExportFmt(fmt) {
            _exportFmt = fmt;
            ['pdf','excel','csv'].forEach(f => {
                const btn = document.getElementById('exp-fmt-' + f);
                if (!btn) return;
                btn.classList.toggle('active', f === fmt);
            });
        }

        function setExportRange(range) {
            _exportRange = range;
            document.querySelectorAll('#export-range-chips .export-range-chip').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.range === range);
            });
            _updateExportCounts();
        }

        // Recalcula y repinta los contadores en cada tarjeta + label del footer
        async function _updateExportCounts() {
            try {
                const { from, to, label } = _getExportRange();
                const footer = document.getElementById('export-footer-range');
                if (footer) footer.textContent = `📅 ${label}`;

                // Órdenes: filtrar por fecha de creación dentro del rango
                const orders = await getAll('orders');
                const ordenesFiltradas = orders.filter(o => {
                    const f = o.fecha || 0;
                    return f >= from && f <= to;
                });
                const numOrd = document.getElementById('exp-num-ordenes');
                const boxOrd = document.getElementById('exp-count-ordenes');
                if (numOrd) numOrd.textContent = ordenesFiltradas.length;
                if (boxOrd) boxOrd.classList.toggle('export-opt-count-empty', ordenesFiltradas.length === 0);

                // Ventas + gastos
                const sales  = await getAll('sales');
                const gastos = (await getAll('gastos')) || [];
                const salesFilt  = sales.filter(s  => (s.fecha || 0) >= from && (s.fecha || 0) <= to);
                const gastosFilt = gastos.filter(g => (g.fecha || 0) >= from && (g.fecha || 0) <= to);
                const totalMovs = salesFilt.length + gastosFilt.length;
                const numVen = document.getElementById('exp-num-ventas');
                const boxVen = document.getElementById('exp-count-ventas');
                if (numVen) numVen.textContent = totalMovs;
                if (boxVen) boxVen.classList.toggle('export-opt-count-empty', totalMovs === 0);

                // Inventario (snapshot, no se filtra por fecha)
                const stock = await getAll('stock');
                const numInv = document.getElementById('exp-num-inventario');
                const boxInv = document.getElementById('exp-count-inventario');
                if (numInv) numInv.textContent = stock.length;
                if (boxInv) boxInv.classList.toggle('export-opt-count-empty', stock.length === 0);

                // Reporte: refleja el rango seleccionado
                const meses3 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const repLabel = document.getElementById('exp-num-reporte');
                const repSub   = document.getElementById('exp-sub-reporte');
                const nowR = new Date();
                if (_exportRange === 'month') {
                    if (repLabel) repLabel.textContent = meses3[nowR.getMonth()] + ' ' + nowR.getFullYear();
                    if (repSub)   repSub.textContent   = 'Resumen ejecutivo del mes actual';
                } else if (_exportRange === 'prevmonth') {
                    const prev = new Date(nowR.getFullYear(), nowR.getMonth() - 1, 1);
                    if (repLabel) repLabel.textContent = meses3[prev.getMonth()] + ' ' + prev.getFullYear();
                    if (repSub)   repSub.textContent   = 'Resumen ejecutivo del mes pasado';
                } else if (_exportRange === '3months') {
                    if (repLabel) repLabel.textContent = '3 meses';
                    if (repSub)   repSub.textContent   = 'Resumen ejecutivo trimestral';
                } else if (_exportRange === 'year') {
                    if (repLabel) repLabel.textContent = String(nowR.getFullYear());
                    if (repSub)   repSub.textContent   = 'Resumen ejecutivo anual';
                } else if (_exportRange === 'all') {
                    if (repLabel) repLabel.textContent = 'Todo';
                    if (repSub)   repSub.textContent   = 'Resumen ejecutivo histórico';
                }
            } catch(e) { console.warn('[_updateExportCounts]', e); }
        }

        async function runExport(type) {
            const loader = document.getElementById('export-loading');
            loader.classList.remove('hidden');
            try {
                const cur = (typeof getCurrency === 'function') ? getCurrency() : '$';
                const biz = _safeBizConfig();
                const bizName = biz.name || 'NelsonApp';
                const now = new Date();
                const dateStr = now.toISOString().slice(0,10);
                const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const { from, to } = _getExportRange();
                const rangeSlug = _exportRangeFileSlug();

                let rows = [], headers = [], filename = '';

                if (type === 'ordenes') {
                    let orders = await getAll('orders');
                    orders = orders.filter(o => (o.fecha || 0) >= from && (o.fecha || 0) <= to);
                    headers = ['#Orden','Cliente','Teléfono','Equipo','Falla','Estado','Valor','Adelanto','Saldo','Fecha','Entrega Estimada','Técnico'];
                    rows = orders.map((o,i) => [
                        i+1, o.nom||'', o.tel||'', o.equ||'', (o.fal||'').replace(/,/g,' '),
                        o.sta||'', o.val||0, o.adelanto||0, (o.val||0)-(o.adelanto||0),
                        o.fecha ? new Date(o.fecha).toLocaleDateString('es-CO') : '',
                        o.deadline ? new Date(o.deadline).toLocaleDateString('es-CO') : '',
                        o.tecnico||''
                    ]);
                    filename = `ordenes_${rangeSlug}`;
                } else if (type === 'ventas') {
                    let sales = await getAll('sales');
                    let gastos = (await getAll('gastos')) || [];
                    sales  = sales.filter(s  => (s.fecha || 0) >= from && (s.fecha || 0) <= to);
                    gastos = gastos.filter(g => (g.fecha || 0) >= from && (g.fecha || 0) <= to);
                    headers = ['Tipo','Descripción','Ítem','Cantidad','Valor','Fecha'];
                    const saleRows = sales.map(s => [s.tipo||'venta', s.det||s.item||'', s.item||'', s.qty||1, s.val||0, s.fecha ? new Date(s.fecha).toLocaleDateString('es-CO') : '']);
                    const gastoRows = gastos.map(g => ['gasto', g.det||'', '', 1, -(g.val||0), g.fecha ? new Date(g.fecha).toLocaleDateString('es-CO') : '']);
                    rows = [...saleRows, ...gastoRows].sort((a,b) => new Date(b[5]) - new Date(a[5]));
                    filename = `ventas_${rangeSlug}`;
                } else if (type === 'inventario') {
                    const stock = await getAll('stock');
                    headers = ['Nombre','Categoría','Código','Cantidad','Mínimo','Precio Venta','Precio Costo','Estado'];
                    rows = stock.map(s => [
                        s.n||'', s.cat||'', s.code||'', s.q||0, s.minStock||0,
                        s.p||0, s.cost||0,
                        (s.q||0) <= (s.minStock||0) ? 'BAJO MÍNIMO' : 'OK'
                    ]);
                    filename = `inventario_${dateStr}`;
                } else if (type === 'reporte') {
                    const orders = await getAll('orders');
                    const sales = await getAll('sales');
                    const gastos = await getAll('gastos') || [];
                    const { label: rangeLabel } = _getExportRange();
                    const periodOrders = orders.filter(o => o.sta === 'entregado' && (o.fechaEntrega || o.fecha || 0) >= from && (o.fechaEntrega || o.fecha || 0) <= to);
                    const periodSales  = sales.filter(s => (s.fecha || 0) >= from && (s.fecha || 0) <= to && s.tipo !== 'adelanto' && s.tipo !== 'cobro_entrega');
                    const periodGastos = gastos.filter(g => (g.fecha || 0) >= from && (g.fecha || 0) <= to);
                    const totalRep    = periodOrders.reduce((a,b) => a+(b.val||0), 0);
                    const totalVentas = periodSales.reduce((a,b) => a+(b.val||0), 0);
                    const totalGastos = periodGastos.reduce((a,b) => a+(b.val||0), 0);
                    const neto = totalRep + totalVentas - totalGastos;
                    headers = ['Concepto','Valor'];
                    rows = [
                        ['Periodo', rangeLabel],
                        ['Ingresos Reparaciones', totalRep],
                        ['Ingresos Ventas Stock', totalVentas],
                        ['Total Gastos', totalGastos],
                        ['GANANCIA NETA', neto],
                        ['Órdenes entregadas en el periodo', periodOrders.length],
                        ['Órdenes en proceso (actual)', orders.filter(o => o.sta !== 'entregado' && o.sta !== 'cancelado').length],
                        ['Ticket promedio', periodOrders.length ? Math.round(totalRep/periodOrders.length) : 0],
                    ];
                    filename = `reporte_${rangeSlug}`;
                }

                // Si no hay datos para exportar, avisar y salir (evita PDF/Excel vacíos)
                if ((type === 'ordenes' || type === 'ventas') && rows.length === 0) {
                    showAlert('No hay datos en el rango seleccionado.\nPrueba con otro rango de fechas.', 'info');
                    return;
                }

                if (_exportFmt === 'csv') {
                    _exportCSV(headers, rows, filename + '.csv');
                } else if (_exportFmt === 'excel') {
                    await _exportExcel(headers, rows, filename + '.xlsx', bizName, type);
                } else {
                    await _exportPDF(headers, rows, filename + '.pdf', bizName, type, cur);
                }
                showToast('✅ Archivo generado correctamente', 'success');
                closeExportPanel();
            } catch(err) {
                console.error('Export error:', err);
                showToast('❌ Error al exportar: ' + err.message, 'error');
            } finally {
                loader.classList.add('hidden');
            }
        }

        function _exportCSV(headers, rows, filename) {
            const BOM = '\uFEFF';
            const csvContent = BOM + [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        }

        async function _exportExcel(headers, rows, filename, bizName, type) {
            // Usar SheetJS si está disponible, si no, fallback a CSV
            if (window.XLSX) {
                const wsData = [headers, ...rows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
                XLSX.writeFile(wb, filename);
            } else {
                // Cargar SheetJS dinámicamente
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
                const wsData = [headers, ...rows];
                const ws = window.XLSX.utils.aoa_to_sheet(wsData);
                // Estilo de cabecera (SheetJS Community no soporta estilos, pero sí anchos)
                const maxWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]||'').length)));
                ws['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 30) }));
                const wb = window.XLSX.utils.book_new();
                window.XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
                window.XLSX.writeFile(wb, filename);
            }
        }

        // Helper centralizado: garantiza que jsPDF Y el plugin autoTable
        // estén disponibles. Cada uno se chequea de forma independiente, así
        // que si otra función (ej: downloadGuidePDF) ya cargó jsPDF sin el
        // plugin, este helper carga solo lo que falta.
        async function _ensurePdfLibsReady() {
            // 1. jsPDF
            if (!window.jspdf || !window.jspdf.jsPDF) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
            }
            // 2. autoTable plugin (chequeo independiente)
            const hasAutoTable = !!(window.jspdf && window.jspdf.jsPDF &&
                                    window.jspdf.jsPDF.API &&
                                    typeof window.jspdf.jsPDF.API.autoTable === 'function');
            if (!hasAutoTable) {
                await new Promise((resolve, reject) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
            }
        }

        async function _exportPDF(headers, rows, filename, bizName, type, cur) {
            // Cargar libs (jsPDF + autoTable) de forma robusta
            await _ensurePdfLibsReady();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: rows.length > 5 && headers.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
            const now = new Date();
            const typeLabels = { ordenes: 'Órdenes del Taller', ventas: 'Ventas y Gastos', inventario: 'Inventario / Stock', reporte: 'Reporte General del Mes' };

            // Header
            doc.setFillColor(249, 115, 22);
            doc.rect(0, 0, doc.internal.pageSize.width, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text(bizName.toUpperCase(), 14, 10);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            doc.text(typeLabels[type] || type, 14, 17);
            doc.setFontSize(8);
            doc.text('Generado: ' + now.toLocaleString('es-CO'), doc.internal.pageSize.width - 14, 17, { align: 'right' });

            // Table — llamada defensiva: usa el método del prototipo si existe,
            // si no, recurre a la función global standalone que también expone el plugin.
            const tableOpts = {
                head: [headers],
                body: rows,
                startY: 26,
                styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
                headStyles: { fillColor: [30, 30, 50], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                alternateRowStyles: { fillColor: [245, 245, 250] },
                margin: { left: 10, right: 10 },
            };
            if (typeof doc.autoTable === 'function') {
                doc.autoTable(tableOpts);
            } else if (typeof window.autoTable === 'function') {
                window.autoTable(doc, tableOpts);
            } else {
                throw new Error('No se pudo cargar el plugin autoTable. Revisa tu conexión a Internet e intenta de nuevo.');
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount} · ${bizName}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
            }

            doc.save(filename);
        }

