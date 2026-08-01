self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

self.addEventListener("fetch", (event) => {
  // Pass through everything, do nothing.
});
