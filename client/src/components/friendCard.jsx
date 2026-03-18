import { useState, useEffect } from "react";
import { getSocket, subscribeToUnreadUpdates } from "../socket";
import dp from "../assets/dp.jpg";
import API_BASE_URL from "../config";
export default function FriendCard({ friend, unreadCount = 0, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(friend.friendId.isOnline);
  const [unread, setUnread] = useState(unreadCount);

  // Check initial online status on mount
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit(
      "checkOnline",
      { targetUserId: friend.friendId._id },
      (response) => {
     
        setIsOnline(response.isOnline);
      },
    );
  }, [friend.friendId._id, friend.friendId.name]);

  // Listen for online/offline updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnline = ({ userId }) => {
      if (userId === friend.friendId._id) {
       
        setIsOnline(true);
      }
    };

    const handleOffline = ({ userId }) => {
      if (userId === friend.friendId._id) {
    
        setIsOnline(false);
      }
    };

    socket.on("userOnline", handleOnline);
    socket.on("userOffline", handleOffline);

    return () => {
      socket.off("userOnline", handleOnline);
      socket.off("userOffline", handleOffline);
    };
  }, [friend.friendId._id, friend.friendId.name]);

  // Listen for unread count updates
  useEffect(() => {
    const unsubscribe = subscribeToUnreadUpdates(({ chatId, unreadCount }) => {

      if (chatId === friend.chatId) {
      
        setUnread(unreadCount);
      }
    });

    return unsubscribe;
  }, [friend.chatId, friend.friendId.name]);

  const removeFriend = async (friendId, id) => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/removefriend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friendId: friendId,
        }),
      });
      const data = await response.json();
      if (response.status == 200) {
        onUpdate(id);
      }
      setLoading(false);
    } catch (error) {
      alert("some server error");
  
    }
  };
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Unknown";
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInMs = now - lastSeenDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return "yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;

    // For older dates, show actual date
    return lastSeenDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        lastSeenDate.getFullYear() !== now.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  return (
    <article
      className={`flex items-center justify-between p-4 w-full rounded-none shadow-none border-b transition-all duration-300 ease-in-out hover:shadow-green-500/20 hover:border-green-500/40 cursor-pointer ${
        unread > 0
          ? "bg-gray-750 border-green-700/30"
          : "bg-gray-800 border-gray-700"
      }`}
      style={{ margin: 0, boxSizing: "border-box" }}
    >
      {/* Profile Picture with Status Border */}
      <div className="relative flex-shrink-0 mr-4">
        <img
          className={`
        w-16 h-16 rounded-full object-cover 
        border-4 ${isOnline ? "border-green-500" : "border-gray-600"}
      `}
          src={dp}
          alt={`${friend.friendId.name}'s profile picture`}
          onError={(e) => {
            e.target.src = "/default-avatar.png";
          }}
        />
      </div>

      {/* User Info - flex-1 to take remaining space */}
      <div className="flex flex-col justify-center flex-1">
        <h4
          className={`text-xl font-bold tracking-wide ${unread > 0 ? "text-green-300" : "text-gray-50"}`}
        >
          {friend.friendId.name}
        </h4>

        <div className="text-sm mt-1">
          {isOnline ? (
            <span className="flex items-center space-x-1.5 font-semibold text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Online</span>
            </span>
          ) : (
            <p className="text-gray-400">
              {`Last seen: ${formatLastSeen ? formatLastSeen(friend.friendId?.lastSeen) : "N/A"}`}
            </p>
          )}
        </div>
      </div>

      {/* Unread Badge */}
      {unread > 0 && (
        <div className="flex-shrink-0 mx-3">
          <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold text-white bg-green-600 rounded-full min-w-[32px] animate-pulse">
            {unread > 99 ? "99+" : unread}
          </span>
        </div>
      )}

      {/* Action Button - flex-shrink-0 to maintain size */}
      <div className="flex items-center flex-shrink-0 ml-4">
        <button
          onClick={() => removeFriend(friend.friendId._id, friend._id)}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-200"
        >
          {loading ? "Processing..." : "Remove Friend"}
        </button>
      </div>
    </article>
  );
}
