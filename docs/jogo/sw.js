/* Ilha do Farol: funciona sem internet depois da primeira abertura.
   Estratégia: rede primeiro (a homologação recebe a versão nova na hora); sem rede, usa a cópia guardada. */
const CACHE = 'ilha-farol-0.2.0';
const ARQUIVOS = [
  './', './index.html', './estilo.css', './arte.js', './app.js', './manifest.webmanifest',
  './icones/icone-192.png', './icones/icone-512.png', './icones/icone-180.png',
  './audio/falas.json', './img/arte.json',
];

self.addEventListener('install', ev => {
  // guarda também todas as imagens listadas em img/arte.json, para o jogo abrir inteiro sem internet
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ARQUIVOS);
    try {
      const mapa = await (await fetch('./img/arte.json', { cache: 'no-cache' })).json();
      await c.addAll(Object.values(mapa).map(f => './img/' + f));
    } catch (e) { /* sem mapa, as imagens entram no cache quando forem usadas */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k.startsWith('ilha-farol') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function buscarComPrazo(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('prazo')), ms);
    fetch(req).then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonte) return;
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const resp = await buscarComPrazo(req, fonte ? 6000 : 4000);
      if (resp && (resp.ok || resp.type === 'opaque')) cache.put(req, resp.clone());
      return resp;
    } catch (erro) {
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) return guardado;
      if (req.mode === 'navigate') {
        const pagina = await cache.match('./index.html');
        if (pagina) return pagina;
      }
      throw erro;
    }
  })());
});
