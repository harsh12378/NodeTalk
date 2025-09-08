import { useState,useMemo, useEffect,useRef,useLayoutEffect } from "react";
import dp from '../assets/dp.jpg'
import socket from "../socket"
import API_BASE_URL from "../config";
export default function ChattingBox({ receiver = {} }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messageEndRef=useRef(null);
  const chatContainerRef=useRef(null);
  const[isOnline,setIsOnline]=useState(false);
  const scrollBottom=()=>{
    messageEndRef.current?.scrollIntoView();
  }
  
  useLayoutEffect(()=>{
    scrollBottom();
    
  },[messages]);


  const currentReceiver = useMemo(
  () => receiver || {},
  [receiver]
);
    useEffect(()=>{ 
      if (!currentReceiver?._id) return;
      const fetchMessages=async()=>{
        try{
          
          const token=localStorage.getItem('token');
         const response = await fetch(`${API_BASE_URL}/api/messages/${currentReceiver._id}`, {
          method: "GET", 
          headers: {
         "Authorization": `Bearer ${token}`
    
      }});
      socket.on("connect_error", (err) => {
      console.error("Socket.IO connect_error:", err.message);
      });
   
         if(!response.ok){
        throw new Error('Failed to get messages');
          }
          const data=await response.json();          
          const myId = JSON.parse(atob(token.split(".")[1])).userId;
          const formatted=data.messages.map(msg=>({
            from: msg.senderId===myId?"you":"them",
            text:msg.text,
            createdAt: msg.createdAt
          }));
         setMessages(formatted);
        }catch(error){
        alert("Failed to get message");
        }
      }
       if (receiver?._id) fetchMessages();
    },[receiver]);

    useEffect(()=>{
      
      const token = localStorage.getItem("token");
      const myId = token ? JSON.parse(atob(token.split(".")[1])).userId : null;
      socket.on("receiveMessage",(data)=>{
        setMessages(prev=>[...prev,
          {
            from: data.senderId===myId?"you":"them",
            text: data.message,
            createdAt: data.createdAt,
          }]);
      });
      return ()=>{
        socket.off("receiveMessage");
      };
    },[]);

    useEffect(() => {
  socket.on("userOnline", ({ userId }) => {
    if (userId === currentReceiver._id) setIsOnline(true);
  });
  socket.on("userOffline", ({ userId }) => {
    if (userId === currentReceiver._id) setIsOnline(false);
  });
  return () => {
    socket.off("userOnline");
    socket.off("userOffline");
  };
}, [currentReceiver._id]);


    useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    const myId = JSON.parse(atob(token.split(".")[1])).userId;
    socket.emit("join", myId);
  }
}, []);

  
  const sendMessage = async () => {
    if (!input.trim()) return; 
    const messageText = input.trim();
    setInput(''); // Clear input
    setSending(true);
    
    try {
     
      const token = localStorage.getItem("token");
        
      socket.emit("sendMessage",{
        senderId: JSON.parse(atob(token.split(".")[1])).userId,
        receiverId:currentReceiver._id,
        message:messageText,
      })
      const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: currentReceiver._id,
          message: messageText,
        }),
      });
      
      if (!response.ok) {
      
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
       
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message");
     setMessages(prev => prev.slice(0, -1));
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Unknown';
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMs = now - lastSeenDate;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  // For older dates, show actual date
  return lastSeenDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: lastSeenDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};




return (
  <div className="flex flex-col h-dvh w-full bg-gray-900 text-green-100 relative overflow-hidden ">
    {/* Floating Header with receiver info */}
    <div className=" flex items-center gap-4 p-4 border-b border-green-700 bg-gray-900/90 backdrop-blur-md flex-shrink-0 z-10">
      <div className="relative">
        <img
          src={currentReceiver.avatar || dp}
          alt={currentReceiver.name}
          className={`w-12 h-12 rounded-full border-4 ${
            isOnline ? "border-green-500" : "border-gray-600"
          }`}
        />
        {currentReceiver.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></span>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold text-green-300">{currentReceiver.name}</h2>
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
      <div className="relative z-[1] h-full overflow-y-auto p-4 space-y-3" style={{overflowX: 'hidden'}}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">💬</div>
              <p className="text-lg">Start a conversation with {currentReceiver.name}</p>
              <p className="text-sm text-gray-600 mt-2">Messages are end-to-end encrypted</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === 'you' ? 'justify-end' : 'justify-start'} mb-1 message-enter`}
              style={{
                animationDelay: `${i * 0.1}s` // Stagger animation for multiple messages
              }}
            >
              {msg.from !== 'you' && (
                <div className="w-8 h-8 rounded-full mr-3 self-start flex-shrink-0 bg-green-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">
                    {currentReceiver.name ? currentReceiver.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
              )}
              <div className="flex flex-col max-w-xs lg:max-w-md">
                <div
                  className={`px-3 py-2 rounded-3xl break-words shadow-md relative transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${
                    msg.from === 'you'
                      ? 'bg-green-700 text-white self-end rounded-tr-none'
                      : 'bg-gray-700 text-green-100 self-start rounded-tl-none'
                  }`}
                  style={{
                    wordWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  <div className="text-white text-base font-bold tracking-wide">{msg.text}</div>
                  <div
                    className={`text-xs mt-1 flex items-center ${
                      msg.from === 'you'
                        ? 'text-green-200 justify-end'
                        : 'text-gray-400 justify-start'
                    }`}
                  >
                    <span title={new Date(msg.createdAt).toLocaleString()}>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date().toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                    </span>
                    {msg.from === 'you' && (
                      <div className="ml-1 flex">
                        <svg className="w-4 h-4 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <svg className="w-4 h-4 text-green-200 -ml-2" fill="currentColor" viewBox="0 0 20 20">
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
            </div>
          ))
        )}
          <div ref={messageEndRef} />
      </div>
    </div>
  

    {/* Floating Input area */}
    <div className=" z-10 flex items-end gap-3 p-4 border-t border-green-700 bg-gray-900/90 backdrop-blur-md flex-shrink-0">
      <div className="flex-1 relative">
        <textarea
          className="w-full p-3 pr-12 rounded-full bg-gray-800 text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-green-500 resize-none max-h-32 min-h-[44px] placeholder-gray-500 capitalize"
          autoCapitalize="sentences"
          rows={1}
          value={input}
          onChange={e => {
          let value = e.target.value;
          if (value.length > 0) {
          value = value.charAt(0).toUpperCase() + value.slice(1);
          }
  
         setInput(value);
         e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
         }}

          onKeyPress={handleKeyPress}
          placeholder="Type a message"
          disabled={sending}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          aria-label="Message input"
        />
        <button
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-400 transition-transform hover:scale-110 active:scale-95"
          onClick={() => setInput(prev => prev + '😊')}
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
      <button
        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
          sending || !input.trim()
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 shadow-lg'
        }`}
        onClick={sendMessage}
        disabled={sending || !input.trim()}
        aria-label="Send message"
      >
        {sending ? (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
    
  </div>
);
}