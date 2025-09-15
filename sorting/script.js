const gameBoard = document.getElementById("gameBoard");
let shelves = [];
let playerName = localStorage.getItem("username") || "";
let timeLeft = 0;
let timer;
let currentLevel = 1;
let totalScore = 0;
let gameInProgress = false;

const ALL_IMAGES = [
	"Du_1.jpg","Du_2.jpg","Du_3.jpg","Du_4.jpg","Du_5.jpg","Du_6.jpg","Du_7.jpg","Du_8.jpg",
	"Khuu_1.jpg","Khuu_2.jpg","Khuu_3.jpg","Khuu_4.jpg","Khuu_5.jpg","Khuu_6.jpg","Khuu_7.jpg","Khuu_8.jpg",
	"Lac_1.jpg","Lac_2.jpg","Lac_3.jpg","Lac_4.jpg","Lac_5.jpg","Lac_6.jpg","Lac_7.jpg","Lac_8.jpg",
	"Vuong_1.jpg","Vuong_2.jpg","Vuong_3.jpg","Vuong_4.jpg","Vuong_5.jpg","Vuong_6.jpg","Vuong_7.jpg","Vuong_8.jpg"
];

const LEVELS = {
	1: { images: 8, shelves: 8, time: 100 },
	2: { images: 10, shelves: 10, time: 300 },
	3: { images: 12, shelves: 12, time: 500 }
};

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function createItemsForLevel(level) {
	const config = LEVELS[level];
	let pool = shuffle([...ALL_IMAGES]);
	let selected = pool.slice(0, config.images);
	let items = [];
	selected.forEach(img => {
		for (let i = 0; i < 3; i++) {
			items.push(img);
		}
	});
	return shuffle(items);
}

function createShelves(level) {
	gameBoard.innerHTML = "";
	const config = LEVELS[level];
	shelves = Array(config.shelves).fill().map(() => ({ front: [], back: [] }));

	const items = createItemsForLevel(level);
	const emptyIndex = Math.floor(Math.random() * config.shelves);
	const fillOrder = [...Array(config.shelves).keys()].filter(i => i !== emptyIndex);

	let idx = 0;
	for (let k = 0; k < fillOrder.length && idx < items.length; k++) {
		const si = fillOrder[k];
		while (shelves[si].front.length < 3 && idx < items.length) {
			const candidate = items[idx];
			const sameCount = shelves[si].front.filter(it => it === candidate).length;
			if (sameCount < 2) {
				shelves[si].front.push(candidate);
				idx++;
			} else {
				const swapIdx = Math.floor(Math.random() * items.length);
				[items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
			}
		}
	}
	for (let k = 0; k < fillOrder.length && idx < items.length; k++) {
		const si = fillOrder[k];
		while (shelves[si].back.length < 3 && idx < items.length) {
			shelves[si].back.push(items[idx++]);
		}
	}

	for (let i = 0; i < config.shelves; i++) {
		let shelf = document.createElement("div");
		shelf.classList.add("shelf");
		shelf.dataset.index = i;
		shelf.addEventListener("dragover", dragOver);
		shelf.addEventListener("drop", dropItem);
		gameBoard.appendChild(shelf);
	}
	updateShelvesUI();
}

function createItemElement(type, shelfIndex, isBack = false) {
	let item = document.createElement("div");
	item.classList.add("item");
	item.style.backgroundImage = `url('../2048/images/${type}')`;
	item.dataset.type = type;
	item.dataset.shelf = shelfIndex;
	item.dataset.isBack = isBack;

	if (isBack) {
		item.classList.add("back-item");
		item.style.pointerEvents = "none";
	} else {
		item.draggable = true;
		item.style.pointerEvents = "auto";
		item.addEventListener("dragstart", dragStart);
		enableTouchSupport(item);
	}
	return item;
}

function removeOneFromFront(si, type) {
	const arr = shelves[si].front;
	const idx = arr.lastIndexOf(type);
	if (idx !== -1) arr.splice(idx, 1);
}


let draggedItem = null;
let sourceShelfIndex = null;

function dragStart(e) {
	draggedItem = e.target;
	sourceShelfIndex = parseInt(draggedItem.dataset.shelf);
	setTimeout(() => draggedItem.style.opacity = "0.5", 0);
}

function dragOver(e) {
	e.preventDefault();
}

function enableTouchSupport(item) {
	item.addEventListener("touchstart", touchStart, { passive: false });
	item.addEventListener("touchmove", touchMove, { passive: false });
	item.addEventListener("touchend", touchEnd);
}

function touchMove(e) {
	e.preventDefault();
}

let touchStartItem = null;

function touchStart(e) {
	touchStartItem = e.target;
	sourceShelfIndex = parseInt(touchStartItem.dataset.shelf);
	touchStartItem.style.opacity = "0.5";
}

function touchEnd(e) {
	touchStartItem.style.opacity = "1";
	const touch = e.changedTouches[0];
	const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
	const targetShelf = targetElement?.closest(".shelf");
	if (targetShelf && touchStartItem) {
		const targetIndex = parseInt(targetShelf.dataset.index);
		const validItems = shelves[targetIndex].front.filter(it => it != null);
		if (validItems.length < 3) {
			const itemType = touchStartItem.dataset.type;
			removeOneFromFront(sourceShelfIndex, itemType);
			shelves[targetIndex].front.push(itemType);
			updateShelvesUI();
			checkMatch(targetIndex);
		} else {
			alert("Kệ này đã đầy!");
		}
	}
	touchStartItem = null;
}

function dropItem(e) {
	e.preventDefault();
	let targetShelf = e.target.closest(".shelf");
	if (targetShelf && draggedItem) {
		let targetIndex = parseInt(targetShelf.dataset.index);
		const validItems = shelves[targetIndex].front.filter(it => it != null);
		if (validItems.length < 3) {
			removeOneFromFront(sourceShelfIndex, draggedItem.dataset.type);
			shelves[targetIndex].front.push(draggedItem.dataset.type);
			updateShelvesUI();
			checkMatch(targetIndex);
		} else {
			alert("Kệ này đã đầy!");
		}
	}
	draggedItem.style.opacity = "1";
	draggedItem = null;
}

function updateShelvesUI() {
	gameBoard.innerHTML = "";
	for (let i = 0; i < shelves.length; i++) {
		let shelf = document.createElement("div");
		shelf.classList.add("shelf");
		shelf.dataset.index = i;
		shelf.addEventListener("dragover", dragOver);
		shelf.addEventListener("drop", dropItem);
		const frontItems = shelves[i].front.filter(it => it != null);
		const backItems = shelves[i].back.filter(it => it != null);
		if (frontItems.length === 0 && backItems.length > 0) {
			shelves[i].front = shelves[i].back.splice(0);
		}
		const updatedFrontItems = shelves[i].front.filter(it => it != null);
		updatedFrontItems.forEach(type => {
			let item = createItemElement(type, i, false);
			shelf.appendChild(item);
		});
		gameBoard.appendChild(shelf);
	}
}


function updateTimerUI() {
	const el = document.getElementById("timer");
	el.textContent = `Thời gian: ${timeLeft}s`;
}

function startTimer() {
	clearInterval(timer);
	updateTimerUI();
	timer = setInterval(() => {
		timeLeft--;
		updateTimerUI();
		if (timeLeft <= 0) {
			clearInterval(timer);
			alert(`Hết giờ ở Level ${currentLevel}!`);
			finishGame();
		}
	}, 1000);
}

function startLevel(level) {
	currentLevel = level;
	timeLeft = LEVELS[level].time;
	createShelves(level);
	gameInProgress = true;
	startTimer();
}

function remainingItems() {
	return shelves.flatMap(s => [...s.front, ...s.back]).filter(Boolean).length;
}

function checkMatch(shelfIndex) {
	const items = shelves[shelfIndex].front.filter(Boolean);
	if (items.length === 3) {
		if (items[0] === items[1] && items[1] === items[2]) {
			setTimeout(() => removeItems(shelfIndex), 300);
		}
	}
}

function removeItems(shelfIndex) {
	shelves[shelfIndex].front = [];
	if (shelves[shelfIndex].back.length > 0) {
		shelves[shelfIndex].front = shelves[shelfIndex].back;
		shelves[shelfIndex].back = [];
	}
	updateShelvesUI();
	checkLevelClear();
}

function checkLevelClear() {
	if (remainingItems() === 0) {
		clearInterval(timer);
		const levelScore = Math.floor(timeLeft / 2);
		totalScore += levelScore;
		const timeUsed = LEVELS[currentLevel].time - timeLeft;
		alert(`Hoàn thành Level ${currentLevel} trong ${timeUsed}s\nĐiểm level: ${levelScore}`);
		onLevelComplete();
	}
}

function onLevelComplete() {
	saveProgressLocal();
	if (currentLevel < 3) {
		startLevel(currentLevel + 1);
	} else {
		finishGame();
	}
}

function saveProgressLocal() {
	const data = {
		playerName,
		currentLevel,
		totalScore,
		timeLeft,
		timestamp: Date.now()
	};
	localStorage.setItem("sorting_progress", JSON.stringify(data));
}

function restoreProgressLocal() {
	const raw = localStorage.getItem("sorting_progress");
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

window.addEventListener("beforeunload", () => {
	if (gameInProgress) saveProgressLocal();
});

async function saveScoreToFirebase(score) {
	if (!playerName) {
		alert("Chưa có tên người chơi!");
		return;
	}
	const gameName = "Sorting";
	const docId = `${playerName}-${gameName}`;
	try {
		const ref = db.collection("userScores").doc(docId);
		const snap = await ref.get();
		if (!snap.exists) {
			await ref.set({
				username: playerName,
				game: gameName,
				score,
				updatedAt: new Date().toISOString()
			});
		} else {
			const data = snap.data();
			if (score > data.score) {
				await ref.update({
					score,
					updatedAt: new Date().toISOString()
				});
			}
		}
	} catch (e) {
		console.error("Firebase error", e);
	}
}

function finishGame() {
	gameInProgress = false;
	clearInterval(timer);
	alert(`Trò chơi kết thúc!\nTổng điểm: ${totalScore}`);
	saveScoreToFirebase(totalScore);
	localStorage.removeItem("sorting_progress");
}

function initGame() {
	const saved = restoreProgressLocal();
	if (saved && saved.playerName === playerName) {
		currentLevel = saved.currentLevel;
		totalScore = saved.totalScore;
		timeLeft = saved.timeLeft;
		startLevel(currentLevel);
	} else {
		startLevel(1);
	}
}

initGame();
