const socket = io("http://localhost:3000");

socket.emit("joinGame", "room123"); // Tham gia phòng

document.getElementById("roll-btn").addEventListener("click", () => {
    socket.emit("rollDice", "room123");
});

socket.on("diceRolled", (dice) => {
    document.getElementById("dice").innerText = `🎲 ${dice}`;
});

socket.on("updateBoard", (boardState) => {
    console.log("Cập nhật bàn cờ:", boardState);
});
