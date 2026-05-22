const CACHE_NAME = 'lagerpro-v1';
const ASSETS = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/manifest.json',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png',
    '/static/icons/icon-192-maskable.png',
    '/static/icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching static app shell');
            return cache.addAll(ASSETS).catch(err => {
                console.warn('[Service Worker] Pre-caching asset list encountered issues, continuing:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Always bypass caching for API routes, logins, and logouts
    // This ensures stock counts and authentication statuses are always live and accurate.
    if (
        url.pathname.startsWith('/api/') || 
        url.pathname.startsWith('/login') || 
        url.pathname.startsWith('/logout') ||
        event.request.method !== 'GET'
    ) {
        return; // Let the browser handle dynamic and non-GET requests natively
    }
    
    // For the root path '/' or 'index.html', use Network-First strategy.
    // This ensures that when the user logs in/out, they immediately see the correct state.
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(err => {
                console.log('[Service Worker] Network request failed for root, trying cache:', err);
                return caches.match(event.request);
            })
        );
        return;
    }
    
    // Stale-While-Revalidate pattern for static files
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(err => {
                console.log('[Service Worker] Network request failed, serving from cache if available:', err);
                return cachedResponse;
            });
            
            return cachedResponse || fetchPromise;
        })
    );
});
