// ============================================================
// service-worker.js — PWA: caché offline optimizado
// NelsonApp Pro — Monolito (index.html único)
// ============================================================

const CACHE_NAME = 'nelsonapp-v3.1';

// Recursos propios (rutas relativas para funcionar en subcarpetas)
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
];

// Recursos externos que se cachean en segundo plano (no bloquean install)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,800&display=swap',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

// ── Instalación ──
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando NelsonApp v3.1...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precacheando recursos propios...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Cachear externos sin bloquear la instalación
                caches.open(CACHE_NAME).then(cache => {
                    EXTERNAL_ASSETS.forEach(url => {
                        cache.add(url).catch(err => {
                            console.warn('[SW] No se pudo cachear externo:', url, err);
                        });
                    });
                });
            })
            .then(() => {
                console.log('[SW] Instalación completada');
                return self.skipWaiting();
            })
            .catch(err => console.error('[SW] Error en install:', err))
    );
});

// ── Activación: limpiar cachés viejas ──
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => {
                            console.log('[SW] Eliminando caché vieja:', key);
                            return caches.delete(key);
                        })
                )
            )
            .then(() => self.clients.claim())
    );
});

// ── Fetch: estrategia Stale-While-Revalidate ──
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // No interceptar APIs externas ni métodos no GET
    if (
        url.includes('googleapis.com') ||
        url.includes('accounts.google.com') ||
        url.includes('firestore.googleapis.com') ||
        url.includes('api.anthropic.com') ||
        url.includes('api.telegram.org') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    // Para navegaciones (documentos), usar cache-first con fallback a index.html
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(response => {
                return response || fetch(event.request).catch(() => {
                    // Si no hay red ni caché, mostrar página offline simple
                    return new Response(
                        '<html><body style="background:#0d0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center"><h1>📵 Sin conexión</h1><p>La app necesita cargarse al menos una vez con internet.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
        );
        return;
    }

    // Para otros recursos: Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Actualizar en background
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

            // Devolver respuesta cacheada mientras se actualiza
            if (cachedResponse) {
                event.waitUntil(fetchPromise);
                return cachedResponse;
            }

            // Si no está en caché, ir a red
            return fetchPromise.then(response => {
                if (response) return response;
                // Si falla red y no hay caché, responder con error controlado
                return new Response('Recurso no disponible offline', { status: 408 });
            });
        })
    );
});

// ── Mensajes desde la app ──
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    // Nuevo: forzar actualización de caché bajo demanda
    if (event.data && event.data.type === 'UPDATE_CACHE') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return Promise.all([
                    ...PRECACHE_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Update falló:', url, e))),
                    ...EXTERNAL_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Update externo falló:', url, e)))
                ]);
            }).then(() => {
                console.log('[SW] Caché actualizada manualmente');
                if (event.ports[0]) event.ports[0].postMessage({ updated: true });
            })
        );
    }
});