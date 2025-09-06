import { useState } from "react";

import dp from '../assets/dp.jpg'

export default function FriendCard({friend,onUpdate}){

const [loading,setLoading]=useState(false);


const removeFriend=async(friendId,id)=>{
  
const token=localStorage.getItem('token');
setLoading(true);
    try{
      const response = await fetch(`http://localhost:5000/api/users/removefriend`, {
          method: "POST",  
          headers: {
         "Authorization": `Bearer ${token}`,
         "Content-Type": "application/json",
          }, 
          body: JSON.stringify({
          friendId: friendId
        }),

         })
         const data = await response.json();
         if(response.status==200){
            onUpdate(id);
         }
         setLoading(false);
    }catch(error){
      alert("some server error");
           console.log("server error",error);
    }
}
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
       <article className="flex items-center justify-between p-4 w-full bg-gray-800 rounded-none shadow-none border-b border-gray-700 transition-all duration-300 ease-in-out hover:shadow-green-500/20 hover:border-green-500/40 cursor-pointer" style={{margin: 0, boxSizing: 'border-box'}}>
  {/* Profile Picture with Status Border */}
  <div className="relative flex-shrink-0 mr-4">
    <img
      className={`
        w-16 h-16 rounded-full object-cover 
        border-4 ${friend.friendId.isOnline ? 'border-green-500' : 'border-gray-600'}
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
    <h4 className="text-xl font-bold text-gray-50 tracking-wide">
      {friend.friendId.name}
    </h4>
    
    <div className="text-sm mt-1">
      {friend.friendId.isOnline ? (
        <span className="flex items-center space-x-1.5 font-semibold text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Online</span>
        </span>
      ) : (
        <p className="text-gray-400">
          {`Last seen: ${formatLastSeen ? formatLastSeen(friend.friendId?.lastSeen) : 'N/A'}`}
        </p>
      )}
    </div>
  </div>

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