// PART 2: setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase, ref, get, set, update, child, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
	if (!username || !password || !selectedChar) { alert("Điền đầy đủ thông tin và chọn nhân vật trước khi chơi."); return; }
	loading.style.display = "block";

	const userRef = ref(db, `users/${username}`);
	const snapshot = await get(userRef);

	if (snapshot.exists()) {
		const data = snapshot.val();
		if (!data.password) {
			await update(userRef, { password, char: selectedChar });
		} else if (data.password !== password) {
			alert("Sai mật khẩu.");
			loading.style.display = "none";
			return;
		} else {
			await update(userRef, { char: selectedChar });
		}
	} else {
		await set(userRef, { username, password, char: selectedChar });
	}

	const scoreDocRef = doc(fdb, "userScores", `${username}-Bắn tàu`);
	const fsSnap = await getDoc(scoreDocRef);
	if (!fsSnap.exists()) {
		await setDoc(scoreDocRef, { username, game: "battleship", score: 0, updatedAt: new Date().toISOString() });
	}

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
	document.getElementById("game-container").innerHTML = `
		<h2>Đang tìm đối thủ...</h2>
		<p id="match-status"></p>
	`;
	document.getElementById("game-container").style.display = "block";
	const matchStatus = document.getElementById("match-status");

	const username = localStorage.getItem("username");
	const userRef = ref(db, `users/${username}`);
	const roomsRef = ref(db, "rooms-battleship");
	const sweepSnap = await get(roomsRef);
	if (sweepSnap.exists()) {
		const rooms = sweepSnap.val();
		for (const rid in rooms) {
			const r = rooms[rid];
			if (r.status === "waiting" && r.player1 === username) {
				try { await remove(ref(db, `rooms-battleship/${rid}`)); } catch(e) {}
			}
		}
	}

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
		if (snapshot.exists()) {
			const rooms = snapshot.val();
			for (const roomId in rooms) {
				const room = rooms[roomId];
				if (room.status === "waiting" && room.player1 !== username) {
					const roomRef = ref(db, `rooms-battleship/${roomId}`);
					const res = await runTransaction(roomRef, cur => {
						if (!cur) return cur;
						if (cur.status === "waiting" && !cur.player2 && cur.player1 !== username) {
							return { ...cur, player2: username, status: "playing", turn: "player1" };
						}
						return cur;
					});
					if (res.committed && res.snapshot.val() && res.snapshot.val().player2 === username) {
						matchStatus.textContent = `Đối thủ - ${room.player1}`;
						localStorage.setItem("roomId", roomId);
						localStorage.setItem("role", "player2");
						localStorage.setItem("opponent", room.player1);
						await update(userRef, { inBattle: roomId });
						listenToRoom(roomId, "player2");
						return;
					}
				}
			}
		}
		const newRoomRef = push(roomsRef);
		const myId = newRoomRef.key;
		await set(newRoomRef, { player1: username, status: "waiting" });
		await update(userRef, { inBattle: myId });
		localStorage.setItem("roomId", myId);
		localStorage.setItem("role", "player1");
		localStorage.removeItem("opponent");
		matchStatus.textContent = "Đang chờ đối thủ...";
		listenToRoom(myId, "player1");
	}

	function listenToRoom(roomId, role) {
		const roomRef = ref(db, `rooms-battleship/${roomId}`);
		onValue(roomRef, async snap => {
			const room = snap.val();
			if (!room) return;

			if (room.player1 && room.player2 && !room.winner) {
				const opp = role === "player1" ? room.player2 : room.player1;
				matchStatus.textContent = `Đối thủ - ${opp}`;
				localStorage.setItem("opponent", opp);
			}

			if (room.status === "playing" && room.player1 && room.player2) {
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
	let feeChargedLocal = false;
	let shooting = false;
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

	async function tryChargeEntryFee() {
		if (feeChargedLocal) return;
		const tx = await runTransaction(roomRef, cur => {
			if (!cur) return cur;
			if (cur.feeCharged) return cur;
			if (!cur.player1 || !cur.player2) return cur;
			return { ...cur, feeCharged: true, feeChargedBy: username };
		});
		if (!tx.committed) return;
		const data = tx.snapshot.val() || {};
		if (data.feeChargedBy !== username) { feeChargedLocal = true; return; }
		feeChargedLocal = true;
		const p1 = data.player1;
		const p2 = data.player2;
		const d1 = doc(fdb, "userScores", `${p1}-Bắn tàu`);
		const d2 = doc(fdb, "userScores", `${p2}-Bắn tàu`);
		const ensure = async (refDoc, user) => {
			const s = await getDoc(refDoc);
			if (!s.exists()) await setDoc(refDoc, { username: user, game: "battleship", score: 0, updatedAt: new Date().toISOString() });
		};
		await ensure(d1, p1);
		await ensure(d2, p2);
		await updateDoc(d1, { score: increment(-100), updatedAt: new Date().toISOString() });
		await updateDoc(d2, { score: increment(-100), updatedAt: new Date().toISOString() });
	}

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

		const snap = await get(roomRef);
		const rd = snap.val() || {};
		const init = {};
		if (!rd[`${role}Board`]) init[`${role}Board`] = you.shipPositions || [];
		if (!rd[`${role}Hits`]) init[`${role}Hits`] = [];
		if (!rd.log) init.log = [];
		if (rd.status !== "playing") init.status = "playing";
		if (Object.keys(init).length) await update(roomRef, init);
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

	async function shoot(index) {
		if (gameEnded || shooting) return;
		shooting = true;
		try {
			await runTransaction(roomRef, cur => {
				if (!cur || cur.winner || cur.turn !== role) return cur;
				const targetBoard = cur[`${role === "player1" ? "player2" : "player1"}Board`] || [];
				const hits = cur[`${role}Hits`] || [];
				if (hits.includes(index)) return cur;
				const updatedHits = hits.concat(index);
				const log = (cur.log || []).concat({ by: role, index, result: targetBoard.includes(index) ? "hit" : "miss" });
				const isSunk = targetBoard.length > 0 && targetBoard.every(pos => updatedHits.includes(pos));
				const next = { ...cur, [`${role}Hits`]: updatedHits, log };
				if (isSunk) {
					next.winner = username;
					next.status = "ended";
				} else {
					next.turn = role === "player1" ? "player2" : "player1";
				}
				return next;
			});
		} finally {
			if (!gameEnded) shooting = false;
		}
	}

	async function handleWin(winnerName) {
		await runTransaction(roomRef, cur => {
			if (!cur) return cur;
			if (cur.status === "ended" && cur.winner) return cur;
			return { ...cur, winner: winnerName, status: "ended" };
		});
	}

	async function finalizeAndScore(roomData) {
		const tx = await runTransaction(roomRef, cur => {
			if (!cur || !cur.winner) return cur;
			if (cur.scored) return cur;
			return { ...cur, scored: true, scoredBy: cur.winner };
		});
		if (!tx.committed) return;
		const data = tx.snapshot.val() || {};
		if (!data.scored || !data.winner) return;
		if (username !== data.scoredBy) return;
		const winnerName = data.winner;
		const loserName = winnerName === username ? opponent : username;
		const winRef = doc(fdb, "userScores", `${winnerName}-Bắn tàu`);
		const loseRef = doc(fdb, "userScores", `${loserName}-Bắn tàu`);
		const ensure = async (refDoc, user) => {
			const s = await getDoc(refDoc);
			if (!s.exists()) await setDoc(refDoc, { username: user, game: "battleship", score: 0, updatedAt: new Date().toISOString() });
		};
		await ensure(winRef, winnerName);
		await ensure(loseRef, loserName);
		await updateDoc(winRef, { score: increment(125), updatedAt: new Date().toISOString() });
		await updateDoc(loseRef, { score: increment(50), updatedAt: new Date().toISOString() });
	}
	
	await tryChargeEntryFee();
	onValue(roomRef, async snap => {
		const roomData = snap.val();
		if (!roomData) return;
		if (roomData.status === "ended" && !gameEnded) {
			gameEnded = true;
			await finalizeAndScore(roomData);
			await cleanupRoom();
			location.replace("index.html");
			return;
		}
		if (youEl.childElementCount === 0) buildBoard(youEl);
		if (oppEl.childElementCount === 0) buildBoard(oppEl);
		render(roomData);
	});
	window.addEventListener("beforeunload", async () => {
		if (gameEnded) return;
		try {
			await runTransaction(roomRef, cur => {
				if (!cur) return cur;
				if (cur.status === "ended" && cur.winner) return cur;
				return { ...cur, winner: opponent, status: "ended" };
			});
		} catch(e) {}
	});
	getBoards();
}