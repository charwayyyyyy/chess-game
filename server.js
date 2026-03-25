const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(__dirname));

const rooms = {};

// Clean up dead rooms every minute
setInterval(() => {
  const now = Date.now();
  for (const roomId in rooms) {
    if (rooms[roomId].status === 'finished' || (rooms[roomId].lastActivity && now - rooms[roomId].lastActivity > 1000 * 60 * 60)) {
      delete rooms[roomId];
    }
  }
}, 60000);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createRoom', ({ playerId }) => {
    if (!playerId) return;
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = {
      roomId,
      chess: new Chess(),
      players: { w: { socketId: socket.id, playerId, connected: true }, b: null },
      status: 'waiting',
      lastActivity: Date.now()
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, color: 'w' });
  });

  socket.on('joinRoom', ({ roomId, playerId }) => {
    if (!roomId || !playerId) return;
    roomId = roomId.toUpperCase();
    const room = rooms[roomId];
    
    if (!room) {
      return socket.emit('errorMsg', 'Room not found.');
    }
    room.lastActivity = Date.now();

    // Reconnect logic
    let reconnectedAs = null;
    if (room.players.w && room.players.w.playerId === playerId) reconnectedAs = 'w';
    else if (room.players.b && room.players.b.playerId === playerId) reconnectedAs = 'b';
    
    if (reconnectedAs) {
      room.players[reconnectedAs].socketId = socket.id;
      room.players[reconnectedAs].connected = true;
      socket.join(roomId);
      socket.emit('roomJoined', { roomId, color: reconnectedAs, fen: room.chess.fen(), history: room.chess.history({ verbose: true }) });
      io.to(roomId).emit('playerStatus', { color: reconnectedAs, connected: true });
      if (room.players.w && room.players.b) {
        room.status = 'playing';
        io.to(roomId).emit('gameSync', { fen: room.chess.fen(), turn: room.chess.turn(), history: room.chess.history({ verbose: true }), status: room.status });
      }
      return;
    }

    // New joiner logic
    if (room.status === 'waiting') {
      const freeColor = room.players.w ? 'b' : 'w';
      room.players[freeColor] = { socketId: socket.id, playerId, connected: true };
      room.status = 'playing';
      socket.join(roomId);
      
      socket.emit('roomJoined', { roomId, color: freeColor, fen: room.chess.fen(), history: room.chess.history({ verbose: true }) });
      io.to(roomId).emit('gameSync', { fen: room.chess.fen(), turn: room.chess.turn(), history: room.chess.history({ verbose: true }), status: room.status });
    } else {
      socket.emit('errorMsg', 'Room is already full.');
    }
  });

  socket.on('move', ({ roomId, playerId, move }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    room.lastActivity = Date.now();

    const color = room.players.w && room.players.w.playerId === playerId ? 'w' : (room.players.b && room.players.b.playerId === playerId ? 'b' : null);
    if (!color) return;

    const chess = room.chess;
    
    if (chess.turn() === color) {
      try {
        const res = chess.move(move);
        if (res) {
          let reqStatus = 'playing';
          let result = null;
          if (chess.isGameOver()) {
            reqStatus = 'finished';
            if (chess.isCheckmate()) {
              result = chess.turn() === 'w' ? 'Black Wins by Checkmate' : 'White Wins by Checkmate';
            } else if (chess.isDraw()) {
              result = 'Draw';
            }
          }
          room.status = reqStatus;
          io.to(roomId).emit('moveMade', { 
            move: res, 
            fen: chess.fen(), 
            turn: chess.turn(),
            status: reqStatus, 
            result,
            history: chess.history({ verbose: true })
          });
        }
      } catch (e) {
        socket.emit('errorMsg', 'Invalid move according to server logic.');
        socket.emit('gameSync', { fen: chess.fen(), turn: chess.turn(), history: chess.history({ verbose: true }), status: room.status });
      }
    } else {
      socket.emit('errorMsg', 'Not your turn!');
      socket.emit('gameSync', { fen: chess.fen(), turn: chess.turn(), history: chess.history({ verbose: true }), status: room.status });
    }
  });
  
  // Optional features
  socket.on('offerDraw', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const oppColor = room.players.w.playerId === playerId ? 'b' : 'w';
    if (room.players[oppColor] && room.players[oppColor].connected) {
      io.to(room.players[oppColor].socketId).emit('drawOffered');
    }
  });

  socket.on('acceptDraw', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    room.status = 'finished';
    io.to(roomId).emit('moveMade', { fen: room.chess.fen(), turn: room.chess.turn(), status: 'finished', result: 'Draw By Agreement', history: room.chess.history({ verbose: true }) });
  });

  socket.on('resign', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;
    const color = room.players.w.playerId === playerId ? 'w' : 'b';
    room.status = 'finished';
    const result = color === 'w' ? 'Black Wins by Resignation' : 'White Wins by Resignation';
    io.to(roomId).emit('moveMade', { fen: room.chess.fen(), turn: room.chess.turn(), status: 'finished', result, history: room.chess.history({ verbose: true }) });
  });

  socket.on('chat', ({ roomId, playerId, msg }) => {
    const room = rooms[roomId];
    if (!room) return;
    const color = room.players.w && room.players.w.playerId === playerId ? 'w' : 'b';
    io.to(roomId).emit('chatMsg', { color, msg });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      let dColor = null;
      if (room.players.w && room.players.w.socketId === socket.id) {
        room.players.w.connected = false;
        dColor = 'w';
      } else if (room.players.b && room.players.b.socketId === socket.id) {
        room.players.b.connected = false;
        dColor = 'b';
      }
      
      if (dColor) {
        io.to(roomId).emit('playerStatus', { color: dColor, connected: false });
        // Don't delete room immediately, allow reconnection window. Wait up to an hour handled by cleanup interval
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
