/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
clientsClaim();

// 1. Intercept fetch to bypass SW for YouTube video streams
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (
        url.hostname.includes('googlevideo.com') ||
        (url.hostname.includes('youtube.com') && !url.hostname.includes('i.ytimg.com')) ||
        url.hostname.includes('youtube-nocookie.com')
    ) {
        // Return immediately without calling event.respondWith()
        // This forces the browser to handle the request natively, preventing memory bloat.
        return;
    }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 2. Cache YouTube Thumbnails (Unaffected)
registerRoute(
    /^https:\/\/i\.ytimg\.com\/.*/i,
    new StaleWhileRevalidate({
        cacheName: 'youtube-thumbnails',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
            }),
        ],
    })
);

// 3. Cache API requests
registerRoute(
    /\/api\/.*/i,
    new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
            }),
        ],
    })
);

// 4. SPA Navigation Fallback
try {
    registerRoute(
        new NavigationRoute(createHandlerBoundToURL('/index.html'), {
            denylist: [/^\/api/, /^https?:\/\//],
        })
    );
} catch (e) {
    // Ignore error if /index.html is not found in precache manifest (e.g., during some dev builds)
}
