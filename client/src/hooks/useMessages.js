// hooks/useMessages.js
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";

/**
 * Cache messages for a specific chat
 * Supports pagination with cursor-based navigation
 */
export const useMessages = (chatId, cursor = null) => {
  return useQuery({
    queryKey: ["messages", chatId, cursor],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: 30 });
      if (cursor) params.append("before", cursor);
      return api.get(`/messages/${chatId}?${params.toString()}`);
    },
    enabled: !!chatId, // Only fetch if chatId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - messages are semi-static
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};
