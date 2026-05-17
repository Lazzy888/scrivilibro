const CACHE_NAME = "scrivilibro-cache-v2";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/splash-1280x720.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // Tenta sempre la rete; se fallisce usa la cache; se la cache è vuota
      // BUG FIX #6: restituisce una Response di errore invece di undefined
      return fetch(req)
        .then((networkRes) => {
          // Aggiorna la cache con la risposta più recente
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(() => {
          if (cached) return cached;
          return new Response("Offline: risorsa non disponibile.", {
            status: 503,
            statusText: "Service Unavailable"
          });
        });
    })
  );
});
