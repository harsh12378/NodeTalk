import { Link } from 'react-router-dom';
import dp from '../assets/dp.jpg'
import { useState,useEffect } from 'react';
import socket from "../socket"
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config";
export default function User({ user }) {
const [friendshipStatus, setFriendshipStatus] = useState(user.friendshipStatus||"none");
const [isOnline, setIsOnline] = useState(user.isOnline);
useEffect(() => {
  socket.on("userOnline", ({ userId }) => {
    if(userId===user._id){
      setIsOnline(true);
    }
   
  });
  socket.on("userOffline", ({ userId }) => {
    if(userId===user._id){
      setIsOnline(false);
    }
  });

  return () => {
    socket.off("userOnline");
    socket.off("userOffline");
  };
}, [user._id]);


  const addFriend=async (id)=>{
         const token=localStorage.getItem('token');
    try{
      const response = await fetch(`${API_BASE_URL}/api/users/request`, {
          method: "POST",  
          headers: {
         "Authorization": `Bearer ${token}`,
         "Content-Type": "application/json",
          }, 
          body: JSON.stringify({
          to: id
        }),

         })
         return response.ok;
    }catch(error){
           console.log("server error");
           return false;
    }
  }

const navigate = useNavigate();
const handleCardClick = () => {
    navigate(`/chat/${user._id}`, { state: { user } });
  };

  
const handleAddFriend = async(e) => {
    e.stopPropagation(); // This is crucial to prevent the card's click event.
    if (friendshipStatus==="none") {
      const success = await addFriend(user._id);
    if (success) setFriendshipStatus("pending")
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
const getColorForLetter = (letter) => {
  const colors = [
    'bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600',
    'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-orange-600',
    'bg-teal-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-lime-600',
    'bg-amber-600', 'bg-rose-600', 'bg-violet-600', 'bg-sky-600'
  ];
  
  const charCode = letter.toUpperCase().charCodeAt(0);
  const colorIndex = charCode % colors.length;
  return colors[colorIndex];
};
  
return (
  <article
    onClick={handleCardClick}
    className="flex items-center justify-between p-2 w-full bg-gray-800 rounded-none shadow-none border-b border-gray-700 transition-all duration-300 ease-in-out hover:shadow-green-500/20 hover:border-green-500/40 cursor-pointer"
    style={{margin: 0, maxWidth: '100vw', boxSizing: 'border-box', minHeight: '80px'}}
  >
    {/* Profile Picture with Status Border */}
    <div className="relative flex-shrink-0 mr-4">
      {user.avatar ? (
        <img
          className={`
            w-15 h-16 rounded-full object-cover 
            border-4 ${isOnline ? 'border-green-500' : 'border-gray-600'}
          `}
          src={user.avatar}
          alt={`${user.name}'s profile picture`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      ) : null}
       
      <div
        className={`
          ${user.avatar ? 'hidden' : 'flex'}
          w-16 h-16 rounded-full items-center justify-center
          border-4 ${isOnline ? 'border-green-500' : 'border-gray-600'}
          ${getColorForLetter(user.name?.charAt(0) || 'U')}
          text-white font-semibold text-xl
        `}
      >
        {user.name?.charAt(0).toUpperCase() || 'U'}
      </div>
    </div>
     
    {/* User Info */}
    <div className="flex flex-col justify-center flex-1 min-h-0 py-1">
      <h4 className="text-xl font-bold text-gray-50 tracking-wide">
        {user.name}
      </h4>
             
      <div className="text-sm mt-2">
        {isOnline ? (
          <span className="flex items-center space-x-1.5 font-semibold text-green-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>Online</span>
          </span>
        ) : (
          <p className="text-gray-400">
            {`Last seen: ${formatLastSeen ? formatLastSeen(user?.lastSeen) : 'N/A'}`}
          </p>
        )}
      </div>
    </div>
     
    {/* Action Buttons */}
    <div className="flex items-center justify-center p-2">
      {friendshipStatus === "none" && (
        <button
          className="px-3 py-2 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1 bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95"
          onClick={handleAddFriend}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add
        </button>
      )}
       
      {friendshipStatus === "pending" && (
        <button
          className="px-3 py-1 text-white text-sm font-medium rounded-lg bg-gray-500 cursor-not-allowed flex items-center gap-1"
          disabled
        >
          pending
        </button>
      )}
       
      {friendshipStatus === "rejected" && (
        <button
          className="px-3 py-2 text-white text-sm font-medium rounded-lg bg-gray-500 cursor-not-allowed flex items-center gap-1"
          disabled
        >
          rejected
        </button>
      )}
    </div>
  </article>
);
}
