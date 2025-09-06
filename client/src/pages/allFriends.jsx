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
    <p className="text-sm md:text-base text-center text-gray-800 tracking-wide drop-shadow-sm">
      Loading friends...
    </p>
  )}

  {!loading && friends.length === 0 && (
    <p className="text-sm md:text-base text-center text-red-400 tracking-wide drop-shadow-sm">
      No friends found.
    </p>
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