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
export const useGlobalMessageListener = () => {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn("⚠️ Socket not available for global listener");
      return;
    }

   
    const handleNewMessage = (message) => {


      // Get current user from JWT token
      const currentUser = getCurrentUserFromToken();
      const userId = currentUser?._id;

      // Convert both IDs to strings for comparison
      const senderId = String(message.senderId?._id);
      const currentUserId = String(userId);



      // Only show toast if message is from another user (not from current user)
      if (senderId !== currentUserId && message.senderId?.name) {
        showIncomingMessageToast(
          message.senderId.name,
          message.content,
          message.senderId.avatar
        );
      }
    };

    // Listen for connection status
    const handleConnect = () => {
  
    };

    const handleDisconnect = (reason) => {
    
    };

    // Attach global listeners
    socket.on("newMessage", handleNewMessage);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Cleanup on unmount
    return () => {

      socket.off("newMessage", handleNewMessage);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);
};

export default useGlobalMessageListener;
