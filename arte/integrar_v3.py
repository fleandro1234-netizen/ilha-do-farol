"""Liga os oito lugares (lugares.js) ao motor do jogo (app.js). Cada troca confere que o trecho existe uma vez só."""
import io
from pathlib import Path

JOGO = Path(__file__).resolve().parent.parent / "docs" / "jogo"


def trocar(arquivo, pares):
    p = JOGO / arquivo
    s = io.open(p, encoding="utf-8").read()
    for a, b in pares:
        n = s.count(a)
        assert n == 1, f"{arquivo}: esperava 1 ocorrência, achei {n}: {a[:70]!r}"
        s = s.replace(a, b)
    io.open(p, "w", encoding="utf-8", newline="\n").write(s)
    print(f"{arquivo}: {len(pares)} trocas")


trocar("app.js", [
    ("const VERSAO = '0.2.0';", "const VERSAO = '0.3.0';"),
    # configuração: todos os alvos e todos os lugares
    ("""    alvos: {
      querer1: { ativo: true, nivel: 1, fase: 'ensino', sondagens: 3 },
      querer2: { ativo: false, nivel: 1, fase: 'ensino', sondagens: 3 },
      ajuda: { ativo: true, nivel: 1, fase: 'ensino', sondagens: 3 },
      ajuste: { ativo: false, nivel: 1, fase: 'ensino', sondagens: 3 },
      recusar: { ativo: false, nivel: 1, fase: 'ensino', sondagens: 3 },
    },""",
     """    alvos: Object.fromEntries(Object.keys(ALVOS).map(k => [k, { ativo: ALVOS_ATIVOS_PADRAO.includes(k), nivel: 1, fase: 'ensino', sondagens: 3 }])),
    lugares: Object.fromEntries(Object.entries(LUGARES).map(([k, l]) => [k, JSON.parse(JSON.stringify(l.padrao))])),"""),
    ("    sessao: { aquecimento: true, tesouro: true, maxMin: 12, limiteDiarioMin: 20 },",
     "    sessao: { aquecimento: true, tesouro: true, maxMin: 12, limiteDiarioMin: 20, escolha: true, plano: ['farol', 'vila'] },"),
    ("    abc: [], sugestoes: [], uso: {}, preferencia: null,",
     "    abc: [], sugestoes: [], uso: {}, preferencia: null,\n    eventos: [], meuJeito: {}, meuJeitoIdx: 0, planoCalma: null, caixaCalma: {}, historiasMinhas: [], mercadoIdx: 0,"),
    # etapas: fixas ou lugares
    ("  chegada: etapas => fx('chegada.' + etapas.join('-'), 'Hoje a gente vai ' + listaHumana(etapas.map(e => ETAPAS[e].fala)) + '.'),",
     "  chegada: etapas => fx('chegada.' + etapas.join('-'), 'Hoje a gente vai ' + listaHumana(etapas.map(e => etapaInfo(e).fala)) + '.'),"),
    ("    `<li class=\"${i < S.etapa ? 'feito' : i === S.etapa ? 'atual' : ''}\" title=\"${ETAPAS[e].rotulo}\">${ETAPAS[e].icone()}</li>`).join('')}</ol>`;",
     "    `<li class=\"${i < S.etapa ? 'feito' : i === S.etapa ? 'atual' : ''}\" title=\"${etapaInfo(e).rotulo}\">${etapaInfo(e).icone()}</li>`).join('')}</ol>`;"),
    ("    palco: `<div class=\"chegada\"><div class=\"agenda-grande\">${S.etapas.map(e => `<div>${ETAPAS[e].icone()}<span>${ETAPAS[e].rotulo}</span></div>`).join('')}</div>",
     "    palco: `<div class=\"chegada\"><div class=\"agenda-grande\">${S.etapas.map(e => `<div>${etapaInfo(e).icone()}<span>${etapaInfo(e).rotulo}</span></div>`).join('')}</div>"),
    ("  etapas.push('vila');\n  if (E.config.sessao.tesouro) etapas.push('tesouro');",
     "  etapas.push(...lugaresDaSessao());\n  if (E.config.sessao.tesouro) etapas.push('tesouro');"),
    ("    fila: null, idx: 0, tempoAcabou: false, retomar: null };",
     "    fila: null, idx: 0, lugarAtual: null, tempoAcabou: false, retomar: null };"),
    ("  ({ comoEstou: () => telaComoEstou(false), aquecer: telaAquecer, vila: telaVila, tesouro: telaTesouro, tchau: telaTchau })[e]();",
     "  const fixas = { comoEstou: () => telaComoEstou(false), aquecer: telaAquecer, tesouro: telaTesouro, tchau: telaTchau, mapa: telaMapa };\n  if (fixas[e]) return fixas[e]();\n  entrarLugar(e);"),
    # fila por lugar
    ("""function telaVila() {
  if (!S.fila) { S.fila = montarFila(); S.idx = 0; }
  proximaTentativa();
}
function proximaTentativa() {
  if (S.tempoAcabou || sessaoPassouDoTempo() || S.idx >= S.fila.length) return proximaEtapa();
  const item = S.fila[S.idx];
  rodarTentativa(criarDef(item), () => { S.idx++; salvar(); proximaTentativa(); });
}""",
     """// Roda as tarefas de um lugar em sequência e depois chama aoFim.
function rodarFila(lugar, aoFim) {
  S.lugarAtual = lugar; S.fila = montarFila(lugar); S.idx = 0;
  const passo = () => {
    if (S.tempoAcabou || sessaoPassouDoTempo() || S.idx >= S.fila.length) { S.fila = null; return aoFim(); }
    rodarTentativa(criarDef(S.fila[S.idx]), () => { S.idx++; salvar(); passo(); });
  };
  passo();
}"""),
    ("// Monta a sequência da Vila: linha de base primeiro, depois o ensino com itens fáceis intercalados.\nfunction montarFila() {\n  const alvos = Object.entries(E.config.alvos).filter(([, a]) => a.ativo);",
     "// Monta a sequência de um lugar: linha de base primeiro, depois o ensino com itens fáceis intercalados.\nfunction montarFila(lugar) {\n  const alvos = Object.entries(E.config.alvos).filter(([k, a]) => a.ativo && ALVOS[k] && ALVOS[k].lugar === lugar);\n  const tarefas = (E.config.lugares[lugar] || {}).tarefas || 6;"),
    ("    for (let i = 0; i < E.config.ensino.tentativas; i++) {\n      for (let j = 0; j < faceis; j++) fila.push(facil());",
     "    for (let i = 0; i < tarefas; i++) {\n      for (let j = 0; j < faceis; j++) fila.push(facil());"),
    ("    const lista = aprendidos.length ? aprendidos : ['querer1'];\n    for (let i = 0; i < E.config.ensino.tentativas; i++) fila.push({ alvo: lista[i % lista.length], facil: aprendidos.length > 0 });",
     "    const doLugar = Object.keys(ALVOS).filter(k => ALVOS[k].lugar === lugar);\n    const lista = aprendidos.length ? aprendidos : doLugar.slice(0, 1);\n    for (let i = 0; lista.length && i < tarefas; i++) fila.push({ alvo: lista[i % lista.length], facil: aprendidos.length > 0 });"),
    ("  if (!S || !S.fila || S.etapas[S.etapa] !== 'vila') return '';", "  if (!S || !S.fila || !S.lugarAtual) return '';"),
    # cartão com imagem própria
    ("  carta: id => {\n    if (IMG['carta-' + id]) return img('carta-' + id, 'picto foto', CARTOES[id].rotulo);",
     "  carta: id => {\n    if (IMG['carta-' + id]) return img('carta-' + id, 'picto foto', CARTOES[id].rotulo);\n    if (CARTOES[id] && CARTOES[id].img && IMG[CARTOES[id].img]) return img(CARTOES[id].img, 'picto foto', CARTOES[id].rotulo);"),
    # motor: faixa com passos já prontos, tarefa livre, cartões pequenos
    ("  let passo = 0, erro = false, degrau = 0, maxDegrau = 0, latencia = null, t0 = performance.now(), travado = false, instrucaoAcabou = false;",
     "  let passo = 0, erro = false, degrau = 0, maxDegrau = 0, latencia = null, t0 = performance.now(), travado = false, instrucaoAcabou = false, escolha = null;"),
    ("  const faixa = def.multi ? `<div class=\"faixa\" id=\"faixa\">${def.passos.map(() => '<div class=\"slot\"></div>').join('')}</div>` : '';",
     "  const faixaIds = def.faixaTotal || (def.multi ? def.passos.map(p => p.correta) : null);\n  const ini = def.inicioFilho || 0;\n  const faixa = faixaIds ? `<div class=\"faixa${faixaIds.length > 5 ? ' longa' : ''}\" id=\"faixa\">${faixaIds.map((id, i) => (i < ini ? `<div class=\"slot cheio pre\">${A.carta(id)}</div>` : '<div class=\"slot\"></div>')).join('')}</div>` : '';"),
    ("    const p = def.passos[passo];\n    $('#cartas').innerHTML = p.cartas.map(cartaHTML).join('');",
     "    const p = def.passos[passo];\n    $('#cartas').className = 'cartas' + (def.pequenas ? ' pequenas' : '');\n    $('#cartas').innerHTML = p.cartas.map(cartaHTML).join('');"),
    ("  function aplicarDegrau(d, comFala) {\n    const correta = def.passos[passo].correta;",
     "  function aplicarDegrau(d, comFala) {\n    if (def.livre) { if (comFala && d >= 3) falar(def.passos[passo].modelo); return; }\n    const correta = def.passos[passo].correta;"),
    ("  function agendarSubida() {\n    if (linhaDeBase) {",
     "  function agendarSubida() {\n    if (def.livre) {\n      // escolha livre: não existe errado; só lembra que pode escolher e depois segue\n      depois(Math.max(atraso * 2, 4000), () => { if (vivo(g) && !travado) falar(def.passos[passo].modelo); });\n      depois(Math.max(atraso * 2, 4000) + 15000, () => vivo(g) && !travado && terminar(false, true));\n      return;\n    }\n    if (linhaDeBase) {"),
    ("    const slot = $$('#faixa .slot')[passo];", "    const slot = $$('#faixa .slot')[ini + passo];"),
    ("    const correta = def.passos[passo].correta;\n    if (id === correta) {",
     "    const correta = def.passos[passo].correta;\n    if (def.livre || id === correta) {\n      escolha = id;"),
    ("    registrarTentativa(def, { correta, sozinha, erro, degrau: maxDegrau, semResposta, latenciaMs: latencia, atrasoS: atraso / 1000 });",
     "    registrarTentativa(def, { correta, sozinha, erro, degrau: maxDegrau, semResposta, latenciaMs: latencia, atrasoS: atraso / 1000, escolha });\n    if (correta && def.completarDepois) {\n      // encadeamento para frente: o jogo completa os passos que a criança ainda não faz\n      $$('#faixa .slot').forEach((s, i) => { if (!s.classList.contains('cheio')) { s.innerHTML = A.carta(def.faixaTotal[i]); s.classList.add('cheio', 'pre'); } });\n    }"),
    # missões de todos os lugares abertos
    ("""function missoesAtivas() {
  return Object.entries(E.config.alvos).filter(([, a]) => a.ativo).map(([k]) => ALVOS[k].missao);
}""",
     """function missoesAtivas() {
  const aberto = l => E.config.lugares[l] && E.config.lugares[l].aberto;
  const m = Object.entries(E.config.alvos).filter(([k, a]) => a.ativo && ALVOS[k] && ALVOS[k].missao && aberto(ALVOS[k].lugar)).map(([k]) => ALVOS[k].missao);
  for (const [l, info] of Object.entries(LUGARES)) if (info.missao && aberto(l)) m.push(info.missao);
  return [...new Set(m)];
}"""),
    # área do adulto
    ("  { id: 'crianca', nome: 'Criança', render: abaCrianca },", "  { id: 'crianca', nome: 'Criança', render: abaCrianca },\n  { id: 'lugares', nome: 'Lugares', render: abaLugares },"),
    ("  const blocos = Object.entries(ALVOS).map(([k, al]) => {",
     "  let lugarAnterior = null;\n  const blocos = alvosOrdenados().map(([k, al]) => {\n    const cab = al.lugar !== lugarAnterior ? `<h3 class=\"grupo-lugar\">${LUGARES[al.lugar].nome}${E.config.lugares[al.lugar].aberto ? '' : ' (fechado)'}</h3>` : '';\n    lugarAnterior = al.lugar;"),
    ("    return `<article class=\"bloco cartao-alvo\"><header><h3>${al.nome}</h3>",
     "    return cab + `<article class=\"bloco cartao-alvo\"><header><h3>${al.nome}</h3>"),
    ("  p.innerHTML = `<h2>Alvos da Vila Conversa</h2><p>Os outros sete lugares da ilha entram nas próximas versões. Na linha de base, o jogo não dá dica e responde de forma neutra; a criança ganha uma concha por participar.</p>${blocos}`;",
     "  p.innerHTML = `<h2>Alvos com acerto</h2><p>Os alvos de cada lugar. Enseada Calma, Clareira do Encontro e Mirante dos Tesouros não têm resposta certa: registram atividade (veja a aba Dados). Na linha de base, o jogo não dá dica e responde de forma neutra; a criança ganha uma concha por participar.</p>${blocos}`;"),
    ("    ${campo({ caminho: 'ensino.tentativas', rotulo: 'Tarefas por sessão', tipo: 'range', min: 3, max: 12 })}\n", ""),
    ("    ${alvosComDados.map(k => `<div class=\"bloco\"><h3>${ALVOS[k].nome}</h3>${graficoAlvo(k)}",
     "    ${alvosComDados.map(k => `<div class=\"bloco\"><h3>${LUGARES[ALVOS[k].lugar].nome}: ${ALVOS[k].nome}</h3>${graficoAlvo(k)}"),
    ("    <div class=\"bloco\"><h3>Sessões</h3>", "    ${blocoAtividades()}\n    <div class=\"bloco\"><h3>Sessões</h3>"),
    ("<button class=\"botao-p\" id=\"csvAbc\">Registros ABC</button>", "<button class=\"botao-p\" id=\"csvAbc\">Registros ABC</button><button class=\"botao-p\" id=\"csvEventos\">Atividades</button>"),
    ("  on('#csvTent', exportarTentativas); on('#csvSess', exportarSessoes); on('#csvAbc', exportarAbc); on('#csvConfig', exportarHistorico);",
     "  on('#csvTent', exportarTentativas); on('#csvSess', exportarSessoes); on('#csvAbc', exportarAbc); on('#csvConfig', exportarHistorico); on('#csvEventos', exportarEventos);"),
    ("      try { localStorage.removeItem(CHAVE); } catch (e) { /* ok */ }",
     "      try { localStorage.removeItem(CHAVE); } catch (e) { /* ok */ }\n      try { indexedDB.deleteDatabase('ilhaFarol'); BANCO.db = null; } catch (e) { /* ok */ }"),
    ("    ...E.tentativas.map(t => [nSessao.get(t.sessao) || '', fmtData(t.ts), t.alvo === 'facil' ? 'toca na concha' : ALVOS[t.alvo].nome,",
     "    ...E.tentativas.map(t => [nSessao.get(t.sessao) || '', fmtData(t.ts), t.alvo === 'facil' ? 'toca na concha' : `${LUGARES[ALVOS[t.alvo].lugar].nome}: ${ALVOS[t.alvo].nome}`,"),
    ("  for (const a of Object.keys(ATIVIDADES)) add(FALA.tchau(a));\n  return lista;",
     "  for (const a of Object.keys(ATIVIDADES)) add(FALA.tchau(a));\n  falasDosLugares().forEach(add);\n  return lista;"),
    # Como testar
    ("    <p>Esta é a versão de homologação da Ilha do Farol, só com a <b>Vila Conversa</b>. Serve para o psicólogo experimentar o jogo e a configuração e dizer o que mudaria. Não é tratamento.</p>",
     "    <p>Esta é a versão de homologação da Ilha do Farol, com os <b>oito lugares da ilha</b>. Serve para o psicólogo experimentar o jogo e a configuração e dizer o que mudaria. Não é tratamento.</p>"),
    ("      <li>Na aba <b>Alvos</b>, ligue os alvos que quer ver e escolha o nível. Para ver a linha de base, toque em \"Fazer linha de base\".</li>",
     "      <li>Na aba <b>Lugares</b>, veja quais lugares estão abertos. Com \"A criança escolhe no mapa\" ligado, dá para visitar um lugar por sessão; desligado, vale o plano da sessão.</li>\n      <li>Na aba <b>Alvos</b>, ligue os alvos que quer ver e escolha o nível. Para ver a linha de base, toque em \"Fazer linha de base\".</li>"),
    ("      <p>Só um lugar da ilha. A arte desta versão já é a definitiva desta fase, criada com IA em alta definição. A voz ainda é a sintética do próprio aparelho: a voz definitiva entra na próxima versão. Os dados ficam só neste aparelho.</p>",
     "      <p>A arte desta versão já é a definitiva desta fase, criada com IA em alta definição. A voz ainda é a sintética do próprio aparelho: a voz definitiva entra depois. Os dados e as fotos das Histórias Minhas ficam só neste aparelho.</p>"),
    ("iniciar();\n", "window.addEventListener('DOMContentLoaded', iniciar);\n"),
])

trocar("sw.js", [
    ("const CACHE = 'ilha-farol-0.2.0';", "const CACHE = 'ilha-farol-0.3.0';"),
    ("'./', './index.html', './estilo.css', './arte.js', './app.js', './manifest.webmanifest',",
     "'./', './index.html', './estilo.css', './arte.js', './app.js', './lugares.js', './manifest.webmanifest',"),
])
trocar("index.html", [
    ('<script src="app.js"></script>', '<script src="app.js"></script>\n<script src="lugares.js"></script>'),
])
