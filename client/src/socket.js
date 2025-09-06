import { io } from "socket.io-client";
import API_BASE_URL from "./config";
const socket = io(`${API_BASE_URL}`, {
  withCredentials: true,
});

export default socket;
