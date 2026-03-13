const jwt = require("jsonwebtoken");
const Chat = require("./models/chat");

function setupSocket(io) {
  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);
    io.emit("userOnline", { userId });

    socket.on("joinChat", async (chatId) => {
      try {
        const chat = await Chat.findOne({
          _id: chatId,
          "participants.user": userId,
          "participants.deletedAt": null,
        }).select("_id");

        if (!chat) return socket.emit("error", { message: "Chat not found" });
        socket.join(`chat:${chatId}`);
      } catch {
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // ❌ sendMessage handler is gone — REST controller handles everything

    socket.on("typingStart", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typingStart", { userId, chatId });
    });

    socket.on("typingStop", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typingStop", { userId, chatId });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("userOffline", { userId });
    });
  });
}


module.exports = setupSocket;
