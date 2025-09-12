# THE CHESS GAME

A modern, interactive web-based chess game with a good UI, move history, captured pieces display, and a simple AI opponent. Built using HTML, CSS and JavaScript.

This project has been refactored to use the powerful `chess.js` library for game logic and `chessboard.js` for the user interface, providing a robust and bug-free chess experience.

## Features

- **Interactive Chessboard**: Drag-and-drop pieces with smooth animations.
- **Player vs. Computer**: Play against a simple AI that makes random legal moves.
- **Correct Chess Logic**: All rules of chess are enforced by the `chess.js` library.
- **Move History**: Track all moves made during the game.
- **Player Turn Indicator**: Visual cue for whose turn it is.
- **Game Status**: Displays current game state (in progress, check, checkmate, draw).
- **Controls**: New Game and Undo buttons.

## Technologies Used

- **HTML5 & CSS3**: Structure and styling
- **JavaScript (ES6+)**: Game logic and interactivity
- **[jQuery](https://jquery.com/)**: DOM manipulation (used by chessboard.js)
- **[chess.js](https://github.com/jhlywa/chess.js/)**: Chess rules and move validation
- **[chessboard.js](https://chessboardjs.com/)**: Interactive chessboard UI
- **[Font Awesome](https://fontawesome.com/)**: Icons

## Getting Started

1. **Clone or Download** this repository.
2. **Open `index.html`** in your web browser.
3. **Play Chess!**

No build steps or server required—everything runs in the browser.

## File Structure

- `index.html` — Main HTML file
- `style.css` — Custom styles
- `script.js` — Game logic and UI interactions, using chess.js and chessboard.js
