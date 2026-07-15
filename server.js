/* const { spawn } = require('child_process');

// Assuming you have Fairy-Stockfish or ffish installed
const engine = spawn('./bin/fairy-stockfish.exe'); // Adjust the path to your engine executable

// 1. Tell the engine where your variants file is
engine.stdin.write('setoption name VariantPath value ./variants.ini\n');

// 2. Select the custom variant you just defined
engine.stdin.write('setoption name UCI_Variant value 00copper\n');

// 3. Start game / Verify the configuration
engine.stdin.write('ucinewgame\n');
engine.stdin.write('position startpos\n');
engine.stdin.write('d\n'); // Command to display board to verify

// Listen for engine output
engine.stdout.on('data', (data) => {
  console.log(data.toString());
});

*/

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// __dirname is the directory of the current module, which is where server.js is located.
app.use(express.static(__dirname));

let mydir = __dirname;
console.log('Serving static files from directory:', mydir);







const rooms = new Map();

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: [],
      state: null,
      createdAt: Date.now(),
      public: false
    });
  }
  return rooms.get(roomId);
}

function emitLobbyList() {
  const publicRooms = Array.from(rooms.entries())
    .filter(([, room]) => room.public && room.players.length < 2)
    .map(([roomId, room]) => ({ roomId, playerCount: room.players.length, players: room.players }))
    .sort((a, b) => b.playerCount - a.playerCount);

  io.emit('lobby-list', { rooms: publicRooms });
}

io.on('connection', (socket) => {
  emitLobbyList();

  socket.on('create-room', ({ playerName, playerId, public: isPublic }) => {
    const roomId = `room-${Math.random().toString(36).slice(2, 8)}`;
    const room = getRoomState(roomId);
    room.players = [];
    // initialize authoritative game state so turn validation works reliably
    room.state = { board: null, turn: 'b', moveHistory: [] };
    room.host = socket.id;
    room.public = Boolean(isPublic);
    socket.join(roomId);
    const side = 'b';
    room.players.push({ id: socket.id, playerId: playerId || socket.id, name: playerName || 'Host', side });
    socket.emit('room-created', { roomId, role: 'host', playerId: playerId || socket.id, side });
    io.to(roomId).emit('room-update', { roomId, players: room.players });
    emitLobbyList();
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      room.players = (room.players || []).filter((player) => player.id !== socket.id && player.playerId !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      }
      else {
        io.to(roomId).emit('room-update', { roomId, players: room.players });
      }
    }
    emitLobbyList();
  });        

  socket.on('join-room', ({ roomId, playerName, playerId }) => {
    const room = getRoomState(roomId);
    if (!room) {
      socket.emit('room-error', 'Room not found');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('room-error', 'Room is full');
      return;
    }

    socket.join(roomId);
    const side = room.players.length === 0 ? 'b' : 'w';
    room.players.push({ id: socket.id, playerId: playerId || socket.id, name: playerName || `Player ${room.players.length + 1}`, side });
    socket.emit('room-joined', { roomId, role: 'guest', playerId: playerId || socket.id, side });
    io.to(roomId).emit('room-update', { roomId, players: room.players });
    emitLobbyList();

    if (room.players.length === 2) {
      // Ensure the room has an authoritative starting state
      const initialState = room.state || 
        { board: null, 
          turn: 'b', 
          moveHistory: []
        };
      room.state = initialState;
      io.to(roomId).emit('game-start', { roomId, players: room.players, state: initialState });
    }
  });

  socket.on('rejoin-room', ({ roomId, playerId }) => {
    const room = getRoomState(roomId);
    if (!room) {
      socket.emit('room-error', 'Room not found');
      return;
    }
    socket.join(roomId);
    const existingPlayer = room.players.find((player) => player.playerId === playerId || player.id === playerId || player.id === socket.id);
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      socket.emit('reconnected', { roomId, player: existingPlayer, state: room.state, side: existingPlayer.side });
      io.to(roomId).emit('room-update', { roomId, players: room.players });
    } else {
      socket.emit('room-error', 'You are not part of this room');
    }
  });

  socket.on('game-state', ({ roomId, state }) => {
    const room = getRoomState(roomId);
    room.state = state;
    socket.to(roomId).emit('game-state', { roomId, state });
  });

  socket.on('move', ({ roomId, move, state: incomingState }) => {
    const room = getRoomState(roomId);
    if (!room) return;

    const player = room.players.find((entry) => entry.id === socket.id || entry.playerId === socket.id);
    if (!player) return;

    const requestedSide = move && typeof move.side === 'string' ? move.side : null;
    // Use the authoritative room state to validate whose turn it is.
    const currentTurn = room.state && typeof room.state.turn === 'string' ? room.state.turn : null;
    if (currentTurn && currentTurn !== player.side) {
      socket.emit('move-error', { message: 'It is not your turn.' });
      return;
    }
    // If no authoritative turn is available yet, fall back to the client's requested side
    if (!currentTurn && requestedSide && requestedSide !== player.side) {
      socket.emit('move-error', { message: 'It is not your turn.' });
      return;
    }

    if (incomingState) {
      room.state = incomingState;
    }

    const forwardedMove = { ...move, side: player.side };
    console.log(`Move by ${player.name || player.playerId} in ${roomId}:`, forwardedMove);
    socket.to(roomId).emit('move', { move: forwardedMove, state: room.state });
    socket.to(roomId).emit('game-state', { roomId, state: room.state });
  });

  socket.on('takeback-request', ({ roomId, side }) => {
    const room = getRoomState(roomId);
    if (!room) return;

    const player = room.players.find((entry) => entry.id === socket.id || entry.playerId === socket.id);
    if (!player) return;

    console.log(`Takeback request by ${player.name || player.playerId} (${side}) in ${roomId}`);
    socket.to(roomId).emit('takeback-request', { side: side });
  });

  socket.on('takeback-response', ({ roomId, side, accepted }) => {
    const room = getRoomState(roomId);
    if (!room) return;

    const player = room.players.find((entry) => entry.id === socket.id || entry.playerId === socket.id);
    if (!player) return;

    console.log(`Takeback response by ${player.name || player.playerId} (${side}): ${accepted ? 'accepted' : 'declined'} in ${roomId}`);
    socket.to(roomId).emit('takeback-response', { accepted: accepted });
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      room.players = (room.players || []).filter((player) => player.id !== socket.id && player.playerId !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('room-update', { roomId, players: room.players });
      }
    }
    emitLobbyList();
  });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Shogi server listening on http://localhost:${port}`);
  });
}

module.exports = { server, io, rooms, emitLobbyList };
