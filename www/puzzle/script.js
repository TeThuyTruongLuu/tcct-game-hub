const rows = 7;
const cols = 10;
const totalPieces = rows * cols;
const hiddenPieces = 21; //21 câu hỏi

const puzzleBoard = document.getElementById("puzzle-board");
const topContainer = document.getElementById("top-container");
const leftContainer = document.getElementById("left-container");
const rightContainer = document.getElementById("right-container");

let draggedPiece = null;
let originalParent = null;
let placedPieces = 0;
let usedQuestions = new Set();


const questions = [
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



// Xáo trộn mảng bằng thuật toán Fisher-Yates
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createPuzzle() {
    let indices = Array.from({ length: totalPieces }, (_, i) => i);
    shuffleArray(indices);

    const hiddenIndexes = generateHiddenPieces();
	const isMobile = window.innerWidth <= 768;
	
    indices.forEach((i, index) => {
        const piece = document.createElement("div");
        piece.classList.add("puzzle-piece");
        piece.dataset.index = i;
        piece.style.backgroundImage = "url('Puzzle1.jpeg')";
				
		if (isMobile) {
			piece.style.backgroundSize = "95vw calc(95vw * 1480 / 2100)";
			
			const col = i % cols;
			const row = Math.floor(i / cols);

			const x = -(col * 9.5); // mỗi mảnh rộng 9.5vw
			const y = -(row * (1480 / 14700 * 95)); // mỗi mảnh cao ~9.56vw

			piece.style.backgroundPosition = `${x}vw ${y}vw`;
		} else {
			piece.style.backgroundSize = "525px 370px";
			piece.style.backgroundPosition = `${-(i % cols) * 52.5}px ${-Math.floor(i / cols) * 52.8}px`;
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

            // Đặt vị trí ngẫu nhiên để mảnh không bị đè lên nhau quá nhiều
            piece.style.position = "absolute";
            piece.style.left = `${Math.random() * 80}%`;
            piece.style.top = `${Math.random() * 50}%`;
			
			enableMobileDragging(piece);
        } else {
			if (index < 24) {
				topContainer.appendChild(piece);
			} else if (index < 47) {  // 24 -> 47 (23 mảnh)
				leftContainer.appendChild(piece);
			} else {  // (23 mảnh còn lại)
				rightContainer.appendChild(piece);
			}
        }
	});
	
    for (let i = 0; i < totalPieces; i++) {
        const slot = document.createElement("div");
        slot.classList.add("puzzle-slot");
        slot.dataset.index = i;
        slot.addEventListener("dragover", dragOver);
        slot.addEventListener("drop", drop);
        puzzleBoard.appendChild(slot);
    }
}

// Xử lý kéo thả
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
        let touch = e.touches[0];
        piece.dataset.offsetX = touch.clientX - piece.getBoundingClientRect().left;
        piece.dataset.offsetY = touch.clientY - piece.getBoundingClientRect().top;

        // Chuyển mảnh ra body
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

        // Tìm ô gần nhất
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
            // Gọi drop với ô gần nhất
            drop({ preventDefault: () => {}, target: closestSlot });
        } else {
            // Trả mảnh về vị trí ban đầu nếu không gần ô nào
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

            // Lock mảnh ghép
            draggedPiece.draggable = false;
            draggedPiece.style.cursor = "default";
            draggedPiece.style.position = "static";
            draggedPiece.removeEventListener("dragstart", dragStart);

            // Xóa sự kiện touch để lock trên mobile
            draggedPiece.removeEventListener("touchstart", enableMobileDragging);
            draggedPiece.removeEventListener("touchmove", enableMobileDragging);
            draggedPiece.removeEventListener("touchend", enableMobileDragging);

            placedPieces++;

            if (placedPieces === totalPieces) {
                setTimeout(() => alert("Hooray, xong tranh rồi :>  Bồ chờ tí để lưu điểm nhé."), 500);
                stopTimer();
                let finalScore = calculateScore();
                saveScoreToDB("Puzzle", finalScore.score);
                alert(`🎉 Chúc mừng! Ní đã hoàn thành trò chơi với số điểm: ${finalScore.score} trong ${finalScore.time}`);
            }
        } else {
            originalParent.appendChild(draggedPiece);
        }
    } else {
        originalParent.appendChild(draggedPiece);
    }

    draggedPiece = null;
}


// Chọn mảnh bị ẩn ngẫu nhiên
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
        questionIndex = Math.floor(Math.random() * questions.length);
    } while (usedQuestions.has(questionIndex) && usedQuestions.size < questions.length); 

    usedQuestions.add(questionIndex); // Đánh dấu câu đã dùng

    const question = questions[questionIndex];
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


function checkAnswer(index, selectedOriginalIndex, piece) {
    const question = questions[index % questions.length];
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

			// 👇 Thêm dòng này để xử lý mobile:
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


// Khởi chạy
createPuzzle();

let timer;
let timeElapsed = 0;
let timerRunning = false;
let timerInterval;

function startTimer() {
    if (!timerRunning) {
        timerRunning = true; // Đánh dấu bộ đếm đã chạy
        timer = setInterval(() => {
            timeElapsed++;
            document.getElementById("timer").textContent = `Thời gian chơi: ${timeElapsed} giây`;
        }, 1000);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
}

function calculateScore() {
    let score = Math.max(1800 - timeElapsed, 0);
	return { score: score, time: timeElapsed };
}

// Gọi `startTimer()` khi game bắt đầu
document.querySelectorAll(".puzzle-piece").forEach(piece => {
    piece.addEventListener("mousedown", () => startTimer(), { once: true });
    piece.addEventListener("touchstart", () => startTimer(), { once: true });
});
