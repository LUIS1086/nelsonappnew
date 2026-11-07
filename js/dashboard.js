// ════════════════════════════════════════
//  SIDEBAR COLLAPSE
// ════════════════════════════════════════
function toggleSidebar() {
  const shell = document.querySelector('.shell');
  const collapsed = shell.classList.toggle('sb-collapsed');
  localStorage.setItem('sbCollapsed', collapsed ? '1' : '0');
}
function applySidebarState() {
  if (localStorage.getItem('sbCollapsed') === '1') {
    document.querySelector('.shell').classList.add('sb-collapsed');
  }
}

// ════════════════════════════════════════
//  BÚSQUEDA GLOBAL EN DASHBOARD
//  (clientes, órdenes, repuestos)
// ════════════════════════════════════════
let _dashOrders = [];
function _normalizeText(s) {
  return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
// ── Identidad de órdenes y clientes (fix: el dashboard usaba o.num, que no existe) ──
// En la app las órdenes se guardan con `id` (único) y `orderNum` (consecutivo visible).
function _bizPrefix() {
  try { return (JSON.parse(localStorage.getItem('businessConfig')||'{}').orderPrefix) || '#'; }
  catch (_) { return '#'; }
}
function _oid(o) { return String(o && o.id != null ? o.id : (o && o.orderNum != null ? o.orderNum : '')); }
function _ordLabel(o) {
  if (!o) return '—';
  const n = o.orderNum != null && o.orderNum !== '' ? String(o.orderNum).padStart(4, '0') : '—';
  return _bizPrefix() + n;
}
function _findOrder(key) {
  const k = String(key);
  return (_dashOrders || []).find(x => _oid(x) === k)
      || (_allOrders  || []).find(x => _oid(x) === k)
      || null;
}
// Índice de clientes: une el store `clientes` (deudas) con los nombres que aparecen en las órdenes,
// porque un cliente sin deuda puede no existir en `clientes`.
function _buildClientIndex() {
  const map = new Map();
  (_dashClientes || []).forEach(c => {
    const k = _normalizeText(c.nombre).trim();
    if (!k) return;
    map.set(k, { nombre: c.nombre, telefono: c.telefono || '', deuda: Number(c.deuda) || 0, ordenes: 0, ultima: 0 });
  });
  const ords = (_allOrders && _allOrders.length) ? _allOrders : (_dashOrders || []);
  ords.forEach(o => {
    const k = _normalizeText(o.nom).trim();
    if (!k) return;
    let e = map.get(k);
    if (!e) { e = { nombre: o.nom, telefono: '', deuda: 0, ordenes: 0, ultima: 0 }; map.set(k, e); }
    e.ordenes++;
    if ((o.fecha || 0) >= e.ultima) { e.ultima = o.fecha || 0; if (o.tel) e.telefono = e.telefono || o.tel; }
    if (!e.telefono && o.tel) e.telefono = o.tel;
  });
  return map;
}

function dashSearch(q) {
  q = _normalizeText(q.trim());
  const ordEl = document.getElementById('orders-panel');
  const stockEl = document.getElementById('stock-panel');
  const deudaEl = document.getElementById('deuda-panel');

  // Si el query está vacío, restaurar paneles originales
  if (!q) {
    const prefix = JSON.parse(localStorage.getItem('businessConfig')||'{}').orderPrefix||'#';
    buildOrdersPanel(_dashOrders, prefix, Date.now());
    const threshold = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
    buildStockPanel(_dashStock || [], threshold);
    buildDeudaPanel(_dashClientes || []);
    return;
  }

  const C2 = () => localStorage.getItem('appCurrency') || '$';
  const fmt2 = v => C2() + Number(v||0).toLocaleString('es-CO');
  const esc2 = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const daysDiff2 = (a,b) => Math.floor((b-a)/86400000);
  const prefix = JSON.parse(localStorage.getItem('businessConfig')||'{}').orderPrefix||'#';
  const now2 = Date.now();

  // 1) Filtrar órdenes
  const qDigits = q.replace(/\D/g, '');
  const filteredOrd = _dashOrders.filter(o =>
    _normalizeText(o.nom).includes(q) ||
    _normalizeText(o.equ).includes(q) ||
    _normalizeText(o.tel).includes(q) ||
    (qDigits && String(o.tel||'').replace(/\D/g,'').includes(qDigits)) ||
    String(o.orderNum||'').includes(q) ||
    _normalizeText(_ordLabel(o)).includes(q)
  );
  if (!filteredOrd.length) {
    ordEl.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">🔍</div>
      <div class="empty-illust-title">Sin órdenes</div>
      <div class="empty-illust-sub">Para "${esc2(q)}"</div>
    </div>`;
  } else {
    const dotClass = { recibido:'pip-recibido','revisión':'pip-revision', reparado:'pip-reparado', entregado:'pip-entregado' };
    ordEl.innerHTML = filteredOrd.slice(0,8).map(o => {
      const dias = daysDiff2(o.fecha, now2);
      const dc = dias > 30 ? 'old' : dias > 7 ? 'medium' : 'fresh';
      return `<div class="order-item" onclick="openOrdenModal('${_oid(o)}')">
        <div class="order-status-pip ${dotClass[o.sta]||'pip-recibido'}"></div>
        <div class="order-num">${_ordLabel(o)}</div>
        <div class="order-info">
          <div class="order-client">${esc2(o.nom)}</div>
          <div class="order-device">${esc2(o.equ)} <span class="order-days ${dc}">${dias}d</span></div>
        </div>
        <div class="order-val">${fmt2(o.val||0)}</div>
      </div>`;
    }).join('');
  }

  // 2) Filtrar repuestos en stock-panel
  const filteredStock = (_dashStock || []).filter(s =>
    _normalizeText(s.n).includes(q) ||
    _normalizeText(s.cat).includes(q) ||
    _normalizeText(s.code).includes(q)
  ).slice(0,6);
  if (stockEl && !filteredStock.length) {
    stockEl.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">🔍</div>
      <div class="empty-illust-title">Sin repuestos</div>
      <div class="empty-illust-sub">Para "${esc2(q)}"</div>
    </div>`;
  }
  if (filteredStock.length && stockEl) {
    stockEl.innerHTML = filteredStock.map(s => {
      const isOut = s.q === 0;
      const minS = s.minStock || 3;
      const pct = isOut ? 100 : Math.min(100, Math.round((s.q / Math.max(minS*2,1))*100));
      const bar = isOut ? 'var(--red)' : s.q <= minS ? 'var(--amber)' : 'var(--green)';
      const qColor = isOut ? 'var(--red)' : s.q <= minS ? 'var(--amber)' : 'var(--green)';
      return `<div class="stock-item">
        <div class="stock-ico">📦</div>
        <div class="stock-info">
          <div class="stock-name">${esc2(s.n)}</div>
          <div class="stock-mini-bar"><div class="stock-mini-fill" style="width:${pct}%;background:${bar};"></div></div>
        </div>
        <div class="stock-right">
          <div class="stock-price">${fmt2(s.p)}</div>
          <div class="stock-qty" style="color:${qColor};">${isOut?'AGOTADO':s.q+' uds'}</div>
        </div>
      </div>`;
    }).join('');
  }

  // 3) Filtrar clientes (todos los registrados: con o sin deuda)
  if (deudaEl) {
    const filteredCli = Array.from(_buildClientIndex().values()).filter(c =>
      _normalizeText(c.nombre).includes(q) ||
      _normalizeText(c.telefono).includes(q) ||
      (qDigits && String(c.telefono||'').replace(/\D/g,'').includes(qDigits))
    ).sort((a,b) => (b.deuda - a.deuda) || (b.ultima - a.ultima)).slice(0,6);
    if (!filteredCli.length) {
      deudaEl.innerHTML = `<div class="empty-illust">
        <div class="empty-illust-icon">🔍</div>
        <div class="empty-illust-title">Sin clientes</div>
        <div class="empty-illust-sub">Para "${esc2(q)}"</div>
      </div>`;
    } else {
      deudaEl.innerHTML = filteredCli.map((c,i) =>
        `<div class="deuda-item" onclick="openClienteDeudaModal('${_encClient(c)}')">
          <div class="deuda-rank">${i+1}</div>
          <div class="deuda-avatar">👤</div>
          <div class="deuda-info">
            <div class="deuda-name">${esc2(c.nombre)}</div>
            <div class="deuda-since">${esc2(c.telefono||'Sin teléfono')} · ${c.ordenes} ${c.ordenes===1?'orden':'órdenes'}</div>
          </div>
          <div class="deuda-val" ${c.deuda>0?'':'style="color:var(--green);"'}>${c.deuda>0 ? fmt2(c.deuda) : 'Al día'}</div>
        </div>`
      ).join('');
    }
  }
}

// ════════════════════════════════════════
//  SKELETON LOADERS
// ════════════════════════════════════════
function showSkeletons() {
  ['orders-panel','mov-panel','top-panel','deuda-panel','garantia-panel','stock-panel','feed-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `
      <div style="padding:12px 0;">
        <div class="skeleton skel-line w80"></div>
        <div class="skeleton skel-line w60"></div>
        <div class="skeleton skel-line w80"></div>
        <div class="skeleton skel-line w40"></div>
        <div class="skeleton skel-line w60"></div>
      </div>`;
  });
}

// ════════════════════════════════════════
//  CONTADOR ANIMADO KPI
// ════════════════════════════════════════
function animateCount(el, target, isMoney) {
  const cur = () => localStorage.getItem('appCurrency') || '$';
  const fmt2 = v => cur() + Math.round(v).toLocaleString('es-CO');
  const start = 0; const duration = 900;
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * ease;
    el.textContent = isMoney ? fmt2(value) : Math.round(value);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = isMoney ? fmt2(target) : target;
  }
  requestAnimationFrame(step);
}

// ════════════════════════════════════════
//  COMPARACIÓN VS MES ANTERIOR
// ════════════════════════════════════════
function calcPrevMonthIngresos(orders, sales) {
  const now = new Date();
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endPrev   = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const rep = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) >= startPrev && (o.fechaEntrega||o.fecha) < endPrev).reduce((a,b)=>a+(b.val||0),0);
  const vta = sales.filter(s => s.fecha >= startPrev && s.fecha < endPrev).reduce((a,b)=>a+(b.val||0),0);
  return rep + vta;
}
function renderVs(elId, current, prev) {
  const el = document.getElementById(elId);
  if (!el || !prev) return;
  const diff = current - prev;
  const pct  = Math.round((diff / prev) * 100);
  const sign = diff >= 0 ? '▲' : '▼';
  const color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  el.innerHTML = `<span style="color:${color};font-size:10px;font-weight:700;">${sign} ${Math.abs(pct)}%</span> <span style="color:var(--text3);font-size:10px;">vs mes anterior</span>`;
}

// ════════════════════════════════════════
//  INDEXED DB
// ════════════════════════════════════════
const DB_NAME = 'NelsonAppPro';
let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    // Abre la DB sin forzar versión — usa la que ya exista en la app principal.
    // Esto evita conflictos si el index.html migra a versiones mayores.
    const r = indexedDB.open(DB_NAME);
    r.onerror = () => { console.warn('[Dashboard] Error abriendo DB:', r.error); rej(r.error); };
    r.onsuccess = () => {
      _db = r.result;
      console.log('[Dashboard] DB abierta v' + _db.version + ' · stores:', Array.from(_db.objectStoreNames));
      res(_db);
    };
    r.onblocked = () => console.warn('[Dashboard] DB bloqueada');
    // No definimos onupgradeneeded — el dashboard es solo lectura, no debe crear ni migrar stores.
  });
}
async function getAll(store) {
  try {
    await openDB();
    // Si el store no existe (porque la app aún no lo creó), devolvemos vacío sin lanzar error
    if (!_db.objectStoreNames.contains(store)) {
      console.warn('[Dashboard] Store no existe:', store);
      return [];
    }
    return new Promise(res => {
      const tx = _db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => { console.warn('[Dashboard] Error leyendo', store, req.error); res([]); };
    });
  } catch (e) { console.warn('[Dashboard] getAll falló:', store, e); return []; }
}

// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
const C = () => localStorage.getItem('appCurrency') || '$';
const fmt = v => C() + Number(v||0).toLocaleString('es-CO');
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const daysDiff = (ts1, ts2) => Math.floor((ts2 - ts1) / 86400000);

function fmtTime(ts) {
  return new Date(ts).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function fmtDay(ts) {
  return new Date(ts).toLocaleDateString('es-ES', { weekday:'short', day:'numeric' }).toUpperCase();
}

// ════════════════════════════════════════
//  RELOJ + FECHA
// ════════════════════════════════════════
function tick() {
  const n = new Date();
  const pad = x => String(x).padStart(2,'0');
  document.getElementById('tb-clock').textContent =
    `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  document.getElementById('tb-date').textContent =
    n.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
}
tick(); setInterval(tick, 1000);

// ════════════════════════════════════════
//  NOMBRES NEGOCIO
// ════════════════════════════════════════
function loadBiz() {
  try {
    const c = JSON.parse(localStorage.getItem('businessConfig') || '{}');
    const name  = c.name  || 'Todo Repuestos Nelson';
    const short = c.shortName || 'TODO REPUESTOS';
    const ver   = String(window.APP_VERSION || c.version || localStorage.getItem('appVersion') || '').replace(/^v/i, '') || '?';
    document.getElementById('sb-short').textContent = short.toUpperCase();
    document.getElementById('sb-name').textContent  = name.toUpperCase().replace('TODO REPUESTOS','').trim() || 'NELSON';
    document.getElementById('tb-title').textContent = 'Command Center';
    const verEl = document.getElementById('sb-version');
    if (verEl) verEl.textContent = `v${ver} · Nelson App Pro`;
    document.title = `${name} — Dashboard`;
    // Breadcrumb
    const bc = document.querySelector('.tb-breadcrumb');
    if (bc) bc.innerHTML = `${esc(short.toUpperCase())} <span>/ Dashboard</span>`;
  } catch {}
}

// ════════════════════════════════════════
//  DASHBOARD PRINCIPAL
// ════════════════════════════════════════
async function loadDashboard(silent) {
  if (!silent) showSkeletons();
  showRefreshIndicator('refreshing');
  try {
    const [ordersRaw, stockRaw, salesRaw, gastosRaw, clientesRaw] = await Promise.all([
      getAll('orders'), getAll('stock'), getAll('sales'), getAll('gastos'), getAll('clientes')
    ]);
    // Guardar siempre los datos completos (para selector de sucursal)
    _allOrders = ordersRaw; _allSales = salesRaw; _allGastos = gastosRaw;

    // Aplicar filtro de sucursal
    const orders   = filterByBranch(ordersRaw);
    const sales    = filterByBranch(salesRaw);
    const gastos   = filterByBranch(gastosRaw);
    const stock    = stockRaw;       // stock generalmente es global
    const clientes = clientesRaw;    // clientes también globales

    _dashOrders = orders;
    _dashSales = sales;
    _dashGastos = gastos;
    _dashStock = stock;
    _dashClientes = clientes;

    // Reconstruir selector si nuevas sucursales aparecen
    buildBranchSelector();

    // ★ Panel Hoy + Insights
    buildTodayPanel(orders, sales, gastos);
    buildInsights(orders, sales, gastos, stock);

  const now        = Date.now();
  const lastCierre = Number(localStorage.getItem('lastCierreCaja')) || 0;
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const threshold  = parseInt(localStorage.getItem('lowStockThreshold')) || 3;
  const cfg        = JSON.parse(localStorage.getItem('businessConfig') || '{}');
  const prefix     = cfg.orderPrefix || '#';

  // ── CAJA ──
  const tOrdCaja  = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) > lastCierre).reduce((a,b) => a+(b.val||0), 0);
  const tSalesCaja= sales.filter(s => s.fecha > lastCierre).reduce((a,b) => a+(b.val||0), 0);
  const tGastos   = gastos.filter(g => g.fecha > lastCierre).reduce((a,b) => a+(b.val||0), 0);
  const caja      = tOrdCaja + tSalesCaja - tGastos;
  animateCount(document.getElementById('kpi-caja'), caja, true);
  document.getElementById('sb-cash').textContent     = fmt(caja);
  document.getElementById('kpi-caja-sub').textContent = `+${fmt(tOrdCaja+tSalesCaja)} ingresos · -${fmt(tGastos)} gastos`;
  const cajaT = document.getElementById('kpi-caja-trend');
  cajaT.textContent = caja >= 0 ? '▲ Positiva' : '▼ Negativa';
  cajaT.className = 'kpi-trend ' + (caja >= 0 ? 'up' : 'down');

  // ── ACTIVAS ──
  const activas = orders.filter(o => o.sta !== 'entregado');
  const listas  = activas.filter(o => o.sta === 'reparado');
  animateCount(document.getElementById('kpi-activas'), activas.length, false);
  document.getElementById('kpi-activas-sub').textContent = `${listas.length} listas para entregar`;
  document.getElementById('kpi-activas-trend').textContent = `${activas.length} en proceso`;
  document.getElementById('kpi-activas-trend').className = 'kpi-trend ' + (listas.length > 0 ? 'up' : 'neutral');
  document.getElementById('sb-badge-activas').textContent = activas.length;
  document.getElementById('sb-badge-listos').textContent  = listas.length;

  // ── INGRESOS MES ──
  const entMes  = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) >= startMonth);
  const ingRep  = entMes.reduce((a,b) => a+(b.val||0), 0);
  const ingVta  = sales.filter(s => s.fecha >= startMonth).reduce((a,b) => a+(b.val||0), 0);
  const ingMes  = ingRep + ingVta;
  animateCount(document.getElementById('kpi-ingresos'), ingMes, true);
  document.getElementById('kpi-ingresos-sub').textContent = `${entMes.length} reparaciones · ${sales.filter(s=>s.fecha>=startMonth).length} ventas`;
  const trendEl = document.getElementById('kpi-ingresos-trend');
  trendEl.textContent = fmt(ingRep) + ' reparac.';
  trendEl.className = 'kpi-trend up';
  // Comparación mes anterior
  const prevIng = calcPrevMonthIngresos(orders, sales);
  renderVs('kpi-ingresos-vs', ingMes, prevIng);

  // ── INVENTARIO ──
  const valInv  = stock.reduce((a,b) => a+(b.p||0)*(b.q||0), 0);
  const bajos   = stock.filter(s => s.q <= threshold && s.q > 0).length;
  const agotados= stock.filter(s => s.q === 0).length;
  animateCount(document.getElementById('kpi-inventario'), valInv, true);
  document.getElementById('kpi-inventario-sub').textContent = `${stock.length} productos`;
  const invTrend = document.getElementById('kpi-inventario-trend');
  if (agotados > 0) { invTrend.textContent = `⚠ ${agotados} agotados`; invTrend.className = 'kpi-trend down'; }
  else if (bajos > 0) { invTrend.textContent = `${bajos} bajos`; invTrend.className = 'kpi-trend warn'; }
  else { invTrend.textContent = '✓ Stock OK'; invTrend.className = 'kpi-trend up'; }

  // ── META ──
  const meta    = parseFloat(localStorage.getItem('metaMensual')) || 0;
  const visible = localStorage.getItem('metaVisible') === 'true';
  if (meta && visible) {
    const pct = Math.min(100, Math.round((ingMes / meta) * 100));
    const card = document.getElementById('meta-card');
    card.style.display = 'block';
    document.getElementById('meta-pct').textContent = pct + '%';
    document.getElementById('meta-pct').style.color = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';
    document.getElementById('meta-subtitle').textContent =
      new Date().toLocaleDateString('es-ES', { month:'long', year:'numeric' });
    document.getElementById('meta-done').textContent = fmt(ingMes) + ' logrado';
    document.getElementById('meta-goal').textContent = 'Meta: ' + fmt(meta);
    const fill = document.getElementById('meta-fill');
    const fillColor = pct >= 100 ? 'linear-gradient(to right,#0fd77a,#34d399)' : pct >= 60 ? 'linear-gradient(to right,#fbbf24,#f59e0b)' : 'linear-gradient(to right,#ff4060,#fb7185)';
    setTimeout(() => { fill.style.width = pct + '%'; fill.style.background = fillColor; }, 300);
    // milestones
    const milestones = [25,50,75,100];
    document.getElementById('meta-milestones').innerHTML = milestones.map(m =>
      `<div class="meta-milestone ${pct >= m ? 'done' : 'pending'}">${pct >= m ? '✓' : ''} ${m}%</div>`
    ).join('');
  }

  // ── ALERTAS ──
  buildAlerts(orders, stock, threshold);

  // ── GRÁFICA 7 DÍAS ──
  buildBarChart(orders, sales, gastos);

  // ── STATUS ──
  buildStatusChart(orders);

  // ── ÓRDENES RECIENTES ──
  buildOrdersPanel(orders, prefix, now);

  // ── EFICIENCIA ──
  buildEficiencia(orders, now);

  // ── MOVIMIENTOS ──
  buildMovPanel(orders, sales, gastos, lastCierre);

  // ── TOP REPUESTOS ──
  buildTopPanel(sales, startMonth);

  // ── DEUDA ──
  buildDeudaPanel(clientes);

  // ── GARANTÍAS ──
  buildGarantiaPanel(orders, now);

  // ── STOCK CRÍTICO ──
  buildStockPanel(stock, threshold);

  // ── FEED ──
  buildFeed(orders, sales, gastos);

  // ── TIEMPO ÚLTIMO CIERRE ──
  updateCajaTime();

  } catch (e) {
    console.error('[Dashboard] Error en loadDashboard:', e);
  } finally {
    showRefreshIndicator('done');
  }
}

// ────────────────────────────────────────
function buildAlerts(orders, stock, threshold) {
  const alerts = [];
  const activas = orders.filter(o => o.sta !== 'entregado');
  const listas  = activas.filter(o => o.sta === 'reparado');
  const vencidas = activas.filter(o => daysDiff(o.fecha, Date.now()) > 60);
  const agotados = stock.filter(s => s.q === 0);
  const bajos    = stock.filter(s => s.q <= threshold && s.q > 0);
  if (listas.length)   alerts.push({ type:'green', icon:'✅', msg:`${listas.length} equipos listos para entregar` });
  if (vencidas.length) alerts.push({ type:'red',   icon:'⏰', msg:`${vencidas.length} órdenes con +60 días sin entrega` });
  if (agotados.length) alerts.push({ type:'red',   icon:'📦', msg:`${agotados.length} productos agotados en inventario` });
  if (bajos.length)    alerts.push({ type:'amber',  icon:'⚠️', msg:`${bajos.length} productos cerca del mínimo` });
  const el = document.getElementById('alert-banner');
  if (!alerts.length) { el.style.display = 'none'; return; }
  el.innerHTML = alerts.map(a =>
    `<div class="alert-chip ${a.type}" onclick="goApp('${a.type==='green'?'ordenes':'ventas'}')">
      <div class="alert-dot"></div>${a.icon} ${a.msg}
    </div>`
  ).join('');
}

// ────────────────────────────────────────
function buildBarChart(orders, sales, gastos) {
  const range = _chartRange || 7;
  const days = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end   = start + 86400000;
    const rep = orders.filter(o => o.sta==='entregado' && (o.fechaEntrega||o.fecha) >= start && (o.fechaEntrega||o.fecha) < end).reduce((a,b)=>a+(b.val||0),0);
    const vta = sales.filter(s => s.fecha >= start && s.fecha < end).reduce((a,b)=>a+(b.val||0),0);
    const gas = gastos.filter(g => g.fecha >= start && g.fecha < end).reduce((a,b)=>a+(b.val||0),0);
    days.push({ label: fmtDay(start).slice(0,3), val: rep+vta, isToday: i===0, net: rep+vta-gas, start, end, fullLabel: new Date(start).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}) });
  }
  const maxVal = Math.max(...days.map(d => d.val), 1);
  const totalPeriodo = days.reduce((a,b) => a+b.val, 0);
  document.getElementById('chart-total-label').textContent = `Total período: ${fmt(totalPeriodo)}`;
  const chart = document.getElementById('bar-chart');
  // Si el rango es grande, mostrar labels cada N barras para no saturar
  const showLabelEvery = range <= 7 ? 1 : range <= 30 ? 5 : 10;
  // Si son solo valores grandes, ocultar los valores individuales para limpieza visual
  const hideValues = range > 7;
  chart.innerHTML = days.map((d, idx) => {
    const h = Math.max(4, Math.round((d.val / maxVal) * 80));
    const showLabel = idx === days.length - 1 || idx % showLabelEvery === 0;
    const valStr = d.val > 0 ? fmt(d.val).replace(C(),'') : '';
    return `<div class="bar-col" onclick="openBarDayModal(${d.start},${d.end},'${d.fullLabel}')">
      <div class="bar-val" style="${hideValues?'visibility:hidden;':''}">${valStr}</div>
      <div class="bar-fill-wrap">
        <div class="bar-fill ${d.isToday ? 'today' : ''}" data-tip="${d.fullLabel}: ${fmt(d.val)}"
             style="height:${h}px;"></div>
      </div>
      <div class="bar-label" style="${showLabel?'':'visibility:hidden;'}">${d.label}</div>
    </div>`;
  }).join('');
}

// ────────────────────────────────────────
function buildStatusChart(orders) {
  const total = orders.length || 1;
  const estados = [
    { key:'recibido',  label:'Recibido',   color:'var(--blue)',   icon:'📥' },
    { key:'revisión',  label:'En revisión',color:'var(--amber)',  icon:'🔍' },
    { key:'reparado',  label:'Listo',      color:'var(--violet)', icon:'✅' },
    { key:'entregado', label:'Entregado',  color:'var(--green)',  icon:'🚚' },
  ];
  const counts = {};
  orders.forEach(o => { counts[o.sta] = (counts[o.sta]||0) + 1; });
  document.getElementById('status-total-label').textContent = `${orders.length} órdenes en total`;
  document.getElementById('status-chart').innerHTML = estados.map(e => {
    const n = counts[e.key] || 0;
    const pct = Math.round((n / total) * 100);
    return `<div class="status-row" onclick="openStatusModal('${e.key}')">
      <div class="status-row-head">
        <div class="status-row-label">
          <div class="status-pip" style="background:${e.color};box-shadow:0 0 6px ${e.color};"></div>
          ${e.label}
        </div>
        <div class="status-row-count">${n}</div>
      </div>
      <div class="status-track">
        <div class="status-fill" style="width:${pct}%;background:${e.color};"></div>
      </div>
      <div class="status-pct">${pct}%</div>
    </div>`;
  }).join('');
}

// ────────────────────────────────────────
function buildOrdersPanel(orders, prefix, now) {
  const recent = [...orders].sort((a,b) => b.fecha - a.fecha).slice(0, 8);
  const el = document.getElementById('orders-panel');
  if (!recent.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">🛠️</div>
      <div class="empty-illust-title">Sin órdenes aún</div>
      <div class="empty-illust-sub">Crea una nueva recepción para comenzar</div>
    </div>`;
    return;
  }
  const dotClass = { recibido:'pip-recibido','revisión':'pip-revision', reparado:'pip-reparado', entregado:'pip-entregado' };
  el.innerHTML = recent.map(o => {
    const dias = daysDiff(o.fecha, now);
    let daysClass = 'fresh', daysLabel = `${dias}d`;
    if (dias > 30) daysClass = 'old';
    else if (dias > 7) daysClass = 'medium';
    return `<div class="order-item" onclick="openOrdenModal('${_oid(o)}')">
      <div class="order-status-pip ${dotClass[o.sta]||'pip-recibido'}"></div>
      <div class="order-num">${_ordLabel(o)}</div>
      <div class="order-info">
        <div class="order-client">${esc(o.nom)}</div>
        <div class="order-device">
          ${esc(o.equ)}
          <span class="order-days ${daysClass}">${daysLabel}</span>
        </div>
      </div>
      <div class="order-val">${fmt(o.val||0)}</div>
    </div>`;
  }).join('');
}

// ────────────────────────────────────────
function buildEficiencia(orders, now) {
  const entregadas = orders.filter(o => o.sta === 'entregado');
  const total = orders.length || 1;
  const tasa  = Math.round((entregadas.length / total) * 100);

  // tiempo promedio de reparación (días)
  const tiempos = entregadas.filter(o => o.fechaEntrega).map(o => daysDiff(o.fecha, o.fechaEntrega));
  const promTiempo = tiempos.length ? Math.round(tiempos.reduce((a,b)=>a+b,0)/tiempos.length) : 0;

  // ticket promedio
  const ticketProm = entregadas.length ? Math.round(entregadas.reduce((a,b)=>a+(b.val||0),0)/entregadas.length) : 0;

  // órdenes hoy
  const hoyStart = new Date(); hoyStart.setHours(0,0,0,0);
  const hoy = orders.filter(o => o.fecha >= hoyStart.getTime()).length;

  const items = [
    { label:'TASA ENTREGA', val: tasa + '%', sub:'vs total órdenes', color:'var(--green)' },
    { label:'TIEMPO PROM.',  val: promTiempo + 'd', sub:'días por reparación', color:'var(--blue)' },
    { label:'TICKET PROM.', val: fmt(ticketProm), sub:'por reparación', color:'var(--accent)' },
    { label:'ÓRDENES HOY',  val: hoy, sub:'registradas hoy', color:'var(--violet)' },
  ];
  document.getElementById('efic-grid').innerHTML = items.map(i =>
    `<div class="efic-item" style="--efic-color:${i.color};">
      <div class="efic-label">${i.label}</div>
      <div class="efic-val">${i.val}</div>
      <div class="efic-sub">${i.sub}</div>
    </div>`
  ).join('');
}

// ────────────────────────────────────────
function buildMovPanel(orders, sales, gastos, lastCierre) {
  const mSales  = sales.filter(s=>s.fecha>lastCierre).map(s=>({...s,_t:'sale',_f:s.fecha}));
  const mGastos = gastos.filter(g=>g.fecha>lastCierre).map(g=>({...g,_t:'gasto',_f:g.fecha}));
  const mOrd    = orders.filter(o=>o.sta==='entregado'&&(o.fechaEntrega||o.fecha)>lastCierre)
                        .map(o=>({...o,_t:'repair',_f:o.fechaEntrega||o.fecha}));
  const all = [...mSales,...mGastos,...mOrd].sort((a,b)=>b._f-a._f).slice(0,7);
  const el = document.getElementById('mov-panel');
  if (!all.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">💸</div>
      <div class="empty-illust-title">Sin movimientos</div>
      <div class="empty-illust-sub">Desde el último cierre de caja</div>
    </div>`;
    return;
  }
  el.innerHTML = all.map(m => {
    if (m._t==='sale')   return `<div class="mov-item"><div class="mov-icon-wrap sale">🛒</div><div class="mov-info"><div class="mov-name">${esc(m.item||'Venta')}</div><div class="mov-date">${fmtTime(m._f)}</div></div><div class="mov-val pos">+${fmt(m.val||0)}</div></div>`;
    if (m._t==='repair') return `<div class="mov-item"><div class="mov-icon-wrap repair">🔧</div><div class="mov-info"><div class="mov-name">${esc(m.nom||'')} · ${esc(m.equ||'')}</div><div class="mov-date">${fmtTime(m._f)}</div></div><div class="mov-val pos">+${fmt(m.val||0)}</div></div>`;
    return `<div class="mov-item"><div class="mov-icon-wrap gasto">💸</div><div class="mov-info"><div class="mov-name">${esc(m.det||'Gasto')}</div><div class="mov-date">${fmtTime(m._f)}</div></div><div class="mov-val neg">-${fmt(m.val||0)}</div></div>`;
  }).join('');
}

// ────────────────────────────────────────
function buildTopPanel(sales, startMonth) {
  const mesSales = sales.filter(s => s.fecha >= startMonth);
  const counts = {};
  mesSales.forEach(s => { counts[s.item] = (counts[s.item]||0) + (s.qty||1); });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const el = document.getElementById('top-panel');
  if (!sorted.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">🏆</div>
      <div class="empty-illust-title">Sin ventas este mes</div>
      <div class="empty-illust-sub">Los más vendidos aparecerán aquí</div>
    </div>`;
    return;
  }
  const rankClass = ['gold','silver','bronze','',''];
  el.innerHTML = sorted.map(([name,qty], i) =>
    `<div class="top-item">
      <div class="top-rank ${rankClass[i]}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
      <div class="top-info">
        <div class="top-name">${esc(name)}</div>
        <div class="top-sub">${qty} unidades vendidas</div>
      </div>
      <div class="top-count">${qty}</div>
    </div>`
  ).join('');
}

// ────────────────────────────────────────
function buildDeudaPanel(clientes) {
  const deudores = clientes.filter(c=>c.deuda>0).sort((a,b)=>b.deuda-a.deuda).slice(0,6);
  const el = document.getElementById('deuda-panel');
  if (!deudores.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">✅</div>
      <div class="empty-illust-title">Cartera al día</div>
      <div class="empty-illust-sub">Sin deudas pendientes</div>
    </div>`;
    return;
  }
  el.innerHTML = deudores.map((c,i) =>
    `<div class="deuda-item" onclick="openClienteDeudaModal('${_encClient(c)}')">
      <div class="deuda-rank">${i+1}</div>
      <div class="deuda-avatar">👤</div>
      <div class="deuda-info">
        <div class="deuda-name">${esc(c.nombre)}</div>
        <div class="deuda-since">${esc(c.telefono||'Sin teléfono')}</div>
      </div>
      <div class="deuda-val">${fmt(c.deuda)}</div>
    </div>`
  ).join('');
}

// ────────────────────────────────────────
function buildGarantiaPanel(orders, now) {
  const warrantyDays = parseInt(localStorage.getItem('warrantyAlertDays')) || 5;
  const upcoming = orders
    .filter(o => {
      if (!o.garantia || o.garantia <= 0) return false;
      if (o.sta !== 'entregado' || !o.fechaEntrega) return false;
      const vence = o.fechaEntrega + (o.garantia * 86400000);
      const diasRestantes = daysDiff(now, vence);
      return diasRestantes >= 0 && diasRestantes <= (warrantyDays + 5);
    })
    .map(o => {
      const vence = o.fechaEntrega + (o.garantia * 86400000);
      return { ...o, diasRestantes: daysDiff(now, vence) };
    })
    .sort((a,b) => a.diasRestantes - b.diasRestantes)
    .slice(0, 6);

  const el = document.getElementById('garantia-panel');
  if (!upcoming.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">🛡️</div>
      <div class="empty-illust-title">Garantías al día</div>
      <div class="empty-illust-sub">Ninguna próxima a vencer</div>
    </div>`;
    return;
  }
  el.innerHTML = upcoming.map(o => {
    const isHoy = o.diasRestantes === 0;
    const cls   = isHoy ? 'vence-hoy' : 'vence-pronto';
    const label = isHoy ? '¡HOY!' : `${o.diasRestantes}d`;
    return `<div class="garantia-item">
      <div class="garantia-days" style="color:${isHoy?'var(--red)':'var(--amber)'}">${label}</div>
      <div class="garantia-info">
        <div class="garantia-client">${esc(o.nom)}</div>
        <div class="garantia-device">${esc(o.equ)}</div>
      </div>
      <div class="garantia-badge ${cls}">${o.garantia}d garantía</div>
      <button type="button" class="garantia-wa-btn" onclick="avisarGarantiaWA(${o.id})" title="Avisar por WhatsApp: vencimiento + mantenimiento de obsequio" aria-label="Avisar por WhatsApp">💬</button>
    </div>`;
  }).join('');
}

// Aviso por WhatsApp: garantía por vencer + mantenimiento de obsequio
function buildAvisoGarantiaMsg(order) {
  const cfg = JSON.parse(localStorage.getItem('businessConfig') || '{}');
  const neg = (cfg.name || 'Todo Repuestos Nelson').trim().toUpperCase();
  const vence = order.fechaEntrega + (order.garantia * 86400000);
  const dias = daysDiff(Date.now(), vence);
  const d = new Date(vence);
  const fecha = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  const restan = dias <= 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  const equipo = order.equ || 'equipo';
  let tpl = '';
  try { tpl = (JSON.parse(localStorage.getItem('whatsappTemplates') || '{}').garantiavence || '').trim(); } catch (e) {}
  if (!tpl) tpl = '🔧 *{negocio}*\n\nHola {cliente} 👋, te recordamos que la garantía de tu {equipo} vence {restan} ({vence}) 🛡️\n\nComo agradecimiento por confiar en nosotros, queremos *obsequiarte un mantenimiento* de tu {equipo} sin costo 🎁. Escríbenos o pásate por el local para agendarlo antes de que venza la garantía. ¡Te esperamos! 🙌';
  return tpl
    .replace(/{negocio}/g, neg)
    .replace(/{cliente}/g, order.nom || '')
    .replace(/{equipo}/g, equipo)
    .replace(/{dias}/g, order.garantia || '')
    .replace(/{vence}/g, fecha)
    .replace(/{restan}/g, restan);
}
async function avisarGarantiaWA(orderId) {
  const o = (_dashOrders || []).find(x => x.id === orderId);
  if (!o) return;
  if (!cleanPhone(o.tel)) { alert('⚠️ Este cliente no tiene teléfono registrado.'); return; }
  openWhatsApp(o.tel, buildAvisoGarantiaMsg(o));
}

// ────────────────────────────────────────
function buildStockPanel(stock, threshold) {
  const critical = stock.filter(s=>s.q<=threshold).sort((a,b)=>a.q-b.q).slice(0,6);
  const el = document.getElementById('stock-panel');
  const catIcons = {
    // Licuadoras
    'Cuchillas licuadora':'🔪','Cuchillas':'🔪','Cuchilla':'🔪',
    'Vasos licuadora':'🥤','Vaso licuadora':'🥤','Vasos':'🥤',
    'Acoples Oster':'🔩','Acoples':'🔩','Acople':'🔩',
    'Acoples Samurái':'🔩','Acoples Samurai':'🔩',
    'Empaques licuadora':'⭕','Empaque licuadora':'⭕',
    'Motores licuadora':'⚙️','Motor licuadora':'⚙️',
    'Bases licuadora':'🔌','Base licuadora':'🔌',
    // Ventiladores
    'Motores ventilador':'🌀','Motor ventilador':'🌀','Motores':'⚙️',
    'Aspas ventilador':'🌬️','Aspas':'🌬️','Aspa':'🌬️','Élices':'🌬️','Hélices':'🌬️',
    'Rejillas ventilador':'🪟','Rejillas':'🪟',
    'Capacitores':'🔋','Condensadores':'🔋',
    // Ollas a presión
    'Empaques olla':'🍲','Empaque olla':'🍲','Empaques':'⭕',
    'Válvulas olla':'🔘','Válvulas':'🔘','Válvula':'🔘',
    'Tapones olla':'🔒','Tapones':'🔒',
    'Mangos olla':'🤚','Mangos':'🤚','Asas':'🤚',
    'Fusibles olla':'⚡','Fusibles':'⚡',
    // Freidoras / Sandwicheras / Planchas
    'Resistencias':'🔥','Resistencia':'🔥',
    'Termostatos':'🌡️','Termostato':'🌡️',
    'Cables':'🔌','Cable':'🔌','Cordones':'🔌','Cordón':'🔌',
    'Enchufes':'🔌','Enchufe':'🔌','Tomas':'🔌',
    'Suiches':'🔘','Switch':'🔘','Interruptores':'🔘',
    'Perillas':'🎛️','Perilla':'🎛️','Cuadrantes':'📐',
    'Patas':'🦶','Patas plástico':'🦶',
    // Generales
    'Tornillería':'🔩','Tornillos':'🔩',
    'Carbones motor':'⚫','Carbones':'⚫',
    'Rodamientos':'⚙️','Baleros':'⚙️',
    'Otros':'📦','Varios':'📦'
  };
  if (!critical.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">📦</div>
      <div class="empty-illust-title">Stock saludable</div>
      <div class="empty-illust-sub">Inventario en buen estado</div>
    </div>`;
    return;
  }
  el.innerHTML = critical.map(s => {
    const isOut = s.q === 0;
    const pct   = isOut ? 100 : Math.min(100, Math.round((s.q / Math.max((s.minStock||threshold)*2,1))*100));
    const bar   = isOut ? 'var(--red)' : 'var(--amber)';
    return `<div class="stock-item" onclick="openStockCriticoModal()">
      <div class="stock-ico">${catIcons[s.cat]||'📦'}</div>
      <div class="stock-info">
        <div class="stock-name">${esc(s.n)}</div>
        <div class="stock-mini-bar"><div class="stock-mini-fill" style="width:${pct}%;background:${bar};"></div></div>
      </div>
      <div class="stock-right">
        <div class="stock-price">${fmt(s.p)}</div>
        <div class="stock-qty" style="color:${isOut?'var(--red)':'var(--amber)'};">${isOut?'AGOTADO':s.q+' uds'}</div>
      </div>
    </div>`;
  }).join('');
}

// ────────────────────────────────────────
function buildFeed(orders, sales, gastos) {
  const events = [
    ...orders.map(o => ({ ts: o.fecha, type:'order', data:o })),
    ...sales.map(s  => ({ ts: s.fecha, type:'sale',  data:s })),
    ...gastos.map(g => ({ ts: g.fecha, type:'gasto', data:g })),
    ...orders.filter(o=>o.sta==='entregado'&&o.fechaEntrega).map(o=>({ ts:o.fechaEntrega, type:'entrega', data:o })),
  ].sort((a,b)=>b.ts-a.ts).slice(0,8);

  const el = document.getElementById('feed-panel');
  if (!events.length) {
    el.innerHTML = `<div class="empty-illust">
      <div class="empty-illust-icon">⏱️</div>
      <div class="empty-illust-title">Sin actividad reciente</div>
      <div class="empty-illust-sub">Las acciones aparecerán aquí en vivo</div>
    </div>`;
    return;
  }

  const pad = x => String(x).padStart(2,'0');
  el.innerHTML = events.map((e, i) => {
    const d = new Date(e.ts);
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let text = '';
    if (e.type==='order')   text = `Nueva orden — <strong>${esc(e.data.nom)}</strong> · <span class="chip">${esc(e.data.equ)}</span>`;
    if (e.type==='sale')    text = `Venta de <strong>${esc(e.data.item)}</strong> · ${e.data.qty} unid · <strong>${fmt(e.data.val)}</strong>`;
    if (e.type==='gasto')   text = `Gasto registrado — <strong>${esc(e.data.det)}</strong> · <span style="color:var(--red)">${fmt(e.data.val)}</span>`;
    if (e.type==='entrega') text = `Equipo entregado — <strong>${esc(e.data.nom)}</strong> · <span style="color:var(--green)">${fmt(e.data.val)}</span>`;
    return `<div class="feed-item">
      <div class="feed-time">${t}</div>
      <div class="feed-dot-col">
        <div class="feed-dot" style="background:${e.type==='gasto'?'var(--red)':e.type==='entrega'?'var(--green)':e.type==='sale'?'var(--blue)':'var(--accent)'};"></div>
        ${i < events.length-1 ? '<div class="feed-line"></div>' : ''}
      </div>
      <div class="feed-text">${text}</div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════
//  TEMA
// ════════════════════════════════════════
function _dashPaint(light) {
  document.body.classList.toggle('light-mode', light);
  document.body.classList.toggle('dark-mode', !light);
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
  document.documentElement.style.colorScheme = light ? 'light' : 'dark';
  const b = document.getElementById('theme-btn');
  if (b) b.textContent = light ? '☀️' : '🌙';
  syncThemeColor();
}
function toggleDashTheme() {
  const light = !document.body.classList.contains('light-mode');
  try { localStorage.setItem('appTheme', light ? 'light' : 'dark'); } catch (e) {}
  _dashPaint(light);
}
function applyTheme() {
  const saved = localStorage.getItem('appTheme');   // 'dark' | 'light' | 'system' | null
  const sysLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const light = saved === 'light' || ((saved === 'system' || !saved) && sysLight);
  _dashPaint(light);
}

// ════════════════════════════════════════
//  ★ PREMIUM v3 — shell móvil (barra inferior, hoja "Más", tema)
// ════════════════════════════════════════
function syncThemeColor() {
  const m = document.getElementById('meta-theme-color');
  if (m) m.setAttribute('content', document.body.classList.contains('light-mode') ? '#f2f2f7' : '#07080f');
}
function openMoreSheet() {
  const sh = document.getElementById('more-sheet');
  const bd = document.getElementById('sheet-backdrop');
  if (!sh || !bd) return;
  sh.classList.add('open'); bd.classList.add('open');
  document.body.classList.add('sheet-open');
  const b = document.getElementById('bn-more'); if (b) b.setAttribute('aria-expanded', 'true');
}
function closeMoreSheet() {
  const sh = document.getElementById('more-sheet');
  const bd = document.getElementById('sheet-backdrop');
  if (sh) sh.classList.remove('open');
  if (bd) bd.classList.remove('open');
  document.body.classList.remove('sheet-open');
  const b = document.getElementById('bn-more'); if (b) b.setAttribute('aria-expanded', 'false');
}
function setupMobileShell() {
  const mq   = window.matchMedia('(max-width: 780px)');
  const sel  = document.getElementById('branch-selector');
  const slot = document.getElementById('branch-slot');
  const left = document.querySelector('.tb-left');
  // En móvil el selector de sucursal pasa al contenido (chips); en escritorio vuelve al topbar
  const place = () => {
    if (!sel || !slot || !left) return;
    if (mq.matches) { if (sel.parentElement !== slot) slot.appendChild(sel); }
    else { if (sel.parentElement !== left) left.appendChild(sel); closeMoreSheet(); }
  };
  place();
  if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place);

  // Insignias de la barra inferior reflejan las del menú lateral
  const pairs = [['sb-badge-activas', 'bn-badge-ordenes'], ['sb-badge-listos', 'sh-badge-listos']];
  const sync = () => pairs.forEach(([from, to]) => {
    const a = document.getElementById(from), b = document.getElementById(to);
    if (!a || !b) return;
    const n = parseInt(a.textContent, 10);
    const has = Number.isFinite(n) && n > 0;
    b.textContent = has ? (n > 99 ? '99+' : String(n)) : '';
    b.hidden = !has;
  });
  pairs.forEach(([from]) => {
    const a = document.getElementById(from);
    if (a) new MutationObserver(sync).observe(a, { childList: true, characterData: true, subtree: true });
  });
  sync();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMoreSheet(); });
  syncThemeColor();
}

// ════════════════════════════════════════
//  ★ ATAJOS DE TECLADO
// ════════════════════════════════════════
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // No interferir con inputs
    if (e.target.matches('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // / → focus búsqueda
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('tb-search-input')?.focus();
      return;
    }
    // Escape → limpiar búsqueda
    if (e.key === 'Escape') {
      const inp = document.getElementById('tb-search-input');
      if (inp && inp.value) { inp.value = ''; dashSearch(''); }
    }
    // 1-4 → abrir KPI modal
    if (['1','2','3','4'].includes(e.key)) {
      const map = { '1':'caja', '2':'activas', '3':'ingresos', '4':'inventario' };
      openKpiModal(map[e.key]);
    }
    // n → nueva orden
    if (e.key.toLowerCase() === 'n') goApp('taller');
    // r → ir a reporte
    if (e.key.toLowerCase() === 'r') goAction('report');
    // t → toggle tema
    if (e.key.toLowerCase() === 't') toggleDashTheme();
    // f → refrescar
    if (e.key.toLowerCase() === 'f') { loadDashboard(true); }
  });
}

// ════════════════════════════════════════
//  ★ AUTO-REFRESH INTELIGENTE
//  (pausa cuando la pestaña no es visible)
// ════════════════════════════════════════
let _autoRefreshTimer = null;
function startAutoRefresh() {
  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer = setInterval(() => {
    if (document.hidden) return; // ahorrar batería
    loadDashboard(true);
  }, 30000);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Al volver a la pestaña, refrescar inmediatamente si han pasado >15s
    const sec = (Date.now() - _lastRefreshTs)/1000;
    if (sec > 15) loadDashboard(true);
  }
});
window.addEventListener('DOMContentLoaded', async () => {
  // El dashboard se inicializa también en móviles y tablets.

  applyTheme();
  applySidebarState();
  loadBiz();
  // Restaurar sucursal activa
  _activeBranch = localStorage.getItem('dashActiveBranch') || 'all';
  // Arrancar el reloj
  tick();
  setInterval(tick, 1000);

  // ★ Range toggle listener
  document.getElementById('range-toggle').addEventListener('click', e => {
    const btn = e.target.closest('.range-btn');
    if (!btn) return;
    setChartRange(Number(btn.dataset.range));
  });

  // ★ Pulido: scroll FAB, atajos, refresh tiempo caja
  setupScrollFab();
  setupMobileShell();
  setupKeyboardShortcuts();
  setInterval(updateCajaTime, 60000); // cada minuto refresca el tiempo

  await loadDashboard();
  // ★ Auto-refresh inteligente (pausa cuando pestaña no es visible)
  startAutoRefresh();
});
