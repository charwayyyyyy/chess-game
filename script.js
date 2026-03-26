/**
 * PREMIUM CHESS ENGINE
 * Modularized architecture: Constants, MoveGenerator, RulesEngine, GameState, AIEngine, UIController
 */
const IS_WORKER = typeof window === 'undefined';

// ==========================================
// 1. CONSTANTS & UTILS
// ==========================================
const PIECES = {
  P: 'P', N: 'N', B: 'B', R: 'R', Q: 'Q', K: 'K',
  p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k'
};
const UNICODE_PIECES = {
  P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚'
};
const VALS = { P: 10, N: 30, B: 31, R: 50, Q: 90, K: 9000, p: 10, n: 30, b: 31, r: 50, q: 90, k: 9000 };

const isWhite = p => p && p === p.toUpperCase();
const isBlack = p => p && p === p.toLowerCase();
const getColor = p => p ? (isWhite(p) ? 'w' : 'b') : null;
const oppColor = c => c === 'w' ? 'b' : 'w';

// Piece-Square Tables (for evaluating positional strength - values from White's perspective)
// Flipped for Black automatically during evaluation.
const PST = {
  P: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [0,  0,  0,  0,  0,  0,  0,  0]
  ].reverse(), // Index 0 is rank 8 (Black side), Index 7 is rank 1 (White side)
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ].reverse(),
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ].reverse(),
  R: [
    [ 0,  0,  0,  5,  5,  0,  0,  0],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [ 5, 10, 10, 10, 10, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ].reverse()
};

// ==========================================
// 2. MOVE GENERATOR & RULES ENGINE
// ==========================================
const rulesEngine = {
  isUnderAttack(r, c, friendlyColor, board) {
    const oppC = oppColor(friendlyColor);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        const p = board[i][j];
        if (p && getColor(p) === oppC) {
          const pm = this.getPseudoMoves(i, j, board, false, null, null);
          if (pm.some(m => m.r === r && m.c === c)) return true;
        }
      }
    }
    return false;
  },

  isCheck(color, board) {
    const kStr = color === 'w' ? 'K' : 'k';
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (board[i][j] === kStr) return this.isUnderAttack(i, j, color, board);
      }
    }
    return false;
  },

  getPseudoMoves(r, c, board, checkCastling, castlingState, epSquare) {
    let moves = [];
    const p = board[r][c];
    if (!p) return moves;
    const color = getColor(p);
    const type = p.toLowerCase();

    const addEdge = (nr, nc) => {
      if (nr>=0 && nr<8 && nc>=0 && nc<8) {
        if (board[nr][nc] === '') { moves.push({ r: nr, c: nc }); return true; }
        if (getColor(board[nr][nc]) !== color) { moves.push({ r: nr, c: nc }); return false; }
        return false;
      } return false;
    };

    if (type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startR = color === 'w' ? 6 : 1;
      // Forward
      if (r+dir>=0 && r+dir<8 && board[r+dir][c] === '') {
        moves.push({ r: r+dir, c: c });
        // Double Formward
        if (r === startR && board[r+dir*2][c] === '') {
          moves.push({ r: r+dir*2, c: c, isDouble: true });
        }
      }
      // Captures
      for (let dc of [-1, 1]) {
        if (r+dir>=0 && r+dir<8 && c+dc>=0 && c+dc<8) {
          const tar = board[r+dir][c+dc];
          if (tar !== '' && getColor(tar) !== color) {
            moves.push({ r: r+dir, c: c+dc });
          } else if (epSquare && epSquare.r === r+dir && epSquare.c === c+dc) {
            moves.push({ r: r+dir, c: c+dc, isEP: true });
          }
        }
      }
    } else if (type === 'n') {
      const jmps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      jmps.forEach(([dr, dc]) => addEdge(r+dr, c+dc));
    } else if (type === 'b') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      dirs.forEach(([dr, dc]) => { let nr=r+dr, nc=c+dc; while(addEdge(nr, nc)) { nr+=dr; nc+=dc; } });
    } else if (type === 'r') {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => { let nr=r+dr, nc=c+dc; while(addEdge(nr, nc)) { nr+=dr; nc+=dc; } });
    } else if (type === 'q') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => { let nr=r+dr, nc=c+dc; while(addEdge(nr, nc)) { nr+=dr; nc+=dc; } });
    } else if (type === 'k') {
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
      dirs.forEach(([dr, dc]) => addEdge(r+dr, c+dc));

      if (checkCastling && castlingState) {
        if (color === 'w' && r === 7 && c === 4 && !this.isUnderAttack(r, c, 'w', board)) {
          if (castlingState.wK && board[7][5] === '' && board[7][6] === '' &&
              !this.isUnderAttack(7, 5, 'w', board) && !this.isUnderAttack(7, 6, 'w', board)) {
            moves.push({ r: 7, c: 6, isCastle: true });
          }
          if (castlingState.wQ && board[7][3] === '' && board[7][2] === '' && board[7][1] === '' &&
              !this.isUnderAttack(7, 3, 'w', board) && !this.isUnderAttack(7, 2, 'w', board)) {
            moves.push({ r: 7, c: 2, isCastle: true });
          }
        } else if (color === 'b' && r === 0 && c === 4 && !this.isUnderAttack(r, c, 'b', board)) {
          if (castlingState.bK && board[0][5] === '' && board[0][6] === '' &&
              !this.isUnderAttack(0, 5, 'b', board) && !this.isUnderAttack(0, 6, 'b', board)) {
            moves.push({ r: 0, c: 6, isCastle: true });
          }
          if (castlingState.bQ && board[0][3] === '' && board[0][2] === '' && board[0][1] === '' &&
              !this.isUnderAttack(0, 3, 'b', board) && !this.isUnderAttack(0, 2, 'b', board)) {
            moves.push({ r: 0, c: 2, isCastle: true });
          }
        }
      }
    }
    return moves;
  },

  getLegalMoves(r, c, board, turn, castlingState, epSquare) {
    const p = board[r][c];
    if (!p || getColor(p) !== turn) return [];
    
    const pseudos = this.getPseudoMoves(r, c, board, true, castlingState, epSquare);
    const legals = [];

    for (let m of pseudos) {
      if (m.isCastle) { legals.push(m); continue; }
      const pTo = board[m.r][m.c];
      let pEp = null;
      board[m.r][m.c] = board[r][c];
      board[r][c] = '';
      if (m.isEP) { pEp = board[r][m.c]; board[r][m.c] = ''; }
      
      const inCheck = this.isCheck(turn, board);
      
      board[r][c] = board[m.r][m.c];
      board[m.r][m.c] = pTo;
      if (m.isEP) { board[r][m.c] = pEp; }
      
      if (!inCheck) legals.push(m);
    }
    return legals;
  },

  getAllLegalMoves(board, color, castlingState, epSquare) {
    const all = [];
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (getColor(board[i][j]) === color) {
          const moves = this.getLegalMoves(i, j, board, color, castlingState, epSquare);
          for (let m of moves) all.push({ from: {r:i, c:j}, to: m });
        }
      }
    }
    return all;
  }
};

// ==========================================
// 3. GAME STATE & HISTORY
// ==========================================
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    this.turn = 'w';
    this.castling = { wK: true, wQ: true, bK: true, bQ: true };
    this.epSquare = null;
    this.halfMoves = 0;
    this.fullMoves = 1;
    this.history = []; // String notation
    this.lanHistory = []; // LAN Strings for opening book
    this.moveAnalysis = []; // Stores background evaluation objects per move
    this.captured = { w: [], b: [] };
    this.stateStack = []; // Deep copies for Undo
    this.isGameOver = false;
    this.result = null;
    this.resultProcessed = false;
  }

  clone() {
    return {
      board: this.board.map(r => [...r]),
      turn: this.turn,
      castling: { ...this.castling },
      epSquare: this.epSquare ? { ...this.epSquare } : null,
      halfMoves: this.halfMoves,
      fullMoves: this.fullMoves,
      captured: { w: [...this.captured.w], b: [...this.captured.b] },
      history: [...this.history],
      lanHistory: [...this.lanHistory],
      moveAnalysis: [...this.moveAnalysis],
      isGameOver: this.isGameOver,
      result: this.result,
      resultProcessed: this.resultProcessed
    };
  }

  restore(state) {
    this.board = state.board.map(r => [...r]);
    this.turn = state.turn;
    this.castling = { ...state.castling };
    this.epSquare = state.epSquare ? { ...state.epSquare } : null;
    this.halfMoves = state.halfMoves;
    this.fullMoves = state.fullMoves;
    this.captured = { w: [...state.captured.w], b: [...state.captured.b] };
    this.history = [...state.history];
    this.lanHistory = [...state.lanHistory];
    this.moveAnalysis = state.moveAnalysis ? [...state.moveAnalysis] : [];
    this.isGameOver = state.isGameOver;
    this.result = state.result;
    this.resultProcessed = state.resultProcessed;
  }

  getNotation(from, to, p, isCapture, isCastle, isEP, promoType) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    if (isCastle) return to.c === 6 ? 'O-O' : 'O-O-O';
    let pStr = p.toUpperCase() === 'P' ? '' : p.toUpperCase();
    let moveStr = pStr;
    if (isCapture || isEP) {
      if (p.toUpperCase() === 'P') moveStr += files[from.c];
      moveStr += 'x';
    }
    moveStr += files[to.c] + ranks[to.r];
    if (promoType) moveStr += '=' + promoType.toUpperCase();
    return moveStr;
  }

  // Executes a move internally without triggering UI
  makeMove(from, to, promoType = null, isSimulation = false) {
    this.stateStack.push(this.clone());

    const p = this.board[from.r][from.c];
    let isEP = to.isEP || false;
    let isCastle = to.isCastle || false;
    let targetP = this.board[to.r][to.c];
    let isCapture = targetP !== '' || isEP;

    if (p.toLowerCase() === 'p' || isCapture) this.halfMoves = 0;
    else this.halfMoves++;

    let notation = this.getNotation(from, to, p, isCapture, isCastle, isEP, promoType);

    if (isEP) {
      targetP = this.board[from.r][to.c];
      this.board[from.r][to.c] = '';
    }

    if (targetP) {
      if (this.turn === 'w') this.captured.b.push(targetP);
      else this.captured.w.push(targetP);
    }

    this.board[to.r][to.c] = p;
    this.board[from.r][from.c] = '';

    if (isCastle) {
      if (to.c === 6) { this.board[to.r][5] = this.board[to.r][7]; this.board[to.r][7] = ''; }
      else { this.board[to.r][3] = this.board[to.r][0]; this.board[to.r][0] = ''; }
    }

    if (promoType) {
      this.board[to.r][to.c] = this.turn === 'w' ? promoType.toUpperCase() : promoType.toLowerCase();
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

    if (to.isDouble) this.epSquare = { r: (from.r + to.r)/2, c: from.c };
    else this.epSquare = null;

    this.turn = oppColor(this.turn);
    if (this.turn === 'w') this.fullMoves++;

    // Check game logic
    const oppMoves = rulesEngine.getAllLegalMoves(this.board, this.turn, this.castling, this.epSquare);
    const inCheck = rulesEngine.isCheck(this.turn, this.board);

    if (inCheck) notation += '+';

    if (oppMoves.length === 0) {
      if (inCheck) {
        notation = notation.replace('+', '#');
        this.isGameOver = true;
        this.result = this.turn === 'w' ? 'Black Wins by Checkmate' : 'White Wins by Checkmate';
      } else {
        this.isGameOver = true;
        this.result = 'Draw by Stalemate';
      }
    } else if (this.halfMoves >= 100) {
      this.isGameOver = true;
      this.result = 'Draw by Fifty-Move Rule';
    }

    if (!isSimulation) {
      this.history.push(notation);
      let files = 'abcdefgh'; let ranks = '87654321';
      let lan = files[from.c]+ranks[from.r]+files[to.c]+ranks[to.r];
      if (promoType) lan += promoType.toLowerCase();
      this.lanHistory.push(lan);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chess-save-game', JSON.stringify(this.clone()));
      }
    }
    return isCapture; // UI can use this
  }

  undo() {
    if (this.stateStack.length === 0) return false;
    this.restore(this.stateStack.pop());
    return true;
  }
  
  evaluateMaterial() {
    let w=0, b=0;
    for(let r=0; r<8; r++) {
      for(let c=0; c<8; c++) {
        const p = this.board[r][c];
        if (p) {
          if (isWhite(p)) w+=VALS[p]; else b+=VALS[p];
        }
      }
    }
    return { w, b, diff: w-b };
  }
}

// ==========================================
// 4. AI ENGINE (MINIMAX + ALPHA BETA)
// ==========================================
const OPENING_BOOK = {
  '': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
  'e2e4': ['c7c5', 'e7e5', 'e7e6', 'c7c6'],
  'd2d4': ['d7d5', 'g8f6'],
  'g1f3': ['d7d5', 'g8f6'],
  'c2c4': ['e7e5', 'c7c5', 'g8f6'],
  'e2e4,e7e5': ['g1f3', 'f1c4', 'b1c3'],
  'e2e4,c7c5': ['g1f3', 'b1c3'],
  'e2e4,e7e6': ['d2d4', 'g1f3'],
  'e2e4,c7c6': ['d2d4', 'b1c3'],
  'd2d4,d7d5': ['c2c4', 'g1f3', 'c1f4'],
  'd2d4,g8f6': ['c2c4', 'g1f3'],
  'e2e4,e7e5,g1f3': ['b8c6', 'g8f6'],
  'e2e4,c7c5,g1f3': ['d7d6', 'e7e6', 'b8c6'],
  'd2d4,d7d5,c2c4': ['e7e6', 'c7c6', 'd5c4'],
  'd2d4,g8f6,c2c4': ['e7e6', 'g7g6'],
  'e2e4,e7e5,g1f3,b8c6': ['f1b5', 'f1c4', 'd2d4'],
  'e2e4,c7c5,g1f3,d7d6': ['d2d4', 'f1b5']
};

const OPENING_NAMES = {
  'e2e4': "King's Pawn Game",
  'd2d4': "Queen's Pawn Game",
  'e2e4,c7c5': "Sicilian Defense",
  'e2e4,e7e5': "Open Game",
  'e2e4,e7e6': "French Defense",
  'e2e4,c7c6': "Caro-Kann Defense",
  'd2d4,d7d5': "Closed Game",
  'd2d4,g8f6': "Indian Defense",
  'e2e4,e7e5,g1f3,b8c6,f1b5': "Ruy Lopez",
  'e2e4,e7e5,g1f3,b8c6,f1c4': "Italian Game"
};

const aiEngine = {
  getBestBookMove(gameRef) {
    const key = gameRef.lanHistory.join(',');
    const responses = OPENING_BOOK[key];
    if (responses && responses.length > 0) {
      const rStr = responses[Math.floor(Math.random() * responses.length)];
      const f = 'abcdefgh'; const r = '87654321';
      return { from: {c: f.indexOf(rStr[0]), r: r.indexOf(rStr[1])}, to: {c: f.indexOf(rStr[2]), r: r.indexOf(rStr[3])} };
    }
    return null;
  },

  orderMoves(moves, board) {
    return moves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      let tarA = board[a.to.r][a.to.c]; let tarB = board[b.to.r][b.to.c];
      if (tarA) scoreA = 10 * VALS[tarA] - VALS[board[a.from.r][a.from.c]];
      if (tarB) scoreB = 10 * VALS[tarB] - VALS[board[b.from.r][b.from.c]];
      if (a.to.isPromo) scoreA += 80;
      if (b.to.isPromo) scoreB += 80;
      return scoreB - scoreA;
    });
  },

  getBestMove(gameRef, depthLevel) {
    if (depthLevel >= 2) {
      const bookMove = this.getBestBookMove(gameRef);
      if (bookMove) return bookMove;
    }
    const depths = { 1: 1, 2: 2, 3: 4 };
    const maxDepth = depths[depthLevel] || 2;
    // Clone core cleanly for search
    let clone = new GameState();
    clone.restore(gameRef.clone());
    
    // Slight randomization on easy mode
    let bestMoves = [];
    let bestScore = clone.turn === 'w' ? -Infinity : Infinity;

    const moves = this.orderMoves(rulesEngine.getAllLegalMoves(clone.board, clone.turn, clone.castling, clone.epSquare), clone.board);
    if (moves.length === 0) return null;

    for (let m of moves) {
      // Default auto-promote to Queen for AI
      const p = clone.board[m.from.r][m.from.c];
      const isPromo = p.toLowerCase() === 'p' && (m.to.r === 0 || m.to.r === 7);
      
      const res = clone.makeMove(m.from, m.to, isPromo ? 'Q' : null, true);
      
      // Minimax
      let score = this.minimax(clone, maxDepth - 1, -Infinity, Infinity, clone.turn === 'w');
      
      clone.undo();

      if (clone.turn === 'w') {
        if (score > bestScore) { bestScore = score; bestMoves = [m]; }
        else if (score === bestScore) { bestMoves.push(m); }
      } else {
        if (score < bestScore) { bestScore = score; bestMoves = [m]; }
        else if (score === bestScore) { bestMoves.push(m); }
      }
    }

    // Randomize among equivalent top moves to prevent identical games
    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
  },

  minimax(state, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || state.isGameOver) {
      return this.evaluateState(state);
    }

    const moves = this.orderMoves(rulesEngine.getAllLegalMoves(state.board, state.turn, state.castling, state.epSquare), state.board);

    if (isMaximizingPlayer) {
      let maxEval = -Infinity;
      for (let m of moves) {
        const isPromo = state.board[m.from.r][m.from.c].toLowerCase() === 'p' && (m.to.r === 0 || m.to.r === 7);
        state.makeMove(m.from, m.to, isPromo ? 'Q' : null, true);
        let ev = this.minimax(state, depth - 1, alpha, beta, false);
        state.undo();
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let m of moves) {
        const isPromo = state.board[m.from.r][m.from.c].toLowerCase() === 'p' && (m.to.r === 0 || m.to.r === 7);
        state.makeMove(m.from, m.to, isPromo ? 'q' : null, true);
        let ev = this.minimax(state, depth - 1, alpha, beta, true);
        state.undo();
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  },

  evaluateState(state) {
    if (state.isGameOver) {
      if (state.result.includes('Stalemate') || state.result.includes('Fifty')) return 0;
      return state.turn === 'w' ? -99999 : 99999; // Current turn player has NO moves => checkmate => LOST
    }

    let score = 0;
    for (let r=0; r<8; r++) {
      for (let c=0; c<8; c++) {
        const p = state.board[r][c];
        if (p) {
          let val = VALS[p];
          // Add positional score
          let ptStr = p.toUpperCase();
          if (PST[ptStr]) {
            // White PST is index 0 (top/black) to 7 (bottom/white)
            // For white piece, row 7 is baseline. For black piece, row 0 is baseline.
            let pstVal = 0;
            if (isWhite(p)) pstVal = PST[ptStr][r][c];
            else pstVal = PST[ptStr][7-r][c]; // Flip vertically
            
            // Dampen positional value compared to raw material (divide by 10)
            val += pstVal * 0.1;
          }
          if (isWhite(p)) score += val; else score -= val;
        }
      }
    }
    return score;
  }
};


// ==========================================
// 5. UI CONTROLLER & GAME LOOP & WORKER
// ==========================================
if (IS_WORKER) {
  self.onmessage = function(e) {
    const { action, stateData, depth, humanMove, isHint } = e.data;
    if (action === 'getBestMove') {
      let g = new GameState(); g.restore(stateData);
      const bestMove = aiEngine.getBestMove(g, depth);
      let hintReason = "";
      if (bestMove) {
        if (bestMove.promo) hintReason = "Promotes to a Queen.";
        else if (g.board[bestMove.to.r][bestMove.to.c] !== '') hintReason = "Wins material.";
        else if (rulesEngine.isCheck(oppColor(g.turn), g.board)) hintReason = "Delivers check.";
        else hintReason = "Improves position.";
      }
      self.postMessage({ action: 'bestMoveRes', bestMove, hintReason, isHint });
    } else if (action === 'analyzeMove') {
      let g = new GameState(); g.restore(stateData);
      const bestMove = aiEngine.getBestMove(g, 2);
      if (!bestMove || (bestMove.from.r === humanMove.from.r && bestMove.from.c === humanMove.from.c && bestMove.to.r === humanMove.to.r && bestMove.to.c === humanMove.to.c)) {
        self.postMessage({ action: 'analyzeRes', diff: 0 }); return;
      }
      g.makeMove(bestMove.from, bestMove.to, bestMove.promo || null, false);
      const bestNotation = g.history[g.history.length - 1];
      let bestEval = aiEngine.minimax(g, 1, -Infinity, Infinity, g.turn === 'w');
      g.undo();
      g.makeMove(humanMove.from, humanMove.to, humanMove.promo || null, false);
      const humanNotation = g.history[g.history.length - 1];
      let humanEval = aiEngine.minimax(g, 1, -Infinity, Infinity, g.turn === 'w');
      g.undo();
      
      let diff = stateData.turn === 'w' ? (bestEval - humanEval) : (humanEval - bestEval);
      
      let classification = 'Best';
      let explanation = 'Plays the optimal move.';
      if (diff > 150) { classification = 'Blunder'; explanation = 'A severe mistake that usually loses material or the game.'; }
      else if (diff > 65) { classification = 'Mistake'; explanation = 'Significantly worsens your position.'; }
      else if (diff > 35) { classification = 'Inaccuracy'; explanation = 'Misses a much better tactical or positional opportunity.'; }
      else if (diff > 15) { classification = 'Good'; explanation = 'A solid, safe development move.'; }
      else if (diff <= 5) { classification = 'Excellent'; explanation = 'Plays one of the best available lines.'; }

      // Generate the evaluation string like "+2.3"
      let evalNum = (humanEval / 10).toFixed(1);
      if (humanEval > 90000) evalNum = "M" + (100000 - humanEval);
      if (humanEval < -90000) evalNum = "-M" + (100000 + humanEval);
      let evalStr = humanEval > 0 && !String(evalNum).includes('M') ? `+${evalNum}` : evalNum;
      
      if (diff <= 15) bestNotation = null; // Don't show alternative if play was excellent

      self.postMessage({ action: 'analyzeRes', diff, humanNotation, bestNotation, classification, explanation, evalStr, index: stateData.history.length });
    }
  };
} else {

let game = new GameState();
let selectedSquare = null;
let currentLegalMoves = [];
let pendingPromo = null;
let gameMode = 'pvp'; // 'pvp', 'pvc-w', 'pvc-b'
let aiDifficulty = 2; // 1,2,3
let isBoardLocked = false;
let lastMoveHint = null; // {from, to}

let isReviewMode = false;
let reviewCurrentMoveIndex = 0;
let reviewStates = [];

// Elements
const elBoard = document.getElementById('chess-board');
const elTurnText = document.getElementById('turn-text');
const elindicatorDot = document.getElementById('indicator-dot');
const elGameState = document.getElementById('game-state');
const elScore = document.getElementById('score-display');
const elHistList = document.getElementById('history-list');
const elWhiteCap = document.getElementById('white-captures');
const elBlackCap = document.getElementById('black-captures');
const elWhiteAdv = document.getElementById('white-adv');
const elBlackAdv = document.getElementById('black-adv');

const settings = { coords: true, hints: true, sound: false, theme: 'classic' };
const userStats = { elo: 1200 };
let biggestBlunder = null;

function loadLocal() {
  const s = localStorage.getItem('chess-settings-v2');
  if (s) Object.assign(settings, JSON.parse(s));
  const eloStr = localStorage.getItem('chess-elo-v2');
  if (eloStr) userStats.elo = parseInt(eloStr);
  document.getElementById('setting-coords').checked = settings.coords;
  document.getElementById('setting-hints').checked = settings.hints;
  document.getElementById('setting-sound').checked = settings.sound;
  document.getElementById('setting-theme').value = settings.theme;
  document.documentElement.setAttribute('data-theme', settings.theme);
}
function saveLocal() {
  settings.coords = document.getElementById('setting-coords').checked;
  settings.hints = document.getElementById('setting-hints').checked;
  settings.sound = document.getElementById('setting-sound').checked;
  settings.arrows = document.getElementById('setting-arrows').checked !== false; // default true 
  settings.theme = document.getElementById('setting-theme').value;
  localStorage.setItem('chess-settings-v2', JSON.stringify(settings));
  document.documentElement.setAttribute('data-theme', settings.theme);
  render();
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAudio(type) {
  if (!settings.sound || audioCtx.state === 'suspended') return;
  try {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    if (type==='move') { osc.frequency.value = 350; osc.type = 'sine'; }
    else if (type==='capture') { osc.frequency.value = 250; osc.type = 'square'; }
    else if (type==='check') { osc.frequency.value = 600; osc.type = 'triangle'; }
    
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch(e){}
}

let analysisWorker = new Worker('script.js');
analysisWorker.onmessage = function(e) {
  if (e.data.action === 'bestMoveRes') {
    document.getElementById('ai-thinking-overlay').classList.add('hidden');
    isBoardLocked = false;
    const move = e.data.bestMove;
    if (e.data.isHint) {
       if (move) {
         selectedSquare = move.from; currentLegalMoves = [move]; 
         document.getElementById('game-state').innerText = `Hint: ${e.data.hintReason}`;
         render();
       }
    } else if (move) {
      const p = game.board[move.from.r][move.from.c];
      const isPromo = p.toLowerCase() === 'p' && (move.to.r === 0 || move.to.r === 7);
      processMoveUI(move.from, move.to, isPromo ? 'Q' : null);
    }
  } else if (e.data.action === 'analyzeRes') {
    const { diff, humanNotation, bestNotation, classification, explanation, evalStr, index } = e.data;
    
    // Store in global history analysis
    game.moveAnalysis[index] = { classification, diff, bestNotation, explanation, evalStr };

    if (diff > 45) { // Roughly 1.5 minor pieces drop
      if (!biggestBlunder || diff > biggestBlunder.diff) {
        biggestBlunder = { diff, humanNotation, bestNotation };
      }
    }
    
    // Rerender history list immediately to show visual badge
    if (!isReviewMode) renderHistoryList();
  }
};

function processMoveUI(from, to, promo = null) {
  if (gameMode !== 'pvp' && ((gameMode === 'pvc-w' && game.turn === 'w') || (gameMode === 'pvc-b' && game.turn === 'b'))) {
    const humanMove = { from: {r: from.r, c: from.c}, to: {r: to.r, c: to.c}, promo };
    analysisWorker.postMessage({ action: 'analyzeMove', stateData: game.clone(), humanMove });
  }
  const isCap = game.board[to.r][to.c] !== '' || to.isEP;
  lastMoveHint = { from, to };
  game.makeMove(from, to, promo);
  
  if (rulesEngine.isCheck(game.turn, game.board)) playAudio('check');
  else if (isCap) playAudio('capture');
  else playAudio('move');
  
  selectedSquare = null;
  currentLegalMoves = [];
  render();

  if (!game.isGameOver && gameMode !== 'pvp') {
    if ((gameMode === 'pvc-w' && game.turn === 'b') || (gameMode === 'pvc-b' && game.turn === 'w')) {
      triggerAITurn();
    }
  }
}

function triggerAITurn() {
  isBoardLocked = true;
  document.getElementById('ai-thinking-overlay').classList.remove('hidden');
  analysisWorker.postMessage({ action: 'getBestMove', stateData: game.clone(), depth: aiDifficulty });
}

function render() {
  const elRanks = document.getElementById('coords-rank');
  const elFiles = document.getElementById('coords-file');
  if (elRanks) elRanks.innerHTML = '';
  if (elFiles) elFiles.innerHTML = '';

  if (settings.coords && elRanks && elFiles) {
    for (let i=0; i<8; i++) {
      const rk = document.createElement('span'); rk.innerText = '87654321'[i]; elRanks.appendChild(rk);
      const fl = document.createElement('span'); fl.innerText = 'abcdefgh'[i]; elFiles.appendChild(fl);
    }
  }

  elBoard.innerHTML = '';
  
  // Opening logic
  let lk = game.lanHistory.join(',');
  const keys = Object.keys(OPENING_NAMES).sort((a,b)=>b.length-a.length);
  const match = keys.find(k => lk.startsWith(k));
  document.getElementById('opening-name').innerText = match ? OPENING_NAMES[match] : '';

  const inCheckC = rulesEngine.isCheck(game.turn, game.board) ? game.turn : null;
  const isFlipped = document.getElementById('chess-board').classList.contains('flipped');

  // SVG Arrows 
  let arrowsHTML = '';

  for (let rank=0; rank<8; rank++) {
    for (let col=0; col<8; col++) {
      let r = isFlipped ? 7 - rank : rank;
      let c = isFlipped ? 7 - col : col;

      const sq = document.createElement('div');
      sq.className = `square ${(r+c)%2===0 ? 'light' : 'dark'}`;
      const p = game.board[r][c];

      if (inCheckC && p && p.toLowerCase() === 'k' && getColor(p) === inCheckC) sq.classList.add('in-check');
      if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) sq.classList.add('selected');
      if (lastMoveHint && ((lastMoveHint.from.r === r && lastMoveHint.from.c === c) || (lastMoveHint.to.r === r && lastMoveHint.to.c === c))) {
        sq.classList.add('highlight');
      }

      // Legal hints
      if (settings.hints) {
        if (currentLegalMoves.some(m => m.r === r && m.c === c)) {
          const mEl = document.createElement('div');
          mEl.className = p !== '' ? 'legal-move-capture' : 'legal-move-dot';
          sq.appendChild(mEl);
        }
      }

      if (p !== '') {
        const pEl = document.createElement('div');
        pEl.className = `piece ${isWhite(p) ? 'white-piece' : 'black-piece'}`;
        pEl.innerText = UNICODE_PIECES[p];
        sq.appendChild(pEl);
      }

      sq.onclick = () => onSquareClick(r, c);
      elBoard.appendChild(sq);
    }
  }

  // Draw arrow if Reviewing or Hinting
  if (settings.arrows !== false) {
    let arrowMove = null;
    if (isReviewMode && reviewCurrentMoveIndex >= 0) {
       const ana = game.moveAnalysis[reviewCurrentMoveIndex];
       if (ana && ana.classification !== 'Best' && ana.classification !== 'Good') {
          // Can parse best LAN from bestNotation if we built an engine mapping, but for simplicity skip for now or rely on hint arrows
       }
    } else if (lastMoveHint && (isReviewMode || gameMode!=='pvp')) {
        // Draw last move
        arrowMove = lastMoveHint;
    }

    if (arrowMove) {
       const dr = isFlipped ? 7 - arrowMove.to.r : arrowMove.to.r;
       const dc = isFlipped ? 7 - arrowMove.to.c : arrowMove.to.c;
       const fr = isFlipped ? 7 - arrowMove.from.r : arrowMove.from.r;
       const fc = isFlipped ? 7 - arrowMove.from.c : arrowMove.from.c;
       
       const x1 = (fc * 12.5) + 6.25; const y1 = (fr * 12.5) + 6.25;
       const x2 = (dc * 12.5) + 6.25; const y2 = (dr * 12.5) + 6.25;
       arrowsHTML = `<svg id="arrows-layer"><defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="rgba(245, 158, 11, 0.7)"/></marker></defs><line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="rgba(245, 158, 11, 0.7)" stroke-width="3%" marker-end="url(#arrowhead)"/></svg>`;
    }
  }
  
  if (arrowsHTML) {
    elBoard.insertAdjacentHTML('beforeend', arrowsHTML);
  }

  // UI Panels
  elTurnText.innerText = game.turn === 'w' ? 'White to Move' : 'Black to Move';
  elindicatorDot.style.color = game.turn === 'w' ? '#f8fafc' : '#1e293b';

  if (game.isGameOver && !isReviewMode) {
    elTurnText.innerText = "Game Over";
    elindicatorDot.style.display = 'none';
    elGameState.innerText = game.result;
    elGameState.style.color = 'var(--danger)';
    elGameState.style.fontWeight = 'bold';
    
    // Compute ELO exactly once
    if (gameMode !== 'pvp' && !game.resultProcessed) {
      const isUserWhite = gameMode === 'pvc-w';
      const aiElo = aiDifficulty === 1 ? 800 : (aiDifficulty === 2 ? 1200 : 1600);
      let userScore = 0.5;
      if (game.result.includes('White Wins')) userScore = isUserWhite ? 1 : 0;
      else if (game.result.includes('Black Wins')) userScore = isUserWhite ? 0 : 1;
      const expected = 1 / (1 + Math.pow(10, (aiElo - userStats.elo) / 400));
      const eloChange = Math.round(32 * (userScore - expected));
      userStats.elo += eloChange;
      userStats.latestChange = eloChange; // store for rendering without re-calculating
      localStorage.setItem('chess-elo-v2', userStats.elo);
      game.resultProcessed = true;
    }
    
    const eloChange = userStats.latestChange || 0;
    
    const eloEl = document.getElementById('game-over-elo');
    if (eloEl) {
      eloEl.innerText = gameMode !== 'pvp' ? userStats.elo : '-';
      document.getElementById('game-over-elo-change').innerText = gameMode !== 'pvp' ? ((eloChange >= 0 ? '+' : '') + eloChange) : 'N/A';
      document.getElementById('game-over-elo-change').style.color = eloChange > 0 ? 'var(--selected)' : (eloChange < 0 ? 'var(--danger)' : 'var(--text-muted)');
      
      if (gameMode !== 'pvp' && biggestBlunder) {
        document.getElementById('mistake-analysis').style.display = 'block';
        document.getElementById('analysis-mistake-text').innerText = "Mistake: " + biggestBlunder.humanNotation;
        document.getElementById('analysis-best-alt').innerText = "Best: " + biggestBlunder.bestNotation;
      } else {
        document.getElementById('mistake-analysis').style.display = 'none';
      }
    }

    document.getElementById('game-over-title').innerText = game.result.includes('Win') ? "Checkmate!" : "Draw!";
    document.getElementById('game-over-message').innerText = game.result;
    document.getElementById('game-over-modal').classList.remove('hidden');
  } else {
    elindicatorDot.style.display = 'block';
    if (inCheckC) { elGameState.innerText = "Check!"; elGameState.style.color = 'var(--danger)'; elGameState.style.fontWeight = 'bold'; }
    else { elGameState.innerText = ""; }
  }

  // Scores
  const s = game.evaluateMaterial();
  if (s.diff > 0) elScore.innerText = `White +${s.diff}`;
  else if (s.diff < 0) elScore.innerText = `Black +${-s.diff}`;
  else elScore.innerText = "Even";

  elWhiteCap.innerHTML = game.captured.b.map(x=>`<span>${UNICODE_PIECES[x]}</span>`).join('');
  elBlackCap.innerHTML = game.captured.w.map(x=>`<span>${UNICODE_PIECES[x]}</span>`).join('');
  
  if (s.diff > 0) { elWhiteAdv.innerText = `+${s.diff}`; elWhiteAdv.classList.remove('hidden'); elBlackAdv.classList.add('hidden'); }
  else if (s.diff < 0) { elBlackAdv.innerText = `+${-s.diff}`; elBlackAdv.classList.remove('hidden'); elWhiteAdv.classList.add('hidden'); }
  else { elWhiteAdv.classList.add('hidden'); elBlackAdv.classList.add('hidden'); }

  renderHistoryList();
}

function renderHistoryList() {
  elHistList.innerHTML = '';
  for (let i=0; i<game.history.length; i+=2) {
    const liTurn = document.createElement('li'); liTurn.className = 'turn-num'; liTurn.innerText = (i/2 + 1) + '.';
    
    // White Move
    const liW = document.createElement('li'); 
    liW.className = 'move-cell'; 
    liW.innerText = game.history[i];
    liW.onclick = () => jumpToMove(i);
    const anaW = game.moveAnalysis[i];
    if (anaW && anaW.classification !== 'Best') {
      if (anaW.classification === 'Good') liW.classList.add('eval-good');
      else if (anaW.classification === 'Inaccuracy') liW.classList.add('eval-inacc');
      else if (anaW.classification === 'Mistake') liW.classList.add('eval-mistake');
      else if (anaW.classification === 'Blunder') liW.classList.add('eval-blunder');
    }
    if (i === game.history.length-1 && !isReviewMode) liW.classList.add('latest');
    if (isReviewMode && reviewCurrentMoveIndex === i) liW.classList.add('latest');
    
    // Black Move
    const liB = document.createElement('li'); 
    liB.className = 'move-cell'; 
    liB.innerText = game.history[i+1] || '';
    if (game.history[i+1]) {
      liB.onclick = () => jumpToMove(i+1);
      const anaB = game.moveAnalysis[i+1];
      if (anaB && anaB.classification !== 'Best') {
        if (anaB.classification === 'Good') liB.classList.add('eval-good');
        else if (anaB.classification === 'Inaccuracy') liB.classList.add('eval-inacc');
        else if (anaB.classification === 'Mistake') liB.classList.add('eval-mistake');
        else if (anaB.classification === 'Blunder') liB.classList.add('eval-blunder');
      }
      if (i+1 === game.history.length-1 && !isReviewMode) liB.classList.add('latest');
      if (isReviewMode && reviewCurrentMoveIndex === i+1) liB.classList.add('latest');
    }

    elHistList.appendChild(liTurn); elHistList.appendChild(liW); elHistList.appendChild(liB);
  }
  const hw = document.getElementById('history-wrapper');
  hw.scrollTop = hw.scrollHeight;
}

function onSquareClick(r, c) {
  if (game.isGameOver || isBoardLocked || isReviewMode) return;
  const p = game.board[r][c];

  const destMove = currentLegalMoves.find(m => m.r === r && m.c === c);
  if (destMove) {
    const selP = game.board[selectedSquare.r][selectedSquare.c];
    if (selP.toLowerCase() === 'p' && (destMove.r === 0 || destMove.r === 7)) {
      pendingPromo = { from: selectedSquare, to: destMove };
      showPromoModal(getColor(selP));
      return;
    }
    processMoveUI(selectedSquare, destMove);
    return;
  }

  if (p && getColor(p) === game.turn) {
    if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
      selectedSquare = null; currentLegalMoves = [];
    } else {
      selectedSquare = {r, c};
      currentLegalMoves = rulesEngine.getLegalMoves(r, c, game.board, game.turn, game.castling, game.epSquare);
    }
    render();
  } else {
    selectedSquare = null; currentLegalMoves = []; render();
  }
}

function showPromoModal(cStr) {
  const el = document.getElementById('promotion-options');
  el.innerHTML = '';
  ['Q','R','B','N'].forEach(type => {
    const div = document.createElement('div');
    div.className = `promo-piece ${cStr==='w'?'white-piece':'black-piece'}`;
    div.innerText = UNICODE_PIECES[cStr==='w'?type:type.toLowerCase()];
    div.onclick = () => {
      document.getElementById('promotion-modal').classList.add('hidden');
      processMoveUI(pendingPromo.from, pendingPromo.to, type);
      pendingPromo = null;
    };
    el.appendChild(div);
  });
  document.getElementById('promotion-modal').classList.remove('hidden');
}

// ==========================================
// 6. DOM EVENT BINDINGS
// ==========================================
document.addEventListener('click', () => { if (audioCtx.state === 'suspended') audioCtx.resume(); }, {once: true});

document.querySelectorAll('input[name="game-mode"]').forEach(r => {
  r.addEventListener('change', (e) => {
    document.getElementById('difficulty-group').style.display = e.target.value === 'pvp' ? 'none' : 'block';
  });
});

function startReviewMode() {
  isReviewMode = true;
  reviewStates = [...game.stateStack, game.clone()];
  reviewCurrentMoveIndex = reviewStates.length - 1;
  document.getElementById('controls-panel').classList.add('hidden');
  document.getElementById('review-controls').classList.remove('hidden');
  renderReviewMove();
}

function jumpToMove(i) {
  if (!isReviewMode) {
    isReviewMode = true;
    reviewStates = [...game.stateStack, game.clone()];
    document.getElementById('controls-panel').classList.add('hidden');
    document.getElementById('review-controls').classList.remove('hidden');
  }
  reviewCurrentMoveIndex = i + 1; // move 0 corresponds to state 1
  if (reviewCurrentMoveIndex >= reviewStates.length) reviewCurrentMoveIndex = reviewStates.length - 1;
  renderReviewMove();
}

function renderReviewMove() {
  game.restore(reviewStates[reviewCurrentMoveIndex]);
  let analysisText = `Reviewing Move ${reviewCurrentMoveIndex}`;
  let altText = "";
  let evalText = "";
  
  if (reviewCurrentMoveIndex > 0) {
    const ana = game.moveAnalysis[reviewCurrentMoveIndex];
    if (ana) {
      if (ana.classification === 'Mistake' || ana.classification === 'Blunder') {
        analysisText = `${ana.classification} (${ana.diff > 0 ? '+' : ''}${parseFloat(ana.diff/10).toFixed(1)}): ${ana.explanation}`;
        altText = `Better was ${ana.bestNotation}`;
      } else {
        analysisText = `${ana.classification}: ${ana.explanation}`;
        if (ana.bestNotation) altText = `Slightly better was ${ana.bestNotation}`;
      }
      evalText = `Eval: ${ana.evalStr || "0.0"}`;
    } else if (biggestBlunder && biggestBlunder.humanNotation === game.history[reviewCurrentMoveIndex - 1]) {
       analysisText = `Mistake!`;
       altText = `Best alternative was ${biggestBlunder.bestNotation}`;
    }
  }
  if (reviewCurrentMoveIndex === reviewStates.length - 1) {
    analysisText = "Final Board State - Game Over";
  }
  
  document.getElementById('review-analysis').innerText = analysisText;
  document.getElementById('review-analysis').className = ''; // reset classes
  if (analysisText.includes('Blunder')) document.getElementById('review-analysis').classList.add('eval-text-blunder');
  else if (analysisText.includes('Mistake')) document.getElementById('review-analysis').classList.add('eval-text-mistake');
  else if (analysisText.includes('Inaccuracy')) document.getElementById('review-analysis').classList.add('eval-text-inacc');
  else if (analysisText.includes('Excellent') || analysisText.includes('Best')) document.getElementById('review-analysis').classList.add('eval-text-best');
  
  document.getElementById('review-best-alt').innerText = altText;
  
  let elEval = document.getElementById('review-eval-badge');
  if(elEval) elEval.innerText = evalText;
  
  // Highlight active move in history panel and auto-scroll
  isReviewMode = true;
  renderHistoryList(); // Ensure badges dynamically adjust focus
  
  // Wait a tick for DOM to update, then auto-scroll to the current `.latest`
  setTimeout(() => {
    const activeEl = document.querySelector('.move-cell.latest');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 10);

  render(); // Updates board
}

document.getElementById('btn-review-start').onclick = () => {
  reviewCurrentMoveIndex = 0;
  renderReviewMove();
};
document.getElementById('btn-review-prev').onclick = () => {
  if (reviewCurrentMoveIndex > 0) {
    reviewCurrentMoveIndex--;
    renderReviewMove();
  }
};
document.getElementById('btn-review-next').onclick = () => {
  if (reviewCurrentMoveIndex < reviewStates.length - 1) {
    reviewCurrentMoveIndex++;
    renderReviewMove();
  }
};
document.getElementById('btn-review-end').onclick = () => {
  reviewCurrentMoveIndex = reviewStates.length - 1;
  renderReviewMove();
};
document.getElementById('btn-exit-review').onclick = () => {
  isReviewMode = false;
  reviewCurrentMoveIndex = reviewStates.length - 1;
  game.restore(reviewStates[reviewCurrentMoveIndex]);
  document.getElementById('review-controls').classList.add('hidden');
  document.getElementById('controls-panel').classList.remove('hidden');
  document.getElementById('game-over-modal').classList.remove('hidden'); // popup again
};

document.getElementById('btn-start-game').onclick = () => {
  document.getElementById('start-modal').classList.add('hidden');
  gameMode = document.querySelector('input[name="game-mode"]:checked').value;
  aiDifficulty = parseInt(document.querySelector('input[name="ai-difficulty"]:checked').value);
  game.reset();
  biggestBlunder = null;
  lastMoveHint = null;
  selectedSquare = null;
  currentLegalMoves = [];
  render();
  if (gameMode === 'pvc-b') triggerAITurn(); // AI plays white
};

document.getElementById('btn-new-game').onclick = () => {
  document.getElementById('promotion-modal').classList.add('hidden');
  document.getElementById('game-over-modal').classList.add('hidden');
  document.getElementById('start-modal').classList.remove('hidden');
  
  if (isReviewMode) {
    document.getElementById('review-controls').classList.add('hidden');
    document.getElementById('controls-panel').classList.remove('hidden');
    isReviewMode = false;
  }
};

document.getElementById('btn-play-again').onclick = document.getElementById('btn-new-game').onclick;

document.getElementById('btn-close-game-over').onclick = () => {
  document.getElementById('game-over-modal').classList.add('hidden');
  startReviewMode();
};

document.getElementById('btn-undo').onclick = () => {
  if (isBoardLocked || isReviewMode) return;
  document.getElementById('promotion-modal').classList.add('hidden');
  document.getElementById('game-over-modal').classList.add('hidden');
  pendingPromo = null;
  biggestBlunder = null; // Fix: Prevent undone mistakes from sticking around

  if (gameMode === 'pvp') {
    game.undo();
  } else {
    game.undo(); // Undo AI move
    if (game.turn !== (gameMode === 'pvc-w' ? 'w' : 'b')) {
      game.undo(); // Undo human move if AI hadn't moved yet
    }
  }
  lastMoveHint = null; // Clear hint
  selectedSquare = null;
  currentLegalMoves = [];
  render();

  if (!game.isGameOver && gameMode !== 'pvp' && gameMode !== 'multi') {
    if ((gameMode === 'pvc-w' && game.turn === 'b') || (gameMode === 'pvc-b' && game.turn === 'w')) {
      triggerAITurn();
    }
  }
};

document.getElementById('btn-hint').onclick = () => {
  if (game.isGameOver || isBoardLocked) return;
  document.getElementById('ai-thinking-overlay').classList.remove('hidden');
  isBoardLocked = true;
  analysisWorker.postMessage({ action: 'getBestMove', stateData: game.clone(), depth: 2, isHint: true });
};

document.getElementById('btn-flip-board').onclick = () => {
  document.getElementById('chess-board').classList.toggle('flipped');
  render();
};

document.getElementById('btn-export-pgn').onclick = () => {
  let pgn = '';
  for(let i=0; i<game.history.length; i+=2) {
    pgn += (i/2+1)+'. '+game.history[i]+' '+(game.history[i+1]?game.history[i+1]+' ':'');
  }
  prompt("Copy your PGN:", pgn.trim());
};

document.getElementById('btn-import-pgn').onclick = () => {
  const pgn = prompt("Paste PGN string:");
  if(!pgn) return;
  const moves = pgn.replace(/\d+\./g, '').trim().split(/\s+/);
  game.reset();
  gameMode = 'pvp';
  for (let mNotation of moves) {
    const legs = rulesEngine.getAllLegalMoves(game.board, game.turn, game.castling, game.epSquare);
    let found = null;
    for (let m of legs) {
      const p = game.board[m.from.r][m.from.c];
      const isPromo = p.toLowerCase() === 'p' && (m.to.r===0||m.to.r===7);
      const isEP = m.to.isEP||false;
      const isCap = game.board[m.to.r][m.to.c]!=='' || isEP;
      const note = game.getNotation(m.from, m.to, p, isCap, m.isCastle, isEP, isPromo?'Q':null);
      if (note.replace('+','').replace('#','') === mNotation.replace('+','').replace('#','')) {
         found = { m, isPromo }; break;
      }
    }
    if (found) game.makeMove(found.m.from, found.m.to, found.isPromo?'Q':null);
    else break;
  }
  biggestBlunder = null; lastMoveHint = null; selectedSquare = null; currentLegalMoves = [];
  render();
};

document.getElementById('btn-settings').onclick = () => document.getElementById('settings-modal').classList.remove('hidden');
document.getElementById('close-settings').onclick = () => document.getElementById('settings-modal').classList.add('hidden');

['coords', 'hints', 'sound'].forEach(id => document.getElementById('setting-'+id).onchange = saveLocal);
document.getElementById('setting-theme').onchange = saveLocal;

// Init
loadLocal();

const savedStr = localStorage.getItem('chess-save-game');
if (savedStr) {
  try {
    const s = JSON.parse(savedStr);
    if (!s.isGameOver) {
      game.restore(s);
    }
  } catch(e) {}
}

render();

document.addEventListener('keydown', (e) => {
  if (e.key === 'u' || e.key === 'U') document.getElementById('btn-undo').click();
  if (e.key === 'h' || e.key === 'H') document.getElementById('btn-hint').click();
  if (e.key === 'n' || e.key === 'N') document.getElementById('btn-new-game').click();
  if (e.key === 'f' || e.key === 'F') document.getElementById('btn-flip-board').click();
  if (isReviewMode) {
    if (e.key === 'ArrowLeft') document.getElementById('btn-review-prev').click();
    if (e.key === 'ArrowRight') document.getElementById('btn-review-next').click();
  }
});

} // CLOSE WORKER UI FORK
