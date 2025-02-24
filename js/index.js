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

    if (savedUsername) {
        console.log(`🔄 Tự động đăng nhập: ${savedUsername}`);
        document.getElementById("login-modal").style.display = "none";
        document.getElementById("welcome-message").style.display = "block";
        document.getElementById("display-name").innerText = savedUsername;

        document.querySelector(".points").style.display = "block";
        document.querySelector(".scoreboard-container").style.display = "flex";
        document.querySelector(".game-list").style.display = "grid";
        document.getElementById("scoreboard").style.display = "block";
		document.getElementById("logout-button").style.display = "block";
        updateTotalScore();
    }


	if (startButton) {
		startButton.addEventListener("click", async () => {
			const codeInput = document.getElementById("code-input").value.trim();
			const nicknameInput = document.getElementById("nickname-input").value.trim();

			if (codeInput !== "TCCT" || !nicknameInput) {
				alert("Nhập đúng mã 'TCCT' và điền tên hợp lệ nha bồ ơi.");
				return;
			}

			console.log(`📌 Đăng nhập với tên: ${nicknameInput}`);

			const userRef = db.collection("users").doc(nicknameInput);
			const userDoc = await userRef.get();

			if (userDoc.exists) {
				alert(`Chào mừng trở lại, ${nicknameInput}!`);
			} else {
				await userRef.set({ username: nicknameInput });
				alert(`Tạo tài khoản thành công! Xin chào, ${nicknameInput}.`);
			}

			localStorage.setItem("username", nicknameInput); // 🔥 LƯU username vào bộ nhớ thiết bị

			document.getElementById("login-modal").style.display = "none";
			document.getElementById("welcome-message").style.display = "block";
			document.getElementById("display-name").innerText = nicknameInput;

			document.querySelector(".points").style.display = "block";
			document.querySelector(".scoreboard-container").style.display = "flex";
			document.querySelector(".game-list").style.display = "grid";
			document.getElementById("scoreboard").style.display = "block";
			document.getElementById("logout-button").style.display = "block";

			updateTotalScore();
		});
	}

});



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
                html += `<tr><td>${doc.data().game}</td><td>${doc.data().score}</td><td>${doc.data().updatedAt}</td></tr>`;
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
    const scoreboard = document.getElementById("scoreboard");

    if (leaderboardVisible) {
        scoreboard.innerHTML = ""; // Ẩn bảng điểm khi bấm lại
        leaderboardVisible = false;
        return;
    }

    let html = "<h2>Bảng kỷ lục</h2>";
    const gameNames = ["2048", "Lật hình", "Nối hình"]; // Bỏ "Thần quyết" khỏi danh sách

    for (let game of gameNames) {
        html += `<h3>${game}</h3><table><tr><th>Người chơi</th><th>Điểm</th></tr>`;

        const scoresRef = firebase.firestore().collection("userScores");
        const q = scoresRef.where("game", "==", game).orderBy("score", "desc").limit(10);

        try {
            const querySnapshot = await q.get();
            
            if (querySnapshot.empty) {
                html += `<tr><td colspan="2">N/A</td></tr>`; // Nếu không có ai chơi game này, hiển thị "N/A"
            } else {
                querySnapshot.forEach((doc) => {
                    html += `<tr><td>${doc.data().username}</td><td>${doc.data().score}</td></tr>`;
                });
            }

            html += "</table>";
        } catch (error) {
            console.error(`❌ Lỗi khi lấy bảng kỷ lục cho game ${game}:`, error);
        }
    }

    scoreboard.innerHTML = html;
    leaderboardVisible = true; // Đánh dấu bảng kỷ lục đang hiển thị
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

