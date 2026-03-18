import { io } from "socket.io-client";
import API_BASE_URL from "./config";

let socket = null;
let connectionPromise = null;

export const connectSocket = () => {
  // Return existing socket if already connected
  if (socket?.connected) {
    return socket;
  }

  // Return existing promise if connection is already in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create connection promise
  connectionPromise = new Promise((resolve) => {
    socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: {
        token: localStorage.getItem("token")
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on("connect", () => {
      setUpUnreadListeners();
      resolve(socket);
    });

    socket.on("disconnect", (reason) => {
      connectionPromise = null; // Reset promise on disconnect
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  });

  return socket || connectionPromise;
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

 
  
  socket.on("unreadCountUpdate", ({ chatId, unreadCount, lastMessage }) => {
  
    unreadCounts[chatId] = unreadCount;
  
    unreadCallbacks.forEach((cb, index) => {
      try {
        cb({ chatId, unreadCount, lastMessage });
   
      } catch (error) {
    
      }
    });
  });

  socket.on("connect", () => {
    
  });
};

export const getSocket = () => socket;
export default socket;