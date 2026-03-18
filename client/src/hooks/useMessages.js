// hooks/useMessages.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API_BASE_URL from "../config";

const fetchMessages = async (chatId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${API_BASE_URL}/api/messages/${chatId}?limit=30`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json(); // { data: [...], pagination: { hasMore, nextCursor } }
};

export const useMessages = (chatId) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["messages", chatId, null],
    queryFn: () => fetchMessages(chatId),
    enabled: !!chatId,

    staleTime: 5 * 60 * 1000,   // treat cache as fresh for 5 mins
    gcTime: 10 * 60 * 1000,     // keep in memory 10 mins after unmount

    refetchOnWindowFocus: false, // socket keeps cache fresh — no need
    refetchOnMount: false,       // if cache exists and isn't stale, skip refetch

    // Show last known message from inbox instantly on first open
    // Full list loads behind it — user always sees something immediately
    placeholderData: () => {
      const inbox = queryClient.getQueryData(["inbox"]);
      if (!inbox) return undefined;

      const convo = inbox.find(
        (u) => u.chatId?.toString() === chatId?.toString()
      );
      if (!convo?.lastMessage) return undefined;

      return {
        data: [convo.lastMessage],
        pagination: { hasMore: true, nextCursor: null },
      };
    },
  });
};