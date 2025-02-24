const characterImages = {}; // Lưu hình gán cho các giá trị tile
const tileValues = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const gridSize = 5;
let grid = [];
let timer = 0; // Biến đếm thời gian
let timerInterval; // Biến lưu interval để dừng/khởi động timer
let timerStarted = false;
let draggedImage = null;
let touchStartX = 0; // Tọa độ X khi bắt đầu vuốt
let touchStartY = 0; // Tọa độ Y khi bắt đầu vuốt
let touchEndX = 0; // Tọa độ X khi kết thúc vuốt
let touchEndY = 0; // Tọa độ Y khi kết thúc vuốt

// Biến lưu trạng thái
let youtubePlayer; // Player YouTube
let youtubeReady = false;
let currentMusicSource = null; // Trạng thái nguồn nhạc (YouTube)



function onYouTubeIframeAPIReady() {
    youtubePlayer = new YT.Player("youtubePlayer", {
        height: "0",
        width: "0",
        events: {
            onReady: function () {
                youtubeReady = true;
                console.log("YouTube Player is ready.");
            },
            onStateChange: function (event) {
                if (event.data === YT.PlayerState.ENDED) {
                    console.log("YouTube music has ended.");
                }
            }
        }
    });
}

function checkYouTubeAPI(callback) {
    if (youtubeReady) {
        callback();
    } else {
        console.log("YouTube Player chưa sẵn sàng, chờ đợi...");
        setTimeout(() => checkYouTubeAPI(callback), 1000); // Kiểm tra lại mỗi giây
    }
}




// Hàm tách video ID từ URL YouTube
function extractYouTubeVideoID(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
}

// Hàm xử lý chọn nhạc từ dropdown
function handleMusicSelection() {
    const dropdown = document.getElementById("musicDropdown");
    const youtubeInputContainer = document.getElementById("youtubeInputContainer");
    const selectedMusic = dropdown.value;

    if (selectedMusic === "custom") {
        youtubeInputContainer.style.display = "block"; // Hiển thị ô nhập URL
    } else {
        youtubeInputContainer.style.display = "none"; // Ẩn ô nhập URL
        const videoId = extractYouTubeVideoID(selectedMusic);
        videoId ? playYouTubeMusic(videoId) : alert("URL YouTube không hợp lệ.");
    }
}

// Hàm xử lý khi người dùng nhập URL YouTube
function handleCustomMusic() {
    const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
    const videoId = extractYouTubeVideoID(youtubeUrl);

    if (videoId) {
        playYouTubeMusic(videoId);
    } else {
        alert("URL YouTube không hợp lệ. Vui lòng thử lại.");
    }
}


function playYouTubeMusic(videoId) {
    checkYouTubeAPI(() => {
        if (youtubePlayer && typeof youtubePlayer.loadVideoById === "function") {
            stopMusic();
            youtubePlayer.loadVideoById({ videoId, startSeconds: 0 });
            youtubePlayer.playVideo();
			currentMusicSource = "youtube";
            console.log(`Playing music from YouTube video ID: ${videoId}`);
        } else {
            alert("YouTube Player chưa sẵn sàng. Refresh lại trang.");
        }
    });
}


// Hàm dừng nhạc
function stopMusic() {
    if (youtubePlayer && typeof youtubePlayer.stopVideo === "function") {
        youtubePlayer.stopVideo();
    }
    currentMusicSource = null;
    console.log("Music stopped.");
}

// Hàm tạm dừng nhạc
function pauseMusic() {
    if (currentMusicSource === "youtube" && youtubePlayer) {
        youtubePlayer.pauseVideo();
        console.log("YouTube music paused.");
    } else {
        console.log("No music is playing.");
    }
}



// Dừng nhạc khi người chơi thua
function checkGameOver() {
    if (!canMove()) {
        stopTimer();
        stopMusic(); // Dừng nhạc khi thua
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        alert(`Tèo, tư bản chiếu tướng bồ rồi sau ${formatTime(minutes)}:${formatTime(seconds)}.`);
        restartGame();
    }
}





// Chọn nhân vật
document.querySelectorAll(".character").forEach((character) => {
    character.addEventListener("click", () => {
        const charId = character.dataset.id;
        loadCharacterTiles(charId);
        document.getElementById("character-selection").style.display = "none";
        document.getElementById("tile-assignment").style.display = "block";
    });
});

// Load ảnh các tile cho nhân vật
function loadCharacterTiles(charId) {
    const container = document.getElementById("character-tiles");
    container.innerHTML = "";
	const totalImages = 8;
    for (let i = 1; i <= totalImages; i++) {
        const img = document.createElement("img");
        img.src = `images/${charId} (${i}).png`;
        img.draggable = true;
        img.dataset.charId = charId;
        img.dataset.tileIndex = i;

        img.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("tileIndex", img.dataset.tileIndex);
            e.dataTransfer.setData("charId", img.dataset.charId);
        });

        container.appendChild(img);
    }
}

document.querySelectorAll("#character-tiles img").forEach((img) => {
    // Sự kiện chuột (desktop)
    img.addEventListener("dragstart", (e) => {
        draggedImage = e.target; // Lưu hình ảnh đang kéo
    });

    // Sự kiện cảm ứng (điện thoại)
    img.addEventListener("touchstart", (e) => {
        e.preventDefault(); // Ngăn hành vi mặc định
        draggedImage = e.target; // Lưu hình ảnh đang kéo
    });
});


// Kéo thả hình ảnh vào tiles
document.querySelectorAll(".tile-slot").forEach((slot) => {
    slot.addEventListener("dragover", (e) => e.preventDefault());
    slot.addEventListener("drop", (e) => {
        e.preventDefault();
        const tileIndex = e.dataTransfer.getData("tileIndex");
        const charId = e.dataTransfer.getData("charId");
        const tileValue = slot.dataset.value;

        // Gán ảnh
        slot.innerHTML = `<img src="images/${charId} (${tileIndex}).png" alt="Tile">`;
        characterImages[tileValue] = `images/${charId} (${tileIndex}).png`;
    });
    slot.addEventListener("touchend", (e) => {
        if (draggedImage) {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            // Kiểm tra nếu vị trí thả nằm trong slot
            const slotRect = slot.getBoundingClientRect();
            if (
                touchEndX >= slotRect.left &&
                touchEndX <= slotRect.right &&
                touchEndY >= slotRect.top &&
                touchEndY <= slotRect.bottom
            ) {
                slot.innerHTML = ""; // Xóa nội dung cũ
                const imgClone = draggedImage.cloneNode(true); // Tạo bản sao hình ảnh
                imgClone.style.width = "100%";
                imgClone.style.height = "100%";
                imgClone.style.objectFit = "cover";
                slot.appendChild(imgClone);

                // Gán hình ảnh vào slot
                const tileValue = slot.dataset.value;
                characterImages[tileValue] = draggedImage.src;

                draggedImage = null; // Reset hình ảnh kéo
            }
        }
    });
});

// Bắt đầu game
document.getElementById("confirm-selection").addEventListener("click", () => {
    document.getElementById("tile-assignment").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    createBoard();
    renderBoard();
});

// Tạo bảng game
function createBoard() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = "";
    grid = Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(0));

    for (let i = 0; i < gridSize * gridSize; i++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.innerHTML = `
            <img src="" alt="Tile">
            <div class="tile-overlay"></div>
            <div class="tile-text"></div>
        `;
        gameBoard.appendChild(tile);
    }

    addRandomTile();
    addRandomTile();
}

const gameBoard = document.getElementById("game-board");

gameBoard.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX; // Lưu tọa độ X khi bắt đầu vuốt
    touchStartY = e.touches[0].clientY; // Lưu tọa độ Y khi bắt đầu vuốt
});

// Khi người chơi kết thúc vuốt
gameBoard.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].clientX; // Lưu tọa độ X khi kết thúc vuốt
    touchEndY = e.changedTouches[0].clientY; // Lưu tọa độ Y khi kết thúc vuốt

    handleSwipe(); // Xử lý hướng vuốt
});

// Hiển thị bảng game
function renderBoard() {
    const tiles = document.querySelectorAll(".tile");
    let index = 0;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const value = grid[i][j];
            const tile = tiles[index];
            const img = tile.querySelector("img");
            const overlay = tile.querySelector(".tile-overlay");
            const text = tile.querySelector(".tile-text");

            // Hiển thị hình ảnh nếu value > 0, nếu không thì ẩn ảnh
            if (value > 0 && characterImages[value]) {
                img.src = characterImages[value];
                img.style.display = "block"; // Hiển thị ảnh
            } else {
                img.src = ""; // Xóa đường dẫn ảnh
                img.style.display = "none"; // Ẩn ảnh
            }

            // Hiển thị overlay
            overlay.style.backgroundColor = value > 0 ? getTileColor(value) : "transparent";

            // Hiển thị chữ
            text.textContent = value > 0 ? tileNames[value] : "";

            index++;
        }
    }
}



// Thêm ô mới
function addRandomTile() {
    const emptyTiles = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j] === 0) {
                emptyTiles.push({ x: i, y: j });
            }
        }
    }

    if (emptyTiles.length > 0) {
        const { x, y } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        grid[x][y] = Math.random() < 0.8 ? 2 : 4; // 80% là 2, 20% là 4
        return true; // Thêm thành công
    }

    return false; // Không thêm được tile mới
}



const tileNames = {
    2: "Mới tỉnh",
    4: "Ra khỏi nhà",
    8: "Đi làm",
    16: "Vào họp",
    32: "Sếp mắng",
    64: "Hóng drama",
    128: "Sếp hỏi task",
    256: "Sếp nhắn tin",
    512: "Lương tới",
    1024: "Về nhà",
    2048: "Đi ngủ"
};



// Màu sắc dựa trên giá trị ô
function getTileColor(value) {
    const colors = {
        0: "#cdc1b4",
        2: "#eee4da",
        4: "#ede0c8",
        8: "#f2b179",
        16: "#f59563",
        32: "#f67c5f",
        64: "#f65e3b",
        128: "#edcf72",
        256: "#edcc61",
        512: "#edc850",
        1024: "#edc53f",
        2048: "#edc22e",
    };
    return colors[value] || "#3c3a32";
}

// Khởi động lại game
function restartGame() {
    stopTimer(); // Dừng timer hiện tại
    timerStarted = false; // Đặt lại trạng thái để khởi động timer khi di chuyển lần đầu
    document.getElementById("timer").textContent = "Thời gian bị bào: 00:00"; // Hiển thị mặc định
    createBoard(); // Reset bảng chơi
    renderBoard(); // Hiển thị lại bảng
}



// Đếm thời gian
function startTimer() {
    const timerElement = document.getElementById("timer");
    timer = 0; // Reset lại thời gian
    if (timerInterval) clearInterval(timerInterval); // Đảm bảo không có interval cũ đang chạy
	
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timerElement.textContent = `Thời gian bị bào: ${formatTime(minutes)}:${formatTime(seconds)}`;


    timerInterval = setInterval(() => {
        timer++;
        const minutes = Math.floor(timer / 60); // Tính số phút
        const seconds = timer % 60; // Tính số giây còn lại
        timerElement.textContent = `Thời gian bị bào: ${formatTime(minutes)}:${formatTime(seconds)}`; // Hiển thị thời gian
    }, 1000);
}

// Hàm định dạng thời gian
function formatTime(value) {
    return value < 10 ? `0${value}` : value; // Thêm số 0 nếu giá trị < 10
}


function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval); // Xóa interval
        timerInterval = null; // Đặt lại biến
    }
}

function handleSwipe() {
    const deltaX = touchEndX - touchStartX; // Khoảng cách vuốt theo trục X
    const deltaY = touchEndY - touchStartY; // Khoảng cách vuốt theo trục Y

    // Kiểm tra vuốt ngang hay dọc
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 50) {
            move("right"); // Vuốt sang phải
        } else if (deltaX < -50) {
            move("left"); // Vuốt sang trái
        }
    } else {
        if (deltaY > 50) {
            move("down"); // Vuốt xuống
        } else if (deltaY < -50) {
            move("up"); // Vuốt lên
        }
    }
}


// Xử lý nút di chuyển
function move(direction) {
    // Logic di chuyển (thêm sau)
    addRandomTile();
    renderBoard();
}

// Lắng nghe sự kiện bàn phím
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") move("left");
    else if (e.key === "ArrowRight") move("right");
    else if (e.key === "ArrowUp") move("up");
    else if (e.key === "ArrowDown") move("down");
});

document.addEventListener("keydown", function (event) {
    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (arrowKeys.includes(event.key)) {
        event.preventDefault(); // Ngăn hành vi mặc định của trình duyệt
    }
});


// Lắng nghe nút Restart
document.getElementById("restart-button").addEventListener("click", restartGame);

// Bắt đầu game
createBoard();

// Di chuyển ô theo hướng
function move(direction) {
    let moved = false;
    if (!timerStarted) {
        timerStarted = true;
        startTimer();
    }

    if (direction === "left") {
        for (let row = 0; row < gridSize; row++) {
            let newRow = compressAndMerge(grid[row]); // Gộp ô sang trái
            grid[row] = newRow;
            moved = true;
        }
    } else if (direction === "right") {
        for (let row = 0; row < gridSize; row++) {
            let reversedRow = grid[row].slice().reverse();
            let newRow = compressAndMerge(reversedRow).reverse(); // Gộp ô sang phải
            grid[row] = newRow;
            moved = true;
        }
    } else if (direction === "up") {
        for (let col = 0; col < gridSize; col++) {
            let column = getColumn(grid, col);
            let newCol = compressAndMerge(column); // Gộp ô lên trên
            setColumn(grid, col, newCol);
            moved = true;
        }
    } else if (direction === "down") {
        for (let col = 0; col < gridSize; col++) {
            let column = getColumn(grid, col).reverse();
            let newCol = compressAndMerge(column).reverse(); // Gộp ô xuống dưới
            setColumn(grid, col, newCol);
            moved = true;
        }
    }

    if (moved) {
        addRandomTile(); // Thêm ô mới trước
        renderBoard();

        // **Kiểm tra chiến thắng ngay lập tức**
        if (checkWin()) {
            return;
        }

        // Kiểm tra Game Over sau khi ô mới được hiển thị
        setTimeout(() => {
            if (!canMove()) {
                checkGameOver();
            }
        }, 100); // Chờ để ô mới được hiển thị
    }
}


// Lấy cột từ lưới
function getColumn(grid, colIndex) {
    return grid.map((row) => row[colIndex]);
}

// Gán giá trị cho cột
function setColumn(grid, colIndex, newCol) {
    for (let row = 0; row < gridSize; row++) {
        grid[row][colIndex] = newCol[row];
    }
}

// Gộp và nén ô trong một dòng/cột
function compressAndMerge(line) {
    let compressed = line.filter((num) => num !== 0); // Loại bỏ ô trống
    for (let i = 0; i < compressed.length - 1; i++) {
        if (compressed[i] === compressed[i + 1]) {
            compressed[i] *= 2; // Gộp ô
            compressed[i + 1] = 0; // Ô tiếp theo thành trống
        }
    }
    compressed = compressed.filter((num) => num !== 0); // Loại bỏ ô trống sau khi gộp
    while (compressed.length < gridSize) compressed.push(0); // Bổ sung ô trống
    return compressed;
}

// Kiểm tra điều kiện thắng/thua
function checkGameOver() {
    // Kiểm tra còn ô trống hay không
    for (let i = 0; i < gridSize.rows; i++) {
        for (let j = 0; j < gridSize.cols; j++) {
            if (grid[i][j] === 0) return false; // Còn ô trống, không thua
        }
    }

    // Kiểm tra có thể gộp ô không
    for (let i = 0; i < gridSize.rows; i++) {
        for (let j = 0; j < gridSize.cols; j++) {
            if (j < gridSize.cols - 1 && grid[i][j] === grid[i][j + 1]) return false; // Gộp ngang
            if (i < gridSize.rows - 1 && grid[i][j] === grid[i + 1][j]) return false; // Gộp dọc
        }
    }
	
    // Kiểm tra có ô nào đạt 2048 không
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === 2048) {
				stopTimer();
				const minutes = Math.floor(timer / 60);
				const seconds = timer % 60;
                alert(`Hooray! Chúc mừng bồ tu thành chính quả 2048 vẻ mặt sau ${formatTime(minutes)}:${formatTime(seconds)} bị bào mòn bởi tư bản!`);
                restartGame();
                return;
            }
        }
    }

    // Kiểm tra còn nước đi nào không
    if (!canMove()) {
		stopTimer();
		stopMusic();
		const minutes = Math.floor(timer / 60);
		const seconds = timer % 60;
        alert("Tèo, tư bản chiếu tướng bồ rồi.");
        restartGame();
    }
}


// Kiểm tra có thể di chuyển được không
function canMove() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === 0) return true; // Còn ô trống
            if (col < gridSize - 1 && grid[row][col] === grid[row][col + 1]) return true; // Có thể gộp ngang
            if (row < gridSize - 1 && grid[row][col] === grid[row + 1][col]) return true; // Có thể gộp dọc
        }
    }
    return false; // Không còn nước đi
}

function checkWin() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === 2048) {  // Ô giá trị cao nhất
                stopTimer();
                alert(`🎉 Hooray! Chúc mừng bồ tu thành chính quả 2048 vẻ mặt sau ${formatTime(Math.floor(timer / 60))}:${formatTime(timer % 60)} bị bào mòn bởi tư bản!`);
                restartGame();
                return true;
            }
        }
    }
    return false;
}
