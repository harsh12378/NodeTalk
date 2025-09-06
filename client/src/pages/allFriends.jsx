import { useEffect } from "react";
import { useState } from "react";
import FriendCard from "../components/friendCard"
import API_BASE_URL from "../config";
export default function Friends(){



const [friends,setFriends]=useState([]);
const [loading, setLoading]=useState(false);

useEffect(()=>{
     
const fetchFriends= async()=>{

           setLoading(true);
           try{
             const token=localStorage.getItem('token')
           const response= await fetch(`${API_BASE_URL}/api/users/friendlist`,{
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
               "Authorization": `Bearer ${token}`,
            }
           })
           const data=await response.json();
           if(response.status===200){
            setFriends(data.friends);

           }else{
            console.log("error in fetching requests",response);
           }

           }catch(error){
                alert("some server error");
           }
          
           setLoading(false);
    }
    fetchFriends();

},[])
const removeFriend=(id)=>{
   setFriends((prev=>prev.filter(friend=>friend._id!==id)));
}

return(
  <div>
 <div className="  w-full m-0 "style={{boxSizing: 'border-box'}}>
  {loading && (
    <div className="flex flex-col items-center justify-center py-8">
      <svg className="w-8 h-8 animate-spin text-green-500 mb-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <p className="text-base text-green-400 font-semibold tracking-wide drop-shadow-sm">Loading friends...</p>
    </div>
  )}

  {!loading && friends.length === 0 && (
    <div className="flex flex-col items-center justify-center py-8">
      <svg className="w-10 h-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
      </svg>
      <p className="text-base text-red-400 font-semibold tracking-wide drop-shadow-sm">No friends found.</p>
    </div>
  )}
</div>
 <div className="flex flex-col w-full m-0 p-0 px-0 bg-gray-900 min-h-[calc(100vh-164px)] " style={{boxSizing: 'border-box'}}>
    {friends.map((friend) => (
      <FriendCard key={friend._id} friend={friend} onUpdate={removeFriend} />
    ))}
  </div>
  </div>
)

}