const assert = require('assert');
const Client = require('socket.io-client');
const { server, rooms } = require('../server');

async function runTest() {
  const port = await new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });

  const clientA = Client(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
  const clientB = Client(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });

  const roomCreated = new Promise((resolve) => clientA.on('room-created', resolve));
  const lobbyList = new Promise((resolve) => clientA.on('lobby-list', resolve));
  const joined = new Promise((resolve) => clientB.on('room-update', resolve));
  const reconnected = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Reconnect timed out')), 5000);
    clientB.on('reconnected', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

  let createdRoomId = null;
  clientA.on('room-created', (payload) => {
    createdRoomId = payload.roomId;
  });

  clientA.on('connect', () => {
    clientA.emit('create-room', { playerName: 'Alice', playerId: 'player-a', public: true });
  });

  clientB.on('connect', () => {
    if (createdRoomId) {
      clientB.emit('join-room', { roomId: createdRoomId, playerName: 'Bob', playerId: 'player-b' });
    }
  });

  const createdPayload = await roomCreated;
  assert.strictEqual(createdPayload.roomId.startsWith('room-'), true);

  const lobbyPayload = await lobbyList;
  assert.ok(Array.isArray(lobbyPayload.rooms));

  clientB.emit('join-room', { roomId: createdPayload.roomId, playerName: 'Bob', playerId: 'player-b' });

  const joinPayload = await joined;
  assert.ok(joinPayload.players.some((player) => player.name === 'Bob'));

  clientB.disconnect();
  clientB.connect();
  clientB.once('connect', () => {
    clientB.emit('rejoin-room', { roomId: createdPayload.roomId, playerId: 'player-b' });
  });

  const reconnectPayload = await reconnected;
  assert.strictEqual(reconnectPayload.roomId, createdPayload.roomId);

  let receivedWrongSideMove = false;
  clientB.on('move', () => {
    receivedWrongSideMove = true;
  });

  clientA.emit('move', {
    roomId: createdPayload.roomId,
    move: { type: 'move', piece: 'p', row: 4, col: 4, sr: 6, sc: 4, side: 'w' }
  });

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(receivedWrongSideMove, false);

  clientA.emit('move', {
    roomId: createdPayload.roomId,
    move: { type: 'move', piece: 'p', row: 4, col: 4, sr: 6, sc: 4, side: 'b' }
  });

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(receivedWrongSideMove, true);

  let relayCount = 0;
  clientB.on('move', () => {
    relayCount += 1;
  });

  clientA.emit('move', {
    roomId: createdPayload.roomId,
    move: { type: 'move', piece: 'p', row: 5, col: 4, sr: 6, sc: 4, side: 'b' },
    state: { board: [], turn: 'w', moveHistory: ['1. B: p6g-6f'] }
  });

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.strictEqual(relayCount, 1);
  assert.strictEqual(rooms.get(createdPayload.roomId).state.turn, 'w');

  clientA.close();
  clientB.close();
  await new Promise((resolve) => server.close(resolve));
  console.log('socket lobby and reconnect ok');
}

runTest().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
