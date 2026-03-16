import { useState, useEffect } from "react";
import User from "../components/user";
import API_BASE_URL from "../config";
import { jwtDecode } from "jwt-decode";
import { getSocket, subscribeToUnreadUpdates } from "../socket";

export default function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

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

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/users/allusers`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.status === 200) {
        // Sort by lastMessageAt (most recent first)
        const sortedData = [...data].sort((a, b) => {
          const timeA = new Date(a.lastMessageAt || 0).getTime();
          const timeB = new Date(b.lastMessageAt || 0).getTime();
          return timeB - timeA;
        });

        setUsers((prev) => {
          const ids = new Set(prev.map((u) => u._id));
          const newUsers = sortedData.filter((u) => !ids.has(u._id));
          return [...prev, ...newUsers];
        });
      } else {
        console.log("error in fetchusers", response);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  // Listen for unread count updates and re-sort
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const unsubscribe = subscribeToUnreadUpdates(
      ({ chatId, unreadCount, lastMessage }) => {
        console.log(`📬 Unread update for chat ${chatId}, count:`, unreadCount);

        // Update the user with new unread count and last message
        setUsers((prev) => {
          const updated = prev.map((user) =>
            user?.chatId === chatId
              ? {
                  ...user,
                  unreadCount,
                  lastMessage,
                  lastMessageAt: lastMessage?.createdAt,
                }
              : user,
          );

          // Re-sort by lastMessageAt (most recent first)
          return updated.sort((a, b) => {
            const timeA = new Date(a.lastMessageAt || 0).getTime();
            const timeB = new Date(b.lastMessageAt || 0).getTime();
            return timeB - timeA;
          });
        });
      },
    );

    return unsubscribe;
  }, []);

  return (
    <div
      className="flex flex-col w-full flex-1 h-full m-0 p-0 px-0 bg-gray-900 overflow-y-auto"
      style={{ boxSizing: "border-box" }}
    >
      {users.map((user) => (
        <User
          key={user._id}
          user={user}
          currentUserId={currentUserId}
          unreadCount={user.unreadCount || 0}
        />
      ))}
    </div>
  );
}
