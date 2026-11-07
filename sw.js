// Service worker: permite abrir la página sin señal (sótanos). Primero intenta la red (para recibir siempre la
// versión nueva); si no hay conexión o tarda, usa la copia guardada de la última visita.
// Solo toca la página misma: las llamadas al motor y a Drive pasan directo.
const CACHE = 'hallazgos-ea236825f1a4';
const ESPERA_RED = 6000; // ms: con señal muy débil se usa la copia guardada

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(l => Promise.all(l.filter(k => k.indexOf('hallazgos-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || req.mode !== 'navigate' || new URL(req.url).origin !== self.location.origin) return;
  const red = fetch(req).then(resp => {
    if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put('./', copia)); }
    return resp;
  });
  const guardada = () => caches.match('./', { ignoreSearch: true });
  ev.respondWith(new Promise(ok => {
    let listo = false;
    const usar = r => { if (!listo && r) { listo = true; ok(r); } };
    const reloj = setTimeout(() => guardada().then(usar), ESPERA_RED);
    red.then(r => { clearTimeout(reloj); usar(r); })
      .catch(() => { clearTimeout(reloj); guardada().then(r => usar(r || Response.error())); });
  }));
  ev.waitUntil(red.catch(() => {}));
});
