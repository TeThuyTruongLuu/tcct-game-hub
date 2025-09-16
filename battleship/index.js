// PART 2: setup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
	getDatabase,
	ref,
	get,
	set,
	update,
	child
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

	if (!username || !password || !selectedChar) {
		alert("Điền đầy đủ thông tin và chọn nhân vật trước khi chơi.");
		return;
	}

	loading.style.display = "block";

	const userRef = ref(db, `users/${username}`);
	const scoreRef = ref(db, `userScores/${username}-battleship`);
	const snapshot = await get(userRef);

	if (snapshot.exists()) {
		const data = snapshot.val();
		if (data.password !== password) {
			alert("Sai mật khẩu.");
			loading.style.display = "none";
			return;
		}
		if (data.char !== selectedChar) {
			alert(`Bạn đã chọn mặt ${data.char} trước đó. Vui lòng chọn đúng.`);
			loading.style.display = "none";
			return;
		}
	} else {
		await set(userRef, {
			username,
			password,
			char: selectedChar
		});
		await set(scoreRef, {
			username,
			game: "battleship",
			score: 0,
			updatedAt: new Date().toISOString()
		});
	}

	const scoreSnap = await get(scoreRef);
	const currentScore = scoreSnap.exists() ? (scoreSnap.val().score || 0) : 0;

	await update(scoreRef, {
		score: -100,
		updatedAt: new Date().toISOString()
	});

	localStorage.setItem("username", username);
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

const urlParams = new URLSearchParams(window.location.search);
const step = urlParams.get("step");

if (step === "match") {
    document.getElementById("setup-container").style.display = "none";
    document.getElementById("length-config-container").style.display = "none";
    document.getElementById("game-container").innerHTML = "<h2>Đang tìm đối thủ...</h2>";
    document.getElementById("game-container").style.display = "block";

    const username = localStorage.getItem("username");
    const userRef = ref(db, `users/${username}`);
    const roomsRef = ref(db, "rooms");

    async function joinRoom() {
        const snapshot = await get(roomsRef);
        let joined = false;

        if (snapshot.exists()) {
            const rooms = snapshot.val();
            for (const roomId in rooms) {
                const room = rooms[roomId];
                if (room.status === "waiting" && room.player1 !== username) {
                    const updates = {};
                    updates[`rooms/${roomId}/player2`] = username;
                    updates[`rooms/${roomId}/status`] = "playing";
                    updates[`rooms/${roomId}/turn`] = "player1";
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
            await set(newRoomRef, {
                player1: username,
                status: "waiting"
            });
            await update(userRef, { inBattle: roomId });
            listenToRoom(roomId, "player1");
        }
    }

    function listenToRoom(roomId, role) {
        const roomRef = ref(db, `rooms/${roomId}`);
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
    document.getElementById("setup-container").style.display = "none";
    document.getElementById("length-config-container").style.display = "none";
    document.getElementById("game-container").innerHTML = `
        <h2>Đang chiến đấu với đối thủ...</h2>
        <div class="battle-board" id="battle-board"></div>
        <p id="turn-info"></p>
    `;
    document.getElementById("game-container").style.display = "block";

    const username = localStorage.getItem("username");
    const roomId = localStorage.getItem("roomId");
    const role = localStorage.getItem("role");
    const opponent = localStorage.getItem("opponent");
    const youBoard = [];
    const COLS = 10;
    const boardSize = COLS * COLS;
    const boardEl = document.getElementById("battle-board");
    const turnInfo = document.getElementById("turn-info");
    const roomRef = ref(db, `rooms/${roomId}`);
    let gameEnded = false;

    async function getBoards() {
        const youRef = ref(db, `users/${username}`);
        const oppRef = ref(db, `users/${opponent}`);
        const youSnap = await get(youRef);
        const oppSnap = await get(oppRef);
        const you = youSnap.val();
        const opp = oppSnap.val();
        youBoard.push(...(you.shipPositions || []));
        await update(roomRef, {
            [`${role}Board`]: you.shipPositions || [],
            [`${role}Hits`]: [],
            log: [],
            status: "playing"
        });
    }

    function renderBoard(roomData) {
        boardEl.innerHTML = "";
        const hitsYou = roomData[`${role}Hits`] || [];
        const oppHits = roomData[`${role === "player1" ? "player2" : "player1"}Hits`] || [];
        const currentTurn = roomData.turn;

        for (let i = 0; i < boardSize; i++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            if (roomData.winner) cell.classList.add("disabled");

            if (hitsYou.includes(i)) {
                cell.textContent = "🔥";
                cell.classList.add("hit");
            } else if (oppHits.includes(i)) {
                cell.classList.add("danger");
            }

            if (currentTurn === role && !hitsYou.includes(i)) {
                cell.addEventListener("click", () => shoot(i, roomData));
                cell.classList.add("clickable");
            }

            boardEl.appendChild(cell);
        }

        if (roomData.winner) {
            turnInfo.textContent = roomData.winner === username ? "🎉 Bạn thắng!" : "💥 Bạn thua!";
        } else {
            turnInfo.textContent = currentTurn === role ? "🔫 Lượt của bạn" : "⏳ Chờ đối thủ...";
        }
    }

    async function shoot(index, roomData) {
        if (gameEnded) return;

        const targetBoard = roomData[`${role === "player1" ? "player2" : "player1"}Board`] || [];
        const hits = roomData[`${role}Hits`] || [];
        const isHit = targetBoard.includes(index);
        const updatedHits = [...hits, index];
        const log = roomData.log || [];
        log.push({ by: role, index, result: isHit ? "hit" : "miss" });

        const allHitPositions = updatedHits;
        const isSunk = checkSunk(targetBoard, allHitPositions);
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

        if (winner) {
            gameEnded = true;
            await handleWin(winner);
        }
    }

    function checkSunk(board, hits) {
        return board.every(pos => hits.includes(pos));
    }

    async function handleWin(winnerName) {
        const loser = winnerName === username ? opponent : username;
        const winnerRef = ref(db, `userScores/${winnerName}-battleship`);
        const loserRef = ref(db, `userScores/${loser}-battleship`);
        const winSnap = await get(winnerRef);
        const loseSnap = await get(loserRef);
        const winScore = winSnap.exists() ? (winSnap.val().score || 0) : 0;
        const loseScore = loseSnap.exists() ? (loseSnap.val().score || 0) : 0;

        await update(winnerRef, {
            score: winScore + 150,
            updatedAt: new Date().toISOString()
        });

        await update(loserRef, {
            score: loseScore + 50,
            updatedAt: new Date().toISOString()
        });
    }

    onValue(roomRef, snap => {
        const roomData = snap.val();
        if (!roomData) return;
        renderBoard(roomData);
    });

    getBoards();
}

if (roomData.winner && !document.getElementById("after-match-buttons")) {
    const wrapper = document.createElement("div");
    wrapper.id = "after-match-buttons";
    wrapper.style.marginTop = "20px";

    const btnRematch = document.createElement("button");
    btnRematch.textContent = "🔁 Chơi lại";
    btnRematch.onclick = () => {
        window.location.href = "index.html?step=match";
    };

    const btnReset = document.createElement("button");
    btnReset.textContent = "🔙 Về lại đầu";
    btnReset.style.marginLeft = "10px";
    btnReset.onclick = () => {
        localStorage.clear();
        window.location.href = "index.html";
    };

    wrapper.appendChild(btnRematch);
    wrapper.appendChild(btnReset);
    document.getElementById("game-container").appendChild(wrapper);
}
