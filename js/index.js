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
    
    const closeSettingsButton = document.getElementById("close-settings");

    if (settingsButton && settingsModal) {
        settingsButton.addEventListener("click", function () {
            settingsModal.style.display = "block";
            
        });
    }

    if (closeSettingsButton) {
        closeSettingsButton.addEventListener("click", function () {
            settingsModal.style.display = "none";
            
        });
    }
});



function adjustSettingButton() {
    const settingBtn = document.getElementById("settings-btn");
    const h1 = document.querySelector("h1");

    if (settingBtn && h1) {
        const h1Rect = h1.getBoundingClientRect();
        settingBtn.style.top = `${h1Rect.top*1.5 + window.scrollY}px`;
        settingBtn.style.right = `5vw`;
    }
}

// Gọi lại khi load trang và khi thay đổi kích thước cửa sổ
window.onload = adjustSettingButton;
window.onresize = adjustSettingButton;


//Chọn bias
document.addEventListener("DOMContentLoaded", async function () {
    console.log("🔥 DOM đã load xong!");

    const selectedCharacter = await loadUserBias(); // Tải bias đúng
    await showRandomCharacterImage(); // Hiển thị hình ảnh nhân vật
    await showRandomCharacterQuote(); // Hiển thị thoại nhân vật
    await checkUserPoints(); // Kiểm tra điểm để hiển thị ô nhập thoại
});

async function loadUserBias() {
    console.log("🔄 Đang tải bias của user...");

    const username = localStorage.getItem("username");
    let selectedCharacter = "Vương"; // Mặc định là Vương

    if (username) {
        const userRef = db.collection("users").doc(username);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data().bias) {
            selectedCharacter = userDoc.data().bias; // Nếu user có bias, lấy từ Firestore
        } else {
            // Nếu user chưa có bias, lưu mặc định là "Vương"
            await userRef.set({ bias: "Vương" }, { merge: true });
        }
    }

    // 🔥 Lưu bias vào LocalStorage để reload không mất
    localStorage.setItem("selectedCharacter", selectedCharacter);
    document.getElementById("character-select").value = selectedCharacter;

    console.log(`✅ Bias đã tải: ${selectedCharacter}`);

    return selectedCharacter;
}

async function setSelectedCharacter() {
    const characterSelect = document.getElementById("character-select");
    const selectedCharacter = characterSelect?.value || "Vương";

    console.log(`🔄 Người chơi đã chọn nhân vật: ${selectedCharacter}`);

    // 🔥 Luôn lưu vào LocalStorage
    localStorage.setItem("selectedCharacter", selectedCharacter);

    const username = localStorage.getItem("username");

    if (username) {
        // 🔥 Nếu user đã đăng nhập, cập nhật Firestore
        const userRef = db.collection("users").doc(username);
        await userRef.set({ bias: selectedCharacter }, { merge: true });
    }

    // 🔥 Cập nhật ngay hình ảnh & thoại nhân vật mới
    await showRandomCharacterImage();
    await showRandomCharacterQuote();
    await checkUserPoints();
}

async function downloadCharacterData() {
    const character = localStorage.getItem("selectedCharacter") || "Vương";

    console.log(`📥 Đang tải dữ liệu cho nhân vật: ${character}`);

    if (character === "Khác") {
        alert("Bạn không thể tải nhân vật 'Khác', hãy liên hệ Phong.");
        return;
    }

    // 🔥 Xóa dữ liệu nhân vật cũ trước khi tải dữ liệu mới
    localStorage.removeItem(`images_${character}`);
    localStorage.removeItem(`dialogues_${character}`);

    // 🔄 Tải ảnh và thoại từ Firestore
    const images = await fetchCharacterImages(character);
    const dialogues = await fetchCharacterQuotes(character);

    // ✅ Lưu vào localStorage để dùng offline
    localStorage.setItem(`images_${character}`, JSON.stringify(images));
    localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));

    if (images.length > 0 && dialogues.length > 0) {
        alert(`✅ Dữ liệu của ${character} đã được lưu để dùng offline!`);

        setTimeout(() => {
            showRandomCharacterImage();
            showRandomCharacterQuote();
        }, 300);
    } else {
        alert("❌ Không thể tải dữ liệu, kiểm tra kết nối mạng.");
    }
}

async function fetchCharacterImages(character) {
    const imageRef = db.collection("characterImages").doc(character);
    const imageDoc = await imageRef.get();

    if (imageDoc.exists) {
        console.log(`📷 Ảnh của ${character} đã tải từ Firestore.`);
        return imageDoc.data().images || [];
    }
    
    console.warn(`⚠️ Không tìm thấy ảnh của ${character}, dùng ảnh mặc định.`);
    return ["https://i.imgur.com/default.png"];
}

async function fetchCharacterQuotes(character) {
    const quoteRef = db.collection("characterQuotes").doc(character);
    const quoteDoc = await quoteRef.get();

    if (quoteDoc.exists) {
        console.log(`💬 Thoại của ${character} đã tải từ Firestore.`);
        return quoteDoc.data().quotes || [];
    }
    
    console.warn(`⚠️ Không tìm thấy thoại của ${character}, dùng thoại mặc định.`);
    return ["Xin chào! Tôi là trợ thủ của bạn!"];
}

async function showRandomCharacterImage() {
    const character = localStorage.getItem("selectedCharacter") || "Vương";
    let images = JSON.parse(localStorage.getItem(`images_${character}`)) || [];

    if (images.length === 0) {
        images = await fetchCharacterImages(character);
        localStorage.setItem(`images_${character}`, JSON.stringify(images));
    }

    const randomImage = images[Math.floor(Math.random() * images.length)];
    document.getElementById("callout-avatar").src = randomImage;

    console.log(`🖼️ Hiển thị ảnh nhân vật: ${character} - ${randomImage}`);
}

async function showRandomCharacterQuote() {
    const character = localStorage.getItem("selectedCharacter") || "Vương";
    let dialogues = JSON.parse(localStorage.getItem(`dialogues_${character}`)) || [];

    if (dialogues.length === 0) {
        dialogues = await fetchCharacterQuotes(character);
        localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));
    }

    const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    document.getElementById("callout-bubble").innerText = randomDialogue;

    console.log(`💬 Hiển thị thoại nhân vật: ${character} - "${randomDialogue}"`);
}

async function setSelectedCharacter() {
    const characterSelect = document.getElementById("character-select");
    const selectedCharacter = characterSelect?.value || "Vương";

    console.log(`🔄 Người chơi đã chọn nhân vật: ${selectedCharacter}`);

    // 🔥 Luôn lưu vào LocalStorage
    localStorage.setItem("selectedCharacter", selectedCharacter);

    const username = localStorage.getItem("username");

    if (username) {
        // 🔥 Nếu user đã đăng nhập, cập nhật Firestore
        const userRef = db.collection("users").doc(username);
        await userRef.set({ bias: selectedCharacter }, { merge: true });
    }

    // 🔥 Tải dữ liệu nhân vật mới
    await downloadCharacterData();
    await checkUserPoints(); // 🔥 Kiểm tra & hiển thị ô nhập thoại
}

async function checkUserPoints() {
    const username = localStorage.getItem("username");
    if (!username) {
        return;
    }

    const selectedCharacter = localStorage.getItem("selectedCharacter") || "Vương";
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();

    let totalPoints = userDoc.exists ? (userDoc.data().totalScore || 0) : 0;
    console.log(`📝 Tổng điểm của ${username}: ${totalPoints}`);

    const allowedQuotes = Math.floor(totalPoints / 1000);
    console.log(`💬 Số ô thoại được phép nhập: ${allowedQuotes}`);

    // 🔥 Lấy thoại đã lưu và hiển thị
    const existingQuotes = await fetchUserQuotes(selectedCharacter, username);
    
    if (existingQuotes.length > 0) {
        console.log(`✅ Đã tìm thấy thoại cũ của ${selectedCharacter}, hiển thị ngay.`);
        displayQuoteInputs(existingQuotes, allowedQuotes);
        return;
    }

    if (allowedQuotes > 0) {
        console.log(`✅ User có ${totalPoints} điểm, đủ điều kiện nhập thoại.`);
        displayQuoteInputs([], allowedQuotes);
    } else {
        console.log(`❌ User chưa có đủ điểm (${totalPoints} điểm), ẩn ô nhập thoại.`);
        document.getElementById("custom-quote-section").style.display = "none";
    }
}


function displayQuoteInputs(existingQuotes, allowedQuotes) {
    const customQuoteSection = document.getElementById("custom-quote-section");
    const quoteMessage = document.getElementById("quote-message");
    const inputField = document.getElementById("custom-quote"); // Ô nhập thoại

    // 🔥 Nếu user chưa đủ điểm và chưa có thoại, ẩn phần nhập thoại
    if (allowedQuotes === 0 && existingQuotes.length === 0) {
        customQuoteSection.style.display = "none";
        return;
    }

    // 🔥 Hiển thị phần nhập thoại
    customQuoteSection.style.display = "block";

    // 🔥 Nếu đã có thoại, hiển thị lại
    if (existingQuotes.length > 0) {
        quoteMessage.innerText = "Thoại đã nhập trước đó:";
        inputField.value = existingQuotes[0] || ""; // Hiển thị câu thoại đã nhập
    } else {
        quoteMessage.innerText = `💬 Bạn có thể nhập tối đa ${allowedQuotes} câu thoại.`;
        inputField.value = ""; // Nếu chưa nhập, để input rỗng
    }
}



async function submitCustomQuotes() {
    const username = localStorage.getItem("username");
    if (!username) {
        return;
    }

    const selectedCharacter = localStorage.getItem("selectedCharacter") || "Vương";
    const quoteInputs = document.querySelectorAll(".custom-quote-input");

    const quotes = [];
    quoteInputs.forEach(input => {
        if (input.value.trim() !== "") {
            quotes.push(input.value.trim());
        }
    });

    if (quotes.length === 0) {
        alert("⚠️ Bạn chưa nhập câu thoại nào.");
        return;
    }

    try {
        const userQuoteRef = db.collection("userQuotes").doc(username);
        await userQuoteRef.set({ [selectedCharacter]: quotes }, { merge: true });

        console.log(`✅ Đã lưu thoại cho ${selectedCharacter}: ${JSON.stringify(quotes)}`);
        alert("✅ Thoại đã được lưu thành công!");
    } catch (error) {
        console.error("❌ Lỗi khi lưu thoại:", error);
        alert("❌ Đã xảy ra lỗi khi lưu thoại, thử lại sau.");
    }
}

async function fetchUserQuotes(character, username) {
    try {
        console.log(`📥 Đang lấy thoại của ${character} cho user ${username}...`);

        const docRef = db.collection("characterQuotes").doc(character);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const userQuotes = data.userQuotes || {};  // 🟢 Object chứa thoại user nhập
            //const defaultQuotes = data.quotes || [];   // 🟢 Danh sách thoại mặc định
            
            const userQuote = userQuotes[username] || "";  // 🔥 Thoại user đã nhập (nếu có)

            console.log(`✅ Thoại user đã tải: ${userQuote}`);
            //console.log(`✅ Thoại mặc định đã tải:`, defaultQuotes);

            return userQuote //? [userQuote] : defaultQuotes; // Nếu user có thoại thì lấy, nếu không thì dùng mặc định
        } else {
            console.log(`⚠️ Không tìm thấy thoại của ${character} trong database.`);
            return [];
        }
    } catch (error) {
        console.error("❌ Lỗi khi lấy thoại user:", error);
        return [];
    }
}
