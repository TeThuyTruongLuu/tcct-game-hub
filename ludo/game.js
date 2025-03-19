const socket = io("http://localhost:3000");

socket.emit("joinGame", "room123");

document.getElementById("roll-btn").addEventListener("click", () => {
    socket.emit("rollDice", "room123");
});

socket.on("diceRolled", (dice1, dice2) => {
    document.getElementById("dice-result").innerText = `🎲 Kết quả: ${dice1}, ${dice2}`;

    // Kiểm tra điều kiện ra quân
    if (dice1 === dice2 || (dice1 === 6 && dice2 === 1) || (dice1 === 1 && dice2 === 6)) {
        let team = "blue"; // Tạm thời test với team xanh dương
        let token = document.getElementById("blue1");

        releaseToken(token, team);
    }
});

const startPositions = {
    red: { x: 1, y: 6 },
    blue: { x: 8, y: 1 },
    green: { x: 6, y: 13 },
    yellow: { x: 13, y: 8 }
};

function moveToStartPosition(token, team) {
    const startX = startPositions[team].x * 40; // 40px mỗi ô
    const startY = startPositions[team].y * 40;
    token.style.transform = `translate(${startX}px, ${startY}px)`;
}

// Khi quân cờ ra khỏi nhà (lắc đôi hoặc combo 6-1)
function releaseToken(token, team) {
    moveToStartPosition(token, team);
}

