/* JanSetu offline support.
 *
 * Rural connectivity drops often enough that a blank browser error is a real
 * failure of the portal. This worker never serves stale portal records: API
 * responses are not cached at all, pages are always fetched from the network and
 * only fall back to an offline notice, and just the immutable build assets and
 * images are kept so a reconnecting phone does not download them again.
 */
const VERSION = "jansetu-v1";
const OFFLINE = "/offline";
const CACHEABLE = /\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?)$/;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll([OFFLINE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE).then(page => page || Response.error())));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || CACHEABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
