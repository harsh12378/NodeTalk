import { io } from "socket.io-client";
import API_BASE_URL from "./config";

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) {
    console.log("✅ Socket already connected");
    return socket;
  }

  console.log("🔌 Connecting Socket.IO to", API_BASE_URL);
  
  socket = io(API_BASE_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: localStorage.getItem("token")
    }
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });

  return socket;
};

export const getSocket = () => socket;
export default socket;