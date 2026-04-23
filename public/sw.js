const CURRENT_CACHE = "musicy-network-v6";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CURRENT_CACHE)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) =>
          Promise.all(
            clients.map((client) => {
              if ("navigate" in client) {
                return client.navigate(client.url);
              }

              return undefined;
            }),
          ),
        ),
      ),
  );
});

self.addEventListener("fetch", () => {
  // Network-only. This worker exists to evict older app-shell caches.
});
