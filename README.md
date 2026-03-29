# Premium Chess Engine

A fully featured, production-quality chess application built entirely with **HTML, CSS, and Vanilla JavaScript**. This project features a robust, modularized architecture that handles complex chess logic, an intelligent AI engine powered by a Web Worker, and a premium user interface with post-game analysis and ELO tracking.

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Architecture:** Modular, separation of concerns (Constants, Move Generator, Rules Engine, Game State, AI Engine, UI Controller).
- **Concurrency / Performance:** **Web Workers** are utilized for the AI Engine and Background Game Analysis, ensuring the main UI thread never freezes during deep algorithmic calculations.
- **Persistence:** Browser `localStorage` is used to natively track and save user settings, offline ELO ratings, and in-progress game states without requiring a backend server or database.
- **No Dependencies:** Zero external libraries, frameworks, or build tools used. Everything from board rendering to artificial intelligence is built from scratch.

---

## 🧠 Core Game Logic & Architecture

The application is structured into clearly defined modules that govern different aspects of the game:

### 1. Game State Management (`GameState` class)
- **Board Representation:** A 2D array (8x8) mapping to ranks and files, where each piece is represented by a character (e.g., `'K'` for White King, `'p'` for Black Pawn).
- **Variables Tracking:** Tracks the player's turn, castling rights (`wK`, `wQ`, `bK`, `bQ`), en passant target squares, half-move clock (for the 50-move rule), and full-move numbers.
- **History & Replay:** Maintains a history of moves in both Algebraic Notation (for UI) and Long Algebraic Notation (LAN) (for the engine/opening book). It deeply clones state snapshots into a `stateStack`, enabling seamless undo/redo features.
- **Threefold Repetition Hashing:** Generates a compressed string hash of the board and turn state after every move to automatically detect if a position has occurred three times, triggering a draw.

### 2. Rules Engine & Move Generation (`rulesEngine`)
- **Move Generation:** Calculates pseudo-legal moves for pieces dynamically based on their fundamental movement rules.
- **Ray-Casting Attack Detection:** Instead of regenerating all opponent moves to see if a square is under attack (which is exponentially slow), the engine utilizes an optimized "line-of-sight" ray-casting approach. From a target square, it looks outward in all directions to see if an enemy piece capable of attacking from that direction exists.
- **Legal Move Verification:** To find fully legal moves, the engine temporarily plays a pseudo-legal move on a cloned board, uses the optimized attack-detection on its King, and validates whether the move leaves the King in Check.
- **Special Rules:** Fully handles Edge Cases including Castling (validating path safety and rights), En Passant, and Pawn Promotion.

### 3. Artificial Intelligence (`aiEngine`)
- **Minimax Algorithm with Alpha-Beta Pruning:** The AI uses a recursive search tree to look multiple turns ahead. It evaluates moves by assuming the opponent will also play their best response (Minimax). The Alpha-Beta pruning heavily optimizes this by immediately discarding branches of computation that mathematically cannot be better than a previously evaluated path.
- **Move Ordering:** The AI sorts candidate moves by priority (e.g., Captures and Promotions first) to drastically improve the efficiency of Alpha-Beta pruning, causing earlier cutoffs in the search tree.
- **Positional Evaluation (PST):** Beyond material value (Queen = 900, Pawn = 100), the AI evaluates the *position* of its pieces using Piece-Square Tables. For example, knights are scored higher in the center of the board, and pawns are scored higher as they advance toward promotion.
- **Opening Book:** Before initiating deep algorithmic searches, the AI references a hardcoded dictionary (`OPENING_BOOK`) of common LAN chess openings (e.g., Sicilian Defense, Ruy Lopez) to instantly play historically perfect moves during the start of the game.
- **Multithreading:** The AI processing runs inside a dedicated Web Worker environment (`IS_WORKER` fork in `script.js`). This ensures that even at deeper computational limits (Depth 3 and 4), the browser's UI thread stays completely responsive.

### 4. Post-Game Analysis & ELO System
- **Background Move Evaluation:** While you play against the AI, the Web Worker silently evaluates your moves in the background asynchronously. It compares the material/positional evaluation of the move you *actually* played against the algorithmic *best* move.
- **Visual Classification:** Based on the mathematical difference in evaluations, the engine classifies your move as *Excellent, Good, Inaccuracy, Mistake,* or *Blunder*.
- **Post-Game Review:** After checkmate or a draw, players can enter "Review Mode." This allows them to step through the game turn-by-turn. The UI uses an SVG-based arrowhead overlay to visually highlight where a piece originated and where it should have gone instead (specifically targeting blunders).
- **Dynamic Local ELO:** Uses standard K=32 Elo mathematical formulation to adjust your offline rating after matches depending on the selected AI Difficulty (Easy = 800, Med = 1200, Hard = 1600).

---

## 📱 Progressive Web App (PWA) Installability

This game functions as a fully offline-capable, natively installable Progressive Web App.

- **Offline Support:** Once launched or installed via a browser, it registers a strictly scoped background Service Worker caching the entire local architecture (`HTML`, `CSS`, `JS`, and vector icons). You can fully execute deep AI calculations in Airplane Mode!
- **Zero-Block Updates:** Utilizing the *Stale-While-Revalidate* routing strategy, the app loads sequentially from the cache *instantaneously* guaranteeing you never meet a frozen blank screen, while it fetches the newest bug-fixes transparently in the background, making them ready directly for your next launch!
- **Homescreen UI Polish:** Hand-tuned for standalone mobile execution:
  - Disables iOS/Android bounce & pull-to-refresh overscroll elasticity.
  - Sits flush around top notches and swiping bounds naturally using dynamic CSS `safe-area-inset` coordinates.
  - Supresses standard web artifacts like link highlighting flashes and pinch-zooming boundaries.
- **Apple iOS Compatibility:** Built compliant with Safari engine limitations, strictly supplying valid transparent PNG variant sizes arrays mapped expressly directly to native `apple-touch-icon` meta properties ensuring seamless homescreen rendering.

### PWA Architecture Nodes
The PWA behavior depends organically on natively injected local files without external CDNs:
- `manifest.webmanifest` - The core metadata tracking names, theming colors (`#1e293b`), standalone intent, and `asset/icons` endpoints.
- `service-worker.js` - Local cache controller governing the background fetches safely supporting logic updates without breaking `script.js` worker threads.

---

## 🚀 Execution & Setup

Simply open `index.html` in any modern web browser to play. 

No build steps, package managers, or local web servers are required. Because it uses Web Workers dynamically via the same script file, ensure that if you run into any strictly locked-down origin browser policy blocking local `file://` workers, you serve it through a basic local server like `npx serve .` or the VSCode Live Server extension.
