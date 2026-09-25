/* Ilha do Farol: funciona sem internet depois da primeira abertura.
   Estratégia: rede primeiro (a homologação recebe a versão nova na hora); sem rede, usa a cópia guardada. */
const CACHE = 'ilha-farol-0.3.0';
const ARQUIVOS = [
  './', './index.html', './estilo.css', './arte.js', './app.js', './lugares.js', './manifest.webmanifest',
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

const prazo = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('prazo')), ms));
const boa = r => r && (r.ok || r.type === 'opaque');

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonte) return;
  const guardar = caches.open(CACHE);
  // a resposta da rede entra no cache mesmo quando chega depois do prazo: rede lenta não trava a versão nova
  const rede = fetch(req).then(async r => { if (boa(r)) await (await guardar).put(req, r.clone()); return r; });
  ev.waitUntil(rede.catch(() => {}));
  ev.respondWith((async () => {
    const cache = await guardar;
    let resp = null;
    try { resp = await Promise.race([rede, prazo(fonte ? 6000 : 4000)]); } catch (erro) { /* sem rede ou lenta: vai para a cópia */ }
    if (boa(resp)) return resp;
    // erro do servidor (404, 503) ou sem rede: a cópia guardada vale mais que a página de erro
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    if (req.mode === 'navigate') {
      const pagina = await cache.match('./index.html');
      if (pagina) return pagina;
    }
    if (resp) return resp;
    return rede;
  })());
});
