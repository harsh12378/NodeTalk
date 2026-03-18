// hooks/useInboxSocketSync.js
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "../socket";

export const useInboxSocketSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUnreadUpdate = ({ chatId, senderId, unreadCount, lastMessage }) => {
      console.log(`📬 Socket syncing cache for chat ${chatId}, count:`, unreadCount);

      // Directly patch inbox cache — zero network call
      queryClient.setQueryData(["inbox"], (old) => {
        if (!old) return old;

        return old.map((user) => {
          if (user.chatId?.toString() !== chatId?.toString()) return user;

          return {
            ...user,
            unreadCount,
            lastMessage,
            lastMessageAt: lastMessage?.createdAt,
          };
        }).sort((a, b) => {
          // re-sort after update so latest message bubbles to top
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          if (bTime !== aTime) return bTime - aTime;
          return a.name?.localeCompare(b.name) || 0;
        });
      });
    };

    socket.on("unreadCountUpdate", handleUnreadUpdate);
    return () => socket.off("unreadCountUpdate", handleUnreadUpdate);
  }, [queryClient]);
};