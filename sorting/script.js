const gameBoard = document.getElementById("gameBoard");

// 📝 Danh sách nhân vật
const characterList = ["Du", "Khuu", "Lac", "Vuong"];
let shelves = [];

// 🛒 Khởi tạo danh sách items
function createItems() {
    let items = [];
    characterList.forEach(type => {
		for (let i = 1; i <= 6; i++) { // Thay vì 8
			items.push(`${type} (${i})`);
		}
    });

    // Xáo trộn danh sách
    items = items.sort(() => Math.random() - 0.5);
    return items;
}

// 🏗️ Tạo 15 kệ hàng
function createShelves() {
    gameBoard.innerHTML = "";
    shelves = Array(15).fill().map(() => []);

    let items = createItems();
    let index = 0;

    // Hàm kiểm tra xem kệ đã có 2 item cùng loại chưa
    function canAddItemToShelf(shelf, itemType) {
        const typePrefix = itemType.split(" ")[0]; // Lấy phần "Du", "Khuu", "Lac", "Vuong"
        const sameTypeCount = shelf.filter(item => item && item.split(" ")[0] === typePrefix).length;
        return sameTypeCount < 2; // Chỉ cho phép tối đa 2 item cùng loại
    }

    // Tạo 14 kệ đầy 3 item
    for (let i = 0; i < 14; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);

        // Thêm 3 item vào kệ
        let itemsAdded = 0;
        while (itemsAdded < 3 && index < items.length) {
            let itemType = items[index];
            if (canAddItemToShelf(shelves[i], itemType)) {
                shelves[i].push(itemType);
                let item = createItemElement(itemType, i);
                shelf.appendChild(item);
                itemsAdded++;
            }
            index++;
        }

        gameBoard.appendChild(shelf);
    }

    // Kệ cuối cùng có 2 item và 1 vị trí trống
    let lastShelf = document.createElement("div");
    lastShelf.classList.add("shelf");
    lastShelf.dataset.index = 14;
    lastShelf.addEventListener("dragover", dragOver);
    lastShelf.addEventListener("drop", dropItem);

    let itemsAddedToLastShelf = 0;
    while (itemsAddedToLastShelf < 2 && index < items.length) {
        let itemType = items[index];
        if (canAddItemToShelf(shelves[14], itemType)) {
            shelves[14].push(itemType);
            let item = createItemElement(itemType, i);
            lastShelf.appendChild(item);
            itemsAddedToLastShelf++;
        }
        index++;
    }

    gameBoard.appendChild(lastShelf);
}


// 🎨 Tạo item DOM element
function createItemElement(type, shelfIndex) {
    let item = document.createElement("div");
    item.classList.add("item");
    item.style.backgroundImage = `url('../2048/images/${type}.jpg')`;
    item.dataset.type = type;
    item.dataset.shelf = shelfIndex;
    item.draggable = true;

    // Xử lý kéo & thả
    item.addEventListener("dragstart", dragStart);
	enableTouchSupport(item);
    return item;
}

// 🛠️ Xử lý kéo & thả items
let draggedItem = null;
let sourceShelfIndex = null;

function dragStart(event) {
    draggedItem = event.target;
    sourceShelfIndex = parseInt(draggedItem.dataset.shelf);
    setTimeout(() => draggedItem.style.opacity = "0.5", 0);
}

function dragOver(event) {
    event.preventDefault();
}


// 📱 Xử lý kéo thả trên mobile (touch)
function enableTouchSupport(item) {
    item.addEventListener("touchstart", touchStart, { passive: false });
    item.addEventListener("touchmove", touchMove, { passive: false });
    item.addEventListener("touchend", touchEnd);
}

function touchMove(event) {
    event.preventDefault();
}

let touchStartItem = null;

function touchStart(event) {
    touchStartItem = event.target;
    sourceShelfIndex = parseInt(touchStartItem.dataset.shelf);
    touchStartItem.style.opacity = "0.5";
}

function touchEnd(event) {
    touchStartItem.style.opacity = "1";

    // Xác định vị trí ngón tay thả
    const touch = event.changedTouches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetShelf = targetElement?.closest(".shelf");

    if (targetShelf && touchStartItem) {
        const targetIndex = parseInt(targetShelf.dataset.index);
        const validItems = shelves[targetIndex].filter(item => item != null);

        if (validItems.length < 3) {
            const itemType = touchStartItem.dataset.type;

            // Xoá khỏi kệ cũ
            shelves[sourceShelfIndex] = shelves[sourceShelfIndex].filter(item => item !== itemType);

            // Thêm vào cuối kệ mới (hoặc có thể cải tiến targetItemIndex như chuột)
            shelves[targetIndex].push(itemType);

            updateShelvesUI();
            checkMatch(targetIndex);
        } else {
            alert("Kệ này đã đầy!");
        }
    }

    touchStartItem = null;
}



function dropItem(event) {
    event.preventDefault();
    let targetShelf = event.target.closest(".shelf");

    if (targetShelf && draggedItem) {
        let targetIndex = parseInt(targetShelf.dataset.index);

        // Lọc bỏ giá trị null/undefined và kiểm tra chiều dài thực tế
        const validItems = shelves[targetIndex].filter(item => item != null);

        // Kiểm tra nếu kệ có ít hơn 3 item hợp lệ
        if (validItems.length < 3) {
            const shelf = shelves[targetIndex];

            // Tìm vị trí để chèn item
            let targetItemIndex = getTargetItemIndex(event, targetShelf);

            // Xóa item khỏi kệ cũ
            shelves[sourceShelfIndex] = shelves[sourceShelfIndex].filter(item => item !== draggedItem.dataset.type);

            // Chèn vào đúng vị trí trong kệ mới
            if (targetItemIndex !== -1) {
                shelves[targetIndex].splice(targetItemIndex, 0, draggedItem.dataset.type);
            } else {
                shelves[targetIndex].push(draggedItem.dataset.type);
            }

            // Cập nhật lại giao diện
            updateShelvesUI();

            // Kiểm tra match
            checkMatch(targetIndex);
        } else {
            alert("Kệ này đã đầy!");
        }
    }

    draggedItem.style.opacity = "1";
    draggedItem = null;
}


// Tìm vị trí item trong kệ (trước hoặc sau các item hiện có)
function getTargetItemIndex(event, shelf) {
    const rect = shelf.getBoundingClientRect();
    const shelfItems = shelf.querySelectorAll(".item");
    const offsetX = event.clientX - rect.left;

    // Nếu không có item nào hoặc click vào bên trái kệ, chèn vào đầu
    if (shelfItems.length === 0 || offsetX < shelfItems[0].offsetWidth / 2) {
        return 0;
    }

    // Nếu có item, tìm vị trí chèn vào giữa
    for (let i = 0; i < shelfItems.length; i++) {
        if (offsetX > shelfItems[i].offsetLeft + shelfItems[i].offsetWidth / 2) {
            return i + 1; // Chèn sau item i
        }
    }

    return -1; // Chèn vào cuối kệ
}

// 🔄 Cập nhật lại giao diện kệ hàng sau khi di chuyển item
function updateShelvesUI() {
    gameBoard.innerHTML = "";

    for (let i = 0; i < 15; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);

        shelves[i].forEach(itemType => {
            if (itemType) {
                let item = createItemElement(itemType, i);
                shelf.appendChild(item);
            }
        });

        gameBoard.appendChild(shelf);
    }
}

// ✅ Kiểm tra nếu 3 món giống nhau trong cùng 1 kệ
function checkMatch(shelfIndex) {
    const validItems = shelves[shelfIndex].filter(item => item != null);

    if (validItems.length === 3) {
        let [a, b, c] = validItems;
        if (a.split(" ")[0] === b.split(" ")[0] && b.split(" ")[0] === c.split(" ")[0]) {
            setTimeout(() => {
                removeItems(shelfIndex);
            }, 400);
        }
    }
}


// 🗑️ Xóa items nếu match
function removeItems(shelfIndex) {
    shelves[shelfIndex] = [null, null, null];
    updateShelvesUI();
    checkWin();
}

// 🎉 Kiểm tra chiến thắng
function checkWin() {
    let remainingItems = shelves.flat().filter(item => item !== null).length;
    if (remainingItems === 0) {
        clearInterval(timer);
        let score = timeLeft;
        setTimeout(() => {
            alert(`🎉 Bạn đã thắng! 🎉 Điểm của bạn: ${score}`);
            saveScoreToFirebase(score);
        }, 500);
    }
}

// 🔥 Lưu điểm lên Firebase
async function saveScoreToFirebase(score) {
    if (!playerName) {
        console.error("❌ Không có tên người chơi!");
        alert("Vui lòng nhập tên trước khi chơi!");
        return;
    }

    const gameName = "Sorting";
    const docId = `${playerName}-${gameName}`; // Định dạng: username-game

    console.log(`🔥 Cập nhật điểm cho ${playerName}: ${score} | ID: ${docId}`);

    try {
        const scoresRef = db.collection("userScores").doc(docId);
        const docSnapshot = await scoresRef.get();

        if (!docSnapshot.exists) {
            await scoresRef.set({
                username: playerName,
                game: gameName,
                score: score,
                updatedAt: new Date().toISOString()
            });
        } else {
            const existingData = docSnapshot.data();
            if (score > existingData.score) {
                await scoresRef.update({
                    score: score,
                    updatedAt: new Date().toISOString()
                });
            }
        }

        console.log("✅ Đã lưu điểm lên Firebase thành công!");
    } catch (error) {
        console.error("❌ Lỗi khi lưu điểm lên Firebase:", error);
        alert("Có lỗi xảy ra khi lưu điểm!");
    }
}

let timeLeft = 480;  // Đặt thời gian cho bộ đếm (60 giây)
let timer;

// Thêm bộ đếm thời gian vào màn hình
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        const timerElement = document.getElementById('timer');
        timerElement.innerText = `Thời gian: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            alert("Hết thời gian! Bạn thua cuộc!");
        }
    }, 1000);
}

// Khởi động game và bắt đầu bộ đếm thời gian
createShelves();
startTimer();

