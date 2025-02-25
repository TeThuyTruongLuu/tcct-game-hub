/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    document.getElementById('deviceready').classList.add('ready');
}

document.addEventListener("deviceready", function() {
    document.addEventListener("backbutton", function(e) {
        const loginModal = document.getElementById("login-modal");
        if (loginModal.style.display === "none") {
            e.preventDefault(); // 🔥 Ngăn không quay lại màn hình đăng nhập
            navigator.app.exitApp(); // 🔥 Thoát ứng dụng luôn
        }
    }, false);
}, false);


// Kiểm tra nếu Firebase đã được khởi tạo
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

async function loadLeaderboard(game) {
    const leaderboardContent = document.getElementById("leaderboard-content");

    leaderboardContent.innerHTML = `<h3>Bảng xếp hạng</h3>`;

    const scoresRef = firebase.firestore().collection("userScores");
    const q = scoresRef.where("game", "==", game).orderBy("score", "desc").limit(10);

    try {
        const querySnapshot = await q.get();
        let html = `<table><tr><th>Người chơi</th><th>Điểm</th></tr>`;

        if (querySnapshot.empty) {
            html += `<tr><td colspan="2">Chưa có dữ liệu</td></tr>`;
        } else {
            querySnapshot.forEach((doc) => {
                html += `<tr><td>${doc.data().username}</td><td>${doc.data().score}</td></tr>`;
            });
        }

        html += `</table>`;
        leaderboardContent.innerHTML += html;
    } catch (error) {
        console.error(`❌ Lỗi khi lấy bảng xếp hạng cho ${game}:`, error);
    }
}



function logout() {
    localStorage.removeItem("username"); // Xóa tên đăng nhập khỏi bộ nhớ
    location.reload(); // Tải lại trang để về màn hình đăng nhập
}


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

function formatDate(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0 nên +1
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}


let personalScoresVisible = false; // Biến để kiểm tra trạng thái hiển thị

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



let leaderboardVisible = false; // Biến để kiểm tra trạng thái hiển thị


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
            totalScore += doc.data().score; // Cộng điểm cao nhất của từng game
        });

        console.log(`🔥 Tổng điểm của ${username}: ${totalScore}`);
        document.getElementById("user-points").innerText = totalScore;
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật tổng điểm:", error);
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


function getRandomDialogue(character) {
    const dialogues = dialogueDatabase[character] || ["Xin chào! Tôi là trợ thủ của bạn!"];
    return dialogues[Math.floor(Math.random() * dialogues.length)];
}

function updateCallout() {
    const characterImage = "Vuong (6).png"; // Sau này có thể thay đổi theo lựa chọn người dùng
    document.getElementById("callout-avatar").src = `2048/images/${characterImage}`;
    document.getElementById("callout-bubble").innerText = getRandomDialogue(characterImage);
}

// Chạy khi trang tải xong
document.addEventListener("DOMContentLoaded", updateCallout);
