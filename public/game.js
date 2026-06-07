// =======================================================
// game.js — LGP Palavras (v2)
// Melhorias:
//   1. Confirmação pela mão esquerda (polegar para cima)
//   2. Alfabeto LGP com descrições corretas (dactilologia portuguesa)
//   3. Anti-repetição: bloqueia após confirmar até mão sair
// =======================================================

// -------------------------------------------------------
// 1. TABELA DO ALFABETO LGP — Dactilologia Portuguesa
//    Fonte: alfabeto manual usado em Portugal (origem sueca)
//    Cada letra tem a descrição exata da configuração da mão
// -------------------------------------------------------
const LGP_ALPHABET = {
  'A': { emoji: '🅐', svg: 'A', desc: 'Punho fechado, polegar estendido para o lado' },
  'B': { emoji: '🅑', svg: 'B', desc: 'Mão aberta, 4 dedos juntos apontados para cima, polegar dobrado' },
  'C': { emoji: '🅒', svg: 'C', desc: 'Dedos curvados formando um C, polegar oposto' },
  'D': { emoji: '🅓', svg: 'D', desc: 'Indicador reto para cima, polegar toca no médio formando D' },
  'E': { emoji: '🅔', svg: 'E', desc: 'Quatro dedos dobrados, polegar dobrado por baixo' },
  'F': { emoji: '🅕', svg: 'F', desc: 'Polegar e indicador em círculo (OK), outros dedos estendidos' },
  'G': { emoji: '🅖', svg: 'G', desc: 'Indicador e polegar apontados horizontalmente para o lado' },
  'H': { emoji: '🅗', svg: 'H', desc: 'Indicador e médio juntos, estendidos horizontalmente' },
  'I': { emoji: '🅘', svg: 'I', desc: 'Só o mínimo estendido, outros fechados' },
  'J': { emoji: '🅙', svg: 'J', desc: 'Mínimo estendido, traça um J no ar' },
  'K': { emoji: '🅚', svg: 'K', desc: 'Indicador para cima, médio diagonal, polegar entre eles' },
  'L': { emoji: '🅛', svg: 'L', desc: 'Polegar e indicador formam L a 90°, outros fechados' },
  'M': { emoji: '🅜', svg: 'M', desc: 'Três dedos (ind+méd+anel) dobrados sobre polegar' },
  'N': { emoji: '🅝', svg: 'N', desc: 'Dois dedos (ind+médio) dobrados sobre polegar' },
  'O': { emoji: '🅞', svg: 'O', desc: 'Todos os dedos curvados formando um O com polegar' },
  'P': { emoji: '🅟', svg: 'P', desc: 'Indicador aponta para baixo, polegar estendido, médio apoia' },
  'Q': { emoji: '🅠', svg: 'Q', desc: 'Indicador e polegar apontam para baixo' },
  'R': { emoji: '🅡', svg: 'R', desc: 'Indicador e médio cruzados (entrelaçados)' },
  'S': { emoji: '🅢', svg: 'S', desc: 'Punho fechado, polegar por cima dos dedos dobrados' },
  'T': { emoji: '🅣', svg: 'T', desc: 'Polegar entre indicador e médio, punho semifechado' },
  'U': { emoji: '🅤', svg: 'U', desc: 'Indicador e médio juntos e estendidos para cima' },
  'V': { emoji: '🅥', svg: 'V', desc: 'Indicador e médio estendidos separados em V' },
  'W': { emoji: '🅦', svg: 'W', desc: 'Indicador, médio e anelar estendidos e separados' },
  'X': { emoji: '🅧', svg: 'X', desc: 'Indicador dobrado em gancho/anzol' },
  'Y': { emoji: '🅨', svg: 'Y', desc: 'Polegar e mínimo estendidos (shaka), outros fechados' },
  'Z': { emoji: '🅩', svg: 'Z', desc: 'Indicador traça Z no ar, outros fechados' },
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
// 3. CLASSIFICADOR — mão DIREITA (letra) e mão ESQUERDA (confirmar)
// -------------------------------------------------------
class GestureClassifier {
  constructor() {
    this.fistStartX   = null;
    this.isFistActive = false;
  }

  _features(lm) {
    const tipIds = [4, 8, 12, 16, 20];
    const pipIds = [3, 6, 10, 14, 18];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const ext = [];
    // Polegar: eixo X espelhado
    ext.push(lm[4].x < lm[3].x ? 1 : 0);
    // Outros 4 dedos
    for (let i = 1; i < 5; i++) {
      ext.push(lm[tipIds[i]].y < lm[pipIds[i]].y ? 1 : 0);
    }

    return {
      ext,
      thumbIndex  : dist(lm[4], lm[8]),
      thumbMiddle : dist(lm[4], lm[12]),
      indexMiddle : dist(lm[8], lm[12]),
      wristX      : lm[0].x,
    };
  }

  // Classifica gesto da mão DIREITA → letra LGP
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

    this.isFistActive = allClosed && !thumb;

    if (allClosed && !thumb)                                return 'A';
    if (allClosed && thumb && f.thumbIndex < 0.07)          return 'S';
    if (allOpen && !thumb && f.indexMiddle < 0.07)          return 'B';
    if (onlyIdx && !thumb && f.thumbIndex > 0.08)          return 'D';
    if (onlyIdx && !thumb && f.thumbIndex <= 0.08)         return 'X'; // indicador curvado/gancho
    if (onlyPink && !thumb)                                 return 'I';
    if (thumb && onlyPink)                                  return 'Y';
    if (thumb && onlyIdx && f.thumbIndex > 0.12)            return 'L';
    if (f.thumbIndex < 0.05 && allClosed)                   return 'O';
    if (f.thumbIndex < 0.06 && mid && ring && pink)         return 'F';
    if (idxMid && !thumb && f.indexMiddle < 0.035)          return 'R';
    if (idxMid && !thumb && f.indexMiddle < 0.055)          return 'U';
    if (idxMid && !thumb && f.indexMiddle >= 0.055)         return 'V';
    if (idxMidRing && !pink && !thumb)                      return 'W';
    if (thumb && idxMid && !ring && !pink)                  return 'K';
    if (!allClosed && !allOpen
        && f.thumbIndex > 0.06 && f.thumbIndex < 0.18
        && !idx && !mid)                                    return 'C';
    if (!idx && !mid && !ring && thumb && !pink
        && f.thumbIndex < 0.10)                             return 'T';
    if (!idx && !mid && !ring && thumb && !pink
        && f.thumbIndex >= 0.10)                            return 'M';
    if (!idx && !mid && ring && thumb && !pink)             return 'N';

    return null;
  }

  // Deteta polegar para cima na mão ESQUERDA → confirmar
  classifyConfirm(lm) {
    if (!lm || lm.length < 21) return false;
    const f = this._features(lm);
    const [thumb, idx, mid, ring, pink] = f.ext;
    // Polegar estendido + todos os outros fechados = "thumbs up" de confirmação
    return thumb && !idx && !mid && !ring && !pink;
  }
}

// -------------------------------------------------------
// 4. MOTOR DO JOGO
// -------------------------------------------------------
class LGPGame {
  constructor() {
    this.classifier   = new GestureClassifier();
    this.words        = this._shuffle([...WORD_LIST]);
    this.wordIndex    = 0;
    this.currentWord  = '';
    this.typedLetters = [];
    this.currentSlot  = 0;

    // Hold da letra (mão direita)
    this.HOLD_MS      = 1200;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;  // letra a 100%, aguarda confirmação

    // Anti-repetição: após confirmar, bloqueia até mão desaparecer
    this.lockedOut    = false;

    // Pontuação
    this.score   = 0;
    this.round   = 1;
    this.streak  = 0;
    this.history = [];
    this.attempts= 0;

    // FPS
    this.fpsCount= 0;
    this.fpsTimer= 0;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  newWord() {
    this.currentWord  = this.words[this.wordIndex % this.words.length];
    this.wordIndex++;
    this.typedLetters = [];
    this.currentSlot  = 0;
    this.attempts     = 0;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = false;

    document.getElementById('wrongBar').classList.remove('show');
    this._renderSlots();
    this._highlightAlphabet(null);
    this._updateConfirmBar(0, false);
    this._resetGestureDisplay();
  }

  // Chamado em cada frame — recebe landmarks de AMBAS as mãos
  // handsData = array de { label: 'Left'|'Right', landmarks: [...] }
  processFrame(handsData, timestamp) {
    // FPS
    this.fpsCount++;
    if (timestamp - this.fpsTimer >= 1000) {
      document.getElementById('fpsLabel').textContent = `${this.fpsCount} fps`;
      this.fpsCount = 0;
      this.fpsTimer = timestamp;
    }

    // Separa mãos
    let rightHand = null;
    let leftHand  = null;
    for (const h of handsData) {
      // MediaPipe devolve 'Left'/'Right' do ponto de vista da câmara espelhada
      // Na câmara espelhada, 'Right' do MediaPipe = mão direita do utilizador
      if (h.label === 'Right') rightHand = h.landmarks;
      if (h.label === 'Left')  leftHand  = h.landmarks;
    }

    // --- Anti-repetição: aguarda mão direita sair depois de confirmar ---
    if (this.lockedOut) {
      if (!rightHand) {
        this.lockedOut = false;
        this._resetGestureDisplay();
        showToast('✋ Mostra o próximo gesto!');
      } else {
        document.getElementById('gestureName').textContent = '⏳ Retira a mão e mostra o próximo gesto';
        document.getElementById('confirmLabel').textContent = 'Afasta a mão para continuar...';
      }
      return;
    }

    // --- MÃO DIREITA: reconhece a letra ---
    if (!rightHand) {
      this._resetGestureDisplay();
      return;
    }

    const gesture = this.classifier.classifyLetter(rightHand);

    if (!gesture) {
      this._resetGestureDisplay();
      return;
    }

    // Atualiza display
    const info = LGP_ALPHABET[gesture];
    document.getElementById('gestureEmoji').textContent = gesture; // mostra a letra grande
    document.getElementById('gestureName').textContent  = info.desc;
    document.getElementById('gestureOverlay').textContent = `Gesto: ${gesture}`;
    document.getElementById('gestureOverlay').classList.add('show');
    this._highlightAlphabet(gesture);

    // Acumula hold
    if (gesture !== this.holdGesture) {
      this.holdGesture  = gesture;
      this.holdStart    = timestamp;
      this.holdProgress = 0;
      this.letterReady  = false;
    } else {
      const held = timestamp - this.holdStart;
      this.holdProgress = Math.min(100, (held / this.HOLD_MS) * 100);
    }

    if (this.holdProgress >= 100 && !this.letterReady) {
      this.letterReady = true;
    }

    this._updateConfirmBar(this.holdProgress, this.letterReady);

    // --- MÃO ESQUERDA: confirma a letra (polegar para cima) ---
    if (this.letterReady && leftHand) {
      const confirming = this.classifier.classifyConfirm(leftHand);
      if (confirming && this.currentSlot < this.currentWord.length) {
        this._confirmLetter(this.holdGesture);
      }
    }
  }

  _confirmLetter(letter) {
    if (this.currentSlot >= this.currentWord.length) return;

    this.typedLetters[this.currentSlot] = letter;

    const slotLetter = document.getElementById(`slot-letter-${this.currentSlot}`);
    if (slotLetter) {
      slotLetter.textContent = letter;
      slotLetter.style.color = 'var(--text)';
    }
    const slotBox = document.getElementById(`slot-${this.currentSlot}`);
    if (slotBox) slotBox.classList.add('filled');

    this.currentSlot++;
    this._updateActiveSlot(this.currentSlot);

    // Reset estado
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = true; // bloqueia até mão sair

    this._updateConfirmBar(0, false);
    showToast(`✅ Letra "${letter}" confirmada! (${this.currentSlot}/${this.currentWord.length})`);

    if (this.currentSlot >= this.currentWord.length) {
      this.lockedOut = false;
      setTimeout(() => this._checkWord(), 600);
    }
  }

  _checkWord() {
    const typed = this.typedLetters.join('');
    this.attempts++;

    if (typed === this.currentWord) {
      const points = Math.max(10, 50 - (this.attempts - 1) * 10);
      this.score  += points;
      this.streak++;
      this.round++;

      document.querySelectorAll('.letter-slot').forEach(s => {
        s.className = 'letter-slot correct';
      });

      this.history.unshift({ word: this.currentWord, result: 'win', attempts: this.attempts });
      this._updateStats();
      this._renderHistory();
      showResult(true, this.currentWord, this.attempts, points);
    } else {
      this.streak = 0;
      document.querySelectorAll('.letter-slot').forEach(s => s.classList.add('wrong'));
      setTimeout(() => {
        this.typedLetters = [];
        this.currentSlot  = 0;
        this.lockedOut    = false;
        document.getElementById('wrongBar').classList.add('show');
        this._renderSlots();
      }, 900);
    }
    this._updateStats();
  }

  nextWord()  { this.newWord(); }
  skipWord()  {
    this.history.unshift({ word: this.currentWord, result: 'skip', attempts: this.attempts });
    this.streak = 0;
    this.round++;
    this._updateStats();
    this._renderHistory();
    this.newWord();
    showToast('Palavra saltada');
  }
  resetWord() {
    this.typedLetters = [];
    this.currentSlot  = 0;
    this.holdGesture  = null;
    this.holdStart    = null;
    this.holdProgress = 0;
    this.letterReady  = false;
    this.lockedOut    = false;
    document.getElementById('wrongBar').classList.remove('show');
    this._renderSlots();
    this._updateConfirmBar(0, false);
    this._resetGestureDisplay();
    showToast('Palavra reiniciada');
  }

  // --- UI ---

  _renderSlots() {
    const track = document.getElementById('letterTrack');
    const dots  = document.getElementById('progressDots');
    track.innerHTML = '';
    dots.innerHTML  = '';

    for (let i = 0; i < this.currentWord.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'letter-slot' +
        (i === this.currentSlot ? ' active' : '') +
        (i < this.typedLetters.length ? ' filled' : '');
      slot.id = `slot-${i}`;

      const idx = document.createElement('div');
      idx.className   = 'slot-index';
      idx.textContent = i + 1;

      const letter = document.createElement('div');
      letter.className   = 'slot-letter';
      letter.id          = `slot-letter-${i}`;
      letter.textContent = this.typedLetters[i] || '?';
      letter.style.color = this.typedLetters[i] ? 'var(--text)' : 'var(--text2)';

      slot.appendChild(idx);
      slot.appendChild(letter);
      track.appendChild(slot);

      const dot = document.createElement('div');
      dot.className = 'progress-dot' +
        (i < this.typedLetters.length ? ' done' : '') +
        (i === this.currentSlot ? ' active' : '');
      dots.appendChild(dot);
    }
  }

  _updateActiveSlot(idx) {
    document.querySelectorAll('.letter-slot').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });
    document.querySelectorAll('.progress-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
      if (i < this.typedLetters.length) d.classList.add('done');
    });
  }

  _updateConfirmBar(pct, ready) {
    const fill  = document.getElementById('confirmFill');
    const label = document.getElementById('confirmLabel');
    fill.style.width      = pct + '%';
    fill.style.background = ready ? 'var(--success)' : 'var(--accent)';

    if (ready) {
      label.textContent = '✅ Pronto! Levanta o polegar esquerdo 👍 para confirmar';
      label.style.color = 'var(--success)';
    } else if (pct > 0) {
      label.textContent = `Mantém o gesto... ${Math.round(pct)}%`;
      label.style.color = '';
    } else {
      label.textContent = 'Mão direita = letra  |  Mão esquerda 👍 = confirmar';
      label.style.color = '';
    }
  }

  _resetGestureDisplay() {
    document.getElementById('gestureEmoji').textContent = '—';
    document.getElementById('gestureName').textContent  = 'Nenhum gesto detetado';
    document.getElementById('gestureOverlay').classList.remove('show');
    this._highlightAlphabet(null);
    if (!this.letterReady) {
      this._updateConfirmBar(this.holdProgress, false);
    }
  }

  _highlightAlphabet(letter) {
    document.querySelectorAll('.lgp-cell').forEach(c => c.classList.remove('highlight'));
    if (letter) {
      const cell = document.getElementById(`lgp-${letter}`);
      if (cell) cell.classList.add('highlight');
    }
  }

  _updateStats() {
    document.getElementById('scoreVal').textContent  = this.score;
    document.getElementById('roundVal').textContent  = this.round;
    document.getElementById('streakVal').textContent = this.streak;
  }

  _renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (this.history.length === 0) {
      list.innerHTML = '<div style="font-family:\'Space Mono\',monospace;font-size:0.72rem;color:var(--text2)">Nenhum jogo ainda...</div>';
      return;
    }
    this.history.slice(0, 8).forEach(h => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <span class="history-word">${h.word}</span>
        <span class="history-attempts">${h.attempts}x</span>
        <span class="history-badge ${h.result}">
          ${h.result === 'win' ? '✓ Acertou' : '→ Saltou'}
        </span>`;
      list.appendChild(item);
    });
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
    maxNumHands           : 2,     // ← detetar DUAS mãos
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

    const ts       = performance.now();
    const handsData = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      results.multiHandLandmarks.forEach((lm, i) => {
        const label = results.multiHandedness[i].label; // 'Left' ou 'Right'
        handsData.push({ label, landmarks: lm });

        // Cor diferente por mão
        const color = label === 'Right' ? 'rgba(124,106,247,0.6)' : 'rgba(93,200,160,0.6)';
        const dotColor = label === 'Right' ? '#7c6af7' : '#5dc8a0';

        drawConnectors(ctx, lm, HAND_CONNECTIONS, { color, lineWidth: 2 });
        drawLandmarks(ctx, lm, { color: dotColor, lineWidth: 1, radius: 4 });

        // Label da mão no canvas
        ctx.fillStyle = label === 'Right' ? '#7c6af7' : '#5dc8a0';
        ctx.font = '13px monospace';
        ctx.fillText(label === 'Right' ? '✋ Direita (letra)' : '👍 Esquerda (confirmar)', lm[0].x * canvas.width - 60, lm[0].y * canvas.height - 10);
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

    const cameraUtil = new Camera(video, {
      onFrame: async () => { await handsModel.send({ image: video }); },
      width: 640, height: 480,
    });
    cameraUtil.start();

  } catch (err) {
    document.getElementById('statusText').textContent = '❌ Erro: ' + err.message;
    showToast('Erro ao aceder à câmara: ' + err.message);
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
    // Mostra a letra grande em vez de emoji
    cell.innerHTML = `<div class="lgp-hand" style="font-size:1.2rem;font-weight:800;font-family:'Syne',sans-serif">${letter}</div>
                      <div class="lgp-char" style="font-size:0.55rem;line-height:1.2">${info.desc.split(',')[0]}</div>`;
    grid.appendChild(cell);
  });
}

// Atualiza o label do swipe indicator para a nova mecânica
function updateSwipeIndicator() {
  const el = document.getElementById('swipeIndicator');
  if (el) el.innerHTML = '<span>👍</span><span>Mão esquerda confirma</span>';
}

let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function showSwipeHint(emoji) {
  const h = document.getElementById('swipeHint');
  if (!h) return;
  h.textContent = emoji;
  h.classList.add('show');
  setTimeout(() => h.classList.remove('show'), 650);
}

function showResult(correct, word, attempts, points) {
  const overlay = document.getElementById('resultOverlay');
  document.getElementById('resultEmoji').textContent =
    correct ? (attempts === 1 ? '🏆' : '🎉') : '😅';
  document.getElementById('resultTitle').textContent =
    correct ? 'Palavra Correta!' : 'Palavra Errada';
  document.getElementById('resultWord').textContent = word;
  document.getElementById('resultSubtitle').textContent = correct
    ? `Soletrou "${word}" em ${attempts} tentativa${attempts > 1 ? 's' : ''}! +${points} pontos`
    : `A palavra correta era "${word}". Tenta novamente!`;
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
  game._updateStats();

  await startCamera();
}
