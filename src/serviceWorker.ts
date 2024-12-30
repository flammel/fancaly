/// <reference lib="webworker" />

import { manifest, version } from '@parcel/service-worker';

export default null;

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(version).then((cache) => cache.addAll(manifest)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((key) => key !== version && caches.delete(key)))),
    );
});

// A fetch listener is required so that chrome allows installing as an app
self.addEventListener('fetch', (event) => {
    // Special handling for index url is needed because event.request.url includes the URL fragment part,
    // so the cache will not contain an entry for that request.
    const url = new URL(event.request.url);
    const request = url.pathname === '/' || url.pathname === '/index.html' ? new Request('/index.html') : event.request;

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request);
        }),
    );
});
