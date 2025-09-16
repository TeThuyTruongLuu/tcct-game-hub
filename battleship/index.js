// PART 2: setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase, ref, get, set, update, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
	apiKey: "AIzaSyBtpLSSNBj9lHtzibLh5QSRAPg3iQ46Q3g",
	authDomain: "tcct-minigames.firebaseapp.com",
	databaseURL: "https://tcct-minigames-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "tcct-minigames",
	storageBucket: "tcct-minigames.appspot.com",
	messagingSenderId: "604780847536",
	appId: "1:604780847536:web:f8015bde5ef469b04c7675"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const fdb = getFirestore(app);

const qs = new URLSearchParams(location.search);
const step = qs.get("step");
const existingUser = localStorage.getItem("username");

document.getElementById("setup-container").style.display = "block";
document.getElementById("length-config-container").style.display = "none";
document.getElementById("game-container").style.display = "none";

if (existingUser) {
  const inp = document.getElementById("username");
  if (inp) inp.value = existingUser;
}

if (step === "place") {
  if (sessionStorage.getItem("justAuthed") === "1") {
    document.getElementById("setup-container").style.display = "none";
    document.getElementById("length-config-container").style.display = "block";
    sessionStorage.removeItem("justAuthed");
  } else {
    location.replace("index.html");
  }
}

let selectedChar = null;
let selectedImg = "";

import { characters } from "./characters.js";

const charList = document.querySelector(".char-list");
charList.innerHTML = "";

characters.forEach(c => {
    const option = document.createElement("div");
    option.className = "char-option";
    option.dataset.char = c.char;
    option.dataset.img = c.img;
    option.innerHTML = `<img src="${c.img}" alt="${c.char}">`;
    charList.appendChild(option);
});

document.querySelectorAll(".char-option").forEach(option => {
	option.addEventListener("click", () => {
		document.querySelectorAll(".char-option").forEach(o => o.classList.remove("selected"));
		option.classList.add("selected");
		selectedChar = option.dataset.char;
		selectedImg = option.dataset.img;
		localStorage.setItem("selectedChar", selectedChar);
		localStorage.setItem("selectedImg", selectedImg);
	});
});

document.getElementById("start-button").addEventListener("click", async () => {
	const username = document.getElementById("username").value.trim();
	const password = document.getElementById("password").value;
	const loading = document.getElementById("loading");
	if (!username || !password || !selectedChar) { alert("Điền đầy đủ..."); return; }
	loading.style.display = "block";

	const userRef = ref(db, `users/${username}`);
	const snapshot = await get(userRef);

	if (snapshot.exists()) {
		const data = snapshot.val();
		if (data.password !== password) { alert("Sai mật khẩu."); loading.style.display = "none"; return; }
		await update(userRef, { char: selectedChar });
	} else {
		await set(userRef, { username, password, char: selectedChar });
	}

	const scoreDocRef = doc(fdb, "userScores", `${username}-Bắn tàu`);
	const fsSnap = await getDoc(scoreDocRef);
	if (!fsSnap.exists()) {
		await setDoc(scoreDocRef, { username, game: "battleship", score: 0, updatedAt: new Date().toISOString() });
	}
	await updateDoc(scoreDocRef, { score: -100, updatedAt: new Date().toISOString() });

	localStorage.setItem("username", username);
	localStorage.setItem("selectedChar", selectedChar);
	sessionStorage.setItem("justAuthed", "1");
	window.location.href = "index.html?step=place";
});

window.togglePassword = function () {
	const pw = document.getElementById("password");
	pw.type = pw.type === "password" ? "text" : "password";
};

// PART 3: placeShips
const shipInputs = [
	document.getElementById("ship1"),
	document.getElementById("ship2"),
	document.getElementById("ship3")
];
const remainingCount = document.getElementById("remaining-count");
const confirmBtn = document.getElementById("confirm-ship-length");
const boardContainer = document.getElementById("board");
const saveBtn = document.getElementById("save-board");

let confirmedLengths = [];
let placingIndex = 0;
let placedShips = [];
let cells = [];
const selected = new Set();
const COLS = 10;
const TOTAL_CELLS = COLS * COLS;

function updateRemaining() {
	let total = 0;
	shipInputs.forEach(input => {
		total += parseInt(input.value) || 0;
	});
	const remaining = 7 - total;
	remainingCount.textContent = remaining;

	const validShips = shipInputs.map(i => parseInt(i.value)).filter(x => x >= 2);
	confirmBtn.disabled = !(total === 7 && validShips.length >= 1);
}

shipInputs.forEach(input => input.addEventListener("input", updateRemaining));
updateRemaining();

confirmBtn.addEventListener("click", () => {
	confirmedLengths = shipInputs.map(i => parseInt(i.value)).filter(x => x >= 2);
	document.getElementById("length-config-container").style.display = "none";
	document.getElementById("game-container").style.display = "block";
	initBoard();
});

function initBoard() {
	boardContainer.innerHTML = "";
	cells = [];
	for (let i = 0; i < TOTAL_CELLS; i++) {
		const cell = document.createElement("div");
		cell.className = "cell";
		cell.dataset.index = i;
		cell.addEventListener("click", () => handleCellClick(i));
		boardContainer.appendChild(cell);
		cells.push(cell);
	}
}

function handleCellClick(index) {
	if (placingIndex >= confirmedLengths.length) return;

	const length = confirmedLengths[placingIndex];
	const direction = confirm("OK = ngang, Cancel = dọc") ? "H" : "V";
	const posList = [];

	for (let i = 0; i < length; i++) {
		const offset = direction === "H" ? i : i * COLS;
		const idx = index + offset;
		const rowStart = Math.floor(index / COLS);
		const rowCur = Math.floor((index + offset) / COLS);
		if (idx >= TOTAL_CELLS) return;
		if (direction === "H" && rowStart !== rowCur) return;
		if (selected.has(idx)) return;
		posList.push(idx);
	}

	posList.forEach(idx => {
		selected.add(idx);
		cells[idx].classList.add("occupied");
		cells[idx].style.backgroundImage = `url('${localStorage.getItem("selectedImg")}')`;
	});
	placedShips.push(...posList);
	placingIndex++;

	if (placingIndex >= confirmedLengths.length) {
		saveBtn.disabled = false;
	}
}

saveBtn.addEventListener("click", async () => {
	if (placedShips.length !== 7) {
		alert("Bạn cần đặt đúng 7 ô tàu.");
		return;
	}

	const userRef = ref(db, `users/${localStorage.getItem("username")}`);
	await update(userRef, {
		shipConfig: confirmedLengths,
		shipPositions: placedShips,
		char: localStorage.getItem("selectedChar"),
		inBattle: false
	});

	window.location.href = "index.html?step=match";
});

// PART 4: matchmaking
import {
	push,
    onValue,
    remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

if (step === "match") {
	document.getElementById("setup-container").style.display = "none";
	document.getElementById("length-config-container").style.display = "none";
	document.getElementById("game-container").innerHTML = "<h2>Đang tìm đối thủ...</h2>";
	document.getElementById("game-container").style.display = "block";

	const username = localStorage.getItem("username");
	const userRef = ref(db, `users/${username}`);
	const roomsRef = ref(db, "rooms-battleship");
	const leftoverRoomId = localStorage.getItem("roomId");
	if (leftoverRoomId) {
		const oldRef = ref(db, `rooms-battleship/${leftoverRoomId}`);
		const oldSnap = await get(oldRef);
		if (!oldSnap.exists() || oldSnap.val().status === "ended" || oldSnap.val().player1 === username || oldSnap.val().player2 === username) {
			try { await remove(oldRef); } catch(e) {}
		}
		await update(userRef, { inBattle: false });
		localStorage.removeItem("roomId");
		localStorage.removeItem("opponent");
		localStorage.removeItem("role");
	}
	
	async function joinRoom() {
		const snapshot = await get(roomsRef);
		let joined = false;

		if (snapshot.exists()) {
			const rooms = snapshot.val();
			for (const roomId in rooms) {
				const room = rooms[roomId];
				if (room.status === "waiting" && room.player1 !== username) {
					const updates = {};
					updates[`rooms-battleship/${roomId}/player2`] = username;
					updates[`rooms-battleship/${roomId}/status`] = "playing";
					updates[`rooms-battleship/${roomId}/turn`] = "player1";
					await update(ref(db), updates);
					await update(userRef, { inBattle: roomId });
					listenToRoom(roomId, "player2");
					joined = true;
					break;
				}
			}
		}

		if (!joined) {
			const newRoomRef = push(roomsRef);
			const roomId = newRoomRef.key;
			await set(newRoomRef, { player1: username, status: "waiting" });
			await update(userRef, { inBattle: roomId });
			listenToRoom(roomId, "player1");
		}
  }

	function listenToRoom(roomId, role) {
		const roomRef = ref(db, `rooms-battleship/${roomId}`); // chỉ tạo khi có roomId
		onValue(roomRef, async snap => {
			const room = snap.val();
			if (!room) return;

			if (room.status === "playing" && room.player1 && room.player2) {
				const you = localStorage.getItem("username");
				const opponent = role === "player1" ? room.player2 : room.player1;
				localStorage.setItem("roomId", roomId);
				localStorage.setItem("opponent", opponent);
				localStorage.setItem("role", role);
				window.location.href = "index.html?step=battle";
			}
		});
	}

	joinRoom();
}

// PART 5: battle
if (step === "battle") {
	const roomId = localStorage.getItem("roomId");
	if (!roomId) {
	  location.replace("index.html");
	}
	document.getElementById("setup-container").style.display = "none";
	document.getElementById("length-config-container").style.display = "none";
	document.getElementById("game-container").innerHTML = `
		<h2>Đang chiến đấu với đối thủ...</h2>
		<div class="arena">
			<div class="panel">
				<h3>Bạn</h3>
				<div class="battle-board" id="board-you"></div>
			</div>
			<div class="panel">
				<h3>Đối thủ</h3>
				<div class="battle-board" id="board-opp"></div>
			</div>
		</div>
		<p id="turn-info"></p>
		<div id="shot-result" class="sr"></div>
		<div id="battle-log" class="blog"></div>
	`;
	document.getElementById("game-container").style.display = "block";

	const username = localStorage.getItem("username");
	const role = localStorage.getItem("role");
	const opponent = localStorage.getItem("opponent");
	const COLS = 10;
	const boardSize = COLS * COLS;
	const youEl = document.getElementById("board-you");
	const oppEl = document.getElementById("board-opp");
	const turnInfo = document.getElementById("turn-info");
	const shotResult = document.getElementById("shot-result");
	const battleLog = document.getElementById("battle-log");
	const roomRef = ref(db, `rooms-battleship/${roomId}`);
	let gameEnded = false;
	let oppImg = "";
	let youBoard = [];
	let oppBoard = [];
	
	async function cleanupRoom() {
		const rid = localStorage.getItem("roomId");
		if (!rid) return;
		const updates = {};
		updates[`users/${username}/inBattle`] = false;
		if (opponent) updates[`users/${opponent}/inBattle`] = false;
		await update(ref(db), updates);
		try { await remove(ref(db, `rooms-battleship/${rid}`)); } catch(e) {}
		localStorage.removeItem("roomId");
		localStorage.removeItem("opponent");
		localStorage.removeItem("role");
	}

	async function getBoards() {
		const youRef = ref(db, `users/${username}`);
		const oppRef = ref(db, `users/${opponent}`);
		const youSnap = await get(youRef);
		const oppSnap = await get(oppRef);
		const you = youSnap.val();
		const opp = oppSnap.val();
		youBoard = [...(you.shipPositions || [])];
		const allChars = [
			{ n: "Dụ", i: "img/Du.webp" },{ n: "Diệp", i: "img/Diep.webp" },{ n: "Lam", i: "img/Lam.webp" },{ n: "Duệ", i: "img/Due.webp" },{ n: "Lư", i: "img/Lu.webp" },{ n: "Chu", i: "img/Chu.webp" },{ n: "Tranh", i: "img/Tranh.webp" },{ n: "Cao", i: "img/Cao.webp" },{ n: "Hàn", i: "img/Han.webp" },{ n: "Lâu", i: "img/Lau.webp" },{ n: "Hoàng", i: "img/Hoang.webp" },{ n: "Kiều", i: "img/Kieu.webp" },{ n: "Vương", i: "img/Vuong.webp" },{ n: "Tống", i: "img/Tong.webp" },{ n: "Tán", i: "img/Tan.webp" },{ n: "Tiêu", i: "img/Tieu.webp" },{ n: "Tôn", i: "img/Ton.webp" },{ n: "Bao", i: "img/Bao.webp" },{ n: "La", i: "img/La.webp" },{ n: "An", i: "img/An.webp" },{ n: "Ngụy", i: "img/Nguy.webp" },{ n: "Phương", i: "img/Phuong.webp" },{ n: "Nhu", i: "img/Nhu.webp" },{ n: "Quả", i: "img/Qua.webp" },{ n: "Mạc", i: "img/Mac.webp" },{ n: "Quan", i: "img/Quan.webp" },{ n: "Trịnh", i: "img/Trinh.webp" },{ n: "Bình", i: "img/Binh.webp" }
		];
		const found = allChars.find(x => x.n === opp.char);
		oppImg = found ? found.i : "";

		await update(roomRef, {
			[`${role}Board`]: you.shipPositions || [],
			[`${role}Hits`]: [],
			log: [],
			status: "playing"
		});
	}

	function buildBoard(container) {
		container.innerHTML = "";
		for (let i = 0; i < boardSize; i++) {
			const cell = document.createElement("div");
			cell.className = "cell";
			container.appendChild(cell);
		}
	}

	function render(roomData) {
		youEl.innerHTML = "";
		oppEl.innerHTML = "";
		const myHits = roomData[`${role}Hits`] || [];
		const oppHits = roomData[`${role === "player1" ? "player2" : "player1"}Hits`] || [];
		const currentTurn = roomData.turn;
		oppBoard = roomData[`${role === "player1" ? "player2" : "player1"}Board`] || [];

		for (let i = 0; i < boardSize; i++) {
			const cYou = document.createElement("div");
			cYou.className = "cell";
			if (youBoard.includes(i)) {
				cYou.classList.add("occupied");
				const myImg = localStorage.getItem("selectedImg");
				if (myImg) cYou.style.backgroundImage = `url('${myImg}')`;
			}
			if (oppHits.includes(i)) {
				if (youBoard.includes(i)) {
					cYou.classList.add("hit");
					const myImg = localStorage.getItem("selectedImg");
					if (myImg) cYou.style.backgroundImage = `url('${myImg}')`;
					const ov = document.createElement("span");
					ov.className = "overlay";
					cYou.appendChild(ov);
				} else {
					cYou.classList.add("miss");
				}
			}
			youEl.appendChild(cYou);

			const cOpp = document.createElement("div");
			cOpp.className = "cell";
			const wasShot = myHits.includes(i);
			const isHit = oppBoard.includes(i) && wasShot;
			if (isHit) {
				cOpp.classList.add("hit");
				if (oppImg) cOpp.style.backgroundImage = `url('${oppImg}')`;
				const ov = document.createElement("span");
				ov.className = "overlay";
				cOpp.appendChild(ov);
			} else if (wasShot) {
				cOpp.classList.add("miss");
			}
			if (!roomData.winner && currentTurn === role && !wasShot) {
				cOpp.addEventListener("click", () => shoot(i, roomData));
				cOpp.classList.add("clickable");
			}
			oppEl.appendChild(cOpp);
		}

		if (roomData.winner) {
			turnInfo.textContent = roomData.winner === username ? "🎉 Bạn thắng!" : "💥 Bạn thua!";
		} else {
			turnInfo.textContent = currentTurn === role ? "🔫 Lượt của bạn" : "⏳ Chờ đối thủ...";
		}

		const logs = roomData.log || [];
		const last = logs[logs.length - 1];
		if (last) {
			const me = last.by === role;
			const msg = me ? (last.result === "hit" ? "🎯 TRÚNG!" : "💨 HỤT!") : (last.result === "hit" ? "⚠️ ĐỐI THỦ TRÚNG" : "👌 ĐỐI THỦ HỤT");
			shotResult.textContent = msg;
			shotResult.className = "sr " + (last.result === "hit" ? "hit" : "miss");
			const recent = logs.slice(-6).map(e => `${e.by === role ? "Bạn" : "Đối thủ"} → ${e.index} : ${e.result}`).join(" • ");
			battleLog.textContent = recent;
		}
	}

	async function shoot(index, roomData) {
		if (gameEnded) return;
		const targetBoard = roomData[`${role === "player1" ? "player2" : "player1"}Board`] || [];
		const hits = roomData[`${role}Hits`] || [];
		if (hits.includes(index)) return;
		const isHit = targetBoard.includes(index);
		const updatedHits = [...hits, index];
		const log = roomData.log || [];
		log.push({ by: role, index, result: isHit ? "hit" : "miss" });
		const allHitPositions = updatedHits;
		const isSunk = targetBoard.length > 0 && targetBoard.every(pos => allHitPositions.includes(pos));
		const winner = isSunk ? username : null;

		const updates = {};
		updates[`${role}Hits`] = updatedHits;
		updates[`log`] = log;
		if (winner) {
			updates[`winner`] = winner;
			updates[`status`] = "ended";
		} else {
			updates[`turn`] = role === "player1" ? "player2" : "player1";
		}
		await update(roomRef, updates);

		shotResult.textContent = isHit ? "🎯 TRÚNG!" : "💨 HỤT!";
		shotResult.className = "sr " + (isHit ? "hit" : "miss");
		if (winner) {
			gameEnded = true;
			await handleWin(winner);
		}
	}

	async function handleWin(winnerName) {
		const loser = winnerName === username ? opponent : username;
		const winRef = doc(fdb, "userScores", `${winnerName}-Bắn tàu`);
		const loseRef = doc(fdb, "userScores", `${loser}-Bắn tàu`);
		const winSnap = await getDoc(winRef);
		const loseSnap = await getDoc(loseRef);
		const winScore = winSnap.exists() ? (winSnap.data().score || 0) : 0;
		const loseScore = loseSnap.exists() ? (loseSnap.data().score || 0) : 0;
		await updateDoc(winRef, { score: winScore + 110, updatedAt: new Date().toISOString() });
		await updateDoc(loseRef, { score: loseScore + 50, updatedAt: new Date().toISOString() });
		await cleanupRoom();
	}

	onValue(roomRef, snap => {
		const roomData = snap.val();
		if (!roomData) return;
		if (roomData.status === "ended" && !gameEnded) {
		  gameEnded = true;
		  cleanupRoom().then(() => {
			location.replace("index.html");
		  });
		}

		if (youEl.childElementCount === 0) buildBoard(youEl);
		if (oppEl.childElementCount === 0) buildBoard(oppEl);
		render(roomData);
	});

	getBoards();
	window.addEventListener("beforeunload", () => {
	  if (!gameEnded) {
		update(roomRef, { winner: opponent, status: "ended" });
	  }
	});
}
