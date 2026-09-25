'use strict';
/* Ilha do Farol: os oito lugares da ilha (versão 0.3).
   Cada lugar monta as próprias tarefas. O motor de tarefa, a escada de ajuda, as conchas,
   a pausa e o registro ficam em app.js; aqui ficam o conteúdo e as telas próprias. */

/* ============================================================
   Personagens, falantes e cartões novos
   ============================================================ */

MORADORES.fifi = { nome: 'Fifi', artigo: 'a', arte: () => '' };
MORADORES.bolota = { nome: 'Bolota', artigo: 'o', arte: () => '' };
NOME_FALANTE.fifi = 'Fifi';
NOME_FALANTE.bolota = 'Bolota';
TOM_VOZ.fifi = 1.2;
TOM_VOZ.bolota = 1.05;
COR_CATEGORIA.pessoa = '#D9B23F';

function cartaoComImagem(id, rotulo, cat, imagem) {
  CARTOES[id] = { rotulo, cat, img: imagem, arte: () => svg('0 0 100 100', `<rect x="12" y="12" width="76" height="76" rx="14" fill="${COR.tealClaro}"/>`) };
}
// rotina do dia (Casa do Farol)
[['r-acordar', 'acordar', 'rotina-acordar'], ['r-escovar', 'escovar os dentes', 'rotina-escovar'], ['r-cafe', 'tomar café', 'rotina-cafe'],
  ['r-vestir', 'se vestir', 'rotina-vestir'], ['r-escola', 'ir à escola', 'atividade-escola'], ['r-lanche', 'lanchar', 'atividade-lanche'],
  ['r-brincar', 'brincar', 'atividade-brincar'], ['r-banho', 'tomar banho', 'atividade-banho'], ['r-dormir', 'dormir', 'atividade-dormir'],
  ['r-passear', 'passear', 'atividade-passear']].forEach(([id, r, i]) => cartaoComImagem(id, r, 'verbo', i));
// sentimentos (Praia das Caras): o rosto do Lume junto da palavra
[['e-alegre', 'alegre', 'lume-feliz'], ['e-triste', 'triste', 'lume-triste'], ['e-raiva', 'com raiva', 'lume-bravo'], ['e-medo', 'com medo', 'lume-medo']]
  .forEach(([id, r, i]) => cartaoComImagem(id, r, 'descricao', i));
// ferramentas de calma (Enseada Calma)
[['f-onda', 'respirar com a onda', 'ferramenta-onda'], ['f-apertar', 'apertar', 'ferramenta-apertar'], ['f-pular', 'pular', 'ferramenta-pular'],
  ['f-silencio', 'silêncio', 'ferramenta-silencio'], ['f-cantinho', 'cantinho calmo', 'ferramenta-cantinho'], ['f-ajuda', 'pedir ajuda', 'carta-ajuda']]
  .forEach(([id, r, i]) => cartaoComImagem(id, r, 'verbo', i));
// passos (Oficina dos Passos)
[['m-1', 'abrir a torneira', 'passo-maos-1'], ['m-2', 'molhar as mãos', 'passo-maos-2'], ['m-3', 'passar sabão', 'passo-maos-3'], ['m-4', 'esfregar', 'passo-maos-4'], ['m-5', 'secar', 'passo-maos-5'],
  ['d-1', 'pasta na escova', 'passo-dentes-1'], ['d-2', 'escovar', 'passo-dentes-2'], ['d-3', 'cuspir', 'passo-dentes-3'], ['d-4', 'enxaguar', 'passo-dentes-4'],
  ['v-1', 'camiseta', 'passo-vestir-1'], ['v-2', 'bermuda', 'passo-vestir-2'], ['v-3', 'meias', 'passo-vestir-3'], ['v-4', 'tênis', 'passo-vestir-4']]
  .forEach(([id, r, i]) => cartaoComImagem(id, r, 'verbo', i));
// pessoas e lugares (histórias e Clareira)
[['p-tuca', 'a Tuca', 'tuca'], ['p-gigi', 'a Gigi', 'gigi'], ['p-caco', 'o Caco', 'caco']].forEach(([id, r, i]) => cartaoComImagem(id, r, 'pessoa', i));
[['l-praia', 'a praia', 'lugar-praia'], ['l-farol', 'o farol', 'farol'], ['l-mirante', 'o mirante', 'lugar-mirante']].forEach(([id, r, i]) => cartaoComImagem(id, r, 'coisa', i));
// jeitos de mostrar o sentimento (Dicionário do Meu Jeito)
[['j-pular', 'pulo', 'jeito-pular'], ['j-esconder', 'escondo o rosto', 'jeito-esconder'], ['j-abracar', 'abraço algo macio', 'jeito-abracar'],
  ['j-chorar', 'choro', 'jeito-chorar'], ['j-quieto', 'fico quieto', 'jeito-quieto'], ['j-agitar', 'mexo o corpo', 'jeito-agitar']]
  .forEach(([id, r, i]) => cartaoComImagem(id, r, 'verbo', i));
// o Cartão Surpresa tem sempre a mesma cara: a mudança fica previsível
CARTOES.surpresa = { rotulo: 'mudança', cat: 'descricao', arte: () => svg('0 0 100 100', `<rect x="10" y="10" width="80" height="80" rx="16" fill="${COR.ambar}"/><text x="50" y="68" text-anchor="middle" font-size="54" font-family="Lexend, sans-serif" font-weight="700" fill="#fff">?</text>`) };

const foto = (chave, cls = '', alt = '') => (IMG[chave] ? img(chave, `foto ${cls}`, alt) : '');

/* ============================================================
   Os oito lugares
   ============================================================ */

const LUGARES = {
  farol: { nome: 'Casa do Farol', a: 'à', habilidade: 'rotina e previsibilidade', imagem: 'farol', padrao: { aberto: true, tarefas: 2 }, jogar: jogarFarol,
    missao: 'Monte com a criança a agenda da manhã com os cartões e use por 3 dias. Uma vez na semana, faça de propósito uma troca pequena (o Cartão Surpresa).' },
  enseada: { nome: 'Enseada Calma', a: 'à', habilidade: 'regular a energia', imagem: 'lugar-enseada', padrao: { aberto: true, tarefas: 2, nivel: 1,
    ferramentas: { onda: true, apertar: true, pular: true, silencio: true, cantinho: true, ajuda: true } }, jogar: jogarEnseada,
    missao: 'Faça a respiração da onda uma vez por dia num momento calmo, junto com a criança. Pergunte qual ferramenta da Caixa de Calma ela quer usar em casa.' },
  vila: { nome: 'Vila Conversa', a: 'à', habilidade: 'pedir e recusar', imagem: 'barraca', padrao: { aberto: true, tarefas: 6 }, jogar: aoFim => rodarFila('vila', aoFim) },
  praia: { nome: 'Praia das Caras', a: 'à', habilidade: 'sentimentos', imagem: 'lugar-praia', padrao: { aberto: true, tarefas: 6, meujeito: true }, jogar: jogarPraia,
    missao: 'Detetive dos sentimentos: no jantar, cada pessoa da casa conta como se sentiu hoje, inclusive os adultos.' },
  oficina: { nome: 'Oficina dos Passos', a: 'à', habilidade: 'autonomia', imagem: 'lugar-oficina', padrao: { aberto: true, tarefas: 2, encadeamento: 'tras' }, jogar: aoFim => rodarFila('oficina', aoFim),
    missao: 'Cole a lista de passos no banheiro. A criança marca cada passo por uma semana; o adulto elogia o passo feito, não a pressa.' },
  mercado: { nome: 'Mercado das Histórias', a: 'ao', habilidade: 'situações novas', imagem: 'lugar-mercado', padrao: { aberto: true, tarefas: 1, festa: true, medico: true }, jogar: jogarMercado,
    missao: 'Leia a história com a criança na véspera e no dia da situação real. Depois, conte como foi com uma carinha.' },
  clareira: { nome: 'Clareira do Encontro', a: 'à', habilidade: 'brincar junto', imagem: 'lugar-clareira', padrao: { aberto: true, nivel: 1, pecas: 6 }, jogar: jogarClareira,
    missao: 'Dez minutos por dia de brincar do jeito dela, sem tela: o adulto senta no chão, deixa a criança escolher, imita e comenta, sem pergunta de prova.' },
  mirante: { nome: 'Mirante dos Tesouros', a: 'ao', habilidade: 'o interesse da criança', imagem: 'lugar-mirante', padrao: { aberto: true }, jogar: jogarMirante,
    missao: 'A criança ensina uma coisa do tema dela a alguém da família, e essa pessoa faz uma pergunta de volta.' },
};
A.lugar = l => foto(LUGARES[l].imagem, 'lugar', LUGARES[l].nome) || ICONE.vila();

// alvos com acerto (os lugares sem acerto certo, como Enseada, Clareira e Mirante, registram atividade)
for (const k of ['querer1', 'querer2', 'ajuda', 'ajuste', 'recusar']) ALVOS[k].lugar = 'vila';
Object.assign(ALVOS, {
  rotina: { lugar: 'farol', nome: 'Montar o dia', desc: 'Pôr os cartões da rotina na ordem: 3, 5 ou 7 cartões conforme o nível.',
    missao: LUGARES.farol.missao },
  surpresa: { lugar: 'farol', nome: 'Cartão Surpresa', desc: 'Aceitar uma mudança na rotina escolhendo o que entra no lugar. Não existe resposta errada.' },
  emocao: { lugar: 'praia', nome: 'Reconhecer o sentimento', desc: 'Nível 1: rosto e 2 opções. Nível 2: rosto e 4 opções. Nível 3: prever pela situação, sem rosto.',
    missao: LUGARES.praia.missao },
  maos: { lugar: 'oficina', nome: 'Lavar as mãos', desc: 'Pôr os 5 passos na ordem.', missao: LUGARES.oficina.missao },
  dentes: { lugar: 'oficina', nome: 'Escovar os dentes', desc: 'Pôr os 4 passos na ordem.', missao: LUGARES.oficina.missao },
  vestir: { lugar: 'oficina', nome: 'Vestir-se', desc: 'Pôr as 4 peças de roupa na ordem.', missao: LUGARES.oficina.missao },
  historias: { lugar: 'mercado', nome: 'Entender a história', desc: 'Perguntas durante a história. No nível 3 entra um imprevisto.', missao: LUGARES.mercado.missao },
});
const ALVOS_ATIVOS_PADRAO = ['querer1', 'ajuda', 'rotina', 'surpresa', 'emocao', 'maos', 'historias'];
function alvosOrdenados() {
  const ordem = Object.keys(LUGARES);
  return Object.entries(ALVOS).sort((a, b) => ordem.indexOf(a[1].lugar) - ordem.indexOf(b[1].lugar));
}

function etapaInfo(e) {
  if (e === 'mapa') return { rotulo: 'Escolher', fala: 'escolher um lugar da ilha', icone: () => foto('lugar-mirante', 'lugar') || ICONE.vila() };
  if (LUGARES[e]) return { rotulo: LUGARES[e].nome, fala: `ir ${LUGARES[e].a} ${LUGARES[e].nome}`, icone: () => A.lugar(e) };
  return ETAPAS[e];
}
// Um lugar só aparece quando tem o que fazer: alvo ligado, história ligada ou ferramenta ligada.
function lugarTemConteudo(l) {
  const alvoLigado = Object.entries(E.config.alvos).some(([k, a]) => a.ativo && ALVOS[k] && ALVOS[k].lugar === l);
  if (l === 'mercado') return historiasAtivas().length > 0;
  if (l === 'enseada') return ferramentasLigadas().length > 0;
  if (l === 'praia') return alvoLigado || !!E.config.lugares.praia.meujeito;
  if (['farol', 'vila', 'oficina'].includes(l)) return alvoLigado;
  return true;
}
function lugaresAbertos() { return Object.keys(LUGARES).filter(l => E.config.lugares[l] && E.config.lugares[l].aberto && lugarTemConteudo(l)); }
function lugaresDaSessao() {
  const abertos = lugaresAbertos();
  if (E.config.sessao.escolha) return abertos.length ? ['mapa'] : [];
  const plano = (E.config.sessao.plano || []).filter(l => abertos.includes(l));
  return plano.length ? plano : abertos.slice(0, 1);
}
function entrarLugar(l) {
  S.lugarAtual = l;
  LUGARES[l].jogar(() => { S.lugarAtual = null; S.fila = null; proximaEtapa(); });
}
function registrarEvento(lugar, tipo, dados = {}) {
  E.eventos.push({ sessao: S ? S.id : null, ts: agoraISO(), lugar, tipo, ...dados });
  salvar();
}

/* ============================================================
   Mapa da ilha: a criança escolhe
   ============================================================ */

function telaMapa() {
  const g = novaTela();
  S.retomar = telaMapa;
  const abertos = lugaresAbertos();
  telaCrianca({ classe: 'sem-rodape',
    palco: `<div class="mapa-ilha">${abertos.map(l => `<button class="lugar-botao" data-l="${l}">${A.lugar(l)}<span>${LUGARES[l].nome}</span></button>`).join('')}</div>` });
  falar(fx('mapa.pergunta', 'Para onde vamos hoje? Escolha um lugar da ilha.'));
  $$('.lugar-botao').forEach(b => b.addEventListener('click', () => {
    if (!vivo(g)) return;
    pararFala(); SOM.toque();
    const l = b.dataset.l;
    S.etapas[S.etapa] = l;
    registrarEvento(l, 'escolha');
    entrarLugar(l);
  }));
}

/* ============================================================
   Casa do Farol: montar o dia e o Cartão Surpresa
   ============================================================ */

const DIA = ['r-acordar', 'r-escovar', 'r-cafe', 'r-vestir', 'r-escola', 'r-lanche', 'r-brincar', 'r-banho', 'r-dormir'];
const cenaFarol = () => `<div class="cena"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'feliz' })}</div>
  <div class="lado-morador"><div class="morador-lugar" id="morador">${A.morador('fifi')}</div></div></div>`;

function defRotina(nivel) {
  const n = telefone() ? [3, 4, 5][nivel - 1] : [3, 5, 7][nivel - 1];
  const ini = Math.floor(Math.random() * (DIA.length - n + 1));
  const itens = DIA.slice(ini, ini + n);
  return { alvo: 'rotina', nivel, multi: true, pequenas: n > 3, faixaTotal: itens, inicioFilho: 0, cena: cenaFarol(),
    instrucao: fx('rot.instrucao', 'A Fifi quer montar o dia dela. O que vem primeiro?'),
    passos: itens.map((id, i) => ({ correta: id, cartas: embaralhar(itens.slice(i)),
      modelo: fx(`rot.modelo.${id}`, `${i === 0 ? 'Primeiro' : 'Depois'}: ${CARTOES[id].rotulo}.`) })),
    resposta: fx('rot.fifi', 'Obrigada! Agora eu sei o que vem.', 'fifi'),
    elogio: fx('rot.elogio', 'Você montou o dia inteiro, na ordem certa!') };
}
const SURPRESAS = [
  { sai: 'r-passear', motivo: 'Choveu. O passeio fica para amanhã.' },
  { sai: 'r-brincar', motivo: 'O brinquedo quebrou. Vamos consertar depois.' },
  { sai: 'r-escola', motivo: 'Hoje é feriado. Não tem escola.' },
];
function defSurpresa(nivel) {
  const s = sortear(SURPRESAS);
  const opcoes = embaralhar(['r-lanche', 'r-brincar', 'r-banho', 'r-passear', 'r-dormir'].filter(x => x !== s.sai)).slice(0, nivel >= 3 ? 3 : 2);
  const dia = ['r-cafe', s.sai, 'r-banho'].map(id => (id === s.sai ? '' : id));
  const agenda = dia.map(id => `<div class="mini-cartao ${id ? '' : 'mudou'}">${id ? A.carta(id) : CARTOES.surpresa.arte()}</div>`).join('');
  return { alvo: 'surpresa', nivel, livre: true,
    cena: `<div class="cena"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'calmo' })}</div><div class="agenda-mini">${agenda}</div></div>`,
    instrucao: fx(`sur.${s.sai}`, `Ih! Mudança. ${s.motivo} O que a gente faz no lugar?`),
    passos: [{ correta: null, cartas: opcoes, modelo: fx('sur.modelo', 'Pode escolher qualquer um. Todos são bons.') }],
    elogio: fx('sur.elogio', 'Boa escolha. A mudança chegou e a gente achou outro jeito.') };
}
function jogarFarol(aoFim) { rodarFila('farol', aoFim); }

/* ============================================================
   Praia das Caras: sentimentos e o Dicionário do Meu Jeito
   ============================================================ */

const EMOCOES = {
  alegre: { carta: 'e-alegre', adj: 'alegre', lume: 'feliz', modelo: 'A boca está sorrindo. É alegria.' },
  triste: { carta: 'e-triste', adj: 'triste', lume: 'triste', modelo: 'A boca está para baixo. É tristeza.' },
  raiva: { carta: 'e-raiva', adj: 'com raiva', lume: 'bravo', modelo: 'As sobrancelhas estão para baixo. É raiva.' },
  medo: { carta: 'e-medo', adj: 'com medo', lume: 'medo', modelo: 'Os olhos estão bem abertos. É medo.' },
};
const ROSTOS = [
  { img: 'tuca', m: 'tuca', e: 'alegre' }, { img: 'gigi-feliz', m: 'gigi', e: 'alegre' },
  { img: 'tuca-triste', m: 'tuca', e: 'triste' }, { img: 'gigi-triste', m: 'gigi', e: 'triste' },
  { img: 'caco-bravo', m: 'caco', e: 'raiva' }, { img: 'caco-medo', m: 'caco', e: 'medo' },
];
const SITUACOES = [
  { m: 'tuca', e: 'triste', texto: 'O castelo de areia da Tuca caiu.' },
  { m: 'gigi', e: 'triste', texto: 'A Gigi perdeu a concha favorita.' },
  { m: 'caco', e: 'alegre', texto: 'O Caco ganhou um presente.' },
  { m: 'tuca', e: 'alegre', texto: 'A Tuca achou uma estrela bonita.' },
  { m: 'caco', e: 'raiva', texto: 'Pegaram o brinquedo do Caco sem pedir.' },
  { m: 'gigi', e: 'raiva', texto: 'Derrubaram a torre de areia da Gigi de propósito.' },
  { m: 'caco', e: 'medo', texto: 'Um trovão fez BUM, bem alto, perto do Caco.' },
  { m: 'tuca', e: 'medo', texto: 'A Tuca se perdeu da mãe dela na praia.' },
];
const pronome = m => (MORADORES[m].artigo === 'a' ? 'ela' : 'ele');
function defEmocao(nivel) {
  const todas = Object.keys(EMOCOES);
  if (nivel < 3) {
    const r = sortear(ROSTOS), M = MORADORES[r.m];
    const outras = embaralhar(todas.filter(e => e !== r.e)).slice(0, nivel === 1 ? 1 : limitarDistratores(3));
    return { alvo: 'emocao', nivel,
      cena: `<div class="cena praia"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'calmo' })}</div><div class="rosto-grande">${foto(r.img, 'rosto', M.nome)}</div></div>`,
      instrucao: fx(`emo.olha.${r.m}`, `Olha ${M.artigo} ${M.nome}. Como ${pronome(r.m)} está?`),
      passos: [{ correta: EMOCOES[r.e].carta, cartas: embaralhar([r.e, ...outras].map(e => EMOCOES[e].carta)), modelo: fx(`emo.modelo.${r.e}`, EMOCOES[r.e].modelo) }],
      elogio: fx(`emo.elogio.${r.m}.${r.e}`, `Isso. ${cap(M.artigo)} ${M.nome} está ${EMOCOES[r.e].adj}.`) };
  }
  const i = Math.floor(Math.random() * SITUACOES.length), s = SITUACOES[i], M = MORADORES[s.m];
  const outras = embaralhar(todas.filter(e => e !== s.e)).slice(0, limitarDistratores(3));
  return { alvo: 'emocao', nivel,
    cena: `<div class="cena praia"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'calmo' })}</div><div class="morador-lugar">${A.morador(s.m)}</div></div>`,
    preInstrucao: fx(`emo.sit.${i}`, s.texto, 'narrador'),
    instrucao: fx(`emo.sente.${s.m}`, `Como ${pronome(s.m)} se sente?`),
    passos: [{ correta: EMOCOES[s.e].carta, cartas: embaralhar([s.e, ...outras].map(e => EMOCOES[e].carta)),
      modelo: fx(`emo.modelo3.${s.e}`, `Quando isso acontece, a gente fica ${EMOCOES[s.e].adj}.`) }],
    elogio: fx(`emo.elogio3.${s.e}`, `Isso. Faz sentido ficar ${EMOCOES[s.e].adj}.`) };
}
function jogarPraia(aoFim) {
  rodarFila('praia', () => (E.config.lugares.praia.meujeito ? telaMeuJeito(aoFim) : aoFim()));
}
function telaMeuJeito(aoFim) {
  const g = novaTela();
  const ordem = ['alegre', 'triste', 'raiva', 'medo'];
  const e = ordem[(E.meuJeitoIdx || 0) % ordem.length];
  S.retomar = () => telaMeuJeito(aoFim);
  const marcados = new Set(E.meuJeito[e] || []);
  const jeitos = ['j-pular', 'j-esconder', 'j-abracar', 'j-chorar', 'j-quieto', 'j-agitar'];
  telaCrianca({
    palco: `<div class="cena praia"><div class="rosto-grande">${A.lume({ humor: EMOCOES[e].lume })}</div></div>`,
    opcoes: `<div class="cartas pequenas" id="cartas">${jeitos.map(cartaHTML).join('')}</div><button class="botao" id="pronto">Pronto</button>`,
  });
  falar(fx(`jeito.${e}`, `Quando você fica ${EMOCOES[e].adj}, o que você faz? Pode escolher mais de um.`));
  $$('#cartas .carta').forEach(b => {
    b.classList.toggle('marcada', marcados.has(b.dataset.id));
    b.setAttribute('aria-pressed', marcados.has(b.dataset.id));
    b.addEventListener('click', () => {
      SOM.toque();
      if (marcados.has(b.dataset.id)) marcados.delete(b.dataset.id); else marcados.add(b.dataset.id);
      b.classList.toggle('marcada', marcados.has(b.dataset.id));
      b.setAttribute('aria-pressed', marcados.has(b.dataset.id));
    });
  });
  let feito = false;
  on('#pronto', () => {
    if (!vivo(g) || feito) return;
    feito = true;
    pararFala();
    E.meuJeito[e] = [...marcados];
    E.meuJeitoIdx = (E.meuJeitoIdx || 0) + 1;
    registrarEvento('praia', 'meujeito', { emocao: e, jeitos: [...marcados].map(id => CARTOES[id].rotulo).join(', ') });
    ganharConchas(1);
    const seguir = seguirDepois(aoFim);
    falar(fx('jeito.obrigado', 'Obrigado! Agora eu conheço o seu jeito.')).then(() => vivo(g) && seguir());
  });
}

/* ============================================================
   Oficina dos Passos: passo a passo, com encadeamento
   ============================================================ */

const TAREFAS = {
  maos: { nome: 'lavar as mãos', passos: ['m-1', 'm-2', 'm-3', 'm-4', 'm-5'], quem: 'caco', frase: 'O Caco quer lavar as garras.' },
  dentes: { nome: 'escovar os dentes', passos: ['d-1', 'd-2', 'd-3', 'd-4'], quem: 'caco', frase: 'O Caco vai escovar os dentes.' },
  vestir: { nome: 'se vestir', passos: ['v-1', 'v-2', 'v-3', 'v-4'], quem: 'tuca', frase: 'A Tuca vai se vestir para passear.' },
};
function defPassos(alvo, nivel) {
  const t = TAREFAS[alvo], n = t.passos.length;
  const modo = E.config.lugares.oficina.encadeamento;
  const k = modo === 'total' ? n : Math.min(n, [2, n - 1, n][nivel - 1]);
  const inicio = modo === 'tras' ? n - k : 0;
  const filhos = t.passos.slice(inicio, inicio + k);
  const outro = sortear(Object.entries(TAREFAS).filter(([x]) => x !== alvo))[1].passos;
  const distrator = nivel >= 3 ? [sortear(outro)] : [];
  const M = MORADORES[t.quem];
  return { alvo, nivel, multi: true, pequenas: true, faixaTotal: t.passos, inicioFilho: inicio, completarDepois: modo === 'frente',
    cena: `<div class="cena"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'feliz' })}</div>
      <div class="lado-morador"><div class="barraca-fundo oficina">${foto('lugar-oficina')}</div><div class="morador-lugar" id="morador">${A.morador(t.quem)}</div></div></div>`,
    instrucao: fx(`pas.${alvo}.${inicio > 0 ? 'proximo' : 'primeiro'}`, `${t.frase} Qual é o ${inicio > 0 ? 'próximo' : 'primeiro'} passo?`),
    passos: filhos.map((id, i) => ({ correta: id, cartas: embaralhar([...filhos.slice(i), ...distrator]),
      modelo: fx(`pas.modelo.${id}`, `Agora: ${CARTOES[id].rotulo}.`) })),
    resposta: fx(`pas.obrigado.${t.quem}`, 'Consegui! Obrigado.', t.quem),
    elogio: fx(`pas.elogio.${alvo}`, `Pronto! ${cap(M.artigo)} ${M.nome} conseguiu ${t.nome}, passo a passo.`) };
}

Object.assign(DEFS, { rotina: defRotina, surpresa: defSurpresa, emocao: defEmocao,
  maos: nivel => defPassos('maos', nivel), dentes: nivel => defPassos('dentes', nivel), vestir: nivel => defPassos('vestir', nivel) });

/* ============================================================
   Mercado das Histórias: histórias prontas e Histórias Minhas
   ============================================================ */

const HISTORIAS = {
  festa: { titulo: 'A festa da Gigi', paginas: [
    { img: 'festa-1', texto: 'A Gigi fez um convite. Vai ter festa na praia!' },
    { img: 'festa-2', texto: 'Na festa tem balão, bolo e amigos. Às vezes, festa tem muito barulho.' },
    { img: 'festa-3', texto: 'Quando todo mundo canta alto, o Lume pode se sentir incomodado. Tudo bem sentir isso.',
      pergunta: { id: 'festa.q1', texto: 'Como o Lume ficou quando todos cantaram alto?', correta: 'e-medo', distratores: ['e-alegre', 'e-raiva'],
        modelo: 'Olha os olhos dele: estão bem abertos. Ele ficou com medo.', elogio: 'Isso. O barulho alto deixou o Lume com medo.' } },
    { img: 'festa-4', texto: 'O Lume pode usar o fone. Com o fone, o som fica mais baixo.',
      imprevisto: { id: 'festa.q3', texto: 'A música ficou alta de novo. O que o Lume pode pedir?', correta: 'maisbaixo', distratores: ['euquero', 'tchau'],
        modelo: 'Ele pode pedir: mais baixo, por favor.', elogio: 'Isso. Pedir funciona.' } },
    { img: 'festa-5', texto: 'Se precisar, o Lume mostra o cartão da pausa e descansa num cantinho calmo.',
      pergunta: { id: 'festa.q2', texto: 'O que o Lume usou para o som ficar mais baixo?', correta: 'f-silencio', distratores: ['bola', 'peixe'],
        modelo: 'Ele usou o fone.', elogio: 'Isso. O fone ajuda o Lume.' } },
    { img: 'festa-6', texto: 'Depois, o Lume volta para a festa e come bolo com os amigos. Foi uma festa boa.' },
  ] },
  medico: { titulo: 'O Lume vai ao médico', paginas: [
    { img: 'medico-1', texto: 'Às vezes o Lume vai ao médico. A Tuca vai junto.' },
    { img: 'medico-2', texto: 'Na sala de espera tem cadeiras e um brinquedo. Às vezes a espera é longa.',
      imprevisto: { id: 'medico.q3', texto: 'A doutora atrasou. O que o Lume pode fazer enquanto espera?', livre: true, cartas: ['f-onda', 'f-apertar', 'f-silencio'],
        modelo: 'Pode escolher qualquer um. Todos ajudam a esperar.', elogio: 'Boa ideia para esperar com calma.' } },
    { img: 'medico-3', texto: 'A doutora Baleia escuta o coração do Lume. O aparelho é gelado e não dói.',
      pergunta: { id: 'medico.q1', texto: 'Quem foi junto com o Lume?', correta: 'p-tuca', distratores: ['p-gigi', 'p-caco'],
        modelo: 'Foi a Tuca, a tartaruga.', elogio: 'Isso. A Tuca foi junto.' } },
    { img: 'medico-4', texto: 'A doutora olha a boca do Lume com uma luzinha. O Lume abre bem a boca.' },
    { img: 'medico-5', texto: 'Se o Lume ficar com medo, ele pode segurar a mão da Tuca e respirar com a onda.',
      pergunta: { id: 'medico.q2', texto: 'O que ajuda o Lume quando ele fica com medo?', correta: 'f-onda', distratores: ['bola', 'estrela'],
        modelo: 'Respirar com a onda ajuda.', elogio: 'Isso. Respirar com a onda acalma.' } },
    { img: 'medico-6', texto: 'No fim, o Lume ganha uma estrelinha e volta para casa.',
      pergunta: { id: 'medico.q4', texto: 'O que o Lume ganhou no fim?', correta: 'estrela', distratores: ['bola', 'peixe'],
        modelo: 'Ele ganhou uma estrelinha.', elogio: 'Isso. Uma estrelinha!' } },
  ] },
};

// fotos das Histórias Minhas ficam no aparelho (IndexedDB), nunca no armazenamento simples
const BANCO = {
  db: null,
  abrir() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('ilhaFarol', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('fotos');
      r.onsuccess = () => {
        this.db = r.result;
        this.db.onversionchange = () => { this.db.close(); this.db = null; };
        res(this.db);
      };
      r.onerror = () => rej(r.error);
    });
  },
  async guardar(chave, blob) {
    const db = await this.abrir();
    return new Promise((res, rej) => { const t = db.transaction('fotos', 'readwrite'); t.objectStore('fotos').put(blob, chave); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
  },
  async ler(chave) {
    try {
      const db = await this.abrir();
      return await new Promise(res => { const q = db.transaction('fotos').objectStore('fotos').get(chave); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
    } catch (e) { return null; }
  },
  async apagar(chave) {
    try { const db = await this.abrir(); db.transaction('fotos', 'readwrite').objectStore('fotos').delete(chave); } catch (e) { /* ok */ }
  },
};

function historiasAtivas() {
  const cfg = E.config.lugares.mercado, lista = [];
  for (const id of Object.keys(HISTORIAS)) if (cfg[id]) lista.push({ id, ...HISTORIAS[id] });
  for (const h of E.historiasMinhas) if (h.ativo && h.paginas.length) lista.push({ id: h.id, titulo: h.titulo, minha: true, paginas: h.paginas });
  return lista;
}
function jogarMercado(aoFim) {
  const lista = historiasAtivas();
  if (!lista.length) return aoFim();
  let feitas = 0;
  const proxima = () => {
    if (feitas >= E.config.lugares.mercado.tarefas || S.tempoAcabou) return aoFim();
    const h = lista[(E.mercadoIdx || 0) % lista.length];
    E.mercadoIdx = (E.mercadoIdx || 0) + 1; feitas++; salvar();
    lerHistoria(h, proxima);
  };
  proxima();
}
function defPergunta(q, paginaHtml, livre) {
  const a = E.config.alvos.historias;
  const cartas = q.livre ? q.cartas : embaralhar([q.correta, ...q.distratores.slice(0, a.nivel >= 2 ? 2 : 1)]);
  return { alvo: 'historias', nivel: a.nivel, fase: a.fase, livre: !!q.livre,
    cena: `<div class="cena livro-q"><div class="pagina pequena">${paginaHtml}</div></div>`,
    instrucao: fx(`hist.${q.id}`, q.texto),
    passos: [{ correta: q.livre ? null : q.correta, cartas, modelo: fx(`hist.${q.id}.modelo`, q.modelo) }],
    elogio: fx(`hist.${q.id}.elogio`, q.elogio) };
}
async function lerHistoria(h, aoFim) {
  const g0 = novaTela();
  S.retomar = () => lerHistoria(h, aoFim);
  const urls = [];
  if (h.minha) {
    telaCrianca({ classe: 'historia', palco: '<div class="livro"><div class="pagina fim"><span>Abrindo a história...</span></div></div>' });
    for (const p of h.paginas) { const blob = await BANCO.ler(p.foto); urls.push(blob ? URL.createObjectURL(blob) : ''); }
    // pausa ou fim da sessão enquanto as fotos carregavam: esta leitura já não vale
    if (!vivo(g0) || !S) { urls.forEach(u => u && URL.revokeObjectURL(u)); return; }
  }
  const perguntadas = new Set();
  let i = 0;
  const imgPagina = k => (h.minha ? (urls[k] ? `<img class="foto pagina-img" src="${urls[k]}" alt="">` : '') : foto(h.paginas[k].img, 'pagina-img'));
  const fim = () => { urls.forEach(u => u && URL.revokeObjectURL(u)); registrarEvento('mercado', 'historia', { historia: h.titulo }); ganharConchas(1); aoFim(); };
  const pagina = () => {
    const g = novaTela();
    S.retomar = pagina;
    if (i >= h.paginas.length) {
      telaCrianca({ classe: 'historia', palco: `<div class="livro"><div class="pagina fim"><b>Fim</b><span>${esc(h.titulo)}</span></div></div>`, opcoes: '<button class="botao" id="fimHist">Pronto</button>' });
      falar(fx('hist.fim', 'Fim da história.', 'narrador'));
      on('#fimHist', () => { if (vivo(g)) { pararFala(); fim(); } });
      return;
    }
    const p = h.paginas[i];
    telaCrianca({ classe: 'historia',
      palco: `<div class="livro"><div class="pagina">${imgPagina(i)}</div></div>`,
      opcoes: `<p class="texto-pagina">${esc(p.texto)}</p><div class="botoes"><button class="botao claro" id="voltarPag" ${i === 0 ? 'disabled' : ''}>Voltar</button><button class="botao" id="proxPag">Próxima</button></div>`,
    });
    falar(fx(h.minha ? `minha.${h.id}.${i}` : `hist.${h.id}.${i}`, p.texto, 'narrador'));
    on('#voltarPag', () => { if (i > 0) { pararFala(); i--; pagina(); } });
    on('#proxPag', () => {
      if (!vivo(g)) return;
      pararFala();
      const a = E.config.alvos.historias;
      // na linha de base, as perguntas param quando a sessão já teve as sondagens configuradas
      const cotaCheia = a.fase === 'linha-de-base' && E.tentativas.filter(t => t.sessao === S.id && t.alvo === 'historias').length >= a.sondagens;
      const q = !h.minha && a.ativo && !cotaCheia ? (p.pergunta || (a.nivel >= 3 ? p.imprevisto : null)) : null;
      const html = imgPagina(i);
      i++;
      if (q && !perguntadas.has(q.id)) { perguntadas.add(q.id); rodarTentativa(defPergunta(q, html), pagina); } else pagina();
    });
  };
  pagina();
}

/* ============================================================
   Enseada Calma: Bolota e a Caixa de Ferramentas
   ============================================================ */

const FERRAMENTAS = { onda: 'f-onda', apertar: 'f-apertar', pular: 'f-pular', silencio: 'f-silencio', cantinho: 'f-cantinho', ajuda: 'f-ajuda' };
const SITUACOES_BOLOTA = ['Tem barulho alto no mercado.', 'A fila está muito longa.', 'Mudaram a mesa de lugar.', 'O brinquedo quebrou.'];
const ferramentasLigadas = () => Object.entries(E.config.lugares.enseada.ferramentas).filter(([, v]) => v).map(([k]) => FERRAMENTAS[k]);
const cenaBolota = inchado => `<div class="cena"><div class="lado-lume" id="ladoLume">${A.lume({ humor: 'calmo' })}</div>
  <div class="lado-morador"><div class="morador-lugar bolota" id="morador">${foto(inchado ? 'bolota-inchado' : 'bolota', 'morador', 'Bolota')}</div></div></div>`;

function jogarEnseada(aoFim) {
  const cfg = E.config.lugares.enseada;
  if (!ferramentasLigadas().length) return aoFim();
  let rodada = 0;
  const proxima = () => {
    if (rodada >= cfg.tarefas || S.tempoAcabou) return aoFim();
    rodada++;
    if (cfg.nivel === 1) bolotaInchado('A Gigi gritou perto de mim. Estou fervendo!', proxima);
    else if (cfg.nivel === 2) situacaoBolota(proxima);
    else planoSeEntao(proxima);
  };
  proxima();
}
function escolherFerramenta(cena, falaInicial, aoEscolher) {
  const g = novaTela();
  S.retomar = () => escolherFerramenta(cena, falaInicial, aoEscolher);
  telaCrianca({ palco: cena, opcoes: `<div class="cartas pequenas" id="cartas">${ferramentasLigadas().map(cartaHTML).join('')}</div>` });
  falar(falaInicial);
  $$('#cartas .carta').forEach(b => b.addEventListener('click', () => { if (vivo(g)) { pararFala(); SOM.toque(); aoEscolher(b.dataset.id); } }));
}
function bolotaInchado(texto, fim) {
  const g0 = novaTela();
  S.retomar = () => bolotaInchado(texto, fim);
  telaCrianca({ palco: cenaBolota(true), opcoes: '' });
  falar(fx(`bol.${texto}`, texto, 'bolota')).then(() => {
    if (!vivo(g0)) return;
    escolherFerramenta(cenaBolota(true), fx('bol.ajudar', 'Vamos ajudar o Bolota? Escolha uma ferramenta.'), f => {
      rodarFerramenta(f, () => {
        const g = novaTela();
        telaCrianca({ palco: cenaBolota(false), opcoes: '' });
        ganharConchas(1);
        const seguir = seguirDepois(() => perguntarAjudou(f, fim));
        falar(fx('bol.melhor', 'Agora estou melhor. Obrigado!', 'bolota')).then(() => vivo(g) && seguir());
      });
    });
  });
}
function perguntarAjudou(f, fim) {
  const g = novaTela();
  S.retomar = () => perguntarAjudou(f, fim);
  telaCrianca({ palco: `<div class="cena"><div class="rosto-grande">${A.carta(f)}</div></div>`,
    opcoes: `<div class="botoes"><button class="botao" id="sim">Ajudou</button><button class="botao claro" id="nao">Não ajudou</button></div>` });
  falar(fx('bol.ajudou', `Essa ferramenta ajudou?`));
  let respondido = false;
  const responder = ajudou => {
    if (!vivo(g) || respondido) return;
    respondido = true;
    pararFala();
    const c = E.caixaCalma[f] || (E.caixaCalma[f] = { sim: 0, nao: 0 });
    c[ajudou ? 'sim' : 'nao']++;
    registrarEvento('enseada', 'ferramenta', { ferramenta: CARTOES[f].rotulo, ajudou });
    const seguir = seguirDepois(fim);
    falar(fx('bol.contar', 'Obrigado por me contar.')).then(() => vivo(g) && seguir());
  };
  on('#sim', () => responder(true));
  on('#nao', () => responder(false));
}
function situacaoBolota(fim) {
  const g = novaTela();
  S.retomar = () => situacaoBolota(fim);
  const texto = sortear(SITUACOES_BOLOTA);
  telaCrianca({ palco: cenaBolota(false),
    opcoes: `<div class="termometro">${TERMO.map(t => `<button class="nivel" data-n="${t.n}" style="--c:${t.cor}"><span class="bolinha"></span><b>${t.n}</b><span>${t.rotulo}</span></button>`).join('')}</div>` });
  let respondido = false;
  falar(fx(`bol.sit.${texto}`, texto, 'narrador')).then(() => vivo(g) && !respondido && falar(fx('bol.quanto', 'Quanto isso incomoda o Bolota? Toca no termômetro.')));
  $$('.nivel').forEach(b => b.addEventListener('click', () => {
    if (!vivo(g) || respondido) return;
    respondido = true;
    pararFala(); SOM.toque();
    const n = +b.dataset.n;
    registrarEvento('enseada', 'situacao', { situacao: texto, nivel: n });
    if (n >= 3) bolotaInchado(`${texto} Estou ficando no ${n}.`, fim);
    else { const seguir = seguirDepois(fim); falar(fx('bol.tranquilo', 'O Bolota está tranquilo. Que bom.')).then(() => vivo(g) && seguir()); }
  }));
}
function planoSeEntao(fim) {
  escolherFerramenta(cenaBolota(false), fx('bol.plano', 'Vamos fazer um plano. Se o Bolota ficar no 4, o que ele vai fazer?'), f => {
    E.planoCalma = f;
    registrarEvento('enseada', 'plano', { ferramenta: CARTOES[f].rotulo });
    const g = novaTela();
    telaCrianca({ palco: `<div class="cena"><div class="rosto-grande">${A.carta(f)}</div></div>`, opcoes: '' });
    const seguir = seguirDepois(() => rodarFerramenta(f, fim));
    falar(fx(`bol.planopronto.${f}`, `Plano pronto: se ficar no 4, ${CARTOES[f].rotulo}. Vamos treinar agora?`)).then(() => vivo(g) && seguir());
  });
}

// cada ferramenta tem um jeito calmo de acontecer na tela
function rodarFerramenta(f, fim) {
  if (f === 'f-onda') return telaOnda(fim, { ciclos: 2 });
  const g = novaTela();
  S.retomar = () => rodarFerramenta(f, fim);
  let acabou = false;
  const concluir = comFala => {
    if (!vivo(g) || acabou) return;
    acabou = true;
    const seguir = seguirDepois(fim);
    if (comFala) falar(fx('fer.feito', 'Muito bem.')).then(() => vivo(g) && seguir()); else seguir();
  };
  const pronto = (sel, atraso = 0) => depois(atraso, () => { const b = $(sel); if (b) b.hidden = false; });
  if (f === 'f-apertar') {
    let feitas = 0;
    telaCrianca({ palco: `<div class="cena"><div class="rosto-grande">${A.carta('f-apertar')}</div></div>`,
      opcoes: `<p class="contador" id="cont">0 de 3</p><button class="botao grande segurar" id="apertar"><span class="enche"></span>Aperte e segure</button>` });
    falar(fx('fer.apertar', 'Aperte o botão e segure, como se fosse uma massinha. Três vezes.'));
    const b = $('#apertar');
    let t = null;
    const soltar = () => { clearTimeout(t); b.classList.remove('segurando'); };
    b.addEventListener('pointerdown', () => {
      b.classList.add('segurando');
      t = setTimeout(() => {
        if (!vivo(g) || acabou) return;
        soltar(); feitas++; SOM.toque(); $('#cont').textContent = `${feitas} de 3`;
        if (feitas >= 3) concluir(true);
      }, 2000);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, soltar));
    b.addEventListener('contextmenu', e => e.preventDefault());
    return;
  }
  if (f === 'f-pular') {
    let pulos = 0;
    telaCrianca({ palco: `<div class="cena"><div class="lado-lume pulando" id="ladoLume">${A.lume({ humor: 'feliz', acenando: true })}</div></div>`,
      opcoes: `<p class="contador" id="cont">0 de 5</p><button class="botao grande" id="pulei">Pulei!</button>` });
    falar(fx('fer.pular', 'Vamos pular junto com o Lume! Toque a cada pulo. Cinco pulos.'));
    on('#pulei', () => {
      if (!vivo(g) || acabou) return;
      pulos++; SOM.toque(); $('#cont').textContent = `${pulos} de 5`;
      if (pulos >= 5) concluir(true);
    });
    return;
  }
  if (f === 'f-silencio') {
    telaCrianca({ classe: 'silencio', palco: `<div class="cena"><div class="rosto-grande">${A.carta('f-silencio')}</div></div>`,
      opcoes: `<p class="contador">Silêncio... bem quietinho.</p><button class="botao claro" id="pronto" hidden>Pronto</button>` });
    falar(fx('fer.silencio', 'Silêncio. Vamos ficar bem quietinhos um pouco.'));
    pronto('#pronto', 8000);
    on('#pronto', () => concluir(false));
    return;
  }
  const textos = {
    'f-cantinho': fx('fer.cantinho', 'Vá até o seu cantinho calmo. Eu espero aqui.'),
    'f-ajuda': fx('fer.ajuda', 'Chame um adulto. Pedir ajuda funciona.'),
  };
  telaCrianca({ palco: `<div class="cena"><div class="rosto-grande">${A.carta(f)}</div></div>`,
    opcoes: `<button class="botao" id="voltei" hidden>${f === 'f-ajuda' ? 'Um adulto veio' : 'Voltei'}</button>` });
  falar(textos[f] || fx('fer.feito', 'Muito bem.'));
  pronto('#voltei', 4000);
  on('#voltei', () => concluir(false));
}

/* ============================================================
   Clareira do Encontro: o barco feito a dois
   ============================================================ */

const PECAS_BARCO = ['barco-casco', 'barco-mastro', 'barco-vela', 'barco-bandeira', 'barco-janela', 'barco-boia'];
const DICAS_CLAREIRA = {
  1: 'Dica para o adulto: espere a sua vez e a da criança. Comente em frases curtas ("a vela!").',
  2: 'Dica para o adulto: antes de colocar a peça, aponte para onde ela vai e olhe para a criança. Espere ela olhar também.',
  3: 'Dica para o adulto: brinque de faz de conta. No fim, deixe a criança inventar para onde o barco vai.',
};
function jogarClareira(aoFim) {
  const cfg = E.config.lugares.clareira;
  const pecas = PECAS_BARCO.slice(0, clamp(cfg.pecas, 4, 6));
  const st = { colocadas: [], vez: 'crianca', turnos: 0, ini: { apontou: 0, mostrou: 0, pediu: 0 } };
  const tela = () => {
    const g = novaTela();
    S.retomar = tela;
    const restantes = pecas.filter(p => !st.colocadas.includes(p));
    if (!restantes.length) return terminarBarco();
    const doTurno = p => (pecas.indexOf(p) % 2 === 0) === (st.vez === 'crianca');
    let minhas = st.colocadas.length === 0 ? ['barco-casco'] : restantes.filter(doTurno);
    if (!minhas.length) { st.vez = st.vez === 'crianca' ? 'adulto' : 'crianca'; minhas = restantes.filter(doTurno); }
    telaCrianca({ classe: 'clareira',
      palco: `<div class="barco">${st.colocadas.map(p => `<div class="peca-barco ${p}">${foto(p)}</div>`).join('')}</div>`,
      opcoes: `<p class="vez ${st.vez}">${st.vez === 'crianca' ? 'Sua vez' : 'Vez do adulto'}</p>
        <div class="cartas pequenas" id="cartas">${minhas.map(p => `<button class="carta" data-p="${p}" style="--cat:${st.vez === 'crianca' ? COR.teal : COR.ambar}">${foto(p)}<span>${p.replace('barco-', '')}</span></button>`).join('')}</div>
        <div class="faixa-adulto"><span>${DICAS_CLAREIRA[cfg.nivel]}</span>
          <div class="linha-botoes">${['apontou', 'mostrou', 'pediu'].map(k => `<button class="botao-p" data-ini="${k}">Ela ${k} (${st.ini[k]})</button>`).join('')}</div></div>` });
    falar(st.vez === 'crianca' ? fx('cla.suavez', 'Sua vez! Escolha uma peça para o barco.') : fx('cla.vezadulto', 'Agora é a vez do adulto.'));
    $$('#cartas .carta').forEach(b => b.addEventListener('click', () => {
      if (!vivo(g)) return;
      pararFala(); SOM.toque();
      st.colocadas.push(b.dataset.p); st.turnos++;
      st.vez = st.vez === 'crianca' ? 'adulto' : 'crianca';
      tela();
    }));
    $$('[data-ini]').forEach(b => b.addEventListener('click', () => { st.ini[b.dataset.ini]++; b.textContent = `Ela ${b.dataset.ini} (${st.ini[b.dataset.ini]})`; }));
  };
  const terminarBarco = () => {
    const g = novaTela();
    const registrar = destino => {
      registrarEvento('clareira', 'barco', { turnos: st.turnos, apontou: st.ini.apontou, mostrou: st.ini.mostrou, pediu: st.ini.pediu, destino: destino || '' });
      ganharConchas(2);
    };
    telaCrianca({ classe: 'clareira', palco: `<div class="barco pronto">${st.colocadas.map(p => `<div class="peca-barco ${p}">${foto(p)}</div>`).join('')}</div>`, opcoes: '' });
    falar(fx('cla.pronto', 'O barco ficou pronto! Vocês fizeram juntos.')).then(() => {
      if (!vivo(g)) return;
      if (E.config.lugares.clareira.nivel < 3) { registrar(); aoFim(); return; }
      $('#opcoes').innerHTML = `<div class="cartas pequenas" id="cartas">${['l-praia', 'l-farol', 'l-mirante'].map(cartaHTML).join('')}</div>`;
      falar(fx('cla.destino', 'Para onde o barco vai?'));
      let escolhido = false;
      $$('#cartas .carta').forEach(b => b.addEventListener('click', () => {
        if (!vivo(g) || escolhido) return;
        escolhido = true;
        pararFala();
        const d = CARTOES[b.dataset.id].rotulo;
        registrar(d);
        const seguir = seguirDepois(aoFim);
        falar(fx(`cla.foi.${b.dataset.id}`, `O barco foi até ${d}! Que viagem boa.`)).then(() => vivo(g) && seguir());
      }));
    });
  };
  tela();
}

/* ============================================================
   Mirante dos Tesouros: o museu e o Mostra e conta
   ============================================================ */

const PERGUNTAS_TEMA = {
  trem: 'Uau! Para onde esse trem vai?', dinossauro: 'Esse dinossauro come o quê?', planeta: 'O que tem nesse planeta?',
  carro: 'Esse carro é rápido ou devagar?', peixe: 'Onde essa baleia mora?',
};
function jogarMirante(aoFim) {
  const g = novaTela();
  S.retomar = () => jogarMirante(aoFim);
  const tema = E.config.crianca.interesse;
  const pecas = Math.max(1, Math.min(12, Math.floor(E.conchasTotal / CONCHAS_POR_PECA)));
  telaCrianca({
    palco: `<div class="museu-grande"><b>Museu de ${esc(TEMAS[tema].nome)}</b><div class="prateleira">${Array.from({ length: pecas }, (_, i) => `<button class="peca-museu" data-i="${i}">${A.tema(tema)}</button>`).join('')}</div></div>`,
    opcoes: '<p class="texto-pagina">Escolha um tesouro para mostrar.</p>',
  });
  falar(fx(`mir.inicio.${tema}`, `Este é o seu museu de ${TEMAS[tema].nome}. Escolha um tesouro para me mostrar.`));
  let respondido = false;
  $$('.peca-museu').forEach(b => b.addEventListener('click', () => {
    if (!vivo(g) || respondido) return;
    pararFala(); SOM.toque();
    $$('.peca-museu').forEach(x => x.classList.toggle('escolhida', x === b));
    $('#opcoes').innerHTML = `<p class="texto-pagina">${esc(PERGUNTAS_TEMA[tema])}</p>
      <div class="faixa-adulto"><span>Para o adulto: como ela respondeu?</span><div class="linha-botoes">
      <button class="botao-p cheio" data-r="contou">Contou</button><button class="botao-p" data-r="mostrou">Mostrou sem falar</button><button class="botao-p" data-r="ainda">Ainda não</button></div></div>`;
    falar(fx(`mir.pergunta.${tema}`, PERGUNTAS_TEMA[tema]));
    $$('[data-r]').forEach(r => r.addEventListener('click', () => {
      if (!vivo(g) || respondido) return;
      respondido = true;
      pararFala();
      registrarEvento('mirante', 'mostraconta', { resposta: { contou: 'contou', mostrou: 'mostrou sem falar', ainda: 'ainda não' }[r.dataset.r] });
      ganharConchas(1);
      const seguir = seguirDepois(aoFim);
      falar(fx('mir.obrigado', 'Obrigado por me mostrar o seu tesouro!')).then(() => vivo(g) && seguir());
    }));
  }));
}

/* ============================================================
   Área do adulto: aba Lugares, atividades e Histórias Minhas
   ============================================================ */

function abaLugares(p) {
  const opcoesLugar = [['', '(nenhum)'], ...Object.entries(LUGARES).map(([k, l]) => [k, l.nome])];
  const plano = E.config.sessao.plano || [];
  const sel = i => `<select id="plano-${i}" data-plano="${i}">${opcoesLugar.map(([v, t]) => `<option value="${v}" ${plano[i] === v || (!plano[i] && !v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  const extra = {
    enseada: () => campo({ caminho: 'lugares.enseada.nivel', rotulo: 'Nível', tipo: 'select', opcoes: [[1, '1: ajudar o Bolota'], [2, '2: situação e termômetro'], [3, '3: plano "se... então"']] })
      + Object.keys(FERRAMENTAS).map(k => campo({ caminho: `lugares.enseada.ferramentas.${k}`, rotulo: `Ferramenta: ${CARTOES[FERRAMENTAS[k]].rotulo}`, tipo: 'toggle' })).join(''),
    praia: () => campo({ caminho: 'lugares.praia.meujeito', rotulo: 'Dicionário do Meu Jeito no fim', tipo: 'toggle', ajuda: 'A criança conta como ela mostra cada sentimento. Aparece na aba Dados.' }),
    oficina: () => campo({ caminho: 'lugares.oficina.encadeamento', rotulo: 'Encadeamento', tipo: 'select', opcoes: [['tras', 'De trás para frente (a criança faz o fim)'], ['frente', 'Para frente (a criança faz o começo)'], ['total', 'Tarefa inteira']],
      ajuda: 'O nível do alvo define quantos passos a criança faz.' }),
    mercado: () => campo({ caminho: 'lugares.mercado.festa', rotulo: 'História: A festa da Gigi', tipo: 'toggle' }) + campo({ caminho: 'lugares.mercado.medico', rotulo: 'História: O Lume vai ao médico', tipo: 'toggle' })
      + `<div class="bloco-interno"><h4>Histórias Minhas</h4><p class="ajuda">Histórias com fotos reais do lugar (a fachada do dentista, a cadeira, a sala de espera). As fotos ficam só neste aparelho.</p>
        ${E.historiasMinhas.map(h => `<div class="linha-historia"><label class="interruptor"><input type="checkbox" data-hm="${h.id}" ${h.ativo ? 'checked' : ''}><span></span></label><b>${esc(h.titulo)}</b><span class="ajuda">${h.paginas.length} páginas</span><button class="botao-p" data-editar="${h.id}">Editar</button></div>`).join('') || '<p class="vazio">Nenhuma ainda.</p>'}
        <div class="linha-botoes"><button class="botao-p cheio" id="novaHistoria">Criar história com fotos</button></div></div>`,
    clareira: () => campo({ caminho: 'lugares.clareira.nivel', rotulo: 'Nível', tipo: 'select', opcoes: [[1, '1: revezar a vez'], [2, '2: apontar e seguir o apontar'], [3, '3: faz de conta no fim']] })
      + campo({ caminho: 'lugares.clareira.pecas', rotulo: 'Peças do barco', tipo: 'range', min: 4, max: 6 }),
  };
  const rotuloTarefas = { farol: 'Tarefas por sessão', enseada: 'Rodadas por sessão', vila: 'Tarefas por sessão', praia: 'Tarefas por sessão', oficina: 'Tarefas por sessão', mercado: 'Histórias por sessão' };
  p.innerHTML = `<h2>Lugares da ilha</h2>
    <div class="bloco"><h3>Como é a sessão</h3>
      ${campo({ caminho: 'sessao.escolha', rotulo: 'A criança escolhe no mapa', tipo: 'toggle', ajuda: 'Ligado: depois do "como estou", a criança escolhe um dos lugares abertos. Desligado: vale o plano abaixo.' })}
      <div class="campo"><label for="plano-0">Plano da sessão</label><div class="controle">${sel(0)} ${sel(1)} ${sel(2)}</div><p class="ajuda">Até três lugares, nesta ordem. Só vale quando a escolha da criança está desligada.</p></div>
    </div>
    ${Object.entries(LUGARES).map(([k, l]) => `<div class="bloco"><div class="cabeca-lugar">${A.lugar(k)}<div><h3>${l.nome}</h3><span class="ajuda">${l.habilidade}</span></div></div>
      ${campo({ caminho: `lugares.${k}.aberto`, rotulo: 'Aberto', tipo: 'toggle' })}
      ${E.config.lugares[k].aberto && !lugarTemConteudo(k) ? `<p class="aviso-lugar">Aberto, mas sem nada ligado: não aparece no mapa. ${k === 'mercado' ? 'Ligue uma história.' : k === 'enseada' ? 'Ligue uma ferramenta.' : 'Ligue um alvo na aba Alvos.'}</p>` : ''}
      ${rotuloTarefas[k] ? campo({ caminho: `lugares.${k}.tarefas`, rotulo: rotuloTarefas[k], tipo: 'range', min: 1, max: k === 'mercado' ? 3 : 12 }) : ''}
      ${extra[k] ? extra[k]() : ''}</div>`).join('')}`;
  ligarCampos(p);
  $$('[data-plano]', p).forEach(s => s.addEventListener('change', () => {
    const novo = [0, 1, 2].map(i => $(`#plano-${i}`).value).filter(Boolean);
    const nomes = l => l.map(x => LUGARES[x].nome).join(', ') || '(vazio)';
    alterarConfig(`Plano da sessão: ${nomes(E.config.sessao.plano || [])} → ${nomes(novo)}`, c => { c.sessao.plano = novo; });
    aviso('Salvo');
  }));
  $$('[data-hm]', p).forEach(c => c.addEventListener('change', () => {
    const h = E.historiasMinhas.find(x => x.id === c.dataset.hm);
    if (h) { h.ativo = c.checked; alterarConfig(`História Minha "${h.titulo}": ${c.checked ? 'ligada' : 'desligada'}`, () => {}); aviso('Salvo'); }
  }));
  $$('[data-editar]', p).forEach(b => b.addEventListener('click', () => editorHistoria(p, E.historiasMinhas.find(x => x.id === b.dataset.editar))));
  on('#novaHistoria', () => editorHistoria(p, null));
}

async function reduzirFoto(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const escala = Math.min(1, 1100 / Math.max(im.width, im.height));
    const c = document.createElement('canvas');
    c.width = Math.round(im.width * escala); c.height = Math.round(im.height * escala);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}
async function editorHistoria(p, existente) {
  const h = existente ? JSON.parse(JSON.stringify(existente)) : { id: novoId(), titulo: '', ativo: true, paginas: [] };
  const previas = {};
  for (const pg of h.paginas) { const b = await BANCO.ler(pg.foto); if (b) previas[pg.foto] = URL.createObjectURL(b); }
  // fotos que já estavam salvas e fotos novas desta edição: o que sobrar sem página sai do aparelho
  const originais = new Set(h.paginas.map(pg => pg.foto).filter(Boolean));
  const novas = new Set();
  const soltarPrevias = () => Object.values(previas).forEach(u => URL.revokeObjectURL(u));
  const desenhar = () => {
    p.innerHTML = `<h2>${existente ? 'Editar' : 'Nova'} história com fotos</h2>
      <div class="bloco"><div class="campo"><label for="hmTitulo">Título</label><div class="controle"><input type="text" id="hmTitulo" maxlength="40" value="${esc(h.titulo)}"></div></div>
        <p class="ajuda">Regra de Carol Gray: mais frases que descrevem do que frases que mandam, na primeira pessoa, e nenhuma promessa sobre o que não se controla ("às vezes a espera é longa").</p></div>
      ${h.paginas.map((pg, i) => `<div class="bloco pagina-editor"><h3>Página ${i + 1}</h3>
        <div class="previa">${previas[pg.foto] ? `<img src="${previas[pg.foto]}" alt="">` : '<span class="vazio">sem foto</span>'}</div>
        <label class="botao-p" for="hmFoto${i}" style="display:inline-flex;align-items:center">Escolher foto</label><input type="file" id="hmFoto${i}" data-foto="${i}" accept="image/*" hidden>
        <label for="hmTexto${i}"><b>Texto da página</b></label><textarea id="hmTexto${i}" data-texto="${i}" maxlength="200">${esc(pg.texto)}</textarea>
        <div class="linha-botoes"><button class="botao-p perigo" data-remover="${i}">Remover página</button></div></div>`).join('')}
      <div class="linha-botoes">${h.paginas.length < 10 ? '<button class="botao-p" id="hmMais">Adicionar página</button>' : ''}
        <button class="botao-p cheio" id="hmSalvar">Salvar história</button><button class="botao-p" id="hmCancelar">Cancelar</button>
        ${existente ? '<button class="botao-p perigo" id="hmApagar">Apagar história</button>' : ''}</div>`;
    on('#hmTitulo', e => { h.titulo = e.target.value; }, 'input');
    $$('[data-texto]', p).forEach(t => t.addEventListener('input', () => { h.paginas[+t.dataset.texto].texto = t.value; }));
    $$('[data-foto]', p).forEach(inp => inp.addEventListener('change', async () => {
      const arq = inp.files && inp.files[0];
      const pg = h.paginas[+inp.dataset.foto];
      if (!arq || !pg) return;
      let blob;
      try { blob = await reduzirFoto(arq); } catch (e) { aviso('Não deu para abrir essa foto'); return; }
      const chave = 'foto-' + novoId();
      await BANCO.guardar(chave, blob);
      // a página pode ter sido removida enquanto a foto era preparada
      if (!h.paginas.includes(pg)) { BANCO.apagar(chave); return; }
      if (pg.foto && novas.has(pg.foto)) { BANCO.apagar(pg.foto); novas.delete(pg.foto); }
      novas.add(chave);
      pg.foto = chave; previas[chave] = URL.createObjectURL(blob);
      desenhar();
    }));
    $$('[data-remover]', p).forEach(b => b.addEventListener('click', () => { h.paginas.splice(+b.dataset.remover, 1); desenhar(); }));
    on('#hmMais', () => { h.paginas.push({ foto: null, texto: '' }); desenhar(); });
    on('#hmCancelar', () => { for (const k of novas) BANCO.apagar(k); soltarPrevias(); telaAdulto('lugares'); });
    on('#hmApagar', async () => {
      for (const k of [...originais, ...novas]) await BANCO.apagar(k);
      soltarPrevias();
      E.historiasMinhas = E.historiasMinhas.filter(x => x.id !== h.id);
      alterarConfig(`História Minha apagada: "${existente.titulo}"`, () => {});
      telaAdulto('lugares');
    });
    on('#hmSalvar', () => {
      h.titulo = h.titulo.trim() || 'Minha história';
      h.paginas = h.paginas.filter(pg => pg.foto || pg.texto.trim());
      if (!h.paginas.length) { aviso('Coloque pelo menos uma página'); return; }
      const emUso = new Set(h.paginas.map(pg => pg.foto).filter(Boolean));
      for (const k of [...originais, ...novas]) if (!emUso.has(k)) BANCO.apagar(k);
      soltarPrevias();
      const i = E.historiasMinhas.findIndex(x => x.id === h.id);
      if (i >= 0) E.historiasMinhas[i] = h; else E.historiasMinhas.push(h);
      alterarConfig(`História Minha salva: "${h.titulo}" (${h.paginas.length} páginas)`, () => {});
      aviso('História salva');
      telaAdulto('lugares');
    });
  };
  if (!h.paginas.length) h.paginas.push({ foto: null, texto: '' });
  desenhar();
}

function blocoAtividades() {
  const ev = E.eventos;
  const conta = (lista, chave) => lista.reduce((a, x) => { a[x[chave]] = (a[x[chave]] || 0) + 1; return a; }, {});
  const tabela = (cab, linhas) => (linhas.length ? `<div class="tabela"><table><thead><tr>${cab.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Ainda sem registros.</p>');
  const calma = Object.entries(E.caixaCalma).map(([f, c]) => [CARTOES[f].rotulo, c.sim + c.nao, c.sim, c.nao]);
  const jeito = Object.keys(EMOCOES).filter(e => E.meuJeito[e]).map(e => [EMOCOES[e].adj, (E.meuJeito[e] || []).map(id => CARTOES[id].rotulo).join(', ') || '(nenhum marcado)']);
  const barcos = ev.filter(x => x.tipo === 'barco');
  const mostra = conta(ev.filter(x => x.tipo === 'mostraconta'), 'resposta');
  const hist = conta(ev.filter(x => x.tipo === 'historia'), 'historia');
  const escolhas = conta(ev.filter(x => x.tipo === 'escolha'), 'lugar');
  const soma = k => barcos.reduce((a, b) => a + (b[k] || 0), 0);
  return `<div class="bloco"><h3>Enseada Calma: Caixa de Calma</h3>${tabela(['Ferramenta', 'Vezes', 'Ajudou', 'Não ajudou'], calma)}
      <p class="resumo">Plano "se ficar no 4": ${E.planoCalma ? esc(CARTOES[E.planoCalma].rotulo) : 'ainda não feito'}.</p></div>
    <div class="bloco"><h3>Praia das Caras: Dicionário do Meu Jeito</h3>${tabela(['Quando fica', 'O que a criança faz'], jeito)}</div>
    <div class="bloco"><h3>Clareira do Encontro</h3>${barcos.length ? `<p>${barcos.length} barco${barcos.length > 1 ? 's' : ''} feitos a dois, ${soma('turnos')} vezes revezadas. Iniciativas da criança marcadas pelo adulto: apontou ${soma('apontou')}, mostrou ${soma('mostrou')}, pediu ${soma('pediu')}.</p>` : '<p class="vazio">Ainda sem registros.</p>'}</div>
    <div class="bloco"><h3>Mirante dos Tesouros: Mostra e conta</h3>${tabela(['Resposta', 'Vezes'], Object.entries(mostra))}</div>
    <div class="bloco"><h3>Mercado das Histórias: histórias lidas</h3>${tabela(['História', 'Vezes'], Object.entries(hist))}</div>
    <div class="bloco"><h3>Mapa: lugares que a criança escolheu</h3>${tabela(['Lugar', 'Vezes'], Object.entries(escolhas).map(([l, n]) => [LUGARES[l] ? LUGARES[l].nome : l, n]))}</div>`;
}
function exportarEventos() {
  const nSessao = new Map(E.sessoes.map((s, i) => [s.id, i + 1]));
  const fora = new Set(['sessao', 'ts', 'lugar', 'tipo']);
  baixar(`ilha-do-farol-atividades-${hojeChave()}.csv`, csv([
    ['sessao', 'data_hora', 'lugar', 'atividade', 'detalhes'],
    ...E.eventos.map(x => [nSessao.get(x.sessao) || '', fmtData(x.ts), LUGARES[x.lugar] ? LUGARES[x.lugar].nome : x.lugar, x.tipo,
      Object.entries(x).filter(([k]) => !fora.has(k)).map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'sim' : 'não') : v}`).join('; ')]),
  ]), 'text/csv;charset=utf-8');
}

/* falas fixas dos lugares, para o roteiro de gravação */
function falasDosLugares() {
  const L = [fx('mapa.pergunta', 'Para onde vamos hoje? Escolha um lugar da ilha.'), fx('rot.instrucao', 'A Fifi quer montar o dia dela. O que vem primeiro?'),
    fx('rot.fifi', 'Obrigada! Agora eu sei o que vem.', 'fifi'), fx('rot.elogio', 'Você montou o dia inteiro, na ordem certa!'),
    fx('sur.modelo', 'Pode escolher qualquer um. Todos são bons.'), fx('sur.elogio', 'Boa escolha. A mudança chegou e a gente achou outro jeito.'),
    fx('jeito.obrigado', 'Obrigado! Agora eu conheço o seu jeito.'), fx('hist.fim', 'Fim da história.', 'narrador'),
    fx('bol.ajudar', 'Vamos ajudar o Bolota? Escolha uma ferramenta.'), fx('bol.melhor', 'Agora estou melhor. Obrigado!', 'bolota'),
    fx('bol.contar', 'Obrigado por me contar.'), fx('cla.suavez', 'Sua vez! Escolha uma peça para o barco.'), fx('cla.vezadulto', 'Agora é a vez do adulto.'),
    fx('cla.pronto', 'O barco ficou pronto! Vocês fizeram juntos.'), fx('mir.obrigado', 'Obrigado por me mostrar o seu tesouro!')];
  for (const s of SURPRESAS) L.push(fx(`sur.${s.sai}`, `Ih! Mudança. ${s.motivo} O que a gente faz no lugar?`));
  for (const [e, x] of Object.entries(EMOCOES)) { L.push(fx(`emo.modelo.${e}`, x.modelo)); L.push(fx(`jeito.${e}`, `Quando você fica ${x.adj}, o que você faz? Pode escolher mais de um.`)); }
  SITUACOES.forEach((s, i) => L.push(fx(`emo.sit.${i}`, s.texto, 'narrador')));
  for (const [id, h] of Object.entries(HISTORIAS)) h.paginas.forEach((pg, i) => L.push(fx(`hist.${id}.${i}`, pg.texto, 'narrador')));
  for (const t of Object.values(PERGUNTAS_TEMA)) L.push(fx(`mir.pergunta.${t}`, t));
  return L;
}
