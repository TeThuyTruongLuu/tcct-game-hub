// Khai báo biến toàn cục

let youtubePlayer;
let isYouTubePlaying = false;
let backgroundMusic = new Audio('musics/background music.m4a');


// Chờ DOM tải hoàn chỉnh trước khi gắn sự kiện
document.addEventListener('DOMContentLoaded', () => {

    const startButton = document.getElementById('ready-button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (!isYouTubePlaying) { // Chỉ phát nhạc nền nếu YouTube không phát
                backgroundMusic.loop = true;
                backgroundMusic.volume = 0.2;
                backgroundMusic.play().catch((error) => {
                    console.warn("Không thể phát nhạc nền:", error);
                });
            }
		});
	}

    // Xử lý sự kiện nút "Phát nhạc"
    const playButton = document.getElementById('play-youtube-music');
    if (playButton) {
        playButton.addEventListener('click', () => {
            const url = document.getElementById('youtube-url').value.trim();
            const videoId = extractYouTubeId(url);

            if (videoId) {
                document.getElementById('player-container').style.display = 'block';
                createYoutubePlayer(videoId);
                backgroundMusic.pause(); 
				isYouTubePlaying = true;
            } else {
                alert('Vui lòng nhập URL YouTube hợp lệ!');
            }
        });
    }

    // Xử lý nút "Tạm dừng"
    const pauseButton = document.getElementById('pause-youtube-music');
    pauseButton.addEventListener('click', () => {
        if (youtubePlayer) {
            youtubePlayer.pauseVideo();
        } else {
            backgroundMusic.pause();
        }
        isPlaying = false;
        updateButtons();
    });

    // Xử lý nút "Tiếp tục"
    const resumeButton = document.getElementById('resume-youtube-music');
    resumeButton.addEventListener('click', () => {
        if (youtubePlayer) {
            youtubePlayer.playVideo();
        } else {
            backgroundMusic.play();
        }
        isPlaying = true;
        updateButtons();
    });

    // Xử lý nút "Thay đổi nhạc"
    const changeButton = document.getElementById('change-youtube-music');
    changeButton.addEventListener('click', () => {
        const url = document.getElementById('youtube-url').value.trim();
        const videoId = extractYouTubeId(url);

        if (videoId) {
            createYoutubePlayer(videoId);
            backgroundMusic.pause(); // Dừng nhạc nền
        } else {
            alert('Vui lòng nhập URL YouTube hợp lệ!');
        }
        updateButtons();
    });
});

// Hàm khởi tạo trình phát YouTube
function createYoutubePlayer(videoId) {
    if (youtubePlayer) {
        youtubePlayer.loadVideoById(videoId); // Tải video mới nếu trình phát đã tồn tại
    } else {
        youtubePlayer = new YT.Player('player-container', {
            height: '0', // Ẩn video
            width: '0',
            videoId: videoId,
            playerVars: {
                autoplay: 1, // Tự động phát
                loop: 1, // Lặp lại
                playlist: videoId, // Đảm bảo lặp
                controls: 0, // Ẩn nút điều khiển
                modestbranding: 1 // Giảm branding
            },
            events: {
                onReady: (event) => {
                    event.target.setVolume(100); // Đặt âm lượng
                    isPlaying = true;
                    updateButtons();
                },
                onStateChange: (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        isPlaying = true;
                        backgroundMusic.pause(); // Dừng nhạc nền
                    } else if (event.data === YT.PlayerState.ENDED) {
                        isYouTubePlaying = false;
						backgroundMusic.play().catch((error) => {
                            console.warn("Không thể phát nhạc nền:", error);
						});
                    updateButtons();
                    }
                }
            }
        });
    }
}

// Hàm trích xuất YouTube video ID từ URL
function extractYouTubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/.*v=([a-zA-Z0-9_-]+)|youtu\.be\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? (match[1] || match[2]) : null;
}

// Hàm cập nhật trạng thái nút
function updateButtons() {
    const pauseButton = document.getElementById('pause-youtube-music');
    const resumeButton = document.getElementById('resume-youtube-music');
    const changeButton = document.getElementById('change-youtube-music');

    if (isPlaying) {
        pauseButton.style.display = 'inline-block';
        resumeButton.style.display = 'none';
    } else {
        pauseButton.style.display = 'none';
        resumeButton.style.display = 'inline-block';
    }
    changeButton.style.display = 'inline-block';
}


async function determineRank(playerName, newTotalTime) {
    const allScoresSnapshot = await db.orderBy('totalTime', 'asc').get(); // Sắp xếp từ nhanh nhất đến chậm nhất
    const uniqueTimes = new Set(); // Tập hợp lưu trữ các thời gian hoàn thành duy nhất

    // Lấy các giá trị `totalTime` duy nhất
    allScoresSnapshot.forEach((doc) => {
        const data = doc.data();
        uniqueTimes.add(data.totalTime); // Thêm thời gian hoàn thành vào tập hợp
    });

    // Chuyển `uniqueTimes` thành một mảng và sắp xếp
    const sortedUniqueTimes = Array.from(uniqueTimes).sort((a, b) => a - b);

    let rank = 1; // Bắt đầu từ hạng cao nhất
    for (let time of sortedUniqueTimes) {
        if (newTotalTime < time) {
            // Nếu thời gian hoàn thành của người chơi mới nhanh hơn, giữ nguyên `rank`
            break;
        } else if (newTotalTime === time) {
            // Nếu thời gian hoàn thành bằng nhau, giữ nguyên `rank` và ngừng tìm kiếm
            break;
        } else {
            // Nếu thời gian hoàn thành chậm hơn, tăng `rank`
            rank++;
        }
    }

    return rank;
}

// Hàm so sánh chuỗi thời gian "mm:ss"
function compareTimeStrings(timeA, timeB) {
    const [minutesA, secondsA] = timeA.split(':').map(Number);
    const [minutesB, secondsB] = timeB.split(':').map(Number);

    if (minutesA !== minutesB) {
        return minutesA - minutesB;
    } else {
        return secondsA - secondsB;
    }
}

// Hàm tính điểm dựa trên thứ hạng
function getPointsForRank(rank) {
    if (rank === 1) return 100;
    else if (rank === 2) return 90;
    else if (rank === 3) return 80;
    else if (rank <= 5) return 70;
    else if (rank <= 10) return 60;
    return 50;
}

function convertTimeToSeconds(timeString) {
    const parts = timeString.split(":").map(Number);
    return parts[0] * 60 + parts[1]; // Chuyển phút thành giây và cộng giây
}

// Hàm cập nhật kết quả cho người chơi mới hoặc cập nhật thời gian mới cho người chơi hiện tại
async function updatePlayerResult(playerName, newTotalTime) {
    const leaderboardRef = db;

    try {
        // Tìm xem người chơi có bản ghi nào trong hệ thống chưa
        const playerSnapshot = await leaderboardRef.where('playerName', '==', playerName).get();
        let existingRecord = null;

        playerSnapshot.forEach(doc => {
            existingRecord = { id: doc.id, ...doc.data() };
        });

        if (!existingRecord) {
            // Người chơi mới, thêm bản ghi đầu tiên và xác định hạng ngay lập tức
            const rank = await determineRank(playerName, newTotalTime);
            const points = getPointsForRank(rank);

            await leaderboardRef.add({
                playerName,
                totalTime: newTotalTime,
                points,
                rank
            });

            return {
                success: true,
                playerName,
                newTotalTime,
                rank,
                points,
                message: "Người chơi mới đã được thêm vào hệ thống."
            };
        }

        // Nếu người chơi cũ có kỷ lục, chỉ cập nhật nếu thời gian mới nhanh hơn
        if (compareTimeStrings(existingRecord.totalTime, newTotalTime) <= 0) {
            return {
                success: false,
                playerName,
                newTotalTime,
                oldRecordTime: existingRecord.totalTime,
                message: "Kỷ lục mới không được ghi nhận do không tốt hơn kỷ lục hiện tại."
            };
        }

        // Nếu là kết quả tốt hơn, cập nhật thời gian, tính lại hạng và điểm cho người chơi này
        const rank = await determineRank(playerName, newTotalTime);
        const points = getPointsForRank(rank);

        await leaderboardRef.doc(existingRecord.id).update({
            totalTime: newTotalTime,
            points,
            rank
        });

        return {
            success: true,
            playerName,
            newTotalTime,
            rank,
            points,
            message: "Đã cập nhật kỷ lục mới thành công."
        }
		const totalTimeInSeconds = convertTimeToSeconds(newTotalTime);
		
		if (window.saveScoreToDB) {
			window.saveScoreToDB("Lật hình", 0, newTotalTime, totalTimeInSeconds);
		} else {
			console.error("❌ Lỗi: Không tìm thấy hàm saveScoreToDB!");
		};

    } catch (error) {
        console.error("Error updating player result: ", error);
        return { success: false, error: error.message };
    }
}

// Hàm chuyển đổi thời gian "mm:ss" thành giây
function convertTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

// Hàm tính toán lại thứ hạng và điểm cho tất cả người chơi
async function recalculateAllRanksAndPoints() {
    try {
        console.log("📊 Bắt đầu tính lại thứ hạng và điểm số...");
        
        const scoresRef = db.collection("userScores").where("game", "==", "Lật hình");
        const querySnapshot = await scoresRef.get();
        let players = [];

        // Lưu tất cả dữ liệu người chơi vào mảng
        querySnapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });

        if (players.length === 0) {
            console.warn("⚠️ Không có người chơi nào trong database!");
            return { success: false, message: "Không có người chơi nào để tính toán lại." };
        }

        // 🚀 Sắp xếp danh sách theo thời gian hoàn thành (từ nhanh nhất đến chậm nhất)
        players.sort((a, b) => compareTimeStrings(a.totalTime, b.totalTime));

        let rank = 1;
        let previousTime = null;
        let groupPlayers = [];

        // 🔄 Cập nhật thứ hạng và điểm số
        for (let i = 0; i < players.length; i++) {
            let currentTime = players[i].totalTime;

            // Nếu thời gian hoàn thành khác với nhóm trước đó, cấp điểm cho nhóm cũ
            if (previousTime !== null && currentTime !== previousTime) {
                const points = getPointsForRank(rank);
                for (const player of groupPlayers) {
                    await db.collection("userScores").doc(player.id).update({
                        rank: rank,
                        score: points
                    });
                }
                rank += groupPlayers.length; // Nhảy rank đúng số lượng nhóm cũ
                groupPlayers = [];
            }

            // Thêm người chơi vào nhóm hiện tại
            groupPlayers.push(players[i]);
            previousTime = currentTime;
        }

        // Cập nhật nhóm cuối cùng nếu còn người chơi
        if (groupPlayers.length > 0) {
            const points = getPointsForRank(rank);
            for (const player of groupPlayers) {
                await db.collection("userScores").doc(player.id).update({
                    rank: rank,
                    score: points
                });
            }
        }

        console.log("✅ Hoàn tất cập nhật thứ hạng và điểm số!");
        return { success: true, message: "Cập nhật thứ hạng và điểm số thành công." };

    } catch (error) {
        console.error("❌ Lỗi khi tính toán lại thứ hạng và điểm số:", error);
        return { success: false, error: error.message };
    }
}



// Hàm hiển thị bảng xếp hạng
async function displayLeaderboard() {
    console.log("📜 Đang lấy bảng xếp hạng từ Firebase...");
    const leaderboardElement = document.getElementById("leaderboard");

    leaderboardElement.innerHTML = `
        <tr>
            <th>Hạng</th>
            <th>Tên</th>
            <th>Thời gian</th>
            <th>Điểm</th>
        </tr>
    `;

    try {
		const scoresRef = db.collection("userScores")
			.where("game", "==", "Lật hình")
			.orderBy("totalTimeInSeconds", "asc")
			.orderBy("score", "desc")
			.limit(10);


        const querySnapshot = await scoresRef.get();
        let rank = 1;

        querySnapshot.forEach((doc) => {
            const entry = doc.data();
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${rank++}</td>
                <td>${entry.username}</td>
                <td>${entry.totalTime}</td>
                <td>${entry.score}</td>
            `;
            leaderboardElement.appendChild(row);
        });

        console.log("✅ Bảng xếp hạng đã cập nhật!");
    } catch (error) {
        console.error("❌ Lỗi khi lấy bảng xếp hạng:", error);
    }
}


window.addEventListener("beforeunload", async function (event) {
    if (playerScore > 0) {
        console.log("🔥 Khoan thoát game, đợi lưu rồi thoát...");
        event.preventDefault(); // Chặn đóng tab ngay lập tức
        event.returnValue = "Dữ liệu đang được lưu..."; // Hiển thị cảnh báo thoát
        await saveScoreToDB("Lật hình", result.points); // Đợi Firestore lưu điểm xong
    }
});