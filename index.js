const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const userHash = {}; // 参加中のユーザの名前を保持
const connectedUsers = {}; // private messageに使用

app.use(express.static("assets"));

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    socket.broadcast.emit("chat message", `${socket.userName}が退室しました`); // 送ってきた本人以外に送信
    delete userHash[socket.id];
    io.emit("users count", userHash);
  });

  socket.on("chat message", (message) => {
    io.emit("chat message", `${socket.userName}: ${message}`);
  });

  socket.on("private message", (data) => {
    const from = data.from,
      to = data.to,
      message = data.message;
    if (connectedUsers.hasOwnProperty(to)) {
      connectedUsers[from].emit(
        "chat message",
        `DM (${from} -> ${to}): ${message}`
      );
      connectedUsers[to].emit(
        "chat message",
        `DM (${from} -> ${to}): ${message}`
      );
    }
  });

  socket.on("sticker", (imageId) => {
    const fs = require("fs");
    const extension = imageId.split(".")[1];
    console.log(extension);
    fs.readFile(`assets/sticker/${imageId}`, "base64", (err, data) => {
      if (data) {
        io.emit("sticker", `data:image/${extension};base64, ${data}`);
      }
    });
  });

  socket.on("enter room", (userName) => {
    connectedUsers[userName] = socket;
    socket.userName = userName;
    userHash[socket.id] = socket.userName;
    socket.broadcast.emit("chat message", `${socket.userName}が入室しました`);
    io.emit("users count", userHash);
  });

  let nowTyping = 0; // start typingイベントを受信した回数
  socket.on("start typing", () => {
    if (nowTyping <= 0) {
      socket.broadcast.emit("start typing", socket.userName);
    }
    nowTyping++;
    setTimeout(() => {
      nowTyping--;
      if (nowTyping <= 0) {
        socket.broadcast.emit("stop typing");
      }
    }, 3000);
  });

  socket.on("image", (imageData) => {
    socket.broadcast.emit("image", imageData);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
