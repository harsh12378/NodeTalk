
function setupSocket(io) {
  const onlineUsers =new Map();
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.userId = userId;
      socket.join(userId);
      onlineUsers.set(userId, socket.id);
      io.emit("userOnline",{userId});
    });

    socket.on("sendMessage", ({ senderId, receiverId, message }) => {
      io.to(receiverId).emit("receiveMessage", {
        senderId,
        message,
        createdAt: new Date().toISOString(),
      });

      io.to(senderId).emit("receiveMessage", {
        senderId,
        message,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ User disconnected: ${socket.id}, reason: ${reason}`);
      if (socket.userId) {
      io.emit("userOffline", { userId: socket.userId });
     }

    });
  });
}

module.exports = setupSocket;
