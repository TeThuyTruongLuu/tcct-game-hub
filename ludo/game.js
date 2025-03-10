const socket = io("http://localhost:3000");

socket.emit("joinGame", "room123");

document.getElementById("roll-btn").addEventListener("click", () => {
    socket.emit("rollDice", "room123");
});

socket.on("diceRolled", (dice) => {
    document.getElementById("dice-result").innerText = `🎲 Kết quả: ${dice}`;

    // Nếu xúc xắc ra 6, quân cờ sẽ ra khỏi nhà
    if (dice === 6) {
        let token = document.getElementById("blue1");
        token.style.transform = "translate(50px, 50px)"; // Di chuyển ra ngoài
    }
});
