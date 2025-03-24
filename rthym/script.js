const gameBoard = document.getElementById("gameBoard");

// 📝 Danh sách nhân vật
const characterList = ["Du", "Khuu", "Lac", "Vuong"];
let shelves = [];

// 🛒 Khởi tạo danh sách items
function createItems() {
    let items = [];
    characterList.forEach(type => {
        for (let i = 1; i <= 8; i++) {  // Mỗi nhân vật có 8 hình
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

    for (let i = 0; i < 14; i++) {  // Tạo 14 kệ đầy 3 item
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);

        // Chỉ cho phép thêm item hợp lệ vào kệ
        for (let j = 0; j < 3 && index < items.length; j++, index++) {
            let itemType = items[index];
            if (itemType != null) {
                shelves[i].push(itemType);
                let item = createItemElement(itemType, i);
                shelf.appendChild(item);
            }
        }

        gameBoard.appendChild(shelf);
    }

    // Kệ cuối cùng chỉ chừa lại 1 vị trí trống
    let lastShelf = document.createElement("div");
    lastShelf.classList.add("shelf");
    lastShelf.dataset.index = 14;
    lastShelf.addEventListener("dragover", dragOver);
    lastShelf.addEventListener("drop", dropItem);

    // Kệ cuối cùng có 2 item hợp lệ
    for (let j = 0; j < 2 && index < items.length; j++, index++) {
        let itemType = items[index];
        if (itemType != null) {
            shelves[14].push(itemType);
            let item = createItemElement(itemType, 14);
            lastShelf.appendChild(item);
        }
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
            removeItems(shelfIndex);
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
        setTimeout(() => alert("🎉 Bạn đã thắng! 🎉"), 500);
    }
}

let timeLeft = 60;  // Đặt thời gian cho bộ đếm (60 giây)
let timer;

// Thêm bộ đếm thời gian vào màn hình
function startTimer() {
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').innerText = `Thời gian: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            alert("Hết thời gian! Bạn thua cuộc!");
        }
    }, 1000);
}

// Khởi động game và bắt đầu bộ đếm thời gian
createShelves();
startTimer();
