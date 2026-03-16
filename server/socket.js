const jwt = require("jsonwebtoken");
const Chat = require("./models/chat");
const redisClient = require("./config/redis");

// Redis key helpers
const onlineKey = (userId) => `presence:${userId}`;
const ONLINE_TTL = 60; // seconds — refreshed on activity

function setupSocket(io) {
  // ─── Middleware: JWT auth ───────────────────────────────────────────────────
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

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    // ─── Online presence: set in Redis ─────────────────────────────────────
    await redisClient.set(onlineKey(userId), socket.id, { EX: ONLINE_TTL });
    socket.join(`user:${userId}`);
    io.emit("userOnline", { userId });

    // ─── Heartbeat: keep presence alive while connected ────────────────────
    const heartbeat = setInterval(async () => {
      await redisClient.expire(onlineKey(userId), ONLINE_TTL);
    }, (ONLINE_TTL / 2) * 1000); // refresh every 30s

    // ─── Join chat room ─────────────────────────────────────────────────────
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

    // ─── Check if a user is online (query Redis) ────────────────────────────
    socket.on("checkOnline", async ({ targetUserId }, callback) => {
      const isOnline = await redisClient.exists(onlineKey(targetUserId));
      if (typeof callback === "function") callback({ isOnline: !!isOnline });
    });

    // ─── Typing indicators ──────────────────────────────────────────────────
    socket.on("typingStart", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typingStart", { userId, chatId });
    });

    socket.on("typingStop", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typingStop", { userId, chatId });
    });

    // ─── Disconnect: remove from Redis ─────────────────────────────────────
    socket.on("disconnect", async () => {
      clearInterval(heartbeat);
      await redisClient.del(onlineKey(userId));
      io.emit("userOffline", { userId });
    });
  });
}

module.exports = setupSocket;