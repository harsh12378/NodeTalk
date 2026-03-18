import { useState, useEffect } from "react";
import User from "../components/user";
import { jwtDecode } from "jwt-decode";
import { useInbox } from "../hooks/useInbox";
import { useInboxSocketSync } from "../hooks/useInboxSocketSync";

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState(null);

  // Fetch inbox data using React Query (with automatic caching + refetch)
  const { data: users = [], isLoading, error, isRefetching } = useInbox();

  // Sync socket updates to cache (zero network calls)
  useInboxSocketSync();

  // Extract current user ID once from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUserId(decoded.userId);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  return (
    <div
      className="flex flex-col w-full flex-1 h-full m-0 p-0 px-0 bg-gray-900 overflow-y-auto"
      style={{ boxSizing: "border-box" }}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-green-400 font-semibold">
              Loading conversations...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center text-red-400">
            <p className="text-lg font-semibold mb-2">
              ⚠️ Failed to load conversations
            </p>
            <p className="text-sm text-gray-400">{error?.message}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && users.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-lg">No conversations yet</p>
            <p className="text-sm">
              Start a new conversation to begin chatting
            </p>
          </div>
        </div>
      )}

      {/* Users list with refresh indicator */}
      {!isLoading && users.length > 0 && (
        <>
          {isRefetching && (
            <div className="sticky top-0 bg-green-600/20 text-green-400 text-xs py-2 px-4 text-center border-b border-green-600/50">
              Syncing conversations...
            </div>
          )}
          {users.map((user) => (
            <User
              key={user._id}
              user={user}
              currentUserId={currentUserId}
              unreadCount={user.unreadCount || 0}
            />
          ))}
        </>
      )}
    </div>
  );
}
