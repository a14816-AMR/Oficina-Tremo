// =======================================================
// game.js — LGP Palavras v4
// Classificador reescrito com base na imagem de referência
// do alfabeto gestual (dactilologia)
// =======================================================

// -------------------------------------------------------
// 1. ALFABETO — descrições baseadas na imagem de referência
// -------------------------------------------------------
const LGP_ALPHABET = {
  'A': { desc: 'Punho fechado, polegar estendido ao lado (não por cima)' },
  'B': { desc: '4 dedos juntos para cima, polegar dobrado contra a palma' },
  'C': { desc: 'Mão em forma de C — dedos e polegar curvados' },
  'D': { desc: 'Indicador para cima, polegar + outros dedos formam círculo' },
  'E': { desc: 'Todos os dedos semifechados curvados para baixo, polegar por baixo' },
  'F': { desc: 'Polegar + indicador em OK, 3 dedos estendidos para cima' },
  'G': { desc: 'Indicador e polegar apontam horizontalmente para o lado' },
  'H': { desc: 'Indicador e médio juntos, estendidos horizontalmente' },
  'I': { desc: 'Só o mínimo para cima, outros fechados' },
  'J': { desc: 'Mínimo para cima, traça J no ar (igual a I com movimento)' },
  'K': { desc: 'Indicador e médio em V com polegar entre eles, palma virada' },
  'L': { desc: 'Polegar e indicador formam L a 90°, outros fechados' },
  'M': { desc: '3 dedos (ind+méd+anel) dobrados sobre o polegar fechado' },
  'N': { desc: '2 dedos (ind+médio) dobrados sobre o polegar' },
  'O': { desc: 'Todos os dedos curvados formando um O com o polegar' },
  'P': { desc: 'Indicador aponta para baixo, polegar estendido horizontal' },
  'R': { desc: 'Indicador cruzado por cima do médio (entrelaçados)' },
  'S': { desc: 'Punho fechado, polegar por cima/frente dos dedos dobrados' },
  'T': { desc: 'Polegar sai entre o indicador e o médio, punho semi-fechado' },
  'U': { desc: 'Indicador e médio juntos e paralelos, apontados para cima' },
  'V': { desc: 'Indicador e médio separados em V de vitória' },
  'W': { desc: 'Indicador, médio e anelar estendidos e separados (3 dedos)' },
  'X': { desc: 'Indicador dobrado em gancho/anzol, outros fechados' },
  'Y': { desc: 'Polegar e mínimo estendidos, outros fechados (shaka 🤙)' },
  'Z': { desc: 'Indicador estendido para cima, traça Z no ar' },
};

// -------------------------------------------------------
// 2. PALAVRAS (4 letras, português)
// -------------------------------------------------------
const WORD_LIST = [
  'CASA','MAPA','BOLA','VELA','FACA','GATO','MESA','LAGO','PATO','ROSA',
  'TIPO','CANO','DEDO','RATO','LOBO','BOTO','FADO','RODA','PELE','NADA',
  'BOCA','POVO','LADO','MODO','ONDA','CABO','RAMO','PICO','VALE','HORA',
  'CEDO','DUNA','GUIA','ILHA','LIMA','MOLE','NORA','OBRA','SACO','TACO',
  'VAGA','ZONA','ALMA','CAMA','DATA','ERVA','FIGO','GADO','JOIA','REMO',
  'SELA','TELA','ARCO','BICO','CUCO','DADO','FARO','GELO','HERA','LAMA',
  'MINA','NUCA','PELO','RABO','SAGA','TEIA','VIDA','ATUM','BAGO','CANA',
  'DOCA','FENO','GEMA','LOJA','MATO','ANEL','AMOR','FINO','RICO','VIVO',
];

// -------------------------------------------------------
// 3. CLASSIFICADOR — baseado na imagem de referência
//
// MediaPipe devolve 21 landmarks normalizados [0..1]:
//   0=pulso  1-4=polegar  5-8=indicador  9-12=médio
//   13-16=anelar  17-20=mínimo
//
// tip  = ponta do dedo  (4,8,12,16,20)
// pip  = 2ª articulação (3,6,10,14,18)
// mcp  = base do dedo   (2,5, 9,13,17)
// -------------------------------------------------------
class GestureClassifier {

  _f(lm) {
    // --- Extensão de cada dedo (1=estendido, 0=dobrado) ---
    // Polegar: compara X (câmara espelhada — mão direita do utilizador)
    const thumbExt = lm[4].x < lm[2].x ? 1 : 0;

    // Restantes dedos: ponta acima da articulação PIP = estendido
    const idxExt  = lm[8].y  < lm[6].y  ? 1 : 0;
    const midExt  = lm[12].y < lm[10].y ? 1 : 0;
    const ringExt = lm[16].y < lm[14].y ? 1 : 0;
    const pinkExt = lm[20].y < lm[18].y ? 1 : 0;

    // --- Curvatura extra (ponta abaixo da base MCP = muito dobrado) ---
    const idxCurl  = lm[8].y  > lm[5].y  ? 1 : 0;
    const midCurl  = lm[12].y > lm[9].y  ? 1 : 0;
    const ringCurl = lm[16].y > lm[13].y ? 1 : 0;
    const pinkCurl = lm[20].y > lm[17].y ? 1 : 0;

    // --- Distâncias normalizadas entre pontas ---
    const d = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
    const palmSize      = d(lm[0], lm[9]);        // referência de escala
    const thumbIdxDist  = d(lm[4], lm[8])  / palmSize;
    const thumbMidDist  = d(lm[4], lm[12]) / palmSize;
    const idxMidDist    = d(lm[8], lm[12]) / palmSize;
    const idxRingDist   = d(lm[8], lm[16]) / palmSize;
    const midRingDist   = d(lm[12],lm[16]) / palmSize;
    const thumbIdxRaw   = d(lm[4], lm[8]);

    // --- Orientação (dedo indicador horizontal vs vertical) ---
    const idxDX = Math.abs(lm[8].x - lm[5].x);
    const idxDY = Math.abs(lm[8].y - lm[5].y);
    const idxHorizontal = idxDX > idxDY;   // indicador mais horizontal

    // --- Polegar sobre os dedos (S) vs ao lado (A) ---
    const thumbAboveIdx = lm[4].y < lm[8].y && lm[4].y < lm[6].y;
    const thumbSideOfIdx = Math.abs(lm[4].x - lm[5].x) < 0.07;

    return {
      ext: [thumbExt, idxExt, midExt, ringExt, pinkExt],
      curl: [idxCurl, midCurl, ringCurl, pinkCurl],
      thumbIdxDist, thumbMidDist, idxMidDist, idxRingDist, midRingDist,
      thumbIdxRaw, idxHorizontal, thumbAboveIdx, thumbSideOfIdx,
      palmSize,
    };
  }

  classifyLetter(lm) {
    if (!lm || lm.length < 21) return null;
    const f = this._f(lm);
    const [th, ix, mi, ri, pk] = f.ext;
    const [ic, mc, rc, pc]     = f.curl;

    // Atalhos booleanos
    const allFingersOpen   =  ix &&  mi &&  ri &&  pk;
    const allFingersClosed = !ix && !mi && !ri && !pk;
    const onlyIndex        =  ix && !mi && !ri && !pk;
    const onlyPinky        = !ix && !mi && !ri &&  pk;
    const indexMiddle      =  ix &&  mi && !ri && !pk;
    const indexMiddleRing  =  ix &&  mi &&  ri && !pk;
    const thumbPinky       =  th && !ix && !mi && !ri &&  pk;

    // -------------------------------------------------------
    // CLASSIFICAÇÃO LETRA A LETRA (ordem de prioridade)
    // -------------------------------------------------------

    // S — punho fechado, polegar POR CIMA/FRENTE dos dedos (thumbAboveIdx)
    // Imagem: punho fechado, polegar dobrado à frente
    if (allFingersClosed && f.thumbAboveIdx && f.thumbIdxDist < 0.35)
      return 'S';

    // A — punho fechado, polegar estendido AO LADO (não por cima)
    // Imagem: punho, polegar saliente para o lado
    if (allFingersClosed && th && !f.thumbAboveIdx)
      return 'A';

    // A sem polegar estendido detetado (margem)
    if (allFingersClosed && !th)
      return 'A';

    // B — 4 dedos juntos estendidos para cima, polegar dobrado à palma
    // idxMidDist pequena = dedos juntos
    if (allFingersOpen && !th && f.idxMidDist < 0.18 && f.midRingDist < 0.18)
      return 'B';

    // D — só indicador, polegar toca nos outros formando círculo
    // Imagem: indicador para cima, polegar+médio+anelar+mínimo em arco
    if (onlyIndex && th && f.thumbMidDist < 0.45)
      return 'D';

    // D sem polegar detetado
    if (onlyIndex && !th && f.thumbIdxDist > 0.3)
      return 'D';

    // I — só mínimo estendido
    if (onlyPinky && !th)
      return 'I';

    // Y — polegar + mínimo (shaka)
    if (thumbPinky)
      return 'Y';

    // L — polegar + indicador em L (90°), outros fechados
    // Imagem: L claro com polegar horizontal e indicador vertical
    if (th && onlyIndex && f.thumbIdxDist > 0.4)
      return 'L';

    // O — todos os dedos curvados formando O com polegar
    // Imagem: todos curvados, ponta do polegar toca nas pontas
    if (f.thumbIdxDist < 0.2 && !ix && !mi && !ri && !pk)
      return 'O';

    // F — polegar+indicador em OK, outros 3 dedos estendidos
    // Imagem: círculo com polegar+indicador, médio+anelar+mínimo estendidos
    if (f.thumbIdxDist < 0.25 && mi && ri && pk)
      return 'F';

    // C — forma de C, nenhum dedo totalmente estendido nem fechado
    // Imagem: mão curvada em C, todos semi-curvados
    if (!ix && !mi && !ri && !pk && !th
        && f.thumbIdxDist > 0.25 && f.thumbIdxDist < 0.6)
      return 'C';

    // E — todos os dedos dobrados para baixo, polegar por baixo
    // Imagem: todos curvados mas não punho fechado; polegar por baixo
    if (ic && mc && rc && pc && !th && f.thumbIdxDist > 0.2)
      return 'E';

    // R — indicador cruzado COM o médio (entrelaçados), muito juntos
    // Imagem: indicador e médio cruzados
    if (indexMiddle && !th && f.idxMidDist < 0.08)
      return 'R';

    // U — indicador e médio juntos paralelos para cima
    if (indexMiddle && !th && f.idxMidDist < 0.18)
      return 'U';

    // V — indicador e médio separados em V
    if (indexMiddle && !th && f.idxMidDist >= 0.18)
      return 'V';

    // K — indicador e médio em V, polegar entre eles
    // Imagem: V com polegar a tocar entre os dois dedos
    if (th && indexMiddle && !ri && !pk && f.idxMidDist > 0.15)
      return 'K';

    // W — 3 dedos estendidos e separados
    // Imagem: indicador+médio+anelar separados, mínimo e polegar fechados
    if (indexMiddleRing && !pk && !th && f.idxRingDist > 0.2)
      return 'W';

    // X — indicador dobrado em gancho (curvado), outros fechados
    // Imagem: indicador em gancho/anzol, outros fechados
    if (!mi && !ri && !pk && !th && !ix && ic)
      return 'X';

    // H — indicador e médio estendidos HORIZONTALMENTE e juntos
    // Imagem: dois dedos apontados para o lado
    if (indexMiddle && !th && f.idxMidDist < 0.18 && f.idxHorizontal)
      return 'H';

    // G — indicador e polegar apontam horizontalmente para o lado
    // Imagem: indicador + polegar horizontais como uma pistola
    if (onlyIndex && th && f.idxHorizontal && f.thumbIdxDist > 0.2)
      return 'G';

    // P — indicador aponta para baixo com polegar estendido
    if (onlyIndex && th && lm[8].y > lm[5].y)
      return 'P';

    // T — polegar entre indicador e médio
    // Imagem: polegar aparece entre ind e médio, punho semi-fechado
    if (th && !ix && !mi && !ri && !pk && f.thumbIdxRaw < 0.08)
      return 'T';

    // M — 3 dedos (ind+méd+anel) dobrados sobre polegar
    if (!ix && !mi && !ri && th && !pk && ic && mc && rc)
      return 'M';

    // N — 2 dedos (ind+médio) dobrados sobre polegar
    if (!ix && !mi && ri && th && !pk && ic && mc)
      return 'N';

    return null;
  }

  // Mão esquerda — polegar para cima = confirmar 👍
  classifyConfirm(lm) {
    if (!lm || lm.length < 21) return false;
    const f = this._f(lm);
    const [th, ix, mi, ri, pk] = f.ext;
    return th && !ix && !mi && !ri && !pk;
  }
}

// -------------------------------------------------------
// 4. MOTOR DO JOGO — estilo TERMO
// -------------------------------------------------------
class LGPGame {
  constructor() {
    this.clf      = new GestureClassifier();
    this.words    = this._shuffle([...WORD_LIST]);
    this.wIdx     = 0;

    this.target       = '';
    this.currentGuess = ['','','',''];
    this.activeSlot   = 0;
    this.allGuesses   = [];
    this.MAX_TRIES    = 6;

    this.HOLD_MS      = 1100;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;

    this.lockedOut       = false;
    this.confirmCooldown = false;

    this.gameOver = false;
    this.round    = 1;
    this.score    = 0;
    this.streak   = 0;
    this.history  = [];

    this.fpsCount = 0;
    this.fpsTimer = 0;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  newWord() {
    this.target       = this.words[this.wIdx % this.words.length];
    this.wIdx++;
    this.currentGuess = ['','','',''];
    this.activeSlot   = 0;
    this.allGuesses   = [];
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = false;
    this.confirmCooldown = false;
    this.gameOver     = false;

    document.getElementById('wrongBar').classList.remove('show');
    this._renderBoard();
    this._highlightAlphabet(null);
    this._updateConfirmBar(0, false);
    this._resetGestureDisplay();
    this._updateStats();
  }

  processFrame(handsData, ts) {
    this.fpsCount++;
    if (ts - this.fpsTimer >= 1000) {
      document.getElementById('fpsLabel').textContent = `${this.fpsCount} fps`;
      this.fpsCount = 0;
      this.fpsTimer = ts;
    }

    if (this.gameOver) return;

    let rightHand = null, leftHand = null;
    for (const h of handsData) {
      if (h.label === 'Right') rightHand = h.landmarks;
      if (h.label === 'Left')  leftHand  = h.landmarks;
    }

    // Anti-repetição
    if (this.lockedOut) {
      if (!rightHand) {
        this.lockedOut = false;
        this._resetGestureDisplay();
      } else {
        document.getElementById('gestureName').textContent  = '⏳ Retira a mão direita e mostra o próximo gesto';
        document.getElementById('confirmLabel').textContent = 'Afasta a mão para continuar...';
        document.getElementById('confirmLabel').style.color = 'var(--accent2)';
      }
      return;
    }

    if (!rightHand) { this._resetGestureDisplay(); return; }

    const gesture = this.clf.classifyLetter(rightHand);

    if (!gesture) { this._resetGestureDisplay(); return; }

    // Atualiza UI
    document.getElementById('gestureEmoji').textContent = gesture;
    document.getElementById('gestureName').textContent  = LGP_ALPHABET[gesture].desc;
    document.getElementById('gestureOverlay').textContent = `Gesto: ${gesture}`;
    document.getElementById('gestureOverlay').classList.add('show');
    this._highlightAlphabet(gesture);
    this._previewSlot(this.activeSlot, gesture);

    // Hold
    if (gesture !== this.holdGesture) {
      this.holdGesture  = gesture;
      this.holdStart    = ts;
      this.holdProgress = 0;
      this.letterReady  = false;
    } else {
      this.holdProgress = Math.min(100, ((ts - this.holdStart) / this.HOLD_MS) * 100);
    }
    if (this.holdProgress >= 100) this.letterReady = true;
    this._updateConfirmBar(this.holdProgress, this.letterReady);

    // Confirmação pela mão esquerda 👍
    if (this.letterReady && leftHand && !this.confirmCooldown) {
      if (this.clf.classifyConfirm(leftHand)) {
        this._confirmCurrentLetter();
      }
    }
  }

  _confirmCurrentLetter() {
    if (this.activeSlot >= 4) return;
    const letter = this.holdGesture;
    if (!letter) return;

    this.currentGuess[this.activeSlot] = letter;
    this._solidifySlot(this.activeSlot, letter);
    this.activeSlot++;

    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = true;

    this.confirmCooldown = true;
    setTimeout(() => { this.confirmCooldown = false; }, 1200);

    this._updateConfirmBar(0, false);
    showToast(`✅ "${letter}" confirmada! (${this.activeSlot}/4)`);

    if (this.activeSlot >= 4) {
      this.lockedOut = false;
      setTimeout(() => this._checkGuess(), 500);
    }
  }

  _checkGuess() {
    const guess  = this.currentGuess.join('');
    const colors = this._calcColors(guess, this.target);
    this.allGuesses.push({ letters: [...this.currentGuess], colors });
    this._animateGuessRow(this.allGuesses.length - 1, colors);

    if (guess === this.target) {
      const pts = Math.max(10, 100 - (this.allGuesses.length - 1) * 15);
      this.score  += pts;
      this.streak++;
      this.round++;
      this.history.unshift({ word: this.target, result: 'win', tries: this.allGuesses.length });
      this._updateStats();
      this._renderHistory();
      this.gameOver = true;
      setTimeout(() => showResult(true, this.target, this.allGuesses.length, pts), 900);
    } else if (this.allGuesses.length >= this.MAX_TRIES) {
      this.streak = 0;
      this.history.unshift({ word: this.target, result: 'lose', tries: this.allGuesses.length });
      this._updateStats();
      this._renderHistory();
      this.gameOver = true;
      setTimeout(() => showResult(false, this.target, this.allGuesses.length, 0), 900);
    } else {
      setTimeout(() => {
        this.currentGuess    = ['','','',''];
        this.activeSlot      = 0;
        this.holdGesture     = null;
        this.holdProgress    = 0;
        this.letterReady     = false;
        this.lockedOut       = false;
        this.confirmCooldown = false;
        document.getElementById('wrongBar').classList.remove('show');
        this._updateActiveRow();
      }, 800);
    }
    this._updateStats();
  }

  _calcColors(guess, target) {
    const colors = ['grey','grey','grey','grey'];
    const tArr   = target.split('');
    const used   = [false,false,false,false];

    for (let i = 0; i < 4; i++) {
      if (guess[i] === tArr[i]) { colors[i] = 'green'; used[i] = true; }
    }
    for (let i = 0; i < 4; i++) {
      if (colors[i] === 'green') continue;
      for (let j = 0; j < 4; j++) {
        if (!used[j] && guess[i] === tArr[j]) {
          colors[i] = 'yellow'; used[j] = true; break;
        }
      }
    }
    return colors;
  }

  // ---- Tabuleiro ----

  _renderBoard() {
    const board = document.getElementById('letterTrack');
    board.innerHTML = '';
    board.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:center;';

    for (let row = 0; row < this.MAX_TRIES; row++) {
      const rowEl = document.createElement('div');
      rowEl.id = `row-${row}`;
      rowEl.style.cssText = 'display:flex;gap:8px;';

      for (let col = 0; col < 4; col++) {
        const cell = document.createElement('div');
        cell.id = `cell-${row}-${col}`;
        cell.style.cssText = `
          width:70px;height:70px;border-radius:12px;
          border:2px solid var(--border2);background:var(--surface);
          display:flex;align-items:center;justify-content:center;
          font-size:2rem;font-weight:800;font-family:'Syne',sans-serif;
          color:var(--text);transition:all 0.25s;position:relative;
        `;
        const num = document.createElement('div');
        num.style.cssText = 'position:absolute;top:4px;right:7px;font-size:0.52rem;font-family:\'Space Mono\',monospace;color:var(--text2);';
        num.textContent = col + 1;

        const span = document.createElement('span');
        span.id = `cell-letter-${row}-${col}`;

        cell.appendChild(num);
        cell.appendChild(span);
        rowEl.appendChild(cell);
      }
      board.appendChild(rowEl);
    }

    document.getElementById('progressDots').innerHTML = '';
    this._updateActiveRow();
  }

  _updateActiveRow() {
    const row = this.allGuesses.length;
    for (let r = 0; r < this.MAX_TRIES; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.getElementById(`cell-${r}-${c}`);
        if (!cell) continue;
        if (r === row) {
          cell.style.borderColor = 'var(--accent)';
          cell.style.background  = 'rgba(124,106,247,0.06)';
        } else if (r > row) {
          cell.style.borderColor = 'var(--border2)';
          cell.style.background  = 'var(--surface)';
        }
      }
    }
  }

  _previewSlot(col, letter) {
    const row  = this.allGuesses.length;
    const span = document.getElementById(`cell-letter-${row}-${col}`);
    if (span) { span.textContent = letter; span.style.color = 'var(--text2)'; span.style.opacity = '0.6'; }
  }

  _solidifySlot(col, letter) {
    const row  = this.allGuesses.length;
    const cell = document.getElementById(`cell-${row}-${col}`);
    const span = document.getElementById(`cell-letter-${row}-${col}`);
    if (span) { span.textContent = letter; span.style.color = 'var(--text)'; span.style.opacity = '1'; }
    if (cell) {
      cell.style.borderColor = 'rgba(124,106,247,0.6)';
      cell.style.background  = 'rgba(124,106,247,0.12)';
      cell.style.transform   = 'scale(1.09)';
      setTimeout(() => { cell.style.transform = 'scale(1)'; }, 160);
    }
  }

  _animateGuessRow(rowIdx, colors) {
    const map = {
      green : { bg:'rgba(93,200,160,0.22)',  border:'var(--success)', text:'var(--success)' },
      yellow: { bg:'rgba(247,198,106,0.22)', border:'var(--accent2)', text:'var(--accent2)' },
      grey  : { bg:'rgba(80,80,120,0.18)',   border:'rgba(120,120,160,0.35)', text:'var(--text2)' },
    };
    colors.forEach((color, col) => {
      setTimeout(() => {
        const cell = document.getElementById(`cell-${rowIdx}-${col}`);
        const span = document.getElementById(`cell-letter-${rowIdx}-${col}`);
        if (!cell) return;
        const c = map[color];
        cell.style.background  = c.bg;
        cell.style.borderColor = c.border;
        if (span) span.style.color = c.text;
        cell.style.transform = 'rotateX(90deg)';
        setTimeout(() => { cell.style.transform = 'rotateX(0deg)'; }, 130);
      }, col * 180);
    });
  }

  _highlightAlphabet(letter) {
    document.querySelectorAll('.lgp-cell').forEach(c => c.classList.remove('highlight'));
    if (letter) { const cell = document.getElementById(`lgp-${letter}`); if (cell) cell.classList.add('highlight'); }
  }

  _updateConfirmBar(pct, ready) {
    const fill  = document.getElementById('confirmFill');
    const label = document.getElementById('confirmLabel');
    fill.style.width      = pct + '%';
    fill.style.background = ready ? 'var(--success)' : 'var(--accent)';
    label.style.color     = '';
    if (ready) {
      label.textContent = '✅ Pronto! Levanta o polegar esquerdo 👍 para confirmar';
      label.style.color = 'var(--success)';
    } else if (pct > 0) {
      label.textContent = `Mantém o gesto... ${Math.round(pct)}%`;
    } else {
      label.textContent = 'Mão direita = letra  |  👍 Mão esquerda = confirmar';
    }
  }

  _resetGestureDisplay() {
    document.getElementById('gestureEmoji').textContent = '—';
    document.getElementById('gestureName').textContent  = 'Nenhum gesto detetado';
    document.getElementById('gestureOverlay').classList.remove('show');
    this._highlightAlphabet(null);
    this._updateConfirmBar(this.holdProgress, this.letterReady);
  }

  _updateStats() {
    document.getElementById('scoreVal').textContent  = this.score;
    document.getElementById('roundVal').textContent  = this.round;
    document.getElementById('streakVal').textContent = this.streak;
  }

  _renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!this.history.length) {
      list.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:0.72rem;color:var(--text2)">Nenhum jogo ainda...</div>';
      return;
    }
    this.history.slice(0, 8).forEach(h => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<span class="history-word">${h.word}</span>
        <span class="history-attempts">${h.tries}x</span>
        <span class="history-badge ${h.result === 'win' ? 'win' : 'skip'}">
          ${h.result === 'win' ? '✓ Ganhou' : '✗ Perdeu'}</span>`;
      list.appendChild(item);
    });
  }

  nextWord()  { this.newWord(); }
  skipWord()  {
    this.streak = 0;
    this.history.unshift({ word: this.target, result: 'skip', tries: this.allGuesses.length });
    this.round++;
    this._updateStats();
    this._renderHistory();
    this.newWord();
    showToast('Palavra saltada');
  }
  resetWord() {
    this.currentGuess    = ['','','',''];
    this.activeSlot      = 0;
    this.holdGesture     = null;
    this.holdStart       = null;
    this.holdProgress    = 0;
    this.letterReady     = false;
    this.lockedOut       = false;
    this.confirmCooldown = false;
    const row = this.allGuesses.length;
    for (let c = 0; c < 4; c++) {
      const cell = document.getElementById(`cell-${row}-${c}`);
      const span = document.getElementById(`cell-letter-${row}-${c}`);
      if (span) span.textContent = '';
      if (cell) { cell.style.background = 'rgba(124,106,247,0.06)'; cell.style.borderColor = 'var(--accent)'; }
    }
    this._updateConfirmBar(0, false);
    this._resetGestureDisplay();
    showToast('Linha reiniciada');
  }
}

// -------------------------------------------------------
// 5. MEDIAPIPE
// -------------------------------------------------------
let handsModel, game;

async function initMediaPipe() {
  handsModel = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  handsModel.setOptions({
    maxNumHands: 2, modelComplexity: 1,
    minDetectionConfidence: 0.75, minTrackingConfidence: 0.60,
  });

  const canvas = document.getElementById('canvasEl');
  const ctx    = canvas.getContext('2d');

  handsModel.onResults(results => {
    const video = document.getElementById('videoEl');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const ts = performance.now();
    const handsData = [];

    if (results.multiHandLandmarks?.length > 0) {
      results.multiHandLandmarks.forEach((lm, i) => {
        const label   = results.multiHandedness[i].label;
        const isRight = label === 'Right';
        handsData.push({ label, landmarks: lm });

        drawConnectors(ctx, lm, HAND_CONNECTIONS, {
          color: isRight ? 'rgba(124,106,247,0.65)' : 'rgba(93,200,160,0.65)', lineWidth: 2,
        });
        drawLandmarks(ctx, lm, {
          color: isRight ? '#a89ff9' : '#5dc8a0', lineWidth: 1, radius: 4,
        });

        ctx.fillStyle = isRight ? '#a89ff9' : '#5dc8a0';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(
          isRight ? '✋ Letra (direita)' : '👍 Confirmar (esquerda)',
          lm[0].x * canvas.width - 40,
          lm[0].y * canvas.height - 14
        );
      });

      document.getElementById('statusDot').className    = 'status-dot detecting';
      document.getElementById('statusText').textContent =
        `${handsData.length} mão${handsData.length > 1 ? 's' : ''} detetada${handsData.length > 1 ? 's' : ''}`;
    } else {
      document.getElementById('statusDot').className    = 'status-dot active';
      document.getElementById('statusText').textContent = 'À procura de mãos...';
    }

    if (game) game.processFrame(handsData, ts);
    ctx.restore();
  });
}

async function startCamera() {
  const video = document.getElementById('videoEl');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }, audio: false,
    });
    video.srcObject = stream;
    await video.play();
    document.getElementById('camPlaceholder').style.display = 'none';
    document.getElementById('statusDot').className           = 'status-dot active';
    document.getElementById('statusText').textContent        = 'Câmara ativa';

    const cam = new Camera(video, {
      onFrame: async () => { await handsModel.send({ image: video }); },
      width: 640, height: 480,
    });
    cam.start();
  } catch (err) {
    document.getElementById('statusText').textContent = '❌ ' + err.message;
    showToast('Erro na câmara: ' + err.message);
  }
}

// -------------------------------------------------------
// 6. UI
// -------------------------------------------------------
function buildAlphabetGrid() {
  const grid = document.getElementById('lgpGrid');
  grid.innerHTML = '';
  Object.entries(LGP_ALPHABET).forEach(([letter, info]) => {
    const cell = document.createElement('div');
    cell.className = 'lgp-cell';
    cell.id        = `lgp-${letter}`;
    cell.title     = info.desc;
    // Mostra letra grande + 1ª parte da descrição
    const shortDesc = info.desc.split(',')[0].replace('Punho','P.').replace('dedos','ded.').replace('estendido','ext.').replace('dobrado','dob.');
    cell.innerHTML = `
      <div class="lgp-hand" style="font-size:1.15rem;font-weight:800;font-family:'Syne',sans-serif;line-height:1">${letter}</div>
      <div class="lgp-char" style="font-size:0.48rem;line-height:1.2;margin-top:2px">${shortDesc}</div>`;
    grid.appendChild(cell);
  });
}

function updateSwipeIndicator() {
  const el = document.getElementById('swipeIndicator');
  if (el) el.innerHTML = '<span>👍</span><span>Mão esquerda confirma</span>';
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function showSwipeHint(e) {
  const h = document.getElementById('swipeHint');
  if (!h) return;
  h.textContent = e; h.classList.add('show');
  setTimeout(() => h.classList.remove('show'), 600);
}

function showResult(correct, word, tries, points) {
  document.getElementById('resultEmoji').textContent    = correct ? (tries <= 2 ? '🏆' : '🎉') : '😔';
  document.getElementById('resultTitle').textContent    = correct ? 'Acertaste!' : 'Fim das tentativas';
  document.getElementById('resultWord').textContent     = word;
  document.getElementById('resultSubtitle').textContent = correct
    ? `Soletrou "${word}" em ${tries} tentativa${tries > 1 ? 's' : ''}! +${points} pontos`
    : `A palavra era "${word}". Melhor sorte na próxima!`;
  document.getElementById('resultOverlay').classList.add('show');
}

function closeResult()      { document.getElementById('resultOverlay').classList.remove('show'); }
function nextWord()         { closeResult(); if (game) game.nextWord(); }
function skipWord()         { if (game) game.skipWord(); }
function resetCurrentWord() { if (game) game.resetWord(); }

async function startGame() {
  document.getElementById('onboard').style.display = 'none';
  buildAlphabetGrid();
  updateSwipeIndicator();
  await initMediaPipe();
  game = new LGPGame();
  game.newWord();
  await startCamera();
}
