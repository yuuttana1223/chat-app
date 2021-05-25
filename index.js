const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const userHash = {};
const connectedUsers = {};
let guestCount = 0; // 名前無しの数

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    const msg = `${userHash[socket.id]}が退出しました`;
    delete userHash[socket.id];
    socket.broadcast.emit("chat message", msg); // 送ってきた本人以外に送信
    io.emit("users count", userHash);
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", `${userHash[socket.id]}: ${msg}`);
  });

  socket.on("private message", (data) => {
    const from = data.from,
      to = data.to,
      message = data.message;
    if (connectedUsers.hasOwnProperty(to)) {
      connectedUsers[from].emit("chat message", `DM(${from}): ${message}`);
      connectedUsers[to].emit("chat message", `DM(${from}): ${message}`);
    }
  });

  socket.on("enter room", (userName) => {
    socket.userName = userName; // socketにset
    guestCount++;
    socket.userName =
      userName == null || userName == "" ? `ゲスト${guestCount}` : userName;
    connectedUsers[userName] = socket;

    userHash[socket.id] = socket.userName;
    socket.broadcast.emit("chat message", `${socket.userName}が入出しました`);
    io.emit("users count", userHash);
  });

  let nowTyping = 0; // start typingイベントを受信した回数
  socket.on("start typing", () => {
    if (nowTyping <= 0) {
      socket.broadcast.emit("start typing", userHash[socket.id]);
    }
    nowTyping++;
    setTimeout(() => {
      nowTyping--;
      if (nowTyping <= 0) {
        socket.broadcast.emit("stop typing");
      }
    }, 3000);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
