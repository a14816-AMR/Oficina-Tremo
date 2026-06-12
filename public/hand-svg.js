// =======================================================
// hand-svg.js — Ilustrações vetoriais do alfabeto LGP
// Cada função devolve um SVG simplificado mas claro
// representando a configuração da mão para cada letra.
//
// Sistema: palma (retângulo arredondado) + 5 dedos
// (polegar, indicador, médio, anelar, mínimo) que podem
// estar: ESTENDIDOS (linha longa), DOBRADOS (linha curta
// curvada sobre a palma), ou ABERTOS LATERALMENTE.
// =======================================================

const HAND_SVG_VIEWBOX = '0 0 120 140';

// Cores usam variáveis CSS para se adaptarem ao tema
const SKIN   = 'var(--hand-skin, #e8b89a)';
const STROKE = 'var(--hand-stroke, #b8896a)';
const NAIL   = 'var(--hand-nail, #f5d4c0)';

// --- Construtores base ---

// Dedo estendido para cima, a partir de (x, baseY) até (x, tipY)
function fingerUp(x, baseY, tipY, width = 14) {
  return `<rect x="${x - width/2}" y="${tipY}" width="${width}" height="${baseY - tipY}"
            rx="${width/2}" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>`;
}

// Dedo dobrado sobre a palma (pequeno arco)
function fingerBent(x, y, width = 16) {
  return `<ellipse cx="${x}" cy="${y}" rx="${width/2}" ry="9"
            fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>`;
}

// Dedo apontado diagonalmente
function fingerDiag(x1, y1, x2, y2, width = 13) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return `<g transform="translate(${x1},${y1}) rotate(${angle})">
            <rect x="0" y="${-width/2}" width="${len}" height="${width}" rx="${width/2}"
              fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
          </g>`;
}

// Palma da mão
function palm(x = 30, y = 65, w = 60, h = 55) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"
            fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>`;
}

// Pulso
function wrist() {
  return `<rect x="42" y="115" width="36" height="22" rx="6"
            fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>`;
}

// Wrapper SVG
function wrap(inner) {
  return `<svg viewBox="${HAND_SVG_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${inner}</svg>`;
}

// =======================================================
// DEFINIÇÕES POR LETRA
// Posições aproximadas: palma ocupa x:30-90, y:65-120
// Dedos saem do topo da palma (y≈65), pulso y:115-137
// =======================================================

const HAND_SHAPES = {

  // A — punho fechado, polegar ao lado
  A: () => wrap(`
    ${wrist()}
    ${palm(30, 60, 60, 58)}
    ${fingerBent(42, 60)} ${fingerBent(58, 58)} ${fingerBent(74, 60)} ${fingerBent(88, 64)}
    <rect x="14" y="78" width="22" height="14" rx="7" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // B — 4 dedos juntos para cima, polegar dobrado à palma
  B: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 55)}
    ${fingerUp(42, 65, 18)}
    ${fingerUp(56, 65, 10)}
    ${fingerUp(70, 65, 12)}
    ${fingerUp(84, 65, 22)}
    <ellipse cx="30" cy="90" rx="10" ry="14" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // C — mão curvada em C
  C: () => wrap(`
    <path d="M 30 50 Q 10 60 12 90 Q 14 120 45 128 Q 80 132 95 105
             Q 105 85 95 65 Q 85 48 65 45 Q 45 43 30 50 Z"
          fill="none" stroke="${STROKE}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 30 50 Q 10 60 12 90 Q 14 120 45 128 Q 80 132 95 105
             Q 105 85 95 65 Q 85 48 65 45 Q 45 43 30 50 Z"
          fill="none" stroke="${SKIN}" stroke-width="7" stroke-linecap="round"/>
  `),

  // D — indicador para cima, polegar toca os outros dedos curvados
  D: () => wrap(`
    ${wrist()}
    ${palm(34, 78, 52, 45)}
    ${fingerUp(50, 78, 16)}
    <path d="M 64 80 Q 92 82 90 100 Q 88 118 64 120"
          fill="none" stroke="${STROKE}" stroke-width="9" stroke-linecap="round"/>
    <path d="M 64 80 Q 92 82 90 100 Q 88 118 64 120"
          fill="none" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="34" cy="100" rx="10" ry="14" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // E — dedos curvados para baixo sobre a palma, polegar por baixo
  E: () => wrap(`
    ${wrist()}
    ${palm(30, 60, 60, 60)}
    <path d="M 38 64 Q 36 80 46 86 Q 50 88 50 80" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
    <path d="M 52 62 Q 50 80 60 88 Q 64 90 64 80" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
    <path d="M 66 62 Q 64 80 74 88 Q 78 90 78 80" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
    <path d="M 80 64 Q 78 80 86 86 Q 90 88 90 78" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
    <ellipse cx="34" cy="104" rx="12" ry="10" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // F — polegar+indicador em OK (tocando-se), médio+anelar+mínimo estendidos
  F: () => wrap(`
    ${wrist()}
    ${palm(28, 70, 64, 53)}
    ${fingerUp(64, 70, 16)}
    ${fingerUp(78, 70, 18)}
    ${fingerUp(92, 70, 26)}
    <circle cx="40" cy="62" r="13" fill="none" stroke="${STROKE}" stroke-width="8"/>
    <circle cx="40" cy="62" r="13" fill="none" stroke="${SKIN}" stroke-width="5"/>
  `),

  // G — indicador + polegar horizontais, apontando para o lado
  G: () => wrap(`
    ${wrist()}
    ${palm(40, 75, 50, 50)}
    <rect x="0" y="68" width="48" height="13" rx="6.5" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
    <rect x="2" y="84" width="40" height="12" rx="6" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
    ${fingerBent(70, 80)} ${fingerBent(84, 84)} ${fingerBent(94, 90)}
  `),

  // H — indicador + médio horizontais e juntos, apontando para o lado
  H: () => wrap(`
    ${wrist()}
    ${palm(42, 75, 48, 50)}
    <rect x="0" y="68" width="50" height="12" rx="6" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
    <rect x="0" y="82" width="50" height="12" rx="6" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
    ${fingerBent(76, 82)} ${fingerBent(90, 88)}
    <ellipse cx="50" cy="104" rx="11" ry="9" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // I — só mínimo para cima
  I: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    ${fingerBent(42, 63)} ${fingerBent(56, 62)} ${fingerBent(70, 63)}
    ${fingerUp(85, 65, 22)}
    <ellipse cx="34" cy="92" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // J — mínimo para cima com gancho (traça J no ar)
  J: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    ${fingerBent(42, 63)} ${fingerBent(56, 62)} ${fingerBent(70, 63)}
    <path d="M 85 65 L 85 48 Q 85 38 75 38"
          fill="none" stroke="${STROKE}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 85 65 L 85 48 Q 85 38 75 38"
          fill="none" stroke="${SKIN}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="34" cy="92" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // K — indicador para cima, médio diagonal, polegar entre eles
  K: () => wrap(`
    ${wrist()}
    ${palm(30, 70, 60, 53)}
    ${fingerUp(50, 70, 14)}
    ${fingerDiag(66, 72, 88, 36, 12)}
    ${fingerBent(78, 76)} ${fingerBent(90, 80)}
    <path d="M 58 80 L 72 56" stroke="${STROKE}" stroke-width="9" stroke-linecap="round"/>
    <path d="M 58 80 L 72 56" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/>
  `),

  // L — polegar+indicador em L (90°)
  L: () => wrap(`
    ${wrist()}
    ${palm(34, 75, 56, 50)}
    ${fingerUp(50, 75, 14)}
    ${fingerBent(66, 78)} ${fingerBent(80, 82)} ${fingerBent(92, 88)}
    <path d="M 34 90 L 14 110" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 34 90 L 14 110" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
  `),

  // M — 3 dedos dobrados sobre o polegar
  M: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    <path d="M 38 67 Q 38 84 48 88" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
    <path d="M 52 65 Q 52 84 62 90" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
    <path d="M 66 65 Q 66 84 76 90" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
    ${fingerBent(88, 64)}
    <ellipse cx="40" cy="100" rx="13" ry="9" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // N — 2 dedos dobrados sobre o polegar
  N: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    <path d="M 42 67 Q 42 84 52 88" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
    <path d="M 56 65 Q 56 84 66 90" fill="none" stroke="${STROKE}" stroke-width="11" stroke-linecap="round"/>
    ${fingerBent(76, 64)} ${fingerBent(88, 64)}
    <ellipse cx="42" cy="100" rx="13" ry="9" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // O — todos os dedos curvados em O com polegar
  O: () => wrap(`
    ${wrist()}
    <circle cx="60" cy="80" r="32" fill="none" stroke="${STROKE}" stroke-width="11"/>
    <circle cx="60" cy="80" r="32" fill="none" stroke="${SKIN}" stroke-width="7"/>
    ${palm(38, 95, 44, 30)}
  `),

  // P — indicador para baixo com polegar estendido
  P: () => wrap(`
    ${wrist()}
    ${palm(34, 65, 56, 50)}
    <path d="M 50 70 L 50 110" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 50 70 L 50 110" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    ${fingerDiag(64, 72, 92, 56, 12)}
    ${fingerBent(78, 68)} ${fingerBent(90, 72)}
  `),

  // R — indicador cruzado com médio
  R: () => wrap(`
    ${wrist()}
    ${palm(30, 70, 60, 53)}
    <path d="M 50 70 L 40 24" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 50 70 L 40 24" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 64 70 L 70 22" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 64 70 L 70 22" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    ${fingerBent(78, 74)} ${fingerBent(90, 78)}
    <ellipse cx="32" cy="96" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // S — punho fechado, polegar por cima
  S: () => wrap(`
    ${wrist()}
    ${palm(30, 60, 60, 58)}
    ${fingerBent(42, 60)} ${fingerBent(58, 58)} ${fingerBent(74, 60)} ${fingerBent(88, 64)}
    <ellipse cx="56" cy="48" rx="22" ry="10" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // T — polegar entre indicador e médio
  T: () => wrap(`
    ${wrist()}
    ${palm(30, 60, 60, 58)}
    ${fingerBent(42, 60)} ${fingerBent(58, 58)} ${fingerBent(74, 60)} ${fingerBent(88, 64)}
    <rect x="44" y="46" width="16" height="20" rx="7" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // U — indicador+médio juntos para cima
  U: () => wrap(`
    ${wrist()}
    ${palm(30, 70, 60, 53)}
    ${fingerUp(50, 70, 16)}
    ${fingerUp(62, 70, 16)}
    ${fingerBent(76, 74)} ${fingerBent(88, 78)}
    <ellipse cx="32" cy="96" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // V — indicador+médio separados em V
  V: () => wrap(`
    ${wrist()}
    ${palm(30, 70, 60, 53)}
    ${fingerDiag(50, 70, 38, 22, 13)}
    ${fingerDiag(62, 70, 76, 22, 13)}
    ${fingerBent(78, 76)} ${fingerBent(90, 80)}
    <ellipse cx="32" cy="96" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // W — 3 dedos separados
  W: () => wrap(`
    ${wrist()}
    ${palm(28, 70, 64, 53)}
    ${fingerDiag(44, 70, 34, 20, 12)}
    ${fingerUp(58, 70, 14)}
    ${fingerDiag(72, 70, 82, 20, 12)}
    ${fingerBent(90, 78)}
    <ellipse cx="30" cy="96" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // X — indicador dobrado em gancho
  X: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    <path d="M 46 65 Q 42 40 56 38 Q 66 38 64 50"
          fill="none" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 46 65 Q 42 40 56 38 Q 66 38 64 50"
          fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
    ${fingerBent(60, 62)} ${fingerBent(74, 64)} ${fingerBent(88, 68)}
    <ellipse cx="34" cy="95" rx="10" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
  `),

  // Y — polegar+mínimo estendidos (shaka)
  Y: () => wrap(`
    ${wrist()}
    ${palm(30, 65, 60, 58)}
    ${fingerBent(50, 62)} ${fingerBent(64, 60)} ${fingerBent(76, 62)}
    ${fingerUp(90, 65, 18)}
    <path d="M 36 88 L 14 112" stroke="${STROKE}" stroke-width="13" stroke-linecap="round"/>
    <path d="M 36 88 L 14 112" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>
  `),

  // Z — indicador traça Z
  Z: () => wrap(`
    ${wrist()}
    ${palm(34, 75, 52, 48)}
    ${fingerUp(50, 75, 14)}
    ${fingerBent(66, 78)} ${fingerBent(80, 82)} ${fingerBent(92, 88)}
    <ellipse cx="36" cy="98" rx="9" ry="13" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
    <path d="M 44 22 L 60 22 L 46 36 L 62 36"
          fill="none" stroke="${STROKE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  `),
};

// Devolve o SVG (string) para uma letra. Fallback: ponto de interrogação.
function getHandSVG(letter) {
  const fn = HAND_SHAPES[letter];
  if (!fn) return wrap(`<text x="60" y="80" font-size="40" text-anchor="middle" fill="${STROKE}">?</text>`);
  return fn();
}
