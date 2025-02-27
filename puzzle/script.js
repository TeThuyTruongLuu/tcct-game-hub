// Kích thước puzzle (có thể tùy chỉnh)
const puzzleWidth = 2100;  // Chiều rộng
const puzzleHeight = 1480; // Chiều cao
const rows = 4; // Số hàng
const cols = 4; // Số cột
const pieceWidth = puzzleWidth / cols;   // 525px
const pieceHeight = puzzleHeight / rows; // 370px

// Hình ảnh để làm puzzle
const imageUrl = "Puzzle1.jpeg"; // Đường dẫn mới // Thay bằng URL hình ảnh của bạn
const container = document.getElementById("puzzle-container");
let draggedPiece = null;
let dropZone = null;

// Tạo các mảnh ghép
function createPuzzle() {
    const pieces = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const piece = document.createElement("div");
            piece.classList.add("puzzle-piece");
            piece.style.width = `${pieceWidth}px`;
            piece.style.height = `${pieceHeight}px`;
            piece.style.backgroundImage = `url(${imageUrl})`;
            piece.style.backgroundPosition = `${-col * pieceWidth}px ${-row * pieceHeight}px`;
            piece.style.left = `${Math.random() * (puzzleWidth - pieceWidth)}px`; // Vị trí ngẫu nhiên
            piece.style.top = `${Math.random() * (puzzleHeight - pieceHeight)}px`;
            piece.dataset.row = row;
            piece.dataset.col = col;

            // Thêm kéo thả
            piece.setAttribute("draggable", true);
            piece.addEventListener("dragstart", dragStart);
            piece.addEventListener("dragover", dragOver);
            piece.addEventListener("drop", drop);
            piece.addEventListener("dragend", dragEnd);

            container.appendChild(piece);
            pieces.push(piece);
        }
    }
}

// Xử lý kéo thả
function dragStart(e) {
    draggedPiece = e.target;
    draggedPiece.style.opacity = "0.5";
    // Lưu vị trí ban đầu để quay lại nếu cần
    draggedPiece.dataset.initialLeft = draggedPiece.style.left;
    draggedPiece.dataset.initialTop = draggedPiece.style.top;
}

function dragOver(e) {
    e.preventDefault();
    // Xác định vùng thả (nếu có)
    const target = e.target.closest(".puzzle-piece");
    if (target && target !== draggedPiece) {
        dropZone = target;
        target.style.border = "2px dashed #00f"; // Đánh dấu vùng thả
    }
}

function drop(e) {
    e.preventDefault();
    if (dropZone && draggedPiece) {
        // Lấy vị trí của vùng thả
        const dropLeft = parseFloat(dropZone.style.left);
        const dropTop = parseFloat(dropZone.style.top);

        // Cập nhật vị trí của mảnh ghép bị kéo
        draggedPiece.style.left = `${dropLeft}px`;
        draggedPiece.style.top = `${dropTop}px`;

        // Đặt lại vị trí của mảnh ở vùng thả (nếu cần hoán đổi)
        dropZone.style.left = draggedPiece.dataset.initialLeft || "0px";
        dropZone.style.top = draggedPiece.dataset.initialTop || "0px";

        // Xóa đánh dấu vùng thả
        dropZone.style.border = "1px solid rgba(0, 0, 0, 0.1)";
        dropZone = null;
    }
    draggedPiece.style.opacity = "1";
    checkWin();
}

function dragEnd(e) {
    if (draggedPiece) {
        draggedPiece.style.opacity = "1";
        // Nếu không thả vào vùng hợp lệ, quay về vị trí ban đầu
        if (!dropZone) {
            draggedPiece.style.left = draggedPiece.dataset.initialLeft || "0px";
            draggedPiece.style.top = draggedPiece.dataset.initialTop || "0px";
        }
        draggedPiece = null;
        dropZone = null;
    }
}

// Kiểm tra xem puzzle đã hoàn thành chưa (giữ nguyên)
function checkWin() {
    const pieces = document.querySelectorAll(".puzzle-piece");
    let correct = true;
    pieces.forEach(piece => {
        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);
        const left = parseFloat(piece.style.left);
        const top = parseFloat(piece.style.top);
        const correctLeft = col * pieceWidth;
        const correctTop = row * pieceHeight;

        if (Math.abs(left - correctLeft) > 5 || Math.abs(top - correctTop) > 5) {
            correct = false;
        }
    });
    if (correct) {
        alert("Chúc mừng! Bạn đã hoàn thành puzzle!");
    }
}

// Khởi chạy game
createPuzzle();