// =======================================================
// game.js — LGP Palavras v3
// Fluxo: mão direita mostra letra → mantém 1s → barra enche
//        mão esquerda 👍 confirma letra (qualquer das 4)
//        após 4 letras → verificação estilo TERMO
//        verde = letra certa e posição certa
//        amarelo = letra existe mas posição errada
//        cinzento = letra não existe
// =======================================================

// -------------------------------------------------------
// 1. ALFABETO LGP — Dactilologia Portuguesa
// -------------------------------------------------------
const LGP_ALPHABET = {
  'A': { desc: 'Punho fechado, polegar estendido para o lado' },
  'B': { desc: 'Mão aberta, 4 dedos juntos para cima, polegar dobrado' },
  'C': { desc: 'Dedos curvados formando um C, polegar oposto' },
  'D': { desc: 'Indicador reto para cima, polegar toca no médio' },
  'E': { desc: 'Quatro dedos dobrados, polegar dobrado por baixo' },
  'F': { desc: 'Polegar e indicador em círculo, outros estendidos' },
  'G': { desc: 'Indicador e polegar horizontais para o lado' },
  'H': { desc: 'Indicador e médio juntos, horizontais' },
  'I': { desc: 'Só o mínimo estendido, outros fechados' },
  'J': { desc: 'Mínimo estendido, traça um J no ar' },
  'K': { desc: 'Indicador para cima, médio diagonal, polegar entre eles' },
  'L': { desc: 'Polegar e indicador formam L a 90°' },
  'M': { desc: 'Três dedos (ind+méd+anel) dobrados sobre o polegar' },
  'N': { desc: 'Dois dedos (ind+médio) dobrados sobre o polegar' },
  'O': { desc: 'Todos os dedos curvados formando um O' },
  'P': { desc: 'Indicador aponta para baixo, polegar estendido' },
  'Q': { desc: 'Indicador e polegar apontam para baixo' },
  'R': { desc: 'Indicador e médio cruzados (entrelaçados)' },
  'S': { desc: 'Punho fechado, polegar por cima dos dedos' },
  'T': { desc: 'Polegar entre indicador e médio' },
  'U': { desc: 'Indicador e médio juntos e estendidos para cima' },
  'V': { desc: 'Indicador e médio separados em V' },
  'W': { desc: 'Indicador, médio e anelar estendidos e separados' },
  'X': { desc: 'Indicador dobrado em gancho/anzol' },
  'Y': { desc: 'Polegar e mínimo estendidos (shaka)' },
  'Z': { desc: 'Indicador traça Z no ar' },
};

// -------------------------------------------------------
// 2. LISTA DE PALAVRAS (4 letras)
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
  _features(lm) {
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [3, 6, 10, 14, 18];
    const dist   = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const ext    = [];
    ext.push(lm[4].x < lm[3].x ? 1 : 0); // polegar
    for (let i = 1; i < 5; i++) ext.push(lm[tipIds[i]].y < lm[pipIds[i]].y ? 1 : 0);
    return { ext, thumbIndex: dist(lm[4], lm[8]), indexMiddle: dist(lm[8], lm[12]) };
  }

  // Mão DIREITA → letra
  classifyLetter(lm) {
    if (!lm || lm.length < 21) return null;
    const f = this._features(lm);
    const [thumb, idx, mid, ring, pink] = f.ext;

    const allOpen    =  idx &&  mid &&  ring &&  pink;
    const allClosed  = !idx && !mid && !ring && !pink;
    const onlyIdx    =  idx && !mid && !ring && !pink;
    const onlyPink   = !idx && !mid && !ring &&  pink;
    const idxMid     =  idx &&  mid && !ring && !pink;
    const idxMidRing =  idx &&  mid &&  ring && !pink;

    if (allClosed && !thumb)                                     return 'A';
    if (allClosed && thumb && f.thumbIndex < 0.07)               return 'S';
    if (allOpen && !thumb && f.indexMiddle < 0.07)               return 'B';
    if (onlyIdx && !thumb && f.thumbIndex > 0.08)                return 'D';
    if (onlyIdx && !thumb && f.thumbIndex <= 0.08)               return 'X';
    if (onlyPink && !thumb)                                      return 'I';
    if (thumb && !idx && !mid && !ring && pink)                   return 'Y';
    if (thumb && onlyIdx && f.thumbIndex > 0.12)                 return 'L';
    if (f.thumbIndex < 0.05 && allClosed)                        return 'O';
    if (f.thumbIndex < 0.06 && mid && ring && pink)              return 'F';
    if (idxMid && !thumb && f.indexMiddle < 0.035)               return 'R';
    if (idxMid && !thumb && f.indexMiddle < 0.055)               return 'U';
    if (idxMid && !thumb && f.indexMiddle >= 0.055)              return 'V';
    if (idxMidRing && !pink && !thumb)                           return 'W';
    if (thumb && idxMid && !ring && !pink)                       return 'K';
    if (!allClosed && !allOpen && f.thumbIndex > 0.06 && f.thumbIndex < 0.18 && !idx && !mid) return 'C';
    if (!idx && !mid && !ring && thumb && !pink && f.thumbIndex < 0.10)  return 'T';
    if (!idx && !mid && !ring && thumb && !pink && f.thumbIndex >= 0.10) return 'M';
    if (!idx && !mid && ring && thumb && !pink)                  return 'N';
    return null;
  }

  // Mão ESQUERDA → polegar para cima = confirmar 👍
  classifyConfirm(lm) {
    if (!lm || lm.length < 21) return false;
    const f = this._features(lm);
    const [thumb, idx, mid, ring, pink] = f.ext;
    return thumb && !idx && !mid && !ring && !pink;
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

    // Estado por tentativa
    this.target       = '';        // palavra a adivinhar
    this.currentGuess = ['','','',''];  // letras da tentativa atual
    this.activeSlot   = 0;         // slot a preencher agora (0-3)
    this.allGuesses   = [];        // histórico de tentativas [{letters, colors}]
    this.MAX_TRIES    = 6;

    // Hold da mão direita
    this.HOLD_MS      = 1100;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;

    // Anti-repetição: bloqueia até a mão sair após confirmação
    this.lockedOut    = false;

    // Cooldown do 👍 para evitar confirmações duplas
    this.confirmCooldown = false;

    // Estado do jogo
    this.gameOver  = false;
    this.round     = 1;
    this.score     = 0;
    this.streak    = 0;
    this.history   = [];

    // FPS
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

  // ---- Frame principal ----
  processFrame(handsData, ts) {
    // FPS
    this.fpsCount++;
    if (ts - this.fpsTimer >= 1000) {
      document.getElementById('fpsLabel').textContent = `${this.fpsCount} fps`;
      this.fpsCount = 0;
      this.fpsTimer = ts;
    }

    if (this.gameOver) return;

    let rightHand = null;
    let leftHand  = null;
    for (const h of handsData) {
      if (h.label === 'Right') rightHand = h.landmarks;
      if (h.label === 'Left')  leftHand  = h.landmarks;
    }

    // --- Anti-repetição: aguarda mão direita sair ---
    if (this.lockedOut) {
      if (!rightHand) {
        this.lockedOut = false;
        this._resetGestureDisplay();
      } else {
        document.getElementById('gestureName').textContent = '⏳ Retira a mão direita e mostra o próximo gesto';
        document.getElementById('confirmLabel').textContent = 'Afasta a mão para continuar...';
        document.getElementById('confirmLabel').style.color = 'var(--accent2)';
      }
      // Permite usar a esquerda para confirmar mesmo sem mover a direita
      // (caso a letra já esteja pronta de antes)
      return;
    }

    // --- MÃO DIREITA: reconhece a letra ---
    if (!rightHand) {
      this._resetGestureDisplay();
      return;
    }

    const gesture = this.clf.classifyLetter(rightHand);

    if (!gesture) {
      this._resetGestureDisplay();
      return;
    }

    // Atualiza display
    document.getElementById('gestureEmoji').textContent = gesture;
    document.getElementById('gestureName').textContent  = LGP_ALPHABET[gesture].desc;
    document.getElementById('gestureOverlay').textContent = `Gesto: ${gesture}`;
    document.getElementById('gestureOverlay').classList.add('show');
    this._highlightAlphabet(gesture);

    // Pré-visualiza a letra no slot ativo
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

    if (this.holdProgress >= 100 && !this.letterReady) {
      this.letterReady = true;
    }

    this._updateConfirmBar(this.holdProgress, this.letterReady);

    // --- MÃO ESQUERDA: 👍 confirma a letra ---
    if (this.letterReady && leftHand && !this.confirmCooldown) {
      const ok = this.clf.classifyConfirm(leftHand);
      if (ok) {
        this._confirmCurrentLetter();
      }
    }
  }

  _confirmCurrentLetter() {
    if (this.activeSlot >= 4) return;
    const letter = this.holdGesture;
    if (!letter) return;

    // Regista a letra
    this.currentGuess[this.activeSlot] = letter;
    this._solidifySlot(this.activeSlot, letter);
    this.activeSlot++;

    // Reset hold
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = true;

    // Cooldown 👍 para não confirmar logo a seguinte
    this.confirmCooldown = true;
    setTimeout(() => { this.confirmCooldown = false; }, 1200);

    this._updateConfirmBar(0, false);
    showToast(`✅ "${letter}" confirmada! (${this.activeSlot}/4)`);

    // Se chegou a 4 letras → verifica a palavra
    if (this.activeSlot >= 4) {
      this.lockedOut = false;
      setTimeout(() => this._checkGuess(), 500);
    }
  }

  _checkGuess() {
    const guess  = this.currentGuess.join('');
    const target = this.target;
    const colors = this._calcColors(guess, target);

    // Guarda tentativa
    this.allGuesses.push({ letters: [...this.currentGuess], colors });

    // Anima cores da linha atual
    this._animateGuessRow(this.allGuesses.length - 1, colors);

    if (guess === target) {
      // VITÓRIA
      const pts = Math.max(10, 100 - (this.allGuesses.length - 1) * 15);
      this.score += pts;
      this.streak++;
      this.round++;
      this.history.unshift({ word: target, result: 'win', tries: this.allGuesses.length });
      this._updateStats();
      this._renderHistory();
      this.gameOver = true;
      setTimeout(() => showResult(true, target, this.allGuesses.length, pts), 900);
    } else if (this.allGuesses.length >= this.MAX_TRIES) {
      // DERROTA — esgotou tentativas
      this.streak = 0;
      this.history.unshift({ word: target, result: 'lose', tries: this.allGuesses.length });
      this._updateStats();
      this._renderHistory();
      this.gameOver = true;
      setTimeout(() => showResult(false, target, this.allGuesses.length, 0), 900);
    } else {
      // Nova tentativa
      setTimeout(() => {
        this.currentGuess = ['','','',''];
        this.activeSlot   = 0;
        this.holdGesture  = null;
        this.holdProgress = 0;
        this.letterReady  = false;
        this.lockedOut    = false;
        this.confirmCooldown = false;
        document.getElementById('wrongBar').classList.remove('show');
        this._updateActiveRow();
      }, 800);
    }
    this._updateStats();
  }

  // Algoritmo de cores estilo Termo/Wordle
  _calcColors(guess, target) {
    const colors  = ['grey','grey','grey','grey'];
    const tArr    = target.split('');
    const used    = [false,false,false,false];

    // 1ª passagem: verdes (posição certa)
    for (let i = 0; i < 4; i++) {
      if (guess[i] === tArr[i]) {
        colors[i] = 'green';
        used[i]   = true;
      }
    }
    // 2ª passagem: amarelos (letra existe, posição errada)
    for (let i = 0; i < 4; i++) {
      if (colors[i] === 'green') continue;
      for (let j = 0; j < 4; j++) {
        if (!used[j] && guess[i] === tArr[j]) {
          colors[i] = 'yellow';
          used[j]   = true;
          break;
        }
      }
    }
    return colors;
  }

  // ---- Renderização do tabuleiro ----

  _renderBoard() {
    const board = document.getElementById('letterTrack');
    board.innerHTML = '';
    board.style.display        = 'flex';
    board.style.flexDirection  = 'column';
    board.style.gap            = '8px';
    board.style.alignItems     = 'center';

    // 6 linhas (tentativas)
    for (let row = 0; row < this.MAX_TRIES; row++) {
      const rowEl = document.createElement('div');
      rowEl.id        = `row-${row}`;
      rowEl.style.cssText = 'display:flex;gap:8px;';

      for (let col = 0; col < 4; col++) {
        const cell = document.createElement('div');
        cell.id = `cell-${row}-${col}`;
        cell.style.cssText = `
          width:70px; height:70px;
          border-radius:12px;
          border:2px solid var(--border2);
          background:var(--surface);
          display:flex; align-items:center; justify-content:center;
          font-size:2rem; font-weight:800;
          font-family:'Syne',sans-serif;
          color:var(--text);
          transition: all 0.2s;
          position:relative;
        `;

        // Número da coluna
        const num = document.createElement('div');
        num.style.cssText = 'position:absolute;top:4px;right:7px;font-size:0.52rem;font-family:\'Space Mono\',monospace;color:var(--text2);';
        num.textContent = col + 1;
        cell.appendChild(num);

        const letter = document.createElement('span');
        letter.id = `cell-letter-${row}-${col}`;
        letter.textContent = '';
        cell.appendChild(letter);

        rowEl.appendChild(cell);
      }
      board.appendChild(rowEl);
    }

    // Esconde progress dots (não usados no modo tabuleiro)
    document.getElementById('progressDots').innerHTML = '';
    this._updateActiveRow();
  }

  _updateActiveRow() {
    const row = this.allGuesses.length;
    if (row >= this.MAX_TRIES) return;
    // Destaca a linha ativa
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
    if (span) {
      span.textContent = letter;
      span.style.color = 'var(--text2)';
      span.style.opacity = '0.6';
    }
  }

  _solidifySlot(col, letter) {
    const row  = this.allGuesses.length; // ainda não avançou
    const cell = document.getElementById(`cell-${row}-${col}`);
    const span = document.getElementById(`cell-letter-${row}-${col}`);
    if (span) {
      span.textContent = letter;
      span.style.color = 'var(--text)';
      span.style.opacity = '1';
    }
    if (cell) {
      cell.style.borderColor = 'rgba(124,106,247,0.5)';
      cell.style.background  = 'rgba(124,106,247,0.12)';
      // Animação de "bounce"
      cell.style.transform = 'scale(1.08)';
      setTimeout(() => { cell.style.transform = 'scale(1)'; }, 150);
    }
  }

  _animateGuessRow(rowIdx, colors) {
    const colorMap = {
      green : { bg: 'rgba(93,200,160,0.25)',  border: 'var(--success)', text: 'var(--success)' },
      yellow: { bg: 'rgba(247,198,106,0.25)', border: 'var(--accent2)', text: 'var(--accent2)' },
      grey  : { bg: 'rgba(80,80,120,0.2)',    border: 'rgba(150,150,180,0.3)', text: 'var(--text2)' },
    };

    colors.forEach((color, col) => {
      setTimeout(() => {
        const cell = document.getElementById(`cell-${rowIdx}-${col}`);
        const span = document.getElementById(`cell-letter-${rowIdx}-${col}`);
        if (!cell) return;

        const c = colorMap[color];
        cell.style.background  = c.bg;
        cell.style.borderColor = c.border;
        if (span) span.style.color = c.text;

        // Flip animation
        cell.style.transform = 'rotateX(90deg)';
        setTimeout(() => { cell.style.transform = 'rotateX(0deg)'; }, 120);
      }, col * 180);
    });
  }

  // ---- Helpers UI ----

  _highlightAlphabet(letter) {
    document.querySelectorAll('.lgp-cell').forEach(c => c.classList.remove('highlight'));
    if (letter) {
      const cell = document.getElementById(`lgp-${letter}`);
      if (cell) cell.classList.add('highlight');
    }
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
      item.innerHTML = `
        <span class="history-word">${h.word}</span>
        <span class="history-attempts">${h.tries}x</span>
        <span class="history-badge ${h.result === 'win' ? 'win' : 'skip'}">
          ${h.result === 'win' ? '✓ Ganhou' : '✗ Perdeu'}
        </span>`;
      list.appendChild(item);
    });
  }

  // Ações dos botões
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
    this.currentGuess = ['','','',''];
    this.activeSlot   = 0;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = false;
    this.confirmCooldown = false;
    // Limpa só a linha atual
    const row = this.allGuesses.length;
    for (let c = 0; c < 4; c++) {
      const cell = document.getElementById(`cell-${row}-${c}`);
      const span = document.getElementById(`cell-letter-${row}-${c}`);
      if (span) span.textContent = '';
      if (cell) {
        cell.style.background  = 'rgba(124,106,247,0.06)';
        cell.style.borderColor = 'var(--accent)';
      }
    }
    this._updateConfirmBar(0, false);
    this._resetGestureDisplay();
    showToast('Linha reiniciada');
  }
}

// -------------------------------------------------------
// 5. MEDIAPIPE — câmara + 2 mãos
// -------------------------------------------------------
let handsModel, game;

async function initMediaPipe() {
  handsModel = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  handsModel.setOptions({
    maxNumHands           : 2,
    modelComplexity       : 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence : 0.60,
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

    const ts        = performance.now();
    const handsData = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((lm, i) => {
        const label = results.multiHandedness[i].label;
        handsData.push({ label, landmarks: lm });

        const isRight  = label === 'Right';
        const color    = isRight ? 'rgba(124,106,247,0.6)' : 'rgba(93,200,160,0.6)';
        const dotColor = isRight ? '#7c6af7' : '#5dc8a0';

        drawConnectors(ctx, lm, HAND_CONNECTIONS, { color, lineWidth: 2 });
        drawLandmarks(ctx, lm, { color: dotColor, lineWidth: 1, radius: 4 });

        // Label sobre a mão no vídeo
        ctx.fillStyle = isRight ? '#a89ff9' : '#5dc8a0';
        ctx.font      = 'bold 13px monospace';
        const wx = lm[0].x * canvas.width;
        const wy = lm[0].y * canvas.height - 14;
        ctx.fillText(isRight ? '✋ Letra' : '👍 Confirmar', wx - 30, wy);
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
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
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
// 6. UI GLOBAL
// -------------------------------------------------------
function buildAlphabetGrid() {
  const grid = document.getElementById('lgpGrid');
  grid.innerHTML = '';
  Object.entries(LGP_ALPHABET).forEach(([letter, info]) => {
    const cell = document.createElement('div');
    cell.className = 'lgp-cell';
    cell.id        = `lgp-${letter}`;
    cell.title     = info.desc;
    cell.innerHTML = `
      <div class="lgp-hand" style="font-size:1.1rem;font-weight:800;font-family:'Syne',sans-serif">${letter}</div>
      <div class="lgp-char" style="font-size:0.5rem;line-height:1.2">${info.desc.split(',')[0]}</div>`;
    grid.appendChild(cell);
  });
}

function updateSwipeIndicator() {
  const el = document.getElementById('swipeIndicator');
  if (el) el.innerHTML = '<span>👍</span><span>Esquerda confirma</span>';
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
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
  const overlay = document.getElementById('resultOverlay');
  document.getElementById('resultEmoji').textContent    = correct ? (tries === 1 ? '🏆' : '🎉') : '😔';
  document.getElementById('resultTitle').textContent    = correct ? 'Acertaste!' : 'Fim das tentativas';
  document.getElementById('resultWord').textContent     = word;
  document.getElementById('resultSubtitle').textContent = correct
    ? `Soletrou "${word}" em ${tries} tentativa${tries > 1 ? 's' : ''}! +${points} pontos`
    : `A palavra era "${word}". Melhor sorte na próxima!`;
  overlay.classList.add('show');
}

function closeResult()      { document.getElementById('resultOverlay').classList.remove('show'); }
function nextWord()         { closeResult(); if (game) game.nextWord(); }
function skipWord()         { if (game) game.skipWord(); }
function resetCurrentWord() { if (game) game.resetWord(); }

// -------------------------------------------------------
// 7. ARRANQUE
// -------------------------------------------------------
async function startGame() {
  document.getElementById('onboard').style.display = 'none';
  buildAlphabetGrid();
  updateSwipeIndicator();
  await initMediaPipe();
  game = new LGPGame();
  game.newWord();
  await startCamera();
}
