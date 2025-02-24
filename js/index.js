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

// Kiểm tra nếu Firebase đã khởi tạo
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
    console.log("🔥 Firebase đã được khởi tạo trong index.js!");
}

// Lấy Firestore
const db = firebase.firestore();

// Đảm bảo script chỉ chạy sau khi DOM đã load
document.addEventListener("DOMContentLoaded", function () {
    console.log("🔥 DOM đã load xong!");

    // Kiểm tra nếu Firebase đã khởi tạo
    if (!firebase.apps.length) {
        console.error("❌ Firebase chưa được khởi tạo!");
        return;
    }

    // Kiểm tra nếu các button có tồn tại
    const startButton = document.getElementById("start-button");
    const playWithoutLoginButton = document.getElementById("play-without-login");

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

            localStorage.setItem("username", nicknameInput);

            // Ẩn modal và hiển thị game
            document.getElementById("login-modal").style.display = "none";
            document.getElementById("welcome-message").style.display = "block";
            document.getElementById("display-name").innerText = nicknameInput;

            document.querySelector(".points").style.display = "block";
            document.querySelector(".scoreboard-container").style.display = "flex";
            document.querySelector(".game-list").style.display = "grid";
            document.getElementById("scoreboard").style.display = "block";
        });
    } else {
        console.error("❌ Nút 'Bắt đầu' không tồn tại!");
    }

    if (playWithoutLoginButton) {
        playWithoutLoginButton.addEventListener("click", () => {
            console.log("🎮 Chơi không đăng nhập");

            document.getElementById("login-modal").style.display = "none";
            document.querySelector(".game-list").style.display = "grid";
            document.querySelector(".points").style.display = "none";
            document.querySelector(".scoreboard-container").style.display = "none";
            document.getElementById("scoreboard").style.display = "none";

            alert("Bạn đang chơi mà không đăng nhập, điểm số sẽ không được lưu!");
        });
    } else {
        console.error("❌ Nút 'Chơi không đăng nhập' không tồn tại!");
    }
});


async function saveHighScore(gameName, score) {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Bạn cần đăng nhập để lưu điểm!");
        return;
    }

    const userScoreRef = doc(db, "userScores", username + "_" + gameName);
    const userScoreDoc = await getDoc(userScoreRef);

    if (!userScoreDoc.exists() || score > userScoreDoc.data().score) {
        await setDoc(userScoreRef, {
            username,
            game: gameName,
            score,
            updatedAt: new Date().toISOString()
        });
    }
}


async function showPersonalScores() {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Bạn cần đăng nhập!");
        return;
    }

    const q = query(collection(db, "userScores"));
    const querySnapshot = await getDocs(q);

    let html = "<h2>Bảng điểm cá nhân</h2><table><tr><th>Game</th><th>Điểm cao nhất</th><th>Thời gian</th></tr>";
    querySnapshot.forEach((doc) => {
        if (doc.data().username === username) {
            html += `<tr><td>${doc.data().game}</td><td>${doc.data().score}</td><td>${doc.data().updatedAt}</td></tr>`;
        }
    });
    html += "</table>";

    document.getElementById("scoreboard").innerHTML = html;
}


async function showLeaderboard() {
    let html = "<h2>Bảng kỷ lục</h2>";

    const gameNames = ["2048", "Lật hình", "Thần quyết", "Nối hình"];
    for (let game of gameNames) {
        html += `<h3>${game}</h3><table><tr><th>Người chơi</th><th>Điểm</th></tr>`;
        const q = query(collection(db, "userScores"), where("game", "==", game), orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            html += `<tr><td>${doc.data().username}</td><td>${doc.data().score}</td></tr>`;
        });

        html += "</table>";
    }

    document.getElementById("scoreboard").innerHTML = html;
}

