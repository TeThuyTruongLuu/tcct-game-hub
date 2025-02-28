document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    document.getElementById('deviceready').classList.add('ready');
}

//Load login
document.addEventListener("deviceready", function() {
    document.addEventListener("backbutton", function(e) {
        const loginModal = document.getElementById("login-modal");
        if (loginModal.style.display === "none") {
            e.preventDefault();
            navigator.app.exitApp();
        }
    }, false);
}, false);


// Kiểm tra Firebase
if (!firebase.apps.length) {
    const firebaseConfig = {
        apiKey: "AIzaSyBtpLSSNBj9lHtzibLh5QSRAPg3iQ46Q3g",
        authDomain: "tcct-minigames.firebaseapp.com",
        projectId: "tcct-minigames",
        storageBucket: "tcct-minigames.firebasestorage.app",
        messagingSenderId: "604780847536",
        appId: "1:604780847536:web:f8015bde5ef469b04c7675",
        measurementId: "G-1GGDZR6VY5"
    };

    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase đã được khởi tạo!");
}

// Lấy Firestore
const db = firebase.firestore();

//Kiểm tra điều kiện log-in, log-out
document.addEventListener("DOMContentLoaded", function () {
    console.log("🔥 DOM đã load xong!");

    const savedUsername = localStorage.getItem("username");
    const startButton = document.getElementById("start-button");
    const playWithoutLoginButton = document.getElementById("play-without-login");
    const codeInput = document.getElementById("code-input");
    const nicknameInput = document.getElementById("nickname-input");
    const tabButtons = document.querySelectorAll(".tab-btn");
    const leaderboardContent = document.getElementById("leaderboard-content");

    if (savedUsername) {
        console.log(`🔄 Tự động đăng nhập: ${savedUsername}`);
        document.getElementById("login-modal").style.display = "none";
        document.getElementById("welcome-message").style.display = "block";
        document.getElementById("display-name").innerText = savedUsername;
        document.getElementById("logout-button").style.display = "block";

        document.querySelector(".points").style.display = "block";
        document.querySelector(".scoreboard-container").style.display = "flex";
        document.querySelector(".game-list").style.display = "grid";
        document.getElementById("scoreboard").style.display = "block";
		document.getElementById("character-callout").style.display = "flex";
		document.getElementById("settings-btn").style.display = "block";
        updateTotalScore();
    }

    if (startButton) {
        startButton.addEventListener("click", async () => {
            const codeInputValue = document.getElementById("code-input").value.trim();
            const nicknameInputValue = document.getElementById("nickname-input").value.trim();

            if (codeInputValue !== "TCCT" || !nicknameInputValue) {
                alert("Nhập đúng mã 'TCCT' và điền tên hợp lệ nha bồ ơi.");
                return;
            }

            console.log(`📌 Đăng nhập với tên: ${nicknameInputValue}`);

            const userRef = db.collection("users").doc(nicknameInputValue);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                alert(`Chào mừng trở lại, ${nicknameInputValue}!`);
            } else {
                await userRef.set({ username: nicknameInputValue });
                alert(`Tạo tài khoản thành công! Xin chào, ${nicknameInputValue}.`);
            }

            localStorage.setItem("username", nicknameInputValue);

            document.getElementById("login-modal").style.display = "none";
            document.getElementById("welcome-message").style.display = "block";
            document.getElementById("display-name").innerText = nicknameInputValue;
            document.getElementById("logout-button").style.display = "block";

            document.querySelector(".points").style.display = "block";
            document.querySelector(".scoreboard-container").style.display = "flex";
            document.querySelector(".game-list").style.display = "grid";
            document.getElementById("scoreboard").style.display = "block";
			document.getElementById("character-callout").style.display = "flex";
			document.getElementById("settings-btn").style.display = "block";

            updateTotalScore();
        });
    }

    // 🎯 Khi nhấn Enter trong input => Click vào nút "Vào game"
    function handleEnterKey(event) {
        if (event.key === "Enter" && startButton) {
            startButton.click();
        }
    }

    if (codeInput) codeInput.addEventListener("keydown", handleEnterKey);
    if (nicknameInput) nicknameInput.addEventListener("keydown", handleEnterKey);

    if (playWithoutLoginButton) {
        playWithoutLoginButton.addEventListener("click", () => {
            console.log("🎮 Chế độ chơi ẩn danh");

            document.getElementById("login-modal").style.display = "none";
            document.querySelector(".game-list").style.display = "grid";
            document.querySelector(".points").style.display = "none";
            document.querySelector(".scoreboard-container").style.display = "none";
            document.getElementById("scoreboard").style.display = "none";
            document.getElementById("logout-button").style.display = "none";
			document.getElementById("character-callout").style.display = "flex";
			document.getElementById("settings-btn").style.display = "block";

            alert("Bồ đang chơi mà không đăng nhập, điểm số sẽ không được lưu!");
        });
    }

    // 🎯 Xử lý chuyển đổi giữa các game trong bảng kỷ lục
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            const game = this.getAttribute("data-game");
            loadLeaderboard(game);
        });
    });

	loadLeaderboard();
	adjustSettingsButton();
});

function logout() {
    localStorage.removeItem("username");
    location.reload();
}


//Lưu điểm
async function saveScoreToDB(game, newScore) {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Bạn chưa đăng nhập, điểm sẽ không được lưu!");
        return;
    }

    const scoreDocId = `${username}-${game}`; // 🔥 Tạo ID duy nhất cho mỗi user-game
    const scoreRef = firebase.firestore().collection("userScores").doc(scoreDocId);

    try {
        const docSnapshot = await scoreRef.get();
        if (!docSnapshot.exists) {
            // 🔥 Nếu chưa có dữ liệu, tạo mới
            await scoreRef.set({
                username: username,
                game: game,
                score: newScore,
                updatedAt: new Date().toISOString()
            });
            console.log(`🆕 Tạo điểm mới: ${username} - ${game}: ${newScore}`);
        } else {
            const oldScore = docSnapshot.data().score;
            if (newScore > oldScore) {
                // 🔥 Nếu điểm mới cao hơn điểm cũ, ghi đè lên
                await scoreRef.update({
                    score: newScore,
                    updatedAt: new Date().toISOString()
                });
                console.log(`✅ Cập nhật điểm: ${username} - ${game}: ${newScore}`);
            } else {
                console.log("⚠️ Điểm mới không cao hơn điểm cũ, không cập nhật.");
            }
        }

        // 🔥 Cập nhật tổng điểm sau khi thay đổi điểm của game
        updateTotalScore();
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật điểm:", error);
    }
}

window.saveScoreToDB = saveScoreToDB;

//Leaderboard + Personal score
let personalScoresVisible = false;
let leaderboardVisible = false;

async function loadLeaderboard(game) {
    const leaderboardContent = document.getElementById("leaderboard-content");

    if (!game) {
        console.error("❌ Lỗi: Game không hợp lệ hoặc bị undefined.");
        return;
    }

    leaderboardContent.innerHTML = `<h3>Bảng xếp hạng</h3>`;

    const scoresRef = firebase.firestore().collection("userScores");

    let q;
    if (game === "Lật hình") {
        q = scoresRef.where("game", "==", game).orderBy("totalTimeInSeconds", "asc").limit(10); 
    } else {
        q = scoresRef.where("game", "==", game).orderBy("score", "desc").limit(10);
    }

    try {
        const querySnapshot = await q.get();
        
        let html = "";
        if (game === "Lật hình") {
            html += `<table><tr><th>Người chơi</th><th>Thời gian (s)</th><th>Điểm</th></tr>`;
        } else {
            html += `<table><tr><th>Người chơi</th><th>Điểm</th></tr>`;
        }

        if (querySnapshot.empty) {
            html += `<tr><td colspan="${game === "Lật hình" ? 3 : 2}">Chưa có dữ liệu</td></tr>`;
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (game === "Lật hình") {
                    html += `<tr><td>${data.username}</td><td>${data.totalTime || "N/A"}</td><td>${data.score}</td></tr>`;
                } else {
                    html += `<tr><td>${data.username}</td><td>${data.score}</td></tr>`;
                }
            });
        }

        html += `</table>`;
        leaderboardContent.innerHTML += html;
    } catch (error) {
        console.error(`❌ Lỗi khi tải bảng xếp hạng ${game}:`, error);
    }
}


function formatDate(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0 nên +1
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}


async function showPersonalScores() {
    const scoreboard = document.getElementById("scoreboard");

    if (personalScoresVisible) {
        scoreboard.innerHTML = ""; // Ẩn bảng điểm khi bấm lại
        personalScoresVisible = false;
        return;
    }

    const username = localStorage.getItem("username");
    if (!username) {
        alert("Bạn cần đăng nhập!");
        return;
    }

    const scoresRef = firebase.firestore().collection("userScores");
    const q = scoresRef.where("username", "==", username).orderBy("score", "desc").limit(10);

    try {
        const querySnapshot = await q.get();
        let html = "<h2>Bảng điểm cá nhân</h2><table><tr><th>Game</th><th>Điểm cao nhất</th><th>Thời gian</th></tr>";

        if (querySnapshot.empty) {
            html += `<tr><td colspan="3">N/A</td></tr>`; // Không có dữ liệu thì hiển thị "N/A"
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const formattedDate = formatDate(data.updatedAt); // Chuyển đổi thời gian

                html += `<tr><td>${data.game}</td><td>${data.score}</td><td>${formattedDate}</td></tr>`;
            });
        }

        html += "</table>";
        scoreboard.innerHTML = html;
        personalScoresVisible = true; // Đánh dấu bảng điểm đang hiển thị
    } catch (error) {
        console.error("❌ Lỗi khi lấy bảng điểm cá nhân:", error);
    }
}


async function showLeaderboard() {
    const leaderboardSection = document.getElementById("leaderboard-section");

    // Nếu đang ẩn thì hiển thị, nếu đang hiển thị thì ẩn đi
    if (leaderboardSection.style.display === "none") {
        leaderboardSection.style.display = "block";
        loadLeaderboard("2048"); // Mặc định hiển thị game đầu tiên
    } else {
        leaderboardSection.style.display = "none";
    }
}


async function updateTotalScore() {
    const username = localStorage.getItem("username");
    if (!username) {
        console.warn("⚠️ Người chơi chưa đăng nhập, không cập nhật tổng điểm.");
        return;
    }

    const scoresRef = firebase.firestore().collection("userScores");
    const q = scoresRef.where("username", "==", username);

    try {
        const querySnapshot = await q.get();
        let totalScore = 0;

        if (querySnapshot.empty) {
            console.log(`⚠️ Người chơi ${username} chưa có điểm trong game nào.`);
            document.getElementById("user-points").innerText = "N/A";
            return;
        }

        querySnapshot.forEach((doc) => {
            totalScore += doc.data().score; // Cộng tổng điểm của tất cả game
        });

        console.log(`🔥 Tổng điểm mới của ${username}: ${totalScore}`);
        document.getElementById("user-points").innerText = totalScore;

        // 🔥 Cập nhật tổng điểm vào Firestore
        const userRef = firebase.firestore().collection("users").doc(username);
        await userRef.set({ totalScore: totalScore }, { merge: true });

        console.log(`✅ Đã cập nhật tổng điểm vào Firestore.`);
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật tổng điểm:", error);
    }
}



async function updateOldLeaderboardData() {
    const scoresRef = firebase.firestore().collection("userScores");
    
    try {
        const querySnapshot = await scoresRef.where("game", "==", "Lật hình").get();
        let count = 0;

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();

            if (!data.totalTimeInSeconds && data.totalTime) {
                const totalTimeParts = data.totalTime.split(":").map(Number);
                const totalTimeInSeconds = totalTimeParts[0] * 60 + totalTimeParts[1]; // Chuyển thành giây

                await scoresRef.doc(doc.id).update({
                    totalTimeInSeconds: totalTimeInSeconds
                });

                console.log(`✅ Đã cập nhật ${data.username}: ${data.totalTime} → ${totalTimeInSeconds}s`);
                count++;
            }
        });

        console.log(`🎉 Đã cập nhật xong ${count} bản ghi.`);
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật dữ liệu:", error);
    }
}

updateOldLeaderboardData();

//Nút setting
document.addEventListener("DOMContentLoaded", function () {
    const settingsButton = document.getElementById("settings-btn");
    const settingsModal = document.getElementById("settings-modal");
    const modalOverlay = document.getElementById("modal-overlay");
    const closeSettingsButton = document.getElementById("close-settings");

    if (settingsButton && settingsModal && modalOverlay) {
        settingsButton.addEventListener("click", function () {
            settingsModal.style.display = "block";
            modalOverlay.style.display = "block";
        });
    }

    if (closeSettingsButton) {
        closeSettingsButton.addEventListener("click", function () {
            settingsModal.style.display = "none";
            modalOverlay.style.display = "none";
        });
    }
    modalOverlay.addEventListener("click", function () {
        settingsModal.style.display = "none";
        modalOverlay.style.display = "none";
    });
});

function adjustSettingButton() {
    const settingBtn = document.getElementById("settings-btn");
    const h1 = document.querySelector("h1");

    if (settingBtn && h1) {
        const h1Rect = h1.getBoundingClientRect();
        settingBtn.style.top = `${h1Rect.top*1.5 + window.scrollY}px`;
        settingBtn.style.right = `5vw`; // Cố định bên phải
    }
}

// Gọi lại khi load trang và khi thay đổi kích thước cửa sổ
window.onload = adjustSettingButton;
window.onresize = adjustSettingButton;



//Chọn nhân vật
async function fetchCharacterImages() {
    const character = getSelectedCharacter();
    try {
        console.log(`📡 Đang lấy ảnh cho nhân vật: ${character}`);

        const imageRef = db.collection("characterImages").doc(character);
        const imageDoc = await imageRef.get();

        let images = ["https://i.imgur.com/cnzaFeS.png"]; // Ảnh mặc định

        if (imageDoc.exists) {
            images = imageDoc.data().images || images;
        }

        localStorage.setItem(`images_${character}`, JSON.stringify(images));
        console.log("✅ Ảnh nhân vật đã được tải:", images);
        return images;
    } catch (error) {
        console.error("❌ Lỗi khi lấy ảnh nhân vật:", error);
        return null;
    }
}

async function fetchCharacterQuotes() {
    const character = getSelectedCharacter();
    try {
        console.log(`📡 Đang lấy thoại cho nhân vật: ${character}`);

        const quoteRef = db.collection("characterQuotes").doc(character);
        const quoteDoc = await quoteRef.get();

        let dialogues = ["Xin chào! Tôi là trợ thủ của bạn!"]; // Thoại mặc định

        if (quoteDoc.exists) {
            dialogues = quoteDoc.data().quotes || dialogues;
            const userQuotes = quoteDoc.data().userQuotes || {};
            const username = localStorage.getItem("username");

            if (username && userQuotes[username]) {
                dialogues = dialogues.concat(userQuotes[username]);
            }
        }

        localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));
        console.log("✅ Thoại nhân vật đã được tải:", dialogues);
        return dialogues;
    } catch (error) {
        console.error("❌ Lỗi khi lấy thoại nhân vật:", error);
        return null;
    }
}

async function showRandomCharacterImage() {
    const character = getSelectedCharacter();

    // ⚡ Thử lấy từ localStorage trước
    let images = JSON.parse(localStorage.getItem(`images_${character}`)) || [];

    if (images.length === 0) {
        console.log(`📡 Không có ảnh trong localStorage, tải mới từ Firestore cho ${character}`);
        images = await fetchCharacterImages(); // Tải mới từ Firestore
    }

    // Nếu vẫn không có ảnh nào, dùng ảnh mặc định
    if (images.length === 0) {
        images = ["https://i.imgur.com/cnzaFeS.png"]; // Ảnh mặc định
    }

    const randomImage = images[Math.floor(Math.random() * images.length)];
    document.getElementById("callout-avatar").src = randomImage;

    console.log(`🖼️ Cập nhật ảnh nhân vật: ${character} - ${randomImage}`);
}


async function showRandomCharacterQuote() {
    const character = getSelectedCharacter();
    let dialogues = JSON.parse(localStorage.getItem(`dialogues_${character}`)) || [];

    if (dialogues.length === 0) {
        dialogues = await fetchCharacterQuotes();
    }

    const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    document.getElementById("callout-bubble").innerText = randomDialogue;

    console.log(`💬 Cập nhật thoại nhân vật: ${randomDialogue}`);
}



// Gọi hàm khi trang tải xong
document.addEventListener("DOMContentLoaded", showRandomCharacterImage);

// Gọi hàm khi trang tải xong
document.addEventListener("DOMContentLoaded", showRandomCharacterQuote);


async function downloadCharacterData() {
    const character = getSelectedCharacter();

    console.log(`📥 Đang tải dữ liệu cho nhân vật: ${character}`);

    // Xóa dữ liệu cũ trước khi tải dữ liệu mới
    localStorage.removeItem(`images_${character}`);
    localStorage.removeItem(`dialogues_${character}`);

    const images = await fetchCharacterImages();
    const dialogues = await fetchCharacterQuotes();
	checkUserPoints();

    if (images && dialogues) {
        alert(`✅ Dữ liệu của ${character} đã được lưu để dùng offline!`);

        // 🔥 Gọi lại hàm hiển thị ảnh & thoại mới ngay lập tức
        setTimeout(() => {
            showRandomCharacterImage();
            showRandomCharacterQuote();
        }, 300);
    } else {
        alert("❌ Không thể tải dữ liệu, kiểm tra kết nối mạng.");
    }
}

function getSelectedCharacter() {
    return document.getElementById("character-select")?.value || localStorage.getItem("selectedCharacter") || "Vương";
}

document.getElementById("character-select").addEventListener("change", async function () {
    const selectedCharacter = this.value;
    localStorage.setItem("selectedCharacter", selectedCharacter);

    console.log(`🔄 Nhân vật đã đổi thành: ${selectedCharacter}`);

    // Xóa dữ liệu nhân vật cũ trong localStorage để buộc tải dữ liệu mới
    localStorage.removeItem(`images_${selectedCharacter}`);
    localStorage.removeItem(`dialogues_${selectedCharacter}`);

    // 🔥 Gọi lại hiển thị ảnh, thoại và check điểm số ngay khi đổi nhân vật
    showRandomCharacterImage();
    showRandomCharacterQuote();
});



async function checkUserPoints() {
    const username = localStorage.getItem("username");
    if (!username) {
        console.warn("❌ Không tìm thấy username trong localStorage.");
        return;
    }

    const userRef = firebase.firestore().collection("users").doc(username);
    const userDoc = await userRef.get();

    let totalPoints = 0;
    if (userDoc.exists) {
        totalPoints = userDoc.data().totalScore || 0;
    }

    console.log(`📝 Kiểm tra tổng điểm của ${username}: ${totalPoints}`);

    const allowedQuotes = Math.floor(totalPoints / 1000);
    console.log(`💬 Số câu thoại được phép nhập: ${allowedQuotes}`);

    const messageElement = document.getElementById("quote-message");
    const customQuoteSection = document.getElementById("custom-quote-section");
    customQuoteSection.innerHTML = ""; // Xóa nội dung cũ

    if (allowedQuotes > 0) {
        messageElement.innerHTML = `Bạn có thể thêm ${allowedQuotes} câu thoại vào kho.`;
        customQuoteSection.style.display = "block"; // 🔥 Hiển thị phần nhập thoại

        for (let i = 0; i < allowedQuotes; i++) {
            const input = document.createElement("input");
            input.type = "text";
            input.classList.add("custom-quote-input");
            input.placeholder = `Nhập câu thoại #${i + 1}`;
            input.dataset.index = i;

            // Load thoại cũ từ database
            loadUserQuote(username, i, input);

            customQuoteSection.appendChild(input);
        }

        const submitButton = document.createElement("button");
        submitButton.classList.add("green");
        submitButton.innerText = "Lưu thoại";
        submitButton.onclick = submitCustomQuotes;
        customQuoteSection.appendChild(submitButton);
    } else {
        messageElement.innerHTML = "Bạn chưa có đủ điểm để thêm thoại, sẽ dùng kho thoại mặc định.";
        customQuoteSection.style.display = "none"; // Ẩn phần nhập thoại nếu không đủ điểm
    }
}


async function loadUserQuote(character, username, index, inputElement) {
    const quoteRef = firebase.firestore().collection("characterQuotes").doc(character);
    const quoteDoc = await quoteRef.get();

    if (quoteDoc.exists) {
        const userQuotes = quoteDoc.data().userQuotes || {};
        if (userQuotes[username] && userQuotes[username][index]) {
            inputElement.value = userQuotes[username][index]; // Hiển thị thoại cũ
        }
    }
}

async function submitCustomQuotes() {
    const username = localStorage.getItem("username");
    if (!username) return;

    const selectedCharacter = localStorage.getItem("selectedCharacter") || "Vương";
    const inputs = document.querySelectorAll(".custom-quote-input");

    let newQuotes = [];
    inputs.forEach(input => {
        if (input.value.trim() !== "") {
            newQuotes.push(input.value.trim());
        }
    });

    if (newQuotes.length === 0) {
        alert("❌ Không có thoại nào để lưu.");
        return;
    }

    const quoteRef = firebase.firestore().collection("characterQuotes").doc(selectedCharacter);

    try {
        const docSnapshot = await quoteRef.get();
        let existingQuotes = docSnapshot.exists ? docSnapshot.data().userQuotes || {} : {};

        existingQuotes[username] = newQuotes;

        await quoteRef.set({ userQuotes: existingQuotes }, { merge: true });

        alert("✅ Câu thoại đã được cập nhật!");
    } catch (error) {
        console.error("❌ Lỗi khi lưu thoại:", error);
    }
}







const dialogueDatabase = {
    "Vuong (6).png": [
        "ROLL điểm.",
        "Đừng làm chỗ dựa, hãy làm tấm gương sao?",
        "Cậu không được thế này, tuyệt đối không được.",
        "Không thả là bất hạnh của Trung Thảo Đường, thả thì là bất hạnh của tất cả các đội.",
        "Đoán không ra, hầy, đoán không ra.",
        "Khoảng cách này chỉ là tạm thời thôi, cậu có tiềm năng rất lớn!",
        "Cậu vẫn còn rất trẻ, hãy tiếp tục cố gắng, rồi sẽ có một ngày nào đó cậu vượt qua tất cả mọi người.",
        "Nếu như may mắn cũng là sai lầm, vậy thì tôi nguyện ý sai càng thêm sai.",
        "Gánh nặng này... Quá nặng rồi.",
        "Tự tin lên, đừng hoài nghi bản thân.",
        "Rất mong chờ trận đấu tiếp theo với hắn.",
        "Tại thời khắc mấu chốt, anh ấy chưa từng thất bại. Anh ấy có thể thua, nhưng từ trước đến nay chưa từng khiến người khác mất đi niềm tin vào mình.",
        "Giống ở đâu nhỉ...",
        "Rõ ràng là họ đang bị dẫn trước, nhưng khi Vương Kiệt Hi vừa vào sân thì họ trông như chắc chắn sẽ thắng vậy.",
        "Có lẽ là vậy!",
        "Cơ hội thế này e rằng khó mà có được.",
        "Tích cực, chủ động.",
        "Bây giờ, tiếp tục huấn luyện.",
        "Trận đấu tuyệt vời.",
        "Cuối cùng cũng hiểu rồi.",
        "Một trong những tuyển thủ đáng tin cậy nhất trong Liên minh.",
        "Cocacola nhé, cảm ơn.",
        "Tôi nghĩ là tôi có thể.",
        "Đến rồi.",
        "Lười rồi.",
        "Tướng lang cố.",
        "Cậu đùa cái gì? Thời gian của cậu dùng để lãng phí vào việc này sao?",
        "Mỗi người chúng ta đều miễn cưỡng bản thân một chút, nghe theo mong muốn của anh ấy đi?",
        "Ngày mai, ai cũng có ngày mai.",
        "Cậu nghĩ chỉ có hắn mới cân được trình này sao?",
        "Không thể mệt mỏi! Muốn tồn tại trong Liên minh thì phải ngược dòng mà đi.",
        "Ký tên ở đâu?",
        "Trước nay chưa từng xem thường đối thủ nào.",
        "Chênh lệch thực lực không quyết định thắng bại, tranh tài là để chiến thắng, không phải để so sánh.",
        "Cậu muốn thử à?",
        "Tắt điện thoại di động.",
        "Không có gì đặc biệt, chỉ là lối đánh quê mùa nhất.",
        "Phải gánh lấy tương lai của Vi Thảo nhé!",
        "Vương Kiệt Hi và Vương Bất Lưu Hành của anh ấy cứ thế không gì cản nổi, gánh lấy Vi Thảo bay về phía trước.",
        "Có khó dùng không?",
        "Đánh thua cũng không sao, nhưng đừng để mất niềm tin nhé!",
        "Có đôi khi lựa chọn không phải là đúng hay sai, chỉ là cậu có kiên định bước tiếp hay không.",
        "Tôi mong mọi người có thể tiếp tục và học được gì đó.",
        "Nhất định.",
        "Nói nhảm thì có nghĩa lý gì...",
        "Các cậu kiểu gì cũng sẽ gặp lại.",
        "Cậu tự tin quá nhỉ?",
        "Vi Thảo mới là lựa chọn tốt nhất.",
        "Dùng lối đánh em thoải mái nhất, am hiểu nhất, quen thuộc nhất là được rồi."
    ]
};




