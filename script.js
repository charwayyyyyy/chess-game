console.log("Chess game script loaded and running.");
console.log("jQuery object:", $);
let board = null;
const game = new Chess();
const moveHistory = document.getElementById('move-history');
const capturedWhite = document.getElementById('captured-white');
const capturedBlack = document.getElementById('captured-black');
const gameStatus = document.querySelector('.game-info');
const playerTurn = document.querySelector('.player-turn span');
const turnIndicator = document.querySelector('.turn-indicator');

function onDragStart(source, piece) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
    }
}

function makeComputerMove() {
    const possibleMoves = game.moves();

    // game over
    if (possibleMoves.length === 0) return;

    const randomIdx = Math.floor(Math.random() * possibleMoves.length);
    game.move(possibleMoves[randomIdx]);
    board.position(game.fen());
    updateStatus();
}

function onDrop(source, target) {
    // see if the move is legal
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    updateStatus();

    // make computer move after a short delay
    window.setTimeout(makeComputerMove, 250);
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';
    const history = game.history({ verbose: true });

    if (game.in_checkmate()) {
        status = `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    } else if (game.in_draw()) {
        status = 'Draw!';
    } else {
        status = 'Game in progress';
        if (game.in_check()) {
            status = 'Check!';
        }
    }

    // update status, turn, and captured pieces
    gameStatus.textContent = status;
    playerTurn.textContent = `${game.turn() === 'w' ? 'White' : 'Black'}'s Turn`;
    turnIndicator.className = `turn-indicator ${game.turn() === 'w' ? 'white' : 'black'}`;

    // highlight king if in check
    $('#chessboard .square-55d63').removeClass('in-check');
    if (game.in_check()) {
        const turn = game.turn();
        const king = 'k';
        let kingPos = '';

        const board = game.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.type === king && piece.color === turn) {
                    kingPos = 'abcdefgh'[j] + (8 - i);
                    break;
                }
            }
            if (kingPos) break;
        }
        $(`#chessboard div[data-square="${kingPos}"]`).addClass('in-check');
    }

    // move history
    moveHistory.innerHTML = '';
    let moveLog = game.history();
    for (let i = 0; i < moveLog.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = moveLog[i] ? moveLog[i] : '';
        const blackMove = moveLog[i + 1] ? moveLog[i+1] : '';
        const moveEl = document.createElement('div');
        moveEl.className = 'moves';
        moveEl.innerHTML = `<div class="move-number">${moveNumber}.</div><div class="move-white">${whiteMove}</div><div class="move-black">${blackMove}</div>`;
        if(whiteMove) {
            moveHistory.appendChild(moveEl);
        }
    }

    // captured pieces
        const captured = { w: [], b: [] };
        const history = game.history({ verbose: true });
        history.forEach(move => {
            if (move.captured) {
                const color = move.color === 'w' ? 'b' : 'w';
                captured[color].push(move.captured);
            }
        });

        const pieceChars = {
            w: { 'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕' },
            b: { 'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛' }
        };

        capturedWhite.innerHTML = captured.b.map(p => `<span class="captured-piece white">${pieceChars.b[p]}</span>`).join('');
        capturedBlack.innerHTML = captured.w.map(p => `<span class="captured-piece black">${pieceChars.w[p]}</span>`).join('');
}

const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    moveSpeed: 'slow'
};
board = window.Chessboard('chessboard', config);

// Button listeners
document.querySelector('.btn.new-game').addEventListener('click', () => {
    game.reset();
    board.start();
    updateStatus();
});

document.querySelector('.btn.undo').addEventListener('click', () => {
    game.undo();
    board.position(game.fen());
    updateStatus();
});

document.querySelector('.btn.hint').addEventListener('click', () => {
    alert('Hint: Try to control the center of the board and develop your pieces!');
});

document.querySelector('.btn.settings').addEventListener('click', () => {
    alert('Settings would allow board theme changes and game options');
});

updateStatus();
