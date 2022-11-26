import { manifest, version } from '@parcel/service-worker';

export default null;

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(version).then((cache) => cache.addAll(manifest)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((key) => key !== version && caches.delete(key)))),
    );
});
