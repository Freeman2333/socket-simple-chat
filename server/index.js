require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.SERVER_PORT || 8082;

app.use(cors());

const server = http.createServer(app);
console.log({ p: process.env.SERVER_PORT });

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const users = new Map();
io.on("connection", (socket) => {
  socket.on("join_room", (data) => {
    users.set(socket.id, { username: data.username, typing: false });
    socket.join(data.room);

    io.to(data.room).emit("onlineUsers", getUsersInRoom(data.room));
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("typing", (data) => {
    users.set(socket.id, { ...users.get(socket.id), typing: true });
    io.to(data.room).emit("onlineUsers", getUsersInRoom(data.room));
  });

  socket.on("stoppedTyping", (data) => {
    users.set(socket.id, { ...users.get(socket.id), typing: false });
    io.to(data.room).emit("onlineUsers", getUsersInRoom(data.room));
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", {
      signal: data.signalData,
      from: data.from,
      name: data.name,
    });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});

server.listen(PORT, () => {
  console.log(`SERVER RUNNING on port ${PORT}`);
});

function getUsersInRoom(room) {
  const socketsInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []);
  return socketsInRoom.map((socketId) => ({
    id: socketId,
    username: users.get(socketId).username,
    typing: users.get(socketId).typing,
  }));
}
