const gameBoard = document.getElementById("gameBoard");

// 📝 Danh sách nhân vật
const characterList = ["Du", "Khuu", "Lac", "Vuong"];
let shelves = [];

// 🛒 Khởi tạo danh sách items
function createItems() {
    let items = [];
    characterList.forEach(type => {
        for (let i = 1; i <= 3; i++) {
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

    for (let i = 0; i < 15; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);

        for (let j = 0; j < 3 && index < items.length; j++, index++) {
            let itemType = items[index];
            shelves[i].push(itemType);
            let item = createItemElement(itemType, i);
            shelf.appendChild(item);
        }

        gameBoard.appendChild(shelf);
    }
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

        // Không cho phép thả vào kệ đầy
        if (shelves[targetIndex].length < 3) {
            let itemType = draggedItem.dataset.type;

            // Xóa item khỏi kệ cũ
            shelves[sourceShelfIndex] = shelves[sourceShelfIndex].filter(item => item !== itemType);

            // Chèn vào vị trí trống trong kệ mới
            let newShelf = shelves[targetIndex];
            let emptyIndex = newShelf.findIndex(item => item === undefined || item === null);

            if (emptyIndex !== -1) {
                newShelf[emptyIndex] = itemType;
            } else {
                newShelf.push(itemType);
            }

            // Cập nhật lại giao diện
            updateShelvesUI();

            // Kiểm tra match
            checkMatch(targetIndex);
        }
    }

    draggedItem.style.opacity = "1";
    draggedItem = null;
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
    if (shelves[shelfIndex].length === 3) {
        let [a, b, c] = shelves[shelfIndex];
        if (a && b && c && a.split(" ")[0] === b.split(" ")[0] && b.split(" ")[0] === c.split(" ")[0]) {
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

// 🔥 Khởi động game
createShelves();
