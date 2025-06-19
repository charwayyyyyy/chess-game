        document.addEventListener('DOMContentLoaded', () => {
            // Game state
            const state = {
                board: Array(8).fill().map(() => Array(8).fill(null)),
                currentPlayer: 'white',
                selectedPiece: null,
                gameStatus: 'active',
                moveHistory: [],
                capturedPieces: { white: [], black: [] },
                kingPositions: { white: { row: 0, col: 4 }, black: { row: 7, col: 4 } },
                checkState: { white: false, black: false }
            };


            // Piece Unicode characters
            const pieceChars = {
                white: {
                    king: '♔',
                    queen: '♕',
                    rook: '♖',
                    bishop: '♗',
                    knight: '♘',
                    pawn: '♙'
                },
                black: {
                    king: '♚',
                    queen: '♛',
                    rook: '♜',
                    bishop: '♝',
                    knight: '♞',
                    pawn: '♟'
                }
            };

            // Initialize the game
            function initGame() {
                createBoard();
                setupPieces();
                renderBoard();
                updateStatusBar();
            }

            // Create the chessboard
            function createBoard() {
                const chessboard = document.getElementById('chessboard');
                chessboard.innerHTML = '';

                // Create coordinates
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        const cell = document.createElement('div');
                        
                        if (row === 0 && col === 0) {
                            // Top-left corner (empty)
                            cell.className = 'coordinate';
                        } 
                        else if (row === 0) {
                            // Top row (files a-h)
                            cell.className = 'coordinate';
                            cell.textContent = String.fromCharCode(96 + col);
                        } 
                        else if (col === 0) {
                            // Left column (ranks 8-1)
                            cell.className = 'coordinate';
                            cell.textContent = 9 - row;
                        } 
                        else {
                            // Chessboard squares
                            cell.className = `square ${(row + col) % 2 === 1 ? 'light' : 'dark'}`;
                            cell.dataset.row = row - 1;
                            cell.dataset.col = col - 1;
                            
                            cell.addEventListener('click', handleSquareClick);
                        }
                        
                        chessboard.appendChild(cell);
                    }
                }
            }

            // Set up the pieces in starting positions
            function setupPieces() {
                // Clear the board
                state.board = Array(8).fill().map(() => Array(8).fill(null));
                
                // Set up pawns
                for (let col = 0; col < 8; col++) {
                    state.board[1][col] = { type: 'pawn', color: 'white', moved: false };
                    state.board[6][col] = { type: 'pawn', color: 'black', moved: false };
                }

                
                
                // Set up other pieces
                const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
                for (let col = 0; col < 8; col++) {
                    state.board[0][col] = { type: backRow[col], color: 'white', moved: false };
                    state.board[7][col] = { type: backRow[col], color: 'black', moved: false };
                }
                
                // Reset game state
                state.currentPlayer = 'white';
                state.selectedPiece = null;
                state.gameStatus = 'active';
                state.moveHistory = [];
                state.capturedPieces = { white: [], black: [] };
                state.kingPositions = { white: { row: 0, col: 4 }, black: { row: 7, col: 4 } };
                state.checkState = { white: false, black: false };
                
                // Clear captured pieces display
                document.getElementById('captured-white').innerHTML = '';
                document.getElementById('captured-black').innerHTML = '';
                document.getElementById('move-history').innerHTML = '';
            }

            // Render the board with pieces
            function renderBoard() {
                // Clear highlights
                document.querySelectorAll('.square').forEach(square => {
                    square.classList.remove('selected', 'valid-move', 'valid-capture');
                });
                
                // Render pieces
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = state.board[row][col];
                        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                        
                        if (square) {
                            // Clear previous piece
                            square.innerHTML = '';
                            
                            if (piece) {
                                const pieceEl = document.createElement('div');
                                pieceEl.className = `piece ${piece.color} ${piece.type}`;
                                pieceEl.textContent = pieceChars[piece.color][piece.type];
                                pieceEl.dataset.type = piece.type;
                                pieceEl.dataset.color = piece.color;
                                square.appendChild(pieceEl);
                            }
                            
                            // Highlight king if in check
                            if (piece && piece.type === 'king' && state.checkState[piece.color]) {
                                square.classList.add('in-check');
                            } else {
                                square.classList.remove('in-check');
                            }
                        }
                    }
                }
                
                // Highlight selected piece and valid moves
                if (state.selectedPiece) {
                    const { row, col } = state.selectedPiece;
                    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
                    if (square) square.classList.add('selected');
                    
                    const validMoves = getValidMoves(row, col);
                    validMoves.forEach(move => {
                        const targetSquare = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`);
                        if (targetSquare) {
                            if (state.board[move.row][move.col]) {
                                targetSquare.classList.add('valid-capture');
                            } else {
                                targetSquare.classList.add('valid-move');
                            }
                        }
                    });
                }
            }

            // Handle square click
            function handleSquareClick(event) {
                if (state.gameStatus !== 'active') return;
                
                const row = parseInt(event.currentTarget.dataset.row);
                const col = parseInt(event.currentTarget.dataset.col);
                
                // If a piece is already selected
                if (state.selectedPiece) {
                    const { row: selectedRow, col: selectedCol } = state.selectedPiece;
                    const piece = state.board[selectedRow][selectedCol];
                    
                    // Check if the clicked square is a valid move
                    const validMoves = getValidMoves(selectedRow, selectedCol);
                    const isValidMove = validMoves.some(move => move.row === row && move.col === col);
                    
                    if (isValidMove) {
                        // Move the piece
                        movePiece(selectedRow, selectedCol, row, col);
                        state.selectedPiece = null;
                    } else {
                        // Select a different piece of the same color
                        const clickedPiece = state.board[row][col];
                        if (clickedPiece && clickedPiece.color === state.currentPlayer) {
                            state.selectedPiece = { row, col };
                        } else {
                            state.selectedPiece = null;
                        }
                    }
                } else {
                    // Select a piece if it belongs to current player
                    const piece = state.board[row][col];
                    if (piece && piece.color === state.currentPlayer) {
                        state.selectedPiece = { row, col };
                    }
                }
                
                renderBoard();
            }

            // Get valid moves for a piece
            function getValidMoves(row, col) {
                const piece = state.board[row][col];
                if (!piece) return [];
                
                const moves = [];
                
                switch (piece.type) {
                    case 'pawn':
                        // Pawn moves
                        const direction = piece.color === 'white' ? 1 : -1;
                        
                        // Move forward
                        if (isValidPosition(row + direction, col) && 
                            !state.board[row + direction][col]) {
                            moves.push({ row: row + direction, col });
                            
                            // Double move from starting position
                            if (!piece.moved && 
                                !state.board[row + 2 * direction][col] && 
                                isValidPosition(row + 2 * direction, col)) {
                                moves.push({ row: row + 2 * direction, col });
                            }
                        }
                        
                        // Captures
                        const captureOffsets = [{ r: direction, c: -1 }, { r: direction, c: 1 }];
                        captureOffsets.forEach(offset => {
                            const newRow = row + offset.r;
                            const newCol = col + offset.c;
                            
                            if (isValidPosition(newRow, newCol) && 
                                state.board[newRow][newCol] && 
                                state.board[newRow][newCol].color !== piece.color) {
                                moves.push({ row: newRow, col: newCol, capture: true });
                            }
                        });
                        break;
                        
                    case 'rook':
                        // Rook moves (horizontal/vertical)
                        const rookDirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
                        rookDirs.forEach(dir => {
                            let r = row + dir.r;
                            let c = col + dir.c;
                            
                            while (isValidPosition(r, c)) {
                                if (!state.board[r][c]) {
                                    moves.push({ row: r, col: c });
                                } else {
                                    if (state.board[r][c].color !== piece.color) {
                                        moves.push({ row: r, col: c, capture: true });
                                    }
                                    break;
                                }
                                r += dir.r;
                                c += dir.c;
                            }
                        });
                        break;
                        
                    case 'knight':
                        // Knight moves (L-shape)
                        const knightMoves = [
                            { r: -2, c: -1 }, { r: -2, c: 1 },
                            { r: -1, c: -2 }, { r: -1, c: 2 },
                            { r: 1, c: -2 }, { r: 1, c: 2 },
                            { r: 2, c: -1 }, { r: 2, c: 1 }
                        ];
                        
                        knightMoves.forEach(move => {
                            const newRow = row + move.r;
                            const newCol = col + move.c;
                            
                            if (isValidPosition(newRow, newCol)) {
                                if (!state.board[newRow][newCol] || 
                                    state.board[newRow][newCol].color !== piece.color) {
                                    moves.push({ 
                                        row: newRow, 
                                        col: newCol,
                                        capture: !!state.board[newRow][newCol]
                                    });
                                }
                            }
                        });
                        break;
                        
                    case 'bishop':
                        // Bishop moves (diagonal)
                        const bishopDirs = [
                            { r: -1, c: -1 }, { r: -1, c: 1 },
                            { r: 1, c: -1 }, { r: 1, c: 1 }
                        ];
                        
                        bishopDirs.forEach(dir => {
                            let r = row + dir.r;
                            let c = col + dir.c;
                            
                            while (isValidPosition(r, c)) {
                                if (!state.board[r][c]) {
                                    moves.push({ row: r, col: c });
                                } else {
                                    if (state.board[r][c].color !== piece.color) {
                                        moves.push({ row: r, col: c, capture: true });
                                    }
                                    break;
                                }
                                r += dir.r;
                                c += dir.c;
                            }
                        });
                        break;
                        
                    case 'queen':
                        // Queen moves (horizontal/vertical/diagonal)
                        const queenDirs = [
                            { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 },
                            { r: -1, c: -1 }, { r: -1, c: 1 }, { r: 1, c: -1 }, { r: 1, c: 1 }
                        ];
                        
                        queenDirs.forEach(dir => {
                            let r = row + dir.r;
                            let c = col + dir.c;
                            
                            while (isValidPosition(r, c)) {
                                if (!state.board[r][c]) {
                                    moves.push({ row: r, col: c });
                                } else {
                                    if (state.board[r][c].color !== piece.color) {
                                        moves.push({ row: r, col: c, capture: true });
                                    }
                                    break;
                                }
                                r += dir.r;
                                c += dir.c;
                            }
                        });
                        break;
                        
                    case 'king':
                        // King moves (one square in any direction)
                        const kingDirs = [
                            { r: -1, c: -1 }, { r: -1, c: 0 }, { r: -1, c: 1 },
                            { r: 0, c: -1 }, { r: 0, c: 1 },
                            { r: 1, c: -1 }, { r: 1, c: 0 }, { r: 1, c: 1 }
                        ];
                        
                        kingDirs.forEach(dir => {
                            const newRow = row + dir.r;
                            const newCol = col + dir.c;
                            
                            if (isValidPosition(newRow, newCol)) {
                                if (!state.board[newRow][newCol] || 
                                    state.board[newRow][newCol].color !== piece.color) {
                                    moves.push({ 
                                        row: newRow, 
                                        col: newCol,
                                        capture: !!state.board[newRow][newCol]
                                    });
                                }
                            }
                        });
                        
                        // Castling (simplified for this demo)
                        if (!piece.moved) {
                            // Kingside castling
                            if (!state.board[row][5] && !state.board[row][6] && 
                                state.board[row][7]?.type === 'rook' && !state.board[row][7].moved) {
                                moves.push({ row, col: 6, castling: 'kingside' });
                            }
                            
                            // Queenside castling
                            if (!state.board[row][1] && !state.board[row][2] && !state.board[row][3] && 
                                state.board[row][0]?.type === 'rook' && !state.board[row][0].moved) {
                                moves.push({ row, col: 2, castling: 'queenside' });
                            }
                        }
                        break;
                }
                
                return moves;
            }

            // Move a piece
            function movePiece(fromRow, fromCol, toRow, toCol) {
                const piece = state.board[fromRow][fromCol];
                const targetPiece = state.board[toRow][toCol];
                
                // Handle capture
                if (targetPiece) {
                    // Add to captured pieces
                    state.capturedPieces[state.currentPlayer].push(targetPiece);
                    renderCapturedPieces();
                }
                
                // Move the piece
                state.board[toRow][toCol] = piece;
                state.board[fromRow][fromCol] = null;
                piece.moved = true;
                
                // Handle castling
                if (piece.type === 'king' && Math.abs(fromCol - toCol) === 2) {
                    // Kingside castling
                    if (toCol === 6) {
                        state.board[toRow][5] = state.board[toRow][7];
                        state.board[toRow][7] = null;
                        state.board[toRow][5].moved = true;
                    } 
                    // Queenside castling
                    else if (toCol === 2) {
                        state.board[toRow][3] = state.board[toRow][0];
                        state.board[toRow][0] = null;
                        state.board[toRow][3].moved = true;
                    }
                }
                
                // Update king position
                if (piece.type === 'king') {
                    state.kingPositions[piece.color] = { row: toRow, col: toCol };
                }
                
                // Handle pawn promotion (simplified to always promote to queen)
                if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
                    state.board[toRow][toCol] = { type: 'queen', color: piece.color, moved: true };
                }
                
                // Add to move history
                const moveNotation = getMoveNotation(fromRow, fromCol, toRow, toCol);
                state.moveHistory.push(moveNotation);
                renderMoveHistory();
                
                // Switch player
                state.currentPlayer = state.currentPlayer === 'white' ? 'black' : 'white';
                
                // Update king check status
                updateCheckStatus();
                
                // Check for checkmate or stalemate
                checkGameEnd();
                
                // Update UI
                updateStatusBar();
            }

            // Check if position is valid
            function isValidPosition(row, col) {
                return row >= 0 && row < 8 && col >= 0 && col < 8;
            }

            // Update king check status
            function updateCheckStatus() {
                // Reset check status
                state.checkState.white = false;
                state.checkState.black = false;
                
                // Check if kings are in check
                for (const color of ['white', 'black']) {
                    const kingPos = state.kingPositions[color];
                    if (isSquareAttacked(kingPos.row, kingPos.col, color)) {
                        state.checkState[color] = true;
                    }
                }
            }

            // Check if a square is attacked by the opponent
            function isSquareAttacked(row, col, color) {
                const opponent = color === 'white' ? 'black' : 'white';
                
                // Check all opponent pieces
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const piece = state.board[r][c];
                        if (piece && piece.color === opponent) {
                            const moves = getValidMoves(r, c);
                            if (moves.some(move => move.row === row && move.col === col)) {
                                return true;
                            }
                        }
                    }
                }
                
                return false;
            }

            // Check for game end conditions
            function checkGameEnd() {
                // Check for checkmate or stalemate
                let hasLegalMoves = false;
                
                // Check all pieces of current player
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const piece = state.board[row][col];
                        if (piece && piece.color === state.currentPlayer) {
                            const moves = getValidMoves(row, col);
                            if (moves.length > 0) {
                                hasLegalMoves = true;
                                break;
                            }
                        }
                    }
                    if (hasLegalMoves) break;
                }
                
                if (!hasLegalMoves) {
                    if (state.checkState[state.currentPlayer]) {
                        state.gameStatus = 'checkmate';
                    } else {
                        state.gameStatus = 'stalemate';
                    }
                }
            }

            // Get algebraic notation for move
            function getMoveNotation(fromRow, fromCol, toRow, toCol) {
                const piece = state.board[toRow][toCol]; // Piece has already been moved
                const file = String.fromCharCode(97 + fromCol);
                const rank = 8 - fromRow;
                const capture = state.board[toRow][toCol] ? 'x' : '';
                const targetFile = String.fromCharCode(97 + toCol);
                const targetRank = 8 - toRow;
                
                // Handle pawn moves differently
                if (piece.type === 'pawn') {
                    return capture ? 
                        `${file}x${targetFile}${targetRank}` : 
                        `${targetFile}${targetRank}`;
                }
                
                // Piece moves
                const pieceSymbol = piece.type === 'knight' ? 'N' : piece.type[0].toUpperCase();
                return `${pieceSymbol}${capture}${targetFile}${targetRank}`;
            }

            // Update the status bar
            function updateStatusBar() {
                const turnIndicator = document.querySelector('.turn-indicator');
                const playerTurn = document.querySelector('.player-turn span');
                const gameInfo = document.querySelector('.game-info');
                
                // Update turn indicator
                turnIndicator.className = `turn-indicator ${state.currentPlayer}`;
                playerTurn.textContent = `${state.currentPlayer.charAt(0).toUpperCase() + state.currentPlayer.slice(1)}'s Turn`;
                
                // Update game status
                if (state.gameStatus === 'checkmate') {
                    const winner = state.currentPlayer === 'white' ? 'Black' : 'White';
                    gameInfo.textContent = `Checkmate! ${winner} wins!`;
                    gameInfo.style.color = '#e74c3c';
                } else if (state.gameStatus === 'stalemate') {
                    gameInfo.textContent = 'Stalemate! Draw!';
                    gameInfo.style.color = '#f39c12';
                } else if (state.checkState[state.currentPlayer]) {
                    gameInfo.textContent = 'Check!';
                    gameInfo.style.color = '#e74c3c';
                } else {
                    gameInfo.textContent = 'Game in progress';
                    gameInfo.style.color = '#f0f0f0';
                }
            }

            // Render captured pieces
            function renderCapturedPieces() {
                const capturedWhite = document.getElementById('captured-white');
                const capturedBlack = document.getElementById('captured-black');
                
                capturedWhite.innerHTML = '';
                capturedBlack.innerHTML = '';
                
                state.capturedPieces.white.forEach(piece => {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `captured-piece ${piece.color} ${piece.type}`;
                    pieceEl.textContent = pieceChars.black[piece.type];
                    capturedWhite.appendChild(pieceEl);
                });
                
                state.capturedPieces.black.forEach(piece => {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `captured-piece ${piece.color} ${piece.type}`;
                    pieceEl.textContent = pieceChars.white[piece.type];
                    capturedBlack.appendChild(pieceEl);
                });
            }

            // Render move history
            function renderMoveHistory() {
                const moveHistory = document.getElementById('move-history');
                moveHistory.innerHTML = '';
                
                state.moveHistory.forEach((move, index) => {
                    const moveNumber = Math.floor(index / 2) + 1;
                    
                    if (index % 2 === 0) {
                        // White move
                        const moveEl = document.createElement('div');
                        moveEl.className = 'move-number';
                        moveEl.textContent = `${moveNumber}.`;
                        moveHistory.appendChild(moveEl);
                        
                        const whiteMove = document.createElement('div');
                        whiteMove.className = 'move-white';
                        whiteMove.textContent = move;
                        moveHistory.appendChild(whiteMove);
                    } else {
                        // Black move
                        const blackMove = document.createElement('div');
                        blackMove.className = 'move-black';
                        blackMove.textContent = move;
                        moveHistory.appendChild(blackMove);
                    }
                });
            }

            // Event listeners for buttons
            document.querySelector('.btn.new-game').addEventListener('click', () => {
                setupPieces();
                renderBoard();
                updateStatusBar();
            });
            
            document.querySelector('.btn.undo').addEventListener('click', () => {
                // Simplified undo - just reset the game for this demo
                alert('Undo feature would be implemented in a full version');
            });
            
            document.querySelector('.btn.hint').addEventListener('click', () => {
                alert('Hint: Try to control the center of the board and develop your pieces!');
            });
            
            document.querySelector('.btn.settings').addEventListener('click', () => {
                alert('Settings would allow board theme changes and game options');
            });

            // Initialize the game
            initGame();
        });