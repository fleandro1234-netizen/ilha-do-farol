// Carrega arte.js, app.js e lugares.js do jogo num contexto isolado e grava a lista completa de falas.
const fs = require('fs'), vm = require('vm'), path = require('path');
const JOGO = 'C:/Users/filipe.leandro/GitHub/ilha-do-farol/docs/jogo';
const nada = () => {};
const el = () => ({ addEventListener: nada, classList: { add: nada, remove: nada, toggle: nada }, style: {}, querySelector: () => null, querySelectorAll: () => [] });
const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Math, Date, JSON, URL,
  localStorage: { getItem: () => null, setItem: nada, removeItem: nada },
  navigator: { serviceWorker: null }, performance: { now: () => 0 }, location: { protocol: 'file:' },
  matchMedia: () => ({ matches: false }), fetch: async () => ({ ok: false }) };
ctx.window = ctx; ctx.self = ctx; ctx.addEventListener = nada;
ctx.document = { addEventListener: nada, getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el() };
vm.createContext(ctx);
for (const f of ['arte.js', 'app.js', 'lugares.js']) vm.runInContext(fs.readFileSync(path.join(JOGO, f), 'utf8'), ctx, { filename: f });
vm.runInContext('E = estadoPadrao();', ctx);
const lista = vm.runInContext('todasAsFalas().map(f => ({ chave: f.chave, quem: f.quem, id: f.id, texto: f.texto, alto: !!f.alto }))', ctx);
fs.writeFileSync('catalogo.json', JSON.stringify(lista, null, 1), 'utf8');
const por = {}; for (const f of lista) por[f.quem] = (por[f.quem] || 0) + 1;
console.log('falas:', lista.length, 'caracteres:', lista.reduce((a, f) => a + f.texto.length, 0), JSON.stringify(por));
