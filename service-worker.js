// ============================================================
// service-worker.js — PWA: caché offline robusto
// NelsonApp Pro — index.html + dashboard.html
// v3.3 — fix opaque responses + todos los CDNs cacheados
// ============================================================

const CACHE_NAME = 'nelsonapp-v3.3';

// Recursos propios (rutas relativas para funcionar en subcarpetas)
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './dashboard.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
];

// Recursos externos — se cachean en segundo plano (no bloquean install)
// TODOS los CDNs que la app usa en cualquier momento deben estar aquí
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,800&display=swap',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

// Dominios que NUNCA deben pasar por el SW (siempre van a red directo)
const BYPASS_DOMAINS = [
    'googleapis.com',
    'accounts.google.com',
    'generativelanguage.googleapis.com',
    'wa.me',
    'api.whatsapp.com',
    'api.anthropic.com',
    'api.telegram.org',
];

// Helper para cachear recursos externos con manejo de respuestas opaque
function cacheExternalAsset(cache, url) {
    const req = new Request(url, { mode: 'no-cors' });
    return fetch(req)
        .then(resp => {
            if (resp && (resp.status === 200 || resp.type === 'opaque')) {
                return cache.put(req, resp);
            }
            throw new Error('Respuesta invalida: ' + resp.status);
        })
        .catch(err => console.warn('[SW] No se pudo cachear externo:', url, err.message));
}

// Instalacion
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando NelsonApp v3.3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precacheando recursos propios...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                return caches.open(CACHE_NAME).then(cache => {
                    return Promise.all(
                        EXTERNAL_ASSETS.map(url => cacheExternalAsset(cache, url))
                    );
                });
            })
            .then(() => {
                console.log('[SW] Instalacion completada');
                return self.skipWaiting();
            })
            .catch(err => console.error('[SW] Error en install:', err))
    );
});

// Activacion: limpiar caches viejas
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => {
                            console.log('[SW] Eliminando cache vieja:', key);
                            return caches.delete(key);
                        })
                )
            )
            .then(() => self.clients.claim())
    );
});

// Fetch: estrategias diferenciadas
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    if (event.request.method !== 'GET') return;

    if (BYPASS_DOMAINS.some(d => url.includes(d))) {
        return;
    }

    // Navegaciones (documentos HTML): cache-first con fallback de red
    if (event.request.mode === 'navigate') {
        const isDashboard = url.includes('dashboard.html');
        const cacheKey = isDashboard ? './dashboard.html' : './index.html';

        event.respondWith(
            caches.match(cacheKey).then(response => {
                return response || fetch(event.request).catch(() => {
                    return new Response(
                        '<html><body style="background:#0d0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center"><h1>Sin conexion</h1><p>La app necesita cargarse al menos una vez con internet.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
        );
        return;
    }

    // Recursos cross-origin (CDNs): cache-first con fetch opaque de respaldo
    const isCrossOrigin = !url.startsWith(self.location.origin);

    if (isCrossOrigin) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                const req = new Request(event.request.url, { mode: 'no-cors' });
                return fetch(req).then(resp => {
                    if (resp && (resp.status === 200 || resp.type === 'opaque')) {
                        const respClone = resp.clone();
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(req, respClone)
                        );
                    }
                    return resp;
                }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
            })
        );
        return;
    }

    // Recursos same-origin: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, networkResponse.clone())
                        );
                    }
                    return networkResponse;
                })
                .catch(() => null);

            if (cachedResponse) {
                event.waitUntil(fetchPromise);
                return cachedResponse;
            }

            return fetchPromise.then(response => {
                if (response) return response;
                return new Response('Recurso no disponible offline', { status: 408 });
            });
        })
    );
});

// Mensajes desde la app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    if (event.data && event.data.type === 'UPDATE_CACHE') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return Promise.all([
                    ...PRECACHE_ASSETS.map(u => cache.add(u).catch(e => console.warn('[SW] Update fallo:', u, e))),
                    ...EXTERNAL_ASSETS.map(u => cacheExternalAsset(cache, u))
                ]);
            }).then(() => {
                console.log('[SW] Cache actualizada manualmente');
                if (event.ports[0]) event.ports[0].postMessage({ updated: true });
            })
        );
    }
});
