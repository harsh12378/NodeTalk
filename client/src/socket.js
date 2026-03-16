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
    setUpUnreadListeners();
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });

  return socket;
};

// Global unread count state management
let unreadCounts = {}; // { chatId: unreadCount }
let unreadCallbacks = []; // subscribers to unread updates

export const subscribeToUnreadUpdates = (callback) => {
  unreadCallbacks.push(callback);
  return () => {
    unreadCallbacks = unreadCallbacks.filter(cb => cb !== callback);
  };
};

export const getUnreadCounts = () => unreadCounts;

export const setUpUnreadListeners = () => {
  if (!socket) return;

  console.log("🔧 Setting up unread count listeners");
  
  socket.on("unreadCountUpdate", ({ chatId, unreadCount, lastMessage }) => {
    console.log(
      `\n📊 ━━━ UNREAD COUNT UPDATE RECEIVED ━━━`,
      `\n   Chat ID: ${chatId}`,
      `\n   New Count: ${unreadCount}`,
      `\n   Last Message: ${lastMessage?.content || "none"}`,
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );
    unreadCounts[chatId] = unreadCount;
    
    // Notify all subscribers
    console.log(`   Notifying ${unreadCallbacks.length} subscribers...`);
    unreadCallbacks.forEach((cb, index) => {
      try {
        cb({ chatId, unreadCount, lastMessage });
        console.log(`   ✅ Subscriber ${index + 1} notified`);
      } catch (error) {
        console.error(`   ❌ Subscriber ${index + 1} failed:`, error);
      }
    });
  });

  socket.on("connect", () => {
    console.log("🔗 Socket connected - unread listeners ready");
  });
};

export const getSocket = () => socket;
export default socket;