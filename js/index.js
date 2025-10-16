document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    document.getElementById('deviceready').classList.add('ready');
}

(function () {
  const username = localStorage.getItem("username");
  const isAnonymous = localStorage.getItem("anonymous") === "true";
  const origin = localStorage.getItem("anonymousOrigin");
  const path = location.pathname;
  const onGhPages = location.hostname.endsWith("github.io");
  const homepagePaths = new Set(["/", "/index.html"]);
  if (onGhPages) {
    homepagePaths.add("/tcct-game-hub/");
    homepagePaths.add("/tcct-game-hub/index.html");
  }
  const isHomepage = homepagePaths.has(path);
  const allowedGamePaths = ["/battleship/", "/battleship/index.html"]; // thêm dòng này
  const isAllowedGame = allowedGamePaths.includes(path);
  if (!username && !(isAnonymous && origin === "homepage") && !isHomepage && !isAllowedGame) {
    location.href = onGhPages ? "/tcct-game-hub/" : "/";
  }
})();

document.addEventListener("deviceready", function() {
    document.addEventListener("backbutton", function(e) {
        const loginModal = document.getElementById("login-modal");
        if (loginModal.style.display === "none") {
            e.preventDefault();
            navigator.app.exitApp();
        }
    }, false);
}, false);

if (location.protocol === 'file:' || location.hostname === 'localhost') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

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

window.addEventListener('load', () => {
  const appCheck = firebase.appCheck();
  appCheck.activate('6Lce2bMrAAAAADjXD0PhQZE4ub30USoxX2zRrp12', true);
});

const db = firebase.firestore();
window.db = db;

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
	document.querySelector(".carousel-wrapper").style.display = "none";
	document.querySelector(".nav-dots").style.display = "none";
	document.querySelector(".page-title").style.display = "none";

    if (username) {
        document.getElementById("login-modal").style.display = "none";
        document.getElementById("welcome-message").style.display = "block";
        document.getElementById("display-name").innerText = username;
        document.getElementById("logout-button").style.display = "block";

        document.querySelector(".points").style.display = "block";
        document.querySelector(".scoreboard-container").style.display = "flex";
        document.querySelector(".carousel-wrapper").style.display = "grid";
		document.querySelector(".nav-dots").style.display = "flex";
		document.querySelector(".page-title").style.display = "block";
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
			document.getElementById("display-name").innerText = username;
			document.getElementById("logout-button").style.display = "block";

			document.querySelector(".points").style.display = "block";
			document.querySelector(".scoreboard-container").style.display = "flex";
			document.querySelector(".carousel-wrapper").style.display = "grid";
			document.querySelector(".nav-dots").style.display = "flex";
			document.querySelector(".page-title").style.display = "block";
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
		localStorage.setItem("anonymous", "true");
		localStorage.setItem("anonymousOrigin", "homepage");
		document.getElementById("login-modal").style.display = "none";
		document.querySelector(".game-list").style.display = "grid";
		document.querySelector(".carousel-wrapper").style.display = "grid";
		document.querySelector(".nav-dots").style.display = "flex";
		document.querySelector(".page-title").style.display = "block";
		document.querySelector(".points").style.display = "none";
		document.querySelector(".scoreboard-container").style.display = "none";
		document.getElementById("scoreboard").style.display = "none";
		document.getElementById("logout-button").style.display = "none";
		document.getElementById("character-callout").style.display = "flex";
		document.getElementById("settings-btn-game").style.display = "block";

		alert("Bồ đang chơi mà không đăng nhập, điểm số sẽ không được lưu!");
	});
    }

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

    let html = `<h3>Bảng xếp hạng</h3>`;

    const scoresRef = firebase.firestore().collection("userScores");

    let q;
    if (game === "Lật hình" || game === "Sliding") {
        q = scoresRef.where("game", "==", game).orderBy("totalTimeInSeconds", "asc").limit(10); 
    } else {
        q = scoresRef.where("game", "==", game).orderBy("score", "desc").limit(10);
    }

    try {
        const querySnapshot = await q.get();
        if (game === "Lật hình" || game === "Sliding") {
            html += `<table><tr><th>Người chơi</th><th>Thời gian (s)</th><th>Điểm</th></tr>`;
        } else {
            html += `<table><tr><th>Người chơi</th><th>Điểm</th></tr>`;
        }

        if (querySnapshot.empty) {
            html += `<tr><td colspan="${game === "Lật hình" || game === "Sliding" ? 3 : 2}">Chưa có dữ liệu</td></tr>`;
        } else {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (game === "Lật hình" || game === "Sliding") {
                    html += `<tr><td>${data.username}</td><td>${data.totalTime || "N/A"}</td><td>${data.score}</td></tr>`;
                } else {
                    html += `<tr><td>${data.username}</td><td>${data.score}</td></tr>`;
                }
            });
        }

        html += `</table>`;
        leaderboardContent.innerHTML = html;
    } catch (error) {
        console.error(error);
        leaderboardContent.innerHTML = `<h3>Bảng xếp hạng</h3><p>Đã xảy ra lỗi khi tải bảng xếp hạng.</p>`;
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

    } else {
        leaderboardSection.style.display = "none";
    }
}


async function updateTotalScore() {
	if (!firebase.apps.length) {
		console.error("Firebase chưa khởi tạo")
		return
	}
	const username = localStorage.getItem("username")
	const totalScoreElement = document.getElementById("user-points")
	if (!username) {
		totalScoreElement.innerText = "N/A"
		return
	}
	let cachedScore = localStorage.getItem("totalScore")
	if (cachedScore !== null && cachedScore !== "0") {
		totalScoreElement.innerText = cachedScore
	} else {
		totalScoreElement.innerText = "N/A"
		localStorage.setItem("totalScore", "N/A")
	}
	if (!navigator.onLine) {
		return
	}
	const scoresRef = firebase.firestore().collection("userScores")
	const q = scoresRef.where("username", "==", username)
	try {
		const querySnapshot = await q.get()
		let totalScore = 0
		let projectScore = 0
		if (querySnapshot.empty) {
			totalScoreElement.innerText = "N/A"
			localStorage.setItem("totalScore", "N/A")
			return
		}
		querySnapshot.forEach((doc) => {
			const data = doc.data()
			const sc = Number(data.score) || 0
			totalScore += sc
			if (data.game === "2048" || data.game === "Puzzle") {
				projectScore += sc / 3
			} else if (data.game === "Nối hình" || data.game === "Sorting") {
				projectScore += sc / 2
			} else if (data.game === "battleship" || data.game === "Lật hình") {
				projectScore += sc
			}
		})
		if (totalScore === 0) {
			totalScoreElement.innerText = "N/A"
			localStorage.setItem("totalScore", "N/A")
		} else {
			totalScoreElement.innerText = totalScore
			localStorage.setItem("totalScore", totalScore)
		}
		projectScore = Math.floor(projectScore / 10)
		let projectRow = document.getElementById("project-points")
		let noteRow = document.getElementById("project-note")
		if (!projectRow) {
			const p1 = document.createElement("p")
			p1.className = "points"
			p1.id = "project-points"
			p1.innerHTML = `Điểm project noletuban: <span id="project-score">${projectScore}</span>`
			totalScoreElement.parentElement.insertAdjacentElement("afterend", p1)
			const p2 = document.createElement("p")
			p2.id = "project-note"
			p2.style.fontSize = "12px"
			p2.style.opacity = ".8"
			p2.innerText = "* Điểm này chưa tính điểm xếp hạng."
			p1.insertAdjacentElement("afterend", p2)
		} else {
			document.getElementById("project-score").innerText = projectScore
			projectRow.style.display = "block"
			if (noteRow) noteRow.style.display = "block"
		}
		const userRef = firebase.firestore().collection("users").doc(username)
		await userRef.set({ totalScore }, { merge: true })
	} catch (error) {
		console.error(error)
		totalScoreElement.innerText = cachedScore || "N/A"
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
	const btn = document.getElementById("settings-btn-game");
	const modal = document.getElementById("settings-modal");
	const closeBtn = document.getElementById("close-settings");

	if (btn && modal) {
		btn.addEventListener("click", function () {
			modal.style.display = "block";
		});
	}
	if (closeBtn) {
		closeBtn.addEventListener("click", function () {
			modal.style.display = "none";
		});
	}

	const tSpeech = document.querySelector('.set-tab[data-tab="speech"]');
	const tPet = document.querySelector('.set-tab[data-tab="pet"]');
	const paneSpeech = document.getElementById("tab-speech");
	const panePet = document.getElementById("tab-pet");

	if (tSpeech && tPet && paneSpeech && panePet) {
		[tSpeech, tPet].forEach(tab => {
			tab.addEventListener("click", () => {
				tSpeech.classList.remove("active");
				tPet.classList.remove("active");
				tab.classList.add("active");
				const isSpeech = tab.dataset.tab === "speech";
				paneSpeech.style.display = isSpeech ? "block" : "none";
				panePet.style.display = isSpeech ? "none" : "block";
			});
		});
		paneSpeech.style.display = "block";
		panePet.style.display = "none";
	}

	const vuong = new Pet({
		name: "Vuong",
		basePath: "pet/img/vuong/",
		idle: "idle.png",
		kissLeft: "kiss_left.png",
		kissRight: "kiss_right.png",
		actions: {
			walk: ["walk_left_1.png","walk_left_2.png","walk_left_3.png","walk_right_1.png","walk_right_2.png","walk_right_3.png"],
			bounce: [],
			fly: ["fly_idle1.png","fly_idle2.png","fly_left.png","fly_right.png"]
		},
		spawn: { x: 30, y: 200 },
		speed: 90
	});
	const ga = new Pet({
		name: "Ga",
		basePath: "pet/img/walking-chick/",
		idle: "idle.png",
		actions: {
			walk: ["walk_left_1.png","walk_left_2.png","walk_left_3.png","walk_right_1.png","walk_right_2.png","walk_right_3.png"],
			bounce: ["hop_1.webp","hop_2.webp","hop_4.webp","hop_5.webp"],
			fly: []
		},
		spawn: { x: 250, y: 100 },
		speed: 70
	});
	const du = new Pet({
		name: "Du",
		basePath: "pet/img/du/",
		idle: "idle.png",
		kissLeft: "kiss_left.png",
		kissRight: "kiss_right.png",
		actions: {
			walk: ["walk_left_1.png","walk_left_2.png","walk_left_3.png","walk_right_1.png","walk_right_2.png","walk_right_3.png"],
			bounce: [],
			fly: []
		},
		spawn: { x: 160, y: 180 },
		speed: 80
	})
	window._pets = { vuong, ga };
	vuong.node.style.display = "none";
	du.node.style.display = "none";
	ga.node.style.display = "none";

	const elV = document.getElementById("toggle-vuong");
	const elY = document.getElementById("toggle-du");
	const elG = document.getElementById("toggle-ga");

	function apply(state) {
		vuong.node.style.display = state.vuong ? "flex" : "none";
		du.node.style.display    = state.du    ? "flex" : "none";
		ga.node.style.display    = state.ga    ? "flex" : "none";

		if (state.vuong && vuong.state==="idle") vuong._startRandom();
		if (state.du    && du.state==="idle")    du._startRandom();
		if (state.ga    && ga.state==="idle")    ga._startRandom();
	}

	async function load() {
		const username = localStorage.getItem("username");
		let state = { vuong: false, du: false, ga: false };
		if (username) {
			const snap = await db.collection("users").doc(username).get();
			if (snap.exists && snap.data().petToggles) state = snap.data().petToggles;
		} else {
			const raw = localStorage.getItem("petToggles");
			if (raw) state = JSON.parse(raw);
		}
		if (elV) elV.checked = !!state.vuong;
		if (elY) elY.checked = !!state.du;
		if (elG) elG.checked = !!state.ga;
		apply(state);
	}

	async function save() {
		const state = {
			vuong: elV ? elV.checked : false,
			du: elY ? elY.checked : false,
			ga: elG ? elG.checked : false
		};
		const username = localStorage.getItem("username");
		if (username) {
			await db.collection("users").doc(username).set({ petToggles: state }, { merge: true });
		} else {
			localStorage.setItem("petToggles", JSON.stringify(state));
		}
		apply(state);
	}

	if (elV) elV.addEventListener("change", save);
	if (elY) elY.addEventListener("change", save);
	if (elG) elG.addEventListener("change", save);
	load();
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

function scrollTabs(direction) {
    const tabContainer = document.getElementById("gameTabs");
    const scrollAmount = 120;
    tabContainer.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
}

let currentTabPage = 0;

function switchTabPage(direction) {
    const pages = document.querySelectorAll(".tab-page");
    pages[currentTabPage].classList.remove("active");
    currentTabPage = (currentTabPage + direction + pages.length) % pages.length;
    pages[currentTabPage].classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((btn) => {
        btn.addEventListener("click", function () {
            tabs.forEach((b) => b.classList.remove("active"));
            this.classList.add("active");
            loadLeaderboard(this.getAttribute("data-game"));
        });
    });
});

const SHEET_BUN_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSipOhZgsQSx77GrQ684vDS8WwG-d0kfdrU5mqf5ooE2yBvd-WylfduYILmP5CMeqaCkoBpDgutsku/pub?gid=163381156&single=true&output=csv";
const SHEET_TIMELINE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSipOhZgsQSx77GrQ684vDS8WwG-d0kfdrU5mqf5ooE2yBvd-WylfduYILmP5CMeqaCkoBpDgutsku/pub?gid=1837407606&single=true&output=csv";
const SHEET_BANG_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSipOhZgsQSx77GrQ684vDS8WwG-d0kfdrU5mqf5ooE2yBvd-WylfduYILmP5CMeqaCkoBpDgutsku/pub?gid=892637288&single=true&output=csv";

const SHEET_TIMELINE_HTML_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSipOhZgsQSx77GrQ684vDS8WwG-d0kfdrU5mqf5ooE2yBvd-WylfduYILmP5CMeqaCkoBpDgutsku/pubhtml?gid=1837407606&single=true";
let TL_COLOR_MAP = null;

function tl_normKey(s){
	return String(s||"").replace(/[\u2013\u2014]/g,"-").replace(/\s+/g," ").trim().toLowerCase();
}
function tl_baseKey(s){
	return tl_normKey(String(s||"").replace(/\[(?:lr3|ly2)\]/ig,"").replace(/\([^)]*\)\s*$/,"").replace(/[.…]+$/g,""));
}
function cssToHex(c){
	let m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
	if(m) return "#"+[m[1],m[2],m[3]].map(x=>(+x).toString(16).padStart(2,"0")).join("");
	m=c.match(/#([0-9a-f]{3,6})/i);
	if(m){ const v=m[1].toLowerCase(); return "#"+(v.length===3?v.split("").map(ch=>ch+ch).join(""):v); }
	return "";
}
async function tl_fetchColorMap(){
	const html=await fetch(SHEET_TIMELINE_HTML_URL,{cache:"no-store"}).then(r=>r.text());
	const doc=new DOMParser().parseFromString(html,"text/html");

	const styleText=Array.from(doc.querySelectorAll("style")).map(s=>s.textContent||"").join("\n");
	const classBg={};
	let mm, rx=/\.([^{\s]+)\s*\{[^}]*background(?:-color)?\s*:\s*([^;]+);/ig;
	while((mm=rx.exec(styleText))){
		const cls=mm[1], col=cssToHex(mm[2]);
		if(col) classBg[cls]=col;
	}
	const map=new Map();
	doc.querySelectorAll("table.waffle tbody tr td").forEach(td=>{
		const txt=(td.textContent||"").trim();
		if(!txt) return;
		let hex="";
		for(const c of td.classList){ if(classBg[c]){ hex=classBg[c]; break; } }
		if(!hex) return;
		map.set(tl_normKey(txt),hex);
		map.set(tl_baseKey(txt),hex);
	});
	return map;
}
function tl_colorFor(s){
	const key=tl_normKey(s||"");
	const base=tl_baseKey(s||"");
	const hex=(TL_COLOR_MAP?.get(key)||TL_COLOR_MAP?.get(base)||"").toLowerCase();
	if(hex==="#f4cccc"||hex==="#f5cece") return "red";
	if(hex==="#fff2cc"||hex==="#ffe699") return "yellow";
	if(/\[lr3\]/i.test(s)) return "red";
	if(/\[ly2\]/i.test(s)) return "yellow";
	return "";
}

async function renderTimeline(){
	const sf=document.getElementById("svFilters"); if(sf)sf.style.display="none"
	const sv=document.getElementById("svContent"); if(sv){sv.innerHTML="";sv.style.display="none"}
	document.getElementById("timelineControls").style.display="grid"
	try{
		const [csv,cmap]=await Promise.all([
			fetch(SHEET_TIMELINE_URL,{cache:"no-store"}).then(r=>r.text()),
			tl_fetchColorMap().catch(()=>null)
		])
		TL_COLOR_MAP=cmap
		const {days,labels}=tl_parse(csv)
		TL_ALL=days;TL_LABELS=labels;TL_WEEKS=tl_splitWeeks(days);TL_WEEK_INDEX=0
		tl_buildAuthorOptions(TL_ALL)
		tl_renderWeek(TL_WEEKS[0]||TL_ALL,TL_LABELS)
	}catch(e){
		document.getElementById("tlBoard").innerHTML=`<p style="padding:12px;color:#b00">Không tải được Timeline.</p>`
		console.error(e)
	}
}

function parseCSV(text) {
	const rows = [];
	let cur = [], s = "", q = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i], n = text[i + 1];
		if (c === '"') {
			if (q && n === '"') { s += '"'; i++; } else { q = !q; }
		} else if (c === ',' && !q) {
			cur.push(s); s = "";
		} else if ((c === '\n' || c === '\r') && !q) {
			if (s !== "" || cur.length) {
				cur.push(s); rows.push(cur); cur = []; s = "";
			}
			if (c === '\r' && n === '\n') { i++; }
		} else {
			s += c;
		}
	}
	if (s !== "" || cur.length) { cur.push(s); rows.push(cur); }
	return rows.filter(r => r.some(c => String(c).trim() !== ""));
}

function headerIndexMap(head, names) {
	const map = {};
	for (const [k, pats] of Object.entries(names)) {
		map[k] = head.findIndex(h => pats.some(p => new RegExp(p, "i").test(String(h).trim())));
	}
	return map;
}

function renderTable(matrix, opts = {}) {
	if (!matrix || !matrix.length) return "<p>Không có dữ liệu</p>";
	const head = matrix[0];
	const body = matrix.slice(1).map(r => {
		return `<tr>${r.map((c, i) => {
			if (opts.linkCols && opts.linkCols.has(i)) {
				const u = String(c || "").trim();
				if (!u) return "<td></td>";
				const url = /^https?:\/\//i.test(u) ? u : `https://${u}`;
				return `<td><a href="${url}" target="_blank">Link</a></td>`;
			}
			return `<td>${(c ?? "").toString().trim()}</td>`;
		}).join("")}</tr>`;
	}).join("");
	return `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

function norm(s) {
	return removeVietnameseTones(String(s || "").toLowerCase());
}

async function renderBunCa() {
	const box = document.getElementById("svContent");
	document.getElementById("timelineControls").style.display = "none";
	document.getElementById("svFilters").style.display = "flex";
	const csv = await fetch(SHEET_BUN_URL, { cache: "no-store" }).then(r => r.text());
	const m = parseCSV(csv);
	if (!m.length) { box.innerHTML = "<p>Không có dữ liệu</p>"; return; }
	const head = m[0];
	const cols = headerIndexMap(head, {
		tag: ["^tag$"],
		theloai: ["thể\\s*loại", "the\\s*loai"],
		bun: ["^bún$", "^bun$"],
		ca: ["^cá$", "^ca$", "\\bca\\b"],
		nick: ["nick\\s*4rum", "nick\\s*forum", "^nick", "4rum"],
		kchu: ["^k\\s*chữ", "k\\s*chu", "kchữ", "k chu"],
		muc: ["^mục$", "^muc$"],
		link: ["^link$"]
	});
	const order = ["tag", "theloai", "bun", "ca", "nick", "kchu", "muc", "link"];
	const header = order.map(k => head[cols[k]]).filter(Boolean);
	const rows = m.slice(1).map(r => order.map(k => cols[k] >= 0 ? r[cols[k]] || "" : ""));
	box.dataset.bunFull = JSON.stringify([header, ...rows]);
	const linkIdx = new Set([header.length - 1]);
	box.innerHTML = renderTable([header, ...rows], { linkCols: linkIdx });
	document.querySelectorAll("#svContent tbody tr td:nth-child(3)")
		.forEach(td => td.classList.add("bun-cell"));
}

function filterBun() {
	const box = document.getElementById("svContent");
	const full = box.dataset.bunFull ? JSON.parse(box.dataset.bunFull) : null;
	if (!full) return;
	const kw = norm(document.getElementById("svSearch").value);
	const qBtn = document.querySelector(".sv-quick button.active");
	const quick = qBtn ? qBtn.dataset.q : "";
	const head = full[0], rows = full.slice(1);
	const idxMuc = head.findIndex(h => /mục/i.test(h));
	const idxs = [...Array(head.length).keys()];
	const filtered = rows.filter(r => {
		const text = norm(r.join(" "));
		const okKw = kw ? text.includes(kw) : true;
		const okQuick = quick ? (idxMuc >= 0 && String(r[idxMuc]).includes(quick)) : true;
		return okKw && okQuick;
	});
	const linkIdx = new Set([head.length - 1]);
	box.innerHTML = renderTable([head, ...filtered], { linkCols: linkIdx });
}

function tl_parse(csv){
	const m=parseCSV(csv)
	if(!m.length)return{days:[],headerRow:-1,labels:[]}
	const wanted=[
		"Lá nát xen lá lành (3h - 12h)",
		"Lá lành đùm lá rách (12h - 18h)",
		"Lá lành (18h - 3h)"
	]
	const wantedRe=[
		/Lá\s*nát\s*xen\s*lá\s*lành\s*\(3h\s*-\s*12h\)/i,
		/Lá\s*lành\s*đùm\s*lá\s*rách\s*\(12h\s*-\s*18h\)/i,
		/Lá\s*lành\s*\(18h\s*-\s*3h\)/i
	]
	let headerRows = []
	for(let r=0; r<m.length; r++){
		if(m[r].some(c => /\d{1,2}\/\d{1,2}/.test(String(c).trim()))) headerRows.push(r)
	}
	let allDays = []
	for(let hi=0; hi<headerRows.length; hi++){
		let hr = headerRows[hi]
		let nextHr = (hi+1 < headerRows.length ? headerRows[hi+1] : m.length)
		let head = m[hr]
		let dayCols = head.map((c,idx) => ({col:idx, key:String(c).trim()}) ).filter(o => /\d{1,2}\/\d{1,2}/.test(o.key))
		if(dayCols.length !== 7) continue
		let colIndexByKey = Object.fromEntries(dayCols.map(o => [o.key, o.col]))
		let blockDays = dayCols.map(dc => ({key:dc.key, items:[]}))
		if(hi === 0) continue
		let section = -1
		for(let r=hr+1; r<nextHr; r++){
			let a0 = String( (m[r].length > 0 ? m[r][0] : "") || "" ).trim()
			let hit = wantedRe.findIndex(re => re.test(a0))
			if(hit >=0 ){ section = hit; }
			if(section <0 && !a0) continue
			let hasValue = false
			for(let d_idx=0; d_idx < blockDays.length; d_idx++){
				let d = blockDays[d_idx]
				let cidx = dayCols[d_idx].col
				let val = String( (m[r].length > cidx ? m[r][cidx] : "") || "" ).trim()
				if(val){ d.items.push({text:val, sec:section}); hasValue=true }
			}
			if(!hasValue && section >=0) continue
		}
		allDays = allDays.concat(blockDays)
	}
	return{days:allDays,headerRow:-1,labels:wanted}
}

function tl_splitWeeks(days){
	const packs=[]
	for(let i=0;i<days.length;i+=7)packs.push(days.slice(i,i+7))
	return packs
}

function tl_extractAuthor(text){
	const m=text.match(/^\s*([^–-]+?)\s*[-–]\s*/)
	return m?m[1].trim():"Khác"
}

function tl_buildAuthorOptions(days){
	const set=new Set()
	days.forEach(d=>d.items.forEach(it=>set.add(tl_extractAuthor(it.text))))
	const sel=document.getElementById("tlAuthor")
	sel.innerHTML=`<option value="">Tất cả người đăng</option>`+[...set].sort().map(n=>`<option>${n}</option>`).join("")
}

function tl_renderWeek(pack, labels){
	const board=document.getElementById("tlBoard")
	const thu=["T2","T3","T4","T5","T6","T7","CN"]
	const author=document.getElementById("tlAuthor").value

	let h=`<div class="tl-rowhead"><a href="https://tethuytruongluu.github.io/tcct-game-hub/">Link web game</a></div>`
	for(let i=0;i<pack.length;i++){
		const d=pack[i]
		h+=`<div class="tl-th"><span>${thu[i]}</span><span>${d.key}</span></div>`
	}

	const SEC_CLASS=["tl-sec-312","tl-sec-1218","tl-sec-183"]
	let b=""

	for(let sec=0;sec<labels.length;sec++){
		const lab=labels[sec]
		b+=`<div class="tl-rowhead sec-${sec}">${lab}</div>`
		for(let i=0;i<pack.length;i++){
			const d=pack[i]
			let items=""
			for(let j=0;j<d.items.length;j++){
				const it=d.items[j]
				if(it.sec!==sec) continue
				const txt=it.text
				if(author && txt.indexOf(author+" - ")<0) continue
				const color=tl_colorFor(it.text||it.raw||"")
				const clean=String(it.text||"").replace(/\[(?:lr3|ly2)\]/ig,"")
				items+=`<div class="tl-item ${color}">${clean}</div>`
			}
			b+=`<div class="tl-cell ${SEC_CLASS[sec]}"><div class="tl-items">${items}</div></div>`
		}
	}

	const n=Math.min(7,pack.length)
	board.innerHTML=`<div class="tl-table" style="--n:${n}">${h+b}</div>`
	window.TL_CURR_PACK=pack
	const table=board.querySelector(".tl-table")
	table?.querySelectorAll(".tl-ol").forEach(x=>x.remove())
}

function tl_todayKey(){
	const d=new Date()
	return `${d.getDate()}/${d.getMonth()+1}`
}

function tl_cmpKey(a,b){
	const [da,ma]=a.split("/").map(Number)
	const [db,mb]=b.split("/").map(Number)
	if(ma!==mb)return ma-mb
	return da-db
}

function tl_applyOverlays(todayKey){
	const table=document.querySelector("#tlBoard .tl-table")
	if(!table||!window.TL_CURR_PACK)return
	table.querySelectorAll(".tl-ol").forEach(x=>x.remove())
	for(let i=0;i<TL_CURR_PACK.length;i++){
		const k=TL_CURR_PACK[i].key
		let cls=""
		if(k===todayKey) cls="tl-ol-today"
		else if(tl_cmpKey(k,todayKey)<0) cls="tl-ol-past"
		else continue
		const ol=document.createElement("div")
		ol.className=`tl-ol ${cls}`
		ol.style.gridColumn=String(2+i)
		ol.style.gridRow="2 / -1"
		table.appendChild(ol)
	}
	const heads=table.querySelectorAll(".tl-th")
	const idx=TL_CURR_PACK.findIndex(d=>d.key===todayKey)
	if(heads[idx]) heads[idx].scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})
}

function tl_goToday(){
	const key=tl_todayKey()
	const idx=TL_ALL.findIndex(d=>d.key===key)
	if(idx<0)return
	TL_WEEK_INDEX=Math.floor(idx/7)
	tl_renderWeek(TL_WEEKS[TL_WEEK_INDEX],TL_LABELS)
	tl_applyOverlays(key)
}

let TL_ALL=[],TL_WEEKS=[],TL_WEEK_INDEX=0,TL_LABELS=[]

function tl_prevWeek(){
	if(!TL_WEEKS.length)return
	TL_WEEK_INDEX=(TL_WEEK_INDEX-1+TL_WEEKS.length)%TL_WEEKS.length
	tl_renderWeek(TL_WEEKS[TL_WEEK_INDEX],TL_LABELS)
}

function tl_nextWeek(){
	if(!TL_WEEKS.length)return
	TL_WEEK_INDEX=(TL_WEEK_INDEX+1)%TL_WEEKS.length
	tl_renderWeek(TL_WEEKS[TL_WEEK_INDEX],TL_LABELS)
}

async function renderBangDiem(){
	const box=document.getElementById("svContent")
	document.getElementById("timelineControls").style.display="none"
	document.getElementById("svFilters").style.display="none"
	const csv=await fetch(SHEET_BANG_URL,{cache:"no-store"}).then(r=>r.text())
	const m=parseCSV(csv)
	if(!m.length){box.innerHTML="<p>Không có dữ liệu</p>";return}
	box.style.display="block"
	box.innerHTML=renderTable(m)
}

function switchSVTab(key){
  document.querySelectorAll(".sv-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===key))
  const embed = document.getElementById('proj-score-embed')
  if (key==="bun"){
    if(embed) embed.style.display="none"
    renderBunCa()
  } else if (key==="timeline"){
    if(embed) embed.style.display="none"
    renderTimeline()
  } else {
    renderBangDiem()
  }
}

function showScoreEmbed(){
  const embed = document.getElementById('proj-score-embed');
  const tl = document.getElementById('timelineControls');
  const sv = document.getElementById('svContent');
  const sf = document.getElementById('svFilters');
  if (tl) tl.style.display = 'none';
  if (sf) sf.style.display = 'none';
  if (sv) sv.style.display = 'none';
  if (embed) embed.style.display = 'block';
}

function hideScoreEmbed(){
  const embed = document.getElementById('proj-score-embed');
  if (embed) embed.style.display = 'none';
}

document.querySelector(".sv-tabs")?.addEventListener("click",e=>{
  const btn=e.target.closest(".sv-tab")
  if(!btn) return
  document.querySelectorAll(".sv-tab").forEach(b=>b.classList.toggle("active",b===btn))
  const view=btn.dataset.view
  const tl=document.getElementById("timelineControls")
  const sv=document.getElementById("svContent")
  const sf=document.getElementById("svFilters")
  const embed=document.getElementById("proj-score-embed")
  if(view==="timeline"){
    if(embed) embed.style.display="none"
    tl.style.display="grid"
    if(sv) sv.style.display="none"
    if(sf) sf.style.display="none"
    renderTimeline()
  }else if(view==="bun"){
    if(embed) embed.style.display="none"
    tl.style.display="none"
    if(sv) sv.style.display="block"
    if(sf) sf.style.display="flex"
    renderBunCa()
  }else if(view==="bang"){
    tl.style.display="none"
    if(sv) sv.style.display="none"
    if(sf) sf.style.display="none"
    if(embed) embed.style.display="block"
  }
})

document.addEventListener("DOMContentLoaded",()=>{
	document.getElementById("tlToday")?.addEventListener("click",tl_goToday)
	document.getElementById("tlPrevWeek")?.addEventListener("click",tl_prevWeek)
	document.getElementById("tlNextWeek")?.addEventListener("click",tl_nextWeek)
	document.getElementById("tlAuthor")?.addEventListener("change",()=>{
		const pack=TL_WEEKS[TL_WEEK_INDEX]||TL_ALL
		tl_renderWeek(pack,TL_LABELS)
	})
	document.getElementById("tlToggle")?.addEventListener("click",()=>{
		const sb=document.querySelector(".tl-sidebar")
		const wrap=document.getElementById("timelineControls")
		sb?.classList.toggle("collapsed")
		wrap?.classList.toggle("is-collapsed")
	})
	document.getElementById("svSearch")?.addEventListener("input",filterBun)
	document.getElementById("svQuick")?.addEventListener("click",e=>{
		if(e.target.tagName!=="BUTTON")return
		e.currentTarget.querySelectorAll("button").forEach(x=>x.classList.remove("active"))
		e.target.classList.add("active")
		filterBun()
	})
	const toggle=document.getElementById("project-info-toggle")
	if(toggle){
		toggle.addEventListener("click",()=>{
			const viewer=document.getElementById("sheet-viewer")
			const open=viewer.style.display!=="none"
			viewer.style.display=open?"none":"block"
			toggle.classList.toggle("active",!open)
			if(!open&&!viewer.dataset.loaded){switchSVTab("bun");viewer.dataset.loaded="1"}
		})
	}
})
