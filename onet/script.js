//Khai báo các biến (Bảng, tile, time, score, level, nhạc)
//Bảng + tileSize
let boardSize = { rows: 6, cols: 9 };
let tileSize = window.innerWidth < 700 ? window.innerWidth * 0.1 : 80; 
let board = [];
let firstPick = null;
let secondPick = null;

let timer;
let timerPaused = false;
let timeElapsed = 0;
let timeLeft = 120;
let playerScore = 0;
let currentLevel = 0;
let isYouTubePlaying = false;
let shuffleCount = currentLevel === 0 ? 3 : 10;

//Khai báo các hằng (Ảnh, bảng, setting, nhạc, levels)
const imageFolderPath = "../matching_game/images/";
const imageNames = [
    "Cá Dụ 1.png", "Cáo Diệp 1.png", "Cáo tuyết Lam 1.png", "Cao.jpg", "Chu.jpg", "Chung.jpg",
    "Chuột Duệ 1.png", "Corgi Lư 1.png", "Cú An 1.png", "Cún bự Bao 1.png", "Cún La 1.png", 
    "Cụt Chu 1.png", "Diệp.jpg", "Đới.jpg", "Dụ 2.jpg", "Duệ.jpg", "Giang.jpg", "Hạ.jpg", 
    "Hải ly Quan 1.png", "Hamster Tranh 1.png", "Hàn.jpg", "Hổ con Tống 1.png", "Hổ Hàn 1.png", 
    "Hổ trắng Lâu 1.png", "Hoàng.jpg", "Khưu.jpg", "Kiều.jpg", "Lạc.jpg", "Lam.jpg", "Lâm.jpg",
    "Lão cẩu Ngụy 1.png", "Lâu.jpg", "Linh miêu bự Phương 1.png", "Lư.jpg", "Lý.jpg", "Mèo Nhu 1.png"
];

const gameBoard = document.getElementById("game-board");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeSettings = document.getElementById("close-settings");
const musicSelect = document.getElementById("music-select");
const youtubeInput = document.getElementById("youtube-link");
const playButton = document.getElementById("play-music");
const stopButton = document.getElementById("stop-music");
const bgMusic = document.getElementById("background-music");
const musicSource = document.getElementById("music-source");
const youtubePlayer = document.getElementById("youtube-player");

const levels = [
    { rows: 6, cols: 9, tileSize: window.innerWidth < 700 ? window.innerWidth * 0.1 : 80 }, // Level 1
    { rows: 9, cols: 12, tileSize: window.innerWidth < 700 ? window.innerWidth * 0.01 : 10 } // Level Max
];


//Window called
window.onload = function () {
    let savedLevel = localStorage.getItem("savedLevel");
    let savedScore = localStorage.getItem("savedScore");

    if (savedLevel !== null) {
        loadLevel(parseInt(savedLevel));
        playerScore = savedScore ? parseInt(savedScore) : 0;
        updateScoreUI();
        localStorage.removeItem("savedLevel"); // ✅ Chỉ xóa savedLevel, giữ savedScore
    } else {
        loadLevel(0);
    }
	
	adjustSettingsButton();
};

window.addEventListener("resize", () => {
    if (currentLevel === 0) { // 🔥 Level 1: Giữ kích thước lớn hơn
        tileSize = window.innerWidth < 700 ? window.innerWidth * 0.1 : 80;
    } else { // 🔥 Level Max: Giảm kích thước để vừa khung
        tileSize = Math.min(window.innerWidth / boardSize.cols, window.innerHeight / boardSize.rows);
    }
	adjustSettingsButton();
    createBoard(); 
	assignImages();
});

window.addEventListener("beforeunload", async function (event) {
    if (playerScore > 0) {
        console.log("🔥 Người chơi thoát game, lưu điểm trước...");
        event.preventDefault(); // Chặn đóng tab ngay lập tức
        event.returnValue = "Dữ liệu đang được lưu..."; // Hiển thị cảnh báo thoát
        await saveScoreToDB("Nối hình", playerScore); // Đợi Firestore lưu điểm xong
    }
});

//Setting button + Musics
settingsBtn.addEventListener("click", () => { // 🔥 Khi mở cài đặt
    settingsModal.style.display = "flex";
    if (!timerPaused) {
        clearInterval(timer);
        timerPaused = true;
    }
});

closeSettings.addEventListener("click", () => { // 🔥 Khi đóng cài đặt
    settingsModal.style.display = "none";
    if (timerPaused) {
        startTimer(); // 🔥 Tiếp tục thời gian thay vì reset
    }
});


function adjustSettingsButton() { //Căn chỉnh vị trí nút
    const settingsBtn = document.getElementById("settings-btn");
    const gameTitle = document.querySelector("h1");
    const gameBoard = document.getElementById("game-board");

    if (!settingsBtn || !gameTitle || !gameBoard) return;

    const titleRect = gameTitle.getBoundingClientRect();
    const boardRect = gameBoard.getBoundingClientRect();

    settingsBtn.style.position = "absolute";
    settingsBtn.style.top = `${titleRect.top}px`;
    settingsBtn.style.right = `${window.innerWidth - boardRect.right}px`;
}

musicSelect.addEventListener("change", () => { //Đổi nhạc
    if (musicSelect.value === "custom") {
        youtubeInput.style.display = "inline-block";
    } else {
        youtubeInput.style.display = "none";
    }
});

function playMusic() { //Phát nhạc
    if (musicSelect.value === "custom") {
        let youtubeUrl = youtubeInput.value.trim();
        if (youtubeUrl) {
			let { videoId, playlistId } = extractYouTubeID(youtubeUrl);

			if (playlistId) {
				// 🔥 Phát playlist nếu có
				youtubePlayer.src = `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&loop=1`;
			} else if (videoId) {
				// 🔥 Phát video nếu không có playlist
				youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
			} else {
				alert("Link YouTube không hợp lệ!");
				return;
			}
        } else {
            alert("Vui lòng nhập link YouTube!");
        }
    } else {
        let selectedMusic = "musics/" + musicSelect.value;
        musicSource.src = selectedMusic;
        bgMusic.load();
        bgMusic.play();
        youtubePlayer.style.display = "none";
        isYouTubePlaying = false;
    }
}

function stopMusic() { //Dừng nhạc
    bgMusic.pause();
    bgMusic.currentTime = 0;
    youtubePlayer.src = "";
    youtubePlayer.style.display = "none";
    isYouTubePlaying = false;
}

function extractYouTubeID(youtubeUrl) { // Lấy Video ID & Playlist ID
    const videoRegex = /(?:https?:\/\/)?(?:www\.)?(youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const playlistRegex = /[?&]list=([a-zA-Z0-9_-]+)/;

    const videoMatch = youtubeUrl.match(videoRegex);
    const playlistMatch = youtubeUrl.match(playlistRegex);

    const videoId = videoMatch ? videoMatch[2] : null;
    const playlistId = playlistMatch ? playlistMatch[1] : null;

    return { videoId, playlistId };
}


playButton.addEventListener("click", playMusic);
stopButton.addEventListener("click", stopMusic);


//Timer
function updateTimerUI() { //UI hiển thị
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    document.getElementById("timer").textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function startTimer() {
    stopTimer(); // Đảm bảo không có timer cũ chạy

    if (currentLevel === 0) { // 🔥 Level 1: Đếm ngược
        if (timerPaused) {
            timerPaused = false;
        } else {
            timeLeft = 120; // 🔥 Chỉ đặt lại nếu KHÔNG phải tiếp tục từ tạm dừng
        }
        
        timer = setInterval(() => {
            timeLeft--;
            updateTimerUI();
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleGameLoss();
            }
        }, 1000);
    } else { // 🔥 Level Max: Đếm lên
        if (timerPaused) {
            timerPaused = false;
        } else {
            timeElapsed = 0; // 🔥 Chỉ đặt lại nếu KHÔNG phải tiếp tục từ tạm dừng
        }

        timer = setInterval(() => {
            timeElapsed++;
            let minutes = Math.floor(timeElapsed / 60);
            let seconds = timeElapsed % 60;
            document.getElementById("timer").textContent = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        }, 1000);
    }
}

function stopTimer() { //Stop timer
    clearInterval(timer);
}


//Board + Tiles + Load levels
function createBoard() {
    gameBoard.innerHTML = "";
    gameBoard.style.display = "grid";
    gameBoard.style.gridTemplateColumns = `repeat(${boardSize.cols}, ${tileSize}px)`;
    gameBoard.style.gridTemplateRows = `repeat(${boardSize.rows}, ${tileSize}px)`;
        
    for (let row = 0; row < boardSize.rows; row++) {
        board[row] = [];
        for (let col = 0; col < boardSize.cols; col++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
			tile.dataset.row = row;
            tile.dataset.col = col;
                
            if (row === 0 || row === boardSize.rows - 1 || col === 0 || col === boardSize.cols - 1) {
                tile.classList.add("hidden");
                board[row][col] = { element: tile, x: col * tileSize + tileSize / 2, y: row * tileSize + tileSize / 2, hidden: true };
            } else {

                const centerX = col * tileSize + tileSize / 2;
                const centerY = row * tileSize + tileSize / 2;
                board[row][col] = { element: tile, x: centerX, y: centerY, hidden: false };
                    
                const img = document.createElement("img");
                img.style.width = "100%";
                img.style.height = "100%";
                tile.appendChild(img);
                    
                tile.addEventListener("click", () => handleTileClick(row, col));
            }
            gameBoard.appendChild(tile);
        }
    }
}

function assignImages() {
    let validTiles = [];
    for (let row = 1; row < boardSize.rows - 1; row++) {
        for (let col = 1; col < boardSize.cols - 1; col++) {
            validTiles.push({ row, col });
        }
    }

    let selectedImages = imageNames.slice(0, validTiles.length / 2);
    let shuffledImages = [...selectedImages, ...selectedImages];
    shuffledImages = shuffledImages.sort(() => Math.random() - 0.5);

    validTiles.forEach((tile, index) => {
        let img = document.createElement("img");
        img.src = imageFolderPath + shuffledImages[index];
        img.style.width = "100%";
        img.style.height = "100%";

        board[tile.row][tile.col].element.appendChild(img);
        board[tile.row][tile.col].element.dataset.pairId = shuffledImages[index]; // Gán ID cặp hình ảnh
    });
}

function loadLevel(levelIndex) {
    if (levelIndex >= levels.length) {
        alert("🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ game!");
        return;
    }

    currentLevel = levelIndex;
    boardSize = {
        rows: levels[levelIndex].rows,
        cols: levels[levelIndex].cols
    };
    tileSize = levels[levelIndex].tileSize;

    document.getElementById("level").textContent = levelIndex === 1 ? "Max" : levelIndex + 1;

    shuffleCount = currentLevel === 0 ? 3 : 10; // Cập nhật số lần shuffle khi load level
    updateShuffleButton(); // Cập nhật giao diện shuffle

    document.getElementById("game-board").style.gridTemplateColumns = `repeat(${boardSize.cols}, ${tileSize}px)`;

    createBoard();
    assignImages();

    stopTimer();
    if (currentLevel === 0) {
        timeLeft = 120;
    } else {
        timeElapsed = 0;
        document.getElementById("timer").textContent = "0:00";
    }
    startTimer();
}


//Xử lý nước đi - Part 1 (Click => Tìm tiles kề cận => Check valid của tiles & Check border)
function handleTileClick(row, col) {
    const selectedTile = board[row][col];
    if (!firstPick) {
        firstPick = selectedTile;
        firstPick.element.classList.add("selected");
    } else if (!secondPick) {
        secondPick = selectedTile;
        secondPick.element.classList.add("selected");

        // Nếu hai ô không phải cặp giống nhau, bỏ chọn
        if (firstPick.element.dataset.pairId !== secondPick.element.dataset.pairId) {
            setTimeout(clearSelection, 500);
            return;
        }

        // Nếu là cặp giống nhau và có đường nối hợp lệ
        const path = findPath(firstPick, secondPick);
        if (path) {
            drawConnection(path);
            setTimeout(removeMatchedTiles, 1000);
        } else {
            setTimeout(clearSelection, 500);
        }
    }
}

function getValidNeighbors(row, col) {
    let directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Các hướng: lên, xuống, trái, phải
    let neighbors = [];

    for (let [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;

        // Kiểm tra xem tọa độ có hợp lệ không
        if (nr >= 0 && nr < boardSize.rows && nc >= 0 && nc < boardSize.cols) {
            let neighborTile = board[nr][nc];

            // 🔴 Chỉ cho phép đi qua ô bị ẩn hoặc ô viền ngoài
            if (neighborTile.hidden || isBorderTile(nr, nc)) {
                neighbors.push([nr, nc]); 
            }
        }
    }

    console.log(`Neighbors for (${row}, ${col}):`, neighbors);
    return neighbors;
}

function isValidTile(row, col) {
    if (row < 0 || col < 0 || row >= boardSize.rows || col >= boardSize.cols) return false;
    let tile = board[row][col];

    // Chỉ đi qua ô bị ẩn, ô viền ngoài hoặc hai ô đang chọn
    return tile.hidden || isBorderTile(row, col) || tile === firstPick || tile === secondPick;
}

function isBorderTile(row, col) {
    return row === 0 || row === boardSize.rows - 1 || col === 0 || col === boardSize.cols - 1;
}


//Part 2: Tìm đường (Ngắn nhất & Không qua unvalid tiles)
function findPath(tile1, tile2) {
    console.log("Checking path between", tile1, tile2);
    
    if (tile1 === tile2) return null;
    if (tile1.hidden || tile2.hidden) return null;
    if (tile1.element.dataset.pairId !== tile2.element.dataset.pairId) return null;

    // Nếu hai ô kề nhau, gọi vẽ đường nối trước khi return
    if ((Math.abs(tile1.x - tile2.x) === tileSize && tile1.y === tile2.y) || 
        (Math.abs(tile1.y - tile2.y) === tileSize && tile1.x === tile2.x)) {
        console.log("Tiles are adjacent, direct path found!");
        let directPath = [[tile1.element.dataset.row, tile1.element.dataset.col], 
                          [tile2.element.dataset.row, tile2.element.dataset.col]];
        drawConnection(directPath); // 🔥 Gọi vẽ trước khi return
        return directPath;
    }

    let path = getShortestPath(tile1, tile2);
    console.log("Path found:", path);

    if (path && path.length > 1) {
        // 🔥 Gọi đúng hàm vẽ theo level
        if (currentLevel === 1) {
            drawConnectionUpdated(path);
        } else {
            drawConnection(path);
        }
        return path;
    }

    console.log("No valid path found.");
    return null;
}

function getShortestPath(tile1, tile2) {
    let startRow = parseInt(tile1.element.dataset.row);
    let startCol = parseInt(tile1.element.dataset.col);
    let endRow = parseInt(tile2.element.dataset.row);
    let endCol = parseInt(tile2.element.dataset.col);

    let queue = [[startRow, startCol, [], 0]];
    let visited = new Set();
    visited.add(`${startRow},${startCol}`);

    while (queue.length > 0) {
        let [row, col, path, turns] = queue.shift();
        let newPath = [...path, [row, col]];

        console.log(`Checking path from (${row}, ${col}) to (${endRow}, ${endCol})`);

        if (row === endRow && col === endCol) {
            console.log("Path found:", newPath);
            return newPath;
        }

        let directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Chỉ đi lên, xuống, trái, phải
        for (let [dr, dc] of directions) {
            let nr = row + dr;
            let nc = col + dc;

            if (nr < 0 || nr >= boardSize.rows || nc < 0 || nc >= boardSize.cols) continue; // Bỏ qua ô ngoài biên

            if (!isValidTile(nr, nc)) continue; // 🔥 Chỉ đi qua ô hợp lệ

            let newTurns = turns;

            // Kiểm tra nếu gấp khúc
            if (path.length > 0) {
                let [pr, pc] = path[path.length - 1];
                if ((pr !== nr && pc !== nc)) {
                    newTurns++;
                }
            }

            // Chỉ cho phép tối đa 2 lần gấp khúc
            if (!visited.has(`${nr},${nc}`) && newTurns <= 2) {
                queue.push([nr, nc, newPath, newTurns]);
                visited.add(`${nr},${nc}`);
            }
        }
    }

    console.log("No valid path found.");
    return null;
}

function pathIntersectsOnlyHiddenTiles(path) {
    for (let i = 1; i < path.length - 1; i++) {
        let [px, py] = path[i];
		console.log("Checking path intersection at", px, py);
        for (let row = 0; row < boardSize.rows; row++) {
            for (let col = 0; col < boardSize.cols; col++) {
                let tile = board[row][col];
                if (tile && !tile.hidden && tile.x === px && tile.y === py) {
					console.log("Path intersects invalid tile at", px, py);
                    return false;
                }
            }
        }
    }
    return true;
}


//Part 3: Vẽ đường (Level 1, level max)
function drawConnection(path) {
    let lineContainer = document.createElement("div");
    lineContainer.classList.add("line-container");
    document.body.appendChild(lineContainer);

    let boardRect = gameBoard.getBoundingClientRect();

    for (let i = 0; i < path.length - 1; i++) {
        let [row1, col1] = path[i];
        let [row2, col2] = path[i + 1];

        let tile1 = board[row1][col1].element.getBoundingClientRect();
        let tile2 = board[row2][col2].element.getBoundingClientRect();

        let x1 = ((tile1.left + tileSize / 2) / window.innerWidth) * 100;		
		let y1 = ((tile1.top + tileSize / 2 + (window.innerWidth < 700 ? boardRect.top*0.03 : boardRect.top)) / window.innerWidth) * 100;
        
		let x2 = ((tile2.left + tileSize / 2) / window.innerWidth) * 100;
		let y2 = ((tile2.top + tileSize / 2 + (window.innerWidth < 700 ? boardRect.top*0.03 : boardRect.top)) / window.innerWidth) * 100;

        let line = document.createElement("div");
        line.classList.add("line");

        if (row1 === row2) { // Đường ngang
            line.style.width = `${Math.abs(x2 - x1)}vw`;
            line.style.height = "0.4vw";
            line.style.left = `${Math.min(x1, x2)}vw`;
            line.style.top = `${y1 - 0.35}vw`;
        } else if (col1 === col2) { // Đường dọc
            line.style.width = "0.4vw";
            line.style.height = `${Math.abs(y2 - y1)}vw`;
            line.style.left = `${x1 - 0.35}vw`;
            line.style.top = `${Math.min(y1, y2)}vw`;
        }

        lineContainer.appendChild(line);
    }

    setTimeout(() => lineContainer.remove(), 1000);
} 

function drawConnectionUpdated(path) {
    let lineContainer = document.createElement("div");
    lineContainer.classList.add("line-container");
    document.body.appendChild(lineContainer);

    let boardRect = gameBoard.getBoundingClientRect();

    for (let i = 0; i < path.length - 1; i++) {
        let [row1, col1] = path[i];
        let [row2, col2] = path[i + 1];

        let tile1 = board[row1][col1].element.getBoundingClientRect();
        let tile2 = board[row2][col2].element.getBoundingClientRect();

        let x1 = ((tile1.left + tileSize / 2) / window.innerWidth) * 100;
        let y1 = ((tile1.top + tileSize / 2 + boardRect.top*4.5) / window.innerWidth) * 100;
        let x2 = ((tile2.left + tileSize / 2) / window.innerWidth) * 100;
        let y2 = ((tile2.top + tileSize / 2 + boardRect.top*4.5) / window.innerWidth) * 100;
		

        let line = document.createElement("div");
        line.classList.add("line2");

        if (row1 === row2) { // Đường ngang
            line.style.width = `${Math.abs(x2 - x1)}vw`;
            line.style.height = "0.3vw";
            line.style.left = `${Math.min(x1, x2)}vw`;
            line.style.top = `${y1 - 0.35}vw`;
        } else if (col1 === col2) { // Đường dọc
            line.style.width = "0.4vw";
            line.style.height = `${Math.abs(y2 - y1)}vw`;
            line.style.left = `${x1 - 0.35}vw`;
            line.style.top = `${Math.min(y1, y2)}vw`;
        }

        lineContainer.appendChild(line);
    }

    setTimeout(() => lineContainer.remove(), 1000);
} 


//Part 4: Xóa match, xóa select, update vị trí tile
function removeMatchedTiles() {
    firstPick.element.classList.add("hidden");
    secondPick.element.classList.add("hidden");
    firstPick.element.innerHTML = "";
    secondPick.element.innerHTML = "";
    board[firstPick.element.dataset.row][firstPick.element.dataset.col].hidden = true;
    board[secondPick.element.dataset.row][secondPick.element.dataset.col].hidden = true;
	
	updateScore();
    clearSelection();
	
/*     setTimeout(() => {
        if (checkAnyValidMove()) {
            console.log("⚠️ Không còn nước đi hợp lệ! Shuffle lại bảng.");
            shuffleBoard();
        }
    }, 500); */
	
	checkGameOver();
}

function clearSelection() {
    if (firstPick) firstPick.element.classList.remove("selected");
    if (secondPick) secondPick.element.classList.remove("selected");
    firstPick = null;
    secondPick = null;
}

function updateTilePositions() {
    let boardRect = gameBoard.getBoundingClientRect();

    for (let row = 1; row < boardSize.rows - 1; row++) {
        for (let col = 1; col < boardSize.cols - 1; col++) {
            let tile = board[row][col];

            if (!tile.hidden) {
                let tileRect = tile.element.getBoundingClientRect();
                tile.x = ((tileRect.left + tileSize / 2) - boardRect.left) / window.innerWidth * 100;
                tile.y = ((tileRect.top + tileSize / 2) + boardRect.top) / window.innerHeight * 100;
            }
        }
    }
    console.log("📌 Tile positions updated.");
}


//Part 5: Cộng điểm, check game over
function updateScoreUI() {
    document.getElementById("score").textContent = playerScore;
}

function updateScore() {
    if (currentLevel === 0) {
        playerScore += 10; // Level 1: Mỗi cặp +10 điểm
    } else {
        playerScore += 1; // Level Max: Mỗi cặp +1 điểm
    }
    updateScoreUI();
	saveScoreToDB("Nối hình", playerScore);
}

function checkIfAllTilesMatched() {
    for (let row = 1; row < boardSize.rows - 1; row++) {
        for (let col = 1; col < boardSize.cols - 1; col++) {
            let tile = board[row][col];
            if (!tile.hidden) {
                return false;
            }
        }
    }
    return true; // Tất cả các ô đã bị ẩn (đã ghép hết các cặp)
}

function checkGameOver() {   
    if (checkIfAllTilesMatched()) {
        stopTimer();
        let bonus = (currentLevel === 0) ? timeLeft : Math.max(0, 1000 - timeElapsed);
        playerScore += bonus;
        updateScoreUI();
        alert(`🎉 Hết game! Bạn nhận được ${bonus} điểm thưởng. Tổng điểm: ${playerScore}`);
        
        if (currentLevel === 0) {
            localStorage.setItem("savedLevel", 1);
            localStorage.setItem("savedScore", playerScore);
            loadLevel(1);
			alert("Nhấn reset khi vừa vào level Max để load lại bảng!");
        } else {
            alert("🎉 Bạn đã hoàn thành toàn bộ game!");
        }
    }
}

function handleGameLoss() {
    alert("⏳ Hết giờ! Bồ thua rồi. Chơi lại nha.");
    resetGameAfterLoss();
}

function resetGameAfterLoss() {
    stopTimer(); // Dừng bất kỳ timer nào đang chạy
    currentLevel = 0;
    playerScore = 0;
    timeLeft = 120;
    shuffleCount = 3; // Reset số lần shuffle về mặc định
    updateShuffleButton();
    updateScoreUI();
    updateTimerUI();
    loadLevel(0);
}


//Xử lý các nút
//Shuffle (Nhấn nút => Check ô, check xem shuff xong có đường không)
function updateShuffleButton() {
    document.getElementById("shuffle-button").textContent = `Xáo hình (${shuffleCount})`;
}

function shuffleBoard() {
    if (shuffleCount <= 0) {
        console.log("⚠️ Hết lượt xáo hình!");
        return;
    }

    // 🔥 Trừ số lần shuffle NGAY KHI bấm nút, bất kể thành công hay không
    shuffleCount--; 
    updateShuffleButton();

    let visibleTiles = [];

    // ✅ Lấy tất cả các ô chưa bị ẩn
    for (let row = 1; row < boardSize.rows - 1; row++) {
        for (let col = 1; col < boardSize.cols - 1; col++) {
            let tile = board[row][col];
            if (!tile.hidden) {
                visibleTiles.push(tile);
            }
        }
    }

    if (visibleTiles.length < 2) {
        console.log("⚠️ Không đủ tiles để shuffle!");
        return;
    }

    let shuffled = false;
    let attempts = 0;

    while (!shuffled && attempts < 10) {
        attempts++;

        let images = visibleTiles.map(tile => tile.element.dataset.pairId);
        images.sort(() => Math.random() - 0.5);

        visibleTiles.forEach((tile, index) => {
            tile.element.innerHTML = "";
            let img = document.createElement("img");
            img.src = imageFolderPath + images[index];
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "contain";

            tile.element.appendChild(img);
            tile.element.dataset.pairId = images[index];
        });

        if (checkAnyValidMove()) {
            shuffled = true;
        }
    }

//    updateTilePositions();

    if (shuffled) {
        console.log(`✅ Shuffle thành công! Số lần shuffle còn lại: ${shuffleCount}`);
    } else {
        console.log("⚠️ Shuffle thất bại, không có đường đi hợp lệ sau 10 lần thử.");
    }
}

function checkPathOnly(tile1, tile2) {
    console.log("Checking possible path between", tile1, tile2);

    if (tile1 === tile2) return null;
    if (tile1.hidden || tile2.hidden) return null;
    if (tile1.element.dataset.pairId !== tile2.element.dataset.pairId) return null;

    // ✅ Nếu hai ô kề nhau, xem như có đường hợp lệ
    if ((Math.abs(tile1.x - tile2.x) === tileSize && tile1.y === tile2.y) || 
        (Math.abs(tile1.y - tile2.y) === tileSize && tile1.x === tile2.x)) {
        return true;
    }

    // ✅ Kiểm tra đường hợp lệ nhưng không vẽ line
    let path = getShortestPath(tile1, tile2);
    return path && path.length > 1;
}

function checkAnyValidMove() {
    let tiles = [];

    // ✅ Lấy tất cả các ô hợp lệ trên bảng
    for (let row = 1; row < boardSize.rows - 1; row++) {
        for (let col = 1; col < boardSize.cols - 1; col++) {
            let tile = board[row][col];
            if (!tile.hidden) {
                tiles.push(tile);
            }
        }
    }

    // ✅ Kiểm tra xem có cặp ô nào có thể nối hay không
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i].element.dataset.pairId === tiles[j].element.dataset.pairId) {
                if (checkPathOnly(tiles[i], tiles[j])) {
                    return true;
                }
            }
        }
    }

    return false;
}

document.getElementById("shuffle-button").addEventListener("click", shuffleBoard);

//Reset
function resetGame() {
    stopTimer();

    if (currentLevel === 0) { // Level 1: Reset về mặc định
        playerScore = 0;
        timeLeft = 120;
		loadLevel(0);
    } else { // Level Max: Giữ điểm của Level 1, reset thời gian về 0
        let savedScore = localStorage.getItem("savedScore");
        playerScore = savedScore ? parseInt(savedScore) : 0;
        timeElapsed = 0;
		loadLevel(1);
    }

    updateScoreUI();
    updateTimerUI();
    setTimeout(() => { // ✅ Đợi một chút để cập nhật layout trước khi gọi resize
        window.dispatchEvent(new Event("resize"));
    }, 50);
    startTimer();
}

document.getElementById("reset-button").addEventListener("click", resetGame);

