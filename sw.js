const CACHE_NAME = "personal-wealth-shell-v2.1.1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./config.js",
  "./analytics.js",
  "./api.js",
  "./app.js",
  "./manifest.json",
  "./icons/wealth-icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const STATIC_ASSET_URLS = new Set(
  STATIC_ASSETS.map((asset) => new URL(asset, self.registration.scope).href)
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  // Never cache Google API or financial-data responses.
  if (!isSameOrigin || event.request.method !== "GET") return;
  const isStaticAsset = STATIC_ASSET_URLS.has(requestUrl.href);
  const isNavigation = event.request.mode === "navigate";

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && isStaticAsset) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) return caches.match(new URL("./index.html", self.registration.scope));
        throw new Error("Offline asset is not cached");
      })
  );
});
