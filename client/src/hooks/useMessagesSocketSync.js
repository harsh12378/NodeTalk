// hooks/useMessagesSocketSync.js
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "../socket";
import { getSenderId } from "../utils/helpers";
export const useMessagesSocketSync = (chatId, currentUserId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    let socket = getSocket();
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds with 100ms intervals
    let cleanup = null;

    const setupListener = () => {
      // If socket is not ready, retry
      if (!socket?.connected) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            socket = getSocket();
            setupListener();
          }, 100);
          return;
        } else {
          console.warn(`⚠️ Socket connection timeout for chat ${chatId}`);
          return;
        }
      }

      // Socket is connected, attach listener
      const handleNewMessage = (message) => {
        if (message.chatId?.toString() !== chatId?.toString()) return;

        // If I sent this message, I already have it from optimistic + API response.
        // Never let socket add my own messages — this eliminates the race condition entirely.
        const messageSenderId = getSenderId(message.senderId);
        if (messageSenderId === currentUserId) return; // ← THE FIX

        queryClient.setQueryData(["messages", chatId, null], (oldData) => {
          if (!oldData) return oldData;
          const alreadyExists = oldData.data.some((m) => m._id === message._id);
          if (alreadyExists) return oldData; // keep as safety net for receiver side
          // Append new message to end (cache is oldest-first, new messages go at end)
          return { ...oldData, data: [...oldData.data, message] };
        });

        // Update inbox for receiver
        queryClient.setQueryData(["inbox"], (old) => {
          if (!old) return old;
          const updated = old.map((user) => {
            if (user.chatId?.toString() !== message.chatId?.toString()) return user;
            return { ...user, lastMessage: message, lastMessageAt: message.createdAt };
          });
          return updated.sort((a, b) => {
            const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bTime - aTime;
          });
        });
      };

      // Remove any existing listener first to prevent duplicates
      socket.off("newMessage", handleNewMessage);
      socket.on("newMessage", handleNewMessage);
      cleanup = () => socket.off("newMessage", handleNewMessage);
    };

    // Start setup
    setupListener();

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, [chatId, currentUserId, queryClient]);
};