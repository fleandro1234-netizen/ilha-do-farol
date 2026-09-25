'use strict';
/* Ilha do Farol: protótipo de homologação, lugar Vila Conversa.
   Roda inteiro no aparelho: sem servidor, sem conta e, depois da primeira abertura, sem internet. */

const VERSAO = '0.3.0';
const CHAVE = 'ilhaFarol.v1';
const TETO_DIARIO_MIN = 30;
const ANEIS = 5;
const CONCHAS_POR_ANEL = 8;
const CONCHAS_POR_PECA = 6;

/* ============================================================
   Alvos, falas e configuração padrão
   ============================================================ */

const ALVOS = {
  querer1: { nome: 'Pedir com um cartão', desc: 'Entregar ao morador o cartão da coisa que o Lume precisa.',
    missao: 'Tentação boa: deixe o brinquedo preferido à vista e fora do alcance, espere 5 segundos e atenda na hora qualquer pedido (apontar, cartão ou palavra).' },
  querer2: { nome: 'Pedir com frase', desc: 'Montar "eu quero" + a coisa. No nível 3, também a cor.',
    missao: 'No lanche, ofereça duas opções e espere a criança montar o pedido ("eu quero" + a coisa) antes de entregar.' },
  ajuda: { nome: 'Pedir ajuda', desc: 'Pedir ajuda quando o baú não abre.',
    missao: 'Deixe um pote bem fechado com algo de que ela gosta e espere ela pedir ajuda. Ajude na hora e diga: "você pediu ajuda".' },
  ajuste: { nome: 'Pedir ajuste', desc: 'Pedir para a Gigi falar mais baixo.',
    missao: 'Numa brincadeira, fale um pouco mais alto de propósito e baixe a voz na hora em que ela pedir.' },
  recusar: { nome: 'Recusar com educação', desc: 'Dizer "não, obrigado" ao que o Lume não quer.',
    missao: 'Ofereça algo de que ela não gosta e aceite na hora o "não, obrigado", sem insistir.' },
};
const FASES = { 'linha-de-base': 'Linha de base', ensino: 'Ensino', aprendido: 'Aprendido' };
const DEGRAUS = { 0: 'sozinha', 2: 'pista visual', 3: 'modelo do Lume', 4: 'ajuda total' };

const ETAPAS = {
  comoEstou: { rotulo: 'Como estou', fala: 'dizer como você está', icone: () => ICONE.comoEstou() },
  aquecer: { rotulo: 'Aquecer', fala: 'aquecer', icone: () => A.coisa('concha', 'amarela') },
  vila: { rotulo: 'Vila Conversa', fala: 'ir à Vila Conversa', icone: () => A.barraca() },
  tesouro: { rotulo: 'Tesouro', fala: 'ver o tesouro', icone: () => A.bau(false) },
  tchau: { rotulo: 'Tchau', fala: 'dar tchau', icone: () => A.carta('tchau') },
};

const TERMO = [
  { n: 1, rotulo: 'muito calmo', cor: '#9CCFC6', humor: 'calmo' },
  { n: 2, rotulo: 'calmo', cor: '#BFD9A8', humor: 'feliz' },
  { n: 3, rotulo: 'mais ou menos', cor: '#F4D59A', humor: 'calmo' },
  { n: 4, rotulo: 'agitado', cor: '#F2B27A', humor: 'medo' },
  { n: 5, rotulo: 'fervendo', cor: '#E48D6E', humor: 'bravo' },
];

function configPadrao() {
  return {
    crianca: { apelido: '', interesse: 'trem', proxima: 'brincar' },
    alvos: Object.fromEntries(Object.keys(ALVOS).map(k => [k, { ativo: ALVOS_ATIVOS_PADRAO.includes(k), nivel: 1, fase: 'ensino', sondagens: 3 }])),
    lugares: Object.fromEntries(Object.entries(LUGARES).map(([k, l]) => [k, JSON.parse(JSON.stringify(l.padrao))])),
    ensino: { ordem: 'menor-maior', atraso: 3, progressivo: false, tentativas: 6, faceis: 1, semErro: true,
      degraus: { pista: true, modelo: true, total: true } },
    reforco: { aCada: 1, sozinha: 2, ajuda: 1, comemoracao: 'quieta', rodadasPreferencia: 2 },
    criterio: { pct: 80, sessoes: 2 },
    sessao: { aquecimento: true, tesouro: true, maxMin: 12, limiteDiarioMin: 20, escolha: true, plano: ['farol', 'vila'] },
    sensorial: { volVoz: 0.9, volEfeitos: 0.4, velVoz: 0.95, voz: '', modoCalmo: false },
    permissoesPais: { volume: true, proxima: true, limite: false },
  };
}

function estadoPadrao() {
  return {
    versao: 1, sal: null, pinPsi: null, pinPais: null,
    config: configPadrao(), configVersao: 1,
    historicoConfig: [{ versao: 1, ts: agoraISO(), resumo: 'Configuração inicial (padrão de fábrica)', papel: 'sistema' }],
    progresso: {}, sessoes: [], tentativas: [], conchasTotal: 0,
    abc: [], sugestoes: [], uso: {}, preferencia: null,
    eventos: [], meuJeito: {}, meuJeitoIdx: 0, planoCalma: null, caixaCalma: {}, historiasMinhas: [], mercadoIdx: 0,
  };
}

// Falas com id fixo: o mesmo id serve para a voz sintética e para o arquivo de voz gravada.
const fx = (id, texto, quem = 'lume', extra = {}) => ({ id, texto, quem, ...extra });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const quemTem = m => `${cap(MORADORES[m].artigo)} ${MORADORES[m].nome}`;

const FALA = {
  chegada: etapas => fx('chegada.' + etapas.join('-'), 'Hoje a gente vai ' + listaHumana(etapas.map(e => etapaInfo(e).fala)) + '.'),
  vamos: fx('chegada.vamos', 'Vamos?'),
  agoraNao: fx('chegada.agoranao', 'Tudo bem. Eu espero. Quando você quiser, toca no Jogar.'),
  comoEstou: fx('comoestou.pergunta', 'Como você está agora? Toca no termômetro.'),
  comoAgora: fx('comoestou.depois', 'E agora, como você está?'),
  termo: {
    1: fx('comoestou.1', 'Muito calmo. Que bom.'), 2: fx('comoestou.2', 'Calmo. Que bom.'),
    3: fx('comoestou.3', 'Mais ou menos. Tudo bem.'), 4: fx('comoestou.4', 'Agitado. Quer respirar com a onda antes?'),
    5: fx('comoestou.5', 'Fervendo. Vamos respirar juntos com a onda.'),
  },
  aindaAgitado: fx('comoestou.ainda', 'Tudo bem. A gente pode respirar de novo, seguir ou parar por hoje.'),
  ondaInicio: fx('onda.inicio', 'Vamos respirar com a onda.'),
  ondaSobe: fx('onda.sobe', 'A onda sobe...'),
  ondaDesce: fx('onda.desce', 'A onda desce...'),
  ondaFim: fx('onda.fim', 'Muito bem. Você respirou com a onda.'),
  pausa: fx('pausa.pediu', 'Você pediu pausa. Isso foi muito bom.'),
  pausaVolta: fx('pausa.volta', 'Vamos voltar. A gente continua daqui.'),
  facil: fx('facil.instrucao', 'Toca na concha.'),
  facilModelo: fx('facil.modelo', 'Esta aqui.'),
  facilElogio: fx('facil.elogio', 'Isso!'),
  q1: (m, c) => fx(`q1.${m}.${c}`, `${quemTem(m)} tem ${COISAS[c].um} ${COISAS[c].nome}. Pede ${COISAS[c].artigo} ${COISAS[c].nome}.`),
  q1Modelo: c => fx(`q1.modelo.${c}`, `Eu faço assim: eu quero ${COISAS[c].artigo} ${COISAS[c].nome}.`),
  q1Elogio: (m, c) => fx(`q1.elogio.${m}.${c}`, `Você pediu ${COISAS[c].artigo} ${COISAS[c].nome}. ${quemTem(m)} deu!`),
  q2: (m, c) => fx(`q2.${m}.${c}`, `${quemTem(m)} tem ${COISAS[c].um} ${COISAS[c].nome}. Monta a frase para pedir.`),
  q2Cor: (m, cor) => fx(`q2.${m}.cor.${cor}`, `${quemTem(m)} tem conchas de três cores. O Lume quer a ${cor}. Monta a frase.`),
  q2ModeloEu: fx('q2.modelo.euquero', 'Primeiro: eu quero.'),
  q2ModeloCoisa: c => fx(`q2.modelo.${c}`, `Agora: ${COISAS[c].artigo} ${COISAS[c].nome}.`),
  q2ModeloCor: cor => fx(`q2.modelo.cor.${cor}`, `Agora: ${cor}.`),
  q2Elogio: m => fx(`q2.elogio.${m}`, `Você montou a frase inteira. ${quemTem(m)} entendeu!`),
  aqui: m => fx(`morador.${m}.aqui`, 'Aqui está!', m),
  ajudo: m => fx(`morador.${m}.ajudo`, 'Eu ajudo!', m),
  ajInstrucao: fx('aj.instrucao', 'O baú não abre. O que você pode dizer?'),
  ajModelo: fx('aj.modelo', 'Eu digo: ajuda!'),
  ajElogio: fx('aj.elogio', 'Você pediu ajuda. Pedir ajuda funciona.'),
  ajsGigi: fx('ajs.gigi.alto', 'OI! QUER UMA CONCHA?', 'gigi', { alto: true }),
  ajsInstrucao: fx('ajs.instrucao', 'A Gigi está falando alto. O que você pode pedir?'),
  ajsModelo: fx('ajs.modelo', 'Eu digo: mais baixo, por favor.'),
  ajsGigiBaixo: fx('ajs.gigi.baixo', 'Desculpa. Assim está bom?', 'gigi'),
  ajsElogio: fx('ajs.elogio', 'Você pediu e a Gigi mudou. Pedir funciona.'),
  recTuca: fx('rec.tuca.oferece', 'Quer uma alga?', 'tuca'),
  recInstrucao: fx('rec.instrucao', 'O Lume não gosta de alga. O que ele pode dizer?'),
  recModelo: fx('rec.modelo', 'Eu digo: não, obrigado.'),
  recTudoBem: fx('rec.tuca.tudobem', 'Tudo bem!', 'tuca'),
  recElogio: fx('rec.elogio', 'Você disse não, obrigado. A Tuca entendeu.'),
  juntos: fx('neutro.juntos', 'Vamos ver juntos.'),
  tocaAqui: fx('ajuda.tocaaqui', 'Toca aqui.'),
  obrigado: fx('neutro.obrigado', 'Obrigado! Vamos para a próxima.'),
  proxima: fx('neutro.proxima', 'Tudo bem. Vamos para a próxima.'),
  tesouro: n => fx(`tesouro.${n}`, n === 1 ? 'Você ganhou 1 concha hoje.' : `Você ganhou ${n} conchas hoje.`),
  farolMais: fx('tesouro.farol', 'O farol acendeu mais um pouco.'),
  peca: fx('tesouro.peca', 'Tem peça nova no museu!'),
  tchau: a => fx(`tchau.${a}`, `Tchau! Agora a tela vai dormir. Agora é hora de: ${ATIVIDADES[a].nome}.`),
  tempoAcabou: fx('tchau.tempo', 'O tempo de hoje acabou.'),
  limite: fx('inicio.limite', 'A tela já brincou bastante hoje. Até amanhã!'),
  preferencia: fx('pref.pergunta', 'Qual você gosta mais? Toca em um.'),
  preferenciaFim: fx('pref.fim', 'Obrigado! Agora eu sei do que você gosta.'),
};

/* ============================================================
   Estado salvo no aparelho
   ============================================================ */

let armazenamentoOk = true;
let E = null;

// Junta o salvo sobre o padrão. Valor de tipo diferente do padrão (texto no lugar de número, por exemplo) fica com o padrão.
function mesclar(base, salvo) {
  if (Array.isArray(base)) return Array.isArray(salvo) ? salvo : base;
  if (base && typeof base === 'object') {
    const saida = {};
    for (const k of Object.keys(base)) saida[k] = salvo && typeof salvo === 'object' && k in salvo ? mesclar(base[k], salvo[k]) : base[k];
    if (salvo && typeof salvo === 'object') for (const k of Object.keys(salvo)) if (!(k in saida)) saida[k] = salvo[k];
    return saida;
  }
  if (typeof base === 'number') return typeof salvo === 'number' && Number.isFinite(salvo) ? salvo : base;
  if (typeof base === 'boolean') return typeof salvo === 'boolean' ? salvo : base;
  if (typeof base === 'string') return typeof salvo === 'string' ? salvo : base;
  return salvo === undefined ? base : salvo;
}
// Faixas e listas válidas da configuração: vale para o estado salvo e para o arquivo importado.
const FAIXAS = {
  'ensino.atraso': [0, 10], 'ensino.faceis': [0, 3], 'criterio.pct': [50, 100], 'criterio.sessoes': [1, 5],
  'reforco.sozinha': [0, 5], 'reforco.ajuda': [0, 5], 'reforco.aCada': [1, 5], 'reforco.rodadasPreferencia': [1, 5],
  'sessao.maxMin': [5, 20], 'sessao.limiteDiarioMin': [5, TETO_DIARIO_MIN],
  'sensorial.volVoz': [0, 1], 'sensorial.volEfeitos': [0, 1], 'sensorial.velVoz': [0.7, 1.2],
};
function sanearConfig(c) {
  const p = configPadrao();
  for (const [cam, [min, max]] of Object.entries(FAIXAS)) definirCaminho(c, cam, clamp(obterCaminho(c, cam), min, max));
  if (!(c.crianca.interesse in TEMAS)) c.crianca.interesse = p.crianca.interesse;
  if (!(c.crianca.proxima in ATIVIDADES)) c.crianca.proxima = p.crianca.proxima;
  if (!['menor-maior', 'maior-menor'].includes(c.ensino.ordem)) c.ensino.ordem = p.ensino.ordem;
  if (!['quieta', 'danca', 'som'].includes(c.reforco.comemoracao)) c.reforco.comemoracao = p.reforco.comemoracao;
  for (const k of Object.keys(c.alvos)) {
    if (!ALVOS[k]) { delete c.alvos[k]; continue; }
    const a = c.alvos[k];
    if (!(a.fase in FASES)) a.fase = 'ensino';
    a.nivel = clamp(Math.round(a.nivel), 1, 3);
    a.sondagens = clamp(Math.round(a.sondagens), 1, 8);
  }
  for (const k of Object.keys(c.lugares)) {
    if (!LUGARES[k]) { delete c.lugares[k]; continue; }
    const l = c.lugares[k];
    if ('tarefas' in l) l.tarefas = clamp(Math.round(l.tarefas), 1, k === 'mercado' ? 3 : 12);
    if ('nivel' in l) l.nivel = clamp(Math.round(l.nivel), 1, 3);
    if ('pecas' in l) l.pecas = clamp(Math.round(l.pecas), 4, 6);
  }
  if (!['tras', 'frente', 'total'].includes(c.lugares.oficina.encadeamento)) c.lugares.oficina.encadeamento = 'tras';
  c.sessao.plano = c.sessao.plano.filter(l => LUGARES[l]).slice(0, 3);
  return c;
}
function carregar() {
  let salvo = null;
  try {
    const texto = localStorage.getItem(CHAVE);
    if (texto) salvo = mesclar(estadoPadrao(), JSON.parse(texto));
  } catch (e) { armazenamentoOk = false; }
  if (!salvo) return estadoPadrao();
  // uma falha aqui nunca pode trocar os registros salvos pelo estado vazio
  try { sanearConfig(salvo.config); } catch (e) { console.error('configuração salva com defeito', e); }
  return salvo;
}
function salvar() {
  try {
    const limite = Date.now() - 20 * 86400000;
    for (const k of Object.keys(E.uso)) if (new Date(k + 'T12:00:00').getTime() < limite) delete E.uso[k];
    localStorage.setItem(CHAVE, JSON.stringify(E));
    armazenamentoOk = true;
  } catch (e) { armazenamentoOk = false; }
}
function alterarConfig(resumo, fn) {
  fn(E.config);
  sanearConfig(E.config);
  expirarSugestoes();
  E.configVersao++;
  E.historicoConfig.push({ versao: E.configVersao, ts: agoraISO(), resumo, papel: papel || 'sistema' });
  salvar();
}

/* ============================================================
   Utilidades
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const raiz = () => document.getElementById('app');
const esperar = ms => new Promise(r => setTimeout(r, ms));
function agoraISO() { return new Date().toISOString(); }
function hojeChave() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
function embaralhar(lista) { const a = lista.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const telefone = () => window.matchMedia('(max-width: 600px)').matches;
const limitarDistratores = n => Math.max(0, Math.min(n, telefone() ? 2 : 3));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function listaHumana(itens) { return itens.length <= 1 ? itens.join('') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1]; }
function fmtData(iso) { const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function pct(a, b) { return b ? Math.round(100 * a / b) : null; }
function obterCaminho(obj, caminho) { return caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function definirCaminho(obj, caminho, valor) { const ks = caminho.split('.'); const ult = ks.pop(); ks.reduce((o, k) => o[k], obj)[ult] = valor; }
function on(sel, fn, ev = 'click') { const el = $(sel); if (el) el.addEventListener(ev, fn); }
function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Cada troca de tela cancela timers e fluxos da tela anterior.
let geracao = 0;
let timers = [];
function limparTimers() { timers.forEach(clearTimeout); timers = []; }
function novaTela() { geracao++; limparTimers(); return geracao; }
const vivo = g => g === geracao;
function depois(ms, fn) { const t = setTimeout(fn, ms); timers.push(t); return t; }
// Depois que uma tarefa foi registrada, a volta da pausa segue adiante em vez de repetir a tarefa.
// Devolve a função de seguir, que só roda uma vez.
function seguirDepois(fn) {
  let foi = false;
  const seguir = () => { if (!foi) { foi = true; fn(); } };
  if (S) S.retomar = seguir;
  return seguir;
}

/* ============================================================
   Imagens: a arte das IAs entra por cima do desenho provisório
   ============================================================ */

let IMG = {};
async function carregarImagens() {
  try { const r = await fetch('img/arte.json', { cache: 'no-cache' }); if (r.ok) IMG = await r.json(); } catch (e) { IMG = {}; }
}
function img(chave, cls, alt) { return `<img class="${cls}" src="img/${IMG[chave]}" alt="${esc(alt)}" draggable="false">`; }
const A = {
  lume: (o = {}) => { const k = 'lume-' + (o.humor || 'feliz'); return IMG[k] ? img(k, `lume foto ${o.acenando ? 'acena' : ''} ${o.cls || ''}`, 'Lume, o polvinho') : arteLume(o); },
  morador: (m, o = {}) => { const k = m === 'gigi' && o.alto ? 'gigi-alto' : m; return IMG[k] ? img(k, `morador ${m} foto`, MORADORES[m].nome) : m === 'gigi' ? arteGigi(o) : MORADORES[m].arte(o); },
  coisa: (c, cor) => { const k = c === 'concha' ? 'concha-' + (cor || 'amarela') : c; return IMG[k] ? img(k, 'coisa foto', c) : c === 'concha' ? arteConcha(cor || 'amarela') : COISAS[c].arte(); },
  alga: () => IMG.alga ? img('alga', 'coisa foto', 'alga') : arteAlga(),
  bau: aberto => { const k = aberto ? 'bau-aberto' : 'bau'; return IMG[k] ? img(k, 'coisa foto', aberto ? 'baú aberto' : 'baú') : arteBau(aberto); },
  farol: aneis => (IMG.farol ? `<div class="farol-foto">${img('farol', 'farol foto', 'farol')}${arteAneis(aneis)}</div>` : arteFarol(aneis)),
  barraca: () => IMG.barraca ? img('barraca', 'barraca foto', '') : arteBarraca(),
  tema: t => IMG['tema-' + t] ? img('tema-' + t, 'tema foto', TEMAS[t].nome) : TEMAS[t].arte(),
  carta: id => {
    if (IMG['carta-' + id]) return img('carta-' + id, 'picto foto', CARTOES[id].rotulo);
    if (CARTOES[id] && CARTOES[id].img && IMG[CARTOES[id].img]) return img(CARTOES[id].img, 'picto foto', CARTOES[id].rotulo);
    if (COISAS[id]) return A.coisa(id, id === 'concha' ? 'amarela' : undefined);
    return CARTOES[id].arte();
  },
  atividade: k => IMG['atividade-' + k] ? img('atividade-' + k, 'atividade foto', ATIVIDADES[k].nome) : ATIVIDADES[k].arte(),
  fundo: () => IMG.fundo ? ' com-fundo' : '',
  logo: () => IMG.logo ? img('logo', 'logo foto', 'Ilha do Farol') : '',
};
function arteAneis(aneis) {
  let arcos = '';
  for (let i = 0; i < ANEIS; i++) {
    const r = 22 + i * 13, aceso = i < aneis;
    arcos += `<path d="M${100 - r} 58 A ${r} ${r} 0 0 1 ${100 + r} 58" fill="none" stroke="${aceso ? COR.ambar : '#B9C9C9'}" stroke-width="${aceso ? 6 : 3}" stroke-linecap="round" ${aceso ? '' : 'stroke-dasharray="3 7"'} opacity="${aceso ? 0.4 + 0.12 * i : 0.8}"/>`;
  }
  return svg('0 0 200 120', arcos, 'aneis');
}

/* ============================================================
   Voz e som
   ============================================================ */

let vozesPt = [];
function carregarVozes() { try { vozesPt = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang)); } catch (e) { vozesPt = []; } }
function escolherVoz() {
  const nome = E.config.sensorial.voz;
  return vozesPt.find(v => v.name === nome) || vozesPt.find(v => /pt[-_]BR/i.test(v.lang)) || vozesPt[0] || null;
}
let AUDIOS = {};
async function carregarAudios() { try { const r = await fetch('audio/falas.json', { cache: 'no-cache' }); if (r.ok) AUDIOS = await r.json(); } catch (e) { AUDIOS = {}; } }
let audioAtual = null;
const TOM_VOZ = { lume: 1.15, gigi: 1.3, tuca: 0.8, caco: 1.0 };
const NOME_FALANTE = { lume: 'Lume', gigi: 'Gigi', tuca: 'Tuca', caco: 'Caco' };

// Quem espera uma fala cortada segue na hora, e não quando o relógio de segurança vencer.
let falasPendentes = [];
function pararFala() {
  try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* sem voz */ }
  if (audioAtual) { try { audioAtual.pause(); } catch (e) { /* ok */ } audioAtual = null; }
  const pendentes = falasPendentes; falasPendentes = [];
  pendentes.forEach(fim => fim());
}
function mostrarLegenda(f) {
  const el = $('#legenda');
  if (!el || !f) return;
  el.className = 'legenda' + (f.alto ? ' alto' : '');
  const nome = NOME_FALANTE[f.quem];
  el.innerHTML = `${nome ? `<span class="quem">${nome}</span>` : ''}${esc(f.texto)}`;
}
function falar(f) {
  if (!f) return Promise.resolve();
  mostrarLegenda(f);
  pararFala();
  const vol = E.config.sensorial.volVoz;
  return new Promise(resolve => {
    let feito = false, seguranca = null;
    const fim = () => { if (!feito) { feito = true; clearTimeout(seguranca); falasPendentes = falasPendentes.filter(x => x !== fim); resolve(); } };
    falasPendentes.push(fim);
    // sem voz, a legenda fica o tempo de uma leitura calma
    if (!(vol > 0)) { seguranca = setTimeout(fim, Math.min(4500, 900 + f.texto.length * 45)); return; }
    seguranca = setTimeout(fim, 2500 + f.texto.length * 110 / E.config.sensorial.velVoz);
    const arquivo = AUDIOS[f.id];
    if (arquivo) {
      const a = new Audio('audio/' + arquivo);
      audioAtual = a; a.volume = Math.min(1, vol);
      a.onended = fim; a.onerror = () => sintetizar(f, vol, fim);
      a.play().catch(() => sintetizar(f, vol, fim));
      return;
    }
    sintetizar(f, vol, fim);
  });
}
function sintetizar(f, vol, fim) {
  if (!('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(f.texto);
    u.lang = 'pt-BR';
    const v = escolherVoz(); if (v) u.voice = v;
    u.rate = E.config.sensorial.velVoz;
    u.pitch = TOM_VOZ[f.quem] || 1;
    u.volume = Math.min(1, vol);
    u.onend = fim; u.onerror = fim;
    speechSynthesis.speak(u);
  } catch (e) { fim(); }
}

let ctxSom = null;
function tocar(notas, passo = 0.16, dur = 0.45) {
  const vol = E.config.sensorial.volEfeitos;
  if (!(vol > 0)) return;
  try {
    ctxSom = ctxSom || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctxSom.currentTime + 0.02;
    notas.forEach((freq, i) => {
      const o = ctxSom.createOscillator(), g = ctxSom.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      const ti = t0 + i * passo;
      g.gain.setValueAtTime(0.0001, ti);
      g.gain.exponentialRampToValueAtTime(0.16 * vol, ti + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, ti + dur);
      o.connect(g).connect(ctxSom.destination);
      o.start(ti); o.stop(ti + dur + 0.05);
    });
  } catch (e) { /* sem áudio */ }
}
const SOM = { concha: () => tocar([660, 880], 0.1, 0.35), festa: () => tocar([523, 659, 784, 1046], 0.14, 0.5), toque: () => tocar([520], 0, 0.18) };

/* ============================================================
   Tempo de tela
   ============================================================ */

let relogio = null;
function minutosHoje() { return (E.uso[hojeChave()] || 0) / 60; }
function limiteDiario() { return Math.min(TETO_DIARIO_MIN, E.config.sessao.limiteDiarioMin); }
function iniciarRelogio() {
  pararRelogio();
  relogio = setInterval(() => {
    const k = hojeChave();
    E.uso[k] = (E.uso[k] || 0) + 5;
    // o limite do dia e a duração máxima da sessão encerram do mesmo jeito: na próxima parada natural
    if (S && (minutosHoje() >= limiteDiario() || sessaoPassouDoTempo())) S.tempoAcabou = true;
    salvar();
  }, 5000);
}
function pararRelogio() { if (relogio) clearInterval(relogio); relogio = null; }
function sessaoPassouDoTempo() { return S && (Date.now() - new Date(S.inicio).getTime()) / 60000 >= E.config.sessao.maxMin; }

/* ============================================================
   Estrutura das telas da criança
   ============================================================ */

let S = null; // sessão em andamento

function telaCrianca({ palco, opcoes = '', comAgenda = true, comPausa = true, classe = '' }) {
  const calmo = E.config.sensorial.modoCalmo ? ' calmo' : '';
  raiz().innerHTML = `<div class="tela${calmo} ${classe}">
    <header class="topo">${comAgenda && S ? agendaHTML() : '<span></span>'}<div class="topo-dir">${S && S.etapa >= 0 ? poteHTML() : ''}${comPausa && S ? `<button class="btn-pausa" id="btnPausa" aria-label="Preciso de pausa">${PICTO.pausa()}<span>Pausa</span></button>` : ''}</div></header>
    <main class="palco${A.fundo()}" id="palco">${palco}<div class="legenda" id="legenda" aria-live="polite"></div></main>
    <footer class="opcoes" id="opcoes">${opcoes}</footer></div>`;
  on('#btnPausa', abrirPausa);
}
function agendaHTML() {
  return `<ol class="agenda" aria-label="Agenda de hoje">${S.etapas.map((e, i) =>
    `<li class="${i < S.etapa ? 'feito' : i === S.etapa ? 'atual' : ''}" title="${etapaInfo(e).rotulo}">${etapaInfo(e).icone()}</li>`).join('')}</ol>`;
}
const poteHTML = () => `<div class="pote" id="pote">${A.coisa('concha', 'amarela')}<b id="poteN">${S ? S.conchas : 0}</b></div>`;
function pedrinhasHTML() {
  if (!S || !S.fila || !S.lugarAtual) return '';
  return `<div class="pedrinhas" aria-label="Tarefa ${S.idx + 1} de ${S.fila.length}">${S.fila.map((_, i) => `<i class="${i < S.idx ? 'feita' : i === S.idx ? 'atual' : ''}"></i>`).join('')}</div>`;
}
function cartaHTML(id) {
  const c = CARTOES[id];
  return `<button class="carta" data-id="${id}" style="--cat:${COR_CATEGORIA[c.cat]}" aria-label="${esc(c.rotulo)}">${A.carta(id)}<span>${esc(c.rotulo)}</span></button>`;
}

/* ============================================================
   Início
   ============================================================ */

function telaInicio() {
  novaTela(); pararFala();
  const aneis = Math.min(ANEIS, Math.floor(E.conchasTotal / CONCHAS_POR_ANEL));
  const limite = minutosHoje() >= limiteDiario();
  const nome = E.config.crianca.apelido;
  const calmo = E.config.sensorial.modoCalmo ? ' calmo' : '';
  raiz().innerHTML = `<div class="tela inicio${calmo}">
    <main class="palco${A.fundo()}">${A.logo()}<div class="cena-inicio">${A.farol(aneis)}${A.lume({ humor: limite ? 'dormindo' : 'feliz', acenando: !limite })}</div>
      <div class="legenda" id="legenda" aria-live="polite"></div></main>
    <footer class="opcoes">${!E.pinPsi ? '<p class="aviso-topo">Primeiro acesso: o adulto configura antes (segure o botão Adulto).</p>' : ''}${limite
      ? '<p class="missao-adulto">A tela já brincou bastante hoje. Até amanhã!</p>'
      : `<button class="botao grande" id="jogar">Jogar${nome ? ', ' + esc(nome) : ''}</button>`}</footer>
    <button class="btn-adulto" id="btnAdulto" aria-label="Área do adulto: segure por 2 segundos"><span class="enche"></span>Adulto <small>segure</small></button>
    <span class="versao">homologação ${VERSAO}</span></div>`;
  on('#jogar', () => { SOM.toque(); iniciarSessao(); });
  ligarBotaoAdulto();
}
function ligarBotaoAdulto() {
  const b = $('#btnAdulto');
  if (!b) return;
  let t = null;
  const soltar = () => { clearTimeout(t); b.classList.remove('segurando'); };
  b.addEventListener('pointerdown', () => { b.classList.add('segurando'); t = setTimeout(() => { soltar(); telaPin(); }, 1600); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, soltar));
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => { if (e.detail === 0) telaPin(); }); // teclado
}

/* ============================================================
   Sessão
   ============================================================ */

function iniciarSessao() {
  if (minutosHoje() >= limiteDiario()) { telaInicio(); falar(FALA.limite); return; }
  const etapas = ['comoEstou'];
  if (E.config.sessao.aquecimento) etapas.push('aquecer');
  etapas.push(...lugaresDaSessao());
  if (E.config.sessao.tesouro) etapas.push('tesouro');
  etapas.push('tchau');
  S = { id: novoId(), inicio: agoraISO(), etapas, etapa: -1, comoEstou: null, comoEstouDepois: null,
    conchas: 0, pausas: 0, acertos: 0, tentativas: 0, configVersao: E.configVersao,
    pecasNoInicio: Math.floor(E.conchasTotal / CONCHAS_POR_PECA), aneisNoInicio: Math.min(ANEIS, Math.floor(E.conchasTotal / CONCHAS_POR_ANEL)),
    fila: null, idx: 0, lugarAtual: null, tempoAcabou: false, retomar: null };
  iniciarRelogio();
  telaChegada();
}

function telaChegada() {
  const g = novaTela();
  S.retomar = telaChegada;
  telaCrianca({
    comAgenda: false,
    palco: `<div class="chegada"><div class="agenda-grande">${S.etapas.map(e => `<div>${etapaInfo(e).icone()}<span>${etapaInfo(e).rotulo}</span></div>`).join('')}</div>
      <div class="cena-lume">${A.lume({ acenando: true })}</div></div>`,
    opcoes: `<div class="botoes"><button class="botao" id="vamos">Vamos</button><button class="botao claro" id="agoraNao">Agora não</button></div>`,
  });
  falar(FALA.chegada(S.etapas)).then(() => vivo(g) && falar(FALA.vamos));
  on('#vamos', () => { pararFala(); proximaEtapa(); });
  on('#agoraNao', () => { pararFala(); finalizarSessao('agora-nao'); telaInicio(); falar(FALA.agoraNao); });
}

function proximaEtapa() {
  S.etapa++;
  if (S.tempoAcabou || sessaoPassouDoTempo()) {
    // com o tempo esgotado, pula os lugares que faltam, mas a criança ainda vê o tesouro das conchas que ganhou
    S.tempoAcabou = true;
    S.etapa = S.etapas.findIndex((x, i) => i >= S.etapa && (x === 'tesouro' || x === 'tchau'));
  }
  const e = S.etapas[S.etapa];
  const fixas = { comoEstou: () => telaComoEstou(false), aquecer: telaAquecer, tesouro: telaTesouro, tchau: telaTchau, mapa: telaMapa };
  if (fixas[e]) return fixas[e]();
  entrarLugar(e);
}

function telaComoEstou(depoisDaOnda) {
  const g = novaTela();
  S.retomar = () => telaComoEstou(depoisDaOnda);
  telaCrianca({
    palco: `<div class="cena"><div class="cena-lume" id="lumeCena">${A.lume({ humor: 'calmo' })}</div></div>`,
    opcoes: `<div class="termometro">${TERMO.map(t => `<button class="nivel" data-n="${t.n}" style="--c:${t.cor}"><span class="bolinha"></span><b>${t.n}</b><span>${t.rotulo}</span></button>`).join('')}</div>`,
  });
  falar(depoisDaOnda ? FALA.comoAgora : FALA.comoEstou);
  $$('.nivel').forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.n, t = TERMO[n - 1];
    SOM.toque();
    if (depoisDaOnda) S.comoEstouDepois = n; else S.comoEstou = n;
    $('#lumeCena').innerHTML = A.lume({ humor: t.humor });
    if (depoisDaOnda && n >= 4) {
      falar(FALA.aindaAgitado);
      $('#opcoes').innerHTML = `<div class="botoes"><button class="botao" id="onda">Respirar de novo</button><button class="botao claro" id="seguir">Seguir</button><button class="botao claro" id="parar">Parar por hoje</button></div>`;
      on('#onda', () => telaOnda(() => telaComoEstou(true)));
      on('#seguir', proximaEtapa);
      on('#parar', () => { finalizarSessao('pausa'); telaInicio(); });
      return;
    }
    if (n === 5) { falar(FALA.termo[5]).then(() => vivo(g) && telaOnda(() => telaComoEstou(true))); return; }
    if (n === 4) {
      falar(FALA.termo[4]);
      $('#opcoes').innerHTML = `<div class="botoes"><button class="botao" id="onda">Respirar com a onda</button><button class="botao claro" id="seguir">Seguir</button></div>`;
      on('#onda', () => telaOnda(() => telaComoEstou(true)));
      on('#seguir', proximaEtapa);
      return;
    }
    falar(depoisDaOnda ? FALA.ondaFim : FALA.termo[n]).then(() => vivo(g) && proximaEtapa());
  }));
}

function arteOnda() {
  return svg('0 0 560 170', `<path d="M0 60 C 70 20, 140 20, 210 60 S 350 100, 420 60 S 520 20, 560 50 L560 170 L0 170 Z" fill="#9CCFC6"/>
    <path d="M0 80 C 80 45, 150 45, 230 80 S 380 115, 460 80 S 540 55, 560 70 L560 170 L0 170 Z" fill="#7FBFB5" opacity=".8"/>`, 'onda');
}
// Três ondas: sobe em 4 segundos, desce em 6.
function telaOnda(aoFim, { ciclos = 3, comoPausa = false } = {}) {
  const g = novaTela();
  if (!comoPausa) S.retomar = () => telaOnda(aoFim, { ciclos });
  telaCrianca({
    comPausa: !comoPausa,
    palco: `<div class="onda-caixa" id="onda"><div class="dica" id="dica"></div>${arteOnda()}</div>`,
    opcoes: comoPausa
      ? `<div class="botoes"><button class="botao" id="voltar">Voltar ao jogo</button><button class="botao claro" id="parar">Parar por hoje</button></div>`
      : `<button class="botao claro" id="pular">Já estou melhor</button>`,
  });
  const caixa = $('#onda');
  let saindo = false;
  const ciclo = async i => {
    if (!vivo(g) || saindo) return;
    if (!comoPausa && i >= ciclos) { aoFim(); return; }
    caixa.classList.add('sobe'); $('#dica').textContent = 'A onda sobe...';
    falar(FALA.ondaSobe);
    await esperar(4000); if (!vivo(g)) return;
    caixa.classList.remove('sobe'); $('#dica').textContent = 'A onda desce...';
    falar(FALA.ondaDesce);
    await esperar(6000);
    ciclo(i + 1);
  };
  if (comoPausa) {
    // a pausa nunca é cortada pelo relógio; se o tempo acabou enquanto ela descansava, a volta leva ao fim da sessão
    on('#voltar', () => {
      if (saindo || !S) return;
      saindo = true; limparTimers();
      const r = S.retomar, noFim = ['tesouro', 'tchau'].includes(S.etapas[S.etapa]);
      falar(FALA.pausaVolta).then(() => {
        if (!vivo(g) || !S) return;
        if (S.tempoAcabou && !noFim) { S.lugarAtual = null; S.fila = null; proximaEtapa(); } else if (r) r();
      });
    });
    on('#parar', () => { pararFala(); finalizarSessao('pausa'); telaInicio(); });
    falar(FALA.pausa).then(() => ciclo(0));
  } else {
    on('#pular', () => { pararFala(); aoFim(); });
    falar(FALA.ondaInicio).then(() => ciclo(0));
  }
}

function abrirPausa() {
  if (!S) return;
  S.pausas++; salvar();
  pararFala();
  telaOnda(null, { comoPausa: true });
}

function telaAquecer() {
  const fila = [0, 1];
  const passo = i => {
    if (i >= fila.length) return proximaEtapa();
    rodarTentativa(defFacil(), () => passo(i + 1));
  };
  passo(0);
}

// Roda as tarefas de um lugar em sequência e depois chama aoFim.
function rodarFila(lugar, aoFim) {
  S.lugarAtual = lugar; S.fila = montarFila(lugar); S.idx = 0;
  const passo = () => {
    if (S.tempoAcabou || sessaoPassouDoTempo() || S.idx >= S.fila.length) { S.fila = null; return aoFim(); }
    rodarTentativa(criarDef(S.fila[S.idx]), () => { S.idx++; salvar(); passo(); });
  };
  passo();
}

// Monta a sequência de um lugar: linha de base primeiro, depois o ensino com itens fáceis intercalados.
function montarFila(lugar) {
  const alvos = Object.entries(E.config.alvos).filter(([k, a]) => a.ativo && ALVOS[k] && ALVOS[k].lugar === lugar);
  const tarefas = (E.config.lugares[lugar] || {}).tarefas || 6;
  const base = alvos.filter(([, a]) => a.fase === 'linha-de-base');
  const ensino = alvos.filter(([, a]) => a.fase === 'ensino').map(([k]) => k);
  const aprendidos = alvos.filter(([, a]) => a.fase === 'aprendido').map(([k]) => k);
  const fila = [];
  for (const [k, a] of base) for (let i = 0; i < a.sondagens; i++) fila.push({ alvo: k });
  const faceis = E.config.ensino.faceis;
  let f = 0;
  const facil = () => aprendidos.length ? { alvo: aprendidos[f++ % aprendidos.length], facil: true } : { alvo: 'facil' };
  if (ensino.length) {
    for (let i = 0; i < tarefas; i++) {
      for (let j = 0; j < faceis; j++) fila.push(facil());
      fila.push({ alvo: ensino[i % ensino.length] });
    }
  } else if (!base.length) {
    // nada em ensino: só manutenção dos aprendidos (alvo desligado nunca entra na fila nem no registro)
    for (let i = 0; aprendidos.length && i < tarefas; i++) fila.push({ alvo: aprendidos[i % aprendidos.length], facil: true });
  }
  return fila;
}

/* ============================================================
   Definição de cada tipo de tarefa
   ============================================================ */

function cenaVila({ morador, coisa, cor, bau, alga, gigiAlta, tresConchas }) {
  let objeto = '';
  if (bau) objeto = `<div class="objeto" id="objeto">${A.bau(false)}</div>`;
  else if (alga) objeto = `<div class="objeto" id="objeto">${A.alga()}</div>`;
  else if (tresConchas) objeto = `<div class="objeto" id="objeto"><div class="grupo">${['azul', 'rosa', 'amarela'].map(c => A.coisa('concha', c)).join('')}</div></div>`;
  else if (coisa) objeto = `<div class="objeto" id="objeto">${A.coisa(coisa, cor)}</div>`;
  return `<div class="cena vila"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'feliz' })}</div>
    <div class="lado-morador"><div class="barraca-fundo">${A.barraca()}</div><div class="morador-lugar" id="morador">${A.morador(morador, { alto: gigiAlta })}</div>${objeto}</div></div>`;
}
const entregar = () => { const o = $('#objeto'); if (o) o.classList.add('entregue'); };

function defFacil() {
  return { alvo: 'facil', nivel: 0, fase: 'ensino', facil: true,
    cena: `<div class="cena aquecer"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'feliz' })}</div><div class="objeto grande" id="objeto">${A.coisa('concha', 'amarela')}</div></div>`,
    instrucao: FALA.facil, passos: [{ correta: 'concha', cartas: ['concha'], modelo: FALA.facilModelo }],
    elogio: FALA.facilElogio, aoAcertar: entregar };
}
function defQuerer1(nivel) {
  const m = sortear(['caco', 'tuca']), c = sortear(Object.keys(COISAS));
  const distr = embaralhar(Object.keys(COISAS).filter(k => k !== c)).slice(0, limitarDistratores(nivel - 1));
  return { alvo: 'querer1', nivel, cena: cenaVila({ morador: m, coisa: c }), instrucao: FALA.q1(m, c),
    passos: [{ correta: c, cartas: embaralhar([c, ...distr]), modelo: FALA.q1Modelo(c) }],
    resposta: FALA.aqui(m), elogio: FALA.q1Elogio(m, c), aoAcertar: entregar };
}
function defQuerer2(nivel) {
  const m = sortear(['caco', 'tuca']);
  const passoEu = { correta: 'euquero', cartas: embaralhar(['euquero', ...(nivel >= 2 ? ['tchau'] : [])]), modelo: FALA.q2ModeloEu };
  if (nivel >= 3) {
    const cor = sortear(Object.keys(CORES_CONCHA));
    const outras = embaralhar(Object.keys(CORES_CONCHA).filter(k => k !== cor)).slice(0, limitarDistratores(2));
    return { alvo: 'querer2', nivel, multi: true, cena: cenaVila({ morador: m, tresConchas: true }), instrucao: FALA.q2Cor(m, cor),
      passos: [passoEu,
        { correta: 'concha', cartas: embaralhar(['concha', sortear(['peixe', 'bola', 'estrela'])]), modelo: FALA.q2ModeloCoisa('concha') },
        { correta: cor, cartas: embaralhar([cor, ...outras]), modelo: FALA.q2ModeloCor(cor) }],
      resposta: FALA.aqui(m), elogio: FALA.q2Elogio(m), aoAcertar: entregar };
  }
  const c = sortear(Object.keys(COISAS));
  const distr = embaralhar(Object.keys(COISAS).filter(k => k !== c)).slice(0, limitarDistratores(nivel - 1));
  return { alvo: 'querer2', nivel, multi: true, cena: cenaVila({ morador: m, coisa: c }), instrucao: FALA.q2(m, c),
    passos: [passoEu, { correta: c, cartas: embaralhar([c, ...distr]), modelo: FALA.q2ModeloCoisa(c) }],
    resposta: FALA.aqui(m), elogio: FALA.q2Elogio(m), aoAcertar: entregar };
}
function defAjuda(nivel) {
  const m = sortear(['caco', 'tuca']);
  const distr = ['tchau', 'embora'].slice(0, limitarDistratores(nivel - 1));
  return { alvo: 'ajuda', nivel, cena: cenaVila({ morador: m, bau: true }), instrucao: FALA.ajInstrucao,
    passos: [{ correta: 'ajuda', cartas: embaralhar(['ajuda', ...distr]), modelo: FALA.ajModelo }],
    resposta: FALA.ajudo(m), elogio: FALA.ajElogio,
    aoAcertar: () => { const o = $('#objeto'); if (o) o.innerHTML = A.bau(true); } };
}
function defAjuste(nivel) {
  const distr = ['euquero', 'tchau'].slice(0, limitarDistratores(nivel - 1));
  return { alvo: 'ajuste', nivel, cena: cenaVila({ morador: 'gigi', gigiAlta: true, coisa: 'concha', cor: 'rosa' }),
    preInstrucao: FALA.ajsGigi, instrucao: FALA.ajsInstrucao,
    passos: [{ correta: 'maisbaixo', cartas: embaralhar(['maisbaixo', ...distr]), modelo: FALA.ajsModelo }],
    resposta: FALA.ajsGigiBaixo, elogio: FALA.ajsElogio,
    aoAcertar: () => { const el = $('#morador'); if (el) el.innerHTML = A.morador('gigi', { alto: false }); } };
}
function defRecusar(nivel) {
  const distr = ['euquero', 'ajuda'].slice(0, limitarDistratores(nivel - 1));
  return { alvo: 'recusar', nivel, cena: cenaVila({ morador: 'tuca', alga: true }),
    preInstrucao: FALA.recTuca, instrucao: FALA.recInstrucao,
    passos: [{ correta: 'naoobrigado', cartas: embaralhar(['naoobrigado', ...distr]), modelo: FALA.recModelo }],
    resposta: FALA.recTudoBem, elogio: FALA.recElogio,
    aoAcertar: () => { const o = $('#objeto'); if (o) o.classList.add('recolhe'); } };
}
const DEFS = { querer1: defQuerer1, querer2: defQuerer2, ajuda: defAjuda, ajuste: defAjuste, recusar: defRecusar };
function criarDef(item) {
  if (item.alvo === 'facil') return defFacil();
  const a = E.config.alvos[item.alvo];
  const def = DEFS[item.alvo](a.nivel);
  def.fase = item.facil ? 'aprendido' : a.fase;
  def.facil = !!item.facil;
  return def;
}

/* ============================================================
   Escada de ajuda
   ============================================================ */

function degrausHabilitados() {
  const d = E.config.ensino.degraus;
  return [[2, d.pista], [3, d.modelo], [4, d.total]].filter(([, ok]) => ok).map(([n]) => n);
}
function topoDegrau() { const h = degrausHabilitados(); return h.length ? h[h.length - 1] : 0; }
function proximoDegrau(d) { const h = degrausHabilitados().filter(n => n > d); return h.length ? h[0] : null; }
function habilitadoAte(d) { if (!d) return 0; const h = degrausHabilitados().filter(n => n <= d); return h.length ? h[h.length - 1] : 0; }
// só as sessões anteriores contam: a espera fica a mesma do começo ao fim de uma sessão
function sessoesComAlvo(alvo) { return new Set(E.tentativas.filter(t => t.alvo === alvo && !t.facil && !(S && t.sessao === S.id)).map(t => t.sessao)).size; }
function atrasoEfetivo(alvo) {
  const e = E.config.ensino;
  if (!e.progressivo || alvo === 'facil') return e.atraso;
  const n = sessoesComAlvo(alvo);
  return [0, Math.round(e.atraso / 2), e.atraso][Math.min(2, Math.floor(n / 2))];
}
function degrauInicial(def) {
  if (def.facil || def.fase === 'aprendido') return 0;
  if (E.config.ensino.ordem === 'maior-menor') {
    const p = E.progresso[def.alvo];
    return habilitadoAte(p && typeof p.degrauInicial === 'number' ? p.degrauInicial : topoDegrau());
  }
  return atrasoEfetivo(def.alvo) === 0 ? topoDegrau() : 0;
}

/* ============================================================
   Motor de uma tarefa
   ============================================================ */

function rodarTentativa(def, aoFim) {
  const g = novaTela();
  S.retomar = () => rodarTentativa(def, aoFim);
  const linhaDeBase = def.fase === 'linha-de-base';
  const atraso = atrasoEfetivo(def.alvo) * 1000;
  let passo = 0, erro = false, degrau = 0, maxDegrau = 0, latencia = null, t0 = performance.now(), travado = false, instrucaoAcabou = false, escolha = null, lembrou = false;

  const faixaIds = def.faixaTotal || (def.multi ? def.passos.map(p => p.correta) : null);
  const ini = def.inicioFilho || 0;
  const faixa = faixaIds ? `<div class="faixa${faixaIds.length > 5 ? ' longa' : ''}" id="faixa">${faixaIds.map((id, i) => (i < ini ? `<div class="slot cheio pre">${A.carta(id)}</div>` : '<div class="slot"></div>')).join('')}</div>` : '';
  telaCrianca({ palco: def.cena, opcoes: pedrinhasHTML() + faixa + '<div class="cartas" id="cartas"></div>' });

  function desenharCartas() {
    const p = def.passos[passo];
    $('#cartas').className = 'cartas' + (def.pequenas ? ' pequenas' : '');
    $('#cartas').innerHTML = p.cartas.map(cartaHTML).join('');
    $$('#cartas .carta').forEach(b => b.addEventListener('click', () => escolher(b.dataset.id, b)));
  }
  // Devolve a fala da ajuda (quando há), para a espera seguinte contar a partir do fim dela.
  function aplicarDegrau(d, comFala) {
    if (def.livre) return;
    const correta = def.passos[passo].correta;
    $$('#cartas .carta').forEach(b => {
      const ok = b.dataset.id === correta;
      b.classList.toggle('apagada', d >= 2 && !ok);
      b.classList.toggle('escondida', d >= 4 && !ok);
      b.classList.toggle('modelo', d === 3 && ok);
      b.classList.toggle('brilha', d >= 4 && ok);
    });
    if (comFala && d === 3) return falar(def.passos[passo].modelo);
    if (comFala && d === 4) return falar(FALA.tocaAqui);
    return null;
  }
  // Só a escada mais recente anda: um toque, um erro ou uma fala cortada nunca abrem uma segunda.
  let cadeia = 0;
  function agendarSubida(antes) {
    const minha = ++cadeia;
    const ativa = () => vivo(g) && !travado && minha === cadeia;
    Promise.resolve(antes).then(() => {
      if (!ativa()) return;
      if (def.livre) {
        // escolha livre: não existe errado; só lembra que pode escolher (o lembrete fica registrado) e depois segue
        depois(Math.max(atraso * 2, 4000), () => { if (ativa()) { lembrou = true; falar(def.passos[passo].modelo); } });
        depois(Math.max(atraso * 2, 4000) + 15000, () => ativa() && terminar(false, true));
        return;
      }
      if (linhaDeBase) { depois(Math.max(atraso * 3, 10000), () => ativa() && terminar(false, true)); return; }
      const prox = proximoDegrau(degrau);
      if (prox === null) { depois(Math.max(atraso, 3000) + 12000, () => ativa() && terminar(false, true)); return; }
      depois(atraso, () => {
        if (!ativa()) return;
        degrau = prox; maxDegrau = Math.max(maxDegrau, degrau);
        agendarSubida(aplicarDegrau(degrau, true));
      });
    });
  }
  function iniciarPasso() {
    desenharCartas();
    // linha de base e escolha livre começam sem ajuda nenhuma
    degrau = linhaDeBase || def.livre ? 0 : degrauInicial(def);
    maxDegrau = Math.max(maxDegrau, degrau);
    const fala = aplicarDegrau(degrau, instrucaoAcabou);
    travado = false;
    if (instrucaoAcabou) agendarSubida(fala);
  }
  function colocarNaFaixa(id) {
    const slot = $$('#faixa .slot')[ini + passo];
    if (slot) { slot.innerHTML = A.carta(id); slot.classList.add('cheio'); }
  }
  function escolher(id, botao) {
    if (travado || !vivo(g)) return;
    SOM.toque();
    if (latencia === null) latencia = Math.round(performance.now() - t0);
    const correta = def.passos[passo].correta;
    if (def.livre || id === correta) {
      escolha = id;
      limparTimers(); travado = true; pararFala();
      if (def.multi) colocarNaFaixa(id);
      passo++;
      if (passo < def.passos.length) { iniciarPasso(); return; }
      terminar(true, false);
      return;
    }
    erro = true;
    if (linhaDeBase) { limparTimers(); travado = true; terminar(false, false); return; }
    limparTimers(); travado = true;
    botao.classList.add('apagada');
    falar(FALA.juntos).then(() => {
      if (!vivo(g)) return;
      const alvoDegrau = E.config.ensino.semErro ? topoDegrau() : (degrausHabilitados().includes(3) ? 3 : topoDegrau());
      degrau = Math.max(degrau, alvoDegrau); maxDegrau = Math.max(maxDegrau, degrau);
      travado = false;
      agendarSubida(aplicarDegrau(degrau, true));
    });
  }
  let terminou = false;
  function terminar(correta, semResposta) {
    if (terminou) return;
    terminou = true;
    limparTimers(); travado = true; cadeia++;
    const sozinha = correta && !erro && maxDegrau === 0 && !lembrou;
    registrarTentativa(def, { correta, sozinha, erro, degrau: maxDegrau, semResposta, latenciaMs: latencia, atrasoS: atraso / 1000, escolha, lembrete: lembrou });
    if (correta && !def.facil && !linhaDeBase) S.acertos++;
    // a partir daqui a tarefa já está registrada: a pausa volta para a próxima, pagando as conchas devidas
    const conchas = linhaDeBase ? 1 : correta ? (sozinha ? E.config.reforco.sozinha : E.config.reforco.ajuda) : 0;
    let pago = false;
    const pagar = () => { if (!pago) { pago = true; if (conchas) ganharConchas(conchas); } };
    const seguir = seguirDepois(() => { pagar(); aoFim(); });
    if (correta && def.completarDepois) {
      // encadeamento para frente: o jogo completa os passos que a criança ainda não faz
      $$('#faixa .slot').forEach((s, i) => { if (!s.classList.contains('cheio')) { s.innerHTML = A.carta(def.faixaTotal[i]); s.classList.add('cheio', 'pre'); } });
    }
    if (linhaDeBase) {
      pagar();
      falar(FALA.obrigado).then(() => vivo(g) && seguir());
      return;
    }
    if (!correta) { falar(FALA.proxima).then(() => vivo(g) && seguir()); return; }
    (async () => {
      if (def.aoAcertar) def.aoAcertar();
      const lado = $('#ladoLume'); if (lado) lado.innerHTML = A.lume({ humor: 'feliz', acenando: true });
      if (def.resposta) { await falar(def.resposta); if (!vivo(g)) return; }
      pagar();
      await falar(def.elogio); if (!vivo(g)) return;
      if (!def.facil && S.acertos % E.config.reforco.aCada === 0) await comemorar();
      if (vivo(g)) seguir();
    })();
  }

  iniciarPasso();
  (async () => {
    if (def.preInstrucao) { await falar(def.preInstrucao); if (!vivo(g)) return; }
    await falar(def.instrucao);
    if (!vivo(g)) return;
    instrucaoAcabou = true;
    t0 = performance.now();
    // se a ajuda inicial já é o modelo ou a ajuda total, ela é dita logo depois da instrução
    if (!travado) agendarSubida(degrau >= 3 ? aplicarDegrau(degrau, true) : null);
  })();
}

function registrarTentativa(def, r) {
  E.tentativas.push({ sessao: S.id, ts: agoraISO(), alvo: def.alvo, nivel: def.nivel || 0, fase: def.fase || 'ensino',
    facil: !!def.facil, ordem: E.config.ensino.ordem, configVersao: E.configVersao, ...r });
  S.tentativas++;
  salvar();
}
function ganharConchas(n) {
  S.conchas += n; E.conchasTotal += n;
  const el = $('#poteN'); if (el) el.textContent = S.conchas;
  const pote = $('#pote'); if (pote) { pote.classList.remove('ganhou'); void pote.offsetWidth; pote.classList.add('ganhou'); }
  SOM.concha();
  salvar();
}
async function comemorar() {
  const estilo = E.config.reforco.comemoracao;
  const lume = $('#ladoLume .lume');
  if (estilo === 'danca' && lume) lume.classList.add('danca');
  if (estilo === 'som') SOM.festa();
  const pote = $('#pote'); if (pote) pote.classList.add('brilho');
  await esperar(1400);
}

/* ============================================================
   Tesouro e tchau
   ============================================================ */

function telaTesouro() {
  const g = novaTela();
  S.retomar = telaTesouro;
  const aneis = Math.min(ANEIS, Math.floor(E.conchasTotal / CONCHAS_POR_ANEL));
  const pecas = Math.floor(E.conchasTotal / CONCHAS_POR_PECA);
  const nova = pecas > S.pecasNoInicio;
  const tema = E.config.crianca.interesse;
  const mostrar = Math.min(pecas, 12);
  telaCrianca({
    palco: `<div class="tesouro">${A.farol(aneis)}<div class="museu"><b>Museu de ${esc(TEMAS[tema].nome)}</b>
      <div class="prateleira">${Array.from({ length: mostrar }, (_, i) => `<div class="${nova && i === mostrar - 1 ? 'nova' : ''}">${A.tema(tema)}</div>`).join('') || '<span class="vazio">A primeira peça chega logo.</span>'}</div>
      ${pecas > 12 ? `<span class="vazio">+ ${pecas - 12} peças</span>` : ''}</div></div>`,
    opcoes: `<button class="botao" id="pronto">Pronto</button>`,
  });
  (async () => {
    await falar(FALA.tesouro(S.conchas)); if (!vivo(g)) return;
    if (aneis > S.aneisNoInicio) { await falar(FALA.farolMais); if (!vivo(g)) return; }
    if (nova) await falar(FALA.peca);
  })();
  on('#pronto', () => { pararFala(); proximaEtapa(); });
}

function missoesAtivas() {
  const aberto = l => E.config.lugares[l] && E.config.lugares[l].aberto;
  const m = Object.entries(E.config.alvos).filter(([k, a]) => a.ativo && ALVOS[k] && ALVOS[k].missao && aberto(ALVOS[k].lugar)).map(([k]) => ALVOS[k].missao);
  for (const [l, info] of Object.entries(LUGARES)) if (info.missao && aberto(l)) m.push(info.missao);
  return [...new Set(m)];
}
function telaTchau() {
  const g = novaTela();
  S.retomar = telaTchau;
  const prox = E.config.crianca.proxima in ATIVIDADES ? E.config.crianca.proxima : 'brincar';
  const missoes = missoesAtivas();
  const missao = missoes.length ? missoes[E.sessoes.length % missoes.length] : 'O cartão de pausa também vale em casa, e sempre funciona.';
  telaCrianca({
    palco: `<div class="tchau">${A.lume({ acenando: true })}<div class="proxima">${A.atividade(prox)}<b>Agora: ${ATIVIDADES[prox].nome}</b></div></div>`,
    opcoes: `<p class="missao-adulto"><b>Missão de casa, para o adulto:</b> ${esc(missao)}</p><button class="botao" id="tchau">Tchau</button>`,
  });
  (async () => {
    if (S.tempoAcabou) { await falar(FALA.tempoAcabou); if (!vivo(g)) return; }
    await falar(FALA.tchau(prox));
  })();
  on('#tchau', () => { pararFala(); finalizarSessao('completa'); telaInicio(); });
}

function finalizarSessao(motivo) {
  if (!S) return;
  pararRelogio();
  E.sessoes.push({ id: S.id, inicio: S.inicio, fim: agoraISO(), encerrada: motivo, comoEstou: S.comoEstou,
    comoEstouDepois: S.comoEstouDepois, conchas: S.conchas, pausas: S.pausas, tentativas: S.tentativas, configVersao: S.configVersao });
  if (S.tentativas > 0) { atualizarProgresso(S.id); gerarSugestoes(); }
  salvar();
  S = null;
}

/* ============================================================
   Progresso automático e sugestões ao psicólogo
   ============================================================ */

// Na ordem "da maior para a menor ajuda", o jogo tira um degrau quando a criança acerta 80% sem erro.
function atualizarProgresso(sessaoId) {
  if (E.config.ensino.ordem !== 'maior-menor') return;
  for (const [alvo, a] of Object.entries(E.config.alvos)) {
    if (!ALVOS[alvo] || !a.ativo || a.fase !== 'ensino') continue;
    const tr = E.tentativas.filter(t => t.sessao === sessaoId && t.alvo === alvo && !t.facil);
    if (tr.length < 2) continue;
    const bons = tr.filter(t => t.correta && !t.erro).length / tr.length;
    const p = E.progresso[alvo] || (E.progresso[alvo] = { degrauInicial: topoDegrau() });
    if (bons >= 0.8 && p.degrauInicial > 0) {
      const menores = degrausHabilitados().filter(n => n < p.degrauInicial);
      const novo = menores.length ? menores[menores.length - 1] : 0;
      E.sugestoes.push({ id: novoId(), ts: agoraISO(), alvo, tipo: 'info', status: 'info',
        texto: `"${ALVOS[alvo].nome}": a ajuda inicial baixou sozinha de ${DEGRAUS[p.degrauInicial]} para ${DEGRAUS[novo]} (80% sem erro na última sessão).` });
      p.degrauInicial = novo;
    }
  }
}
function resumoPorSessao(alvo) {
  const ordem = new Map(E.sessoes.map((s, i) => [s.id, i]));
  const grupos = new Map();
  for (const t of E.tentativas) {
    if (t.alvo !== alvo) continue;
    if (!grupos.has(t.sessao)) grupos.set(t.sessao, { sessao: t.sessao, ts: t.ts, n: 0, sozinha: 0, fase: t.fase, configVersao: t.configVersao, nivel: t.nivel });
    const gr = grupos.get(t.sessao);
    gr.n++; if (t.sozinha) gr.sozinha++;
    gr.fase = t.fase; gr.configVersao = t.configVersao; gr.nivel = t.nivel;
  }
  return Array.from(grupos.values())
    .sort((a, b) => (ordem.get(a.sessao) ?? 1e9) - (ordem.get(b.sessao) ?? 1e9) || a.ts.localeCompare(b.ts))
    .map(x => ({ ...x, pct: pct(x.sozinha, x.n) }));
}
// Uma sugestão vale para o nível e a fase em que nasceu. Ignorada, não volta enquanto nada mudar.
function sugerir(alvo, tipo, texto) {
  const a = E.config.alvos[alvo];
  const mesma = s => s.alvo === alvo && s.tipo === tipo && s.nivel === a.nivel && s.fase === a.fase;
  if (E.sugestoes.some(s => mesma(s) && (s.status === 'aberta' || s.status === 'ignorada'))) return;
  E.sugestoes.push({ id: novoId(), ts: agoraISO(), alvo, tipo, texto, status: 'aberta', nivel: a.nivel, fase: a.fase });
}
// Mudou o nível, a fase ou desligou o alvo: a sugestão aberta perde a validade.
function expirarSugestoes() {
  for (const s of E.sugestoes) {
    if (s.status !== 'aberta') continue;
    const a = E.config.alvos[s.alvo];
    if (!a || !ALVOS[s.alvo] || !a.ativo || (s.nivel !== undefined && (a.nivel !== s.nivel || a.fase !== s.fase))) s.status = 'desatualizada';
  }
}
function gerarSugestoes() {
  const crit = E.config.criterio;
  expirarSugestoes();
  for (const [alvo, a] of Object.entries(E.config.alvos)) {
    if (!ALVOS[alvo] || !a.ativo) continue;
    const nome = ALVOS[alvo].nome;
    // só contam as sessões no nível e na fase de agora
    const r = resumoPorSessao(alvo).filter(x => x.fase === a.fase && x.nivel === a.nivel);
    if (a.fase === 'linha-de-base' && r.length) {
      sugerir(alvo, 'comecar-ensino', `Linha de base de "${nome}" registrada: ${r[r.length - 1].pct}% sozinha. Começar o ensino?`);
    }
    if (a.fase === 'ensino' && r.length >= crit.sessoes) {
      const ult = r.slice(-crit.sessoes);
      if (ult.every(x => x.pct >= crit.pct && x.n >= 2)) sugerir(alvo, 'aprendido', `"${nome}" bateu o critério (${crit.pct}% sozinha em ${crit.sessoes} sessões seguidas). Declarar aprendido?`);
    }
    if (a.fase === 'ensino' && r.length >= 3 && r.slice(-3).every(x => x.pct < 50)) {
      if (a.nivel > 1) sugerir(alvo, 'descer-nivel', `"${nome}" ficou 3 sessões seguidas abaixo de 50% no nível ${a.nivel}. Descer para o nível ${a.nivel - 1}?`);
      else sugerir(alvo, 'rever', `"${nome}" ficou 3 sessões seguidas abaixo de 50% no nível 1. Vale rever a ajuda ou o próprio alvo.`);
    }
  }
}
function tratarSugestao(id, aceitar) {
  const s = E.sugestoes.find(x => x.id === id);
  if (!s || !ALVOS[s.alvo] || !E.config.alvos[s.alvo]) return;
  if (aceitar) {
    const nome = ALVOS[s.alvo].nome, a = E.config.alvos[s.alvo];
    if (s.tipo === 'comecar-ensino') alterarConfig(`${nome}: linha de base → ensino (sugestão aceita)`, c => { c.alvos[s.alvo].fase = 'ensino'; });
    if (s.tipo === 'aprendido') alterarConfig(`${nome}: ensino → aprendido (sugestão aceita)`, c => { c.alvos[s.alvo].fase = 'aprendido'; });
    if (s.tipo === 'descer-nivel') alterarConfig(`${nome}: nível ${a.nivel} → ${a.nivel - 1} (sugestão aceita)`, c => { c.alvos[s.alvo].nivel = Math.max(1, a.nivel - 1); });
    s.status = 'aceita';
  } else s.status = 'ignorada';
  salvar();
}

/* ============================================================
   Avaliação de preferência (várias opções sem reposição)
   ============================================================ */

function telaPreferencia(rodadas) {
  const temas = Object.keys(TEMAS);
  const soma = Object.fromEntries(temas.map(t => [t, 0]));
  let rodada = 0;
  const iniciarRodada = () => {
    rodada++;
    let restantes = embaralhar(temas), posicao = 1;
    const escolherUm = () => {
      const g = novaTela();
      if (restantes.length === 1) { soma[restantes[0]] += posicao; return fimRodada(); }
      telaCrianca({ comAgenda: false, comPausa: false, classe: 'preferencia',
        palco: `<div class="cena"><div class="cena-lume">${A.lume({ humor: 'feliz' })}</div></div>`,
        opcoes: `<div class="cartas">${restantes.map(t => `<button class="carta" data-t="${t}" style="--cat:${COR.teal}">${A.tema(t)}<span>${TEMAS[t].nome}</span></button>`).join('')}</div>` });
      if (posicao === 1 && rodada === 1) falar(FALA.preferencia); else mostrarLegenda(FALA.preferencia);
      $$('.carta').forEach(b => b.addEventListener('click', () => {
        if (!vivo(g)) return;
        SOM.toque();
        soma[b.dataset.t] += posicao++;
        restantes = embaralhar(restantes.filter(x => x !== b.dataset.t));
        escolherUm();
      }));
    };
    escolherUm();
  };
  const fimRodada = () => {
    if (rodada < rodadas) return iniciarRodada();
    const ranking = temas.map(t => ({ tema: t, media: +(soma[t] / rodadas).toFixed(2) })).sort((a, b) => a.media - b.media);
    E.preferencia = { ts: agoraISO(), rodadas, ranking };
    salvar();
    falar(FALA.preferenciaFim).then(() => {});
    papel = 'psi';
    telaAdulto('reforco');
  };
  iniciarRodada();
}

/* ============================================================
   PIN e área do adulto
   ============================================================ */

let papel = null;
let abaAtual = 'testar';

async function hashPin(pin) {
  if (!E.sal) { E.sal = novoId(); salvar(); }
  const texto = E.sal + ':' + pin;
  try {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return 'x' + texto; }
}

function telaPin(modo) {
  novaTela(); pararFala();
  modo = modo || (E.pinPsi ? 'entrar' : 'criar');
  let digitos = '', primeiro = null;
  const titulos = {
    criar: ['Crie o PIN do psicólogo', 'Quatro números. Só quem tem o PIN muda a configuração.'],
    confirmar: ['Repita o PIN', 'Para conferir.'],
    entrar: ['Área do adulto', 'Digite o PIN do psicólogo ou o PIN dos pais.'],
  };
  const desenhar = (msg = '') => {
    const [t, p] = titulos[modo];
    raiz().innerHTML = `<div class="pin"><div class="pin-caixa"><h1>${t}</h1><p>${p}</p>
      <div class="pontos">${[0, 1, 2, 3].map(i => `<i class="${i < digitos.length ? 'cheio' : ''}"></i>`).join('')}</div>
      <p class="erro">${esc(msg)}</p>
      <div class="teclas">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-a="voltar" aria-label="Voltar">Voltar</button><button data-n="0">0</button><button data-a="apagar" aria-label="Apagar">Apagar</button></div></div></div>`;
    $$('.teclas button').forEach(b => b.addEventListener('click', () => tecla(b.dataset.n, b.dataset.a)));
  };
  const tecla = async (n, acao) => {
    if (acao === 'voltar') return telaInicio();
    if (acao === 'apagar') { digitos = digitos.slice(0, -1); return desenhar(); }
    if (digitos.length >= 4) return;
    digitos += n;
    desenhar();
    if (digitos.length < 4) return;
    if (modo === 'criar') { primeiro = digitos; digitos = ''; modo = 'confirmar'; return desenhar(); }
    if (modo === 'confirmar') {
      if (digitos !== primeiro) { digitos = ''; primeiro = null; modo = 'criar'; return desenhar('Os dois PINs não conferem. Comece de novo.'); }
      E.pinPsi = await hashPin(digitos); salvar(); papel = 'psi'; abaAtual = 'testar'; return telaAdulto();
    }
    const h = await hashPin(digitos);
    if (h === E.pinPsi) { papel = 'psi'; return telaAdulto(); }
    if (E.pinPais && h === E.pinPais) { papel = 'pais'; abaAtual = 'casa'; return telaAdulto(); }
    digitos = '';
    desenhar('PIN não confere.');
  };
  desenhar();
}

const ABAS_PSI = [
  { id: 'testar', nome: 'Como testar', render: abaTestar },
  { id: 'crianca', nome: 'Criança', render: abaCrianca },
  { id: 'lugares', nome: 'Lugares', render: p => abaLugares(p) }, // abaLugares vem de lugares.js, que carrega depois
  { id: 'alvos', nome: 'Alvos', render: abaAlvos },
  { id: 'ensino', nome: 'Ensino', render: abaEnsino },
  { id: 'reforco', nome: 'Recompensa', render: abaReforco },
  { id: 'sessao', nome: 'Sessão e sentidos', render: abaSessao },
  { id: 'dados', nome: 'Dados', render: abaDados },
  { id: 'casa', nome: 'Casa', render: abaCasa },
  { id: 'aparelho', nome: 'Aparelho', render: abaAparelho },
];
const ABAS_PAIS = [
  { id: 'casa', nome: 'Casa', render: abaCasa },
  { id: 'ajustes', nome: 'Ajustes', render: abaAjustesPais },
];

function telaAdulto(aba) {
  novaTela(); pararFala();
  if (!papel) return telaPin();
  if (aba) abaAtual = aba;
  const abas = papel === 'psi' ? ABAS_PSI : ABAS_PAIS;
  if (!abas.some(a => a.id === abaAtual)) abaAtual = abas[0].id;
  const abertas = E.sugestoes.filter(s => s.status === 'aberta').length;
  raiz().innerHTML = `<div class="adulto">
    <header class="adulto-topo"><div><b>Área do adulto</b><span>${papel === 'psi' ? 'Psicólogo' : 'Pais e cuidadores'} · versão ${VERSAO}${armazenamentoOk ? '' : ' · atenção: o aparelho não está salvando'}</span></div>
      <button class="botao-p" id="sair">Voltar ao jogo</button></header>
    <nav class="abas" aria-label="Seções">${abas.map(a => `<button class="aba ${a.id === abaAtual ? 'ativa' : ''}" data-aba="${a.id}">${a.nome}${a.id === 'dados' && abertas ? ` (${abertas})` : ''}</button>`).join('')}</nav>
    <main class="painel" id="painel"></main></div>`;
  $$('.aba').forEach(b => b.addEventListener('click', () => telaAdulto(b.dataset.aba)));
  on('#sair', () => { papel = null; telaInicio(); });
  const painel = $('#painel');
  abas.find(a => a.id === abaAtual).render(painel);
  window.scrollTo(0, 0);
}

let avisoT = null;
function aviso(msg) {
  let el = $('#aviso');
  if (!el) { el = document.createElement('div'); el.id = 'aviso'; el.className = 'aviso'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('mostra');
  clearTimeout(avisoT); avisoT = setTimeout(() => el.classList.remove('mostra'), 1800);
}

/* ---------- campos de formulário ligados à configuração ---------- */

function fmtValor(v, sufixo) {
  if (sufixo === '%') return Math.round(v * 100) + '%';
  if (sufixo === 'x') return String(v).replace('.', ',') + 'x';
  if (sufixo === 'p%') return v + '%';
  return v + (sufixo ? ' ' + sufixo : '');
}
function fmtResumo(v) { return typeof v === 'boolean' ? (v ? 'ligado' : 'desligado') : v === '' ? '(vazio)' : String(v); }
function campo({ caminho, rotulo, tipo, opcoes, min, max, passo, ajuda, sufixo }) {
  const v = obterCaminho(E.config, caminho);
  const id = 'f-' + caminho.replace(/\./g, '-');
  let c = '';
  if (tipo === 'select') c = `<select id="${id}" data-caminho="${caminho}" data-tipo="select">${opcoes.map(([val, txt]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`).join('')}</select>`;
  else if (tipo === 'toggle') c = `<label class="interruptor"><input type="checkbox" id="${id}" data-caminho="${caminho}" data-tipo="toggle" ${v ? 'checked' : ''}><span></span></label>`;
  else if (tipo === 'range') c = `<input type="range" id="${id}" data-caminho="${caminho}" data-tipo="numero" data-sufixo="${sufixo || ''}" min="${min}" max="${max}" step="${passo || 1}" value="${v}"><output>${fmtValor(v, sufixo)}</output>`;
  else c = `<input type="text" id="${id}" data-caminho="${caminho}" data-tipo="texto" value="${esc(v)}" maxlength="30" autocomplete="off">`;
  return `<div class="campo"><label for="${id}">${rotulo}</label><div class="controle">${c}</div>${ajuda ? `<p class="ajuda">${ajuda}</p>` : ''}</div>`;
}
function ligarCampos(painel, aoMudar) {
  $$('[data-caminho]', painel).forEach(el => {
    const tipo = el.dataset.tipo;
    if (el.type === 'range') el.addEventListener('input', () => { const o = el.nextElementSibling; if (o) o.textContent = fmtValor(+el.value, el.dataset.sufixo); });
    el.addEventListener('change', () => {
      const cam = el.dataset.caminho, antes = obterCaminho(E.config, cam);
      let v;
      if (tipo === 'toggle') v = el.checked;
      else if (tipo === 'numero') v = clamp(+el.value, +el.min, +el.max);
      else if (tipo === 'select') v = typeof antes === 'number' ? +el.value : el.value;
      else v = el.value.trim();
      if (v === antes) return;
      const campoNome = (painel.querySelector(`label[for="${el.id}"]`) || {}).textContent || cam;
      const contexto = el.closest('.cartao-alvo') ? el.closest('.cartao-alvo').querySelector('h3').textContent + ', ' : '';
      const rotulo = contexto + campoNome;
      alterarConfig(`${rotulo}: ${fmtResumo(antes)} → ${fmtResumo(v)}`, c => definirCaminho(c, cam, v));
      aviso('Salvo');
      if (aoMudar) aoMudar(cam, v);
    });
  });
}

/* ---------- abas ---------- */

function abaTestar(p) {
  p.innerHTML = `<h2>Como testar esta versão</h2>
    <p>Esta é a versão de homologação da Ilha do Farol, com os <b>oito lugares da ilha</b>. Serve para o psicólogo experimentar o jogo e a configuração e dizer o que mudaria. Não é tratamento.</p>
    <div class="bloco"><ol class="lista-passos">
      <li>Na aba <b>Criança</b>, coloque um apelido e o tema de interesse.</li>
      <li>Na aba <b>Lugares</b>, veja quais lugares estão abertos. Com "A criança escolhe no mapa" ligado, dá para visitar um lugar por sessão; desligado, vale o plano da sessão.</li>
      <li>Na aba <b>Alvos</b>, ligue os alvos que quer ver e escolha o nível. Para ver a linha de base, toque em "Fazer linha de base".</li>
      <li>Volte ao jogo e jogue uma sessão como se fosse a criança. Erre de propósito algumas vezes e, em outras, espere sem tocar: assim aparece a escada de ajuda.</li>
      <li>Toque no botão <b>Pausa</b> no meio de uma tarefa.</li>
      <li>Abra a aba <b>Dados</b>: sessões, gráfico por alvo e sugestões do jogo.</li>
      <li>Mude algo na aba <b>Ensino</b> (a espera ou a ordem das dicas), jogue outra sessão e veja a linha de ajuste no gráfico.</li>
      <li>Baixe as tentativas em planilha, na aba Dados.</li>
      <li>Na aba <b>Aparelho</b>, crie um PIN dos pais e entre com ele para ver o que os pais enxergam.</li>
    </ol></div>
    <div class="bloco"><h3>O que ainda é provisório</h3>
      <p>A arte desta versão já é a definitiva desta fase, criada com IA em alta definição. A voz ainda é a sintética do próprio aparelho: a voz definitiva entra depois. Os dados e as fotos das Histórias Minhas ficam só neste aparelho.</p>
      <p>Anote o que mudaria e envie para quem mandou o link. O roteiro completo está em <a href="../">Ilha do Farol, roteiro</a>.</p></div>`;
}

function abaCrianca(p) {
  p.innerHTML = `<h2>Criança</h2><div class="bloco">
    ${campo({ caminho: 'crianca.apelido', rotulo: 'Apelido', tipo: 'texto', ajuda: 'Só o primeiro nome ou um apelido. Aparece no botão Jogar.' })}
    ${campo({ caminho: 'crianca.interesse', rotulo: 'Tema do museu', tipo: 'select', opcoes: Object.entries(TEMAS).map(([k, t]) => [k, t.nome]), ajuda: 'O interesse da criança. A avaliação de preferência (aba Recompensa) ajuda a escolher.' })}
    ${campo({ caminho: 'crianca.proxima', rotulo: 'Depois do jogo', tipo: 'select', opcoes: Object.entries(ATIVIDADES).map(([k, a]) => [k, a.nome]), ajuda: 'O pictograma que aparece no tchau: a próxima atividade fora da tela.' })}
    </div>`;
  ligarCampos(p);
}

function abaAlvos(p) {
  let lugarAnterior = null;
  const blocos = alvosOrdenados().map(([k, al]) => {
    const cab = al.lugar !== lugarAnterior ? `<h3 class="grupo-lugar">${LUGARES[al.lugar].nome}${E.config.lugares[al.lugar].aberto ? '' : ' (fechado)'}</h3>` : '';
    lugarAnterior = al.lugar;
    const a = E.config.alvos[k];
    const r = resumoPorSessao(k).slice(-4);
    const prog = E.config.ensino.ordem === 'maior-menor' && a.fase === 'ensino'
      ? `<p class="resumo">Ajuda inicial hoje: ${DEGRAUS[habilitadoAte(E.progresso[k] ? E.progresso[k].degrauInicial : topoDegrau())]}.</p>` : '';
    const botoes = [
      a.fase !== 'linha-de-base' ? `<button class="botao-p" data-fase="linha-de-base" data-alvo="${k}">Fazer linha de base</button>` : '',
      a.fase !== 'ensino' ? `<button class="botao-p" data-fase="ensino" data-alvo="${k}">${a.fase === 'aprendido' ? 'Voltar ao ensino' : 'Começar ensino'}</button>` : '',
      a.fase !== 'aprendido' ? `<button class="botao-p" data-fase="aprendido" data-alvo="${k}">Declarar aprendido</button>` : '',
    ].join('');
    return cab + `<article class="bloco cartao-alvo"><header><h3>${al.nome}</h3><span class="fase ${a.ativo ? a.fase : 'desligado'}">${a.ativo ? FASES[a.fase] : 'Desligado'}</span></header>
      <p>${al.desc}</p>
      ${campo({ caminho: `alvos.${k}.ativo`, rotulo: 'Ligado', tipo: 'toggle' })}
      ${campo({ caminho: `alvos.${k}.nivel`, rotulo: 'Nível', tipo: 'select', opcoes: [[1, '1: sem distrator'], [2, '2: um distrator'], [3, '3: dois distratores']] })}
      ${campo({ caminho: `alvos.${k}.sondagens`, rotulo: 'Tentativas da linha de base', tipo: 'range', min: 1, max: 8 })}
      <p class="resumo">${r.length ? 'Últimas sessões, sozinha: ' + r.map(x => `${x.pct}%`).join(' · ') : 'Ainda sem sessões com este alvo.'}</p>${prog}
      <div class="linha-botoes">${botoes}</div></article>`;
  }).join('');
  p.innerHTML = `<h2>Alvos com acerto</h2><p>Os alvos de cada lugar. Enseada Calma, Clareira do Encontro e Mirante dos Tesouros não têm resposta certa: registram atividade (veja a aba Dados). Na linha de base, o jogo não dá dica e responde de forma neutra; a criança ganha uma concha por participar.</p>${blocos}`;
  ligarCampos(p, () => telaAdulto('alvos'));
  $$('[data-fase]', p).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.alvo, f = b.dataset.fase, antes = E.config.alvos[k].fase;
    alterarConfig(`${ALVOS[k].nome}: ${FASES[antes]} → ${FASES[f]}`, c => { c.alvos[k].fase = f; });
    aviso('Salvo'); telaAdulto('alvos');
  }));
}

function abaEnsino(p) {
  p.innerHTML = `<h2>Procedimento de ensino</h2>
    <div class="bloco">
    ${campo({ caminho: 'ensino.ordem', rotulo: 'Ordem das dicas', tipo: 'select', opcoes: [['menor-maior', 'Da menor para a maior ajuda'], ['maior-menor', 'Da maior para a menor ajuda']], ajuda: 'Na segunda opção, o jogo começa com ajuda total e tira um degrau quando a criança acerta 80% sem erro numa sessão.' })}
    ${campo({ caminho: 'ensino.atraso', rotulo: 'Espera antes de cada dica', tipo: 'range', min: 0, max: 10, sufixo: 's', ajuda: 'Atraso de tempo. Com 0 segundo, a ajuda vem junto com a instrução.' })}
    ${campo({ caminho: 'ensino.progressivo', rotulo: 'Espera crescente', tipo: 'toggle', ajuda: 'Começa em 0, vai para a metade e chega ao valor acima, a cada duas sessões com o alvo.' })}
    ${campo({ caminho: 'ensino.faceis', rotulo: 'Itens fáceis antes de cada novo', tipo: 'select', opcoes: [[0, 'nenhum'], [1, '1'], [2, '2'], [3, '3']], ajuda: 'Momento comportamental. Usa os alvos já aprendidos; sem eles, "toca na concha".' })}
    ${campo({ caminho: 'ensino.semErro', rotulo: 'Aprendizagem sem erro', tipo: 'toggle', ajuda: 'Depois de um erro, vai direto para a ajuda total. Desligado, vai para o modelo do Lume.' })}
    </div>
    <div class="bloco"><h3>Degraus de ajuda usados</h3><p class="ajuda">Degrau 0: a criança responde sozinha. Degrau 1: a espera acima.</p>
    ${campo({ caminho: 'ensino.degraus.pista', rotulo: 'Degrau 2: pista visual', tipo: 'toggle', ajuda: 'As opções erradas ficam apagadas.' })}
    ${campo({ caminho: 'ensino.degraus.modelo', rotulo: 'Degrau 3: modelo do Lume', tipo: 'toggle', ajuda: 'O Lume mostra e fala a resposta.' })}
    ${campo({ caminho: 'ensino.degraus.total', rotulo: 'Degrau 4: ajuda total', tipo: 'toggle', ajuda: 'Só a resposta certa fica na tela.' })}
    </div>
    <div class="bloco"><h3>Critério de aprendido</h3>
    ${campo({ caminho: 'criterio.pct', rotulo: 'Acertos sozinha', tipo: 'range', min: 50, max: 100, passo: 5, sufixo: 'p%' })}
    ${campo({ caminho: 'criterio.sessoes', rotulo: 'Sessões seguidas', tipo: 'range', min: 1, max: 5 })}
    <p class="ajuda">Quando o alvo bate o critério, o jogo sugere na aba Dados. Só o psicólogo declara aprendido.</p></div>`;
  ligarCampos(p);
}

function abaReforco(p) {
  const pref = E.preferencia;
  p.innerHTML = `<h2>Recompensa</h2>
    <div class="bloco">
    ${campo({ caminho: 'reforco.sozinha', rotulo: 'Conchas quando faz sozinha', tipo: 'select', opcoes: [[1, '1'], [2, '2'], [3, '3']] })}
    ${campo({ caminho: 'reforco.ajuda', rotulo: 'Conchas quando faz com ajuda', tipo: 'select', opcoes: [[1, '1'], [2, '2'], [3, '3']] })}
    ${campo({ caminho: 'reforco.aCada', rotulo: 'Comemoração', tipo: 'select', opcoes: [[1, 'a cada acerto'], [2, 'a cada 2 acertos'], [3, 'a cada 3 acertos']], ajuda: 'Sempre previsível. Recompensa aleatória fica de fora de propósito.' })}
    ${campo({ caminho: 'reforco.comemoracao', rotulo: 'Jeito de comemorar', tipo: 'select', opcoes: [['quieta', 'brilho quietinho'], ['danca', 'dancinha do Lume'], ['som', 'som suave e brilho']] })}
    </div>
    <div class="bloco"><h3>Avaliação de preferência</h3>
      <p class="ajuda">Várias opções sem reposição (DeLeon e Iwata, 1996): a criança escolhe o tema de que mais gosta, depois o próximo, até sobrar um. Com mais rodadas, a ordem fica mais confiável.</p>
      ${campo({ caminho: 'reforco.rodadasPreferencia', rotulo: 'Rodadas', tipo: 'select', opcoes: [[1, '1'], [2, '2'], [3, '3']] })}
      <div class="linha-botoes"><button class="botao-p cheio" id="fazerPref">Fazer com a criança agora</button></div>
      ${pref ? `<p><b>Último resultado (${fmtData(pref.ts)}, ${pref.rodadas} rodada${pref.rodadas > 1 ? 's' : ''}):</b> ${pref.ranking.map((r, i) => `${i + 1}º ${TEMAS[r.tema].nome}`).join(' · ')}</p>
        <div class="linha-botoes"><button class="botao-p" id="usarPref">Usar ${esc(TEMAS[pref.ranking[0].tema].nome)} como tema do museu</button></div>` : ''}
    </div>`;
  ligarCampos(p);
  on('#fazerPref', () => { papel = null; telaPreferencia(E.config.reforco.rodadasPreferencia); });
  on('#usarPref', () => { const t = pref.ranking[0].tema; alterarConfig(`Tema do museu: ${TEMAS[E.config.crianca.interesse].nome} → ${TEMAS[t].nome} (avaliação de preferência)`, c => { c.crianca.interesse = t; }); aviso('Salvo'); telaAdulto('reforco'); });
}

function abaSessao(p) {
  const vozes = [['', 'Automática (português do Brasil)'], ...vozesPt.map(v => [v.name, `${v.name} (${v.lang})`])];
  p.innerHTML = `<h2>Sessão e sentidos</h2>
    <div class="bloco"><h3>Sessão</h3>
    ${campo({ caminho: 'sessao.aquecimento', rotulo: 'Aquecimento', tipo: 'toggle', ajuda: 'Duas tarefas fáceis antes da Vila.' })}
    ${campo({ caminho: 'sessao.tesouro', rotulo: 'Tesouro no fim', tipo: 'toggle' })}
    ${campo({ caminho: 'sessao.maxMin', rotulo: 'Duração máxima da sessão', tipo: 'range', min: 5, max: 20, sufixo: 'min' })}
    ${campo({ caminho: 'sessao.limiteDiarioMin', rotulo: 'Limite por dia', tipo: 'range', min: 5, max: TETO_DIARIO_MIN, sufixo: 'min', ajuda: `Teto fixo de ${TETO_DIARIO_MIN} minutos, que ninguém desliga. Hoje: ${Math.round(minutosHoje())} min usados.` })}
    </div>
    <div class="bloco"><h3>Sentidos</h3>
    ${campo({ caminho: 'sensorial.volVoz', rotulo: 'Volume da voz', tipo: 'range', min: 0, max: 1, passo: 0.1, sufixo: '%' })}
    ${campo({ caminho: 'sensorial.volEfeitos', rotulo: 'Volume dos efeitos', tipo: 'range', min: 0, max: 1, passo: 0.1, sufixo: '%' })}
    ${campo({ caminho: 'sensorial.velVoz', rotulo: 'Velocidade da voz', tipo: 'range', min: 0.7, max: 1.2, passo: 0.05, sufixo: 'x' })}
    ${campo({ caminho: 'sensorial.voz', rotulo: 'Voz', tipo: 'select', opcoes: vozes, ajuda: vozesPt.length ? 'Vozes deste aparelho. A voz gravada entra por cima quando existir.' : 'Este aparelho não informou vozes em português; o jogo mostra a legenda de toda fala.' })}
    ${campo({ caminho: 'sensorial.modoCalmo', rotulo: 'Modo calmo', tipo: 'toggle', ajuda: 'Tira as animações e deixa as trocas instantâneas.' })}
    <div class="linha-botoes"><button class="botao-p" id="testarVoz">Ouvir a voz</button></div>
    </div>`;
  ligarCampos(p);
  on('#testarVoz', () => falar(fx('teste.voz', 'Oi! Eu sou o Lume. Esta é a minha voz.')));
}

/* ---------- aba Dados ---------- */

function graficoAlvo(alvo) {
  const pts = resumoPorSessao(alvo);
  if (!pts.length) return '<p class="vazio">Ainda sem sessões com este alvo.</p>';
  const W = 640, H = 230, m = { l: 44, r: 20, t: 22, b: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = i => m.l + (pts.length === 1 ? iw / 2 : i * iw / (pts.length - 1));
  const y = v => m.t + ih - (v / 100) * ih;
  let s = '';
  for (const v of [0, 50, 100]) s += `<line class="grade" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`;
  const crit = E.config.criterio.pct;
  s += `<line class="criterio" x1="${m.l}" x2="${W - m.r}" y1="${y(crit)}" y2="${y(crit)}"/><text class="rot-criterio" x="${W - m.r}" y="${y(crit) - 6}" text-anchor="end">critério ${crit}%</text>`;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].configVersao !== pts[i - 1].configVersao) {
      const xm = (x(i - 1) + x(i)) / 2;
      s += `<line class="ajuste" x1="${xm}" x2="${xm}" y1="${m.t - 6}" y2="${m.t + ih}"/><text class="rot-ajuste" x="${xm + 3}" y="${m.t - 9}">ajuste</text>`;
    }
  }
  // a linha não atravessa troca de fase (convenção de gráfico de caso único)
  let seg = [];
  const fechar = () => { if (seg.length > 1) s += `<polyline class="serie" points="${seg.join(' ')}"/>`; seg = []; };
  pts.forEach((p, i) => { if (i && p.fase !== pts[i - 1].fase) fechar(); seg.push(`${x(i).toFixed(1)},${y(p.pct).toFixed(1)}`); });
  fechar();
  const passoRot = Math.max(1, Math.ceil(pts.length / 10));
  pts.forEach((p, i) => {
    const cx = x(i), cy = y(p.pct);
    const info = `Sessão ${i + 1} · ${fmtData(p.ts)} · ${p.sozinha} de ${p.n} sozinha (${p.pct}%) · ${FASES[p.fase] || p.fase} · nível ${p.nivel}`;
    const marca = p.fase === 'aprendido'
      ? `<rect class="ponto" x="${cx - 5}" y="${cy - 5}" width="10" height="10"/>`
      : `<circle class="ponto ${p.fase === 'linha-de-base' ? 'base' : ''}" cx="${cx}" cy="${cy}" r="5.5"/>`;
    s += `${marca}<circle class="alvo-toque" cx="${cx}" cy="${cy}" r="16" data-info="${esc(info)}"><title>${esc(info)}</title></circle>`;
    if (i % passoRot === 0 || i === pts.length - 1) s += `<text class="eixo" x="${cx}" y="${H - 12}" text-anchor="middle">S${i + 1}</text>`;
  });
  const tabela = `<details><summary>Ver em tabela</summary><div class="tabela"><table><thead><tr><th>Sessão</th><th>Data</th><th>Fase</th><th>Nível</th><th>Sozinha</th><th>%</th></tr></thead><tbody>
    ${pts.map((p, i) => `<tr><td>S${i + 1}</td><td>${fmtData(p.ts)}</td><td>${FASES[p.fase] || p.fase}</td><td>${p.nivel}</td><td>${p.sozinha} de ${p.n}</td><td>${p.pct}%</td></tr>`).join('')}</tbody></table></div></details>`;
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Acertos sozinha por sessão">${s}</svg>
    <p class="leitura" data-leitura></p>${tabela}`;
}

function abaDados(p) {
  const abertas = E.sugestoes.filter(s => s.status === 'aberta' || s.status === 'info');
  const sessoes = E.sessoes.slice().reverse();
  const alvosComDados = alvosOrdenados().map(([k]) => k).filter(k => (E.config.alvos[k] && E.config.alvos[k].ativo) || resumoPorSessao(k).length);
  p.innerHTML = `<h2>Dados</h2>
    <div class="bloco"><h3>Sugestões do jogo</h3>
      ${abertas.length ? abertas.map(s => `<div class="sugestao ${s.status === 'info' ? 'info' : ''}"><p>${esc(s.texto)}</p><div class="linha-botoes">
        ${s.status === 'info' ? `<button class="botao-p" data-sug="${s.id}" data-ok="0">Entendi</button>` : `<button class="botao-p cheio" data-sug="${s.id}" data-ok="1">Aceitar</button><button class="botao-p" data-sug="${s.id}" data-ok="0">Ignorar</button>`}</div></div>`).join('')
        : '<p class="vazio">Nenhuma sugestão aberta. Elas aparecem depois das sessões.</p>'}
    </div>
    ${alvosComDados.map(k => `<div class="bloco"><h3>${LUGARES[ALVOS[k].lugar].nome}: ${ALVOS[k].nome}</h3>${graficoAlvo(k)}
      <p class="legenda-graf">○ linha de base · ● ensino · ■ manutenção · tracejado vertical: ajuste de configuração · tracejado horizontal: critério. Toque num ponto para ler o valor.</p></div>`).join('')}
    ${blocoAtividades()}
    <div class="bloco"><h3>Sessões</h3>
      ${sessoes.length ? `<div class="tabela"><table><thead><tr><th>Início</th><th>Duração</th><th>Como estava</th><th>Tarefas</th><th>Sozinha</th><th>Conchas</th><th>Pausas</th><th>Fim</th></tr></thead><tbody>
      ${sessoes.map(s => {
        const tr = E.tentativas.filter(t => t.sessao === s.id && !t.facil);
        const dur = Math.max(1, Math.round((new Date(s.fim) - new Date(s.inicio)) / 60000));
        return `<tr><td>${fmtData(s.inicio)}</td><td>${dur} min</td><td>${s.comoEstou ?? '·'}${s.comoEstouDepois ? ' → ' + s.comoEstouDepois : ''}</td><td>${tr.length}</td><td>${tr.length ? pct(tr.filter(t => t.sozinha).length, tr.length) + '%' : '·'}</td><td>${s.conchas}</td><td>${s.pausas}</td><td>${{ completa: 'completa', 'agora-nao': 'agora não', pausa: 'parou na pausa' }[s.encerrada] || s.encerrada}</td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="vazio">Nenhuma sessão ainda.</p>'}
    </div>
    <div class="bloco"><h3>Baixar em planilha</h3><p class="ajuda">Arquivos CSV com ponto e vírgula, que abrem direto no Excel.</p>
      <div class="linha-botoes"><button class="botao-p" id="csvTent">Tentativas</button><button class="botao-p" id="csvSess">Sessões</button><button class="botao-p" id="csvAbc">Registros ABC</button><button class="botao-p" id="csvEventos">Atividades</button><button class="botao-p" id="csvConfig">Histórico de ajustes</button></div></div>
    <div class="bloco"><h3>Histórico de ajustes</h3><div class="tabela"><table><thead><tr><th>Versão</th><th>Data</th><th>Quem</th><th>O que mudou</th></tr></thead><tbody>
      ${E.historicoConfig.slice().reverse().slice(0, 40).map(h => `<tr><td>${h.versao}</td><td>${fmtData(h.ts)}</td><td>${{ psi: 'psicólogo', pais: 'pais', sistema: 'sistema' }[h.papel] || h.papel}</td><td>${esc(h.resumo)}</td></tr>`).join('')}</tbody></table></div></div>`;
  $$('[data-sug]', p).forEach(b => b.addEventListener('click', () => { tratarSugestao(b.dataset.sug, b.dataset.ok === '1'); aviso('Salvo'); telaAdulto('dados'); }));
  $$('.alvo-toque', p).forEach(c => c.addEventListener('click', () => { const l = c.closest('.bloco').querySelector('[data-leitura]'); if (l) l.textContent = c.dataset.info; }));
  on('#csvTent', exportarTentativas); on('#csvSess', exportarSessoes); on('#csvAbc', exportarAbc); on('#csvConfig', exportarHistorico); on('#csvEventos', exportarEventos);
}

/* ---------- aba Casa (pais e psicólogo) ---------- */

const ABC_OPCOES = {
  antes: ['pediram uma tarefa', 'mudança na rotina', 'barulho ou muita gente', 'teve que esperar', 'disseram não', 'terminou algo que gostava', 'estava sozinho', 'outro'],
  comportamento: ['chorou', 'gritou', 'saiu correndo', 'se jogou no chão', 'bateu ou empurrou', 'se machucou', 'ficou parado e calado', 'outro'],
  depois: ['deram uma pausa', 'deram o que queria', 'tiraram a tarefa', 'acalmaram junto', 'mudaram de atividade', 'ignoraram', 'outro'],
};
function abaCasa(p) {
  const escolha = { antes: new Set(), comportamento: new Set(), depois: new Set() };
  const chips = grupo => `<div class="chips" data-grupo="${grupo}">${ABC_OPCOES[grupo].map(o => `<button class="chip" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`;
  const missoes = missoesAtivas();
  p.innerHTML = `<h2>Casa</h2>
    <div class="bloco"><h3>Missões desta fase</h3>${missoes.length ? `<ul class="lista-passos">${missoes.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p class="vazio">Sem alvos ligados.</p>'}
      <p class="ajuda">O cartão de pausa vale em casa também, e sempre funciona.</p></div>
    <div class="bloco"><h3>Registro ABC em três toques</h3><p class="ajuda">Quando acontecer uma crise ou algo importante: o que veio antes, o que a criança fez e o que aconteceu depois. O psicólogo usa na análise.</p>
      <h4>1. Antes</h4>${chips('antes')}<h4>2. O que a criança fez</h4>${chips('comportamento')}<h4>3. Depois</h4>${chips('depois')}
      <label for="abcNota"><b>Anotação (opcional)</b></label><textarea id="abcNota" maxlength="400"></textarea>
      <div class="linha-botoes"><button class="botao-p cheio" id="abcSalvar">Salvar registro</button></div></div>
    <div class="bloco"><h3>Registros</h3>${E.abc.length ? `<div class="tabela"><table><thead><tr><th>Data</th><th>Antes</th><th>O que fez</th><th>Depois</th><th>Anotação</th></tr></thead><tbody>
      ${E.abc.slice().reverse().map(r => `<tr><td>${fmtData(r.ts)}</td><td>${esc(r.antes.join(', '))}</td><td>${esc(r.comportamento.join(', '))}</td><td>${esc(r.depois.join(', '))}</td><td>${esc(r.nota)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum registro ainda.</p>'}</div>`;
  $$('.chips', p).forEach(g => $$('.chip', g).forEach(c => c.addEventListener('click', () => {
    const s = escolha[g.dataset.grupo], v = c.dataset.v;
    if (s.has(v)) s.delete(v); else s.add(v);
    c.classList.toggle('marcado', s.has(v)); c.setAttribute('aria-pressed', s.has(v));
  })));
  on('#abcSalvar', () => {
    if (!escolha.comportamento.size) { aviso('Marque pelo menos o que a criança fez'); return; }
    E.abc.push({ id: novoId(), ts: agoraISO(), papel, antes: [...escolha.antes], comportamento: [...escolha.comportamento], depois: [...escolha.depois], nota: $('#abcNota').value.trim() });
    salvar(); aviso('Registro salvo'); telaAdulto('casa');
  });
}

function abaAjustesPais(p) {
  const perm = E.config.permissoesPais;
  const livres = [
    perm.volume ? campo({ caminho: 'sensorial.volVoz', rotulo: 'Volume da voz', tipo: 'range', min: 0, max: 1, passo: 0.1, sufixo: '%' }) + campo({ caminho: 'sensorial.volEfeitos', rotulo: 'Volume dos efeitos', tipo: 'range', min: 0, max: 1, passo: 0.1, sufixo: '%' }) : '',
    perm.proxima ? campo({ caminho: 'crianca.proxima', rotulo: 'Depois do jogo', tipo: 'select', opcoes: Object.entries(ATIVIDADES).map(([k, a]) => [k, a.nome]) }) : '',
    perm.limite ? campo({ caminho: 'sessao.limiteDiarioMin', rotulo: 'Limite por dia', tipo: 'range', min: 5, max: TETO_DIARIO_MIN, sufixo: 'min' }) : '',
  ].join('');
  p.innerHTML = `<h2>Ajustes</h2><div class="bloco">${livres || '<p class="vazio">Nenhum ajuste liberado para os pais.</p>'}</div>
    <div class="bloco"><h3>Combinado com o psicólogo</h3><p>Alvos, níveis, ajuda, recompensa e critérios ficam travados. Para mudar, fale com o psicólogo.</p></div>`;
  ligarCampos(p);
}

/* ---------- aba Aparelho ---------- */

let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; });

function abaAparelho(p) {
  p.innerHTML = `<h2>Aparelho</h2>
    <div class="bloco"><h3>Instalar na tela inicial</h3>
      <p>No Android (Chrome): menu de três pontos, "Instalar app" ou "Adicionar à tela inicial". No iPhone (Safari): botão Compartilhar, "Adicionar à Tela de Início". Depois da primeira abertura, o jogo funciona sem internet.</p>
      ${pedidoInstalar ? '<div class="linha-botoes"><button class="botao-p cheio" id="instalar">Instalar agora</button></div>' : ''}
      <p class="ajuda">Antes de cada sessão: ligue o "Não perturbe" e fixe a tela (Acesso Guiado no iPhone, Fixar app no Android). Assim a criança não sai do jogo e nenhuma notificação interrompe.</p></div>
    <div class="bloco"><h3>Permissões dos pais</h3>
      ${campo({ caminho: 'permissoesPais.volume', rotulo: 'Pais mudam o volume', tipo: 'toggle' })}
      ${campo({ caminho: 'permissoesPais.proxima', rotulo: 'Pais mudam a atividade do tchau', tipo: 'toggle' })}
      ${campo({ caminho: 'permissoesPais.limite', rotulo: 'Pais mudam o limite por dia', tipo: 'toggle', ajuda: `Sempre dentro do teto de ${TETO_DIARIO_MIN} minutos.` })}
      <div class="linha-botoes"><button class="botao-p" id="pinPais">${E.pinPais ? 'Trocar o PIN dos pais' : 'Criar o PIN dos pais'}</button>${E.pinPais ? '<button class="botao-p" id="tirarPinPais">Remover o PIN dos pais</button>' : ''}<button class="botao-p" id="pinPsi">Trocar o PIN do psicólogo</button></div>
      <div id="novoPin"></div></div>
    <div class="bloco"><h3>Configuração</h3><p class="ajuda">Leve a configuração deste aparelho para outro (por exemplo, do consultório para o celular da família).</p>
      <div class="linha-botoes"><button class="botao-p" id="expConfig">Baixar configuração</button><label class="botao-p" for="impConfig" style="display:inline-flex;align-items:center">Importar configuração</label><input type="file" id="impConfig" accept="application/json,.json" hidden></div>
      <div id="confirmaImport"></div></div>
    <div class="bloco"><h3>Voz</h3><p class="ajuda">Lista de todas as falas do jogo, com o código de cada uma, para gravar ou gerar a voz definitiva.</p>
      <div class="linha-botoes"><button class="botao-p" id="csvFalas">Baixar falas para gravação</button></div></div>
    <div class="bloco"><h3>Apagar tudo</h3><p class="ajuda">Apaga configuração, sessões e registros deste aparelho. Não tem volta.</p>
      <div class="linha-botoes"><button class="botao-p perigo" id="apagar">Apagar os dados deste aparelho</button></div><div id="confirmaApagar"></div></div>`;
  ligarCampos(p);
  on('#instalar', async () => { if (pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar = null; } });
  const pedirPin = (alvo) => {
    $('#novoPin').innerHTML = `<div class="campo"><label for="pinNovo">Novo PIN (4 números)</label><div class="controle"><input type="password" id="pinNovo" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"><button class="botao-p cheio" id="pinOk">Salvar</button></div></div>`;
    $('#pinNovo').focus();
    on('#pinOk', async () => {
      const v = $('#pinNovo').value;
      if (!/^\d{4}$/.test(v)) { aviso('Use 4 números'); return; }
      const h = await hashPin(v);
      if (alvo === 'pais' && h === E.pinPsi) { aviso('O PIN dos pais tem que ser diferente do PIN do psicólogo'); return; }
      if (alvo === 'psi' && h === E.pinPais) { aviso('O PIN do psicólogo tem que ser diferente do PIN dos pais'); return; }
      if (alvo === 'pais') E.pinPais = h; else E.pinPsi = h;
      salvar(); aviso('PIN salvo'); telaAdulto('aparelho');
    });
  };
  on('#pinPais', () => pedirPin('pais'));
  on('#pinPsi', () => pedirPin('psi'));
  on('#tirarPinPais', () => { E.pinPais = null; salvar(); aviso('PIN dos pais removido'); telaAdulto('aparelho'); });
  on('#expConfig', () => baixar(`ilha-do-farol-configuracao-${hojeChave()}.json`, JSON.stringify({ app: 'ilha-do-farol', versao: VERSAO, exportadoEm: agoraISO(), config: E.config }, null, 2), 'application/json'));
  on('#impConfig', async ev => {
    const arq = ev.target.files && ev.target.files[0];
    if (!arq) return;
    let dados;
    try { dados = JSON.parse(await arq.text()); } catch (e) { aviso('Arquivo inválido'); return; }
    if (!dados || dados.app !== 'ilha-do-farol' || !dados.config) { aviso('Este arquivo não é uma configuração da Ilha do Farol'); return; }
    $('#confirmaImport').innerHTML = `<div class="confirmar"><p>Substituir a configuração deste aparelho pela do arquivo (exportado em ${fmtData(dados.exportadoEm)})? Sessões e registros ficam.</p>
      <div class="linha-botoes"><button class="botao-p cheio" id="impSim">Substituir</button><button class="botao-p" id="impNao">Cancelar</button></div></div>`;
    on('#impSim', () => { alterarConfig('Configuração importada de arquivo', c => { const nova = mesclar(configPadrao(), dados.config); Object.keys(c).forEach(k => delete c[k]); Object.assign(c, nova); }); aviso('Configuração importada'); telaAdulto('aparelho'); });
    on('#impNao', () => { $('#confirmaImport').innerHTML = ''; ev.target.value = ''; });
  });
  on('#csvFalas', () => baixar(`ilha-do-farol-falas-${hojeChave()}.csv`, csv([['codigo', 'personagem', 'texto'], ...todasAsFalas().map(f => [f.id, NOME_FALANTE[f.quem] || f.quem, f.texto])]), 'text/csv;charset=utf-8'));
  on('#apagar', () => {
    $('#confirmaApagar').innerHTML = `<div class="confirmar"><label for="digApagar">Para confirmar, digite APAGAR</label><input type="text" id="digApagar" autocomplete="off"><div class="linha-botoes"><button class="botao-p perigo" id="apagarSim">Apagar agora</button></div></div>`;
    on('#apagarSim', () => {
      if ($('#digApagar').value.trim().toUpperCase() !== 'APAGAR') { aviso('Digite APAGAR para confirmar'); return; }
      try { localStorage.removeItem(CHAVE); } catch (e) { /* ok */ }
      // a conexão aberta com as fotos precisa fechar antes, senão o navegador segura a exclusão
      try { if (BANCO.db) BANCO.db.close(); } catch (e) { /* ok */ }
      BANCO.db = null;
      try {
        const q = indexedDB.deleteDatabase('ilhaFarol');
        q.onerror = q.onblocked = () => aviso('As fotos só saem de vez quando o jogo for fechado e aberto de novo');
      } catch (e) { /* ok */ }
      E = estadoPadrao(); salvar(); papel = null; telaInicio();
    });
  });
}

/* ============================================================
   Planilhas e arquivos
   ============================================================ */

function celula(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  const s = String(v);
  return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csv(linhas) { return '﻿' + linhas.map(l => l.map(celula).join(';')).join('\r\n'); }
function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  aviso('Arquivo baixado');
}
function exportarTentativas() {
  const nSessao = new Map(E.sessoes.map((s, i) => [s.id, i + 1]));
  baixar(`ilha-do-farol-tentativas-${hojeChave()}.csv`, csv([
    ['sessao', 'data_hora', 'alvo', 'item_facil', 'fase', 'nivel', 'correta', 'sozinha', 'errou_antes', 'sem_resposta', 'maior_degrau_de_ajuda', 'latencia_ms', 'espera_s', 'ordem_das_dicas', 'versao_da_configuracao', 'lembrete_na_escolha_livre'],
    ...E.tentativas.map(t => [nSessao.get(t.sessao) || '', fmtData(t.ts), t.alvo === 'facil' ? 'toca na concha' : ALVOS[t.alvo] ? `${LUGARES[ALVOS[t.alvo].lugar].nome}: ${ALVOS[t.alvo].nome}` : t.alvo, t.facil, FASES[t.fase] || t.fase, t.nivel, t.correta, t.sozinha, t.erro, t.semResposta, t.degrau, t.latenciaMs, t.atrasoS, t.ordem, t.configVersao, !!t.lembrete]),
  ]), 'text/csv;charset=utf-8');
}
function exportarSessoes() {
  baixar(`ilha-do-farol-sessoes-${hojeChave()}.csv`, csv([
    ['sessao', 'inicio', 'fim', 'como_estava', 'como_ficou_depois_da_onda', 'tarefas', 'sozinha_pct', 'conchas', 'pausas', 'encerramento', 'versao_da_configuracao'],
    ...E.sessoes.map((s, i) => {
      const tr = E.tentativas.filter(t => t.sessao === s.id && !t.facil);
      return [i + 1, fmtData(s.inicio), fmtData(s.fim), s.comoEstou, s.comoEstouDepois, tr.length, tr.length ? pct(tr.filter(t => t.sozinha).length, tr.length) : '', s.conchas, s.pausas, s.encerrada, s.configVersao];
    }),
  ]), 'text/csv;charset=utf-8');
}
function exportarAbc() {
  baixar(`ilha-do-farol-abc-${hojeChave()}.csv`, csv([
    ['data_hora', 'quem_registrou', 'antes', 'o_que_fez', 'depois', 'anotacao'],
    ...E.abc.map(r => [fmtData(r.ts), r.papel === 'pais' ? 'pais' : 'psicólogo', r.antes.join(', '), r.comportamento.join(', '), r.depois.join(', '), r.nota]),
  ]), 'text/csv;charset=utf-8');
}
function exportarHistorico() {
  baixar(`ilha-do-farol-ajustes-${hojeChave()}.csv`, csv([
    ['versao', 'data_hora', 'quem', 'o_que_mudou'],
    ...E.historicoConfig.map(h => [h.versao, fmtData(h.ts), h.papel, h.resumo]),
  ]), 'text/csv;charset=utf-8');
}

// Todas as falas possíveis, para o roteiro de gravação.
function todasAsFalas() {
  const lista = [], vistos = new Set();
  const add = f => { if (f && !vistos.has(f.id)) { vistos.add(f.id); lista.push(f); } };
  for (const aq of [true, false]) for (const te of [true, false]) {
    const et = ['comoEstou']; if (aq) et.push('aquecer'); et.push('vila'); if (te) et.push('tesouro'); et.push('tchau');
    add(FALA.chegada(et));
  }
  [FALA.vamos, FALA.agoraNao, FALA.comoEstou, FALA.comoAgora, ...Object.values(FALA.termo), FALA.aindaAgitado, FALA.ondaInicio, FALA.ondaSobe, FALA.ondaDesce, FALA.ondaFim,
    FALA.pausa, FALA.pausaVolta, FALA.facil, FALA.facilModelo, FALA.facilElogio, FALA.q2ModeloEu, FALA.ajInstrucao, FALA.ajModelo, FALA.ajElogio,
    FALA.ajsGigi, FALA.ajsInstrucao, FALA.ajsModelo, FALA.ajsGigiBaixo, FALA.ajsElogio, FALA.recTuca, FALA.recInstrucao, FALA.recModelo, FALA.recTudoBem, FALA.recElogio,
    FALA.juntos, FALA.tocaAqui, FALA.obrigado, FALA.proxima, FALA.farolMais, FALA.peca, FALA.tempoAcabou, FALA.limite, FALA.preferencia, FALA.preferenciaFim].forEach(add);
  for (const m of ['caco', 'tuca']) {
    add(FALA.aqui(m)); add(FALA.ajudo(m)); add(FALA.q2Elogio(m));
    for (const c of Object.keys(COISAS)) { add(FALA.q1(m, c)); add(FALA.q1Elogio(m, c)); add(FALA.q2(m, c)); }
    for (const cor of Object.keys(CORES_CONCHA)) add(FALA.q2Cor(m, cor));
  }
  for (const c of Object.keys(COISAS)) { add(FALA.q1Modelo(c)); add(FALA.q2ModeloCoisa(c)); }
  for (const cor of Object.keys(CORES_CONCHA)) add(FALA.q2ModeloCor(cor));
  for (let n = 1; n <= 40; n++) add(FALA.tesouro(n));
  for (const a of Object.keys(ATIVIDADES)) add(FALA.tchau(a));
  falasDosLugares().forEach(add);
  return lista;
}

/* ============================================================
   Início do aplicativo
   ============================================================ */

async function iniciar() {
  E = carregar();
  salvar();
  if ('speechSynthesis' in window) { carregarVozes(); speechSynthesis.onvoiceschanged = carregarVozes; }
  await Promise.all([carregarImagens(), carregarAudios()]);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pararFala(); });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  telaInicio();
}
window.addEventListener('DOMContentLoaded', iniciar);
