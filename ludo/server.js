const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

let games = {}; // Lưu trạng thái game theo từng phòng

io.on("connection", (socket) => {
    console.log("Người chơi kết nối:", socket.id);

    socket.on("joinGame", (roomId) => {
        socket.join(roomId);
        if (!games[roomId]) {
            games[roomId] = { players: [], boardState: {} };
        }
        games[roomId].players.push(socket.id);
        io.to(roomId).emit("updatePlayers", games[roomId].players);
    });

    socket.on("rollDice", (roomId) => {
        let dice = Math.floor(Math.random() * 6) + 1;
        io.to(roomId).emit("diceRolled", dice);
    });

    socket.on("disconnect", () => {
        console.log("Người chơi rời đi:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("🚀 Server chạy trên port 3000");
});
