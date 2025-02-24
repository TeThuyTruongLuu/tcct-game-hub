// Khai báo biến toàn cục
let db;
let youtubePlayer;
let isYouTubePlaying = false;
let backgroundMusic = new Audio('musics/background music.m4a');

function initializeApp() {
    // Cấu hình Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDrRgPPldi8hy04k8aSy8r2wCy91RrgqUM",
        authDomain: "tcct-project-tran.firebaseapp.com",
        databaseURL: "https://tcct-project-tran-default-rtdb.firebaseio.com",
        projectId: "tcct-project-tran",
        storageBucket: "tcct-project-tran.firebasestorage.app",
        messagingSenderId: "826272441955",
        appId: "1:826272441955:web:86a1f521ccee2e9d3e3a56",
        measurementId: "G-D9EN3NEFD6"
    };

    // Khởi tạo Firebase
    firebase.initializeApp(firebaseConfig);
    const firestore = firebase.firestore();
    db = firestore.collection("leaderboard"); // Gán db trực tiếp là collection "leaderboard"
}


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
    if (rank === 1) return 10;
    else if (rank === 2) return 9;
    else if (rank === 3) return 8;
    else if (rank <= 5) return 7;
    else if (rank <= 10) return 6;
    return 5;
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
        // Lấy tất cả các bản ghi
        const allScoresSnapshot = await db.get();

        // Sắp xếp các bản ghi dựa trên tổng số giây
        const sortedDocs = allScoresSnapshot.docs.sort((a, b) => {
            const timeA = convertTimeToSeconds(a.data().totalTime);
            const timeB = convertTimeToSeconds(b.data().totalTime);
            return timeA - timeB;
        });

        let uniqueRank = 1;
        let previousTime = null;
        let groupPlayers = [];

        for (const doc of sortedDocs) {
            const data = doc.data();
            const currentTime = convertTimeToSeconds(data.totalTime);

            // Nếu thời gian của người chơi khác với thời gian của nhóm hiện tại
            if (previousTime !== null && currentTime !== previousTime) {
                // Cấp điểm cho nhóm người chơi hiện tại
                const points = getPointsForRank(uniqueRank);
                for (const playerDoc of groupPlayers) {
                    await db.doc(playerDoc.id).update({
                        rank: uniqueRank,
                        points: points
                    });
                }

                // Tăng `uniqueRank` lên đúng bằng số lượng người chơi trong nhóm hiện tại
                uniqueRank += groupPlayers.length;
                groupPlayers = [];
            }

            // Thêm người chơi vào nhóm hiện tại
            groupPlayers.push(doc);
            previousTime = currentTime;
        }

        // Xử lý nhóm cuối cùng (nếu có)
        if (groupPlayers.length > 0) {
            const points = getPointsForRank(uniqueRank);
            for (const playerDoc of groupPlayers) {
                await db.doc(playerDoc.id).update({
                    rank: uniqueRank,
                    points: points
                });
            }
        }

        console.log("Thứ hạng và điểm số đã được tính toán lại cho toàn bộ người chơi.");
        return { success: true, message: "Thứ hạng và điểm số đã được cập nhật." };
    } catch (error) {
        console.error("Error recalculating ranks and points: ", error);
        return { success: false, error: error.message };
    }
}


// Hàm hiển thị bảng xếp hạng
window.displayLeaderboard = async function() {
    try {
        const recalculateResult = await recalculateAllRanksAndPoints();

        if (!recalculateResult.success) {
            console.log("Lỗi khi tính toán lại thứ hạng và điểm số:", recalculateResult.message);
            return;
        }

        const querySnapshot = await db.orderBy("rank", "asc").get();

        const leaderboardElement = document.getElementById("leaderboard");
        leaderboardElement.innerHTML = `
            <tr>
                <th style="width: 25%;">Hạng</th>
                <th style="width: 25%;">Tên</th>
                <th style="width: 25%;">Thời gian</th>
                <th style="width: 25%;">Điểm</th>
            </tr>
        `;

        querySnapshot.forEach((doc) => {
            const entry = doc.data();
            const row = document.createElement("tr");
			row.innerHTML = `
                <td style="width: 10%;">${entry.rank}</td>
                <td style="width: 40%;">${entry.playerName}</td>
                <td style="width: 30%;">${entry.totalTime}</td>
                <td style="width: 20%;">${entry.points}</td>
            `;
            leaderboardElement.appendChild(row);
        });
    } catch (error) {
        console.log("Error getting leaderboard data: ", error);
    }
}


// Đảm bảo initializeApp được gọi khi trang web load
initializeApp();
