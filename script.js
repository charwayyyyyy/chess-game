const UNICODE_PIECES = {
  P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
};

const PIECE_VALUES = {
  P: 1, p: 1,
  N: 3, n: 3,
  B: 3, b: 3,
  R: 5, r: 5,
  Q: 9, q: 9,
  K: 1000, k: 1000
};

class Chess {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = [
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    this.turn = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epSquare = null; // {r, c}
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = []; // state stack for undo
    this.moveLog = []; // string representations of moves for history panel
    this.captured = { w: [], b: [] };
    this.isGameOver = false;
    this.result = null;
    this.stateStack = []; // stores full complete state before each move
  }

  cloneState() {
    return {
      board: this.board.map(row => [...row]),
      turn: this.turn,
      castling: { ...this.castling },
      epSquare: this.epSquare ? { ...this.epSquare } : null,
      halfMoves: this.halfMoves,
      fullMoves: this.fullMoves,
      captured: { w: [...this.captured.w], b: [...this.captured.b] },
      isGameOver: this.isGameOver,
      result: this.result,
      moveLog: [...this.moveLog]
    };
  }

  restoreState(state) {
    this.board = state.board.map(row => [...row]);
    this.turn = state.turn;
    this.castling = { ...state.castling };
    this.epSquare = state.epSquare ? { ...state.epSquare } : null;
    this.halfMoves = state.halfMoves;
    this.fullMoves = state.fullMoves;
    this.captured = { w: [...state.captured.w], b: [...state.captured.b] };
    this.isGameOver = state.isGameOver;
    this.result = state.result;
    this.moveLog = [...state.moveLog];
  }

  isWhite(p) { return p && p === p.toUpperCase(); }
  isBlack(p) { return p && p === p.toLowerCase(); }
  getColor(p) { return p ? (this.isWhite(p) ? 'w' : 'b') : null; }

  // Returns pseudo-legal moves for piece at (r, c) on given board
  getPseudoMoves(r, c, board = this.board, checkCastling = true) {
    let moves = [];
    const p = board[r][c];
    if (!p) return moves;
    const color = this.getColor(p);
    const type = p.toLowerCase();

    const addIfEmpty = (nr, nc) => {
      if (nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr][nc] === '') {
        moves.push({ r: nr, c: nc });
        return true;
      }
      return false;
    };
    
    const addIfEnemy = (nr, nc) => {
      if (nr>=0 && nr<8 && nc>=0 && nc<8 && board[nr][nc] !== '' && this.getColor(board[nr][nc]) !== color) {
        moves.push({ r: nr, c: nc });
        return true;
      }
      return false;
    };

    const addIfEmptyOrEnemy = (nr, nc) => {
      if (nr>=0 && nr<8 && nc>=0 && nc<8) {
        if (board[nr][nc] === '') {
          moves.push({ r: nr, c: nc });
          return true; // continue sliding
        } else if (this.getColor(board[nr][nc]) !== color) {
          moves.push({ r: nr, c: nc });
          return false; // stop sliding
        } else {
          return false; // stop sliding (friendly)
        }
      }
      return false; // bounds
    };

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      // forward
      if (r+dir>=0 && r+dir<8 && board[r+dir][c] === '') {
        moves.push({ r: r+dir, c: c });
        // double forward
        if (r === startRank && board[r+dir*2][c] === '') {
          moves.push({ r: r+dir*2, c: c, isDouble: true });
        }
      }
      // captures
      for (let dc of [-1, 1]) {
        if (addIfEnemy(r+dir, c+dc)) {}
        // en passant
        if (this.epSquare && this.epSquare.r === r+dir && this.epSquare.c === c+dc) {
          moves.push({ r: r+dir, c: c+dc, isEP: true });
        }
      }
    } else if (type === 'n') {
      const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (let [dr, dc] of jumps) addIfEmptyOrEnemy(r+dr, c+dc);
    } else if (type === 'b') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (let [dr, dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while(addIfEmptyOrEnemy(nr, nc)) { nr+=dr; nc+=dc; }
      }
    } else if (type === 'r') {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (let [dr, dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while(addIfEmptyOrEnemy(nr, nc)) { nr+=dr; nc+=dc; }
      }
    } else if (type === 'q') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for (let [dr, dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while(addIfEmptyOrEnemy(nr, nc)) { nr+=dr; nc+=dc; }
      }
    } else if (type === 'k') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      for (let [dr, dc] of dirs) addIfEmptyOrEnemy(r+dr, c+dc);

      // Castling
      if (checkCastling) {
        if (color === 'w' && r === 7 && c === 4 && !this.isUnderAttack(r, c, 'w', board)) {
          if (this.castling.wK && board[7][5] === '' && board[7][6] === '' && 
              !this.isUnderAttack(7, 5, 'w', board) && !this.isUnderAttack(7, 6, 'w', board)) {
            moves.push({ r: 7, c: 6, isCastle: true });
          }
          if (this.castling.wQ && board[7][3] === '' && board[7][2] === '' && board[7][1] === '' &&
              !this.isUnderAttack(7, 3, 'w', board) && !this.isUnderAttack(7, 2, 'w', board)) {
            moves.push({ r: 7, c: 2, isCastle: true });
          }
        } else if (color === 'b' && r === 0 && c === 4 && !this.isUnderAttack(r, c, 'b', board)) {
          if (this.castling.bK && board[0][5] === '' && board[0][6] === '' && 
              !this.isUnderAttack(0, 5, 'b', board) && !this.isUnderAttack(0, 6, 'b', board)) {
            moves.push({ r: 0, c: 6, isCastle: true });
          }
          if (this.castling.bQ && board[0][3] === '' && board[0][2] === '' && board[0][1] === '' &&
              !this.isUnderAttack(0, 3, 'b', board) && !this.isUnderAttack(0, 2, 'b', board)) {
            moves.push({ r: 0, c: 2, isCastle: true });
          }
        }
      }
    }

    return moves;
  }

  isUnderAttack(r, c, friendlyColor, board) {
    const oppColor = friendlyColor === 'w' ? 'b' : 'w';
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        const p = board[i][j];
        if (p && this.getColor(p) === oppColor) {
          const pm = this.getPseudoMoves(i, j, board, false);
          if (pm.some(m => m.r === r && m.c === c)) return true;
        }
      }
    }
    return false;
  }

  isCheck(color, board = this.board) {
    const kChar = color === 'w' ? 'K' : 'k';
    let kr = -1, kc = -1;
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (board[i][j] === kChar) { kr = i; kc = j; break; }
      }
    }
    if (kr === -1) return false;
    return this.isUnderAttack(kr, kc, color, board);
  }

  getLegalMoves(r, c) {
    const p = this.board[r][c];
    if (!p || this.getColor(p) !== this.turn) return [];
    
    const pseudoMoves = this.getPseudoMoves(r, c);
    const legalMoves = [];

    for (let m of pseudoMoves) {
      // Simulate move
      const bClone = this.board.map(row => [...row]);
      bClone[m.r][m.c] = bClone[r][c];
      bClone[r][c] = '';
      if (m.isEP) bClone[r][m.c] = ''; // remove captured pawn
      
      if (!this.isCheck(this.turn, bClone)) {
        legalMoves.push(m);
      }
    }

    return legalMoves;
  }

  getAllLegalMoves(color) {
    const all = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (this.getColor(this.board[i][j]) === color) {
          const moves = this.getLegalMoves(i, j);
          for (let m of moves) {
            all.push({ from: {r:i, c:j}, to: m });
          }
        }
      }
    }
    return all;
  }

  // Returns algebraic notation for standard move
  getNotation(from, to, p, isCapture, isCastle, isEP, promotionType) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    if (isCastle) {
      return to.c === 6 ? 'O-O' : 'O-O-O';
    }

    let pStr = p.toUpperCase() === 'P' ? '' : p.toUpperCase();
    let moveStr = pStr;

    if (isCapture || isEP) {
      if (p.toUpperCase() === 'P') {
        moveStr += files[from.c];
      }
      moveStr += 'x';
    }

    moveStr += files[to.c] + ranks[to.r];

    if (promotionType) {
      moveStr += '=' + promotionType.toUpperCase();
    }

    // append '+' or '#' later via checking state
    return moveStr;
  }

  makeMove(from, to, promotionType = null) {
    this.stateStack.push(this.cloneState());

    const p = this.board[from.r][from.c];
    let captured = this.board[to.r][to.c];
    let isEP = to.isEP || false;
    let isCastle = to.isCastle || false;
    
    // reset half moves if pawn moved or piece captured
    if (p.toLowerCase() === 'p' || captured !== '') {
      this.halfMoves = 0;
    } else {
      this.halfMoves++;
    }

    // algebraic part 1
    let moveNotation = this.getNotation(from, to, p, captured !== '', isCastle, isEP, promotionType);

    if (isEP) {
      captured = this.board[from.r][to.c];
      this.board[from.r][to.c] = '';
    }

    // Track captures
    if (captured) {
      if (this.turn === 'w') this.captured.b.push(captured);
      else this.captured.w.push(captured);
    }

    // Apply move
    this.board[to.r][to.c] = p;
    this.board[from.r][from.c] = '';

    // Castling rook move
    if (isCastle) {
      if (to.c === 6) { // Kingside
        this.board[to.r][5] = this.board[to.r][7];
        this.board[to.r][7] = '';
      } else { // Queenside
        this.board[to.r][3] = this.board[to.r][0];
        this.board[to.r][0] = '';
      }
    }

    // Promotion
    if (promotionType) {
      this.board[to.r][to.c] = this.turn === 'w' ? promotionType.toUpperCase() : promotionType.toLowerCase();
    }

    // Update castling rights
    if (p === 'K') { this.castling.wK = false; this.castling.wQ = false; }
    if (p === 'k') { this.castling.bK = false; this.castling.bQ = false; }
    if (p === 'R' && from.r === 7 && from.c === 0) this.castling.wQ = false;
    if (p === 'R' && from.r === 7 && from.c === 7) this.castling.wK = false;
    if (p === 'r' && from.r === 0 && from.c === 0) this.castling.bQ = false;
    if (p === 'r' && from.r === 0 && from.c === 7) this.castling.bK = false;
    if (to.r === 0 && to.c === 0) this.castling.bQ = false;
    if (to.r === 0 && to.c === 7) this.castling.bK = false;
    if (to.r === 7 && to.c === 0) this.castling.wQ = false;
    if (to.r === 7 && to.c === 7) this.castling.wK = false;

    // En Passant square
    if (to.isDouble) {
      this.epSquare = { r: (from.r + to.r) / 2, c: from.c };
    } else {
      this.epSquare = null;
    }

    // Swap turn
    this.turn = this.turn === 'w' ? 'b' : 'w';
    if (this.turn === 'w') this.fullMoves++;

    // checkmate or check
    const oppMoves = this.getAllLegalMoves(this.turn);
    const inCheck = this.isCheck(this.turn);
    
    if (inCheck) {
      moveNotation += '+';
    }

    if (oppMoves.length === 0) {
      if (inCheck) {
        moveNotation = moveNotation.replace('+', '#');
        this.isGameOver = true;
        this.result = this.turn === 'w' ? 'Black Wins by Checkmate' : 'White Wins by Checkmate';
      } else {
        this.isGameOver = true;
        this.result = 'Draw by Stalemate';
      }
    }

    this.moveLog.push(moveNotation);
    return true;
  }

  undo() {
    if (this.stateStack.length === 0) return false;
    const previousState = this.stateStack.pop();
    this.restoreState(previousState);
    return true;
  }

  evaluateMaterial() {
    let w = 0, b = 0;
    for (let r=0; r<8; r++) {
      for (let c=0; c<8; c++) {
        let p = this.board[r][c];
        if (!p) continue;
        if (this.isWhite(p)) w += PIECE_VALUES[p];
        else b += PIECE_VALUES[p];
      }
    }
    return { w, b, diff: w - b };
  }
}

// GUI and DOM Logic

const game = new Chess();
let selectedSquare = null;
let currentLegalMoves = [];
let isPlayerTurn = true; 
let pendingPromotionMove = null;

// DOM Elements
const boardEl = document.getElementById('chess-board');
const turnIndicator = document.getElementById('turn-indicator');
const gameStateEl = document.getElementById('game-state');
const scoreDisplay = document.getElementById('score-display');
const btnNewGame = document.getElementById('btn-new-game');
const btnUndo = document.getElementById('btn-undo');
const btnHint = document.getElementById('btn-hint');
const btnSettings = document.getElementById('btn-settings');
const whiteCapturesEl = document.getElementById('white-captures');
const blackCapturesEl = document.getElementById('black-captures');
const historyListEl = document.getElementById('history-list');
const promoModal = document.getElementById('promotion-modal');
const promoOptions = document.getElementById('promotion-options');
const settingsModal = document.getElementById('settings-modal');
const gameOverModal = document.getElementById('game-over-modal');

// Settings
const settings = {
  coords: true,
  hints: true,
  sound: false,
  theme: 'classic'
};

function loadSettings() {
  const s = localStorage.getItem('chess-settings');
  if (s) Object.assign(settings, JSON.parse(s));
  document.getElementById('setting-coords').checked = settings.coords;
  document.getElementById('setting-hints').checked = settings.hints;
  document.getElementById('setting-sound').checked = settings.sound;
  document.getElementById('setting-theme').value = settings.theme;
  applyTheme();
}

function saveSettings() {
  settings.coords = document.getElementById('setting-coords').checked;
  settings.hints = document.getElementById('setting-hints').checked;
  settings.sound = document.getElementById('setting-sound').checked;
  settings.theme = document.getElementById('setting-theme').value;
  localStorage.setItem('chess-settings', JSON.stringify(settings));
  applyTheme();
  renderBoard(); // to toggle coords/hints
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme);
}

function playSound(type) {
  if (!settings.sound) return;
  // Simple beep logic using Web Audio API to avoid external files
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'move') { osc.frequency.value = 400; osc.type = 'sine'; }
    if (type === 'capture') { osc.frequency.value = 300; osc.type = 'square'; }
    if (type === 'check') { osc.frequency.value = 800; osc.type = 'triangle'; }
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
}

function renderBoard() {
  boardEl.innerHTML = '';
  // Check square for king
  const inCheckColor = game.isCheck(game.turn) ? game.turn : null;

  for (let r=0; r<8; r++) {
    for (let c=0; c<8; c++) {
      const square = document.createElement('div');
      square.className = `square ${(r+c)%2===0 ? 'light' : 'dark'}`;
      square.dataset.r = r;
      square.dataset.c = c;
      
      const p = game.board[r][c];
      
      if (inCheckColor && p.toLowerCase() === 'k' && game.getColor(p) === inCheckColor) {
        square.classList.add('in-check');
      }

      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
        square.classList.add('selected');
      }

      // Coordinates
      if (settings.coords) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        if (c === 0) {
          const rankEl = document.createElement('span');
          rankEl.className = 'coord rank';
          rankEl.innerText = ranks[r];
          square.appendChild(rankEl);
        }
        if (r === 7) {
          const fileEl = document.createElement('span');
          fileEl.className = 'coord file';
          fileEl.innerText = files[c];
          square.appendChild(fileEl);
        }
      }

      // Legal Moves
      if (settings.hints) {
        const move = currentLegalMoves.find(m => m.r === r && m.c === c);
        if (move) {
          const hintMarker = document.createElement('div');
          if (p !== '') {
            hintMarker.className = 'legal-move-capture';
          } else {
            hintMarker.className = 'legal-move-dot';
          }
          square.appendChild(hintMarker);
        }
      }

      // Piece
      if (p !== '') {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${game.isWhite(p) ? 'white-piece' : 'black-piece'}`;
        pieceEl.innerText = UNICODE_PIECES[p];
        square.appendChild(pieceEl);
      }

      square.addEventListener('click', () => handleSquareClick(r, c));
      boardEl.appendChild(square);
    }
  }

  // Highlights for last move could be implemented here as well

  updateUI();
}

function updateUI() {
  // Title / Status
  if (game.isGameOver) {
    turnIndicator.innerText = "Game Over";
    gameStateEl.innerText = game.result;
    gameStateEl.style.color = 'var(--danger)';
    gameStateEl.style.fontWeight = 'bold';
    showGameOver(game.result);
  } else {
    turnIndicator.innerText = game.turn === 'w' ? "White to Move" : "Black to Move";
    if (game.isCheck(game.turn)) {
      gameStateEl.innerText = "Check!";
      gameStateEl.style.color = 'var(--danger)';
      gameStateEl.style.fontWeight = 'bold';
    } else {
      gameStateEl.innerText = "";
    }
  }

  // Score
  const mat = game.evaluateMaterial();
  if (mat.diff > 0) scoreDisplay.innerText = `White +${mat.diff}`;
  else if (mat.diff < 0) scoreDisplay.innerText = `Black +${-mat.diff}`;
  else scoreDisplay.innerText = "Score: Even";

  // Captured
  whiteCapturesEl.innerHTML = game.captured.b.map(p => `<span>${UNICODE_PIECES[p]}</span>`).join('');
  blackCapturesEl.innerHTML = game.captured.w.map(p => `<span>${UNICODE_PIECES[p]}</span>`).join('');

  // History
  historyListEl.innerHTML = '';
  for (let i=0; i<game.moveLog.length; i+=2) {
    const liTurn = document.createElement('li');
    liTurn.className = 'turn-num';
    liTurn.innerText = (i/2 + 1) + '.';
    
    const liW = document.createElement('li');
    liW.className = 'move-cell';
    liW.innerText = game.moveLog[i];

    const liB = document.createElement('li');
    liB.className = 'move-cell';
    liB.innerText = game.moveLog[i+1] || '';

    historyListEl.appendChild(liTurn);
    historyListEl.appendChild(liW);
    historyListEl.appendChild(liB);
  }
}

function handleSquareClick(r, c) {
  if (game.isGameOver) return;
  const p = game.board[r][c];

  // If clicked a valid move destination
  const destMove = currentLegalMoves.find(m => m.r === r && m.c === c);
  if (destMove) {
    // Check for promotion
    const piece = game.board[selectedSquare.r][selectedSquare.c];
    if (piece.toLowerCase() === 'p' && (destMove.r === 0 || destMove.r === 7)) {
      showPromotionChoice(selectedSquare, destMove);
      return;
    }
    
    executeMove(selectedSquare, destMove);
    return;
  }

  // If clicked own piece, select it
  if (p && game.getColor(p) === game.turn) {
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
      selectedSquare = null;
      currentLegalMoves = [];
    } else {
      selectedSquare = {r, c};
      currentLegalMoves = game.getLegalMoves(r, c);
    }
    renderBoard();
  } else {
    // Clicked empty or enemy square not in legal moves -> deselect
    selectedSquare = null;
    currentLegalMoves = [];
    renderBoard();
  }
}

function executeMove(from, to, promotion = null) {
  const isCapture = game.board[to.r][to.c] !== '' || to.isEP;
  game.makeMove(from, to, promotion);
  
  // Sound
  if (game.isCheck(game.turn)) playSound('check');
  else if (isCapture) playSound('capture');
  else playSound('move');

  selectedSquare = null;
  currentLegalMoves = [];
  renderBoard();
}

function showPromotionChoice(from, to) {
  pendingPromotionMove = { from, to };
  const color = game.getColor(game.board[from.r][from.c]);
  promoOptions.innerHTML = '';
  const options = ['Q', 'R', 'B', 'N'];
  options.forEach(type => {
    const el = document.createElement('div');
    el.className = `promo-piece ${color==='w'? 'white-piece' : 'black-piece'}`;
    el.innerText = UNICODE_PIECES[color==='w' ? type : type.toLowerCase()];
    el.onclick = () => {
      promoModal.classList.add('hidden');
      executeMove(pendingPromotionMove.from, pendingPromotionMove.to, type);
      pendingPromotionMove = null;
    };
    promoOptions.appendChild(el);
  });
  promoModal.classList.remove('hidden');
}

function showGameOver(text) {
  document.getElementById('game-over-title').innerText = text.includes('Win') ? 'Checkmate' : 'Draw';
  document.getElementById('game-over-message').innerText = text;
  gameOverModal.classList.remove('hidden');
}

function getHint() {
  if (game.isGameOver) return;
  const moves = game.getAllLegalMoves(game.turn);
  if (moves.length === 0) return;

  // Simple hint Engine: Evaluate simple 1-move capture or escape
  // Assign simple score
  let bestScore = -Infinity;
  let bestMove = null;

  for (let fm of moves) {
    // simulate
    const clone = new Chess();
    clone.restoreState(game.cloneState());
    clone.makeMove(fm.from, fm.to);
    
    // Evaluate material from current player perspective
    const mat = clone.evaluateMaterial();
    let score = game.turn === 'w' ? mat.diff : -mat.diff;
    
    // Bonus for check
    if (clone.isCheck(clone.turn)) score += 0.5;
    
    // Center control roughly
    const centerDist = Math.abs(3.5 - fm.to.r) + Math.abs(3.5 - fm.to.c);
    score -= centerDist * 0.05;

    // randomization to varied hints
    score += Math.random() * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestMove = fm;
    }
  }

  if (bestMove) {
    selectedSquare = bestMove.from;
    currentLegalMoves = [bestMove.to]; // Only show hint destination
    renderBoard();
  }
}

// Event Listeners
btnNewGame.onclick = () => {
  game.reset();
  selectedSquare = null;
  currentLegalMoves = [];
  gameOverModal.classList.add('hidden');
  renderBoard();
};

document.getElementById('btn-play-again').onclick = btnNewGame.onclick;
document.getElementById('btn-close-game-over').onclick = () => gameOverModal.classList.add('hidden');

btnUndo.onclick = () => {
  if (game.undo()) {
    selectedSquare = null;
    currentLegalMoves = [];
    gameOverModal.classList.add('hidden');
    renderBoard();
  }
};

btnHint.onclick = getHint;

btnSettings.onclick = () => settingsModal.classList.remove('hidden');
document.getElementById('close-settings').onclick = () => settingsModal.classList.add('hidden');

document.getElementById('setting-coords').onchange = saveSettings;
document.getElementById('setting-hints').onchange = saveSettings;
document.getElementById('setting-sound').onchange = saveSettings;
document.getElementById('setting-theme').onchange = saveSettings;

// Initialize
loadSettings();
renderBoard();
