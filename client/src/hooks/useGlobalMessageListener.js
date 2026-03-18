import { useEffect } from "react";
import { getSocket } from "../socket";
import { getCurrentUserFromToken } from "../utils/jwt";
import {
  showIncomingMessageToast,
  showReceiverTypingToast,
} from "../components/CustomToast";

/**
 * Global hook to listen for incoming messages across all pages
 * Shows toast notifications for new messages from any user
 */
let lastNotificationId = null; // Track last notified message to prevent duplicates

export const useGlobalMessageListener = () => {
  useEffect(() => {
    let socket = getSocket();
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds with 100ms intervals
    let cleanup = null;

    const setupListeners = () => {
      // If socket is still not connected, retry
      if (!socket?.connected) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            socket = getSocket();
            setupListeners();
          }, 100);
          return;
        } else {
          console.warn("⚠️ Socket connection timeout in global listener");
          return;
        }
      }

      // Socket is connected, attach listeners
      const handleNewMessage = (message) => {
        // Get current user from JWT token
        const currentUser = getCurrentUserFromToken();
        const userId = currentUser?._id;

        // Convert both IDs to strings for comparison
        const senderId = String(message.senderId?._id);
        const currentUserId = String(userId);

        // Prevent duplicate notifications for same message
        if (lastNotificationId === message._id) {
          return;
        }

        // Only show toast if message is from another user (not from current user)
        if (senderId !== currentUserId && message.senderId?.name) {
          lastNotificationId = message._id; // Mark this message as notified
          showIncomingMessageToast(
            message.senderId.name,
            message.content,
            message.senderId.avatar
          );
        }
      };

      const handleConnect = () => {
        // Socket reconnected
      };

      const handleDisconnect = (reason) => {
        // Socket disconnected
      };

      // Remove any existing listeners first to prevent duplicates
      socket.off("newMessage", handleNewMessage);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);

      // Attach global listeners
      socket.on("newMessage", handleNewMessage);
      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);

      // Store cleanup function
      cleanup = () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
      };
    };

    // Start setup
    setupListeners();

    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
    };
  }, []);
};

export default useGlobalMessageListener;
