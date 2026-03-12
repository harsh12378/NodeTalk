import { io } from "socket.io-client";
import API_BASE_URL from "./config";

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(API_BASE_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: localStorage.getItem("token")
    }
  });

  return socket;
};

export const getSocket = () => socket;
export default socket;