const gameBoard = document.getElementById("gameBoard");
const itemsList = ["chips", "icecream", "chocolate", "candy", "soda", "juice", "cake", "cookie", "popcorn", "donut", "coffee", "tea", "bread"];
let shelves = [];
let allItems = [];

// 🛒 Khởi tạo items (mỗi món 3 cái)
function createItems() {
    let items = [];
    itemsList.forEach(type => {
        for (let i = 0; i < 3; i++) {
            items.push(type);
        }
    });

    // Xáo trộn danh sách
    items = items.sort(() => Math.random() - 0.5);
    return items;
}

// 🏗️ Tạo các kệ hàng (15 kệ)
function createShelves() {
    gameBoard.innerHTML = "";
    shelves = [];

    let items = createItems();
    let index = 0;

    for (let i = 0; i < 15; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;

        let shelfItems = [];
        for (let j = 0; j < 3 && index < items.length; j++, index++) {
            let itemType = items[index];
            let item = createItemElement(itemType, i);
            shelf.appendChild(item);
            shelfItems.push(itemType);
        }

        shelves.push(shelfItems);
        gameBoard.appendChild(shelf);
    }
}

// 🎨 Tạo item DOM element
function createItemElement(type, shelfIndex) {
    let item = document.createElement("div");
    item.classList.add("item");
    item.style.backgroundImage = `url('images/${type}.png')`;
    item.dataset.type = type;
    item.draggable = true;

    // Xử lý kéo & thả
    item.addEventListener("dragstart", dragStart);
    item.addEventListener("dragover", dragOver);
    item.addEventListener("drop", dropItem);
    item.dataset.shelf = shelfIndex;
    
    return item;
}

// 🛠️ Xử lý kéo & thả items
let draggedItem = null;

function dragStart(event) {
    draggedItem = event.target;
    setTimeout(() => draggedItem.style.opacity = "0.5", 0);
}

function dragOver(event) {
    event.preventDefault();
}

function dropItem(event) {
    event.preventDefault();
    let targetShelf = event.target.closest(".shelf");

    if (targetShelf && draggedItem) {
        let targetIndex = targetShelf.dataset.index;
        let currentShelfIndex = draggedItem.dataset.shelf;

        // Kiểm tra nếu kệ chưa đầy
        if (shelves[targetIndex].length < 3) {
            // Cập nhật data
            shelves[currentShelfIndex] = shelves[currentShelfIndex].filter(item => item !== draggedItem.dataset.type);
            shelves[targetIndex].push(draggedItem.dataset.type);

            // Di chuyển item
            draggedItem.dataset.shelf = targetIndex;
            targetShelf.appendChild(draggedItem);

            // Kiểm tra match
            checkMatch(targetIndex);
        }
    }

    draggedItem.style.opacity = "1";
    draggedItem = null;
}

// ✅ Kiểm tra nếu 3 món giống nhau trong cùng 1 kệ
function checkMatch(shelfIndex) {
    if (shelves[shelfIndex].length === 3) {
        let [a, b, c] = shelves[shelfIndex];
        if (a === b && b === c) {
            removeItems(shelfIndex);
        }
    }
}

// 🗑️ Xóa items nếu match
function removeItems(shelfIndex) {
    let shelf = document.querySelectorAll(".shelf")[shelfIndex];
    
    setTimeout(() => {
        shelf.innerHTML = "";
        shelves[shelfIndex] = [];
        checkWin();
    }, 300);
}

// 🎉 Kiểm tra chiến thắng
function checkWin() {
    let remainingItems = shelves.flat().length;
    if (remainingItems === 0) {
        setTimeout(() => alert("🎉 Bạn đã thắng! 🎉"), 500);
    }
}

// 🔥 Khởi động game
createShelves();
