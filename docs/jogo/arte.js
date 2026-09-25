'use strict';
/* Arte da Ilha do Farol, toda desenhada em SVG.
   Regras: formas simples, cores calmas, contorno suave, nada pisca. */

const COR = {
  tinta: '#14303A', tinta2: '#4A6670', mar: '#D2E6E6', areia: '#EEE7D3', areiaBorda: '#D6CAA9',
  teal: '#2A7778', tealClaro: '#D4E9E8', ambar: '#D8952A', ambarClaro: '#F6DDA8', branco: '#FFFFFF',
};

// Cor do Lume por sentimento. É um apoio visual, não uma regra.
const COR_LUME = {
  feliz: '#F2A65A', calmo: '#EDB978', triste: '#86AACB', bravo: '#D98466', medo: '#B7A4CF', dormindo: '#E7B98A',
};

// Categorias de cartão no padrão de cores de Fitzgerald, usado em pranchas de comunicação alternativa.
const COR_CATEGORIA = { social: '#C9719A', verbo: '#4E9A5B', coisa: '#E0913A', descricao: '#4F83B8' };

function svg(viewBox, corpo, cls = '', rotulo = '') {
  const aria = rotulo ? `role="img" aria-label="${rotulo}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" viewBox="${viewBox}" ${aria} xmlns="http://www.w3.org/2000/svg">${corpo}</svg>`;
}

/* ---------- Personagens ---------- */

function arteLume({ humor = 'feliz', acenando = false, cls = '' } = {}) {
  const cor = COR_LUME[humor] || COR_LUME.feliz;
  const bracos = [0, 1, 2, 3, 4, 5].map(i => {
    const x = 58 + i * 17;
    const lado = i < 3 ? -1 : 1;
    return `<path class="braco b${i}" d="M${x} 118 C ${x + lado * 4} 140, ${x - lado * 10} 152, ${x + lado * 2} 170 q ${lado * 3} 9 ${lado * 11} 5"
      fill="none" stroke="${cor}" stroke-width="13" stroke-linecap="round"/>`;
  }).join('');
  const olhos = humor === 'dormindo'
    ? `<path d="M70 92 q8 6 16 0 M114 92 q8 6 16 0" fill="none" stroke="${COR.tinta}" stroke-width="4" stroke-linecap="round"/>`
    : `<ellipse cx="78" cy="90" rx="13" ry="15" fill="#fff"/><ellipse cx="122" cy="90" rx="13" ry="15" fill="#fff"/>
       <circle cx="80" cy="93" r="6.5" fill="${COR.tinta}"/><circle cx="124" cy="93" r="6.5" fill="${COR.tinta}"/>
       <circle cx="82" cy="90" r="2" fill="#fff"/><circle cx="126" cy="90" r="2" fill="#fff"/>`;
  const bocas = {
    feliz: 'M86 112 Q100 124 114 112', calmo: 'M89 114 Q100 119 111 114', triste: 'M88 120 Q100 111 112 120',
    bravo: 'M88 117 L112 117', medo: 'M96 114 a4 5 0 1 0 8 0 a4 5 0 1 0 -8 0', dormindo: 'M92 116 Q100 120 108 116',
  };
  const sobrancelha = humor === 'bravo'
    ? `<path d="M64 72 L88 78 M136 72 L112 78" stroke="${COR.tinta}" stroke-width="4" stroke-linecap="round"/>` : '';
  const zz = humor === 'dormindo'
    ? `<text x="150" y="44" font-size="22" font-family="Lexend, sans-serif" fill="${COR.tinta2}">z</text><text x="164" y="28" font-size="16" font-family="Lexend, sans-serif" fill="${COR.tinta2}">z</text>` : '';
  const corpo = `
    <g class="bracos">${bracos}</g>
    <ellipse cx="100" cy="84" rx="60" ry="54" fill="${cor}"/>
    <ellipse cx="80" cy="56" rx="20" ry="11" fill="#fff" opacity=".28"/>
    <circle cx="66" cy="108" r="7" fill="#E88C8C" opacity=".35"/><circle cx="134" cy="108" r="7" fill="#E88C8C" opacity=".35"/>
    ${olhos}${sobrancelha}
    <path d="${bocas[humor] || bocas.feliz}" fill="${humor === 'medo' ? COR.tinta : 'none'}" stroke="${COR.tinta}" stroke-width="4" stroke-linecap="round"/>
    ${zz}`;
  return svg('0 0 200 190', corpo, `lume ${acenando ? 'acena' : ''} ${cls}`, 'Lume, o polvinho');
}

function arteGigi({ alto = false, cls = '' } = {}) {
  const bico = alto
    ? `<path d="M164 78 L194 70 L166 86 Z" fill="#E9A23B"/><path d="M164 90 L192 100 L166 94 Z" fill="#D98A2B"/>`
    : `<path d="M164 80 L192 88 L164 95 Z" fill="#E9A23B"/>`;
  const ondas = alto
    ? `<path d="M178 58 q14 26 0 52 M188 48 q20 36 0 72" fill="none" stroke="${COR.teal}" stroke-width="4" stroke-linecap="round" opacity=".7"/>` : '';
  const corpo = `
    <path d="M30 118 L58 108 L52 132 Z" fill="#9FB0B6"/>
    <ellipse cx="96" cy="122" rx="56" ry="38" fill="#fff" stroke="#C9D3D6" stroke-width="3"/>
    <path d="M62 112 Q100 88 130 118 Q98 132 62 112 Z" fill="#AEBEC4"/>
    <circle cx="142" cy="84" r="28" fill="#fff" stroke="#C9D3D6" stroke-width="3"/>
    <circle cx="150" cy="78" r="4.5" fill="${COR.tinta}"/>
    ${bico}${ondas}
    <path d="M86 158 v18 M106 158 v18" stroke="#E9A23B" stroke-width="5" stroke-linecap="round"/>`;
  return svg('0 0 200 190', corpo, `morador gigi ${alto ? 'alto' : ''} ${cls}`, 'Gigi, a gaivota');
}

function arteTuca({ cls = '' } = {}) {
  const corpo = `
    <rect x="52" y="128" width="20" height="30" rx="9" fill="#A9C98F"/><rect x="126" y="128" width="20" height="30" rx="9" fill="#A9C98F"/>
    <circle cx="168" cy="116" r="19" fill="#A9C98F"/>
    <circle cx="174" cy="111" r="3.5" fill="${COR.tinta}"/>
    <path d="M166 124 q6 5 12 0" fill="none" stroke="${COR.tinta}" stroke-width="3" stroke-linecap="round"/>
    <path d="M34 134 Q100 36 164 134 Z" fill="#7FA36B"/>
    <path d="M70 128 L82 96 L118 96 L130 128 M82 96 L100 70 L118 96 M58 124 L70 128 M130 128 L142 124" fill="none" stroke="#5E8250" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="99" cy="134" rx="66" ry="9" fill="#6C9159"/>`;
  return svg('0 0 200 190', corpo, `morador tuca ${cls}`, 'Tuca, a tartaruga');
}

function arteCaco({ cls = '' } = {}) {
  const corpo = `
    <path d="M52 140 l-22 16 M56 148 l-18 22 M148 140 l22 16 M144 148 l18 22" stroke="#C9664C" stroke-width="6" stroke-linecap="round"/>
    <path d="M60 116 L34 100 M140 116 L166 100" stroke="#E07A5F" stroke-width="8" stroke-linecap="round"/>
    <path d="M22 86 a16 16 0 1 1 22 20 l-8 -12 z" fill="#E07A5F"/><path d="M178 86 a16 16 0 1 0 -22 20 l8 -12 z" fill="#E07A5F"/>
    <path d="M86 102 L82 74 M114 102 L118 74" stroke="#E07A5F" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="100" cy="126" rx="54" ry="32" fill="#E07A5F"/>
    <circle cx="82" cy="68" r="11" fill="#fff"/><circle cx="118" cy="68" r="11" fill="#fff"/>
    <circle cx="83" cy="70" r="5" fill="${COR.tinta}"/><circle cx="119" cy="70" r="5" fill="${COR.tinta}"/>
    <path d="M62 74 Q100 22 138 74" fill="none" stroke="${COR.teal}" stroke-width="7" stroke-linecap="round"/>
    <rect x="54" y="64" width="14" height="22" rx="6" fill="${COR.teal}"/><rect x="132" y="64" width="14" height="22" rx="6" fill="${COR.teal}"/>
    <path d="M88 132 q12 9 24 0" fill="none" stroke="${COR.tinta}" stroke-width="4" stroke-linecap="round"/>`;
  return svg('0 0 200 190', corpo, `morador caco ${cls}`, 'Caco, o caranguejo');
}

const MORADORES = {
  caco: { nome: 'Caco', artigo: 'o', arte: arteCaco },
  tuca: { nome: 'Tuca', artigo: 'a', arte: arteTuca },
  gigi: { nome: 'Gigi', artigo: 'a', arte: arteGigi },
};

/* ---------- Coisas e cores ---------- */

const CORES_CONCHA = {
  azul: { nome: 'azul', hex: '#7FB3D5', borda: '#4F83B8' },
  rosa: { nome: 'rosa', hex: '#F2B5A7', borda: '#C9719A' },
  amarela: { nome: 'amarela', hex: '#F4D59A', borda: '#D8952A' },
};

function arteConcha(cor = 'amarela') {
  const c = CORES_CONCHA[cor] || CORES_CONCHA.amarela;
  const raios = [-36, -18, 0, 18, 36].map(a => {
    const r = a * Math.PI / 180;
    return `<path d="M50 86 L${(50 + Math.sin(r) * 34).toFixed(1)} ${(86 - Math.cos(r) * 58).toFixed(1)}" stroke="${c.borda}" stroke-width="3" stroke-linecap="round"/>`;
  }).join('');
  return svg('0 0 100 100', `<path d="M50 88 L14 44 Q50 2 86 44 Z" fill="${c.hex}" stroke="${c.borda}" stroke-width="4" stroke-linejoin="round"/>${raios}
    <rect x="40" y="84" width="20" height="9" rx="4" fill="${c.borda}"/>`, 'coisa', `concha ${c.nome}`);
}
function artePeixe() {
  return svg('0 0 100 100', `<path d="M70 50 L94 32 L90 50 L94 68 Z" fill="#6FA8C9"/><ellipse cx="46" cy="50" rx="32" ry="20" fill="#8CC0DD"/>
    <circle cx="30" cy="45" r="4.5" fill="${COR.tinta}"/><path d="M40 36 q10 14 0 28" fill="none" stroke="#6FA8C9" stroke-width="3"/>`, 'coisa', 'peixe');
}
function arteBola() {
  return svg('0 0 100 100', `<circle cx="50" cy="52" r="34" fill="#F2B5A7"/><path d="M18 44 Q50 64 82 44" fill="none" stroke="#fff" stroke-width="7"/>
    <path d="M24 70 Q50 84 76 70" fill="none" stroke="#E08E7B" stroke-width="5"/>`, 'coisa', 'bola');
}
function arteEstrela() {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 17 : 38, a = (i * 36 - 90) * Math.PI / 180;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(54 + Math.sin(a) * r).toFixed(1)}`);
  }
  return svg('0 0 100 100', `<polygon points="${pts.join(' ')}" fill="#F4C27A" stroke="#E0A450" stroke-width="7" stroke-linejoin="round"/>`, 'coisa', 'estrela');
}
function arteAlga() {
  return svg('0 0 100 100', `<path d="M36 92 q-14 -20 0 -40 q14 -20 0 -40 M54 92 q14 -22 0 -44 q-12 -18 2 -34 M70 92 q-10 -18 0 -34" fill="none" stroke="#6E9C5E" stroke-width="7" stroke-linecap="round"/>`, 'coisa', 'alga');
}
function arteBau(aberto = false) {
  const tampa = aberto
    ? `<path d="M16 46 L22 18 L82 18 L86 46 Z" fill="#B98556" stroke="#8C6038" stroke-width="3"/>`
    : `<path d="M14 50 Q50 22 86 50 Z" fill="#B98556" stroke="#8C6038" stroke-width="3"/>`;
  return svg('0 0 100 100', `${tampa}<rect x="14" y="50" width="72" height="38" rx="5" fill="#C99466" stroke="#8C6038" stroke-width="3"/>
    <rect x="44" y="56" width="12" height="14" rx="3" fill="${COR.ambar}"/>
    ${aberto ? `<g transform="translate(30 26) scale(.4)">${arteConcha('azul').replace(/<\/?svg[^>]*>/g, '')}</g>` : ''}`, 'coisa', aberto ? 'baú aberto' : 'baú fechado');
}

const COISAS = {
  concha: { nome: 'concha', artigo: 'a', um: 'uma', arte: () => arteConcha('amarela') },
  peixe: { nome: 'peixe', artigo: 'o', um: 'um', arte: artePeixe },
  bola: { nome: 'bola', artigo: 'a', um: 'uma', arte: arteBola },
  estrela: { nome: 'estrela', artigo: 'a', um: 'uma', arte: arteEstrela },
};

/* ---------- Pictogramas dos cartões ---------- */

const T = COR.tinta;
const PICTO = {
  euquero: () => svg('0 0 100 100', `<circle cx="50" cy="20" r="11" fill="none" stroke="${T}" stroke-width="5"/>
    <path d="M50 32 v22 M30 44 Q50 60 50 44 M70 44 Q50 60 50 44" fill="none" stroke="${T}" stroke-width="5" stroke-linecap="round"/>
    <path d="M22 70 Q50 96 78 70" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 70 v-6 M42 74 v-7 M58 74 v-7 M70 70 v-6" stroke="${T}" stroke-width="4" stroke-linecap="round"/>`),
  ajuda: () => svg('0 0 100 100', `<path d="M24 64 Q24 40 44 44 L60 48" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M76 36 Q76 60 56 56 L40 52" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M14 70 h26 M60 30 h26" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M50 76 v10 M44 82 h12" stroke="${COR.teal}" stroke-width="5" stroke-linecap="round"/>`),
  pausa: () => svg('0 0 100 100', `<circle cx="50" cy="50" r="38" fill="none" stroke="${T}" stroke-width="5"/>
    <rect x="34" y="30" width="11" height="40" rx="4" fill="${T}"/><rect x="55" y="30" width="11" height="40" rx="4" fill="${T}"/>`),
  maisbaixo: () => svg('0 0 100 100', `<path d="M14 40 h14 l18 -16 v52 l-18 -16 h-14 z" fill="none" stroke="${T}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M56 42 q6 8 0 16" fill="none" stroke="${T}" stroke-width="5" stroke-linecap="round"/>
    <path d="M78 26 v40 M68 56 l10 12 l10 -12" fill="none" stroke="${COR.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  naoobrigado: () => svg('0 0 100 100', `<circle cx="50" cy="46" r="24" fill="none" stroke="${T}" stroke-width="5"/>
    <circle cx="42" cy="42" r="3" fill="${T}"/><circle cx="58" cy="42" r="3" fill="${T}"/><path d="M42 56 h16" stroke="${T}" stroke-width="4" stroke-linecap="round"/>
    <path d="M10 84 h22 M18 78 l-8 6 l8 6 M90 84 h-22 M82 78 l8 6 l-8 6" fill="none" stroke="${COR.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  tchau: () => svg('0 0 100 100', `<path d="M40 86 V46 M40 46 v-22 M52 46 v-26 M64 48 v-20 M40 70 Q30 60 24 64" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M40 86 Q70 88 66 50" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round"/>
    <path d="M76 22 q8 8 4 18 M84 14 q12 12 6 28" fill="none" stroke="${COR.teal}" stroke-width="4" stroke-linecap="round"/>`),
  embora: () => svg('0 0 100 100', `<rect x="18" y="14" width="40" height="72" rx="3" fill="none" stroke="${T}" stroke-width="5"/>
    <circle cx="48" cy="52" r="3.5" fill="${T}"/><path d="M58 50 h30 M78 40 l10 10 l-10 10" fill="none" stroke="${COR.teal}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
};

// Cartões disponíveis: id, rótulo, categoria de Fitzgerald e arte.
const CARTOES = {
  euquero: { rotulo: 'eu quero', cat: 'verbo', arte: PICTO.euquero },
  ajuda: { rotulo: 'ajuda', cat: 'social', arte: PICTO.ajuda },
  maisbaixo: { rotulo: 'mais baixo, por favor', cat: 'social', arte: PICTO.maisbaixo },
  naoobrigado: { rotulo: 'não, obrigado', cat: 'social', arte: PICTO.naoobrigado },
  tchau: { rotulo: 'tchau', cat: 'social', arte: PICTO.tchau },
  embora: { rotulo: 'vou embora', cat: 'verbo', arte: PICTO.embora },
  concha: { rotulo: 'concha', cat: 'coisa', arte: () => arteConcha('amarela') },
  peixe: { rotulo: 'peixe', cat: 'coisa', arte: artePeixe },
  bola: { rotulo: 'bola', cat: 'coisa', arte: arteBola },
  estrela: { rotulo: 'estrela', cat: 'coisa', arte: arteEstrela },
  azul: { rotulo: 'azul', cat: 'descricao', arte: () => arteCor('azul') },
  rosa: { rotulo: 'rosa', cat: 'descricao', arte: () => arteCor('rosa') },
  amarela: { rotulo: 'amarela', cat: 'descricao', arte: () => arteCor('amarela') },
};
function arteCor(cor) {
  const c = CORES_CONCHA[cor];
  return svg('0 0 100 100', `<circle cx="50" cy="50" r="32" fill="${c.hex}" stroke="${c.borda}" stroke-width="5"/>`);
}

/* ---------- Cenário ---------- */

function arteFarol(aneis = 0, total = 5) {
  let arcos = '';
  for (let i = 0; i < total; i++) {
    const r = 22 + i * 13;
    const aceso = i < aneis;
    arcos += `<path d="M${100 - r} 58 A ${r} ${r} 0 0 1 ${100 + r} 58" fill="none"
      stroke="${aceso ? COR.ambar : '#B9C9C9'}" stroke-width="${aceso ? 6 : 3}" stroke-linecap="round"
      ${aceso ? '' : 'stroke-dasharray="3 7"'} opacity="${aceso ? 0.35 + 0.13 * i : 0.8}"/>`;
  }
  const corpo = `
    ${aneis > 0 ? `<circle cx="100" cy="66" r="${28 + aneis * 6}" fill="${COR.ambarClaro}" opacity=".55"/>` : ''}
    ${arcos}
    <rect x="72" y="244" width="56" height="10" rx="4" fill="${T}"/>
    <path d="M80 246 L120 246 L111 96 L89 96 Z" fill="#fff" stroke="${T}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M86.5 140 L113.5 140 L115 158 L85 158 Z" fill="${COR.teal}"/>
    <path d="M83.6 190 L116.4 190 L117.7 208 L82.3 208 Z" fill="${COR.teal}"/>
    <rect x="86" y="72" width="28" height="24" rx="4" fill="${aneis > 0 ? COR.ambar : '#C9D6D6'}" stroke="${T}" stroke-width="3"/>
    <path d="M80 74 L120 74 L100 52 Z" fill="${T}"/>
    <rect x="94" y="212" width="12" height="34" rx="5" fill="${COR.tinta2}"/>`;
  return svg('0 0 200 260', corpo, 'farol', `farol com ${aneis} de ${total} anéis de luz acesos`);
}

function arteBarraca() {
  let listras = '';
  for (let i = 0; i < 6; i++) listras += `<path d="M${20 + i * 30} 30 h30 v26 q-15 12 -30 0 z" fill="${i % 2 ? COR.tealClaro : COR.teal}"/>`;
  return svg('0 0 220 200', `<rect x="30" y="56" width="10" height="140" fill="#C9B38A"/><rect x="180" y="56" width="10" height="140" fill="#C9B38A"/>
    ${listras}<rect x="24" y="150" width="172" height="46" rx="6" fill="#E3D3B0" stroke="#C9B38A" stroke-width="3"/>`, 'barraca');
}

/* ---------- Ícones da agenda, do termômetro e das atividades ---------- */

const ICONE = {
  comoEstou: () => svg('0 0 60 60', `<rect x="24" y="6" width="12" height="36" rx="6" fill="none" stroke="${T}" stroke-width="4"/>
    <circle cx="30" cy="46" r="9" fill="${COR.ambar}" stroke="${T}" stroke-width="4"/><rect x="28" y="22" width="4" height="20" fill="${COR.ambar}"/>`),
  aquecer: () => arteConcha('amarela'),
  vila: () => svg('0 0 60 60', `<path d="M8 26 L30 8 L52 26" fill="none" stroke="${T}" stroke-width="4" stroke-linejoin="round"/>
    <rect x="14" y="26" width="32" height="26" fill="none" stroke="${T}" stroke-width="4"/><rect x="25" y="36" width="10" height="16" fill="${COR.teal}"/>`),
  tesouro: () => arteBau(false),
  tchau: PICTO.tchau,
};

const ATIVIDADES = {
  brincar: { nome: 'brincar', arte: () => svg('0 0 100 100', `<rect x="16" y="46" width="30" height="30" rx="4" fill="#F4C27A"/><rect x="54" y="46" width="30" height="30" rx="4" fill="#8CC0DD"/><rect x="35" y="16" width="30" height="30" rx="4" fill="#F2B5A7"/>`) },
  lanche: { nome: 'lanche', arte: () => svg('0 0 100 100', `<circle cx="50" cy="58" r="30" fill="#E88C7B"/><path d="M50 28 q4 -12 14 -14" fill="none" stroke="#6E9C5E" stroke-width="6" stroke-linecap="round"/>`) },
  banho: { nome: 'banho', arte: () => svg('0 0 100 100', `<path d="M50 14 q-24 34 -24 50 a24 24 0 0 0 48 0 q0 -16 -24 -50 z" fill="#8CC0DD"/>`) },
  dormir: { nome: 'dormir', arte: () => svg('0 0 100 100', `<path d="M64 14 a38 38 0 1 0 22 58 a30 30 0 1 1 -22 -58 z" fill="#B7A4CF"/>`) },
  escola: { nome: 'escola', arte: () => svg('0 0 100 100', `<rect x="18" y="22" width="64" height="56" rx="6" fill="#86AACB"/><path d="M50 22 v56" stroke="#fff" stroke-width="5"/>`) },
  passear: { nome: 'passear', arte: () => svg('0 0 100 100', `<rect x="45" y="56" width="10" height="30" fill="#B98556"/><circle cx="50" cy="42" r="28" fill="#7FA36B"/>`) },
};

// Temas do Mirante (interesse da criança) e da avaliação de preferência.
const TEMAS = {
  trem: { nome: 'trens', arte: () => svg('0 0 100 100', `<rect x="14" y="36" width="50" height="30" rx="5" fill="#4F83B8"/><rect x="64" y="46" width="22" height="20" rx="4" fill="#86AACB"/><rect x="22" y="22" width="14" height="14" fill="#4F83B8"/><circle cx="28" cy="72" r="8" fill="${T}"/><circle cx="52" cy="72" r="8" fill="${T}"/><circle cx="76" cy="72" r="7" fill="${T}"/>`) },
  dinossauro: { nome: 'dinossauros', arte: () => svg('0 0 100 100', `<path d="M14 70 Q30 40 56 44 Q64 20 80 22 Q90 24 86 34 L74 36 Q70 50 72 64 L64 80 L58 80 L58 66 L40 68 L36 80 L30 80 L30 68 Q20 70 14 70 Z" fill="#7FA36B"/><circle cx="80" cy="28" r="2.5" fill="${T}"/>`) },
  planeta: { nome: 'planetas', arte: () => svg('0 0 100 100', `<circle cx="50" cy="50" r="24" fill="#E0913A"/><ellipse cx="50" cy="52" rx="42" ry="11" fill="none" stroke="#B7A4CF" stroke-width="6"/>`) },
  carro: { nome: 'carros', arte: () => svg('0 0 100 100', `<path d="M12 64 v-12 l12 -4 l10 -14 h30 l12 14 l12 4 v12 z" fill="#D98466"/><circle cx="30" cy="66" r="9" fill="${T}"/><circle cx="72" cy="66" r="9" fill="${T}"/><rect x="38" y="38" width="12" height="10" fill="#fff"/><rect x="54" y="38" width="12" height="10" fill="#fff"/>`) },
  peixe: { nome: 'bichos do mar', arte: artePeixe },
};
