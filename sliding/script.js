
const imageTiles = ['1.png', '2.png', '3.png', '4.png', '6.png', '7.png', '8.png', '9.png'];
const emptyTile = null;
let startTime;
let tiles = [];
const winningState = ['1.png', '2.png', '3.png', '4.png', null, '6.png', '7.png', '8.png', '9.png'];
const puzzle = document.getElementById('puzzle');
let timerStarted = false;
let timerInterval;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function initPuzzle() {
  tiles = [...imageTiles, emptyTile];
  shuffle(tiles);
  while (JSON.stringify(tiles) === JSON.stringify(winningState)) {
    shuffle(tiles);
  }
  timerStarted = false;
  clearInterval(timerInterval);
  document.getElementById("timer").innerText = "⏱️ Thời gian: 0 giây";
  render();
}

function render() {
  puzzle.innerHTML = '';
  tiles.forEach((tile, index) => {
    const div = document.createElement('div');
    div.classList.add('tile');
    if (tile === emptyTile) {
      div.classList.add('empty');
    } else {
      div.style.backgroundImage = `url('${tile}')`;
      div.addEventListener('click', () => tryMove(index));
    }
    puzzle.appendChild(div);
  });
}

function tryMove(index) {
  const emptyIndex = tiles.indexOf(emptyTile);
  const validMoves = getAdjacentIndexes(emptyIndex);
  if (validMoves.includes(index)) {
    if (!timerStarted) {
      startTime = Date.now();
      timerStarted = true;
      timerInterval = setInterval(() => {
        const now = Date.now();
        const seconds = Math.floor((now - startTime) / 1000);
        const timerEl = document.getElementById("timer");
        if (timerEl) timerEl.innerText = `⏱️ Thời gian: ${seconds} giây`;
      }, 1000);
    }
    [tiles[emptyIndex], tiles[index]] = [tiles[index], tiles[emptyIndex]];
    render();
    checkWin();
  }
}

function getAdjacentIndexes(index) {
  const adjacent = [];
  const row = Math.floor(index / 3);
  const col = index % 3;
  if (row > 0) adjacent.push(index - 3);
  if (row < 2) adjacent.push(index + 3);
  if (col > 0) adjacent.push(index - 1);
  if (col < 2) adjacent.push(index + 1);
  return adjacent;
}

async function calculateRankAndScore(game, timeInSeconds) {
  const scoresRef = firebase.firestore().collection("userScores");
  const snapshot = await scoresRef.where("game", "==", game).orderBy("totalTimeInSeconds", "asc").get();

  const times = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.totalTimeInSeconds !== undefined) {
      times.push(data.totalTimeInSeconds);
    }
  });

  let rank = 1;
  for (let time of times) {
    if (time < timeInSeconds) {
      rank++;
    } else {
      break;
    }
  }

  let score = 5;
  if (rank === 1) score = 30;
  else if (rank === 2) score = 27;
  else if (rank === 3) score = 24;
  else if (rank <= 5) score = 21;
  else if (rank <= 10) score = 18;
  return { rank, score };
}

async function saveSlidingScore(username, totalTimeInSeconds, totalTime) {
  const { rank, score } = await calculateRankAndScore("Sliding", totalTimeInSeconds);
  const docId = `${username}-Sliding`;
  const scoresRef = firebase.firestore().collection("userScores").doc(docId);
  await scoresRef.set({
    username,
    game: "Sliding",
    score,
    rank,
    totalTime,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return score;
}

function checkWin() {
  if (JSON.stringify(tiles) === JSON.stringify(winningState)) {
    clearInterval(timerInterval);
    const endTime = Date.now();
    const totalTimeInSeconds = Math.floor((endTime - startTime) / 1000);
	const totalTime = formatTime(totalTimeInSeconds);
    const username = localStorage.getItem("username") || "Guest";

    setTimeout(async () => {
      const score = await saveSlidingScore(username, totalTimeInSeconds, totalTime);
      alert(`🎉 Bạn đã nhận được một trái tim!
Thời gian: ${totalTimeInSeconds} giây
Điểm: ${score}`);
    }, 200);
  }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

initPuzzle();
