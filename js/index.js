document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    document.getElementById('deviceready').classList.add('ready');
}

document.addEventListener("deviceready", function() {
    document.addEventListener("backbutton", function(e) {
        const loginModal = document.getElementById("login-modal");
        if (loginModal.style.display === "none") {
            e.preventDefault();
            navigator.app.exitApp();
        }
    }, false);
}, false);

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
}

const db = firebase.firestore();

const characterImagesData = {
    "Du": [
        "2048/images/Du_1.jpg",
        "2048/images/Du_2.jpg",
        "2048/images/Du_3.jpg",
        "2048/images/Du_4.jpg",
        "2048/images/Du_5.jpg",
        "2048/images/Du_6.jpg",
        "2048/images/Du_7.jpg",
        "2048/images/Du_8.jpg"
    ],
    "Khuu": [
        "2048/images/Khuu_1.jpg",
        "2048/images/Khuu_2.jpg",
        "2048/images/Khuu_3.jpg",
        "2048/images/Khuu_4.jpg",
        "2048/images/Khuu_5.jpg",
        "2048/images/Khuu_6.jpg",
        "2048/images/Khuu_7.jpg",
        "2048/images/Khuu_8.jpg"
    ],
    "Lac": [
        "2048/images/Lac_1.jpg",
        "2048/images/Lac_2.jpg",
        "2048/images/Lac_3.jpg",
        "2048/images/Lac_4.jpg",
        "2048/images/Lac_5.jpg",
        "2048/images/Lac_6.jpg",
        "2048/images/Lac_7.jpg",
        "2048/images/Lac_8.jpg"
    ],
    "Vuong": [
        "2048/images/Vuong_1.jpg",
        "2048/images/Vuong_2.jpg",
        "2048/images/Vuong_3.jpg",
        "2048/images/Vuong_4.jpg",
        "2048/images/Vuong_5.jpg",
        "2048/images/Vuong_6.jpg",
        "2048/images/Vuong_7.jpg",
        "2048/images/Vuong_8.jpg"
    ]
};

function removeVietnameseTones(str) {
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

async function fetchCharacterImages(character) {
    const charKey = removeVietnameseTones(character);
    const imagePaths = [];

    for (let i = 1; i <= 8; i++) {
        imagePaths.push(`2048/images/${charKey}_${i}.jpg`);
    }

    return imagePaths;
}

document.addEventListener("DOMContentLoaded", async function () {
    let username = localStorage.getItem("username");
    let selectedCharacter = localStorage.getItem("selectedCharacter") || "Vuong";
    let totalScore = localStorage.getItem("totalScore") ? parseInt(localStorage.getItem("totalScore")) : "N/A";

    if (username) {
        document.getElementById("login-modal").style.display = "none";
        document.getElementById("welcome-message").style.display = "block";
        document.getElementById("display-name").innerText = username;
        document.getElementById("logout-button").style.display = "block";

        document.querySelector(".points").style.display = "block";
        document.querySelector(".scoreboard-container").style.display = "flex";
        document.querySelector(".game-list").style.display = "grid";
        document.getElementById("scoreboard").style.display = "block";
        document.getElementById("character-callout").style.display = "flex";
        document.getElementById("settings-btn-game").style.display = "block";

        const userRef = db.collection("users").doc(username);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            selectedCharacter = userDoc.data().bias || selectedCharacter;
            localStorage.setItem("selectedCharacter", selectedCharacter);
            await updateTotalScore();
        }
    } else {
        document.getElementById("settings-btn-game").style.display = "block";
    }

    document.getElementById("character-select").value = selectedCharacter;
    document.getElementById("user-points").innerText = totalScore;
    
    showRandomCharacterImage();
    showRandomCharacterQuote();
    checkUserPoints();

    const startButton = document.getElementById("start-button");
    if (startButton) {
        startButton.addEventListener("click", async () => {
            const codeInputValue = document.getElementById("code-input").value.trim();
            const nicknameInputValue = document.getElementById("nickname-input").value.trim();

            if (codeInputValue !== "TCCT" || !nicknameInputValue) {
                alert("Nhập đúng mã 'TCCT' và điền tên hợp lệ nha bồ ơi.");
                return;
            }

            const userRef = db.collection("users").doc(nicknameInputValue);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                alert(`Chào mừng trở lại, ${nicknameInputValue}!`);
            } else {
                await userRef.set({ username: nicknameInputValue, bias: "Vuong", totalScore: 0 });
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
            document.getElementById("settings-btn-game").style.display = "block";
        });
    }

    function handleEnterKey(event) {
        if (event.key === "Enter" && startButton) {
            startButton.click();
        }
    }
    document.getElementById("code-input")?.addEventListener("keydown", handleEnterKey);
    document.getElementById("nickname-input")?.addEventListener("keydown", handleEnterKey);

    const playWithoutLoginButton = document.getElementById("play-without-login");
    if (playWithoutLoginButton) {
        playWithoutLoginButton.addEventListener("click", () => {
            document.getElementById("login-modal").style.display = "none";
            document.querySelector(".game-list").style.display = "grid";
            document.querySelector(".points").style.display = "none";
            document.querySelector(".scoreboard-container").style.display = "none";
            document.getElementById("scoreboard").style.display = "none";
            document.getElementById("logout-button").style.display = "none";
            document.getElementById("character-callout").style.display = "flex";
            document.getElementById("settings-btn-game").style.display = "block";

            alert("Bồ đang chơi mà không đăng nhập, điểm số sẽ không được lưu!");
        });
    }

    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            tabButtons.forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");

            const game = this.getAttribute("data-game");
            loadLeaderboard(game);
        });
    });

    loadLeaderboard("2048");

    const calloutAvatar = document.getElementById("callout-avatar");
    if (calloutAvatar) {
        calloutAvatar.addEventListener("click", function () {
            showRandomCharacterImage();
            showRandomCharacterQuote();
        });
    }
});

function logout() {
    localStorage.clear();
    location.reload();
}

async function saveScoreToDB(game, newScore) {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Bạn chưa đăng nhập, điểm sẽ không được lưu!");
        return;
    }

    const scoreDocId = `${username}-${game}`;
    const scoreRef = firebase.firestore().collection("userScores").doc(scoreDocId);

    try {
        const docSnapshot = await scoreRef.get();
        if (!docSnapshot.exists) {
            await scoreRef.set({
                username: username,
                game: game,
                score: newScore,
                updatedAt: new Date().toISOString()
            });
        } else {
            const oldScore = docSnapshot.data().score;
            if (newScore > oldScore) {
                await scoreRef.update({
                    score: newScore,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        updateTotalScore();
    } catch (error) {
        console.error(error);
    }
}

window.saveScoreToDB = saveScoreToDB;

let personalScoresVisible = false;
let leaderboardVisible = false;

async function loadLeaderboard(game) {
    const leaderboardContent = document.getElementById("leaderboard-content");

    if (!game) {
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
        console.error(error);
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

async function showPersonalScores() {
    const scoreboard = document.getElementById("scoreboard");

    if (personalScoresVisible) {
        scoreboard.innerHTML = "";
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
            html += `<tr><td colspan="3">N/A</td></tr>`;
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const formattedDate = formatDate(data.updatedAt);
                html += `<tr><td>${data.game}</td><td>${data.score}</td><td>${formattedDate}</td></tr>`;
            });
        }

        html += "</table>";
        scoreboard.innerHTML = html;
        personalScoresVisible = true;
    } catch (error) {
        console.error(error);
    }
}

async function showLeaderboard() {
    const leaderboardSection = document.getElementById("leaderboard-section");
    if (leaderboardSection.style.display === "none") {
        leaderboardSection.style.display = "block";
        loadLeaderboard("2048");
    } else {
        leaderboardSection.style.display = "none";
    }
}

async function updateTotalScore() {
    const username = localStorage.getItem("username");
    const totalScoreElement = document.getElementById("user-points");

    if (!username) {
        totalScoreElement.innerText = "N/A";
        return;
    }

    let cachedScore = localStorage.getItem("totalScore");
    if (cachedScore !== null && cachedScore !== "0") {
        totalScoreElement.innerText = cachedScore;
    } else {
        totalScoreElement.innerText = "N/A";
        localStorage.setItem("totalScore", "N/A");
    }

    if (!navigator.onLine) {
        return;
    }

    const scoresRef = firebase.firestore().collection("userScores");
    const q = scoresRef.where("username", "==", username);

    try {
        const querySnapshot = await q.get();
        let totalScore = 0;

        if (querySnapshot.empty) {
            totalScoreElement.innerText = "N/A";
            localStorage.setItem("totalScore", "N/A");
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            totalScore += data.score;
        });

        if (totalScore === 0) {
            totalScoreElement.innerText = "N/A";
            localStorage.setItem("totalScore", "N/A");
        } else {
            totalScoreElement.innerText = totalScore;
            localStorage.setItem("totalScore", totalScore);
        }

        const userRef = firebase.firestore().collection("users").doc(username);
        await userRef.set({ totalScore }, { merge: true });
    } catch (error) {
        console.error(error);
        totalScoreElement.innerText = cachedScore || "N/A";
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
                const totalTimeInSeconds = totalTimeParts[0] * 60 + totalTimeParts[1];
                await scoresRef.doc(doc.id).update({
                    totalTimeInSeconds: totalTimeInSeconds
                });
                count++;
            }
        });
    } catch (error) {
        console.error(error);
    }
}

updateOldLeaderboardData();

document.addEventListener("DOMContentLoaded", function () {
    const settingsButton = document.getElementById("settings-btn-game");
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

async function loadUserBias() {
    const username = localStorage.getItem("username");
    let selectedCharacter = localStorage.getItem("selectedCharacter");  

    if (!selectedCharacter) {
        selectedCharacter = "Vuong";
        localStorage.setItem("selectedCharacter", selectedCharacter);
    }

    if (username) {
        const userRef = db.collection("users").doc(username);
        const userDoc = await userRef.get();

        if (userDoc.exists && userDoc.data().bias) {
            selectedCharacter = userDoc.data().bias;
            localStorage.setItem("selectedCharacter", selectedCharacter);
        } else {
            await userRef.set({ bias: selectedCharacter }, { merge: true });
        }
    }

    document.getElementById("character-select").value = selectedCharacter;
    return selectedCharacter;
}

async function setSelectedCharacter() {
    const characterSelect = document.getElementById("character-select");
    const selectedCharacter = characterSelect?.value || "Vuong";
    localStorage.setItem("selectedCharacter", selectedCharacter);

    const username = localStorage.getItem("username");
    if (username) {
        const userRef = db.collection("users").doc(username);
        await userRef.set({ bias: selectedCharacter }, { merge: true });
    }

    showRandomCharacterImage();
    showRandomCharacterQuote();
    checkUserPoints();
}

async function fetchCharacterQuotes(character) {
    let dialogues = JSON.parse(localStorage.getItem(`dialogues_${character}`)) || [];
    if (dialogues.length > 0) {
        return dialogues;
    }

    const quoteRef = db.collection("characterQuotes").doc(character);
    const quoteDoc = await quoteRef.get();

    if (quoteDoc.exists) {
        const data = quoteDoc.data();
        const defaultQuotes = data.quotes || [];
        const userQuotes = Object.values(data.userQuotes || {}).flat();
        dialogues = [...defaultQuotes, ...userQuotes];
        localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));
        return dialogues;
    }

    return ["Xin chào! Tôi sẽ là trợ thủ của bạn!"];
}

async function showRandomCharacterImage() {
    const character = localStorage.getItem("selectedCharacter") || "Vuong";
	const charKey = removeVietnameseTones(character);
    let images = JSON.parse(localStorage.getItem(`images_${charKey}`)) || [];

    if (images.length === 0) {
        images = await fetchCharacterImages(character);
        localStorage.setItem(`images_${charKey}`, JSON.stringify(images));
    }

    if (images.length === 0) {
        return;
    }

    const calloutAvatar = document.getElementById("callout-avatar");
    const currentImage = calloutAvatar.src;
    const availableImages = images.filter(img => !currentImage.includes(img));
    const finalImages = availableImages.length > 0 ? availableImages : images;

    const randomImage = finalImages[Math.floor(Math.random() * finalImages.length)];
    calloutAvatar.src = randomImage;
}

async function showRandomCharacterQuote() {
    const character = localStorage.getItem("selectedCharacter") || "Vuong";
    let dialogues = JSON.parse(localStorage.getItem(`dialogues_${character}`)) || [];

    if (dialogues.length === 0) {
        try {
            dialogues = await fetchCharacterQuotes(character);
            localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));
        } catch (error) {
            console.error(error);
        }
    }

    if (dialogues.length > 0) {
        const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
        document.getElementById("callout-bubble").innerText = randomDialogue;
    }
}

async function checkUserPoints() {
    const username = localStorage.getItem("username");
    if (!username) {
        return;
    }

    const selectedCharacter = localStorage.getItem("selectedCharacter") || "Vuong";
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();

    let totalPoints = userDoc.exists ? (userDoc.data().totalScore || 0) : 0;
    const allowedQuotes = Math.floor(totalPoints / 1000);
    const existingQuotes = await fetchUserQuotes(selectedCharacter, username);
    
    if (existingQuotes.length > 0) {
        displayQuoteInputs(existingQuotes, allowedQuotes);
        return;
    }

    if (allowedQuotes > 0) {
        displayQuoteInputs([], allowedQuotes);
    } else {
        document.getElementById("custom-quote-section").style.display = "none";
    }
}

function displayQuoteInputs(existingQuotes, allowedQuotes) {
    const customQuoteSection = document.getElementById("custom-quote-section");
    const quoteMessage = document.getElementById("quote-message");
    const inputContainer = document.getElementById("custom-quote-container");

    inputContainer.innerHTML = ""; // clear old

    if (allowedQuotes === 0 && existingQuotes.length === 0) {
        customQuoteSection.style.display = "none";
        return;
    }

    customQuoteSection.style.display = "block";
    quoteMessage.innerText = existingQuotes.length > 0
        ? "📜 Thoại đã nhập trước đó:"
        : `💬 Bạn có thể nhập tối đa ${allowedQuotes} câu thoại.`;

    const totalInputs = Math.max(existingQuotes.length, allowedQuotes);

    for (let i = 0; i < totalInputs; i++) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "custom-quote";
        input.placeholder = `Câu thoại ${i + 1}`;
        input.value = existingQuotes[i] || "";
        inputContainer.appendChild(input);
    }
}

async function submitCustomQuotes() {
    const username = localStorage.getItem("username");
    const selectedCharacter = localStorage.getItem("selectedCharacter") || "Vuong";
    const inputFields = document.querySelectorAll(".custom-quote");

    const quotes = Array.from(inputFields)
                        .map(input => input.value.trim())
                        .filter(text => text);

    if (!username || quotes.length === 0) {
        alert("⚠️ Bạn chưa nhập câu thoại nào.");
        return;
    }

    try {
        const docRef = db.collection("characterQuotes").doc(selectedCharacter);
        const docSnapshot = await docRef.get();

        let existingUserQuotes = docSnapshot.exists ? docSnapshot.data().userQuotes || {} : {};
        existingUserQuotes[username] = quotes;

        await docRef.set({ userQuotes: existingUserQuotes }, { merge: true });
        alert("✅ Thoại đã được cập nhật thành công!");

        localStorage.setItem(`dialogues_${selectedCharacter}`, JSON.stringify(quotes));
        displayQuoteInputs(quotes, Math.floor(localStorage.getItem("totalScore") / 1000));
    } catch (error) {
        console.error(error);
        alert("❌ Đã xảy ra lỗi khi cập nhật thoại.");
    }
}

async function fetchUserQuotes(character, username) {
    try {
        const docRef = db.collection("characterQuotes").doc(character);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const userQuotes = data.userQuotes?.[username] || [];
            return Array.isArray(userQuotes) ? userQuotes : [userQuotes];
        }
        return [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function downloadCharacterData() {
    const character = localStorage.getItem("selectedCharacter") || "Vuong";

    if (character === "Khác") {
        alert("Bạn không thể tải nhân vật 'Khác', hãy liên hệ Phong.");
        return;
    }

    localStorage.removeItem(`images_${character}`);
    localStorage.removeItem(`dialogues_${character}`);

    const images = await fetchCharacterImages(character);
    const dialogues = await fetchCharacterQuotes(character);

    if (images.length > 0 && dialogues.length > 0) {
        localStorage.setItem(`images_${character}`, JSON.stringify(images));
        localStorage.setItem(`dialogues_${character}`, JSON.stringify(dialogues));

        setTimeout(() => {
            showRandomCharacterImage();
            showRandomCharacterQuote();
        }, 300);
        
        alert("✅ Đã tải thành công!");
    } else {
        alert("❌ Không thể tải dữ liệu, kiểm tra kết nối mạng.");
    }
}