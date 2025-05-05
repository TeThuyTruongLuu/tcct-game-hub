const gameBoard = document.getElementById("gameBoard");
const characterList = ["Du", "Khuu", "Lac", "Vuong"];
let shelves = [];
let playerName = "";
let timeLeft = 300;
let timer;

function createItems() {
    let items = [];
    characterList.forEach(type => {
        for (let i = 1; i <= 6; i++) { // Tạo 6 items mỗi char, tổng 24 items
            items.push(`${type}_${i}`);
        }
    });
    // Xáo trộn danh sách
    return items.sort(() => Math.random() - 0.5);
}

function createShelves() {
    gameBoard.innerHTML = "";
    shelves = Array(7).fill().map(() => ({ front: [], back: [] }));

    let items = createItems();

    // Random chọn 6 items cho mặt sau
    let backItems = [];
    while (backItems.length < 6) {
        const randomIndex = Math.floor(Math.random() * items.length);
        backItems.push(items[randomIndex]);
        items.splice(randomIndex, 1); // Xóa item đã chọn khỏi danh sách
    }

    // 18 items còn lại cho mặt trước
    let frontItems = items;

    // Phân phối ngẫu nhiên 6 items vào mặt sau của 7 kệ (mỗi kệ tối đa 3 items)
    let backDistribution = Array(7).fill(0); // Số items ở mặt sau của mỗi kệ
    let remainingBackItems = 6;
    while (remainingBackItems > 0) {
        const shelfIndex = Math.floor(Math.random() * 7); // Chọn ngẫu nhiên kệ
        if (backDistribution[shelfIndex] < 3) { // Kiểm tra giới hạn 3 items
            backDistribution[shelfIndex]++;
            remainingBackItems--;
        }
    }

    // Phân phối ngẫu nhiên 18 items vào mặt trước của 7 kệ (mỗi kệ tối đa 3 items)
    let frontDistribution = Array(7).fill(0); // Số items ở mặt trước của mỗi kệ
    let remainingFrontItems = 18;
    while (remainingFrontItems > 0) {
        const shelfIndex = Math.floor(Math.random() * 7); // Chọn ngẫu nhiên kệ
        if (frontDistribution[shelfIndex] < 3) { // Kiểm tra giới hạn 3 items
            frontDistribution[shelfIndex]++;
            remainingFrontItems--;
        }
    }

    // Gán items vào mặt sau
    let backIndex = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < backDistribution[i]; j++) {
            if (backIndex < backItems.length) {
                shelves[i].back.push(backItems[backIndex]);
                backIndex++;
            }
        }
    }

    // Gán items vào mặt trước
    let frontIndex = 0;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < frontDistribution[i]; j++) {
            if (frontIndex < frontItems.length) {
                shelves[i].front.push(frontItems[frontIndex]);
                frontIndex++;
            }
        }
    }

    // Tạo UI cho các kệ
    for (let i = 0; i < 7; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);
        gameBoard.appendChild(shelf);
    }

    updateShelvesUI();
}

function createItemElement(type, shelfIndex, isBack = false) {
    let item = document.createElement("div");
    item.classList.add("item");
    item.style.backgroundImage = `url('../2048/images/${type}.jpg')`;
    item.dataset.type = type;
    item.dataset.shelf = shelfIndex;
    item.dataset.isBack = isBack;

    if (isBack) {
        item.classList.add("back-item");
        item.style.pointerEvents = "none";
    } else {
        item.draggable = true;
        item.style.pointerEvents = "auto";
        item.addEventListener("dragstart", dragStart);
        enableTouchSupport(item);
    }
    return item;
}

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
    const touch = event.changedTouches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetShelf = targetElement?.closest(".shelf");

    if (targetShelf && touchStartItem) {
        const targetIndex = parseInt(targetShelf.dataset.index);
        const validItems = shelves[targetIndex].front.filter(item => item != null);

        if (validItems.length < 3) {
            const itemType = touchStartItem.dataset.type;
            shelves[sourceShelfIndex].front = shelves[sourceShelfIndex].front.filter(item => item !== itemType);
            shelves[targetIndex].front.push(itemType);
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
        const validItems = shelves[targetIndex].front.filter(item => item != null);

        if (validItems.length < 3) {
            let targetItemIndex = getTargetItemIndex(event, targetShelf);
            shelves[sourceShelfIndex].front = shelves[sourceShelfIndex].front.filter(item => item !== draggedItem.dataset.type);
            if (targetItemIndex !== -1) {
                shelves[targetIndex].front.splice(targetItemIndex, 0, draggedItem.dataset.type);
            } else {
                shelves[targetIndex].front.push(draggedItem.dataset.type);
            }
            updateShelvesUI();
            checkMatch(targetIndex);
        } else {
            alert("Kệ này đã đầy!");
        }
    }
    draggedItem.style.opacity = "1";
    draggedItem = null;
}

function getTargetItemIndex(event, shelf) {
    const rect = shelf.getBoundingClientRect();
    const shelfItems = shelf.querySelectorAll(".item:not(.back-item)");
    const offsetX = event.clientX - rect.left;

    if (shelfItems.length === 0 || offsetX < shelfItems[0].offsetWidth / 2) {
        return 0;
    }
    for (let i = 0; i < shelfItems.length; i++) {
        if (offsetX > shelfItems[i].offsetLeft + shelfItems[i].offsetWidth / 2) {
            return i + 1;
        }
    }
    return -1;
}

function updateShelvesUI() {
    gameBoard.innerHTML = "";
    for (let i = 0; i < 7; i++) {
        let shelf = document.createElement("div");
        shelf.classList.add("shelf");
        shelf.dataset.index = i;
        shelf.addEventListener("dragover", dragOver);
        shelf.addEventListener("drop", dropItem);

        const frontItems = shelves[i].front.filter(item => item != null);
        const backItems = shelves[i].back.filter(item => item != null);

        if (frontItems.length === 0 && backItems.length > 0) {
            shelves[i].front = shelves[i].back;
            shelves[i].back = [];
        }

        const updatedFrontItems = shelves[i].front.filter(item => item != null);
        updatedFrontItems.forEach(itemType => {
            let item = createItemElement(itemType, i, false);
            shelf.appendChild(item);
        });

        gameBoard.appendChild(shelf);
    }
}

function checkMatch(shelfIndex) {
    const validItems = shelves[shelfIndex].front.filter(item => item != null);
    if (validItems.length === 3) {
        let [a, b, c] = validItems;
        if (a.split("_")[0] === b.split("_")[0] && b.split("_")[0] === c.split("_")[0]) {
            setTimeout(() => removeItems(shelfIndex), 400);
        }
    }
}

function removeItems(shelfIndex) {
    shelves[shelfIndex].front = [];
    if (shelves[shelfIndex].back.length > 0) {
        shelves[shelfIndex].front = shelves[shelfIndex].back;
        shelves[shelfIndex].back = [];
    }
    updateShelvesUI();
    checkWin();
}

function checkWin() {
    let remainingItems = shelves.flatMap(shelf => [...shelf.front, ...shelf.back]).filter(item => item !== null).length;
    if (remainingItems === 0) {
        clearInterval(timer);
        let score = timeLeft;
        setTimeout(() => {
            alert(`🎉 Bạn đã thắng! Điểm của bạn: ${score}`);
            saveScoreToFirebase(score);
        }, 500);
    }
}

async function saveScoreToFirebase(score) {
    if (!playerName) {
        console.error("Không có tên người chơi!");
        alert("Vui lòng nhập tên trước khi chơi!");
        return;
    }
    const gameName = "Sorting";
    const docId = `${playerName}-${gameName}`;
    console.log(`Cập nhật điểm cho ${playerName}: ${score} | ID: ${docId}`);

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
        console.log("Đã lưu điểm lên Firebase thành công!");
    } catch (error) {
        console.error("Lỗi khi lưu điểm lên Firebase:", error);
        alert("Có lỗi xảy ra khi lưu điểm!");
    }
}

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

createShelves();
startTimer();