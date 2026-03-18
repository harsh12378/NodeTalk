// hooks/useMessagesSocketSync.js
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "../socket";

/**
 * Sync incoming messages to React Query cache
 * Ensures new messages appear immediately without refetching
 */
export const useMessagesSocketSync = (chatId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log(`💬 Syncing new message to cache for chat ${chatId}:`, message);

      // Only sync messages for this chat
      if (message.chatId?.toString() !== chatId?.toString()) {
        return;
      }

      // Update the first page (cursor = null) of messages cache
      // Prepend new message to the start of the list
      queryClient.setQueryData(["messages", chatId, null], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          data: [message, ...oldData.data],
        };
      });

      console.log(`✅ Message synced to cache for chat ${chatId}`);
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [chatId, queryClient]);
};
