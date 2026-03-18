import { io } from "socket.io-client";
import API_BASE_URL from "./config";

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) {
 
    return socket;
  }


  
  socket = io(API_BASE_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: localStorage.getItem("token")
    }
  });

  socket.on("connect", () => {
 
    setUpUnreadListeners();
  });

  socket.on("disconnect", (reason) => {
  
  });

  socket.on("connect_error", (error) => {
  
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