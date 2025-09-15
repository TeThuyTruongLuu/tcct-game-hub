const rows = 7;
const cols = 10;
const totalPieces = rows * cols;
const hiddenPieces = 21;
let currentLevel = 1;
const levelImages = {
    1: { src: 'Puzzle1.jpeg', width: 525, height: 370 },
    2: { src: 'Puzzle2.png', width: 732, height: 405 }
};

const puzzleBoard = document.getElementById("puzzle-board");
const topContainer = document.getElementById("top-container");
const leftContainer = document.getElementById("left-container");
const rightContainer = document.getElementById("right-container");
const previewOverlay = document.getElementById("preview-overlay");

let draggedPiece = null;
let originalParent = null;
let placedPieces = 0;
let usedQuestions = new Set();
let levelScores = { 1: 0, 2: 0 };

const questionsLevel1 = [
    {
        question: "Ai dưới đây chưa từng chuyển nhượng?",
        options: ["Giang Ba Đào", "Hứa Bân", "Lý Tấn", "Cổ Thế Minh", "Đặng Phục Thăng"],
        correct: [2]
    },
    {
        question: "Lý Nghệ Bác là tuyển thủ ra mắt mùa mấy, thuộc chiến đội nào?",
        options: ["Mùa 1 - Bá Đồ", "Mùa 2 - Gia Thế", "Mùa 3 - Bá Đồ", "Mùa 2 - Hoàng Phong", "Mùa 3 - Hô Khiếu"],
        correct: [0]
    },
    {
        question: "Ai không có trong phòng khách sạn khi Diệp Tu giải thích tên giả - tên thật?",
        options: ["Phùng Hiến Quân", "Tào Quảng Thành", "Thường Tiên", "Ngụy Sâm"],
        correct: [1]
    },
    {
        question: "Lý Dịch Ninh từng là thành viên của chiến đội nào?",
        options: ["Yên Vũ", "Hạ Võ", "Lôi Đình", "Bách Hoa"],
        correct: [0]
    },
    {
        question: "Ai ba lần Liều Mình Một Hit đều thành công?",
        options: ["Lý Tấn", "Diệp Tu", "Dương Thông"],
        correct: [2]
    },
    {
        question: "Trương Ích Vỹ là cựu đội trưởng của chiến đội nào?",
        options: ["Tru Tiên", "Luân Hồi", "Vi Thảo", "Hoàng Phong"],
        correct: [1]
    },
    {
        question: "Ai không phải là phóng viên?",
        options: ["Thường Tiên", "Trình Tư Yên", "Thân Kiến", "Tào Quảng Thành"],
        correct: [2]
    },
    {
        question: "Điều nào sau đây không đúng?",
        options: [
            "Quý Lãnh giải nghệ ngay sau khi đạt MVP mùa 4",
            "Chu Quang Nghĩa không cầm theo acc Quý Lãnh khi chuyển nhượng sang Bách Hoa",
            "Quý Lãnh là thành viên Bá Đồ",
            "Quý Lãnh từng Liều Mình Một Hit giết Nhất Diệp Chi Thu thành công",
            "Acc Quý Lãnh trùng tên với người thật"
        ],
        correct: [1]
    },
    {
        question: "Kỹ năng nào không phải của Pháp Sư Nguyên Tố?",
        options: ["Liệt Diễm Xung Kích", "Bình Thủy Tinh Dung Nham", "Thiên Lôi Địa Hỏa"],
        correct: [1]
    },
    {
        question: "Acc nào là Ma Kiếm Sĩ?",
        options: ["Thiều Quang Hoán", "Vô Lãng", "Quỷ Khắc"],
        correct: [1]
    },
    {
        question: "Bạch Thứ hiện cầm acc tên gì tại 301?",
        options: ["Bough", "Bàn Sơn", "Triều Tịch"],
        correct: [2]
    },
    {
        question: "Ai không thuộc Thế hệ mới?",
        options: ["Mạnh Vĩnh Minh", "Phương Học Tài", "Tằng Thăng Hà", "Giả Hưng", "Vương Trạch"],
        correct: [1]
    },
    {
        question: "Ai không thuộc Thế hệ Hoàng kim?",
        options: ["Chu Trạch Khải", "Điền Sâm", "Hoàng Thiếu Thiên", "Sở Vân Tú", "Lý Diệc Huy"],
        correct: [0]
    },
    {
        question: "Thông tin nào sau đây sai về Triệu Dương?",
        options: [
            "Thuộc chiến đội Lâm Hải, có lên sân mùa 10",
            "Trúng cử đội hình ngôi sao 7 năm liên tục",
            "Chưa từng góp mặt ở vòng chung kết"
        ],
        correct: [0]
    },
    {
        question: "Mũi Tên Thiêu Đốt có lửa màu gì?",
        options: ["Đỏ", "Đen", "Tím", "Nâu", "Xanh"],
        correct: [1]
    },
    {
        question: "Lẩu 9 ngăn là đặc trưng của vùng nào?",
        options: ["Tô Châu", "Trùng Khánh", "Tây An"],
        correct: [1]
    },
    {
        question: "Chiến đội có biểu tượng ngọn lửa trong logo?",
        options: ["Hưng Hân", "Hô Khiếu", "Lôi Đình"],
        correct: [0]
    },
    {
        question: "Hạ Trọng Thiên là ai?",
        options: [
            "Bán trà dạo trên đường",
            "Thành viên Nghĩa Trảm",
            "Ông chủ Gia Thế",
            "Thành viên chiến đội Gia Thế"
        ],
        correct: [2]
    },
    {
        question: "Tác giả Toàn Chức Cao Thủ là?",
        options: ["Hồ Diệp Lam", "Hồ Điệp Lam", "Hu Di Lam"],
        correct: [1]
    },
    {
        question: "Ai là đội trưởng chiến đội Lam Vũ?",
        options: ["Dụ Văn Châu", "Chu Trạch Khải", "Tôn Triết Bình", "Diệp Tu"],
        correct: [0]
    }
];

const questionsLevel2 = [
    {
        question: "Đội tuyển quốc gia có tổng bao nhiêu người, không tính người dẫn đội?",
        options: ["12", "13", "14", "15", "16", "17"],
        correct: [1]
    },
    {
        question: "Diệp Tu có tổng cộng bao nhiêu thẻ tài khoản?",
        options: ["5", "6", "7", "8", "9"],
        correct: [3]
    },
    {
        question: "Ai là người không lên tuyển quốc gia?",
        options: ["Hàn Văn Thanh", "Sở Vân Tú", "Lý Hiên", "Phương Duệ"],
        correct: [0]
    },
    {
        question: "Trương Giai Lạc đạt MVP vào mùa giải thứ mấy?",
        options: ["4", "5", "6", "7"],
        correct: [1]
    },
    {
        question: "Vương Dụ gặp nhau lần đầu vào mùa mấy?",
        options: ["1", "2", "3"],
        correct: [1]
    },
    {
        question: "Trường hợp ID nào dưới đây đã bị bán chỉ để lấy trang bị cho một ID khác?",
        options: ["Hải Vô Lượng", "Bách Hoa Liễu Loạn", "Đại Mạc Cô Yên", "Áo Ướt Bay Loạn"],
        correct: [3]
    },
    {
        question: "Donghua Toàn chức cao thủ đã qua tay bao nhiêu nhà sản xuất?",
        options: ["1", "2", "3", "4", "5"],
        correct: [4]
    },
    {
        question: "Đội trưởng đội tuyển quốc gia là ai?",
        options: [
            "Vương Kiệt Hi",
            "Trương Tân Kiệt",
            "Dụ Văn Châu",
            "Hàn Văn Thanh",
            "Diệp Tu"
        ],
        correct: [2]
    },
    {
        question: "Lộ trình chuyển nghề 3 lần của Phương Duệ không theo thứ tự nào sau đây?",
        options: [
			"Khí công sư -> lưu manh -> đạo tặc -> khí công sư",
			"Khí công sư -> đạo tặc -> lưu manh -> khí công sư",
			"Lam Vũ -> trại huấn luyện Hô Khiếu -> chiến đội Hô Khiếu -> Hưng Hân",
		],
        correct: [1]
    },
    {
        question: "Máy chủ 10 của Vinh Quang mở cửa vào năm nào?",
        options: ["2021", "2022", "2023"],
        correct: [1]
    },
    {
        question: "Tôn Triết Bình giải nghệ ở mùa giải nào?",
        options: ["Mùa 2", "Mùa 3", "Mùa 4", "Mùa 5"],
        correct: [3]
    },
    {
        question: "Mùa giải thứ 7, ai là người mới tốt nhất?",
        options: ["Tôn Tường", "Đường Hạo", "Lưu Tiểu Biệt", "Vu Phong"],
        correct: [0]
    },
    {
        question: "Ai dưới đây thuộc cung Bảo Bình?",
        options: ["An Văn Dật", "Bạch Ngôn Phi", "Lư Hãn Văn", "Bánh Bao", "Phương Thế Kính"],
        correct: [3]
    },
    {
        question: "Thông tin nào sau đây sai về Ngụy Sâm?",
        options: [
            "Là đội trưởng đầu tiên của Lam Vũ",
            "Chơi nghề Thuật Sĩ",
            "Giải nghệ sau mùa 3",
			"Sáng lập công hội Lam Khê Các"
        ],
        correct: [2]
    },
    {
        question: "Kỹ năng nào sau đây không giúp nhân vật bay lên?",
        options: ["Chong Chóng Máy", "Đôi Cánh Thiên Sứ", "Gió Cuốn Mây Bay", "Điều Khiển Chổi"],
        correct: [2]
    },
    {
        question: "Hư Không lọt top 8 bao nhiêu lần trong tổng 9 mùa giải?",
        options: ["6", "7", "8", "9"],
        correct: [1]
    },
    {
        question: "Trung tâm thể thao Olympic Nam Kinh là sân nhà của chiến đội nào?",
        options: ["Hô Khiếu", "Lôi Đình", "Ba Lẻ Một", "Nghĩa Trảm"],
        correct: [0]
    },
    {
        question: "Tên acc của ai sau đây không có bốn chữ?",
        options: [
            "Lý Hoa",
            "Điền Sâm",
            "Ngô Tuyết Phong",
            "Lữ Bạc Viễn"
        ],
        correct: [3]
    },
    {
        question: "'2025, hẹn gặp nhau ở Zurich' đề cập đến sự kiện nào diễn ra năm nay?",
        options: ["Giải Vinh Quang Thế giới", "Ngày kết thúc truyện", "Đến lúc xách vali lên và đi rồi"],
        correct: [0]
    },
    {
        question: "Mỗi mùa giải sẽ có tổng cộng bao nhiêu đội tham gia?",
        options: ["8", "16", "18", "20"],
        correct: [3]
    }
];

const questions = {
    1: questionsLevel1,
    2: questionsLevel2
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createPuzzle() {
    puzzleBoard.innerHTML = "<div class='preview-overlay' id='preview-overlay'></div>";
    const previewOverlay = document.getElementById("preview-overlay");

    topContainer.innerHTML = "";
    leftContainer.innerHTML = "";
    rightContainer.innerHTML = "";
    placedPieces = 0;
    usedQuestions.clear();
    puzzleBoard.className = "puzzle-board" + (currentLevel === 2 ? " level-2" : "");

    previewOverlay.style.backgroundImage = `url('${levelImages[currentLevel].src}')`;
    previewOverlay.style.backgroundSize = "cover"; // hoặc contain tùy ý

    let indices = Array.from({ length: totalPieces }, (_, i) => i);
    shuffleArray(indices);

    const hiddenIndexes = generateHiddenPieces();
    const isMobile = window.innerWidth <= 768;
    const levelImage = levelImages[currentLevel];
    const pieceWidth = isMobile ? 9.5 : (levelImage.width / cols);
    const pieceHeight = isMobile ? (95 * levelImage.height / levelImage.width / rows) : (levelImage.height / rows);

    indices.forEach((i, index) => {
        const piece = document.createElement("div");
        piece.classList.add("puzzle-piece");
        if (currentLevel === 2) piece.classList.add("level-2");
        piece.dataset.index = i;
        piece.style.backgroundImage = `url('${levelImage.src}')`;

        if (isMobile) {
            piece.style.backgroundSize = `95vw calc(95vw * ${levelImage.height} / ${levelImage.width})`;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = -(col * (95 / cols));
            const y = -(row * (95 * levelImage.height / levelImage.width / rows));
            piece.style.backgroundPosition = `${x}vw ${y}vw`;
        } else {
            piece.style.backgroundSize = `${levelImage.width}px ${levelImage.height}px`;
            piece.style.backgroundPosition = `${-(i % cols) * (levelImage.width / cols)}px ${-Math.floor(i / cols) * (levelImage.height / rows)}px`;
        }

        if (hiddenIndexes.includes(i)) {
            piece.classList.add("hidden-piece");
            const clickHandler = () => showQuestion(i, piece);
            piece._clickToShowQuestion = clickHandler;
            piece.addEventListener("click", clickHandler);
        } else {
            piece.draggable = true;
            piece.addEventListener("dragstart", dragStart);
        }

        if (isMobile) {
            topContainer.appendChild(piece);
            piece.style.position = "absolute";
            piece.style.left = `${Math.random() * 80}%`;
            piece.style.top = `${Math.random() * 50}%`;
            enableMobileDragging(piece);
        } else {
            if (index < 24) {
                topContainer.appendChild(piece);
            } else if (index < 47) {
                leftContainer.appendChild(piece);
            } else {
                rightContainer.appendChild(piece);
            }
        }
    });

    for (let i = 0; i < totalPieces; i++) {
        const slot = document.createElement("div");
        slot.classList.add("puzzle-slot");
        if (currentLevel === 2) slot.classList.add("level-2");
        slot.dataset.index = i;
        slot.addEventListener("dragover", dragOver);
        slot.addEventListener("drop", drop);
        puzzleBoard.appendChild(slot);
    }
}

function dragStart(e) {
    draggedPiece = e.target;
    originalParent = draggedPiece.parentNode;
}

function dragOver(e) {
    e.preventDefault();
}

function enableMobileDragging(piece) {
    if (piece.classList.contains("hidden-piece")) return;

    piece.addEventListener("touchstart", function (e) {
        if (piece.parentElement.classList.contains("puzzle-slot")) return;
		e.preventDefault();
        let touch = e.touches[0];
        piece.dataset.offsetX = touch.clientX - piece.getBoundingClientRect().left;
        piece.dataset.offsetY = touch.clientY - piece.getBoundingClientRect().top;

        document.body.appendChild(piece);
        piece.style.position = "fixed";
        piece.style.zIndex = "1000";

        draggedPiece = piece;
        originalParent = piece.parentNode;
    });

    piece.addEventListener("touchmove", function (e) {
        if (piece.parentElement.classList.contains("puzzle-slot")) return;
        e.preventDefault();
        let touch = e.touches[0];

        let offsetX = parseFloat(piece.dataset.offsetX);
        let offsetY = parseFloat(piece.dataset.offsetY);

        piece.style.left = `${touch.clientX - offsetX}px`;
        piece.style.top = `${touch.clientY - offsetY}px`;
    });

    piece.addEventListener("touchend", function (e) {
        if (!draggedPiece) return;

        let touch = e.changedTouches[0];
        let pieceRect = draggedPiece.getBoundingClientRect();
        let pieceCenterX = pieceRect.left + pieceRect.width / 2;
        let pieceCenterY = pieceRect.top + pieceRect.height / 2;

        let slots = document.querySelectorAll(".puzzle-slot");
        let closestSlot = null;
        let minDistance = Infinity;

        slots.forEach(slot => {
            let slotRect = slot.getBoundingClientRect();
            let slotCenterX = slotRect.left + slotRect.width / 2;
            let slotCenterY = slotRect.top + slotRect.height / 2;

            let distance = Math.sqrt(
                Math.pow(pieceCenterX - slotCenterX, 2) + 
                Math.pow(pieceCenterY - slotCenterY, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestSlot = slot;
            }
        });

        if (closestSlot) {
            drop({ preventDefault: () => {}, target: closestSlot });
        } else {
            originalParent.appendChild(draggedPiece);
            draggedPiece.style.position = "absolute";
            draggedPiece.style.left = `${touch.clientX - piece.dataset.offsetX}px`;
            draggedPiece.style.top = `${touch.clientY - piece.dataset.offsetY}px`;
        }

        draggedPiece = null;
    });
}

function drop(e) {
    e.preventDefault();

    if (!draggedPiece) return;

    let target = e.target.classList.contains("puzzle-slot") ? e.target : e.target;

    if (target.classList.contains("puzzle-slot")) {
        let correctIndex = parseInt(target.dataset.index);
        let pieceIndex = parseInt(draggedPiece.dataset.index);

        if (correctIndex === pieceIndex) {
            target.appendChild(draggedPiece);

            draggedPiece.draggable = false;
            draggedPiece.style.cursor = "default";
            draggedPiece.style.position = "static";
            draggedPiece.removeEventListener("dragstart", dragStart);

            draggedPiece.removeEventListener("touchstart", enableMobileDragging);
            draggedPiece.removeEventListener("touchmove", enableMobileDragging);
            draggedPiece.removeEventListener("touchend", enableMobileDragging);

            placedPieces++;

            if (placedPieces === totalPieces) {
                stopTimer();
                let levelScore = calculateScore();
                levelScores[currentLevel] = levelScore.score;

                if (currentLevel === 1) {
					localStorage.setItem("puzzleLevel1Done", "true");
					localStorage.setItem("puzzleLevel1Score", levelScore.score);
                    setTimeout(() => {
                        alert(`Hooray, xong level 1 rồi :> Điểm level 1: ${levelScore.score} trong ${levelScore.time} giây. Tiến tới level 2!`);
                        nextLevel();
                    }, 500);
                } else {
                    let totalScore = levelScores[1] + levelScores[2];
                    setTimeout(() => {
                        alert(`🎉 Chúc mừng! Ní đã hoàn thành trò chơi với số điểm: Level 1: ${levelScores[1]}, Level 2: ${levelScores[2]}, Tổng điểm: ${totalScore} trong ${levelScore.time} giây`);
                        saveScoreToDB("Puzzle", totalScore);
                    }, 500);
                }
            }
        } else {
            originalParent.appendChild(draggedPiece);
        }
    } else {
        originalParent.appendChild(draggedPiece);
    }

    draggedPiece = null;
}

function nextLevel() {
    currentLevel = 2;
    timeElapsed = 0;
    timerRunning = false;
    clearInterval(timer);
    document.getElementById("timer").textContent = `Thời gian chơi: 0 giây`;
    document.getElementById("question-container").style.display = "none";
    document.getElementById("question-text").textContent = "Chọn một mảnh ghép để bắt đầu giải câu hỏi!";
    document.getElementById("options").innerHTML = "";
    createPuzzle();
    const previewOverlay = document.getElementById("preview-overlay");
    previewOverlay.style.display = "block";
    document.querySelectorAll(".puzzle-piece").forEach(piece => {
        piece.addEventListener("mousedown", () => startTimer(), { once: true });
        piece.addEventListener("touchstart", () => startTimer(), { once: true });
    });
}

function generateHiddenPieces() {
    const indexes = [];
    while (indexes.length < hiddenPieces) {
        let rand = Math.floor(Math.random() * totalPieces);
        if (!indexes.includes(rand)) indexes.push(rand);
    }
    return indexes;
}

function showQuestion(index, piece) {
    const questionContainer = document.getElementById("question-container");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options");

    let questionIndex;
    do {
        questionIndex = Math.floor(Math.random() * questions[currentLevel].length);
    } while (usedQuestions.has(questionIndex) && usedQuestions.size < questions[currentLevel].length); 

    usedQuestions.add(questionIndex);

    const question = questions[currentLevel][questionIndex];
    questionText.textContent = question.question;
    optionsContainer.innerHTML = "";

    let shuffledOptions = question.options.map((option, i) => ({ option, originalIndex: i }));
    shuffleArray(shuffledOptions);

    questionContainer.dataset.correctIndexes = JSON.stringify(question.correct);

    shuffledOptions.forEach(({ option, originalIndex }, btnIndex) => {
        const button = document.createElement("button");
        button.textContent = option;
        button.dataset.originalIndex = originalIndex;
        button.onclick = () => checkAnswer(questionIndex, originalIndex, piece);
        optionsContainer.appendChild(button);
    });

    questionContainer.style.display = "block";
}

function resetProgress() {
    localStorage.removeItem("puzzleLevel1Done");
    location.reload();
}

function checkAnswer(index, selectedOriginalIndex, piece) {
    const question = questions[currentLevel][index % questions[currentLevel].length];
    const correctAnswers = question.correct;

    const buttons = document.querySelectorAll(".question-container button");

    if (correctAnswers.includes(selectedOriginalIndex)) {
        buttons.forEach(button => {
            if (parseInt(button.dataset.originalIndex) === selectedOriginalIndex) {
                button.classList.add("correct");
            }
        });

        setTimeout(() => {
            piece.classList.remove("hidden-piece");
            piece.draggable = true;
            piece.removeEventListener("click", piece._clickToShowQuestion);
            piece.addEventListener("dragstart", dragStart);

            if (window.innerWidth <= 768) {
                enableMobileDragging(piece);
            }

            document.getElementById("question-text").textContent = "🎉 Chính xác! Bạn đã mở khóa mảnh ghép này!";
            document.getElementById("options").innerHTML = "";
        }, 1000);
    } else {
        buttons.forEach(button => {
            if (parseInt(button.dataset.originalIndex) === selectedOriginalIndex) {
                button.classList.add("wrong");
            }
        });

        setTimeout(() => {
            buttons.forEach(button => button.classList.remove("wrong"));
        }, 1000);
    }
}

const doneLv1 = localStorage.getItem("puzzleLevel1Done") === "true";
const scoreLv1 = parseInt(localStorage.getItem("puzzleLevel1Score") || "0");
if (doneLv1 && scoreLv1 > 0) {
    currentLevel = 2;
}
createPuzzle();

document.getElementById("reset-btn").addEventListener("click", () => {
    localStorage.removeItem("puzzleLevel1Done");
    localStorage.removeItem("puzzleLevel1Score");
    location.reload();
});

let timer;
let timeElapsed = 0;
let timerRunning = false;

function startTimer() {
    if (!timerRunning) {
        timerRunning = true;
        timer = setInterval(() => {
            timeElapsed++;
            document.getElementById("timer").textContent = `Thời gian chơi: ${timeElapsed} giây`;
        }, 1000);
        clearTimeout(window.previewTimeout);
        window.previewTimeout = setTimeout(() => {
            document.getElementById("preview-overlay").style.display = "none";
        }, 30000);
    }
}

function stopTimer() {
    clearInterval(timer);
}

function calculateScore() {
    let score = Math.max(1000 - timeElapsed, 0);
    return { score: score, time: timeElapsed };
}

document.querySelectorAll(".puzzle-piece").forEach(piece => {
    piece.addEventListener("mousedown", () => startTimer(), { once: true });
    piece.addEventListener("touchstart", () => startTimer(), { once: true });
});