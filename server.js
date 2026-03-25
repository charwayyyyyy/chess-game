const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = {
      players: { [socket.id]: 'w' }, // Creator is white
      chess: new Chess(),
      status: 'waiting' // waiting, playing, gameover
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, color: 'w' });
  });

  socket.on('joinRoom', (roomId) => {
    roomId = roomId.toUpperCase();
    const room = rooms[roomId];
    if (room && room.status === 'waiting') {
      const pIds = Object.keys(room.players);
      room.players[socket.id] = room.players[pIds[0]] === 'w' ? 'b' : 'w';
      room.status = 'playing';
      socket.join(roomId);
      
      socket.emit('roomJoined', { roomId, color: room.players[socket.id], fen: room.chess.fen() });
      io.to(roomId).emit('gameStart', { fen: room.chess.fen() });
    } else {
      socket.emit('errorMsg', 'Room not found or already full.');
    }
  });

  socket.on('move', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      const color = room.players[socket.id];
      const chess = room.chess;
      
      if (chess.turn() === color) {
        try {
          // Attempt the move. move is expected to be { from, to, promotion }
          const res = chess.move(move);
          if (res) {
            let status = 'playing';
            let result = null;
            if (chess.isGameOver()) {
              status = 'gameover';
              if (chess.isCheckmate()) {
                result = chess.turn() === 'w' ? 'Black Wins by Checkmate' : 'White Wins by Checkmate';
              } else if (chess.isDraw()) {
                result = 'Draw';
              }
            }
            room.status = status;
            io.to(roomId).emit('moveMade', { move, fen: chess.fen(), status, result });
          }
        } catch (e) {
          socket.emit('errorMsg', 'Invalid move.');
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        io.to(roomId).emit('opponentDisconnected');
        delete rooms[roomId]; // Simple approach: close room on disconnect
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
