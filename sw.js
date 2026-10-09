// Service worker: díky němu jde aplikace nainstalovat a otevře se i bez internetu.
// Strategie: vždy zkusit nejnovější verzi z internetu, při výpadku použít uloženou.
const CACHE = "kontroly-v1";
const ZAKLAD = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ZAKLAD)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Databázi (Supabase) nikdy neukládat – data musí jít vždy živě
  if (e.request.method !== "GET" || url.hostname.endsWith("supabase.co")) return;

  e.respondWith(
    fetch(e.request)
      .then(odpoved => {
        if (odpoved.ok || odpoved.type === "opaque") {
          const kopie = odpoved.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return odpoved;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(r => r || (e.request.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
