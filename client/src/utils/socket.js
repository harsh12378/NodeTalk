// utils/socket.js - Re-export socket instance for hooks
import { getSocket } from "../socket";

// Lazy initialize socket
let _socket = null;

export const socket = new Proxy({}, {
  get: (target, prop) => {
    if (!_socket) {
      _socket = getSocket();
    }
    return _socket?.[prop];
  },
});
