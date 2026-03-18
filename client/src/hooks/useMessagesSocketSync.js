// hooks/useMessagesSocketSync.js
export const useMessagesSocketSync = (chatId, currentUserId) => { // ← add currentUserId
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket) return;

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
        return { ...oldData, data: [message, ...oldData.data] };
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

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [chatId, currentUserId, queryClient]);
};