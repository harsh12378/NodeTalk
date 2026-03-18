import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../socket";
import API_BASE_URL from "../config";
import {
  showUserOnlineToast,
  showUserOfflineToast,
  showConnectedToast,
  showMessageSentToast,
  showMessageErrorToast,
} from "../components/CustomToast";

// Default avatar placeholder
const DEFAULT_AVATAR = "https://via.placeholder.com/48?text=User";

export default function ChattingBox({ receiver, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const messageEndRef = useRef(null);

  // Media states
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const fileInputRef = useRef(null);

  const currentReceiver = useMemo(() => receiver || {}, [receiver]);
  useLayoutEffect(() => {
    messageEndRef.current?.scrollIntoView();
  }, [messages]);

  // ── Step 1: Get or create chat when receiver changes ───────────
  useEffect(() => {
    if (!currentReceiver?._id) return;

    setChatId(null);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);

    const getOrCreateChat = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/chat/get-or-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ friendId: currentReceiver._id }),
        });

        if (!response.ok) throw new Error("Failed to get or create chat");

        const data = await response.json();
        setChatId(data.chatId);
      } catch (err) {
        console.error("Chat creation failed:", err);
      }
    };

    getOrCreateChat();
  }, [currentReceiver._id]);

  // ── Step 2: Join room + fetch initial messages when chatId is set ──
  useEffect(() => {
    if (!chatId) return;

    const socket = getSocket();
    if (!socket) {
      console.error("❌ Socket not available");
      return;
    }

    console.log("🔗 Joining chat room:", chatId);
    socket.emit("joinChat", chatId);

    showConnectedToast(currentReceiver.name);

    // Mark chat as read when opening it (await completion)
    markChatAsRead(chatId)
      .then(() => {
        console.log("✅ Successfully marked chat as read");
      })
      .catch((error) => {
        console.error("❌ Failed to mark chat as read:", error);
      });

    fetchMessages();
  }, [chatId, currentReceiver.name]);

  // ── Mark chat as read ───────────────────────────────────────────
  const markChatAsRead = async (chatIdToMark) => {
    try {
      const token = localStorage.getItem("token");
      console.log(`📞 Calling mark read API for chat: ${chatIdToMark}`);

      const response = await fetch(
        `${API_BASE_URL}/api/chat/${chatIdToMark}/read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log(`📊 Mark read API response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Chat ${chatIdToMark} marked as read`, data);

        // Invalidate inbox cache so allUsers page shows updated unread counts
        queryClient.invalidateQueries({ queryKey: ["inbox"] });

        return true;
      } else {
        const error = await response.text();
        console.error(
          `❌ Failed to mark chat as read. Status: ${response.status}, Error: ${error}`,
        );
        return false;
      }
    } catch (err) {
      console.error("❌ Error marking chat as read:", err);
      return false;
    }
  };

  // ── Fetch messages (supports pagination) ───────────────────────
  const fetchMessages = async (cursor = null) => {
    try {
      const token = localStorage.getItem("token");
      const url = new URL(`${API_BASE_URL}/api/messages/${chatId}`);
      url.searchParams.set("limit", 30);
      if (cursor) url.searchParams.set("before", cursor);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages");

      const { data, pagination } = await response.json();

      setMessages((prev) => (cursor ? [...data, ...prev] : data));
      setHasMore(pagination.hasMore);
      setNextCursor(pagination.nextCursor);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  // ── Load older messages (called when user scrolls to top) ──────
  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    await fetchMessages(nextCursor);
    setLoadingMore(false);
  };

  // ── Step 3: Listen for new messages via socket ─────────────────
  useEffect(() => {
    if (!chatId) return;

    const socket = getSocket();
    if (!socket) {
      console.error("❌ Socket not available for listening");
      return;
    }

    console.log("👂 Attaching newMessage listener for chatId:", chatId);

    const handleNewMessage = (message) => {
      console.log("📨 Received newMessage:", message);

      if (message.chatId?.toString() !== chatId?.toString()) {
        console.log("⏭️  Message not for this chat, ignoring");
        return;
      }

      const isOwnMessage = message.senderId?._id === currentUser?._id;
      console.log(
        "📋 Processing message - isOwn:",
        isOwnMessage,
        "content:",
        message.content,
      );

      // If message is from other user, mark as read
      if (!isOwnMessage) {
        markChatAsRead(chatId);
      }

      // Global listener handles toast notifications
      // This listener focuses on UI updates only

      setMessages((prev) => {
        if (isOwnMessage) {
          // Replace optimistic message with real one
          const hasPending = prev.some(
            (m) => m.pending && m.content === message.content,
          );
          if (hasPending) {
            console.log("🔄 Replacing optimistic message with real one");
            return prev.map((m) =>
              m.pending && m.content === message.content
                ? { ...message, pending: false }
                : m,
            );
          } else {
            console.log("⚠️ No pending message found, appending new message");
            return [...prev, message];
          }
        }
        // Append if it's from the other person
        console.log("➕ Appending message from other user");
        return [...prev, message];
      });
    };

    // Handle reconnection - rejoin chat room
    const handleReconnect = () => {
      console.log("🔁 Socket reconnected, rejoining chat:", chatId);
      socket.emit("joinChat", chatId);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("connect", handleReconnect);

    return () => {
      console.log("🧹 Removing newMessage listener for chatId:", chatId);
      socket.off("newMessage", handleNewMessage);
      socket.off("connect", handleReconnect);
    };
  }, [chatId, currentUser?._id]);

  // ── Presence: online/offline ───────────────────────────────────
  // Check initial online status on mount
  useEffect(() => {
    if (!currentReceiver._id) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit(
      "checkOnline",
      { targetUserId: currentReceiver._id },
      (response) => {
        console.log(
          `✅ checkOnline for ${currentReceiver.name}:`,
          response.isOnline,
        );
        setIsOnline(response.isOnline);
      },
    );
  }, [currentReceiver._id, currentReceiver.name]);

  // Listen for online/offline updates
  useEffect(() => {
    if (!currentReceiver._id) return;

    const socket = getSocket();
    if (!socket) return;

    const handleOnline = ({ userId }) => {
      if (userId === currentReceiver._id) {
        console.log(`🟢 ${currentReceiver.name} came online`);
        setIsOnline(true);
        showUserOnlineToast(currentReceiver.name);
      }
    };

    const handleOffline = ({ userId }) => {
      if (userId === currentReceiver._id) {
        console.log(`🔴 ${currentReceiver.name} went offline`);
        setIsOnline(false);
        showUserOfflineToast(currentReceiver.name);
      }
    };

    socket.on("userOnline", handleOnline);
    socket.on("userOffline", handleOffline);

    return () => {
      socket.off("userOnline", handleOnline);
      socket.off("userOffline", handleOffline);
    };
  }, [currentReceiver._id, currentReceiver.name]);

  // ── Send message ───────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      showMessageErrorToast("Only images and videos are supported");
      return;
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showMessageErrorToast("File size must be less than 50MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview({
        src: e.target.result,
        type: isVideo ? "video" : "image",
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const cancelMediaSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setMediaCaption("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMedia = async () => {
    if (!selectedFile || !currentUser) return;

    setSending(true);
    const tempId = `temp_${Date.now()}`;

    // Optimistic update
    const isVideo = selectedFile.type.startsWith("video/");
    setMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        chatId,
        content: mediaCaption || (isVideo ? "📹 Video" : "🖼️ Image"),
        messageType: isVideo ? "video" : "image",
        media: {
          url: filePreview.src,
          resourceType: isVideo ? "video" : "image",
        },
        senderId: {
          _id: currentUser._id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("to", currentReceiver._id);
      formData.append(
        "content",
        mediaCaption || (isVideo ? "📹 Video" : "🖼️ Image"),
      );
      formData.append("media", selectedFile);

      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to send media");

      showMessageSentToast();
      cancelMediaSelection();
    } catch (err) {
      console.error("Send media failed:", err);
      showMessageErrorToast("Failed to send media");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !currentUser) return;

    const messageText = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        _id: tempId,
        chatId,
        content: messageText,
        senderId: {
          _id: currentUser._id,
          name: currentUser.name,
          avatar: currentUser.avatar,
        },
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);

    try {
      const token = localStorage.getItem("token");
      console.log("Sending message to API:", {
        to: currentReceiver._id,
        content: messageText,
      });
      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: currentReceiver._id,
          content: messageText,
        }),
      });

      showMessageSentToast();
      // socket "newMessage" event will replace the optimistic message
    } catch (err) {
      console.error("Send message failed:", err);
      showMessageErrorToast("Failed to send message");
      // Roll back optimistic message and restore input
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  // ── Keyboard handler ───────────────────────────────────────────
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Format last seen ───────────────────────────────────────────
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
    <div className="flex flex-col h-dvh w-full bg-gray-900 text-green-100 relative overflow-hidden ">
      {/* Floating Header with receiver info */}
      <div className=" flex items-center gap-4 p-4 border-b border-green-700 bg-gray-900/90 backdrop-blur-md flex-shrink-0 z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-green-400"
          aria-label="Go back"
          title="Go back"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="relative">
          <img
            src={currentReceiver.avatar || DEFAULT_AVATAR}
            alt={currentReceiver.name}
            className={`w-12 h-12 rounded-full border-4 ${
              isOnline ? "border-green-500" : "border-gray-600"
            }`}
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-green-300">
            {currentReceiver.name}
          </h2>
          <span className="text-sm text-gray-400">
            {isOnline
              ? "Online"
              : `Last seen: ${formatLastSeen(currentReceiver?.lastSeen)}`}
          </span>
        </div>
      </div>

      <div className="flex-1 relative min-h-1 ">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/30 to-gray-800"></div>

        {/* Messages content */}
        <div
          className="relative z-[1] h-full overflow-y-auto p-4 space-y-3"
          style={{ overflowX: "hidden" }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">💬</div>
                <p className="text-lg">
                  Start a conversation with {currentReceiver.name}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Messages are end-to-end encrypted
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwnMessage = msg.senderId?._id === currentUser._id;
              const isImageMessage = msg.messageType === "image";
              const isVideoMessage = msg.messageType === "video";

              return (
                <div
                  key={i}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-1 message-enter`}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full mr-3 self-start flex-shrink-0 bg-green-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">
                        {currentReceiver.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col max-w-xs lg:max-w-md">
                    {/* Media message */}
                    {(isImageMessage || isVideoMessage) && msg.media?.url && (
                      <div
                        className={`rounded-3xl overflow-hidden shadow-md ${
                          isOwnMessage ? "rounded-tr-none" : "rounded-tl-none"
                        } max-w-xs`}
                      >
                        {isImageMessage && (
                          <img
                            src={msg.media.url}
                            alt="Shared media"
                            className="max-w-full h-auto max-h-80 object-cover"
                            loading="lazy"
                          />
                        )}
                        {isVideoMessage && (
                          <video
                            src={msg.media.url}
                            controls
                            className="max-w-full h-auto max-h-80 bg-black rounded-3xl"
                          />
                        )}
                      </div>
                    )}

                    {/* Caption or text message */}
                    {msg.content && (
                      <div
                        className={`px-3 py-2 rounded-3xl break-words shadow-md relative transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${
                          isOwnMessage
                            ? "bg-green-700 text-white self-end rounded-tr-none"
                            : "bg-gray-700 text-green-100 self-start rounded-tl-none"
                        }`}
                        style={{
                          wordWrap: "break-word",
                          wordBreak: "break-word",
                        }}
                      >
                        <div className="text-white text-base font-bold tracking-wide">
                          {msg.content}
                        </div>
                      </div>
                    )}

                    {/* Timestamp and delivery status */}
                    <div
                      className={`text-xs mt-1 flex items-center ${
                        isOwnMessage
                          ? "text-green-200 justify-end"
                          : "text-gray-400 justify-start"
                      }`}
                    >
                      <span title={new Date(msg.createdAt).toLocaleString()}>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </span>
                      {isOwnMessage && (
                        <div className="ml-1 flex">
                          <svg
                            className="w-4 h-4 text-green-200"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <svg
                            className="w-4 h-4 text-green-200 -ml-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Floating Input area */}
      <div className="z-10 flex items-end gap-3 p-4 border-t border-green-700 bg-gray-900/90 backdrop-blur-md flex-shrink-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Select image or video"
        />

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-12 h-12 rounded-full text-gray-400 hover:text-green-400 hover:bg-gray-800 transition-all duration-200 flex-shrink-0"
          aria-label="Attach image or video"
          title="Attach image or video"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6-4m6 4l6-4"
            />
          </svg>
        </button>

        {/* Text input area */}
        {!filePreview ? (
          <div className="flex-1 relative">
            <textarea
              className="w-full p-3 pr-12 rounded-full bg-gray-800 text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-32 min-h-[44px] placeholder-gray-500 capitalize"
              autoCapitalize="sentences"
              rows={1}
              value={input}
              onChange={(e) => {
                let value = e.target.value;
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }

                setInput(value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type a message"
              disabled={sending}
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              aria-label="Message input"
            />
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-400 transition-transform hover:scale-110 active:scale-95"
              onClick={() => setInput((prev) => prev + "😊")}
              aria-label="Insert emoji"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Send button for text */}
        {!filePreview && (
          <button
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 flex-shrink-0 ${
              sending || !input.trim()
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 shadow-lg"
            }`}
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            aria-label="Send message"
          >
            {sending ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Media Preview Modal */}
      {filePreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end animate-in fade-in">
          <div className="w-full bg-gray-900 border-t border-green-700 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-green-700">
              <h2 className="text-xl font-bold text-green-300">
                {filePreview.type === "video"
                  ? "📹 Share Video"
                  : "🖼️ Share Image"}
              </h2>
              <button
                onClick={cancelMediaSelection}
                className="text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Cancel"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
              {filePreview.type === "video" ? (
                <video
                  src={filePreview.src}
                  controls
                  className="max-w-full max-h-80 rounded-lg bg-black"
                />
              ) : (
                <img
                  src={filePreview.src}
                  alt="Preview"
                  className="max-w-full max-h-80 rounded-lg object-contain"
                />
              )}
            </div>

            {/* Caption input */}
            <div className="border-t border-green-700 p-4">
              <textarea
                className="w-full p-3 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-24 placeholder-gray-500"
                placeholder="Add a caption (optional)"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                rows={2}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 p-4 border-t border-green-700">
              <button
                onClick={cancelMediaSelection}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors font-semibold"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={sendMedia}
                className={`flex-1 px-4 py-3 rounded-lg transition-all font-semibold flex items-center justify-center gap-2 ${
                  sending
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white hover:shadow-lg"
                }`}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
