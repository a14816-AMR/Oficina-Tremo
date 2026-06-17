// =======================================================
// game.js — LGP Palavras v7
// UI: bolhas minimalistas na câmara, sem caixa de gesto,
//     alfabeto só referência (sem botões de clique),
//     som da letra ao confirmar
// =======================================================

// -------------------------------------------------------
// 1. ALFABETO LGP
// -------------------------------------------------------
const LGP_ALPHABET = {
  'A': { desc: 'Punho fechado, polegar estendido ao lado' },
  'B': { desc: '4 dedos juntos para cima, polegar dobrado' },
  'C': { desc: 'Mão em forma de C — dedos e polegar curvados' },
  'D': { desc: 'Indicador para cima, outros dedos formam arco' },
  'E': { desc: 'Dedos curvados para baixo, polegar por baixo' },
  'F': { desc: 'Polegar + indicador em OK, 3 dedos estendidos' },
  'G': { desc: 'Indicador e polegar horizontais para o lado' },
  'H': { desc: 'Indicador e médio juntos, horizontalmente' },
  'I': { desc: 'Só o mínimo para cima, outros fechados' },
  'J': { desc: 'Mínimo para cima, traça J no ar' },
  'K': { desc: 'Indicador e médio em V com polegar entre eles' },
  'L': { desc: 'Polegar e indicador formam L a 90°' },
  'M': { desc: '3 dedos dobrados sobre o polegar fechado' },
  'N': { desc: '2 dedos dobrados sobre o polegar' },
  'O': { desc: 'Todos os dedos curvados formando um O' },
  'P': { desc: 'Indicador aponta para baixo, polegar estendido' },
  'R': { desc: 'Indicador cruzado por cima do médio' },
  'S': { desc: 'Punho fechado, polegar por cima dos dedos' },
  'T': { desc: 'Polegar sai entre o indicador e o médio' },
  'U': { desc: 'Indicador e médio juntos para cima' },
  'V': { desc: 'Indicador e médio separados em V' },
  'W': { desc: 'Indicador, médio e anelar estendidos e separados' },
  'X': { desc: 'Indicador dobrado em gancho/anzol' },
  'Y': { desc: 'Polegar e mínimo estendidos (shaka)' },
  'Z': { desc: 'Indicador estendido, traça Z no ar' },
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
// 3. CLASSIFICADOR DE GESTOS
// -------------------------------------------------------
class GestureClassifier {
  constructor() {
    this.history      = [];
    this.HISTORY_SIZE = 5;
  }

  _features(lm) {
    const d        = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const palmSize = d(lm[0], lm[9]) || 0.001;

    const tipIds = [4, 8, 12, 16, 20];
    const mcpIds = [2, 5,  9, 13, 17];
    const pipIds = [3, 6, 10, 14, 18];

    // Extensão: ponta mais longe do pulso que base × 1.15
    const ext = [];
    for (let i = 0; i < 5; i++) {
      ext.push(d(lm[tipIds[i]], lm[0]) > d(lm[mcpIds[i]], lm[0]) * 1.15 ? 1 : 0);
    }

    // Curvatura: ponta mais perto do pulso que PIP
    const curl = [];
    for (let i = 1; i < 5; i++) {
      curl.push(d(lm[tipIds[i]], lm[0]) < d(lm[pipIds[i]], lm[0]) * 0.95 ? 1 : 0);
    }

    const thumbIdx  = d(lm[4], lm[8])   / palmSize;
    const thumbMid  = d(lm[4], lm[12])  / palmSize;
    const idxMid    = d(lm[8], lm[12])  / palmSize;
    const idxRing   = d(lm[8], lm[16])  / palmSize;
    const midRing   = d(lm[12], lm[16]) / palmSize;

    const idxDX = Math.abs(lm[8].x - lm[5].x);
    const idxDY = Math.abs(lm[8].y - lm[5].y);
    const idxAngle     = Math.atan2(idxDY, idxDX) * 180 / Math.PI;
    const thumbAbove   = lm[4].y < lm[5].y - 0.02;
    const thumbBetween = lm[4].x > Math.min(lm[6].x, lm[10].x) - 0.04 &&
                         lm[4].x < Math.max(lm[6].x, lm[10].x) + 0.04 &&
                         Math.abs(lm[4].y - lm[6].y) < 0.08;

    return { ext, curl, thumbIdx, thumbMid, idxMid, idxRing, midRing,
             idxAngle, thumbAbove, thumbBetween, palmSize };
  }

  _scoreAll(f) {
    const [th, ix, mi, ri, pk] = f.ext;
    const [ic, mc, rc, pc]     = f.curl;
    const scores = {};

    const allOpen      =  ix &&  mi &&  ri &&  pk;
    const allClosed    = !ix && !mi && !ri && !pk;
    const onlyIdx      =  ix && !mi && !ri && !pk;
    const onlyPink     = !ix && !mi && !ri &&  pk;
    const idxMidUp     =  ix &&  mi && !ri && !pk;
    const idxMidRingUp =  ix &&  mi &&  ri && !pk;

    scores.A = (allClosed && !f.thumbAbove) ? 0.9 + (th ? 0.1 : 0) : 0;
    scores.S = (allClosed && f.thumbAbove) ? 1.0 : 0;
    scores.B = (allOpen && !th) ? Math.max(0, 1 - f.idxMid * 3) * Math.max(0, 1 - f.midRing * 3) : 0;
    scores.D = (onlyIdx && f.idxAngle > 45) ? (f.thumbMid < 0.6 ? 0.95 : 0.6) : 0;
    scores.I = (onlyPink && !th) ? 0.95 : 0;
    scores.Y = (th && !ix && !mi && !ri && pk) ? 0.95 : 0;
    scores.L = (th && onlyIdx && f.thumbIdx > 0.6) ? Math.min(1, f.thumbIdx / 0.9) : 0;
    scores.O = (allClosed && f.thumbIdx < 0.35 && !f.thumbAbove) ? Math.max(0, 1 - f.thumbIdx * 2) : 0;
    scores.F = (f.thumbIdx < 0.35 && mi && ri && pk && !ix) ? Math.max(0, 1 - f.thumbIdx * 2) : 0;
    scores.C = (!ix && !mi && !ri && !pk && !th && f.thumbIdx > 0.35 && f.thumbIdx < 0.85 && !ic) ? 0.7 : 0;
    scores.E = (ic && mc && rc && pc && !f.thumbAbove && f.thumbIdx > 0.3) ? 0.65 : 0;
    scores.R = (idxMidUp && f.idxMid < 0.18) ? Math.max(0, 1 - f.idxMid * 5) : 0;
    scores.U = (idxMidUp && f.idxMid >= 0.18 && f.idxMid < 0.4 && !th) ? 0.85 : 0;
    scores.V = (idxMidUp && f.idxMid >= 0.4 && !th) ? Math.min(1, f.idxMid) : 0;
    scores.K = (th && idxMidUp && f.idxMid >= 0.3) ? 0.8 : 0;
    scores.W = (idxMidRingUp && !pk && !th && f.idxRing > 0.45) ? 0.85 : 0;
    scores.X = (!mi && !ri && !pk && !th && !ix && ic) ? 0.75 : 0;
    scores.H = (idxMidUp && f.idxMid < 0.4 && f.idxAngle < 40) ? 0.8 : 0;
    scores.G = (onlyIdx && th && f.idxAngle < 40 && f.thumbIdx > 0.4) ? 0.8 : 0;
    scores.P = (onlyIdx && th && f.idxAngle > 45 && f.thumbMid >= 0.6) ? 0.6 : 0;
    scores.T = (allClosed && f.thumbBetween) ? 0.75 : 0;
    scores.M = (!ix && !mi && !ri && th && !pk && ic && mc && rc && !f.thumbAbove) ? 0.6 : 0;
    scores.N = (!ix && !mi && ri && th && !pk && ic && mc && !f.thumbAbove) ? 0.6 : 0;

    return scores;
  }

  classifyLetter(lm) {
    if (!lm || lm.length < 21) { this.history = []; return null; }
    const f      = this._features(lm);
    const scores = this._scoreAll(f);

    let best = null, bestScore = 0;
    for (const [letter, score] of Object.entries(scores)) {
      if (score > bestScore) { bestScore = score; best = letter; }
    }
    if (bestScore < 0.45) { this.history = []; return null; }

    this.history.push(best);
    if (this.history.length > this.HISTORY_SIZE) this.history.shift();

    const counts = {};
    this.history.forEach(l => counts[l] = (counts[l] || 0) + 1);
    let stable = best, stableCount = 0;
    for (const [l, c] of Object.entries(counts)) {
      if (c > stableCount) { stableCount = c; stable = l; }
    }
    return stable;
  }

  classifyConfirm(lm) {
    if (!lm || lm.length < 21) return false;
    const f = this._features(lm);
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

    // Estado visual de cada letra no alfabeto
    this.letterStates = {};

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
    this.letterStates = {};

    document.getElementById('wrongBar').classList.remove('show');
    this._renderBoard();
    this._highlightAlphabet(null);
    this._updateAlphabetStates();
    this._updateBubble(0, false);
    this._resetBubble();
    this._updateStats();
  }

  // ---- processFrame ----
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

    // Anti-repetição: aguarda mão direita sair
    if (this.lockedOut) {
      if (!rightHand) {
        this.lockedOut = false;
        this._resetBubble();
      }
      // bolha esquerda: mostra seta de "retira a mão"
      const bl = document.getElementById('bubbleLetter');
      if (bl) bl.textContent = '↺';
      return;
    }

    if (!rightHand) { this._resetBubble(); return; }

    const gesture = this.clf.classifyLetter(rightHand);
    if (!gesture) { this._resetBubble(); return; }

    // Atualiza bolha esquerda com a letra
    const bl = document.getElementById('bubbleLetter');
    if (bl) bl.textContent = gesture;

    // Destaca no alfabeto
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
    this._updateBubble(this.holdProgress, this.letterReady);

    // Confirmação pela mão esquerda 👍
    if (this.letterReady && leftHand && !this.confirmCooldown) {
      if (this.clf.classifyConfirm(leftHand)) {
        this._confirmLetter();
      }
    }
  }

  _confirmLetter() {
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

    // 🔊 Som da letra
    speakLetter(letter);

    // Flash de confirmação na bolha direita
    const cb = document.getElementById('camConfirmBubble');
    if (cb) {
      cb.textContent = '✅';
      cb.classList.add('show', 'flash');
      setTimeout(() => {
        cb.classList.remove('flash');
        cb.textContent = '👍';
      }, 600);
    }

    this._updateBubble(0, false);
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

    // Atualiza estados das letras (prioridade: green > yellow > grey)
    const priority = { green: 3, yellow: 2, grey: 1 };
    for (let i = 0; i < 4; i++) {
      const letter  = this.currentGuess[i];
      const color   = colors[i];
      const current = this.letterStates[letter];
      if ((priority[color] || 0) > (priority[current] || 0)) {
        this.letterStates[letter] = color;
      }
    }
    this._updateAlphabetStates();

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
          width:68px;height:68px;border-radius:12px;
          border:2px solid var(--border2);background:var(--surface);
          display:flex;align-items:center;justify-content:center;
          font-size:1.9rem;font-weight:800;font-family:'Syne',sans-serif;
          color:var(--text);transition:all 0.25s;position:relative;
        `;
        const num = document.createElement('div');
        num.style.cssText = 'position:absolute;top:4px;right:6px;font-size:0.5rem;font-family:\'Space Mono\',monospace;color:var(--text2);';
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
    if (span) { span.textContent = letter; span.style.color = 'var(--text2)'; span.style.opacity = '0.55'; }
  }

  _solidifySlot(col, letter) {
    const row  = this.allGuesses.length;
    const cell = document.getElementById(`cell-${row}-${col}`);
    const span = document.getElementById(`cell-letter-${row}-${col}`);
    if (span) { span.textContent = letter; span.style.color = 'var(--text)'; span.style.opacity = '1'; }
    if (cell) {
      cell.style.borderColor = 'rgba(124,106,247,0.6)';
      cell.style.background  = 'rgba(124,106,247,0.12)';
      cell.style.transform   = 'scale(1.08)';
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

  // ---- Bolhas minimalistas na câmara ----

  // Atualiza o anel de progresso e visibilidade das bolhas
  _updateBubble(pct, ready) {
    const bubble  = document.getElementById('camLetterBubble');
    const ringEl  = document.getElementById('ringFill');
    const confirm = document.getElementById('camConfirmBubble');

    // Circunferência do círculo r=24: 2π×24 ≈ 150.8
    const CIRC  = 150.8;
    const offset = CIRC - (pct / 100) * CIRC;

    if (ringEl) ringEl.style.strokeDashoffset = offset;

    if (bubble) {
      if (pct > 0 || ready) bubble.classList.add('show');
      else                  bubble.classList.remove('show');
      bubble.classList.toggle('ready', ready);
    }

    // Bolha direita 👍 só aparece quando a letra está a 100%
    if (confirm && !confirm.classList.contains('flash')) {
      confirm.classList.toggle('show', ready);
    }
  }

  _resetBubble() {
    const bubble  = document.getElementById('camLetterBubble');
    const bl      = document.getElementById('bubbleLetter');
    const confirm = document.getElementById('camConfirmBubble');
    const ring    = document.getElementById('ringFill');

    if (bubble)  bubble.classList.remove('show', 'ready');
    if (bl)      bl.textContent = '—';
    if (ring)    ring.style.strokeDashoffset = '150.8';
    if (confirm && !confirm.classList.contains('flash')) {
      confirm.classList.remove('show');
    }
    this._highlightAlphabet(null);
  }

  // ---- Alfabeto ----
  _highlightAlphabet(letter) {
    document.querySelectorAll('.lgp-cell').forEach(c => c.classList.remove('highlight'));
    if (letter) {
      const cell = document.getElementById(`lgp-${letter}`);
      if (cell) cell.classList.add('highlight');
    }
  }

  _updateAlphabetStates() {
    Object.keys(LGP_ALPHABET).forEach(letter => {
      const el = document.getElementById(`lgp-${letter}`);
      if (!el) return;
      el.classList.remove('letter-green', 'letter-yellow', 'letter-grey');
      const state = this.letterStates[letter];
      if (state) el.classList.add(`letter-${state}`);
    });
  }

  // ---- Stats & History ----
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
    this._updateBubble(0, false);
    this._resetBubble();
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
          color: isRight ? 'rgba(124,106,247,0.6)' : 'rgba(93,200,160,0.6)', lineWidth: 2,
        });
        drawLandmarks(ctx, lm, {
          color: isRight ? '#a89ff9' : '#5dc8a0', lineWidth: 1, radius: 3,
        });
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
    const isMobile = window.innerWidth <= 800;
    const camW = isMobile ? 480 : 640;
    const camH = isMobile ? 640 : 480;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: camW }, height: { ideal: camH }, facingMode: 'user' },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    document.getElementById('camPlaceholder').style.display = 'none';
    document.getElementById('statusDot').className           = 'status-dot active';
    document.getElementById('statusText').textContent        = 'Câmara ativa';

    const cam = new Camera(video, {
      onFrame: async () => { await handsModel.send({ image: video }); },
      width: camW, height: camH,
    });
    cam.start();
  } catch (err) {
    document.getElementById('statusText').textContent = '❌ ' + err.message;
    showToast('Erro na câmara: ' + err.message);
  }
}

// -------------------------------------------------------
// 6. UI GLOBAL
// -------------------------------------------------------

// Som da letra
function speakLetter(letter) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(letter);
  utter.lang  = 'pt-PT';
  utter.rate  = 0.85;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

// Alfabeto como referência visual (divs, não botões)
function buildAlphabetGrid() {
  const grid = document.getElementById('lgpGrid');
  grid.innerHTML = '';
  Object.entries(LGP_ALPHABET).forEach(([letter, info]) => {
    const cell = document.createElement('div');
    cell.className = 'lgp-cell';
    cell.id        = `lgp-${letter}`;
    cell.title     = info.desc;
    cell.innerHTML = `
      <div class="lgp-hand-svg">${getHandSVG(letter)}</div>
      <div class="lgp-char">${letter}</div>`;
    grid.appendChild(cell);
  });
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
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

// Tema claro/escuro
function initTheme() {
  const saved = (() => { try { return localStorage.getItem('lgp-theme'); } catch(e){ return null; } })();
  applyTheme(saved || 'dark');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('lgp-theme', theme); } catch(e) {}
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️ Claro' : '🌙 Escuro';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// -------------------------------------------------------
// 7. ARRANQUE
// -------------------------------------------------------
async function startGame() {
  document.getElementById('onboard').style.display = 'none';
  buildAlphabetGrid();
  await initMediaPipe();
  game = new LGPGame();
  game.newWord();
  await startCamera();
}

initTheme();
