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

// Thêm Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBtpLSSNBj9lHtzibLh5QSRAPg3iQ46Q3g",
  authDomain: "tcct-minigames.firebaseapp.com",
  projectId: "tcct-minigames",
  storageBucket: "tcct-minigames.firebasestorage.app",
  messagingSenderId: "604780847536",
  appId: "1:604780847536:web:f8015bde5ef469b04c7675",
  measurementId: "G-1GGDZR6VY5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("🔥 Firebase đã kết nối thành công!");

// Kiểm tra kết nối Firestore
async function testFirestore() {
    try {
        const querySnapshot = await getDocs(collection(db, "test"));
        console.log("🔥 Firestore hoạt động tốt, có thể truy vấn dữ liệu!");
    } catch (error) {
        console.error("🚨 Firestore bị lỗi:", error);
    }
}

// Gọi hàm kiểm tra Firestore
testFirestore();

// Mật khẩu chung do bồ đặt
const MASTER_PASSWORD = "TCCT"; 

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("tcctCode").value.trim();

    if (password !== MASTER_PASSWORD) {
        alert("Sai mật khẩu, thử lại!");
        return;
    }

    // Kiểm tra xem tên có tồn tại chưa
    const userRef = doc(db, "users", username);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        // Đã có tên này => Cho đăng nhập luôn
        alert(`Chào mừng trở lại, ${username}!`);
    } else {
        // Chưa có => Tạo tài khoản mới
        await setDoc(userRef, { username });
        alert(`Tạo tài khoản thành công! Xin chào, ${username}.`);
    }

    // Lưu vào localStorage để nhớ người chơi
    localStorage.setItem("username", username);
    
    // Ẩn form đăng nhập, hiển thị tên người chơi
    document.getElementById("login-container").style.display = "none";
    document.getElementById("welcome-message").style.display = "block";
    document.getElementById("display-name").innerText = username;
}

// Kiểm tra nếu có người chơi đang đăng nhập
const savedUsername = localStorage.getItem("username");
if (savedUsername) {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("welcome-message").style.display = "block";
    document.getElementById("display-name").innerText = savedUsername;
}


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

