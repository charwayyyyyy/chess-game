# Premium Chess Engine

A fully functional, client-side browser chess application built with HTML, CSS, and vanilla JavaScript. 

## Features

- **Rules Engine:** Implements all standard chess movement rules, including castling, en passant, and pawn promotion.
- **Client-Side AI:** A Minimax algorithm with Alpha-Beta pruning runs locally on the main thread.
  - *Easy (Depth 1)*: Makes rapid, mostly greedy choices.
  - *Medium (Depth 2)*: Looks a full turn ahead (1 ply human, 1 ply AI), avoiding hanging pieces.
  - *Hard (Depth 4)*: Deep search (2 full turns). **Note:** Since the engine does not use a Web Worker, calculating depth 4 blocking the main thread can cause the UI (including the "thinking" spinner) to momentarily freeze for 1-5 seconds depending on board complexity.
- **Opening Book:** The AI checks a hardcoded `OPENING_BOOK` dictionary comparing the Algebraic Long Notation (LAN) history. It covers responses for the first few plies of specific openings:
  - e4 and d4 mainlines
  - Sicilian, Caro-Kann, French Defense
  - Queen's Gambit, Indian configurations
  - Ruy Lopez and Italian Game basics
- **Local ELO Rating:** Players are assigned a starting Elo of 1200. Playing against the AI uses a standard K=32 Elo calculation (treating AI ratings as fixed: Easy=800, Med=1200, Hard=1600). The updated Elo rating is persisted natively in the browser's `localStorage`. This requires no servers or databases.
- **Game Analysis:** When playing against the AI, your moves are asynchronously evaluated (using a shallow Depth-1 comparison against a Depth-2 algorithmic "best" alternative). At the end of the game, if your worst move caused a positional evaluation drop greater than 45 points, the UI will highlight your biggest mistake and display the better alternative. 
  - *Note:* Because the comparison utilizes a very shallow internal minimax evaluation, it only detects immediate, superficial material/positional drops (e.g., blatantly hanging a knight or missing an obvious recapture).

## Installation

No build steps are required. Simply open `index.html` in any modern web browser. 

## UI / UX
- Utilizes CSS variables and dynamically injected coordinate labels for a clean, customizable board layout.
- Employs strict state checks and pointer-events handling for modal overlays to prevent accidental background layer clicks or invisible ghost elements from intercepting user actions.

## State Management Quirks
- **Undo Feature:** Undoing a move correctly restores the board, pieces, layout, and opening-book tracking elements via cloning. However, doing so immediately clears out any Game Analysis tracked up to that point to avoid showing blunders that you actually erased from the board timeline.
