// hooks/useMessagesSocketSync.js
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "../socket";

const getSenderId = (senderId) => {
  if (!senderId) return null;
  if (typeof senderId === "string") return senderId;
  return senderId._id;
};

export const useMessagesSocketSync = (chatId) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Ignore messages for other chats
      if (message.chatId?.toString() !== chatId?.toString()) return;

      // ── 1. Update message cache ────────────────────────────────
      queryClient.setQueryData(["messages", chatId, null], (oldData) => {
        if (!oldData) return oldData;

        // Dedup check — if this _id already exists (because sender already
        // replaced their optimistic message with the real one), skip entirely.
        // This is the core fix that prevents double messages for the sender.
        const alreadyExists = oldData.data.some((m) => m._id === message._id);
        if (alreadyExists) return oldData;

        return {
          ...oldData,
          data: [message, ...oldData.data],
        };
      });

      // ── 2. Update inbox cache for both sender and receiver ─────
      // Sender's inbox preview updates instantly (lastMessage + sort order)
      // without waiting for the 30s Redis TTL to expire
      queryClient.setQueryData(["inbox"], (old) => {
        if (!old) return old;

        const updated = old.map((user) => {
          if (user.chatId?.toString() !== message.chatId?.toString()) return user;
          return {
            ...user,
            lastMessage: message,
            lastMessageAt: message.createdAt,
          };
        });

        // Re-sort so latest conversation bubbles to top
        return updated.sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        });
      });
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [chatId, queryClient]);
};