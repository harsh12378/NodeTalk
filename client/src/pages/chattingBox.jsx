import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../socket";
import { useMessages } from "../hooks/useMessages";
import { useMessagesSocketSync } from "../hooks/useMessagesSocketSync";
import API_BASE_URL from "../config";
import { getSenderId } from "../utils/helpers";
import {
  showUserOnlineToast,
  showUserOfflineToast,
  showConnectedToast,
  showMessageSentToast,
  showMessageErrorToast,
} from "../components/CustomToast";

const DEFAULT_AVATAR = "https://via.placeholder.com/48?text=User";

// Simple debounce
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

export default function ChattingBox({ receiver, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const fileInputRef = useRef(null);
  const [unreadCountAtLoad, setUnreadCountAtLoad] = useState(0);

  const currentReceiver = useMemo(() => receiver || {}, [receiver]);

  // ── Messages ────────────────────────────────────────────────────
  const {
    data: messagesData = {},
    isLoading: isLoadingMessages,
    isPlaceholderData,
  } = useMessages(chatId);

  const messages = useMemo(() => {
    return messagesData.data || [];
  }, [messagesData.data]);

  const hasMore = messagesData.pagination?.hasMore || false;
  const nextCursor = messagesData.pagination?.nextCursor || null;

  useMessagesSocketSync(chatId, currentUser?._id);

  const chatIdFromCache = useMemo(() => {
    const inbox = queryClient.getQueryData(["inbox"]);
    if (!inbox) return null;
    const convo = inbox.find(
      (u) => u._id?.toString() === receiver?._id?.toString(),
    );
    return convo?.chatId || null;
  }, [receiver?._id, queryClient]);

  // ── Force refetch if chat has unread messages ──────────────────
  useEffect(() => {
    if (!chatId) return;
    const inbox = queryClient.getQueryData(["inbox"]);
    if (!inbox) return;
    const convo = inbox.find(
      (u) => u.chatId?.toString() === chatId?.toString(),
    );
    setUnreadCountAtLoad(convo?.unreadCount || 0);
    if (convo?.unreadCount > 0) {
      queryClient.invalidateQueries({
        queryKey: ["messages", chatId, null],
      });
    }
  }, [chatId, queryClient]);

  // ── Scroll to bottom when opening chat ──────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const scrollTimer = setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(scrollTimer);
  }, [chatId]);

  // ── Auto-scroll on new messages ─────────────────────────────────
  useLayoutEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    if (shouldScrollRef.current && currentCount > prevCount) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
    prevMessageCountRef.current = currentCount;
  }, [messages]);

  // ── Get or create chat ──────────────────────────────────────────
  useEffect(() => {
    if (!currentReceiver?._id) return;
    setChatId(null);
    if (chatIdFromCache) {
      setChatId(chatIdFromCache);
      return;
    }
    shouldScrollRef.current = true;
    prevMessageCountRef.current = 0;
    const getOrCreateChat = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/chat/get-or-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ friendId: currentReceiver._id }),
        });
        if (!res.ok) throw new Error("Failed to get or create chat");
        const data = await res.json();
        setChatId(data.chatId);
      } catch (err) {
        console.error("Chat creation failed:", err);
      }
    };
    getOrCreateChat();
  }, [currentReceiver._id, chatIdFromCache]);

  const markChatAsRead = useCallback(
    async (chatIdToMark) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE_URL}/api/chat/${chatIdToMark}/read`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          queryClient.setQueryData(["inbox"], (old) => {
            if (!old) return old;
            return old.map((u) =>
              u.chatId?.toString() === chatIdToMark?.toString()
                ? { ...u, unreadCount: 0 }
                : u,
            );
          });
        }
      } catch (err) {
        console.error("Error marking chat as read:", err);
      }
    },
    [queryClient],
  );

  const markChatAsReadDebounced = useMemo(
    () => debounce((id) => markChatAsRead(id), 500),
    [markChatAsRead],
  );

  useEffect(() => {
    if (!chatId) return;
    let socket = getSocket();
    let retryCount = 0;
    const maxRetries = 50;
    const joinChatRoom = () => {
      socket = getSocket();
      if (!socket?.connected) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(joinChatRoom, 100);
          return;
        }
        return;
      }
      socket.emit("joinChat", chatId);
      showConnectedToast(currentReceiver.name);
      markChatAsReadDebounced(chatId);
    };
    joinChatRoom();
  }, [chatId, currentReceiver.name, markChatAsReadDebounced]);

  useEffect(() => {
    if (!chatId) return;
    let socket = getSocket();
    let retryCount = 0;
    const maxRetries = 50;
    let cleanup = null;
    const setupHandlers = () => {
      socket = getSocket();
      if (!socket?.connected) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupHandlers, 100);
          return;
        }
        return;
      }
      const handleReconnect = () => socket.emit("joinChat", chatId);
      const handleNewMessageFromOthers = (message) => {
        if (message.chatId?.toString() !== chatId?.toString()) return;
        const isOwn = getSenderId(message.senderId) === currentUser?._id;
        if (!isOwn) markChatAsReadDebounced(chatId);
      };
      socket.off("connect", handleReconnect);
      socket.off("newMessage", handleNewMessageFromOthers);
      socket.on("connect", handleReconnect);
      socket.on("newMessage", handleNewMessageFromOthers);
      cleanup = () => {
        socket.off("connect", handleReconnect);
        socket.off("newMessage", handleNewMessageFromOthers);
      };
    };
    setupHandlers();
    return () => { if (cleanup) cleanup(); };
  }, [chatId, currentUser?._id, markChatAsReadDebounced]);

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore || !nextCursor || !chatId) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    shouldScrollRef.current = false;
    setLoadingMore(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ limit: 30, before: nextCursor });
      const res = await fetch(
        `${API_BASE_URL}/api/messages/${chatId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      const { data, pagination } = await res.json();
      queryClient.setQueryData(["messages", chatId, null], (old) => {
        if (!old) return old;
        return { ...old, data: [...data, ...old.data], pagination };
      });
      requestAnimationFrame(() => {
        if (container)
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        shouldScrollRef.current = true;
      });
    } catch (err) {
      console.error("Failed to load more messages:", err);
      shouldScrollRef.current = true;
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!currentReceiver._id) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("checkOnline", { targetUserId: currentReceiver._id }, (r) =>
      setIsOnline(r.isOnline),
    );
  }, [currentReceiver._id]);

  useEffect(() => {
    if (!currentReceiver._id) return;
    const socket = getSocket();
    if (!socket) return;
    const handleOnline = ({ userId }) => {
      if (userId === currentReceiver._id) {
        setIsOnline(true);
        showUserOnlineToast(currentReceiver.name);
      }
    };
    const handleOffline = ({ userId }) => {
      if (userId === currentReceiver._id) {
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      showMessageErrorToast("Only images and videos are supported");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showMessageErrorToast("File size must be less than 50MB");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) =>
      setFilePreview({
        src: e.target.result,
        type: isVideo ? "video" : "image",
      });
    reader.readAsDataURL(file);
  };

  const cancelMediaSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setMediaCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addOptimistic = useCallback(
    (msg) => {
      shouldScrollRef.current = true;
      queryClient.setQueryData(["messages", chatId, null], (old) => {
        if (!old) return old;
        return { ...old, data: [...old.data, msg] };
      });
    },
    [chatId, queryClient],
  );

  const replaceOptimistic = useCallback(
    (tempId, realMsg) => {
      queryClient.setQueryData(["messages", chatId, null], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((m) =>
            m._id === tempId ? { ...realMsg, pending: false } : m,
          ),
        };
      });
    },
    [chatId, queryClient],
  );

  const removeOptimistic = useCallback(
    (tempId) => {
      queryClient.setQueryData(["messages", chatId, null], (old) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((m) => m._id !== tempId) };
      });
    },
    [chatId, queryClient],
  );

  const sendMedia = async () => {
    if (!selectedFile || !currentUser || !chatId) return;
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const isVideo = selectedFile.type.startsWith("video/");
    addOptimistic({
      _id: tempId,
      chatId,
      content: mediaCaption || "",
      messageType: isVideo ? "video" : "image",
      media: { url: filePreview.src, resourceType: isVideo ? "video" : "image" },
      senderId: { _id: currentUser._id, name: currentUser.name, avatar: currentUser.avatar },
      createdAt: new Date().toISOString(),
      pending: true,
    });
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("to", currentReceiver._id);
      formData.append("content", mediaCaption || "");
      formData.append("media", selectedFile);
      const res = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to send media");
      const { data: sentMessage } = await res.json();
      replaceOptimistic(tempId, sentMessage);
      showMessageSentToast();
      cancelMediaSelection();
    } catch (err) {
      showMessageErrorToast("Failed to send media");
      removeOptimistic(tempId);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !currentUser || !chatId) return;
    const messageText = input.trim();
    setInput("");
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    addOptimistic({
      _id: tempId,
      chatId,
      content: messageText,
      messageType: "text",
      senderId: { _id: currentUser._id, name: currentUser.name, avatar: currentUser.avatar },
      createdAt: new Date().toISOString(),
      pending: true,
    });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: currentReceiver._id, content: messageText }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const { data: sentMessage } = await res.json();
      replaceOptimistic(tempId, sentMessage);
      showMessageSentToast();
    } catch (err) {
      showMessageErrorToast("Failed to send message");
      removeOptimistic(tempId);
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Unknown";
    const now = new Date();
    const d = new Date(lastSeen);
    const mins = Math.floor((now - d) / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const showSkeleton = isLoadingMessages && !isPlaceholderData && messages.length === 0;

  return (
    <div className="flex flex-col h-dvh w-full bg-gray-900 text-green-100 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-green-900/60 bg-gray-900/95 backdrop-blur-md flex-shrink-0 z-10">
        <button onClick={() => navigate(-1)} className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-800 transition-colors text-gray-500 hover:text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative flex-shrink-0">
          <img src={currentReceiver.avatar || DEFAULT_AVATAR} alt={currentReceiver.name} className="w-10 h-10 rounded-full object-cover" />
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isOnline ? "bg-green-400" : "bg-gray-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-green-200 truncate leading-tight">{currentReceiver.name}</h2>
          <p className="text-xs leading-tight">
            {isOnline ? <span className="text-green-400">Online</span> : <span className="text-gray-500">Last seen {formatLastSeen(currentReceiver?.lastSeen)}</span>}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 relative min-h-0">
        <div ref={messagesContainerRef} className="relative z-[1] h-full overflow-y-auto px-4 py-3 space-y-1">
          {hasMore && (
            <div className="flex justify-center py-2">
              <button onClick={loadMoreMessages} disabled={loadingMore} className="text-xs text-gray-500 hover:text-green-400 px-3 py-1.5 rounded-full border border-gray-700 disabled:opacity-40">
                {loadingMore ? "Loading..." : "Load older messages"}
              </button>
            </div>
          )}
          {showSkeleton && (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-green-700 border-t-green-400 rounded-full animate-spin" />
            </div>
          )}
          {!isLoadingMessages && messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center"><div className="text-4xl mb-3">💬</div><p className="text-sm">Start a conversation</p></div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = getSenderId(msg.senderId) === currentUser?._id;
            const isImage = msg.messageType === "image";
            const isVideo = msg.messageType === "video";
            const nextMsg = messages[i + 1];
            const sameAsNext = getSenderId(nextMsg?.senderId) === getSenderId(msg.senderId);
            const showAvatar = !isOwn && !sameAsNext;
            const dividerIndex = messages.length - unreadCountAtLoad;
            const shouldShowDivider = i === dividerIndex && unreadCountAtLoad > 0;

            return (
              <div key={msg._id}>
                {shouldShowDivider && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-green-900/30 to-transparent" />
                    <span className="text-xs font-semibold text-green-600 px-2 py-1 bg-gray-800 rounded-full">Unread Messages</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-green-900/30 to-transparent" />
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} ${sameAsNext ? "mt-0.5" : "mt-3"}`}>
                  {!isOwn && (
                    <div className="w-6 h-6 flex-shrink-0 self-end">
                      {showAvatar && (
                        <div className="w-6 h-6 rounded-full bg-green-900 flex items-center justify-center text-xs font-semibold text-green-300">
                          {currentReceiver.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                    {(isImage || isVideo) && msg.media?.url && (
                      <div className={`rounded-2xl overflow-hidden mb-0.5 ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"} ${msg.pending ? "opacity-60" : ""}`}>
                        {isImage ? <img src={msg.media.url} alt="Media" className="max-w-[220px] h-auto max-h-64 object-cover" /> : <video src={msg.media.url} controls className="max-w-[220px] h-auto max-h-64 bg-black" />}
                      </div>
                    )}
                    {msg.content && (
                      <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isOwn ? `bg-green-700 text-white rounded-br-sm ${msg.pending ? "opacity-60" : ""}` : "bg-gray-800 text-gray-100 rounded-bl-sm"}`}>
                        {msg.content}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="text-[10px] text-gray-600">{formatTime(msg.createdAt)}</span>
                      {isOwn && <span className={`text-[10px] ${msg.pending ? "text-gray-600" : "text-green-600"}`}>{msg.pending ? "○" : "✓✓"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="z-10 flex items-end gap-2 px-3 py-3 border-t border-green-900/40 bg-gray-900/95 backdrop-blur-md">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:text-green-400 hover:bg-gray-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        <textarea className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-800 text-white text-sm focus:outline-none resize-none max-h-28" rows={1} value={input} onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }} onKeyDown={handleKeyDown} placeholder="Message..." disabled={sending} />
        <button className={`w-9 h-9 flex items-center justify-center rounded-xl ${sending || !input.trim() ? "text-gray-700" : "bg-green-700 text-white"}`} onClick={sendMessage} disabled={sending || !input.trim()}>
          {sending ? <div className="w-4 h-4 border-2 border-green-800 border-t-green-400 rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>}
        </button>
      </div>

      {/* Media Preview Modal */}
      {filePreview && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm">
          <div className="w-full bg-gray-900 border-t border-green-900/50 rounded-t-2xl flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-300">Preview</span>
              <button onClick={cancelMediaSelection} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="flex items-center justify-center mb-4">
              {filePreview.type === "video" ? <video src={filePreview.src} controls className="max-h-64 rounded-xl" /> : <img src={filePreview.src} alt="Preview" className="max-h-64 rounded-xl" />}
            </div>
            <input type="text" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 text-white mb-4" placeholder="Add a caption..." value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={cancelMediaSelection} className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400">Cancel</button>
              <button onClick={sendMedia} disabled={sending} className="flex-1 py-2.5 rounded-xl bg-green-700 text-white">{sending ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}