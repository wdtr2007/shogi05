// pocket shogi copper javascript program by James Schmidt

const ImageXref = {                              
    "+B" :    "wH.png",                      
    "+b" :    "bH.png",                      
    "+C" :    "wpC.png",                      
    "+c" :    "bpC.png",                      
    "+G" :    "wE.png",                      
    "+g" :    "bE.png",                      
    "+L" :    "wpL.png",
	"+M" :    "wpM.png",
	"+l" :    "bpl.png",                      
    "+m" :    "bpm.png",                      
    "+N" :   "wpN.png",     
    "+n" :   "bpN.png",     
    "+P" :    "wT.png",
    "+p" :    "bT.png",
    "+R" :    "wD.png",                      
    "+r" :    "bD.png",                      
    "+S" :   "wps.png" ,                    
    "+s" :   "bps.png",                    
    "B" :    "wB.png",                      
    "b" :    "bB.png",                      
    "C" :    "wC.png",                      
    "c" :    "bC.png",                      
    "G" :    "wG.png",                      
    "g" :    "bG.png",                      
    "K" :    "wK.png",                       
    "k" :    "bK.png",                       
    "L" :    "wL.png",                      
    "l" :    "bL.png",
	"M" :    "wM.png",
	"m" :    "bm.png",                      
    "N" :    "wN.png",
    "n" :    "bN.png",
    "P" :    "wP.png",                      
    "p" :    "bP.png",                      
    "R" :    "wR.png",                      
    "r" :    "bR.png",                      
    "S" :    "wS.png",  
    "s" :    "bS.png"

}

const max_moves_no_capture = 120;

let multiplayerSocket = null;
let multiplayerRoomId = null;
let multiplayerRole = 'local';
let multiplayerSide = null;
let multiplayerPlayerName = 'Player';
let multiplayerPlayerId = null;
let multiplayerReady = false;

const dropXref = {                              
 "+B" : [0,12], 
 "+b" : [8,12], 
 "+C" : [0,12], 
 "+c" : [8,12], 
 "+G" : [0,12], 
 "+g" : [8,12], 
 "+L" : [0,12],
 "+l" : [8,12],
 "+M" : [0,12],
 "+m" : [8,12],
 "+N" : [0,12],
 "+n" : [6,12], 
 "+P" : [0,12],
 "+p" : [8,12],
 "+R" : [0,12],
 "+r" : [8,12], 
 "+S" : [0,12], 
 "+s" : [8,12],
 "B" : [0,12], 
 "b" : [8,12], 
 "C" : [0,12], 
 "c" : [8,12], 
 "G" : [0,12], 
 "g" : [8,12],
 "l" : [7,11],
 "L" : [1,12],
 "m" : [7,11], 
 "M" : [1,12],
 "n" : [6,10], 
 "N" : [2,12], 
 "p" : [7,11],
 "P" : [1,12],
 "R" : [0,12], 
 "r" : [8,12], 
 "S" : [0,12], 
 "s" : [8,12],
    
}

const mustPromotePiecesXref = {
	'P': 0,
	'L': 0,
	'N': 1,
	'p': 8,
	'n': 7,
	'l': 8
};


var mousePosition = { xpos: 0, ypos: 0 };
var nop = 0;
var globalSide = "w";
let boardFlipped = false;

document.addEventListener('mousemove', (e) => {
      mousePosition.xpos = e.clientX;
      mousePosition.ypos = e.clientY;
    }
);

document.addEventListener('keydown', (e) => {
    // Check for the desired key (e.g., 'Enter' key)
    if (e.key === ' ') {
        // Prevent default browser behavior for the keypress
        e.preventDefault(); 
        simulateClickAtCursor();
    }
});

function simulateClickAtCursor() {
    // Get the element at the current mouse coordinates
    const elementToClick = document.elementFromPoint(mousePosition.xpos, mousePosition.ypos);

    if (elementToClick) {
        // Create a new MouseEvent
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientx: mousePosition.xpos,
            clientY: mousePosition.ypos
        });

        // Dispatch the click event on the element
        elementToClick.dispatchEvent(clickEvent);
    }
}





function pgm01() {
	// Board representation: 13x9 array, rows 0..8 = rank 9..1
	const startFenw = "2mnsgkgsnm2/c2r5b3/2ppppppppp2/13/13/13/2PPPPPPPPP2/3B5R3/2MNSGKGSNM1C w";
	const startFen  = "c1mnsgkgsnm2/3r5b3/2ppppppppp2/13/13/13/2PPPPPPPPP2/3B5R2C/2MNSGKGSNM2 b";

	async function playSoundOld(file1) {
		const audio = new Audio(file1);
		await audio.play();
	}

	function playSound(file1) {
		const audio = new Audio(file1);
		audio.play();
	}

	function parseFen(fen){
		const parts = fen.split(' ');
		const rows = parts[0].split('/');
		const board = Array.from({length:9},()=>Array(13).fill(null));
		
		for(let r=0;r<9;r++){
			let file=0;
			for(let i=0;i<rows[r].length;i++){
				const ch = rows[r][i];
				if (ch === '+'){
					const nxt = rows[r][i+1];
					if (nxt){ board[r][file] = '+' + nxt; file++; i++; }
					else { /* malformed, skip */ }
				} else if (/\d/.test(ch)){
					file += parseInt(ch,10);
				} else {
					board[r][file] = ch;
					file++;
				}
			}
		}

		// the board now has all chess pieces in place, and nulls for empty squares.

		globalSide = parts[1] || 'w';
		
		playSound('sound/board-start.mp3');
		return {board, turn: parts[1] || 'w'};
	}

	const svgPieces = {
		p:'♟', r:'♜', n:'♞', b:'♝',  k:'♚',
		P:'♙', R:'♖', N:'♘', B:'♗',  K:'♔',
		S:'S',G:'G',L:'L',C:'C',
		s:'s',g:'g',l:'l',c:'c',
		'+p':'+♟', '+r':'+♜', '+n':'+♞', '+b':'♝', 
		'+P':'+♙', '+R':'+♖', '+N':'+♘', '+B':'+♗', 
		'+S':'+S','+G':'+G','+L':'+L','+C':'+C', '+M': '+M',
		'+s':'+s','+g':'+g','+l':'+l','+c':'c','+m':'+m','m':'m'
	};

	const state = parseFen(startFen);

	state.halfMaxMovesNoCapture = 0;
	state.moveHistory = [];
	state.history = [];
	state.moveType = null;
	state.capturePiece = [];
	state.section = 1;

	const movesTextarea = document.getElementById('movesText');
	const takeBackButton = document.getElementById('takeBackButton');
	const takeBackOK = document.getElementById('takeBackOK');
	const takeBackNo = document.getElementById('takeBackNo');
	const takebackRequestPanel = document.getElementById('takebackRequestPanel');
	const createRoomButton = document.getElementById('createRoomButton');
	const joinRoomButton = document.getElementById('joinRoomButton');
	 
	const roomIdInput = document.getElementById('roomIdInput');
	const playerNameInput = document.getElementById('playerNameInput');
	const publicRoomCheckbox = document.getElementById('publicRoomCheckbox');
	const roomStatusEl = document.getElementById('roomStatus');
	const lobbyListEl = document.getElementById('lobbyList');
	const startButton = document.getElementById('startButton');
	const highlightButton = document.getElementById('HighlightButton');
	const FENButton = document.getElementById('DisplayFEN');
	const loadFileButton = document.getElementById('loadFile');
	const fileNameText = document.getElementById('fileNameText');
	const stopButton = document.getElementById('stopButton');
	const whiteTimeEl = document.getElementById('whiteTime');
	const blackTimeEl = document.getElementById('blackTime');
	const whiteByoEl = document.getElementById('whiteByo');
	const blackByoEl = document.getElementById('blackByo');
	const clockStatusEl = document.getElementById('clockStatus');
	const resetClockButton = document.getElementById('resetClockButton');
	const flipBoardButton = document.getElementById('flipBoardButton');

	let pendingTakebackRequest = false;
	let takebackRequestSent = false;

	function updateRoomStatus(message){
		if (roomStatusEl) roomStatusEl.textContent = message;
	}

	function updateLobbyList(rooms){
		if (!lobbyListEl) return;
		if (!rooms || !rooms.length) {
			lobbyListEl.innerHTML = '<div>No public rooms yet.</div>';
			return;
		}
		lobbyListEl.innerHTML = rooms.map((room) => `<div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px;"><strong>${room.roomId}</strong><span>${room.playerCount}/2 players</span><button type="button" data-room-id="${room.roomId}">Join</button></div>`).join('');
	}

	function getPlayerId(){
		if (multiplayerPlayerId) return multiplayerPlayerId;
		const stored = window.localStorage.getItem('shogi-player-id');
		multiplayerPlayerId = stored || `player-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
		window.localStorage.setItem('shogi-player-id', multiplayerPlayerId);
		return multiplayerPlayerId;
	}

	function joinRoom(roomId){
		if (!multiplayerSocket) initMultiplayer();
		multiplayerRoomId = roomId;
		multiplayerRole = 'guest';
		multiplayerSocket.emit('join-room', { roomId, playerName: multiplayerPlayerName, playerId: getPlayerId() });
		updateRoomStatus(`Joining room ${roomId}...`);
	}

	function updateMovesTextarea(){
		if (!movesTextarea) return;
		movesTextarea.value = state.moveHistory.join('\n');
		movesTextarea.scrollTop = movesTextarea.scrollHeight;
		const tb = document.getElementById('movesText');
		tb.style.bottom = '0px';
	}

	const clock = {
		w: { main: 30 * 60, byo: 30, inByo: false, expired: false },
		b: { main: 30 * 60, byo: 30, inByo: false, expired: false }
	};
	
	let clockInterval = null;

	function pad2(value){ return value.toString().padStart(2,'0'); }
	
	function formatClock(seconds){ 
		const m = Math.floor(seconds / 60); 
		const s = seconds % 60; 
		return `${m}:${pad2(s)}`; 
	}

	function updateClockDisplay(){
		if (whiteTimeEl) whiteTimeEl.textContent = formatClock(clock.w.main);
		if (blackTimeEl) blackTimeEl.textContent = formatClock(clock.b.main);
		if (whiteByoEl) whiteByoEl.textContent = `Byo: ${clock.w.byo}`;
		if (blackByoEl) blackByoEl.textContent = `Byo: ${clock.b.byo}`;
		if ( clockStatusEl ){
			switch(true) {
				case (clock.w.expired):
					clockStatusEl.textContent = 'White time expired — Black wins';
					gameOver = true;
					winner = 'b';
					stopClock();
					winnerReason = 'White time expired';
					playSound('sound/taiko-drum.mp3');
					break;
				case (clock.b.expired):
					clockStatusEl.textContent = 'Black time expired — White wins';
					gameOver = true;
					winner = 'w';
					stopClock();
					winnerReason = 'Black time expired';
					playSound('sound/taiko-drum.mp3');
					break;
				default:
					clockStatusEl.textContent = `Clock running for ${state.turn==='w' ? 'White' : 'Black'}`;
					break;
			}
		}
	}

	function stopClock() { 
		if (clockInterval){ 
			clearInterval(clockInterval); 
			clockInterval = null; 
		} 
	}

	if (stopButton){
		stopButton.addEventListener('click', stopClock);
		playSound('sound/1-click.mp3');
	}

	if (startButton){
		startButton.addEventListener('click', startClock);
		playSound('sound/1-click.mp3');
	}

	if (loadFileButton) {
		loadFileButton.addEventListener('click', async ()=>{
			const fileName = fileNameText ? fileNameText.value.trim() : '';
			if (!fileName) {
				console.warn('No file name specified in fileNameText');
				return;
			}

			try {
				const response = await fetch(fileName);
				if (!response.ok) {
					console.error(`Failed to load file: ${fileName} (${response.status})`);
					return;
				}
				const text = await response.text();
				console.log(`Loaded file: ${fileName}`);
				console.log(text);
			} catch (err) {
				console.error(`Error loading file ${fileName}:`, err);
			}
		});
	}

	function startClock(){
		if (clockInterval) return;
		clockInterval = setInterval(()=>{
			const active = clock[state.turn];
			if (active.expired){ stopClock(); return; }
			if (active.main > 0){
				active.main -= 1;
				if (active.main === 0){
					active.inByo = true;
					active.byo = 30;
				}
			} else {
				active.inByo = true;
				active.byo -= 1;
				if (active.byo <= 0){
					active.byo = 0;
					active.expired = true;
					stopClock();
				}
			}
			updateClockDisplay();
			// r_ender();
		}, 1000);
		updateClockDisplay();
	}

	function resetClock(){
		Object.assign(clock.w, { main: 30 * 60, byo: 30, inByo: false, expired: false });
		Object.assign(clock.b, { main: 30 * 60, byo: 30, inByo: false, expired: false });
		stopClock();
		startClock();
		render('resetClock');
	}

	function isClockExpired() { 
		return clock.w.expired || clock.b.expired; 
	}

	function cloneState(){
		return {
			board: cloneBoard(state.board),
			turn: state.turn,
			halfMaxMovesNoCapture: state.halfMaxMovesNoCapture,
			moveHistory: state.moveHistory.slice(),
			clock: { w: { ...clock.w }, b: { ...clock.b } }
		};
	}

	function restoreState(snapshot){
		state.board = cloneBoard(snapshot.board);
		state.turn = snapshot.turn;
		state.halfMaxMovesNoCapture = snapshot.halfMaxMovesNoCapture;
		state.moveHistory = snapshot.moveHistory.slice();
		if (snapshot.clock){
			Object.assign(clock.w, snapshot.clock.w);
			Object.assign(clock.b, snapshot.clock.b);
		}
		globalSide = state.turn;

		gameOver = false;
		winner = null;
		winnerReason = null;
		updateMovesTextarea();
		updateClockDisplay();
		if (!isClockExpired()) startClock();
		render('restoreState 411');
		state.section = 1;
	}

	// takeback button handler
	if (takeBackButton) {
		takeBackButton.addEventListener('click',()=>{
			if (state.history.length < 3) return;
			
			// If in multiplayer mode, send a request to the opponent
			if (multiplayerSocket && multiplayerRoomId && multiplayerReady) {
				if (takebackRequestSent) {
					updateRoomStatus('Takeback request already sent. Waiting for opponent response...');
					return;
				}
				takebackRequestSent = true;
				multiplayerSocket.emit('takeback-request', {
					roomId: multiplayerRoomId,
					side: multiplayerSide
				});
				updateRoomStatus('Takeback request sent to opponent...');
			} else {
				// Local game: undo 3 half-moves to go back to a position where the player can move differently
				let popsNeeded = 3;
				while (popsNeeded > 0 && state.history.length > 0) {
					const snapshot = state.history.pop();
					restoreState(snapshot);
					popsNeeded--;
				}
				updateRoomStatus('Move taken back');
			}
		});
	}

	// takeback approval button handler
	if (takeBackOK) {
		takeBackOK.addEventListener('click', ()=>{
			if (!pendingTakebackRequest || state.history.length < 3) return;
			
			// Approve the takeback - undo 3 half-moves:
			// 1. Undo the opponent's last move
			// 2. Undo our last move
			// 3. Undo the opponent's move before that
			// This allows the opponent to make a different move
			let popsNeeded = 3;
			while (popsNeeded > 0 && state.history.length > 0) {
				const snapshot = state.history.pop();
				restoreState(snapshot);
				popsNeeded--;
			}
			
			pendingTakebackRequest = false;
			
			if (multiplayerSocket && multiplayerRoomId) {
				// Broadcast the game state after accepting takeback
				broadcastGameState();
				multiplayerSocket.emit('takeback-response', {
					roomId: multiplayerRoomId,
					side: multiplayerSide,
					accepted: true
				});
				updateRoomStatus('Takeback accepted');
			}
			
			// Hide the request panel
			if (takebackRequestPanel) {
				takebackRequestPanel.style.display = 'none';
			}
		});
	}

	// takeback rejection button handler
	if (takeBackNo) {
		takeBackNo.addEventListener('click', ()=>{
			if (!pendingTakebackRequest) return;
			
			pendingTakebackRequest = false;
			
			if (multiplayerSocket && multiplayerRoomId) {
				multiplayerSocket.emit('takeback-response', {
					roomId: multiplayerRoomId,
					side: multiplayerSide,
					accepted: false
				});
				updateRoomStatus('Takeback rejected');
			}
			
			// Hide the request panel
			if (takebackRequestPanel) {
				takebackRequestPanel.style.display = 'none';
			}
		});
	}
	// highlight button handler
	if (highlightButton) {
		highlightButton.addEventListener('click',()=>{
			// Implementation for changing highlight
			globalSide = globalSide === 'w' ? 'b' : 'w';
			render('highlight');
		});
	}

	if (FENButton) { 
		FENButton.addEventListener('click', ()=>{
			let fen = "";

			for(let r=0;r<9;r++){
				for(let i=0;i<13;i++){
					let fpiece = state.board[r][i];
					fen = fen + (fpiece ? fpiece : '@');
					
				}
				fen = fen + "/";
			}

			// place the fen string into fileNameText textarea
			if (fileNameText) {
				fileNameText.value = fen;
			}

		});	
	}

	
		
	

	if (resetClockButton) {
				resetClockButton.addEventListener('click', resetClock);
	}

	if (flipBoardButton) {
		flipBoardButton.addEventListener('click', ()=>{
			boardFlipped = !boardFlipped;
			render('flipBoard');
			playSound('sound/1-click.mp3');
		});
	}

	function initMultiplayer(){
		if (typeof io === 'undefined') return;
		multiplayerSocket = io();
		multiplayerSocket.on('connect', ()=>{
			updateRoomStatus('Connected. Create or join a room to play online.');
			if (multiplayerRoomId) {
				multiplayerSocket.emit('rejoin-room', { roomId: multiplayerRoomId, playerId: getPlayerId() });
			}
		});
		multiplayerSocket.on('room-created', ({ roomId, role, side }) => {
			multiplayerRoomId = roomId;
			multiplayerRole = role;
			multiplayerSide = side || 'b';
			multiplayerReady = true;
			if (roomIdInput) roomIdInput.value = roomId;
			updateRoomStatus(`Room ${roomId} ready. Share this ID with the second player.`);
		});
		multiplayerSocket.on('room-joined', ({ roomId, role, side }) => {
			multiplayerRoomId = roomId;
			multiplayerRole = role;
			multiplayerSide = side || 'w';
			multiplayerReady = true;
			updateRoomStatus(`Joined room ${roomId}. You are playing as ${side === 'b' ? 'Black' : 'White'}.`);
		});
		multiplayerSocket.on('lobby-list', ({ rooms }) => {
			updateLobbyList(rooms);
		});
		multiplayerSocket.on('room-update', ({ players }) => {
			if (players && players.length >= 2) {
				const localPlayer = players.find((player) => player.playerId === getPlayerId() || player.id === multiplayerSocket.id);
				if (localPlayer && localPlayer.side) {
					multiplayerSide = localPlayer.side;
				}
				updateRoomStatus(`Players ready: ${players.map((p)=>p.name).join(' vs ')}`);
			} else if (players && players.length === 1) {
				updateRoomStatus(`Waiting for second player. Current: ${players[0].name}`);
			}
		});
		multiplayerSocket.on('game-start', ({ state: remoteState, players }) => {
			if (remoteState) {
				if (Array.isArray(remoteState.board)) {
					state.board = cloneBoard(remoteState.board);
				}
				state.turn = remoteState.turn || state.turn;
				state.moveHistory = Array.isArray(remoteState.moveHistory) ? remoteState.moveHistory.slice() : [];
				updateMovesTextarea();
			}
			if (players && Array.isArray(players)) {
				const localPlayer = players.find((player) => player.playerId === getPlayerId() || player.id === multiplayerSocket.id);
				if (localPlayer && localPlayer.side) {
					multiplayerSide = localPlayer.side;
				}
			}
			multiplayerReady = true;
			render('game-start');
			updateClockDisplay();
		});
		multiplayerSocket.on('game-state', ({ state: remoteState }) => {
			if (!remoteState) return;
			if (Array.isArray(remoteState.board)) {
				state.board = cloneBoard(remoteState.board);
			}
			state.turn = remoteState.turn || state.turn;
			state.moveHistory = Array.isArray(remoteState.moveHistory) ? remoteState.moveHistory.slice() : [];
			updateMovesTextarea();
			render('remote-state');
			updateClockDisplay();
		});
		multiplayerSocket.on('move', ({ move, state: remoteState }) => {
			if (remoteState) {
				if (Array.isArray(remoteState.board)) {
					state.board = cloneBoard(remoteState.board);
				}
				state.turn = remoteState.turn || state.turn;
				state.moveHistory = Array.isArray(remoteState.moveHistory) ? remoteState.moveHistory.slice() : [];
				updateMovesTextarea();
				render('remote-move');
				updateClockDisplay();
			}
			if (move && move.type === 'move') {
				updateRoomStatus(`Opponent moved: ${move.piece || ''}`);
			}
		});
		multiplayerSocket.on('reconnected', ({ roomId, player, state: remoteState, side }) => {
			multiplayerRoomId = roomId;
			multiplayerReady = true;
			multiplayerPlayerName = player && player.name ? player.name : multiplayerPlayerName;
			multiplayerSide = side || multiplayerSide;
			updateRoomStatus(`Reconnected to ${roomId}.`);
			if (remoteState) {
				if (Array.isArray(remoteState.board)) {
					state.board = cloneBoard(remoteState.board);
				}
				state.turn = remoteState.turn || state.turn;
				state.moveHistory = Array.isArray(remoteState.moveHistory) ? remoteState.moveHistory.slice() : [];
				updateMovesTextarea();
			}
			render('reconnected');
			updateClockDisplay();
		});
		multiplayerSocket.on('room-error', (message) => {
			updateRoomStatus(message);
		});
		multiplayerSocket.on('takeback-request', ({ side }) => {
			// Show the takeback request panel to the opponent
			if (takebackRequestPanel) {
				takebackRequestPanel.style.display = 'block';
			}
			pendingTakebackRequest = true;
			updateRoomStatus('Opponent requests takeback. Please approve or decline.');
		});
		multiplayerSocket.on('takeback-response', ({ accepted }) => {
			takebackRequestSent = false;
			if (accepted) {
				// Opponent accepted the takeback
				// Do NOT pop from history here - wait for the game-state broadcast
				// to get the authoritative board state from the opponent
				updateRoomStatus('Takeback accepted by opponent. Syncing...');
			} else {
				updateRoomStatus('Opponent declined takeback');
			}
		});
	}

	function broadcastGameState(){
		if (!multiplayerSocket || !multiplayerRoomId || !multiplayerReady) return;
		multiplayerSocket.emit('game-state', {
			roomId: multiplayerRoomId,
			state: {
				board: cloneBoard(state.board),
				turn: state.turn,
				moveHistory: state.moveHistory.slice()
			}
		});
	}

	function isLocalTurn(){
		if (!multiplayerSocket || !multiplayerRoomId || !multiplayerReady || multiplayerSide === null) return true;
		return state.turn === multiplayerSide;
	}

	function maybeSendMove(piece, row, col, sr, sc, moveType){
		if (!multiplayerSocket || !multiplayerRoomId || !multiplayerReady || multiplayerSide === null) return;
		multiplayerSocket.emit('move', {
			roomId: multiplayerRoomId,
			move: { type: moveType, piece, row, col, sr, sc, side: multiplayerSide },
			state: {
				board: cloneBoard(state.board),
				turn: state.turn,
				moveHistory: state.moveHistory.slice()
			}
		});
	}

	if (createRoomButton) {
		createRoomButton.addEventListener('click', ()=>{
			multiplayerPlayerName = "B-" + (playerNameInput && playerNameInput.value.trim()) || 'Player';
			if (!multiplayerSocket) initMultiplayer();
			multiplayerSocket.emit('create-room', {
				playerName: multiplayerPlayerName,
				playerId: getPlayerId(),
				public: Boolean(publicRoomCheckbox && publicRoomCheckbox.checked)
			});
			updateRoomStatus('Creating room...');
		});
	}

	

	if (joinRoomButton) {
		joinRoomButton.addEventListener('click', ()=>{
			multiplayerPlayerName = "W-" + (playerNameInput && playerNameInput.value.trim()) || 'Player';
			const requestedRoomId = (roomIdInput && roomIdInput.value.trim()) || '';
			if (!requestedRoomId) {
				updateRoomStatus('Enter a room ID to join.');
				return;
			}
			joinRoom(requestedRoomId);
		});
	}

	if (lobbyListEl) {
		lobbyListEl.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-room-id]');
			if (!button) return;
			multiplayerPlayerName = (playerNameInput && playerNameInput.value.trim()) || 'Player';
			joinRoom(button.getAttribute('data-room-id'));
		});
	}

	function squareName(r,c){
		const files = 'zxihgfedcbaxy';
		return files[c] + (9-r);
	}

	function recordMove(fromR,fromC,toR,toC,orig_piece,piece,isCapture,myCapture_piece){
		const color = piece===piece.toUpperCase() ? 'W ' : 'B ';
		let dashID = '-';
		if (isCapture) dashID = 'x';
		let notation = squareName(fromR,fromC) + dashID + 
		    squareName(toR,toC);
		notation = piece + notation;
		// indicate promotion in notation if destination contains a promoted token
		// const finalPiece = state.board[toR] && state.board[toR][toC];
		const finalPiece = state.board[toR][toC];
		

		if (dashID === 'x') {
			notation += ' (' + state.capturePiece + ')';
		} else {
			if (finalPiece && 
				typeof finalPiece === 'string' && 
				finalPiece.startsWith('+') && orig_piece !== finalPiece) {
				notation += ' (promoted)';
			} 
		}


		const moveIndex = state.moveHistory.length;
		const moveNumber = Math.floor(moveIndex / 2) + 1;
		let moveNumberStr = moveNumber.toString().padStart(3, '0');
		const prefix = color === 'W ' ? `${moveNumberStr}.` : `${moveNumberStr}.`;
		state.moveHistory.push(`${prefix} ${color}: ${notation}`);
		updateMovesTextarea();
	}

	// Utilities
	function inBounds(r,c){return r>=0&&r<9&&c>=2&&c<11}
	function cloneBoard(b){return b.map(row=>row.slice())}
	function isWhitePiece(p){return p && p === p.toUpperCase()}
	function colorOf(p){ if (!p) return null; return isWhitePiece(p)?'w':'b' }

	function basePiece(p){ if (!p) return null; return (typeof p === 'string' && p.startsWith('+')) ? p[1] : p; }
	function isPromoted(p){ return typeof p === 'string' && p.startsWith('+'); }
	
	function canPromotePiece(raw){
		if (!raw || isPromoted(raw)) return false;
		const p = basePiece(raw);
		return !['K','k'].includes(p);
	}
	function inPromotionZone(color,row){
		return (color === 'w' && row <= 2) || (color === 'b' && row >= 6);
	}
	function isSilverLike(raw){
		if (!isPromoted(raw)) return false;
		const p = basePiece(raw).toUpperCase();
		return ['S','C'].includes(p);
	}
	function isGoldLike(raw){
		if (!isPromoted(raw)) return false;
		const p = basePiece(raw).toUpperCase();
		return ['P','L','N','S','C'].includes(p);
	}
	
	function isDragon(raw) { return raw === '+R' || raw === '+r'; }
	function isHorse(raw)  { return raw === '+B' || raw === '+b'; }

	function boardToFen(board){
		const rows = [];
		for(let r=0;r<9;r++){
			let row = '';
			let empty = 0;
			for(let c=0;c<13;c++){
				const p = board[r][c];
				if (!p){ empty++; } else { if (empty>0){ row += empty; empty = 0; } row += p; }
			}
			if (empty>0) row += empty;
			rows.push(row);
		}
		return rows.join('/');
	}

	function positionKeyFromState(s){
		const board = (s && s.board) || state.board;
		const turn = (s && s.turn) || state.turn;
		return boardToFen(board) + ' ' + turn;
	}

	function isSquareAttacked(board,r,c,attackerColor){
		const enemyPawn = attackerColor==='w' ? 'P' : 'p';
		const enemyKnight = attackerColor==='w' ? 'N' : 'n';
		const enemyBishop = attackerColor==='w' ? 'B' : 'b';
		const enemyRook = attackerColor==='w' ? 'R' : 'r';
		const enemyKing = attackerColor==='w' ? 'K' : 'k';
		const enemyLance = attackerColor==='w' ? 'L' : 'l';
		const enemyPromotedLance = attackerColor==='w' ? '+L' : '+l';
		const enemyCopper = attackerColor==='w' ? 'C' : 'c';
		const enemySilver = attackerColor==='w' ? 'S' : 's';
		const enemyGold = attackerColor==='w' ? 'G' : 'g';
		const enemyDrunkElephant = attackerColor==='w' ? '+G' : 'g';
		const enemyDragon = attackerColor==='w' ? '+R' : '+r';
		const enemyHorse = attackerColor==='w' ? '+B' : '+b';
		const enemySideMover = attackerColor==='w' ? 'M' : 'm';
		const enemyPromotedSideMover = attackerColor==='w' ? '+M' : '+m';
		const pawnDir = attackerColor==='w' ? -1 : 1;

		// pawnDeltas
		for(const dc of [-1,1]){
			const pr = r + pawnDir, pc = c + dc;
			const target = board[pr] && board[pr][pc];
			if (inBounds(pr,pc) && target && !isPromoted(target) && basePiece(target)===enemyPawn) return true;
		}
		
		//knightDeltas
		for(const [dr,dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (inBounds(nr,nc) && target && !isPromoted(target) && basePiece(target)===enemyKnight) return true;
		}
		
		//bishopDeltas
		for(const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
			let nr = r + dr, nc = c + dc;
			while(inBounds(nr,nc)){
				const target = board[nr][nc];
				if (target){
					const bp = basePiece(target);
					if (bp===enemyBishop || target===enemyHorse) return true;
					break;
				}
				nr += dr; nc += dc;
			}
		}
		
		//PromotedSideMoverDeltas #1
		for(const [dr,dc] of [[1,0],[-1,0]]){
			let nr = r + dr, nc = c + dc;
			while(inBounds(nr,nc)){
				const target = board[nr][nc];
				if (target){
					const bp = basePiece(target);
					if (bp===enemyPromotedSideMover ||  target===enemyPromotedSideMover) return true;
					break;
				}
				nr += dr; nc += dc;
			}
		}

		//PromotedSideMoverDeltas #2
		const PromotedSideMoverDeltas = [[0,1],[0,-1]];
		for(const [dr,dc] of PromotedSideMoverDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (!inBounds(nr,nc) || !target) continue;
			if (basePiece(target)===enemyPromotedSideMover) return true;
			if (target===enemyPromotedSideMover) return true;
		}

		//rookDeltas
		for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
			let nr = r + dr, nc = c + dc;
			while(inBounds(nr,nc)){
				const target = board[nr][nc];
				if (target){
					const bp = basePiece(target);
					if (bp===enemyRook ||  target===enemyDragon) return true;
					break;
				}
				nr += dr; nc += dc;
			}
		}

		//kingDeltas
		const kingDeltas = [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
		for(const [dr,dc] of kingDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (!inBounds(nr,nc) || !target) continue;
			if (basePiece(target)===enemyKing) return true;
			if (target===enemyDragon || target===enemyHorse) return true;
		}
		
		//drunkElephantDeltas
		const drunkElephantDeltas = attackerColor==='w'
			? [[-1,0],[-1,-1],[-1,1],  [ 1,-1],[ 1,1],  [0,-1],[0,1]]
			: [[ 1,0],[ 1,-1],[ 1,1],  [-1,-1],[-1,1],  [0,-1],[0,1]];
		for(const [dr,dc] of drunkElephantDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (!inBounds(nr,nc) || !target) continue;
			if (target===enemyDrunkElephant) return true;
		}

		//lanceDeltas
		const lanceDir = attackerColor==='w' ? 1 : -1;
		let lr = r + lanceDir;
		while(inBounds(lr,c)){
			const target = board[lr][c];
			if (target){
				if (!isPromoted(target) && basePiece(target)===enemyLance) return true;
				break;
			}
			lr += lanceDir;
		}
		
		//copperDeltas
		const copperDeltas = attackerColor==='w'
			? [[-1,0],[-1,-1],[-1,1],[1,0]]
			: [[1,0],[1,-1],[1,1],[-1,0]];
		for(const [dr,dc] of copperDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (inBounds(nr,nc) && target && !isPromoted(target) && basePiece(target)===enemyCopper) return true;
		}
		
		//silverDeltas
		const silverDeltas = attackerColor==='w'
			? [[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]]
			: [[1,0],[1,-1],[1,1],[-1,-1],[-1,1]];
		for(const [dr,dc] of silverDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (inBounds(nr,nc) && target && (basePiece(target)===enemySilver || isSilverLike(target))) return true;
		}

		//PromotedLanceDeltas
		const promotedLanceDeltas = attackerColor==='w'
			? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]
			: [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1]];
		for(const [dr,dc] of promotedLanceDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (inBounds(nr,nc) && target && (basePiece(target)===enemyPromotedLance) ) return true;
		}
		
		//goldDeltas
		const goldDeltas = attackerColor==='w'
			? [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]
			: [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1]];
		for(const [dr,dc] of goldDeltas){
			const nr = r + dr, nc = c + dc;
			const target = board[nr] && board[nr][nc];
			if (inBounds(nr,nc) && target && (basePiece(target)===enemyGold || isGoldLike(target))) return true;
		}

		return false;
	}

	function whiteInHandNull(board){
		let c=12;
		for(let r=7;r>=0;r--){
			if (board[r][c]===null) return [r,c];
		}
		for(let r=7;r>=0;r--){
			if (board[r][c]=== 'P') return [r,c];
		}

		return null;
	}

	function blackInHandNull(board){
		let c=0;
		for(let r=1;r<=7;r++){
			if (board[r][c]===null) return [r,c];
		}

		for(let r=1;r<=7;r++){
			if (board[r][c]=== 'p' ) return [r,c];
		}

		return null;
	}

	// Generate pseudo-legal moves for piece at r,c
	function genMoves(board,r,c){
		const raw = board[r][c]; if (!raw) return [];
		const moves = [];
		const chess_piece_color = colorOf(raw);

		const steps = (deltas)=>{
			for(const [dr,dc] of deltas){
				let nr=r+dr,nc=c+dc;
				if (!inBounds(nr,nc)) continue;
				const target = board[nr][nc];
				if (!target) moves.push([nr,nc]);
				else if (colorOf(target)!==chess_piece_color) moves.push([nr,nc]);
			}
		};

		const slide = (dlist)=>{
			for(const [dr,dc] of dlist){
				let nr=r+dr,nc=c+dc;
				while(inBounds(nr,nc)){
					const target = board[nr][nc];
					if (!target) moves.push([nr,nc]);
					else { if (colorOf(target)!==chess_piece_color) moves.push([nr,nc]); break; }
					nr += dr; nc += dc;
				}
			}
		};

		const chess_piece = basePiece(raw);
		if (isPromoted(raw)){
			// promoted piece code runs here
			switch(chess_piece){
				// promoted Copper moves like silver
				case 'C': case 'c':
					if (chess_piece_color==='w'){
						steps([[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]]);
					} else {
						steps([[1,0],[1,-1],[1,1],[-1,-1],[-1,1]]);
					}
					break;
				
				case 'P': case 'p':
				case 'N': case 'n':
				case 'S': case 's':
					if (chess_piece_color==='w'){
						steps([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]);
					} else {
						steps([[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1]]);
					}
					break;
				// dragon moves
				case 'R': case 'r':
					slide([[1,0],[-1,0],[0,1],[0,-1]]);
					steps([[1,1],[1,-1],[-1,1],[-1,-1]]);
					break;
				// sideMover moves
				case 'M': case 'm':
					slide([[0,1],[0,-1]]);
					steps([[-1,0],[1,0]]);
					break;
				// dragonHorse moves
				case 'B': case 'b':
					slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
					steps([[1,0],[-1,0],[0,1],[0,-1]]);
					break;
				
				// drunk elephant moves
				case 'G': case 'g':
					if (chess_piece_color==='w'){
						steps([ [-1,-1],[-1,0],[-1,1],   [0,-1],[0,1],  [1,-1],[1,1]  ]); 
					} else {
						steps([ [1,-1],[1,0],[1,1],   [0,-1],[0,1],  [-1,-1],[-1,1]  ]); 
					}
					break;
				default:
					if (chess_piece_color==='w'){
						steps([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]);
					} else {
						steps([[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1]]);
					}
			}
		} else {
			// unpromoted piece code runs here
			switch(chess_piece){
				case 'p': case 'P':
					const dir = chess_piece_color==='w'?-1:1;
					if (inBounds(r+dir,c)){
						const ahead = board[r+dir][c];
						if (!ahead || colorOf(ahead)!==chess_piece_color) moves.push([r+dir,c]);
					}
					break;
				// unpromoted Knight moves forward only
				case 'n':
					steps([[2,-1],[2,1]]);
					break;
				case 'N':
					steps([[-2,-1],[-2,1]]);
					break;
				case 'b': case 'B':
					slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
					break;
				case 'r': case 'R':
					slide([[1,0],[-1,0],[0,1],[0,-1]]);
					break;
				case 'l': case 'm':
					slide([[1,0]]);
					break;
				case 'L': case 'M':
					slide([[-1,0]]);
					break;
				case 'c': case 'C':
					if (chess_piece_color==='w'){
						steps([[-1,0],[-1,-1],[-1,1],[1,0]]);
					} else {
						steps([[1,0],[1,-1],[1,1],[-1,0]]);
					}
					break;
				case 's': case 'S':
					if (chess_piece_color==='w'){
						steps([[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]]);
					} else {
						steps([[1,0],[1,-1],[1,1],[-1,-1],[-1,1]]);
					}
					break;
				case 'g': case 'G':
					if (chess_piece_color==='w'){
						steps([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1]]);
					} else {
						steps([[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1]]);
					}
					break;
				case 'k': case 'K':
					steps([[-1,0],[ 1,0], [-1,1],[0,1],[1,1],  [-1,-1],[0,-1],[1,-1] ]); 
					break;
			}
		}
		return moves;
	}

	function findKing(board,color){
			const target = color==='w'?'K':'k';
			for(let r=0;r<9;r++)for(let c=0;c<13;c++) if (board[r][c]===target) return [r,c];
			return null;
	}

	// Is color in check?
	function isInCheck(board,color){
		
		const kingPos = findKing(board,color); if (!kingPos) return true;
		const [kr,kc]=kingPos;
		for(let r=0;r<9;r++) {
			for(let c=0;c<13;c++){
				const p = board[r][c]; 
				if (!p) continue;
				if (colorOf(p)===color) continue;
				const moves = genMoves(board,r,c);
				for(const [mr,mc] of moves) if (mr===kr && mc===kc) return true;
			}
		}
		nop = 0;
		return false;
	}

	// Generate legal moves for piece at r,c (filtering moves that leave own king in check)
	function legalMoves(board,r,c){
		
		const pmoves = genMoves(board,r,c);
		const pcol = colorOf(board[r][c]);
		const chess_piece = board[r][c];
		
		
		const legal = [];
		for(const [mr,mc] of pmoves){
			const nb = cloneBoard(board);
			nb[mr][mc] = nb[r][c]; nb[r][c]=null;
			if (!isInCheck(nb,pcol)) legal.push([mr,mc]);
		}
		
		// checking the color 
		// transporter_sq is special square
		// where a chess piece can be transported to
		// in an emergency situation

		if ( chess_piece == 'k' || chess_piece == 'K' ) {
			let nop = 0;
		} else {
			if (pcol === 'w' && legal.length > 0) {
				const transporter_sq = board[8][12];
				if (transporter_sq === null) {
					const nb = cloneBoard(board);
					nb[8][12] = nb[r][c];
					nb[r][c] = null;
					if (!isInCheck(nb,pcol)) legal.push([8, 12]);
				}
			}
			if (pcol === 'b' && legal.length > 0) {
				const transporter_sq = board[0][0];
				if (transporter_sq === null) {
					const nb = cloneBoard(board);
					nb[0][0] = nb[r][c];
					nb[r][c] = null;
					if (!isInCheck(nb,pcol)) legal.push([0, 0]);
				}
			}
		}
		
		
		return legal;
	}

	function hasAnyLegalMoves(board,color){
		for(let r=0;r<9;r++)for(let c=0;c<13;c++){
			if (colorOf(board[r][c])!==color) continue;
			if (legalMoves(board,r,c).length) return true;
		}
		return false;
	}

	// R ender board
	const container = document.createElement('div');
	container.style.fontFamily='sans-serif';
	const info = document.createElement('div');
	const boardEl = document.getElementById('boardContainer'); 
	//.createElement('div');
	boardEl.style.display='grid'; 
	boardEl.style.gridTemplateColumns='60px 8px repeat(9,60px) 8px 60px';
	boardEl.style.gridAutoRows='60px';
	boardEl.style.width='676px'; 
	boardEl.style.border='4px solid #333';
	boardEl.style.transformOrigin='center center';
	container.appendChild(info); 
	container.appendChild(boardEl);
	document.body.appendChild(container);

	let selected = null; 
	let legalHighlighted = [];
	let gameOver = false;
	let winner = null;
	let winnerReason = null;

	function coordToId(r,c){return 'sq-'+r+'-'+c}

	function appendImage(sq, p) {
 
		let str_img = "images/" + ImageXref[ (p) ];
		let img = document.createElement('img');
		img.id = "img-" + sq.id;
		const pieceColor = colorOf(p);
		if (pieceColor === state.turn) {
			img.style.opacity = 1.0;
		} else {
			img.style.opacity = 0.5;
		}
	
		img.setAttribute('src',str_img);
		let img_color = "color" + p;
		let str_img_class = "img" + img_color;
		img.setAttribute('class',str_img_class);

		// Rotate the image based on the view
		//  the rotate image is not needed yet comment only
		//  img.style.transform= "rotate(180deg)";
		//  img.style.transform= "rotate(0deg)";
		
		
		img.src = str_img;
		img.style.width = '100%';
		img.style.height = '100%';
		sq.appendChild(img);
	}

	function render(debug_info){
		boardEl.innerHTML='';
		boardEl.style.transform = boardFlipped ? 'rotate(180deg)' : '';
		const b = state.board;
		let rend_ctr = -1;
		for(let r=0;r<9;r++) {
			
			for(let c=0;c<13;c++){
				rend_ctr++;
				const sq = document.createElement('div');
				sq.id = coordToId(r,c);
				sq.style.width='100%'; sq.style.height='100%';
				sq.style.display='flex'; 
				sq.style.alignItems='center'; 
				sq.style.justifyContent='center';
				sq.style.userSelect='none';
				const dark = rend_ctr%2===1;
				const isBrickCol = c===1 || c===11;
				if (isBrickCol) {
					sq.style.background = '#b22222';
					rend_ctr++;
				} else {
					sq.style.background = (dark ? '#769656' : '#eeeed2');
				}

				
				sq.style.background = isBrickCol ? '#b22222' : (dark ? '#769656' : '#99990d');
				sq.style.fontSize='32px';
				const p = b[r][c];
				
				if (!isBrickCol){
					sq.addEventListener('click',()=>onClickSquare(r,c));
					sq.style.cursor = 'pointer';
				} else {
					sq.style.cursor = 'default';
					sq.style.pointerEvents = 'none';
				}
				boardEl.appendChild(sq);

				// add image to the square
				if (p) {
					// sq.textContent = svgPieces[p] || p;
					appendImage(sq, p);
				}


			}
		
		}

		// update info
		let status;
		if (gameOver){
			stopClock();
			if (winner){
				status = winner + ' wins — ' + winnerReason;
			} else {
				status = 'Draw — ' + (winnerReason || 'game over');
			}
		} else if (isClockExpired()){
			stopClock();
			status = clock.w.expired ? 'White time expired — Black wins' : 'Black time expired — White wins';
		} else if (state.halfMaxMovesNoCapture>= max_moves_no_capture ) {
			status = 'Draw by 60-move rule';
		} else {
			status = (state.turn==='w'?'White':'Black')+" to move";
			if (isInCheck(state.board,state.turn)){
				if (!hasAnyLegalMoves(state.board,state.turn)) {
					status = (state.turn==='w'?'White':'Black')+" lost";
					status += ' — Checkmate';
					playSound('sound/applause.mp3');
					stopClock();
				}
				else {
					status += ' — Check';
					if (state.section === 2) playSound('sound/snap.mp3');
				}
			} else {
				if (!hasAnyLegalMoves(state.board,state.turn)) {
					status += ' — Stalemate';
					playSound('sound/drum-beat.mp3');
					stopClock();
				}
			}
		}
		info.textContent = status;
		// highlight selection and legal moves
		if ( selected ){
			const selectedPiece = selected;
			const [sr,sc]=selected;
			const el = document.getElementById(coordToId(sr,sc));
			// this is where a selected piece turns yellow
			if (el) el.style.boxShadow='inset 0 0 0 6px rgba(255, 255, 0, 0.73)';
			
			// if a selected piece is in the drop zone how do i highlight all drop moves?
			if (sc === 0 || sc === 12) {
				// Highlight all drop moves for the selected piece to blue
				let dropRowCol = [];
				
				// this code section shows the legal drop squares for the piece in the drop zone
				let piece_in_hand = state.board[selectedPiece[0]][selectedPiece[1]];
				let piece_min_max = dropXref[ piece_in_hand ]; 
				let row_piece_min = piece_min_max[0];
				let col_piece_max = piece_min_max[1];
					
				for (let r = 0; r < 9; r++) {
					for (let c = 2; c < 11; c++) {
						let sq_blank = state.board[r][c];
						if (piece_in_hand === 'P' || piece_in_hand === 'p') {
							 // For pawns, also check for nifu (no two unpromoted pawns in the same file)
							let nifu = false;
							for (let i = 0; i < 9; i++) {
								if (state.board[i][c] === piece_in_hand) {
									nifu = true;
									break;
								}
							}
							if (nifu) continue;
						}
						// piece in hand is not a pawn
						// loop to set the area to drop a piece
						// sets the color to blue
						if (colorOf(piece_in_hand) === 'w') {
							if (sq_blank === null && r >= row_piece_min && c <= col_piece_max) {
								const e = document.getElementById(coordToId(r, c));
								if (e) e.style.boxShadow='inset 0 0 0 6px rgba(0,0,255,0.4)';
							}
						}

						if (colorOf(piece_in_hand) === 'b') {
							if (sq_blank === null && r <= row_piece_min && c <= col_piece_max) {
								const e = document.getElementById(coordToId(r, c));
								if (e) e.style.boxShadow='inset 0 0 0 6px rgba(0,0,255,0.4)';
							}
						}
					}
				}
			} else {
				// this section highlights legal moves for pieces on the board to blue
				// these pieces are not in the drop zone
				const l = legalMoves(state.board,sr,sc);
				for(const [r,c] of l){
					// Highlight the legal move of pieces in drop zone to blue
					const e = document.getElementById(coordToId(r,c));
					if (e){ e.style.boxShadow='inset 0 0 0 6px rgba(0,0,255,0.4)'; }
				}
			}
		}
		// end of highlight selection and legal moves
	}
	// end of render board

	function promotionQuestion(color, piece, row){

		if ( inPromotionZone(color,row) ) {
			let mustPromoteRow = mustPromotePiecesXref[ piece ]; 
			if (mustPromoteRow !== undefined ){
				if (color === 'w' && mustPromoteRow <= row) { return '+' + piece;}
				if (color === 'b' && mustPromoteRow >= row) { return '+' + piece;}
			}

		}
		
		
		if (!canPromotePiece(piece) || !inPromotionZone(color,row)) return piece;
		const pp = '+' + piece;
		const msg = "Do you want to promote " + piece + " to " + pp + "?";
		try {
			if (confirm(msg)) return pp;
		} catch(e) { }
		return piece;
	}

	function promotionQuestion2(color, piece){
		if ( !canPromotePiece(piece) ) return piece;
		const pp = '+' + piece;
		const msg = "From the promotion zone, Do you want to promote " + piece + " to " + pp + "?";
		try {
			if (confirm(msg)) return pp;
		} catch(e) { }
		return piece;
	}

	function dropEvent(row,col){
		// Handle drop event for the specified row and column
	}

	function dropEvent_with_selected(row,col,sr,sc,Shogi_piece){
		var return_code4 = 0;

		// Check if the target square is highlighted for a legal drop
		if ( document.getElementById( coordToId(row,col) ).style.boxShadow.includes("rgba")) {
			nop = 1;
		}else{
			return 8;
		}
 
		if (state.board[row][col] === null) {
			state.history.push(cloneState());
			const piece = state.board[sr][sc];
			state.board[row][col] = piece;
			state.board[sr][sc] = null;
			 
			const oldTurn = state.turn;
			state.turn = state.turn==='w' ? 'b' : 'w';			
			const movingClock = clock[oldTurn];
			if (movingClock.main <= 0){
				movingClock.inByo = true;
				movingClock.byo = 30;
			}
			recordMove(sr,sc,row,col,piece,piece,false,'');
			selected = null;
			globalSide = globalSide === 'w' ? 'b' : 'w';			
			render('dropevent2');
			updateClockDisplay();
			state.section = 1;
			playSound('sound/1-click.mp3');
			return_code4=0;

			postMove(piece, row, col,sr, sc, 'drop');
			broadcastGameState();
		} else {

			return 8;

		}


		return return_code4;
	}

	function postMove(piece, row, col, sr, sc, moveType) {
		// This function can be used to send move data to a server or perform other actions after a move is made.
		// For example, you could use fetch() to send the move data to a server endpoint.
		console.log("Post move:", piece, row, col, sr, sc, moveType);
		return;
	}

	function fromPromotionCamp(sr,sc,color,piece){
		if (sc <= 1 || sc >= 11) { return false; }
		if (color==='w'){
			if (sr <= 2) return true;
		} else {
			if (sr >= 6) return true;
		}
		return false;
	}

	function onClickSquare_selected(row,col,sr,sc,p){
		var return_code2 = 0; 
		state.section = 2;

		if (state.halfMaxMovesNoCapture>= max_moves_no_capture){
				selected = null;
				render('onClickSquare_selected 120 half moves no capture');
				state.section = 1;
				stopClock();
				gameOver = true;
				winner = null;
				winnerReason = 'max move moves no capture';	
				return 8;
			}		

		const isDropZone = sc === 0 || sc === 12;

		// if clicking own piece, change selection
		if (p && colorOf(p)===state.turn){ 
			selected=[row,col]; 
			if (isDropZone) {
				nop = dropEvent_with_selected(row,col,sr,sc,p);
			}
			render('onClickSquare_selected change selection 1080'); 
			return 4; 
		}
		
		// attemp move or drop

		if (isDropZone) {
			var return_code4 = dropEvent_with_selected(row,col,sr,sc,p);
			return return_code4;
		}

		// The Array.prototype dot some() method in JavaScript tests whether at least one element in an array 
		// passes the test implemented by the provided callback function. 
		// It returns a boolean value (true or false) and does not modify the original array.

		// this is the code for legal moves
		const lm = legalMoves(state.board,sr,sc).some(([mr,mc])=>mr===row&&mc===col);
		
		let movedPiece = null;

		if (lm) {
			state.history.push(cloneState());
			const piece = state.board[sr][sc];
			const pieceLower = piece.toLowerCase();
			
			let target = state.board[row][col];
			let isCapture = Boolean(target);
			if (isCapture) {
				playSound('sound/eraser-clap.mp3');
				state.capturePiece = state.board[row][col];
			}
			const isPawnMove = pieceLower==='p';
			movedPiece = state.board[sr][sc];
			let origPiece = movedPiece;
			let promotion = false;
			let nop = 0;

			const pieceColor = colorOf(movedPiece);

			if ( isCapture ) {
				if (pieceColor === 'w') {
					const freeSquare = whiteInHandNull(state.board);
					if (target !== null && target.length === 2) target = target.substring(1);
					if (freeSquare) state.board[freeSquare[0]][freeSquare[1]] = target.toUpperCase();
					nop = 1;
				} else {
					const freeSquare = blackInHandNull(state.board);
					if (target !== null && target.length === 2) target = target.substring(1);
					if (freeSquare) state.board[freeSquare[0]][freeSquare[1]] = target.toLowerCase();
					nop = 1;
				}
			}

			state.board[row][col] = movedPiece;
			state.board[row][col] = promotionQuestion(pieceColor, piece, row);
			movedPiece = state.board[row][col];
			state.board[sr][sc] = null;
			playSound('sound/1-click.mp3');

			if (movedPiece.length === 1 && fromPromotionCamp(sr, sc, pieceColor, movedPiece)) {
				state.board[row][col] = promotionQuestion2(pieceColor, piece);
			}
			
			// a pawn move will not reset the half-move counter, you must capture a piece to do so
			
			state.halfMaxMovesNoCapture = isCapture ? 0 : state.halfMaxMovesNoCapture + 1;
			const oldTurn = state.turn;
			state.turn = state.turn==='w' ? 'b' : 'w';						

			const movingClock = clock[oldTurn];
			if (movingClock.main <= 0){
				movingClock.inByo = true;
				movingClock.byo = 30;
			}

			recordMove(sr,sc,row,col,origPiece,piece,isCapture,state.capturePiece);
			
			// fourFold repetition: count identical positions (board, turn, en-passant)
			const curKey = positionKeyFromState();
			let matches = 0;
			for(const snap of state.history){
				try{
					if (positionKeyFromState(snap) === curKey) matches++;
				}catch(e){ /* ignore malformed snapshots */ }
			}

			// include current position
			const totalOccurrences = matches + 1;
			if (totalOccurrences >= 4){
				gameOver = true;
				winner = null;
				winnerReason = 'fourFold repetition';
				stopClock();
				alert('Draw by fourFold repetition');
			}
			
			// Check for special win conditions: white king to row 0, black king to row 8
			if (state.board[0][6] === 'K'){
				gameOver = true;
				winner = 'White';
				winnerReason = 'king reached capture square';
				stopClock();
				alert(winner + ' wins — ' + winnerReason);
			}
			
			if (state.board[8][6] === 'k'){
				gameOver = true;
				winner = 'Black';
				winnerReason = 'king reached capture square';
				stopClock();
				alert(winner + ' wins — ' + winnerReason);
			}

			

		}
		// end of legal move code

		// clear the selected piece because a move was just made or an illegal square was clicked
		selected = null;
		globalSide = globalSide === 'w' ? 'b' : 'w';		
		render('onClickSquare_selected after legal moves 1158');
		updateClockDisplay();


		postMove(movedPiece, row, col, sr, sc, 'move');
		broadcastGameState();
		maybeSendMove(movedPiece, row, col, sr, sc, 'move');

		return_code2 = 0;
		return return_code2;


	}

	function onClickSquare(r,c){
		const p = state.board[r][c];
		const origPiece = p;
		
		if (multiplayerSocket && multiplayerRoomId && multiplayerReady && multiplayerSide !== null && !isLocalTurn()) {
			playSound('sound/error.mp3');
			updateRoomStatus('Wait for your turn.');
			return;
		}
		
		if (gameOver) {
			playSound('sound/error.mp3');
			updateRoomStatus('the game is over.');
			return;
		}


		if ( selected ){
			// if a piece is already selected, attempt to move it to the clicked square
			// do i have legal moves for the selected piece? if so, move it to the clicked square
			const [sr,sc] = selected;
			const rc2 = onClickSquare_selected(r,c,sr,sc,p);
			return rc2;
		}
		
		// try1 test for legal moves
		// the selected piece turns yellow
		// if the move is legal, the selected piece will be highlighted
		// otherwise, the selected piece will be reset
		// all of this is for the visual feedback to the user
		// all legal moves are highlighted the color blue
		let legalCount = 0;
		state.sr = r;
		state.sc = c;

		// The Array.prototype dot some() method in JavaScript tests whether at least one element in an array 
		// passes the test implemented by the provided callback function. 
		// It returns a boolean value (true or false) and does not modify the original array.

		const lm = legalMoves(state.board,state.sr,state.sc).some(([mr,mc])=>mr===r&&mc===c);
		
		if (lm) {
			legalCount++;
			state.history.push(cloneState());
			const piece = state.board[sr][sc];
			const pieceLower = piece.toLowerCase();
			
			const target = state.board[r][c];
			const isCapture = Boolean(target);
			if (isCapture) {
				playSound('sound/eraser-clap.mp3');
				state.capturePiece = state.board[r][c];
			}
			const isPawnMove = pieceLower==='p';
			let movedPiece = state.board[sr][sc];
			let promotion = false;
			
			let nop = 0;
			

			const pieceColor = colorOf(movedPiece);

			if ( isCapture ) {
				if (pieceColor === 'w') {
					const freeSquare = whiteInHandNull(state.board);
					if (freeSquare) state.board[freeSquare[0]][freeSquare[1]] = target.toUpperCase();
					nop = 1;
				} else {
					const freeSquare = blackInHandNull(state.board);
					if (freeSquare) state.board[freeSquare[0]][freeSquare[1]] = target.toLowerCase();
					nop = 1;
				}
			}

			state.board[r][c] = movedPiece;
			state.board[r][c] = promotionQuestion(pieceColor, piece, r);
			state.board[sr][sc] = null;
			
			state.halfMaxMovesNoCapture = isCapture || isPawnMove ? 0 : state.halfMaxMovesNoCapture + 1;
			const oldTurn = state.turn;
			state.turn = state.turn==='w' ? 'b' : 'w';			

			const movingClock = clock[oldTurn];
			if (movingClock.main <= 0){
				movingClock.inByo = true;
				movingClock.byo = 30;
			}
			recordMove(sr,sc,r,c,origPiece,piece,isCapture,state.capturePiece);
			// Threefold repetition: count identical positions (board, turn, en-passant)
			const curKey = positionKeyFromState();
			let matches = 0;
			for(const snap of state.history){
				try{
					if (positionKeyFromState(snap) === curKey) matches++;
				}catch(e){ /* ignore malformed snapshots */ }
			}
			// include current position
			const totalOccurrences = matches + 1;
			if (totalOccurrences >= 4){
				gameOver = true;
				winner = null;
				winnerReason = 'fourFold repetition';
				stopClock();
				alert('Draw by fourFold repetition');
			}
			// Check for special win conditions: white king to row 0, black king to row 8
			if (state.board[0][6] === 'K'){
				gameOver = true;
				winner = 'White';
				winnerReason = 'king reached row 9';
				stopClock();
				alert(winner + ' wins — ' + winnerReason);
			}
			if (state.board[8][6] === 'k'){
				gameOver = true;
				winner = 'Black';
				winnerReason = 'king reached row 1';
				stopClock();
				alert(winner + ' wins — ' + winnerReason);
			}
			
		}

		selected = null;
		// removed to fix bug on display
		// render('onClickSquare after try1 1285');
		updateClockDisplay();
		state.section = 1;

		if (p && colorOf(p)===state.turn) { 
			selected = [r,c]; 
			render('onClickSquare selected 1290'); 
		}
 
	}

	// initialize the game code begins here
	initMultiplayer();
	if (multiplayerSocket && multiplayerRoomId) {
		multiplayerSocket.emit('rejoin-room', { roomId: multiplayerRoomId, playerId: multiplayerSocket.id });
	}
	state.board = parseFen(startFen).board;
	// record initial position so fourFold detection can include the starting position
	state.history.push(cloneState());
	render('initialize game 1300');
	updateClockDisplay();
	startClock();

}

window.addEventListener('DOMContentLoaded', pgm01);
